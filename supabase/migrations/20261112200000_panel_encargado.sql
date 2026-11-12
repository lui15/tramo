-- =====================================================================
-- PANEL DEL ENCARGADO: trabajos por mes y "Mi dinero" por mes
-- ---------------------------------------------------------------------
-- Solo lectura. Dos funciones que devuelven SIEMPRE los datos del usuario
-- conectado (auth.uid()); nunca los de otro trabajador.
--
--   encargado_trabajos(año, mes)  -> trabajos del mes (por fecha programada
--                                    job_date) asignados a él, en los que
--                                    participó, o sin encargado asignado.
--                                    Sin importes del cliente.
--   mi_dinero(año, mes)           -> modalidad, tarifa, horas/días
--                                    validados, acumulado, adelantos y
--                                    pendiente del mes; historial de
--                                    trabajos y de adelantos.
--
-- Reglas:
--   · Fijo: cobra su sueldo mensual; los trabajos NO suman dinero.
--   · Hora/día: suma solo lo VALIDADO (trabajos 'finalizado' aprobados).
--   · Pendiente del mes = base del mes − adelantos del mes − pagos del mes.
--     Cada mes es independiente (por settlement_date / job_date).
--
-- Requisito: 20261112150000_permisos_secretaria.sql y
--            20261112180000_cierre_trabajo_revision.sql ya ejecutados.
-- No borra ni modifica datos.
-- =====================================================================

-- Adelantos (idempotente, por si no se ejecutó antes)
alter table public.settlements
  add column if not exists kind text not null default 'pago',
  add column if not exists note text;

-- ---------------------------------------------------------------------
create or replace function public.encargado_trabajos(p_year int, p_month int)
returns table (
  id uuid,
  job_type text,
  client_name text,
  client_phone text,
  address_info text,
  job_date date,
  start_time time,
  status text,
  encargado_id uuid,
  encargado_name text,
  is_mine boolean,
  my_hours numeric,
  return_reason text,
  duration_unit text,
  duration_value numeric,
  completion_date date,
  completion_time time,
  closed_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select j.id,
         j.job_type,
         j.client_name,
         j.client_phone,
         case when j.job_type = 'mudanza'
              then coalesce(j.pickup_point, '') || ' → ' || coalesce(j.dropoff_point, '')
              else j.work_point end,
         j.job_date,
         j.start_time,
         j.status,
         j.encargado_id,
         e.full_name,
         coalesce(j.encargado_id = auth.uid(), false) or me.employee_id is not null,
         me.hours_or_days,
         j.return_reason,
         j.duration_unit,
         j.duration_value,
         j.completion_date,
         j.completion_time,
         j.closed_at
    from public.jobs j
    left join public.profiles e on e.id = j.encargado_id
    left join public.job_participants me on me.job_id = j.id and me.employee_id = auth.uid()
   where public.my_role() = 'encargado'
     and p_month between 1 and 12
     and j.job_date >= make_date(p_year, p_month, 1)
     and j.job_date < (make_date(p_year, p_month, 1) + interval '1 month')::date
     and (j.encargado_id = auth.uid() or j.encargado_id is null or me.employee_id is not null)
   order by j.job_date, j.start_time;
$$;

-- ---------------------------------------------------------------------
create or replace function public.mi_dinero(p_year int, p_month int)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  p public.profiles;
  v_from date;
  v_to date;
  v_type text;
  v_rate numeric;
  v_mode text;
  v_hours numeric := 0;
  v_days numeric := 0;
  v_earned numeric := 0;
  v_done int := 0;
  v_review int := 0;
  v_adv numeric := 0;
  v_paid numeric := 0;
  v_base numeric := 0;
  v_jobs jsonb;
  v_sett jsonb;
  v_adv_all jsonb;
begin
  if public.my_role() is null or public.my_role() not in ('encargado', 'ayudante') then
    raise exception 'Esta información solo está disponible para el equipo.' using errcode = '42501';
  end if;
  if p_month is null or p_month < 1 or p_month > 12 or p_year is null then
    raise exception 'Mes no válido.' using errcode = '22023';
  end if;

  select * into p from public.profiles where id = v_me;
  v_from := make_date(p_year, p_month, 1);
  v_to := (v_from + interval '1 month')::date;

  -- Tarifa vigente al final del mes consultado (historial salarial)
  select s.salary_type, s.salary_rate into v_type, v_rate
    from public.salary_at(v_me, v_to - 1) s;
  v_type := coalesce(v_type, p.salary_type);
  v_rate := coalesce(v_rate, p.salary_rate);

  v_mode := case
    when coalesce(p.payment_method, '') = 'fijo' or v_type = 'mes' then 'fijo'
    when v_type = 'dia' then 'dia'
    else 'hora'
  end;
  if v_mode = 'fijo' then
    v_rate := coalesce(case when v_type = 'mes' then v_rate end, p.fixed_salary, v_rate, 0);
  end if;

  -- Trabajos en los que participó este mes (por fecha programada)
  select
    coalesce(sum(jp.hours_or_days) filter (where j.status = 'finalizado' and coalesce(j.duration_unit, 'horas') = 'horas'), 0),
    coalesce(sum(jp.hours_or_days) filter (where j.status = 'finalizado' and j.duration_unit = 'dias'), 0),
    coalesce(sum(jp.amount_earned) filter (where j.status = 'finalizado'), 0),
    count(*) filter (where j.status = 'finalizado'),
    count(*) filter (where j.status = 'pendiente_revision'),
    coalesce(jsonb_agg(jsonb_build_object(
        'job_id', j.id,
        'job_type', j.job_type,
        'client_name', j.client_name,
        'job_date', j.job_date,
        'start_time', j.start_time,
        'status', j.status,
        'duration_unit', j.duration_unit,
        'hours_or_days', jp.hours_or_days,
        'amount_earned', case when j.status = 'finalizado' then jp.amount_earned end
      ) order by j.job_date desc, j.start_time desc), '[]'::jsonb)
    into v_hours, v_days, v_earned, v_done, v_review, v_jobs
    from public.job_participants jp
    join public.jobs j on j.id = jp.job_id
   where jp.employee_id = v_me
     and j.job_date >= v_from and j.job_date < v_to
     and j.status in ('pendiente_revision', 'finalizado');

  -- Pagos y adelantos de este mes
  select
    coalesce(sum(amount) filter (where kind = 'adelanto'), 0),
    coalesce(sum(amount) filter (where kind <> 'adelanto'), 0),
    coalesce(jsonb_agg(jsonb_build_object(
        'id', id, 'kind', kind, 'amount', amount, 'note', note,
        'settlement_date', settlement_date, 'settlement_time', settlement_time
      ) order by settlement_date desc, settlement_time desc), '[]'::jsonb)
    into v_adv, v_paid, v_sett
    from public.settlements
   where employee_id = v_me
     and settlement_date >= v_from and settlement_date < v_to;

  -- Historial completo de adelantos (todos los meses)
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', id, 'amount', amount, 'note', note,
           'settlement_date', settlement_date,
           'month', to_char(settlement_date, 'YYYY-MM')
         ) order by settlement_date desc, settlement_time desc), '[]'::jsonb)
    into v_adv_all
    from (select * from public.settlements
           where employee_id = v_me and kind = 'adelanto'
           order by settlement_date desc, settlement_time desc
           limit 200) s;

  -- Base del mes
  if v_mode = 'fijo' then
    -- Antes de su fecha de alta no hay sueldo
    v_base := case when p.hire_date is not null and p.hire_date >= v_to then 0 else coalesce(v_rate, 0) end;
  else
    v_base := v_earned;
  end if;

  return jsonb_build_object(
    'full_name', p.full_name,
    'role', p.role,
    'mode', v_mode,
    'rate', round(coalesce(v_rate, 0), 2),
    'month', to_char(v_from, 'YYYY-MM'),
    'hours', v_hours,
    'days', v_days,
    'earned', round(v_earned, 2),
    'jobs_done', v_done,
    'jobs_in_review', v_review,
    'base', round(v_base, 2),
    'advances', round(v_adv, 2),
    'payments', round(v_paid, 2),
    'pending', round(greatest(v_base - v_adv - v_paid, 0), 2),
    'balance_total', case when p.payment_method = 'acumulativo' then round(greatest(p.accumulated_balance, 0), 2) end,
    'jobs', v_jobs,
    'settlements', v_sett,
    'advances_all', v_adv_all
  );
end;
$$;

revoke execute on function public.encargado_trabajos(int, int) from public, anon;
revoke execute on function public.mi_dinero(int, int) from public, anon;
grant execute on function public.encargado_trabajos(int, int) to authenticated;
grant execute on function public.mi_dinero(int, int) to authenticated;

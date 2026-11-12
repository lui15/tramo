-- =====================================================================
-- 20261112320000_mi_dinero_secretaria.sql
-- "Mi dinero" también para la secretaría (siempre sueldo fijo mensual):
--   - mi_dinero() acepta el rol secretaria y la trata como 'fijo'.
--     Si aún no tiene sueldo mensual configurado devuelve
--     salary_missing = true (no se inventa ningún importe).
--   - change_salary() solo admite modalidad 'mes' para la secretaría.
-- No modifica datos guardados.
-- =====================================================================

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
  v_missing boolean := false;
begin
  if public.my_role() is null or public.my_role() not in ('encargado', 'ayudante', 'secretaria') then
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
    when p.role = 'secretaria' then 'fijo'
    when coalesce(p.payment_method, '') = 'fijo' or v_type = 'mes' then 'fijo'
    when v_type = 'dia' then 'dia'
    else 'hora'
  end;
  if p.role = 'secretaria' then
    -- La secretaría siempre cobra sueldo fijo mensual
    v_rate := coalesce(case when v_type = 'mes' then v_rate end, p.fixed_salary);
    v_missing := v_rate is null;
    v_rate := coalesce(v_rate, 0);
  elsif v_mode = 'fijo' then
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
    'advances_all', v_adv_all,
    'salary_missing', v_missing
  );
end;
$$;

create or replace function public.change_salary(
  p_employee uuid,
  p_salary_type text,
  p_salary_rate numeric,
  p_effective_from date default current_date,
  p_note text default null
)
returns public.salary_history
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.salary_history;
  v_current record;
  v_target_role text;
begin
  select role into v_target_role from public.profiles where id = p_employee;

  if not (
    public.is_admin()
    or public.is_backend_call()
    or (public.my_role() = 'secretaria' and v_target_role in ('encargado', 'ayudante'))
  ) then
    raise exception 'No tienes permiso para cambiar este salario' using errcode = '42501';
  end if;
  if p_salary_type not in ('hora', 'dia', 'mes') then
    raise exception 'Modalidad salarial no válida' using errcode = '22023';
  end if;
  if p_salary_rate is null or p_salary_rate < 0 then
    raise exception 'Importe de salario no válido' using errcode = '22023';
  end if;
  if v_target_role is null or v_target_role = 'admin' then
    raise exception 'Colaborador no encontrado' using errcode = 'P0002';
  end if;
  if v_target_role = 'secretaria' and p_salary_type <> 'mes' then
    raise exception 'La secretaría siempre cobra sueldo fijo mensual.' using errcode = '22023';
  end if;

  insert into public.salary_history (employee_id, salary_type, salary_rate, effective_from, note, created_by)
  values (p_employee, p_salary_type, round(p_salary_rate, 2), coalesce(p_effective_from, current_date), p_note, auth.uid())
  returning * into v_row;

  select * into v_current from public.salary_at(p_employee, current_date);
  if found then
    perform set_config('tramo.salary_flow', 'on', true);
    update public.profiles
       set salary_type    = v_current.salary_type,
           salary_rate    = v_current.salary_rate,
           payment_method = case when v_current.salary_type = 'mes' then 'fijo' else 'acumulativo' end,
           fixed_salary   = case when v_current.salary_type = 'mes' then v_current.salary_rate end
     where id = p_employee;
    perform set_config('tramo.salary_flow', 'off', true);
  end if;

  return v_row;
end;
$$;

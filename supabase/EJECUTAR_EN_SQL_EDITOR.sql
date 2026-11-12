-- =====================================================================
-- TODO LO PENDIENTE EN UN SOLO ARCHIVO (pegar entero en el SQL Editor)
-- Contiene, en orden: permisos_secretaria, cierre_trabajo_revision y
-- panel_encargado. Todo es idempotente y no borra datos.
-- Se ejecuta en una única transacción: si algo falla, no se aplica nada.
-- =====================================================================
begin;

-- >>>>> migrations/20261112150000_permisos_secretaria.sql
-- =====================================================================
-- Permisos de SECRETARÍA + trabajos visibles para empleados
-- ---------------------------------------------------------------------
-- La secretaría puede:
--   · crear, modificar, borrar y asignar trabajos
--   · ver el equipo, registrar trabajadores (vía Edge Function admin-users)
--   · pagar y adelantar (vía Edge Function payroll)
-- NO puede: Finanzas, gastos, Vehículos ni el registro de auditoría.
-- Los empleados ven los trabajos por realizar (pendiente / confirmado /
-- en curso) y los realizados en los que participaron.
--
-- Segura: no borra datos ni tablas; solo añade o redefine políticas.
-- Incluye también (idempotente) la migración de adelantos por si aún no
-- se ejecutó.
-- =====================================================================

-- ---------- Trabajos ----------
drop policy if exists "Secretaría gestiona trabajos" on public.jobs;
create policy "Secretaría gestiona trabajos" on public.jobs
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "Empleados aprobados ven trabajos confirmados o donde participan" on public.jobs;
create policy "Empleados aprobados ven trabajos confirmados o donde participan" on public.jobs
  for select to authenticated
  using (
    public.is_active_member()
    and (
      status in ('pendiente', 'confirmado', 'en_curso')
      or exists (
        select 1 from public.job_participants jp
         where jp.job_id = jobs.id and jp.employee_id = auth.uid()
      )
    )
  );

-- ---------- Participantes (asignaciones) ----------
drop policy if exists "Secretaría gestiona participantes" on public.job_participants;
create policy "Secretaría gestiona participantes" on public.job_participants
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ---------- Equipo, salarios y pagos (solo lectura; escribir va por el servidor) ----------
drop policy if exists "Secretaría ve el equipo" on public.profiles;
create policy "Secretaría ve el equipo" on public.profiles
  for select to authenticated
  using (public.is_staff());

drop policy if exists "Secretaría ve pagos" on public.settlements;
create policy "Secretaría ve pagos" on public.settlements
  for select to authenticated
  using (public.is_staff());

drop policy if exists salary_history_select on public.salary_history;
create policy salary_history_select on public.salary_history
  for select
  using (public.is_staff() or (employee_id = auth.uid() and public.is_active_member()));

-- ---------- Fotos de perfil ----------
drop policy if exists avatars_admin_write on storage.objects;
create policy avatars_admin_write on storage.objects
  for insert with check (bucket_id = 'avatars' and public.is_staff());

drop policy if exists avatars_admin_update on storage.objects;
create policy avatars_admin_update on storage.objects
  for update using (bucket_id = 'avatars' and public.is_staff());

-- ---------- Cambio de salario: admin, o secretaría sobre encargados/ayudantes ----------
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

  insert into public.salary_history (employee_id, salary_type, salary_rate, effective_from, note, created_by)
  values (p_employee, p_salary_type, round(p_salary_rate, 2), coalesce(p_effective_from, current_date), p_note, auth.uid())
  returning * into v_row;

  select * into v_current from public.salary_at(p_employee, current_date);
  if found then
    update public.profiles
       set salary_type    = v_current.salary_type,
           salary_rate    = v_current.salary_rate,
           payment_method = case when v_current.salary_type = 'mes' then 'fijo' else 'acumulativo' end,
           fixed_salary   = case when v_current.salary_type = 'mes' then v_current.salary_rate end
     where id = p_employee;
  end if;

  return v_row;
end;
$$;

-- ---------- Adelantos (idempotente; igual que 20261112120000) ----------
alter table public.settlements
  add column if not exists kind text not null default 'pago',
  add column if not exists note text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'settlements_kind_check') then
    alter table public.settlements
      add constraint settlements_kind_check check (kind in ('pago', 'adelanto', 'salario'));
  end if;
end $$;

create or replace function public.notify_settlement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.profiles;
  v_title text;
  v_body text;
begin
  select * into p from public.profiles where id = new.employee_id;

  if new.kind = 'adelanto' then
    v_title := 'Adelanto recibido';
    v_body := 'Se te ha adelantado ' || public.fmt_eur(new.amount) || '.';
  elsif new.kind = 'salario' then
    v_title := 'Salario pagado';
    v_body := 'Se te ha pagado tu salario: ' || public.fmt_eur(new.amount) || '.';
  else
    v_title := 'Pago recibido';
    v_body := 'Se te ha realizado un pago de ' || public.fmt_eur(new.amount) || '.';
  end if;

  if p.payment_method = 'acumulativo' then
    v_body := v_body || ' Pendiente de cobrar: ' || public.fmt_eur(greatest(p.accumulated_balance, 0)) || '.';
  end if;

  if new.note is not null and new.note <> '' then
    v_body := v_body || ' Nota: ' || new.note;
  end if;

  perform public.notify(
    new.employee_id, 'payment', v_title, v_body,
    jsonb_build_object('settlement_id', new.id, 'amount', new.amount, 'kind', new.kind, 'route', '/employee/finanzas'),
    'payment:' || new.id);
  return new;
end;
$$;

revoke execute on function public.notify_settlement() from public, anon, authenticated;

-- ---------- Trabajos por realizar visibles para los empleados ----------
-- Antes solo salían los 'confirmado'; ahora también 'pendiente' y 'en_curso'.
create or replace view public.employee_available_jobs
with (security_invoker = true) as
select id as job_id,
       job_type,
       job_date,
       start_time,
       client_name,
       client_phone,
       case when job_type = 'mudanza' then (pickup_point || ' -> ' || dropoff_point)
            else work_point end as address_info,
       status
  from public.jobs
 where status in ('pendiente', 'confirmado', 'en_curso');

-- ---------- Protección de perfiles: permitir actualizaciones internas ----------
-- Cuando la secretaría finaliza un trabajo, el trigger handle_new_participant
-- suma lo ganado al saldo del trabajador. Antes esta protección lo anulaba
-- en silencio (la secretaría no es admin). Las actualizaciones que vienen de
-- otro trigger (pg_trigger_depth() > 1) son del propio sistema y se permiten.
create or replace function public.protect_privileged_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_avatar text;
begin
  if public.is_backend_call() or pg_trigger_depth() > 1 then
    return new;
  end if;

  if public.is_admin() then
    if new.id = auth.uid() and (new.role is distinct from old.role
        or new.account_status is distinct from old.account_status
        or new.is_active is distinct from old.is_active) then
      raise exception 'No puedes cambiar tu propio rol ni el estado de tu cuenta' using errcode = '42501';
    end if;
    if new.role = 'admin' and old.role <> 'admin' then
      raise exception 'No se puede asignar el rol de administrador desde la app' using errcode = '42501';
    end if;
    new.username := old.username;
    new.email := old.email;
    new.failed_login_attempts := old.failed_login_attempts;
    new.locked_until := old.locked_until;
    return new;
  end if;

  v_avatar := new.avatar_path;
  new := old;
  new.avatar_path := v_avatar;
  new.updated_at := now();
  return new;
end;
$$;


-- >>>>> migrations/20261112180000_cierre_trabajo_revision.sql
-- =====================================================================
-- CIERRE DE TRABAJO EN DOS PASOS
--   A) El ENCARGADO cierra ("Trabajo terminado")  -> 'pendiente_revision'
--   B) La SECRETARÍA (o el admin) revisa y APRUEBA -> 'finalizado'
--      o lo DEVUELVE al encargado                  -> 'en_curso'
-- Nadie cobra nada hasta que se aprueba. Los importes se calculan SIEMPRE
-- en el servidor.
--
-- Segura: no borra datos ni tablas. Solo añade columnas, amplía el CHECK
-- de estados, quita el NOT NULL de amount_earned (durante la revisión aún
-- no hay importe) y añade funciones, triggers y políticas.
--
-- REQUISITO: ejecutar antes 20261112150000_permisos_secretaria.sql
-- =====================================================================

do $$
begin
  if not exists (select 1 from pg_policies
                  where schemaname = 'public' and policyname = 'Secretaría gestiona trabajos') then
    raise exception 'Ejecuta primero 20261112150000_permisos_secretaria.sql';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 1. Columnas nuevas
-- ---------------------------------------------------------------------
alter table public.jobs
  add column if not exists encargado_id  uuid references public.profiles(id),
  add column if not exists closed_by     uuid references public.profiles(id),
  add column if not exists closed_at     timestamptz,
  add column if not exists close_note    text,
  add column if not exists reviewed_by   uuid references public.profiles(id),
  add column if not exists reviewed_at   timestamptz,
  add column if not exists return_reason text;

-- day_rate: precio por día (o por hora cuando el participante no tiene
-- tarifa por hora) que escribe la secretaría al revisar.
alter table public.job_participants
  add column if not exists day_rate  numeric(10, 2),
  add column if not exists full_time boolean not null default true;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'job_participants_day_rate_check') then
    alter table public.job_participants
      add constraint job_participants_day_rate_check check (day_rate is null or day_rate > 0);
  end if;
end $$;

alter table public.job_participants alter column amount_earned drop not null;

alter table public.jobs drop constraint if exists jobs_status_check;
alter table public.jobs add constraint jobs_status_check
  check (status in ('pendiente', 'confirmado', 'en_curso', 'pendiente_revision', 'finalizado'));

create index if not exists jobs_status_idx on public.jobs (status);
create index if not exists jobs_encargado_idx on public.jobs (encargado_id);

-- ---------------------------------------------------------------------
-- 2. Reglas de pago de un participante (uso interno)
--    · Fijo (payment_method 'fijo' o salario mensual) -> 0 €
--    · Trabajo por horas + tarifa por hora            -> horas x tarifa
--    · Resto                                          -> precio manual
-- ---------------------------------------------------------------------
create or replace function public.pay_rule(p_employee uuid, p_date date, p_unit text)
returns table (is_fixed boolean, auto_rate numeric, cur_type text, cur_rate numeric)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_prof public.profiles;
  v_type text;
  v_rate numeric;
begin
  select * into v_prof from public.profiles where id = p_employee;
  select s.salary_type, s.salary_rate into v_type, v_rate
    from public.salary_at(p_employee, coalesce(p_date, current_date)) s;

  cur_type := coalesce(v_type, v_prof.salary_type);
  cur_rate := coalesce(v_rate, v_prof.salary_rate);
  is_fixed := coalesce(v_prof.payment_method, '') = 'fijo' or coalesce(cur_type, '') = 'mes';
  auto_rate := case
    when not is_fixed and p_unit = 'horas' and cur_type = 'hora' and coalesce(cur_rate, 0) > 0 then cur_rate
  end;
  return next;
end;
$$;

revoke execute on function public.pay_rule(uuid, date, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Protección del flujo: los estados 'pendiente_revision' y 'finalizado'
--    y los participantes solo se tocan desde las funciones del flujo.
-- ---------------------------------------------------------------------
create or replace function public.in_job_flow()
returns boolean
language sql
stable
set search_path = public
as $$ select public.is_backend_call() or coalesce(current_setting('tramo.job_flow', true), '') = 'on'; $$;

create or replace function public.guard_job_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.in_job_flow() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status in ('pendiente_revision', 'finalizado') then
      raise exception 'Un trabajo nuevo no puede empezar terminado.' using errcode = '42501';
    end if;
    return new;
  end if;

  if new.status is distinct from old.status then
    if new.status in ('pendiente_revision', 'finalizado') then
      raise exception 'Para terminar un trabajo usa "Trabajo terminado" y después "Aprobar".' using errcode = '42501';
    end if;
    if old.status in ('pendiente_revision', 'finalizado') then
      raise exception 'Este trabajo está en revisión o finalizado: usa "Aprobar" o "Devolver al encargado".' using errcode = '42501';
    end if;
  end if;

  if old.status in ('pendiente_revision', 'finalizado')
     and (new.duration_value is distinct from old.duration_value
       or new.duration_unit  is distinct from old.duration_unit
       or new.total_cost     is distinct from old.total_cost) then
    raise exception 'Los datos de cierre solo se cambian desde la revisión.' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_job_status on public.jobs;
create trigger guard_job_status
  before insert or update on public.jobs
  for each row execute function public.guard_job_status();

create or replace function public.guard_job_participants()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Borrado en cascada al eliminar un trabajo: permitido.
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then
    return old;
  end if;
  if public.in_job_flow() then
    return coalesce(new, old);
  end if;
  raise exception 'Los participantes se gestionan al cerrar o aprobar el trabajo.' using errcode = '42501';
end;
$$;

drop trigger if exists guard_job_participants on public.job_participants;
create trigger guard_job_participants
  before insert or update or delete on public.job_participants
  for each row execute function public.guard_job_participants();

-- ---------------------------------------------------------------------
-- 4. Saldo acumulado: se suma SOLO al aprobar (una vez).
-- ---------------------------------------------------------------------
-- Inserción de participante: solo suma si el trabajo ya está finalizado
-- (compatibilidad con datos antiguos). Durante la revisión no suma nada.
create or replace function public.handle_new_participant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.amount_earned, 0) = 0 then
    return new;
  end if;
  if not exists (select 1 from public.jobs where id = new.job_id and status = 'finalizado') then
    return new;
  end if;
  update public.profiles
     set accumulated_balance = accumulated_balance + new.amount_earned
   where id = new.employee_id
     and payment_method = 'acumulativo';
  return new;
end;
$$;

-- Al pasar de 'pendiente_revision' a 'finalizado' se suma lo ganado
-- (misma regla que finalizeJob(): solo trabajadores 'acumulativo').
create or replace function public.apply_job_earnings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'finalizado' and old.status = 'pendiente_revision' then
    update public.profiles p
       set accumulated_balance = p.accumulated_balance + s.total
      from (select employee_id, sum(amount_earned) as total
              from public.job_participants
             where job_id = new.id and coalesce(amount_earned, 0) > 0
             group by employee_id) s
     where p.id = s.employee_id
       and p.payment_method = 'acumulativo';
  end if;
  return new;
end;
$$;

drop trigger if exists apply_job_earnings on public.jobs;
create trigger apply_job_earnings
  after update of status on public.jobs
  for each row execute function public.apply_job_earnings();

-- El aviso "Trabajo completado" por inserción solo para datos antiguos;
-- en el flujo nuevo lo envía aprobar_trabajo().
create or replace function public.notify_participation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  j public.jobs;
  v_unit text;
  v_body text;
begin
  select * into j from public.jobs where id = new.job_id;
  if j.status is distinct from 'finalizado' then
    return new;
  end if;
  v_unit := case when j.duration_unit = 'dias' then 'días' else 'horas' end;

  v_body := public.job_summary(j) || ' · ' || replace(rtrim(rtrim(to_char(coalesce(new.hours_or_days, 0), 'FM999990.00'), '0'), '.'), '.', ',') || ' ' || v_unit;
  if coalesce(new.amount_earned, 0) > 0 then
    v_body := v_body || ' · has generado ' || public.fmt_eur(new.amount_earned);
  end if;

  perform public.notify(
    new.employee_id, 'job_completed', 'Trabajo completado', v_body,
    jsonb_build_object('job_id', new.job_id, 'participation_id', new.id,
                       'amount', new.amount_earned, 'route', '/employee/finanzas'),
    'job_completed:' || new.id);
  return new;
end;
$$;

-- Avisos de cambios: las transiciones del flujo avisan desde sus funciones.
create or replace function public.notify_job_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_changes text[] := '{}';
  v_data jsonb;
begin
  if tg_op = 'INSERT' then
    perform public.notify_roles(
      array['encargado', 'admin'], 'job_created', 'Nuevo trabajo',
      public.job_summary(new),
      jsonb_build_object('job_id', new.id), 'job_created:' || new.id, '/trabajos');
    return new;
  end if;

  if tg_op = 'DELETE' then
    perform public.notify_roles(
      array['encargado', 'admin'], 'job_deleted', 'Trabajo eliminado',
      public.job_summary(old) || ' ha sido eliminado.',
      jsonb_build_object('job_id', old.id), 'job_deleted:' || old.id, '/trabajos');
    return old;
  end if;

  v_data := jsonb_build_object('job_id', new.id);

  if new.status = 'finalizado' and old.status is distinct from 'finalizado' then
    perform public.notify_roles(
      array['secretaria', 'admin'], 'job_finished', 'Trabajo finalizado',
      public.job_summary(new) || ' · aprobado por ' || public.actor_name()
        || coalesce(' · ' || public.fmt_eur(new.total_cost), ''),
      v_data, 'job_finished:' || new.id, '/trabajos');
    return new;
  end if;

  -- Cierre y devolución: avisan cerrar_trabajo() y devolver_trabajo().
  if new.status is distinct from old.status
     and (new.status = 'pendiente_revision' or old.status = 'pendiente_revision') then
    return new;
  end if;

  if new.job_date is distinct from old.job_date or new.start_time is distinct from old.start_time then
    v_changes := v_changes || 'fecha u hora';
  end if;
  if new.pickup_point is distinct from old.pickup_point or new.dropoff_point is distinct from old.dropoff_point
     or new.work_point is distinct from old.work_point then
    v_changes := v_changes || 'dirección';
  end if;
  if new.client_name is distinct from old.client_name or new.client_phone is distinct from old.client_phone then
    v_changes := v_changes || 'cliente';
  end if;
  if new.job_type is distinct from old.job_type then
    v_changes := v_changes || 'tipo de trabajo';
  end if;
  if new.status is distinct from old.status then
    v_changes := v_changes || ('estado: ' || replace(new.status, '_', ' '));
  end if;

  if new.encargado_id is distinct from old.encargado_id and new.encargado_id is not null then
    perform public.notify(
      new.encargado_id, 'job_assigned', 'Te han asignado un trabajo',
      public.job_summary(new) || ' · eres el encargado.',
      v_data || jsonb_build_object('route', '/employee/trabajos'),
      'job_assigned:' || new.id || ':' || new.encargado_id);
  end if;

  if array_length(v_changes, 1) > 0 then
    perform public.notify_roles(
      array['encargado'], 'job_updated', 'Trabajo modificado',
      public.job_summary(new) || ' · cambios: ' || array_to_string(v_changes, ', '),
      v_data, 'job_updated:' || new.id || ':' || extract(epoch from coalesce(new.updated_at, now()))::bigint,
      '/trabajos');
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 5. PASO A: cerrar_trabajo  (encargado del trabajo, secretaría o admin)
--    p_participants: [{ "employee_id": uuid, "full": bool, "hours_or_days": num }]
-- ---------------------------------------------------------------------
create or replace function public.cerrar_trabajo(
  p_job uuid,
  p_unit text,
  p_value numeric,
  p_participants jsonb,
  p_completion_date date default current_date,
  p_completion_time time default localtime,
  p_note text default null
)
returns public.jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_role text := public.my_role();
  j public.jobs;
  e jsonb;
  v_emp uuid;
  v_full boolean;
  v_hours numeric;
  v_count int;
begin
  if v_role is null or v_role not in ('admin', 'secretaria', 'encargado') then
    raise exception 'No tienes permiso para cerrar trabajos.' using errcode = '42501';
  end if;

  select * into j from public.jobs where id = p_job for update;
  if not found then
    raise exception 'Trabajo no encontrado.' using errcode = 'P0002';
  end if;

  if v_role = 'encargado' and j.encargado_id is not null and j.encargado_id <> v_me then
    raise exception 'Solo el encargado de este trabajo puede cerrarlo.' using errcode = '42501';
  end if;
  if j.status not in ('confirmado', 'en_curso') then
    raise exception 'Este trabajo no se puede cerrar ahora (estado: %).', replace(j.status, '_', ' ') using errcode = '22023';
  end if;
  if p_unit not in ('horas', 'dias') then
    raise exception 'Indica si el trabajo fue por horas o por días.' using errcode = '22023';
  end if;
  if p_value is null or p_value <= 0 or p_value > 10000 then
    raise exception 'Indica cuántas horas o días duró el trabajo.' using errcode = '22023';
  end if;
  if p_participants is null or jsonb_typeof(p_participants) <> 'array' then
    raise exception 'Lista de participantes no válida.' using errcode = '22023';
  end if;

  perform set_config('tramo.job_flow', 'on', true);
  delete from public.job_participants where job_id = p_job;

  for e in select * from jsonb_array_elements(p_participants) loop
    v_emp := nullif(e ->> 'employee_id', '')::uuid;
    if v_emp is null then
      continue;
    end if;
    if not exists (select 1 from public.profiles
                    where id = v_emp and role in ('encargado', 'ayudante')
                      and is_active and account_status = 'activo' and deleted_at is null) then
      raise exception 'Uno de los participantes no es un encargado o ayudante activo.' using errcode = '22023';
    end if;

    v_full := coalesce((e ->> 'full')::boolean, true);
    v_hours := case when v_full then p_value else nullif(e ->> 'hours_or_days', '')::numeric end;
    if v_hours is null or v_hours <= 0 or v_hours > p_value then
      raise exception 'Las horas o días de cada participante deben ser mayores que 0 y no superar %.', p_value
        using errcode = '22023';
    end if;

    insert into public.job_participants (job_id, employee_id, hours_or_days, amount_earned, day_rate, full_time)
    values (p_job, v_emp, round(v_hours, 2), null, null, v_hours = p_value)
    on conflict (job_id, employee_id) do nothing;
  end loop;

  -- El encargado que cierra cuenta siempre como participante (completo)
  if v_role = 'encargado' then
    insert into public.job_participants (job_id, employee_id, hours_or_days, amount_earned, full_time)
    values (p_job, v_me, round(p_value, 2), null, true)
    on conflict (job_id, employee_id) do nothing;
  end if;

  select count(*) into v_count from public.job_participants where job_id = p_job;
  if v_count = 0 then
    raise exception 'Indica al menos un participante.' using errcode = '22023';
  end if;

  update public.jobs
     set status          = 'pendiente_revision',
         duration_unit   = p_unit,
         duration_value  = round(p_value, 2),
         completion_date = coalesce(p_completion_date, current_date),
         completion_time = coalesce(p_completion_time, localtime),
         close_note      = nullif(btrim(coalesce(p_note, '')), ''),
         closed_by       = v_me,
         closed_at       = now(),
         encargado_id    = coalesce(encargado_id, case when v_role = 'encargado' then v_me end),
         return_reason   = null,
         reviewed_by     = null,
         reviewed_at     = null
   where id = p_job
  returning * into j;

  insert into public.audit_log (actor_id, action, entity, entity_id, details)
  values (v_me, 'job_closed', 'jobs', p_job::text,
          jsonb_build_object('duration_unit', p_unit, 'duration_value', p_value,
                             'participants', (select jsonb_agg(jsonb_build_object('employee_id', employee_id, 'hours_or_days', hours_or_days))
                                                from public.job_participants where job_id = p_job),
                             'note', j.close_note));

  perform public.notify_roles(
    array['secretaria', 'admin'], 'job_review', 'Trabajo pendiente de revisión',
    public.job_summary(j) || ' · cerrado por ' || public.actor_name() || ' · ' || v_count || ' participante(s)',
    jsonb_build_object('job_id', p_job), 'job_review:' || p_job || ':' || extract(epoch from now())::bigint,
    '/trabajos');

  return j;
end;
$$;

-- ---------------------------------------------------------------------
-- 6. Datos de revisión (secretaría y admin)
-- ---------------------------------------------------------------------
create or replace function public.revision_trabajo(p_job uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  j public.jobs;
  v_date date;
begin
  if not public.is_staff() then
    raise exception 'Solo la secretaría o el administrador pueden revisar trabajos.' using errcode = '42501';
  end if;
  select * into j from public.jobs where id = p_job;
  if not found then
    raise exception 'Trabajo no encontrado.' using errcode = 'P0002';
  end if;
  v_date := coalesce(j.completion_date, j.job_date);

  return jsonb_build_object(
    'job', to_jsonb(j) || jsonb_build_object(
      'closed_by_name',   (select full_name from public.profiles where id = j.closed_by),
      'reviewed_by_name', (select full_name from public.profiles where id = j.reviewed_by),
      'encargado_name',   (select full_name from public.profiles where id = j.encargado_id)),
    'participants', coalesce((
      select jsonb_agg(jsonb_build_object(
               'employee_id', jp.employee_id, 'full_name', p.full_name, 'role', p.role,
               'avatar_path', p.avatar_path,
               'hours_or_days', jp.hours_or_days, 'full_time', jp.full_time,
               'day_rate', jp.day_rate, 'amount_earned', jp.amount_earned,
               'is_fixed', r.is_fixed, 'auto_rate', r.auto_rate,
               'salary_type', r.cur_type, 'salary_rate', r.cur_rate)
             order by case p.role when 'encargado' then 0 else 1 end, p.full_name)
        from public.job_participants jp
        join public.profiles p on p.id = jp.employee_id
        cross join lateral public.pay_rule(jp.employee_id, v_date, j.duration_unit) r
       where jp.job_id = j.id), '[]'::jsonb),
    'team', coalesce((
      select jsonb_agg(jsonb_build_object(
               'employee_id', p.id, 'full_name', p.full_name, 'role', p.role,
               'avatar_path', p.avatar_path,
               'is_fixed', r.is_fixed, 'auto_rate', r.auto_rate,
               'salary_type', r.cur_type, 'salary_rate', r.cur_rate)
             order by case p.role when 'encargado' then 0 else 1 end, p.full_name)
        from public.profiles p
        cross join lateral public.pay_rule(p.id, v_date, j.duration_unit) r
       where p.role in ('encargado', 'ayudante') and p.is_active
         and p.account_status = 'activo' and p.deleted_at is null), '[]'::jsonb));
end;
$$;

-- ---------------------------------------------------------------------
-- 7. PASO B: aprobar_trabajo (secretaría o admin)
--    p_participants: [{ "employee_id": uuid, "hours_or_days": num, "day_rate": num|null }]
--    Los importes se recalculan aquí; lo que mande el móvil no cuenta.
-- ---------------------------------------------------------------------
create or replace function public.aprobar_trabajo(
  p_job uuid,
  p_participants jsonb,
  p_total_cost numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  j public.jobs;
  e jsonb;
  v_emp uuid;
  v_hours numeric;
  v_rate numeric;
  v_amount numeric;
  v_ids uuid[] := '{}';
  r record;
  v_total numeric := 0;
  v_unit_txt text;
  v_body text;
begin
  if not public.is_staff() then
    raise exception 'Solo la secretaría o el administrador pueden aprobar trabajos.' using errcode = '42501';
  end if;

  select * into j from public.jobs where id = p_job for update;
  if not found then
    raise exception 'Trabajo no encontrado.' using errcode = 'P0002';
  end if;
  if j.status <> 'pendiente_revision' then
    raise exception 'Este trabajo ya no está pendiente de revisión (estado: %).', replace(j.status, '_', ' ')
      using errcode = '22023';
  end if;
  if p_total_cost is null or p_total_cost < 0 then
    raise exception 'Indica el importe cobrado al cliente.' using errcode = '22023';
  end if;
  if p_participants is null or jsonb_typeof(p_participants) <> 'array' or jsonb_array_length(p_participants) = 0 then
    raise exception 'El trabajo necesita al menos un participante.' using errcode = '22023';
  end if;

  perform set_config('tramo.job_flow', 'on', true);

  for e in select * from jsonb_array_elements(p_participants) loop
    v_emp := nullif(e ->> 'employee_id', '')::uuid;
    if v_emp is null or v_emp = any(v_ids) then
      continue;
    end if;
    if not exists (select 1 from public.profiles
                    where id = v_emp and role in ('encargado', 'ayudante') and deleted_at is null) then
      raise exception 'Uno de los participantes no es un encargado o ayudante.' using errcode = '22023';
    end if;

    v_hours := nullif(e ->> 'hours_or_days', '')::numeric;
    if v_hours is null or v_hours <= 0 or v_hours > j.duration_value then
      raise exception 'Las horas o días de cada participante deben ser mayores que 0 y no superar %.', j.duration_value
        using errcode = '22023';
    end if;

    select * into r from public.pay_rule(v_emp, coalesce(j.completion_date, j.job_date), j.duration_unit);
    v_rate := null;
    if r.is_fixed then
      v_amount := 0;
    elsif r.auto_rate is not null then
      v_amount := round(v_hours * r.auto_rate, 2);
    else
      v_rate := nullif(e ->> 'day_rate', '')::numeric;
      if v_rate is null or v_rate <= 0 then
        raise exception 'Falta el precio por % de %.',
          case when j.duration_unit = 'dias' then 'día' else 'hora' end,
          (select full_name from public.profiles where id = v_emp)
          using errcode = '22023';
      end if;
      v_amount := round(v_hours * v_rate, 2);
    end if;

    insert into public.job_participants (job_id, employee_id, hours_or_days, amount_earned, day_rate, full_time)
    values (p_job, v_emp, round(v_hours, 2), v_amount, round(v_rate, 2), v_hours = j.duration_value)
    on conflict (job_id, employee_id) do update
      set hours_or_days = excluded.hours_or_days,
          amount_earned = excluded.amount_earned,
          day_rate      = excluded.day_rate,
          full_time     = excluded.full_time;

    v_ids := v_ids || v_emp;
    v_total := v_total + v_amount;
  end loop;

  if array_length(v_ids, 1) is null then
    raise exception 'El trabajo necesita al menos un participante.' using errcode = '22023';
  end if;

  delete from public.job_participants where job_id = p_job and not (employee_id = any(v_ids));

  -- Finaliza: el trigger apply_job_earnings suma al saldo (una sola vez)
  update public.jobs
     set status        = 'finalizado',
         total_cost    = round(p_total_cost, 2),
         reviewed_by   = v_me,
         reviewed_at   = now(),
         return_reason = null
   where id = p_job
  returning * into j;

  insert into public.audit_log (actor_id, action, entity, entity_id, details)
  values (v_me, 'job_approved', 'jobs', p_job::text,
          jsonb_build_object('total_cost', j.total_cost, 'total_pagado', v_total,
                             'participants', (select jsonb_agg(jsonb_build_object(
                                                'employee_id', employee_id, 'hours_or_days', hours_or_days,
                                                'day_rate', day_rate, 'amount_earned', amount_earned))
                                                from public.job_participants where job_id = p_job)));

  -- Aviso a cada participante con lo que ganó
  v_unit_txt := case when j.duration_unit = 'dias' then 'días' else 'horas' end;
  for r in
    select jp.id, jp.employee_id, jp.hours_or_days, jp.amount_earned, p.payment_method
      from public.job_participants jp join public.profiles p on p.id = jp.employee_id
     where jp.job_id = p_job
  loop
    v_body := public.job_summary(j) || ' · '
      || replace(rtrim(rtrim(to_char(r.hours_or_days, 'FM999990.00'), '0'), '.'), '.', ',') || ' ' || v_unit_txt;
    if coalesce(r.amount_earned, 0) > 0 then
      v_body := v_body || ' · has ganado ' || public.fmt_eur(r.amount_earned);
    else
      v_body := v_body || ' · incluido en tu salario fijo';
    end if;
    perform public.notify(
      r.employee_id, 'job_completed', 'Trabajo aprobado', v_body,
      jsonb_build_object('job_id', p_job, 'amount', r.amount_earned, 'route', '/employee/finanzas'),
      'job_completed:' || r.id);
  end loop;

  return jsonb_build_object('job', to_jsonb(j), 'total_pagado', v_total);
end;
$$;

-- ---------------------------------------------------------------------
-- 8. Devolver al encargado (secretaría o admin)
-- ---------------------------------------------------------------------
create or replace function public.devolver_trabajo(p_job uuid, p_reason text)
returns public.jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  j public.jobs;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_target uuid;
begin
  if not public.is_staff() then
    raise exception 'Solo la secretaría o el administrador pueden devolver trabajos.' using errcode = '42501';
  end if;
  if v_reason is null then
    raise exception 'Escribe el motivo de la devolución.' using errcode = '22023';
  end if;

  select * into j from public.jobs where id = p_job for update;
  if not found then
    raise exception 'Trabajo no encontrado.' using errcode = 'P0002';
  end if;
  if j.status <> 'pendiente_revision' then
    raise exception 'Solo se pueden devolver trabajos pendientes de revisión.' using errcode = '22023';
  end if;

  perform set_config('tramo.job_flow', 'on', true);

  update public.jobs
     set status = 'en_curso', return_reason = left(v_reason, 500), reviewed_by = null, reviewed_at = null
   where id = p_job
  returning * into j;

  insert into public.audit_log (actor_id, action, entity, entity_id, details)
  values (v_me, 'job_returned', 'jobs', p_job::text, jsonb_build_object('reason', j.return_reason));

  v_target := coalesce(j.encargado_id, j.closed_by);
  perform public.notify(
    v_target, 'job_returned', 'Trabajo devuelto para corregir',
    public.job_summary(j) || ' · motivo: ' || j.return_reason,
    jsonb_build_object('job_id', p_job, 'route', '/employee/trabajos'),
    'job_returned:' || p_job || ':' || extract(epoch from now())::bigint);

  return j;
end;
$$;

-- ---------------------------------------------------------------------
-- 9. Participantes visibles para el encargado (sin importes ni precios)
-- ---------------------------------------------------------------------
create or replace function public.participantes_trabajo(p_job uuid)
returns table (employee_id uuid, full_name text, role text, hours_or_days numeric, full_time boolean)
language sql
stable
security definer
set search_path = public
as $$
  select jp.employee_id, p.full_name, p.role, jp.hours_or_days, jp.full_time
    from public.job_participants jp
    join public.profiles p on p.id = jp.employee_id
    join public.jobs j on j.id = jp.job_id
   where jp.job_id = p_job
     and (
       public.is_staff()
       or (public.my_role() = 'encargado'
           and (j.encargado_id = auth.uid() or j.closed_by = auth.uid()
                or exists (select 1 from public.job_participants me
                            where me.job_id = j.id and me.employee_id = auth.uid())))
     )
   order by case p.role when 'encargado' then 0 else 1 end, p.full_name;
$$;

revoke execute on function public.cerrar_trabajo(uuid, text, numeric, jsonb, date, time, text) from public, anon;
revoke execute on function public.revision_trabajo(uuid) from public, anon;
revoke execute on function public.aprobar_trabajo(uuid, jsonb, numeric) from public, anon;
revoke execute on function public.devolver_trabajo(uuid, text) from public, anon;
revoke execute on function public.participantes_trabajo(uuid) from public, anon;
grant execute on function public.cerrar_trabajo(uuid, text, numeric, jsonb, date, time, text) to authenticated;
grant execute on function public.revision_trabajo(uuid) to authenticated;
grant execute on function public.aprobar_trabajo(uuid, jsonb, numeric) to authenticated;
grant execute on function public.devolver_trabajo(uuid, text) to authenticated;
grant execute on function public.participantes_trabajo(uuid) to authenticated;
revoke execute on function public.guard_job_status() from public, anon, authenticated;
revoke execute on function public.guard_job_participants() from public, anon, authenticated;
revoke execute on function public.apply_job_earnings() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 10. Quién ve qué
-- ---------------------------------------------------------------------
-- Trabajos: todos ven los por realizar. 'pendiente_revision' solo el
-- encargado implicado. 'finalizado' solo quien participó.
drop policy if exists "Empleados aprobados ven trabajos confirmados o donde participan" on public.jobs;
create policy "Empleados aprobados ven trabajos confirmados o donde participan" on public.jobs
  for select to authenticated
  using (
    public.is_active_member()
    and (
      status in ('pendiente', 'confirmado', 'en_curso')
      or (status = 'finalizado' and exists (
            select 1 from public.job_participants jp
             where jp.job_id = jobs.id and jp.employee_id = auth.uid()))
      or (status = 'pendiente_revision' and public.my_role() = 'encargado'
          and (encargado_id = auth.uid() or closed_by = auth.uid()))
    )
  );

-- Estado de un trabajo sin pasar por RLS (evita recursión entre políticas)
create or replace function public.job_status(p_job uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$ select status from public.jobs where id = p_job; $$;

revoke execute on function public.job_status(uuid) from public, anon;
grant execute on function public.job_status(uuid) to authenticated;

-- Participaciones propias: el ayudante solo las ve cuando el trabajo está
-- finalizado; el encargado también mientras está en revisión.
drop policy if exists "Empleado ve sus propias participaciones" on public.job_participants;
create policy "Empleado ve sus propias participaciones" on public.job_participants
  for select to authenticated
  using (
    auth.uid() = employee_id
    and public.is_active_member()
    and (
      public.my_role() = 'encargado'
      or public.job_status(job_id) = 'finalizado'
    )
  );

-- Vista de trabajos por realizar del empleado (columnas nuevas al final)
create or replace view public.employee_available_jobs
with (security_invoker = true) as
select id as job_id,
       job_type,
       job_date,
       start_time,
       client_name,
       client_phone,
       case when job_type = 'mudanza' then (pickup_point || ' -> ' || dropoff_point)
            else work_point end as address_info,
       status,
       encargado_id,
       return_reason,
       duration_unit,
       duration_value,
       closed_at
  from public.jobs
 where status in ('pendiente', 'confirmado', 'en_curso', 'pendiente_revision');

grant select on public.employee_available_jobs to authenticated;

-- ---------------------------------------------------------------------
-- 11. (OPCIONAL, desactivado) Los 13 trabajos antiguos 'finalizado' sin
--     participantes. Si quieres que pasen a 'confirmado', quita los
--     comentarios. OJO: dejarán de contar como ingresos en Finanzas.
-- ---------------------------------------------------------------------
-- update public.jobs set status = 'confirmado'
--  where status = 'finalizado'
--    and not exists (select 1 from public.job_participants jp where jp.job_id = jobs.id);


-- >>>>> migrations/20261112200000_panel_encargado.sql
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

commit;

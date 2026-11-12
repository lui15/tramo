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

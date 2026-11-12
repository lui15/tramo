-- =====================================================================
-- FASE 2 — Usuarios, roles, cuentas, salario base y auditoría
-- Migración compatible: no borra filas ni columnas existentes.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. ROLES: admin / secretaria / encargado / ayudante
--    ('supervisor' pasa a 'encargado'; hoy no hay ninguno)
-- ---------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;
update public.profiles set role = 'encargado' where role = 'supervisor';
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'secretaria', 'encargado', 'ayudante'));

-- ---------------------------------------------------------------------
-- 2. NUEVAS COLUMNAS DE PERFIL
-- ---------------------------------------------------------------------
alter table public.profiles
  add column if not exists username              text,
  add column if not exists avatar_path           text,
  add column if not exists hire_date             date,
  add column if not exists account_status        text not null default 'activo',
  add column if not exists salary_type           text,
  add column if not exists salary_rate           numeric(12,2),
  add column if not exists must_change_password  boolean not null default false,
  add column if not exists failed_login_attempts integer not null default 0,
  add column if not exists locked_until          timestamptz,
  add column if not exists deleted_at            timestamptz,
  add column if not exists last_login_at         timestamptz;

alter table public.profiles drop constraint if exists profiles_account_status_check;
alter table public.profiles add constraint profiles_account_status_check
  check (account_status in ('activo', 'suspendido', 'desactivado'));

alter table public.profiles drop constraint if exists profiles_salary_type_check;
alter table public.profiles add constraint profiles_salary_type_check
  check (salary_type is null or salary_type in ('hora', 'dia', 'mes'));

alter table public.profiles drop constraint if exists profiles_salary_rate_check;
alter table public.profiles add constraint profiles_salary_rate_check
  check (salary_rate is null or salary_rate >= 0);

alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles add constraint profiles_username_format
  check (username is null or username ~ '^[a-z0-9._-]{3,30}$');

create unique index if not exists profiles_username_unique
  on public.profiles (lower(username));

-- Datos existentes: usuario del admin a partir de su email; estados coherentes.
update public.profiles
   set username = lower(regexp_replace(split_part(email, '@', 1), '[^a-zA-Z0-9._-]', '', 'g'))
 where username is null and email is not null;

update public.profiles
   set account_status = case when is_active then 'activo' else 'desactivado' end,
       hire_date      = coalesce(hire_date, created_at::date);

update public.profiles
   set salary_type = case payment_method when 'fijo' then 'mes' when 'acumulativo' then 'hora' end,
       salary_rate = case payment_method when 'fijo' then fixed_salary end
 where salary_type is null and payment_method is not null;

comment on column public.profiles.username is 'Nombre de usuario para iniciar sesión (minúsculas, único).';
comment on column public.profiles.account_status is 'activo | suspendido | desactivado. Solo "activo" puede usar la app.';
comment on column public.profiles.salary_type is 'Modalidad salarial vigente: hora | dia | mes. El histórico está en salary_history.';

-- ---------------------------------------------------------------------
-- 3. HISTORIAL DE SALARIOS
-- ---------------------------------------------------------------------
create table if not exists public.salary_history (
  id             uuid primary key default gen_random_uuid(),
  employee_id    uuid not null references public.profiles(id),
  salary_type    text not null check (salary_type in ('hora', 'dia', 'mes')),
  salary_rate    numeric(12,2) not null check (salary_rate >= 0),
  effective_from date not null,
  note           text,
  created_by     uuid references public.profiles(id),
  created_at     timestamptz not null default now()
);
create index if not exists salary_history_employee_idx
  on public.salary_history (employee_id, effective_from desc, created_at desc);
alter table public.salary_history enable row level security;

comment on table public.salary_history is
  'Cada cambio de salario con su fecha de aplicación. Nunca se modifica ni borra: los trabajos usan la tarifa vigente en su fecha.';

-- Tarifa vigente de un empleado en una fecha
create or replace function public.salary_at(p_employee uuid, p_date date)
returns table (salary_type text, salary_rate numeric)
language sql stable security definer set search_path = public
as $$
  select h.salary_type, h.salary_rate
    from public.salary_history h
   where h.employee_id = p_employee and h.effective_from <= p_date
   order by h.effective_from desc, h.created_at desc
   limit 1;
$$;

-- ---------------------------------------------------------------------
-- 4. AUDITORÍA
-- ---------------------------------------------------------------------
create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid,
  action      text not null,
  entity      text not null,
  entity_id   text,
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists audit_log_entity_idx on public.audit_log (entity, entity_id, created_at desc);
create index if not exists audit_log_created_idx on public.audit_log (created_at desc);
alter table public.audit_log enable row level security;

comment on table public.audit_log is 'Registro inmutable de operaciones importantes (quién, qué, cuándo).';

-- Trigger genérico: guarda qué columnas cambiaron y quién lo hizo
create or replace function public.audit_row_change()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end;
  v_new jsonb := case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end;
  v_changes jsonb := '{}'::jsonb;
  k text;
begin
  if tg_op = 'UPDATE' then
    for k in select jsonb_object_keys(v_new) loop
      if k not in ('updated_at', 'last_login_at', 'failed_login_attempts', 'locked_until')
         and (v_old -> k) is distinct from (v_new -> k) then
        v_changes := v_changes || jsonb_build_object(k, jsonb_build_object('antes', v_old -> k, 'despues', v_new -> k));
      end if;
    end loop;
    if v_changes = '{}'::jsonb then
      return new;
    end if;
  elsif tg_op = 'INSERT' then
    v_changes := v_new;
  else
    v_changes := v_old;
  end if;

  insert into public.audit_log (actor_id, action, entity, entity_id, details)
  values (auth.uid(), lower(tg_op), tg_table_name,
          coalesce(v_new ->> 'id', v_old ->> 'id'), v_changes);
  return coalesce(new, old);
end;
$$;

drop trigger if exists audit_profiles on public.profiles;
create trigger audit_profiles after insert or update or delete on public.profiles
  for each row execute function public.audit_row_change();
drop trigger if exists audit_jobs on public.jobs;
create trigger audit_jobs after insert or update or delete on public.jobs
  for each row execute function public.audit_row_change();
drop trigger if exists audit_settlements on public.settlements;
create trigger audit_settlements after insert or update or delete on public.settlements
  for each row execute function public.audit_row_change();
drop trigger if exists audit_expenses on public.expenses;
create trigger audit_expenses after insert or update or delete on public.expenses
  for each row execute function public.audit_row_change();
drop trigger if exists audit_salary_history on public.salary_history;
create trigger audit_salary_history after insert or update or delete on public.salary_history
  for each row execute function public.audit_row_change();

-- ---------------------------------------------------------------------
-- 5. FUNCIONES DE PERMISOS
-- ---------------------------------------------------------------------
-- Rol del usuario actual, solo si su cuenta está activa
create or replace function public.my_role()
returns text language sql stable security definer set search_path = public
as $$
  select p.role from public.profiles p
   where p.id = auth.uid() and p.is_active and p.account_status = 'activo';
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce(public.my_role() = 'admin', false); $$;

create or replace function public.is_staff()  -- admin o secretaria
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce(public.my_role() in ('admin', 'secretaria'), false); $$;

create or replace function public.is_active_member()
returns boolean language sql stable security definer set search_path = public
as $$ select public.my_role() is not null; $$;

-- ¿La llamada viene del servidor (service_role / migraciones) y no de un usuario?
create or replace function public.is_backend_call()
returns boolean language sql stable set search_path = public
as $$
  select coalesce(auth.jwt() ->> 'role', '') = 'service_role'
      or session_user <> 'authenticator';
$$;

-- ---------------------------------------------------------------------
-- 6. PROTECCIÓN DE CAMPOS DEL PERFIL
--    Un usuario normal solo puede cambiar su foto. El admin no puede
--    cambiarse el rol ni desactivarse a sí mismo.
-- ---------------------------------------------------------------------
create or replace function public.protect_privileged_profile_fields()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_avatar text;
begin
  if public.is_backend_call() then
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
    -- Estos campos solo los gestiona el servidor
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

-- ---------------------------------------------------------------------
-- 7. ALTA DE USUARIOS: solo el administrador (Edge Function admin-users)
--    El registro público queda bloqueado en la base de datos.
-- ---------------------------------------------------------------------
create or replace function public.enforce_gmail_email()
returns trigger language plpgsql set search_path = public
as $$
begin
  -- Solo se aceptan las cuentas internas que crea la Edge Function admin-users.
  -- (Aunque alguien lograra registrarse, su perfil nace desactivado y sin acceso.)
  if coalesce(new.raw_app_meta_data ->> 'created_by_admin', 'false') <> 'true'
     and coalesce(new.email, '') !~* '@tramo\.local$' then
    raise exception 'El registro está deshabilitado. Las cuentas las crea el administrador.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  -- El perfil nace desactivado; la Edge Function lo activa tras configurarlo.
  insert into public.profiles (id, email, full_name, account_status, is_approved)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
          'desactivado', false);
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 8. CAMBIO DE SALARIO (admin) — conserva el histórico
-- ---------------------------------------------------------------------
create or replace function public.change_salary(
  p_employee uuid, p_salary_type text, p_salary_rate numeric,
  p_effective_from date default current_date, p_note text default null)
returns public.salary_history
language plpgsql security definer set search_path = public
as $$
declare
  v_row public.salary_history;
  v_current record;
begin
  if not (public.is_admin() or public.is_backend_call()) then
    raise exception 'Solo el administrador puede cambiar salarios' using errcode = '42501';
  end if;
  if p_salary_type not in ('hora', 'dia', 'mes') then
    raise exception 'Modalidad salarial no válida' using errcode = '22023';
  end if;
  if p_salary_rate is null or p_salary_rate < 0 then
    raise exception 'Importe de salario no válido' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles where id = p_employee and role <> 'admin') then
    raise exception 'Colaborador no encontrado' using errcode = 'P0002';
  end if;

  insert into public.salary_history (employee_id, salary_type, salary_rate, effective_from, note, created_by)
  values (p_employee, p_salary_type, round(p_salary_rate, 2), coalesce(p_effective_from, current_date), p_note, auth.uid())
  returning * into v_row;

  -- La ficha refleja la tarifa vigente HOY (los cambios futuros se aplican en su fecha)
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

-- Aplica cambios salariales programados cuya fecha ya llegó (idempotente)
create or replace function public.sync_current_salaries()
returns integer language plpgsql security definer set search_path = public
as $$
declare n integer := 0; r record;
begin
  for r in
    select p.id, s.salary_type, s.salary_rate
      from public.profiles p
      cross join lateral public.salary_at(p.id, current_date) s
     where p.salary_type is distinct from s.salary_type or p.salary_rate is distinct from s.salary_rate
  loop
    update public.profiles
       set salary_type = r.salary_type, salary_rate = r.salary_rate,
           payment_method = case when r.salary_type = 'mes' then 'fijo' else 'acumulativo' end,
           fixed_salary   = case when r.salary_type = 'mes' then r.salary_rate end
     where id = r.id;
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- ---------------------------------------------------------------------
-- 9. DIRECTORIO DEL EQUIPO (sin datos salariales)
--    Admin, secretaria y encargado ven quién existe y su cargo.
-- ---------------------------------------------------------------------
create or replace function public.list_team()
returns table (id uuid, full_name text, username text, role text,
               avatar_path text, account_status text, hire_date date)
language sql stable security definer set search_path = public
as $$
  select p.id, p.full_name, p.username, p.role, p.avatar_path, p.account_status, p.hire_date
    from public.profiles p
   where public.my_role() in ('admin', 'secretaria', 'encargado')
     and p.deleted_at is null
     and p.role <> 'admin'
   order by p.full_name;
$$;

-- Marca que el usuario ya cambió su contraseña inicial
create or replace function public.mark_password_changed()
returns void language sql security definer set search_path = public
as $$
  update public.profiles set must_change_password = false where id = auth.uid();
$$;

-- Cierra todas las sesiones de un usuario (solo desde el servidor)
create or replace function public.revoke_user_sessions(p_user uuid)
returns void language plpgsql security definer set search_path = public, auth
as $$
begin
  if not public.is_backend_call() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  delete from auth.refresh_tokens where user_id = p_user::text;
  delete from auth.sessions where user_id = p_user;
end;
$$;

-- ---------------------------------------------------------------------
-- 10. POLÍTICAS RLS
-- ---------------------------------------------------------------------
-- profiles: ya no se borran perfiles (eliminación lógica)
drop policy if exists "Admin elimina perfiles" on public.profiles;

-- salary_history: admin todo (lectura), empleado su propio historial
drop policy if exists "salary_history_select" on public.salary_history;
create policy "salary_history_select" on public.salary_history
  for select to authenticated
  using (public.is_admin() or (employee_id = auth.uid() and public.is_active_member()));
-- (Las escrituras se hacen solo con change_salary())

-- audit_log: solo el admin lo consulta; nadie lo modifica desde la app
drop policy if exists "audit_log_admin_select" on public.audit_log;
create policy "audit_log_admin_select" on public.audit_log
  for select to authenticated using (public.is_admin());

-- Políticas de empleados: exigen cuenta activa
drop policy if exists "Empleado ve sus propias participaciones" on public.job_participants;
create policy "Empleado ve sus propias participaciones" on public.job_participants
  for select to authenticated
  using (auth.uid() = employee_id and public.is_active_member());

drop policy if exists "Empleado ve sus propios saldos" on public.settlements;
create policy "Empleado ve sus propios saldos" on public.settlements
  for select to authenticated
  using (auth.uid() = employee_id and public.is_active_member());

drop policy if exists "Empleados aprobados ven trabajos confirmados o donde participan" on public.jobs;
create policy "Empleados aprobados ven trabajos confirmados o donde participan" on public.jobs
  for select to authenticated
  using (public.is_active_member() and (
          status in ('confirmado', 'en_curso')
          or exists (select 1 from public.job_participants jp
                      where jp.job_id = jobs.id and jp.employee_id = auth.uid())));

-- ---------------------------------------------------------------------
-- 11. PERMISOS DE EJECUCIÓN
-- ---------------------------------------------------------------------
revoke all on public.salary_history, public.audit_log from anon;
revoke insert, update, delete, truncate on public.salary_history, public.audit_log from authenticated;
grant select on public.salary_history, public.audit_log to authenticated;

revoke execute on function public.audit_row_change(), public.revoke_user_sessions(uuid),
  public.sync_current_salaries(), public.salary_at(uuid, date), public.is_backend_call()
  from public, anon, authenticated;

revoke execute on function public.my_role(), public.is_admin(), public.is_staff(),
  public.is_active_member(), public.list_team(), public.mark_password_changed(),
  public.change_salary(uuid, text, numeric, date, text)
  from public, anon;
grant execute on function public.my_role(), public.is_admin(), public.is_staff(),
  public.is_active_member(), public.list_team(), public.mark_password_changed(),
  public.change_salary(uuid, text, numeric, date, text)
  to authenticated;

-- ---------------------------------------------------------------------
-- 12. ALMACENAMIENTO DE FOTOS DE PERFIL (bucket privado)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "avatars_read_members" on storage.objects;
create policy "avatars_read_members" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and public.is_active_member());

drop policy if exists "avatars_admin_write" on storage.objects;
create policy "avatars_admin_write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and public.is_admin());

drop policy if exists "avatars_admin_update" on storage.objects;
create policy "avatars_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and public.is_admin());

drop policy if exists "avatars_admin_delete" on storage.objects;
create policy "avatars_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and public.is_admin());

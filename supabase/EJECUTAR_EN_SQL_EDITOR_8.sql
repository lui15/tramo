-- Ejecutar TODO este archivo en Supabase > SQL Editor > Run
begin;
-- =====================================================================
-- 20261116100000_detalles_contratista.sql
--
-- 1. jobs.details: detalles del trabajo (qué hay que mover, montar u
--    obrar). Se ven en la ficha del encargado y del staff.
-- 2. ASOCIADOS: personas o empresas a las que el administrador pasa
--    trabajos como contratista. NO son usuarios (no tienen cuenta ni rol,
--    no ven nada). Nombre, teléfono y especialidades (mudanza, montaje,
--    reforma: una, dos o las tres).
-- 3. TRABAJOS COMO CONTRATISTA (contract_jobs): tabla aparte para no
--    mezclarlos con los trabajos del equipo (ni avisos, ni recordatorios,
--    ni ingresos de Finanzas). Guardan el presupuesto total y lo que gana
--    el administrador (lo que él indique). Estados: confirmado / cobrado.
-- Solo el administrador ve y gestiona asociados y trabajos de contratista.
-- Compatible: solo añade una columna nullable y dos tablas nuevas.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Detalles del trabajo
-- ---------------------------------------------------------------------
alter table public.jobs add column if not exists details text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'jobs_details_len') then
    alter table public.jobs add constraint jobs_details_len check (details is null or length(details) <= 2000);
  end if;
end $$;

drop function if exists public.encargado_trabajos(int, int);

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
  closed_at timestamptz,
  price_type text,
  price_amount numeric,
  closed_price numeric,
  photo_count int,
  pickup_point text,
  dropoff_point text,
  work_point text,
  details text
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
         coalesce(j.encargado_id = auth.uid(), false),
         me.hours_or_days,
         j.return_reason,
         j.duration_unit,
         j.duration_value,
         j.completion_date,
         j.completion_time,
         j.closed_at,
         case when j.encargado_id = auth.uid() then j.price_type end,
         case when j.encargado_id = auth.uid() then j.price_amount end,
         case when j.encargado_id = auth.uid() then j.closed_price end,
         (select count(*)::int from public.job_photos ph where ph.job_id = j.id),
         j.pickup_point,
         j.dropoff_point,
         j.work_point,
         j.details
    from public.jobs j
    left join public.profiles e on e.id = j.encargado_id
    left join public.job_participants me on me.job_id = j.id and me.employee_id = auth.uid()
   where public.my_role() = 'encargado'
     and public.is_active_member()
     and p_month between 1 and 12
     and j.job_date >= make_date(p_year, p_month, 1)
     and j.job_date < (make_date(p_year, p_month, 1) + interval '1 month')::date
     and (j.encargado_id = auth.uid()
          or (me.employee_id is not null and j.status = 'finalizado'))
   order by j.job_date, j.start_time;
$$;

revoke all on function public.encargado_trabajos(int, int) from public, anon;
grant execute on function public.encargado_trabajos(int, int) to authenticated;

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
      array['admin'], 'job_created', 'Nuevo trabajo',
      public.job_summary(new),
      jsonb_build_object('job_id', new.id), 'job_created:' || new.id, '/trabajos');
    if new.encargado_id is not null then
      perform public.notify(
        new.encargado_id, 'job_assigned', 'Tienes un trabajo nuevo',
        public.job_summary(new) || ' · eres el encargado.',
        jsonb_build_object('job_id', new.id, 'route', '/employee/trabajos'),
        'job_assigned:' || new.id || ':' || new.encargado_id);
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    perform public.notify_roles(
      array['admin'], 'job_deleted', 'Trabajo eliminado',
      public.job_summary(old) || ' ha sido eliminado.',
      jsonb_build_object('job_id', old.id), 'job_deleted:' || old.id, '/trabajos');
    if old.encargado_id is not null and old.status <> 'finalizado' then
      perform public.notify(
        old.encargado_id, 'job_deleted', 'Trabajo eliminado',
        public.job_summary(old) || ' ha sido eliminado.',
        jsonb_build_object('job_id', old.id, 'route', '/employee/trabajos'),
        'job_deleted:' || old.id || ':' || old.encargado_id);
    end if;
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
  if new.details is distinct from old.details then
    v_changes := v_changes || 'detalles';
  end if;
  if new.price_type is distinct from old.price_type or new.price_amount is distinct from old.price_amount then
    v_changes := v_changes || 'precio';
  end if;
  if new.status is distinct from old.status then
    v_changes := v_changes || ('estado: ' || replace(new.status, '_', ' '));
  end if;

  if new.encargado_id is distinct from old.encargado_id then
    if new.encargado_id is not null then
      perform public.notify(
        new.encargado_id, 'job_assigned', 'Te han asignado un trabajo',
        public.job_summary(new) || ' · eres el encargado.',
        v_data || jsonb_build_object('route', '/employee/trabajos'),
        'job_assigned:' || new.id || ':' || new.encargado_id);
    end if;
    if old.encargado_id is not null then
      perform public.notify(
        old.encargado_id, 'job_unassigned', 'Ya no eres el encargado',
        public.job_summary(new) || ' se ha asignado a otra persona.',
        v_data || jsonb_build_object('route', '/employee/trabajos'),
        'job_unassigned:' || new.id || ':' || old.encargado_id || ':' || extract(epoch from now())::bigint);
    end if;
  elsif array_length(v_changes, 1) > 0 and new.encargado_id is not null then
    perform public.notify(
      new.encargado_id, 'job_updated', 'Trabajo modificado',
      public.job_summary(new) || ' · cambios: ' || array_to_string(v_changes, ', '),
      v_data || jsonb_build_object('route', '/employee/trabajos'),
      'job_updated:' || new.id || ':' || extract(epoch from coalesce(new.updated_at, now()))::bigint);
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Asociados
-- ---------------------------------------------------------------------
create table if not exists public.associates (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  specialties text[] not null default '{}',
  notes text,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint associates_name_check check (length(btrim(full_name)) > 0),
  constraint associates_specialties_check check (
    specialties <@ array['mudanza', 'montaje', 'reforma']::text[]
    and cardinality(specialties) >= 1
  )
);

alter table public.associates enable row level security;

drop policy if exists "Admin gestiona asociados" on public.associates;
create policy "Admin gestiona asociados" on public.associates
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update on public.associates to authenticated;
revoke all on public.associates from anon;

-- ---------------------------------------------------------------------
-- 3. Trabajos como contratista
-- ---------------------------------------------------------------------
create table if not exists public.contract_jobs (
  id uuid primary key default gen_random_uuid(),
  service_type text not null,
  associate_id uuid not null references public.associates(id),
  client_name text not null,
  client_phone text,
  pickup_point text,
  dropoff_point text,
  work_point text,
  job_date date not null,
  start_time time,
  details text,
  budget_amount numeric(12, 2) not null,
  my_earning numeric(12, 2) not null,
  status text not null default 'confirmado',
  paid_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contract_jobs_service_check check (service_type in ('mudanza', 'montaje', 'reforma')),
  constraint contract_jobs_status_check check (status in ('confirmado', 'cobrado')),
  constraint contract_jobs_budget_check check (budget_amount > 0),
  constraint contract_jobs_earning_check check (my_earning >= 0 and my_earning <= budget_amount),
  constraint contract_jobs_details_len check (details is null or length(details) <= 2000)
);

create index if not exists contract_jobs_date_idx on public.contract_jobs(job_date);
create index if not exists contract_jobs_associate_idx on public.contract_jobs(associate_id);

-- updated_at, fecha de cobro y que el asociado haga ese servicio
create or replace function public.contract_jobs_before_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  new.client_name := btrim(new.client_name);
  new.details := nullif(btrim(coalesce(new.details, '')), '');

  if new.status = 'cobrado' and (tg_op = 'INSERT' or old.status is distinct from 'cobrado') then
    new.paid_at := coalesce(new.paid_at, now());
  elsif new.status = 'confirmado' then
    new.paid_at := null;
  end if;

  if tg_op = 'INSERT' or new.associate_id is distinct from old.associate_id
     or new.service_type is distinct from old.service_type then
    if not exists (select 1 from public.associates a
                    where a.id = new.associate_id and a.is_active
                      and new.service_type = any(a.specialties)) then
      raise exception 'Ese asociado no hace este tipo de servicio.' using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists contract_jobs_before_write on public.contract_jobs;
create trigger contract_jobs_before_write
  before insert or update on public.contract_jobs
  for each row execute function public.contract_jobs_before_write();

create or replace function public.associates_touch()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  new.full_name := btrim(new.full_name);
  return new;
end;
$$;

drop trigger if exists associates_touch on public.associates;
create trigger associates_touch
  before insert or update on public.associates
  for each row execute function public.associates_touch();

alter table public.contract_jobs enable row level security;

drop policy if exists "Admin gestiona trabajos de contratista" on public.contract_jobs;
create policy "Admin gestiona trabajos de contratista" on public.contract_jobs
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update, delete on public.contract_jobs to authenticated;
revoke all on public.contract_jobs from anon;

commit;

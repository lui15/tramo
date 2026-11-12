-- =====================================================================
-- 20261112220000_precio_fotos_encargado.sql
--
-- 1. Precio del trabajo al crearlo (fijo / por hora / por día) y precio
--    final cobrado, que el encargado indica al cerrar.
-- 2. Fotos de los trabajos (bucket privado job-photos + tabla job_photos).
-- 3. Todo trabajo nuevo necesita un encargado. Solo ese encargado ve
--    sus trabajos por hacer; los ayudantes ya no ven trabajos abiertos
--    (solo los finalizados en los que participaron).
-- 4. Avisos de trabajo nuevo/modificado/eliminado: solo al encargado
--    asignado (y al admin), no a todos los encargados.
-- 5. La secretaría puede ver y añadir gastos (Finanzas); edita o borra
--    solo los que registró ella.
--
-- Compatible: solo añade columnas nullable, una tabla y un bucket.
-- No modifica ni borra datos existentes.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Columnas de precio
-- ---------------------------------------------------------------------
alter table public.jobs add column if not exists price_type text;
alter table public.jobs add column if not exists price_amount numeric(12, 2);
alter table public.jobs add column if not exists closed_price numeric(12, 2);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'jobs_price_type_check') then
    alter table public.jobs add constraint jobs_price_type_check
      check (price_type is null or price_type in ('fijo', 'hora', 'dia'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'jobs_price_amount_check') then
    alter table public.jobs add constraint jobs_price_amount_check
      check (price_amount is null or price_amount >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'jobs_closed_price_check') then
    alter table public.jobs add constraint jobs_closed_price_check
      check (closed_price is null or closed_price >= 0);
  end if;
end $$;

comment on column public.jobs.price_type   is 'Cómo se cobra el trabajo: fijo, hora o dia';
comment on column public.jobs.price_amount is 'Precio acordado: total (fijo) o precio por hora/día';
comment on column public.jobs.closed_price is 'Lo que el encargado dice que se cobró al cerrar';

-- ---------------------------------------------------------------------
-- 2. Encargado obligatorio en trabajos nuevos
-- ---------------------------------------------------------------------
create or replace function public.require_job_encargado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_backend_call() then
    return new;
  end if;

  if new.status in ('pendiente', 'confirmado', 'en_curso') then
    if new.encargado_id is null then
      raise exception 'Elige un encargado para este trabajo.' using errcode = '23502';
    end if;
    if tg_op = 'INSERT' or new.encargado_id is distinct from old.encargado_id then
      if not exists (select 1 from public.profiles
                      where id = new.encargado_id and role = 'encargado'
                        and is_active and account_status = 'activo' and deleted_at is null) then
        raise exception 'El encargado elegido no es un encargado activo.' using errcode = '22023';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists require_job_encargado on public.jobs;
create trigger require_job_encargado
  before insert or update of encargado_id, status on public.jobs
  for each row execute function public.require_job_encargado();

-- ---------------------------------------------------------------------
-- 3. Quién ve qué trabajos (encargado y ayudante)
--    - Encargado: todos los trabajos en los que es el encargado (cualquier
--      estado y mes) + los finalizados en los que participó.
--    - Ayudante: solo los finalizados en los que participó.
-- ---------------------------------------------------------------------
drop policy if exists "Empleados aprobados ven trabajos confirmados o donde participan" on public.jobs;
create policy "Empleados aprobados ven trabajos confirmados o donde participan" on public.jobs
  for select to authenticated
  using (
    public.is_active_member()
    and (
      (public.my_role() = 'encargado' and encargado_id = auth.uid())
      or (status = 'finalizado'
          and exists (select 1 from public.job_participants jp
                       where jp.job_id = jobs.id and jp.employee_id = auth.uid()))
    )
  );

-- ---------------------------------------------------------------------
-- 4. Cierre con precio cobrado (sustituye a la versión anterior)
-- ---------------------------------------------------------------------
drop function if exists public.cerrar_trabajo(uuid, text, numeric, jsonb, date, time, text);

create or replace function public.cerrar_trabajo(
  p_job uuid,
  p_unit text,
  p_value numeric,
  p_participants jsonb,
  p_completion_date date default current_date,
  p_completion_time time default localtime,
  p_note text default null,
  p_price numeric default null
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

  if v_role = 'encargado' and j.encargado_id is distinct from v_me then
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
  if p_price is null or p_price < 0 or p_price > 1000000 then
    raise exception 'Indica cuánto se cobró al cliente por este trabajo.' using errcode = '22023';
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
         closed_price    = round(p_price, 2),
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
                             'note', j.close_note, 'closed_price', j.closed_price));

  perform public.notify_roles(
    array['secretaria', 'admin'], 'job_review', 'Trabajo pendiente de revisión',
    public.job_summary(j) || ' · cerrado por ' || public.actor_name() || ' · ' || v_count || ' participante(s) · cobrado ' || public.fmt_eur(j.closed_price),
    jsonb_build_object('job_id', p_job), 'job_review:' || p_job || ':' || extract(epoch from now())::bigint,
    '/trabajos');

  return j;
end;
$$;

revoke all on function public.cerrar_trabajo(uuid, text, numeric, jsonb, date, time, text, numeric) from public, anon;
grant execute on function public.cerrar_trabajo(uuid, text, numeric, jsonb, date, time, text, numeric) to authenticated;

-- ---------------------------------------------------------------------
-- 5. Fotos de trabajos
-- ---------------------------------------------------------------------
create table if not exists public.job_photos (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  path text not null unique,
  uploaded_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists job_photos_job_idx on public.job_photos(job_id);

-- ¿Puede el usuario actual ver/subir fotos de este trabajo?
create or replace function public.can_access_job(p_job uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_active_member() and (
    public.is_staff()
    or exists (select 1 from public.jobs j where j.id = p_job and j.encargado_id = auth.uid())
  );
$$;

-- Lo mismo a partir de la ruta del archivo: "<job_id>/<archivo>"
create or replace function public.can_access_job_path(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_job uuid;
begin
  begin
    v_job := split_part(p_name, '/', 1)::uuid;
  exception when others then
    return false;
  end;
  return public.can_access_job(v_job);
end;
$$;

revoke all on function public.can_access_job(uuid) from public, anon;
revoke all on function public.can_access_job_path(text) from public, anon;
grant execute on function public.can_access_job(uuid) to authenticated;
grant execute on function public.can_access_job_path(text) to authenticated;

alter table public.job_photos enable row level security;

drop policy if exists "Fotos: ver" on public.job_photos;
create policy "Fotos: ver" on public.job_photos
  for select to authenticated using (public.can_access_job(job_id));

drop policy if exists "Fotos: subir" on public.job_photos;
create policy "Fotos: subir" on public.job_photos
  for insert to authenticated
  with check (public.can_access_job(job_id) and uploaded_by = auth.uid()
              and split_part(path, '/', 1) = job_id::text);

drop policy if exists "Fotos: borrar" on public.job_photos;
create policy "Fotos: borrar" on public.job_photos
  for delete to authenticated
  using (public.is_staff() or (uploaded_by = auth.uid() and public.can_access_job(job_id)));

grant select, insert, delete on public.job_photos to authenticated;
revoke all on public.job_photos from anon;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('job-photos', 'job-photos', false, 6291456, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "job_photos_read" on storage.objects;
create policy "job_photos_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'job-photos' and public.can_access_job_path(name));

drop policy if exists "job_photos_insert" on storage.objects;
create policy "job_photos_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'job-photos' and public.can_access_job_path(name));

drop policy if exists "job_photos_delete" on storage.objects;
create policy "job_photos_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'job-photos' and public.can_access_job_path(name)
         and (public.is_staff() or owner = auth.uid()));

-- ---------------------------------------------------------------------
-- 6. Lista del encargado: solo sus trabajos (+ finalizados donde participó)
-- ---------------------------------------------------------------------
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
  photo_count int
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
         (select count(*)::int from public.job_photos ph where ph.job_id = j.id)
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

-- ---------------------------------------------------------------------
-- 7. Avisos: solo al encargado asignado
-- ---------------------------------------------------------------------
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
-- 8. Gastos: la secretaría ve y añade; edita/borra solo los suyos
-- ---------------------------------------------------------------------
alter table public.expenses alter column created_by set default auth.uid();

drop policy if exists "Secretaría ve gastos" on public.expenses;
create policy "Secretaría ve gastos" on public.expenses
  for select to authenticated using (public.is_staff());

drop policy if exists "Secretaría crea gastos" on public.expenses;
create policy "Secretaría crea gastos" on public.expenses
  for insert to authenticated
  with check (public.is_staff() and created_by = auth.uid());

drop policy if exists "Secretaría edita sus gastos" on public.expenses;
create policy "Secretaría edita sus gastos" on public.expenses
  for update to authenticated
  using (public.is_staff() and created_by = auth.uid())
  with check (public.is_staff() and created_by = auth.uid());

drop policy if exists "Secretaría borra sus gastos" on public.expenses;
create policy "Secretaría borra sus gastos" on public.expenses
  for delete to authenticated
  using (public.is_staff() and created_by = auth.uid());

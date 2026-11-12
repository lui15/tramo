-- =====================================================================
-- FASE 5 — Notificaciones (centro de notificaciones + push FCM)
-- Compatible: no borra datos. Requiere que exista en Vault el secreto
-- 'tramo_webhook_secret' con el MISMO valor que WEBHOOK_SECRET de las
-- Edge Functions (ver instrucciones al final).
-- =====================================================================

create extension if not exists pg_net;

-- ---------------------------------------------------------------------
-- 1. TABLA DE NOTIFICACIONES
-- ---------------------------------------------------------------------
create table if not exists public.notifications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id),
  type          text not null,
  title         text not null,
  body          text not null,
  data          jsonb not null default '{}'::jsonb,
  dedupe_key    text not null,
  read_at       timestamptz,
  push_sent_at  timestamptz,
  push_error    text,
  created_at    timestamptz not null default now(),
  constraint notifications_dedupe unique (user_id, dedupe_key)
);
create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);
create index if not exists notifications_user_unread_idx
  on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;

comment on table public.notifications is
  'Notificaciones por usuario. dedupe_key evita duplicados si una operación se repite.';

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications
  for select to authenticated
  using (user_id = auth.uid() and public.is_active_member());

revoke all on public.notifications from anon;
revoke insert, update, delete, truncate on public.notifications from authenticated;
grant select on public.notifications to authenticated;

-- Tiempo real para el contador de la campana
do $$
begin
  if not exists (select 1 from pg_publication_tables
                  where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 2. FUNCIONES AUXILIARES
-- ---------------------------------------------------------------------
create or replace function public.fmt_eur(p numeric)
returns text language sql immutable set search_path = public
as $$
  select replace(replace(replace(to_char(round(coalesce(p, 0), 2), 'FM999,999,990.00'), ',', '#'), '.', ','), '#', '.') || ' €';
$$;

create or replace function public.job_type_label(p text)
returns text language sql immutable set search_path = public
as $$
  select case p when 'mudanza' then 'Mudanza' when 'montaje' then 'Montaje'
                 when 'reforma' then 'Reforma' else coalesce(initcap(p), 'Trabajo') end;
$$;

create or replace function public.job_summary(j public.jobs)
returns text language sql stable set search_path = public
as $$
  select public.job_type_label(j.job_type)
      || coalesce(' · ' || nullif(j.client_name, ''), '')
      || ' · ' || to_char(j.job_date, 'DD/MM/YYYY')
      || coalesce(' ' || to_char(j.start_time, 'HH24:MI'), '');
$$;

create or replace function public.home_route(p_role text)
returns text language sql immutable set search_path = public
as $$
  select case p_role when 'admin' then '/admin' when 'secretaria' then '/secretaria'
                     else '/employee' end;
$$;

-- Crea una notificación (sin duplicados, nunca al autor de la acción)
create or replace function public.notify(
  p_user uuid, p_type text, p_title text, p_body text,
  p_data jsonb default '{}'::jsonb, p_dedupe text default null)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if p_user is null or p_user = auth.uid() then
    return;
  end if;

  if not exists (select 1 from public.profiles
                  where id = p_user and is_active and account_status = 'activo' and deleted_at is null) then
    return;
  end if;

  insert into public.notifications (user_id, type, title, body, data, dedupe_key)
  values (p_user, p_type, p_title, p_body, coalesce(p_data, '{}'::jsonb),
          coalesce(p_dedupe, p_type || ':' || gen_random_uuid()))
  on conflict (user_id, dedupe_key) do nothing;
end;
$$;

-- Notifica a todos los usuarios activos con alguno de los roles indicados.
-- p_route_suffix se añade a la ruta de inicio de cada rol (p. ej. '/trabajos').
create or replace function public.notify_roles(
  p_roles text[], p_type text, p_title text, p_body text,
  p_data jsonb, p_dedupe text, p_route_suffix text default '')
returns void language plpgsql security definer set search_path = public
as $$
declare r record;
begin
  for r in
    select id, role from public.profiles
     where role = any(p_roles) and is_active and account_status = 'activo' and deleted_at is null
  loop
    perform public.notify(
      r.id, p_type, p_title, p_body,
      coalesce(p_data, '{}'::jsonb) || jsonb_build_object('route', public.home_route(r.role) || coalesce(p_route_suffix, '')),
      p_dedupe);
  end loop;
end;
$$;

create or replace function public.actor_name()
returns text language sql stable security definer set search_path = public
as $$ select coalesce((select full_name from public.profiles where id = auth.uid()), 'Administración'); $$;

-- ---------------------------------------------------------------------
-- 3. EVENTOS: TRABAJOS
--    · Crear / modificar / borrar  -> encargados
--    · Finalizar                   -> secretaría y administrador
-- ---------------------------------------------------------------------
create or replace function public.notify_job_change()
returns trigger language plpgsql security definer set search_path = public
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

  -- UPDATE
  v_data := jsonb_build_object('job_id', new.id);

  if new.status = 'finalizado' and old.status is distinct from 'finalizado' then
    perform public.notify_roles(
      array['secretaria', 'admin'], 'job_finished', 'Trabajo finalizado',
      public.job_summary(new) || ' · finalizado por ' || public.actor_name()
        || coalesce(' · ' || public.fmt_eur(new.total_cost), ''),
      v_data, 'job_finished:' || new.id, '');
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
    v_changes := v_changes || ('estado: ' || new.status);
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

drop trigger if exists notify_jobs on public.jobs;
create trigger notify_jobs after insert or update or delete on public.jobs
  for each row execute function public.notify_job_change();

-- ---------------------------------------------------------------------
-- 4. EVENTOS: TRABAJO COMPLETADO POR EL EMPLEADO (horas y ganancia)
-- ---------------------------------------------------------------------
create or replace function public.notify_participation()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  j public.jobs;
  v_unit text;
  v_body text;
begin
  select * into j from public.jobs where id = new.job_id;
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

drop trigger if exists notify_job_participants on public.job_participants;
create trigger notify_job_participants after insert on public.job_participants
  for each row execute function public.notify_participation();

-- ---------------------------------------------------------------------
-- 5. EVENTOS: PAGOS AL EMPLEADO
--    (se llama "zz_" para ejecutarse después del trigger que actualiza el saldo)
-- ---------------------------------------------------------------------
create or replace function public.notify_settlement()
returns trigger language plpgsql security definer set search_path = public
as $$
declare p public.profiles;
  v_body text;
begin
  select * into p from public.profiles where id = new.employee_id;
  v_body := 'Se te ha realizado un pago de ' || public.fmt_eur(new.amount) || '.';
  if p.payment_method = 'acumulativo' then
    v_body := v_body || ' Pendiente de cobrar: ' || public.fmt_eur(greatest(p.accumulated_balance, 0)) || '.';
  end if;

  perform public.notify(
    new.employee_id, 'payment', 'Pago recibido', v_body,
    jsonb_build_object('settlement_id', new.id, 'amount', new.amount, 'route', '/employee/finanzas'),
    'payment:' || new.id);
  return new;
end;
$$;

drop trigger if exists zz_notify_settlements on public.settlements;
create trigger zz_notify_settlements after insert on public.settlements
  for each row execute function public.notify_settlement();

-- ---------------------------------------------------------------------
-- 6. EVENTOS: CAMBIO DE SALARIO (no el salario inicial del alta)
-- ---------------------------------------------------------------------
create or replace function public.notify_salary_change()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.salary_history
                  where employee_id = new.employee_id and id <> new.id) then
    return new;
  end if;

  perform public.notify(
    new.employee_id, 'salary_changed', 'Salario actualizado',
    'Tu salario pasa a ' || public.fmt_eur(new.salary_rate) || ' '
      || case new.salary_type when 'hora' then 'por hora' when 'dia' then 'por día' else 'al mes' end
      || ' desde el ' || to_char(new.effective_from, 'DD/MM/YYYY') || '.',
    jsonb_build_object('route', '/employee/finanzas'),
    'salary_changed:' || new.id);
  return new;
end;
$$;

drop trigger if exists notify_salary_history on public.salary_history;
create trigger notify_salary_history after insert on public.salary_history
  for each row execute function public.notify_salary_change();

-- ---------------------------------------------------------------------
-- 7. ENVÍO PUSH: cada notificación nueva llama a la Edge Function send-push
-- ---------------------------------------------------------------------
create or replace function public.dispatch_push()
returns trigger language plpgsql security definer set search_path = public
as $$
declare v_secret text;
begin
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'tramo_webhook_secret' limit 1;

  if v_secret is null then
    return new;   -- sin secreto configurado: queda en el centro de notificaciones
  end if;

  perform net.http_post(
    url := 'https://cheyhtidyfthlgodzrhh.supabase.co/functions/v1/send-push',
    body := jsonb_build_object('notification_id', new.id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secret),
    timeout_milliseconds := 8000);
  return new;
exception when others then
  return new;     -- un fallo del envío nunca bloquea la operación principal
end;
$$;

drop trigger if exists dispatch_push_notifications on public.notifications;
create trigger dispatch_push_notifications after insert on public.notifications
  for each row execute function public.dispatch_push();

-- ---------------------------------------------------------------------
-- 8. DISPOSITIVOS: al suspender/desactivar/eliminar una cuenta se
--    eliminan sus dispositivos (deja de recibir push)
-- ---------------------------------------------------------------------
create or replace function public.drop_tokens_on_deactivation()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if (new.account_status <> 'activo' or not new.is_active or new.deleted_at is not null)
     and (old.account_status = 'activo' and old.is_active and old.deleted_at is null) then
    delete from public.device_tokens where user_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists drop_tokens_on_deactivation on public.profiles;
create trigger drop_tokens_on_deactivation after update on public.profiles
  for each row execute function public.drop_tokens_on_deactivation();

-- ---------------------------------------------------------------------
-- 9. MARCAR COMO LEÍDAS (el usuario solo puede marcar las suyas)
-- ---------------------------------------------------------------------
create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns integer language plpgsql security definer set search_path = public
as $$
declare n integer;
begin
  update public.notifications
     set read_at = now()
   where user_id = auth.uid() and read_at is null
     and (p_ids is null or id = any(p_ids));
  get diagnostics n = row_count;
  return n;
end;
$$;

-- ---------------------------------------------------------------------
-- 10. PERMISOS DE EJECUCIÓN
-- ---------------------------------------------------------------------
revoke execute on function
  public.notify(uuid, text, text, text, jsonb, text),
  public.notify_roles(text[], text, text, text, jsonb, text, text),
  public.notify_job_change(), public.notify_participation(), public.notify_settlement(),
  public.notify_salary_change(), public.dispatch_push(), public.drop_tokens_on_deactivation(),
  public.actor_name(), public.job_summary(public.jobs)
  from public, anon, authenticated;

revoke execute on function public.mark_notifications_read(uuid[]) from public, anon;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;

-- =====================================================================
-- DESPUÉS DE ESTA MIGRACIÓN (una sola vez, en el SQL Editor):
--   select vault.create_secret('<MISMO VALOR QUE WEBHOOK_SECRET>', 'tramo_webhook_secret');
-- =====================================================================

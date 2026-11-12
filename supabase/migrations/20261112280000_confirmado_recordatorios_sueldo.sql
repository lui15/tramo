-- =====================================================================
-- 20261112280000_confirmado_recordatorios_sueldo.sql
--
-- 1. ARREGLO: cambiar el sueldo desde Secretaría no se aplicaba a la
--    ficha. El trigger protect_privileged_profile_fields deshacía el
--    UPDATE que hace change_salary(). Ahora change_salary marca su flujo
--    ('tramo.salary_flow') y el trigger deja pasar SOLO los campos de
--    salario. Además se resincronizan las fichas con su historial
--    (lo ya guardado en salary_history manda).
--
-- 2. Sin estado "pendiente": todo trabajo nuevo nace "confirmado".
--
-- 3. Recordatorios automáticos (pg_cron, cada 10 minutos, hora de España):
--    - Día anterior (desde las 10:00): secretaría -> "confirma con el
--      cliente"; encargado -> "mañana tienes un trabajo".
--    - 1 hora antes: encargado -> "¿Listo para el trabajo de hoy?".
--    Cada aviso se envía una sola vez (dedupe).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Sueldo
-- ---------------------------------------------------------------------
create or replace function public.protect_privileged_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_avatar text;
  v_type text;
  v_rate numeric;
  v_method text;
  v_fixed numeric;
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

  -- Cambio de salario hecho por change_salary(): solo campos de salario
  if coalesce(current_setting('tramo.salary_flow', true), '') = 'on' then
    v_type := new.salary_type;
    v_rate := new.salary_rate;
    v_method := new.payment_method;
    v_fixed := new.fixed_salary;
    new := old;
    new.salary_type := v_type;
    new.salary_rate := v_rate;
    new.payment_method := v_method;
    new.fixed_salary := v_fixed;
    new.updated_at := now();
    return new;
  end if;

  v_avatar := new.avatar_path;
  new := old;
  new.avatar_path := v_avatar;
  new.updated_at := now();
  return new;
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

-- Resincroniza las fichas con el salario vigente hoy según su historial
update public.profiles p
   set salary_type    = s.salary_type,
       salary_rate    = s.salary_rate,
       payment_method = case when s.salary_type = 'mes' then 'fijo' else 'acumulativo' end,
       fixed_salary   = case when s.salary_type = 'mes' then s.salary_rate end
  from public.profiles p2
  cross join lateral public.salary_at(p2.id, current_date) s
 where p.id = p2.id
   and p.role in ('encargado', 'ayudante', 'secretaria')
   and p.deleted_at is null
   and (p.salary_type is distinct from s.salary_type or p.salary_rate is distinct from s.salary_rate);

-- ---------------------------------------------------------------------
-- 2. Sin "pendiente": los trabajos nacen confirmados
-- ---------------------------------------------------------------------
alter table public.jobs alter column status set default 'confirmado';

create or replace function public.job_no_pending()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status is null or new.status = 'pendiente' then
    new.status := 'confirmado';
  end if;
  return new;
end;
$$;

drop trigger if exists aa_job_no_pending on public.jobs;
create trigger aa_job_no_pending
  before insert or update of status on public.jobs
  for each row execute function public.job_no_pending();

update public.jobs set status = 'confirmado' where status = 'pendiente';

-- ---------------------------------------------------------------------
-- 3. Recordatorios
-- ---------------------------------------------------------------------
create or replace function public.enviar_recordatorios()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamp := (now() at time zone 'Europe/Madrid');
  v_today date := v_now::date;
  j public.jobs;
  v_start timestamp;
  v_n int := 0;
  v_place text;
begin
  -- A) Día anterior, a partir de las 10:00
  if v_now::time >= time '10:00' then
    for j in
      select * from public.jobs
       where job_date = v_today + 1
         and status in ('confirmado', 'en_curso')
    loop
      v_place := case when j.job_type = 'mudanza'
                      then nullif(concat_ws(' → ', nullif(j.pickup_point, ''), nullif(j.dropoff_point, '')), '')
                      else nullif(j.work_point, '') end;

      perform public.notify_roles(
        array['secretaria'], 'job_reminder_staff',
        '📞 Confirma el trabajo de mañana',
        'Recuerda llamar al cliente para confirmar que el trabajo sigue en pie: '
          || public.job_summary(j)
          || coalesce(' · 📱 ' || nullif(j.client_phone, ''), '') || '.',
        jsonb_build_object('job_id', j.id),
        'reminder_day:' || j.id || ':' || j.job_date, '/trabajos');

      if j.encargado_id is not null then
        perform public.notify(
          j.encargado_id, 'job_reminder',
          '📅 Mañana tienes un trabajo',
          public.job_summary(j) || coalesce(' · 📍 ' || v_place, '')
            || '. Revisa la ficha y las fotos para ir preparado. 💪',
          jsonb_build_object('job_id', j.id, 'route', '/employee/trabajos'),
          'reminder_day:' || j.id || ':' || j.job_date);
      end if;
      v_n := v_n + 1;
    end loop;
  end if;

  -- B) Una hora antes (solo con hora de inicio)
  for j in
    select * from public.jobs
     where job_date = v_today
       and start_time is not null
       and encargado_id is not null
       and status in ('confirmado', 'en_curso')
  loop
    v_start := j.job_date + j.start_time;
    if v_now >= v_start - interval '1 hour' and v_now < v_start then
      v_place := case when j.job_type = 'mudanza'
                      then nullif(concat_ws(' → ', nullif(j.pickup_point, ''), nullif(j.dropoff_point, '')), '')
                      else nullif(j.work_point, '') end;
      perform public.notify(
        j.encargado_id, 'job_reminder',
        '⏰ ¿Estás listo para el trabajo de hoy?',
        'Empieza a las ' || to_char(j.start_time, 'HH24:MI') || ': '
          || public.job_summary(j) || coalesce(' · 📍 ' || v_place, '') || '. ¡Mucho ánimo! 🚚',
        jsonb_build_object('job_id', j.id, 'route', '/employee/trabajos'),
        'reminder_hour:' || j.id || ':' || j.job_date || ':' || j.start_time);
      v_n := v_n + 1;
    end if;
  end loop;

  return v_n;
end;
$$;

revoke all on function public.enviar_recordatorios() from public, anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'tramo-recordatorios') then
    perform cron.unschedule('tramo-recordatorios');
  end if;
  perform cron.schedule('tramo-recordatorios', '*/10 * * * *', 'select public.enviar_recordatorios();');
end $$;

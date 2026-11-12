-- =====================================================================
-- 20261112340000_notificaciones_bonitas.sql
-- Avisos más bonitos, con emojis. Un único trigger BEFORE INSERT en
-- notifications decora título y texto según el tipo, así sirve para
-- todos los avisos (los de la app y los push, que se envían después).
-- Si el título ya empieza por un emoji, se respeta tal cual.
-- No modifica avisos ya enviados.
-- =====================================================================

create or replace function public.decorate_notification()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_body text := coalesce(new.body, '');
begin
  -- Título: solo si no empieza ya por emoji (letra, número o ¡¿)
  if new.title ~ '^[[:alnum:]¡¿ÁÉÍÓÚÑáéíóúñ]' then
    new.title := case new.type
      when 'job_created'        then '🆕 ' || new.title
      when 'job_assigned'       then '🚚 ¡' || new.title || '!'
      when 'job_updated'        then '✏️ ' || new.title
      when 'job_deleted'        then '🗑️ ' || new.title
      when 'job_unassigned'     then '↩️ ' || new.title
      when 'job_review'         then '📋 ' || new.title
      when 'job_returned'       then '🔁 ' || new.title
      when 'job_finished'       then '✅ ' || new.title
      when 'job_completed'      then '🎉 ¡' || new.title || '!'
      when 'payment'            then '💸 ' || new.title
      when 'advance'            then '💶 ' || new.title
      when 'salary_changed'     then '💼 ' || new.title
      when 'job_reminder'       then '⏰ ' || new.title
      when 'job_reminder_staff' then '📞 ' || new.title
      else '🔔 ' || new.title
    end;
  end if;

  -- Texto: icono del tipo de trabajo, fecha y detalles con emojis
  if v_body !~ '^[^[:alnum:]¡¿]' then
    v_body := regexp_replace(v_body, '^Mudanza', '🚚 Mudanza');
    v_body := regexp_replace(v_body, '^Montaje', '🔧 Montaje');
    v_body := regexp_replace(v_body, '^Reforma', '🏗️ Reforma');
    v_body := regexp_replace(v_body, '^Limpieza', '🧽 Limpieza');
  end if;
  if position('📅' in v_body) = 0 then
    v_body := regexp_replace(v_body, '(\d{2}/\d{2}/\d{4})( \d{2}:\d{2})?', '📅 \1\2');
  end if;
  v_body := replace(v_body, ' · eres el encargado.', ' · 👷 Eres el encargado. ¡A por ello! 💪');
  v_body := replace(v_body, ' · cambios: ', ' · 🔄 Cambios: ');
  v_body := replace(v_body, ' · aprobado por ', ' · 👤 Aprobado por ');
  v_body := replace(v_body, ' · cerrado por ', ' · 👷 Cerrado por ');
  v_body := replace(v_body, ' participante(s)', ' 👥 participante(s)');
  v_body := replace(v_body, ' · cobrado ', ' · 💰 Cobrado ');
  v_body := replace(v_body, 'has ganado ', '💰 has ganado ');
  v_body := replace(v_body, ' ha sido eliminado.', ' ha sido eliminado. ❌');

  if new.type = 'job_completed' then
    v_body := v_body || ' ¡Buen trabajo! 👏';
  elsif new.type = 'job_review' then
    v_body := v_body || '. Revisa las horas y apruébalo. 🧐';
  elsif new.type in ('payment', 'advance') then
    v_body := v_body || ' 🙌';
  end if;

  new.body := v_body;
  return new;
end;
$$;

drop trigger if exists aa_decorate_notification on public.notifications;
create trigger aa_decorate_notification
  before insert on public.notifications
  for each row execute function public.decorate_notification();

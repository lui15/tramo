-- =====================================================================
-- FIX: los trabajadores no podían terminar el "cambia tu contraseña"
-- ---------------------------------------------------------------------
-- mark_password_changed() ponía must_change_password = false, pero el
-- trigger protect_privileged_profile_fields() revertía el cambio porque
-- un usuario normal solo puede modificar su foto. Resultado: bucle
-- infinito en /cuenta/clave y el trabajador nunca llegaba a su panel.
--
-- Ahora mark_password_changed() activa una marca local de la transacción
-- y el trigger permite ÚNICAMENTE desactivar must_change_password del
-- propio usuario cuando esa marca está presente.
-- =====================================================================

create or replace function public.mark_password_changed()
returns void language plpgsql security definer set search_path = public
as $$
begin
  perform set_config('tramo.password_changed', 'on', true);  -- solo esta transacción
  update public.profiles set must_change_password = false where id = auth.uid();
end;
$$;

create or replace function public.protect_privileged_profile_fields()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_avatar text;
  v_clear_password_flag boolean;
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
    new.username := old.username;
    new.email := old.email;
    new.failed_login_attempts := old.failed_login_attempts;
    new.locked_until := old.locked_until;
    return new;
  end if;

  -- Usuario normal: solo su foto, y quitar "debe cambiar contraseña"
  -- cuando viene de mark_password_changed().
  v_avatar := new.avatar_path;
  v_clear_password_flag := new.id = auth.uid()
    and new.must_change_password = false
    and coalesce(current_setting('tramo.password_changed', true), '') = 'on';

  new := old;
  new.avatar_path := v_avatar;
  if v_clear_password_flag then
    new.must_change_password := false;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.mark_password_changed() from public, anon;
grant execute on function public.mark_password_changed() to authenticated;

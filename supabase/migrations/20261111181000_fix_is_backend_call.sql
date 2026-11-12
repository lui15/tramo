-- is_backend_call(): distingue llamadas del servidor (service_role, migraciones,
-- Supabase Auth) de llamadas de usuarios de la app (roles anon / authenticated).
-- Se basa en el rol activo de la petición (GUC "role"), que PostgREST fija con
-- SET LOCAL ROLE, en lugar de session_user.
create or replace function public.is_backend_call()
returns boolean language sql stable set search_path = public
as $$
  select coalesce(auth.jwt() ->> 'role', '') = 'service_role'
      or coalesce(nullif(current_setting('role', true), ''), 'none')
           not in ('authenticated', 'anon');
$$;
revoke execute on function public.is_backend_call() from public, anon, authenticated;

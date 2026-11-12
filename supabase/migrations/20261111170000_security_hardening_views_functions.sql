-- =====================================================================
-- Seguridad: vistas y funciones (sin tocar datos)
-- =====================================================================
-- 1) Las vistas pasan a ejecutarse con los permisos del usuario que
--    consulta (respetan RLS). Antes se ejecutaban como su propietario y
--    eran legibles por "anon" sin iniciar sesión.
alter view public.admin_finished_jobs     set (security_invoker = true);
alter view public.employee_available_jobs set (security_invoker = true);
alter view public.employee_job_history    set (security_invoker = true);
alter view public.financial_summary       set (security_invoker = true);

-- 2) El rol anónimo no necesita acceder a ninguna tabla/vista: toda la app
--    funciona con sesión iniciada.
revoke all on all tables in schema public from anon;

-- 3) Las vistas son solo de lectura para usuarios autenticados.
revoke insert, update, delete, truncate, references, trigger
  on public.admin_finished_jobs, public.employee_available_jobs,
     public.employee_job_history, public.financial_summary
  from authenticated;

-- 4) search_path fijo en todas las funciones (evita secuestro de objetos).
alter function public.protect_privileged_profile_fields() set search_path = public;
alter function public.handle_new_participant()            set search_path = public;
alter function public.handle_new_settlement()             set search_path = public;
alter function public.handle_updated_at()                 set search_path = public;
alter function public.handle_new_user()                   set search_path = public;
alter function public.is_admin()                          set search_path = public;
alter function public.set_expenses_updated_at()           set search_path = public;
alter function public.enforce_gmail_email()               set search_path = public;

-- 5) Las funciones de trigger no deben poder llamarse por /rpc.
--    (Los triggers siguen funcionando: PostgreSQL no comprueba EXECUTE al dispararlos.)
revoke execute on function
  public.confirm_email_on_approval(),
  public.handle_new_participant(),
  public.handle_new_settlement(),
  public.handle_new_user(),
  public.protect_privileged_profile_fields(),
  public.handle_updated_at(),
  public.set_expenses_updated_at(),
  public.enforce_gmail_email(),
  public.device_tokens_tocar_actualizado()
  from public, anon, authenticated;

-- is_admin() la usan las políticas RLS: solo usuarios autenticados.
revoke execute on function public.is_admin() from public, anon;
grant  execute on function public.is_admin() to authenticated;

revoke execute on function public.registrar_token(text, text) from public, anon;
grant  execute on function public.registrar_token(text, text) to authenticated;

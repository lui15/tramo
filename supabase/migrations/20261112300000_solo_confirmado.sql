-- =====================================================================
-- 20261112300000_solo_confirmado.sql
-- Un trabajo solo puede estar Confirmado mientras no se termina:
-- "pendiente" y "en_curso" se convierten siempre en "confirmado".
-- (Después: En revisión -> Finalizado, como hasta ahora.)
-- =====================================================================
create or replace function public.job_no_pending()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status is null or new.status in ('pendiente', 'en_curso') then
    new.status := 'confirmado';
  end if;
  return new;
end;
$$;

update public.jobs set status = 'confirmado' where status in ('pendiente', 'en_curso');

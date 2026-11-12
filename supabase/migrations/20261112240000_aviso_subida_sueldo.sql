-- =====================================================================
-- 20261112240000_aviso_subida_sueldo.sql
-- Aviso de cambio de salario: si SUBE (misma modalidad: mes, hora o día)
-- se envía una felicitación con emojis. Si baja o cambia de modalidad,
-- se envía el aviso normal. El alta inicial sigue sin aviso.
-- Solo sustituye la función del trigger; no toca datos.
-- =====================================================================

create or replace function public.notify_salary_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prev public.salary_history;
  v_unit text;
  v_first text;
  v_diff numeric;
begin
  select * into v_prev
    from public.salary_history
   where employee_id = new.employee_id and id <> new.id
   order by effective_from desc, created_at desc
   limit 1;

  -- Salario inicial del alta: sin aviso
  if not found then
    return new;
  end if;

  v_unit := case new.salary_type when 'hora' then 'por hora' when 'dia' then 'por día' else 'al mes' end;

  if v_prev.salary_type = new.salary_type and new.salary_rate > v_prev.salary_rate then
    select split_part(coalesce(nullif(btrim(full_name), ''), 'compañero'), ' ', 1)
      into v_first from public.profiles where id = new.employee_id;
    v_diff := new.salary_rate - v_prev.salary_rate;

    perform public.notify(
      new.employee_id, 'salary_raise',
      '🎉 ¡Enhorabuena, ' || coalesce(v_first, '') || '! Te han subido el '
        || case new.salary_type when 'mes' then 'sueldo' else 'precio ' || v_unit end || ' 🚀',
      '💪 Tu esfuerzo se nota. Pasas de ' || public.fmt_eur(v_prev.salary_rate) || ' a '
        || public.fmt_eur(new.salary_rate) || ' ' || v_unit
        || ' (+' || public.fmt_eur(v_diff) || ') desde el '
        || to_char(new.effective_from, 'DD/MM/YYYY') || '. ¡Sigue así! 👏',
      jsonb_build_object('route', '/employee/finanzas'),
      'salary_changed:' || new.id);
    return new;
  end if;

  perform public.notify(
    new.employee_id, 'salary_changed', 'Salario actualizado',
    'Tu salario pasa a ' || public.fmt_eur(new.salary_rate) || ' ' || v_unit
      || ' desde el ' || to_char(new.effective_from, 'DD/MM/YYYY') || '.',
    jsonb_build_object('route', '/employee/finanzas'),
    'salary_changed:' || new.id);
  return new;
end;
$$;

revoke all on function public.notify_salary_change() from public, anon, authenticated;

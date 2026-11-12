-- =====================================================================
-- Adelantos y pago de salario
-- Segura: solo AÑADE columnas (los pagos existentes quedan como 'pago').
-- =====================================================================

alter table public.settlements
  add column if not exists kind text not null default 'pago',
  add column if not exists note text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'settlements_kind_check'
  ) then
    alter table public.settlements
      add constraint settlements_kind_check check (kind in ('pago', 'adelanto', 'salario'));
  end if;
end $$;

-- Notificación al trabajador según el tipo de pago
create or replace function public.notify_settlement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.profiles;
  v_title text;
  v_body text;
begin
  select * into p from public.profiles where id = new.employee_id;

  if new.kind = 'adelanto' then
    v_title := 'Adelanto recibido';
    v_body := 'Se te ha adelantado ' || public.fmt_eur(new.amount) || '.';
  elsif new.kind = 'salario' then
    v_title := 'Salario pagado';
    v_body := 'Se te ha pagado tu salario: ' || public.fmt_eur(new.amount) || '.';
  else
    v_title := 'Pago recibido';
    v_body := 'Se te ha realizado un pago de ' || public.fmt_eur(new.amount) || '.';
  end if;

  if p.payment_method = 'acumulativo' then
    v_body := v_body || ' Pendiente de cobrar: ' || public.fmt_eur(greatest(p.accumulated_balance, 0)) || '.';
  end if;

  if new.note is not null and new.note <> '' then
    v_body := v_body || ' Nota: ' || new.note;
  end if;

  perform public.notify(
    new.employee_id, 'payment', v_title, v_body,
    jsonb_build_object('settlement_id', new.id, 'amount', new.amount, 'kind', new.kind, 'route', '/employee/finanzas'),
    'payment:' || new.id);
  return new;
end;
$$;

revoke execute on function public.notify_settlement() from public, anon, authenticated;

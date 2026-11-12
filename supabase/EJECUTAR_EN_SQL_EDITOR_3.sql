-- Ejecutar TODO este archivo en Supabase > SQL Editor > Run
begin;
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

-- =====================================================================
-- 20261112260000_vehiculos.sql
--
-- Vehículos de la empresa (admin y secretaría pueden crear y modificar):
--   matrícula, marca, modelo, tipo, kilometraje, foto, conductor asignado.
--   Pago: 'financiado' (cuota mensual) o 'comprado' (precio de compra).
--
-- Gastos del vehículo: se guardan en la tabla expenses existente
-- (tipo 'pago_vehiculo') enlazados con vehicle_id:
--   - Cuota del mes (financiado): una sola por vehículo y mes.
--   - Compra (comprado): una sola vez por vehículo.
--
-- Compatible: tabla nueva + 3 columnas nullable en expenses.
-- No modifica ni borra datos existentes. Sin avisos de ITV.
-- =====================================================================

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  plate text not null,
  brand text not null,
  model text,
  vehicle_type text not null default 'furgoneta',
  kilometers integer,
  photo_path text,
  driver_id uuid references public.profiles(id) on delete set null,
  ownership text not null default 'financiado',
  monthly_payment numeric(12, 2),
  finance_start date,
  finance_end date,
  purchase_price numeric(12, 2),
  purchase_date date,
  notes text,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vehicles_type_check check (vehicle_type in ('furgoneta', 'camion', 'coche', 'moto', 'otro')),
  constraint vehicles_ownership_check check (ownership in ('financiado', 'comprado')),
  constraint vehicles_km_check check (kilometers is null or kilometers >= 0),
  constraint vehicles_monthly_check check (monthly_payment is null or monthly_payment >= 0),
  constraint vehicles_price_check check (purchase_price is null or purchase_price >= 0),
  constraint vehicles_finance_dates_check check (finance_end is null or finance_start is null or finance_end >= finance_start)
);

-- Matrícula única (sin espacios ni guiones, en mayúsculas) entre los activos
create unique index if not exists vehicles_plate_unique
  on public.vehicles (upper(regexp_replace(plate, '[\s-]', '', 'g')))
  where is_active;

create index if not exists vehicles_driver_idx on public.vehicles(driver_id);

-- Normaliza la matrícula y valida el conductor y el pago
create or replace function public.vehicles_before_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.plate := upper(regexp_replace(btrim(new.plate), '\s+', ' ', 'g'));
  new.brand := btrim(new.brand);
  new.model := nullif(btrim(coalesce(new.model, '')), '');
  new.notes := nullif(btrim(coalesce(new.notes, '')), '');
  new.updated_at := now();

  if new.plate = '' then
    raise exception 'Indica la matrícula.' using errcode = '22023';
  end if;
  if new.brand = '' then
    raise exception 'Indica la marca.' using errcode = '22023';
  end if;

  if new.driver_id is not null and (tg_op = 'INSERT' or new.driver_id is distinct from old.driver_id) then
    if not exists (select 1 from public.profiles
                    where id = new.driver_id and role in ('encargado', 'ayudante')
                      and is_active and account_status = 'activo' and deleted_at is null) then
      raise exception 'El conductor debe ser un encargado o ayudante activo.' using errcode = '22023';
    end if;
  end if;

  if new.ownership = 'financiado' then
    if new.monthly_payment is null or new.monthly_payment <= 0 then
      raise exception 'Indica la cuota mensual del vehículo financiado.' using errcode = '22023';
    end if;
  else
    if new.purchase_price is null or new.purchase_price <= 0 then
      raise exception 'Indica el precio de compra del vehículo.' using errcode = '22023';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists vehicles_before_write on public.vehicles;
create trigger vehicles_before_write
  before insert or update on public.vehicles
  for each row execute function public.vehicles_before_write();

alter table public.vehicles enable row level security;

drop policy if exists "Staff gestiona vehículos" on public.vehicles;
create policy "Staff gestiona vehículos" on public.vehicles
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

grant select, insert, update on public.vehicles to authenticated;
revoke all on public.vehicles from anon;

-- ---------------------------------------------------------------------
-- Gastos enlazados al vehículo
-- ---------------------------------------------------------------------
alter table public.expenses add column if not exists vehicle_id uuid references public.vehicles(id) on delete set null;
alter table public.expenses add column if not exists vehicle_payment text;
alter table public.expenses add column if not exists vehicle_month date;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'expenses_vehicle_payment_check') then
    alter table public.expenses add constraint expenses_vehicle_payment_check
      check (vehicle_payment is null or vehicle_payment in ('cuota', 'compra'));
  end if;
end $$;

create index if not exists expenses_vehicle_idx on public.expenses(vehicle_id);

-- Una cuota por vehículo y mes; una compra por vehículo
create unique index if not exists expenses_vehicle_cuota_unique
  on public.expenses (vehicle_id, vehicle_month) where vehicle_payment = 'cuota';
create unique index if not exists expenses_vehicle_compra_unique
  on public.expenses (vehicle_id) where vehicle_payment = 'compra';

-- Registra la cuota de un mes (financiado) o la compra (comprado).
-- p_month: cualquier día del mes de la cuota (por defecto, el mes actual).
create or replace function public.registrar_pago_vehiculo(p_vehicle uuid, p_month date default current_date)
returns public.expenses
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.vehicles;
  e public.expenses;
  v_month date := date_trunc('month', coalesce(p_month, current_date))::date;
  v_label text;
begin
  if not public.is_staff() then
    raise exception 'Solo la secretaría o el administrador pueden registrar pagos de vehículos.' using errcode = '42501';
  end if;

  select * into v from public.vehicles where id = p_vehicle and is_active;
  if not found then
    raise exception 'Vehículo no encontrado.' using errcode = 'P0002';
  end if;

  v_label := v.brand || coalesce(' ' || v.model, '') || ' (' || v.plate || ')';

  if v.ownership = 'financiado' then
    if exists (select 1 from public.expenses
                where vehicle_id = v.id and vehicle_payment = 'cuota' and vehicle_month = v_month) then
      raise exception 'La cuota de % ya está registrada.', to_char(v_month, 'MM/YYYY') using errcode = '23505';
    end if;

    insert into public.expenses (expense_type, description, amount, expense_date, expense_time,
                                 created_by, vehicle_id, vehicle_payment, vehicle_month)
    values ('pago_vehiculo',
            'Cuota ' || to_char(v_month, 'MM/YYYY') || ' · ' || v_label,
            v.monthly_payment,
            case when v_month = date_trunc('month', current_date)::date then current_date else v_month end,
            localtime(0), auth.uid(), v.id, 'cuota', v_month)
    returning * into e;
  else
    if exists (select 1 from public.expenses where vehicle_id = v.id and vehicle_payment = 'compra') then
      raise exception 'La compra de este vehículo ya está registrada como gasto.' using errcode = '23505';
    end if;

    insert into public.expenses (expense_type, description, amount, expense_date, expense_time,
                                 created_by, vehicle_id, vehicle_payment)
    values ('pago_vehiculo', 'Compra · ' || v_label, v.purchase_price,
            coalesce(v.purchase_date, current_date), localtime(0), auth.uid(), v.id, 'compra')
    returning * into e;
  end if;

  return e;
end;
$$;

revoke all on function public.registrar_pago_vehiculo(uuid, date) from public, anon;
grant execute on function public.registrar_pago_vehiculo(uuid, date) to authenticated;

-- ---------------------------------------------------------------------
-- Fotos de vehículos (bucket privado, solo staff)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vehicle-photos', 'vehicle-photos', false, 6291456, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "vehicle_photos_read" on storage.objects;
create policy "vehicle_photos_read" on storage.objects
  for select to authenticated using (bucket_id = 'vehicle-photos' and public.is_staff());

drop policy if exists "vehicle_photos_insert" on storage.objects;
create policy "vehicle_photos_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'vehicle-photos' and public.is_staff());

drop policy if exists "vehicle_photos_delete" on storage.objects;
create policy "vehicle_photos_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'vehicle-photos' and public.is_staff());

commit;

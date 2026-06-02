-- ============================================================
-- Fix: infinite recursion en políticas RLS
-- El problema: rooms → allocations → rooms (ciclo infinito)
-- Solución: funciones security definer que bypasean RLS
-- ============================================================

-- Eliminar las políticas problemáticas
drop policy if exists "rooms_client_select"            on public.rooms;
drop policy if exists "allocations_receptionist_select" on public.allocations;
drop policy if exists "companies_receptionist_select"  on public.companies;
drop policy if exists "properties_client_select"       on public.properties;
drop policy if exists "guests_receptionist_all"        on public.guests;
drop policy if exists "stays_receptionist_all"         on public.stays;

-- ── Funciones helper con security definer (bypasean RLS) ────

-- IDs de rooms accesibles por el recepcionista actual
create or replace function public.get_receptionist_room_ids()
returns setof uuid language sql security definer stable as $$
  select r.id from public.rooms r
  join public.receptionist_properties rp on rp.property_id = r.property_id
  where rp.user_id = auth.uid();
$$;

-- IDs de empresas visibles para el recepcionista actual
create or replace function public.get_receptionist_company_ids()
returns setof uuid language sql security definer stable as $$
  select distinct a.company_id from public.allocations a
  join public.rooms r on r.id = a.room_id
  where r.property_id in (
    select property_id from public.receptionist_properties where user_id = auth.uid()
  );
$$;

-- IDs de rooms asignadas a la empresa del cliente actual
create or replace function public.get_client_room_ids()
returns setof uuid language sql security definer stable as $$
  select room_id from public.allocations
  where company_id = (
    select company_id from public.user_profiles where id = auth.uid()
  );
$$;

-- IDs de propiedades donde el cliente tiene habitaciones
create or replace function public.get_client_property_ids()
returns setof uuid language sql security definer stable as $$
  select distinct r.property_id from public.rooms r
  join public.allocations a on a.room_id = r.id
  where a.company_id = (
    select company_id from public.user_profiles where id = auth.uid()
  );
$$;

-- ── Recrear políticas usando las funciones helper ────────────

create policy "rooms_client_select"
  on public.rooms for select to authenticated
  using (
    public.get_my_role() = 'client'
    and id in (select public.get_client_room_ids())
  );

create policy "allocations_receptionist_select"
  on public.allocations for select to authenticated
  using (
    public.get_my_role() = 'receptionist'
    and room_id in (select public.get_receptionist_room_ids())
  );

create policy "companies_receptionist_select"
  on public.companies for select to authenticated
  using (
    public.get_my_role() = 'receptionist'
    and id in (select public.get_receptionist_company_ids())
  );

create policy "properties_client_select"
  on public.properties for select to authenticated
  using (
    public.get_my_role() = 'client'
    and id in (select public.get_client_property_ids())
  );

create policy "guests_receptionist_all"
  on public.guests for all to authenticated
  using (
    public.get_my_role() = 'receptionist'
    and company_id in (select public.get_receptionist_company_ids())
  )
  with check (
    public.get_my_role() = 'receptionist'
    and company_id in (select public.get_receptionist_company_ids())
  );

create policy "stays_receptionist_all"
  on public.stays for all to authenticated
  using (
    public.get_my_role() = 'receptionist'
    and room_id in (select public.get_receptionist_room_ids())
  )
  with check (
    public.get_my_role() = 'receptionist'
    and room_id in (select public.get_receptionist_room_ids())
  );

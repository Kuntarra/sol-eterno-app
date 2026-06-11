-- ============================================================
-- Suscripciones de reporte por correo (programables)
-- Ejecutar una vez en el SQL editor de Supabase.
-- ============================================================

create table if not exists public.report_subscriptions (
  id            uuid primary key default uuid_generate_v4(),
  email         text not null,
  name          text,
  scope_type    text not null default 'all',     -- 'all' | 'company' | 'property' | 'project'
  company_id    uuid references public.companies(id) on delete set null,
  property_ids  uuid[],                            -- usado cuando scope_type='property'
  project_id    uuid references public.projects(id) on delete set null,  -- scope_type='project'
  report_type   text not null default 'movements', -- 'movements' | 'full'
  frequency     text not null default 'daily',    -- 'daily' | 'weekly' | 'monthly'
  weekdays      int[],                             -- semanal: ISO 1=Lun … 7=Dom
  monthday      int,                               -- mensual: 1..28
  send_hour     int not null default 8,            -- 0..23 (hora de Chile)
  active        boolean not null default true,
  last_sent_at  timestamptz,
  created_at    timestamptz default now()
);

-- Si la tabla ya existía sin estas columnas, agrégalas:
alter table public.report_subscriptions add column if not exists project_id uuid references public.projects(id) on delete set null;
alter table public.report_subscriptions add column if not exists report_type text not null default 'movements';

alter table public.report_subscriptions enable row level security;

create policy "admin_select_sub" on public.report_subscriptions
  for select using (exists (select 1 from public.user_profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "admin_insert_sub" on public.report_subscriptions
  for insert with check (exists (select 1 from public.user_profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "admin_update_sub" on public.report_subscriptions
  for update using (exists (select 1 from public.user_profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "admin_delete_sub" on public.report_subscriptions
  for delete using (exists (select 1 from public.user_profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Migrar los destinatarios simples existentes (si los hay) a suscripciones diarias 08:00 de toda la operación
insert into public.report_subscriptions (email, name, scope_type, frequency, send_hour)
select email, name, 'all', 'daily', 8
from public.digest_recipients
where not exists (select 1 from public.report_subscriptions);

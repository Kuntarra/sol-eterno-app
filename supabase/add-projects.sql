-- ============================================================
-- Agregar tabla projects y vincular con allocations
-- ============================================================

create table public.projects (
  id          uuid primary key default uuid_generate_v4(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  name        text not null,
  description text,
  active      boolean not null default true,
  created_at  timestamptz default now()
);

create index idx_projects_company on public.projects(company_id);

-- Agregar project_id a allocations
alter table public.allocations
  add column project_id uuid references public.projects(id) on delete set null;

-- Agregar project_id a stays
alter table public.stays
  add column project_id uuid references public.projects(id) on delete set null;

-- RLS para projects
alter table public.projects enable row level security;

create policy "projects_admin_all"
  on public.projects for all to authenticated
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

create policy "projects_client_select"
  on public.projects for select to authenticated
  using (
    public.get_my_role() = 'client'
    and company_id = public.get_my_company()
  );

create policy "projects_receptionist_select"
  on public.projects for select to authenticated
  using (
    public.get_my_role() = 'receptionist'
    and company_id in (select public.get_receptionist_company_ids())
  );

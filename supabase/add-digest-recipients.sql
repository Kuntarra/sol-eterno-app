-- ============================================================
-- Destinatarios del resumen diario por correo
-- Ejecutar una vez en el SQL editor de Supabase.
-- ============================================================

create table if not exists public.digest_recipients (
  id          uuid primary key default uuid_generate_v4(),
  email       text not null unique,
  name        text,
  active      boolean not null default true,
  created_at  timestamptz default now()
);

alter table public.digest_recipients enable row level security;

-- Solo administradores pueden ver/editar destinatarios
create policy "admin_select_digest" on public.digest_recipients
  for select using (
    exists (select 1 from public.user_profiles p where p.id = auth.uid() and p.role = 'admin')
  );
create policy "admin_insert_digest" on public.digest_recipients
  for insert with check (
    exists (select 1 from public.user_profiles p where p.id = auth.uid() and p.role = 'admin')
  );
create policy "admin_update_digest" on public.digest_recipients
  for update using (
    exists (select 1 from public.user_profiles p where p.id = auth.uid() and p.role = 'admin')
  );
create policy "admin_delete_digest" on public.digest_recipients
  for delete using (
    exists (select 1 from public.user_profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Destinatario inicial de prueba
insert into public.digest_recipients (email, name)
values ('bernardovillablanca@gmail.com', 'Bernardo Villablanca')
on conflict (email) do nothing;

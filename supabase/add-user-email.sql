-- Agregar email a user_profiles y actualizar trigger

alter table public.user_profiles add column if not exists email text;

-- Actualizar trigger para incluir email
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, role, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'client'),
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email
  );
  return new;
end;
$$;

-- Poblar email de usuarios existentes
update public.user_profiles up
set email = au.email
from auth.users au
where up.id = au.id and up.email is null;

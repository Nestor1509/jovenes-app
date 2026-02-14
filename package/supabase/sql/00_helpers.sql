-- Helpers para evitar recursión en RLS (Security Definer)
-- Ejecuta este archivo como 'postgres' en Supabase SQL Editor.

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
set row_security = off
as $$
  select exists(
    select 1 from public.profiles p
    where p.id = uid and p.role = 'admin'
  );
$$;

create or replace function public.is_leader(uid uuid)
returns boolean
language sql
security definer
set search_path = public
set row_security = off
as $$
  select exists(
    select 1 from public.profiles p
    where p.id = uid and p.role = 'leader'
  );
$$;

create or replace function public.same_group(a uuid, b uuid)
returns boolean
language sql
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(pa.group_id,'00000000-0000-0000-0000-000000000000'::uuid)
       = coalesce(pb.group_id,'00000000-0000-0000-0000-000000000000'::uuid)
  from public.profiles pa
  join public.profiles pb on pb.id = b
  where pa.id = a;
$$;

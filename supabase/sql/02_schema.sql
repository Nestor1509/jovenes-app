-- 02_schema.sql
-- Esquema base (tablas) para la app Jóvenes
-- Ejecuta como 'postgres' en Supabase SQL Editor.

create extension if not exists pgcrypto;

-- Grupos
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- Perfiles (vinculado a auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null check (role in ('admin','leader','youth')),
  group_id uuid null references public.groups(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Reportes diarios
create table if not exists public.reports (
  user_id uuid not null references public.profiles(id) on delete cascade,
  report_date date not null default current_date,
  chapters_count integer not null default 0 check (chapters_count >= 0),
  prayer_minutes integer not null default 0 check (prayer_minutes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, report_date)
);

create index if not exists reports_report_date_idx on public.reports(report_date);
create index if not exists reports_user_id_idx on public.reports(user_id);

-- Notas de acompañamiento (líder/admin)
create table if not exists public.youth_notes (
  id bigserial primary key,
  youth_id uuid not null references public.profiles(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

create index if not exists youth_notes_youth_id_idx on public.youth_notes(youth_id);
create index if not exists youth_notes_created_at_idx on public.youth_notes(created_at);

-- updated_at auto
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_reports_touch on public.reports;
create trigger trg_reports_touch
before update on public.reports
for each row execute function public.touch_updated_at();

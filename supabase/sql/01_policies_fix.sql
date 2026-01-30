-- Policies recomendadas (evitan recursión y arreglan "Acceso restringido")
-- IMPORTANTE: esto reemplaza policies existentes. Revisa antes en tu proyecto.

alter table public.profiles enable row level security;
alter table public.reports enable row level security;

-- PROFILES
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_select_admin" on public.profiles;
drop policy if exists "profiles_insert_admin" on public.profiles;
drop policy if exists "profiles_update_admin" on public.profiles;

create policy "profiles_select_own_or_admin"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or public.is_admin(auth.uid())
);

create policy "profiles_insert_own_or_admin"
on public.profiles
for insert
to authenticated
with check (
  (id = auth.uid())
  or public.is_admin(auth.uid())
);

create policy "profiles_update_own_or_admin"
on public.profiles
for update
to authenticated
using (
  (id = auth.uid())
  or public.is_admin(auth.uid())
)
with check (
  (id = auth.uid())
  or public.is_admin(auth.uid())
);

-- REPORTS
drop policy if exists "reports_self_select" on public.reports;
drop policy if exists "reports_self_insert" on public.reports;
drop policy if exists "reports_self_update" on public.reports;
drop policy if exists "reports_admin_select" on public.reports;
drop policy if exists "reports_admin_all" on public.reports;

-- Leer: dueño, admin, líder del mismo grupo (solo jóvenes)
create policy "reports_select_owner_admin_leader_same_group"
on public.reports
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin(auth.uid())
  or (
    public.is_leader(auth.uid())
    and public.same_group(auth.uid(), user_id)
    and exists (
      select 1
      from public.profiles py
      where py.id = public.reports.user_id
        and py.role = 'youth'
    )
  )
);

-- Insertar: solo del mismo día y solo a tu user_id (sin backdate)
create policy "reports_insert_today_only"
on public.reports
for insert
to authenticated
with check (
  user_id = auth.uid()
  and report_date = current_date
);

-- (Opcional) Update: permitir corregir SOLO el mismo día
create policy "reports_update_today_only"
on public.reports
for update
to authenticated
using (
  user_id = auth.uid()
  and report_date = current_date
)
with check (
  user_id = auth.uid()
  and report_date = current_date
);

-- 04_rls_notes_groups.sql
-- RLS adicional para groups y youth_notes (manteniendo helpers de 00_helpers.sql y policies de 01_policies_fix.sql)

alter table public.groups enable row level security;
alter table public.youth_notes enable row level security;

-- GROUPS
drop policy if exists "groups_select_all" on public.groups;
drop policy if exists "groups_admin_write" on public.groups;

create policy "groups_select_all"
on public.groups
for select
to authenticated
using (true);

create policy "groups_admin_write"
on public.groups
for insert
to authenticated
with check (public.is_admin(auth.uid()));

create policy "groups_admin_update"
on public.groups
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "groups_admin_delete"
on public.groups
for delete
to authenticated
using (public.is_admin(auth.uid()));

-- YOUTH_NOTES
drop policy if exists "youth_notes_select_admin_or_leader_same_group" on public.youth_notes;
drop policy if exists "youth_notes_insert_admin_or_leader" on public.youth_notes;
drop policy if exists "youth_notes_update_author_or_admin" on public.youth_notes;
drop policy if exists "youth_notes_delete_author_or_admin" on public.youth_notes;

create policy "youth_notes_select_admin_or_leader_same_group"
on public.youth_notes
for select
to authenticated
using (
  public.is_admin(auth.uid())
  or (
    public.is_leader(auth.uid())
    and public.same_group(auth.uid(), youth_id)
  )
);

create policy "youth_notes_insert_admin_or_leader"
on public.youth_notes
for insert
to authenticated
with check (
  (public.is_admin(auth.uid()) or public.is_leader(auth.uid()))
  and author_id = auth.uid()
  and exists (select 1 from public.profiles py where py.id = youth_id and py.role='youth')
);

create policy "youth_notes_update_author_or_admin"
on public.youth_notes
for update
to authenticated
using (author_id = auth.uid() or public.is_admin(auth.uid()))
with check (author_id = auth.uid() or public.is_admin(auth.uid()));

create policy "youth_notes_delete_author_or_admin"
on public.youth_notes
for delete
to authenticated
using (author_id = auth.uid() or public.is_admin(auth.uid()));

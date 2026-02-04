-- Campos extra (opcionales) para el reporte diario.
--
-- ✅ No cambia nada de lo existente: solo añade columnas nuevas.
--
-- Ejecuta este archivo en tu proyecto de Supabase (SQL Editor).

alter table public.reports
  add column if not exists chapters_count integer,
  add column if not exists bible_chapters text,
  add column if not exists prayer_topic text;

-- (Opcional) Validaciones suaves
alter table public.reports
  add constraint if not exists reports_chapters_count_nonneg check (chapters_count is null or chapters_count >= 0);

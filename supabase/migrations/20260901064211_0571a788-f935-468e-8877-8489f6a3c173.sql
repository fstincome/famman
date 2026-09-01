ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS poster_path text,
  ADD COLUMN IF NOT EXISTS poster_mime text;
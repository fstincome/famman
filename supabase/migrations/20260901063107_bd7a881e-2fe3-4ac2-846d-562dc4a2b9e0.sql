ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS applicant_type text NOT NULL DEFAULT 'self',
  ADD COLUMN IF NOT EXISTS applicant_name text;

ALTER TABLE public.applications
  ADD CONSTRAINT applications_applicant_type_check
  CHECK (applicant_type IN ('self', 'organization', 'company'));
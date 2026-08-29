CREATE TABLE public.applications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  organization text,
  submission_date date NOT NULL DEFAULT CURRENT_DATE,
  deadline date,
  status text NOT NULL DEFAULT 'submitted',
  result_note text,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view applications" ON public.applications FOR SELECT TO authenticated USING (company_id = public.get_user_company_id());
CREATE POLICY "Company members can create applications" ON public.applications FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company_id());
CREATE POLICY "Company members can update applications" ON public.applications FOR UPDATE TO authenticated USING (company_id = public.get_user_company_id());
CREATE POLICY "Company members can delete applications" ON public.applications FOR DELETE TO authenticated USING (company_id = public.get_user_company_id());

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.application_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  mime_type text,
  file_size integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_documents TO authenticated;
GRANT ALL ON public.application_documents TO service_role;
ALTER TABLE public.application_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view application documents" ON public.application_documents FOR SELECT TO authenticated USING (company_id = public.get_user_company_id());
CREATE POLICY "Company members can create application documents" ON public.application_documents FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company_id());
CREATE POLICY "Company members can delete application documents" ON public.application_documents FOR DELETE TO authenticated USING (company_id = public.get_user_company_id());

CREATE INDEX idx_application_documents_application ON public.application_documents(application_id);
CREATE INDEX idx_applications_company ON public.applications(company_id);
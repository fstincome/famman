
CREATE TABLE public.family_health (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  health_type TEXT NOT NULL DEFAULT 'medication',
  person_name TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BIF',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'ongoing',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  pharmacy TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.family_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Health viewable by company users" ON public.family_health FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Health insertable by company users" ON public.family_health FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Health updatable by company users" ON public.family_health FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "Health deletable by company users" ON public.family_health FOR DELETE USING (company_id = get_user_company_id());

CREATE TRIGGER update_family_health_updated_at BEFORE UPDATE ON public.family_health FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE public.family_needs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  title text NOT NULL,
  description text,
  estimated_price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BIF',
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'pending',
  requested_by text,
  validated_at timestamp with time zone,
  validated_by text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.family_needs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Needs viewable by company users" ON public.family_needs FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Needs insertable by company users" ON public.family_needs FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Needs updatable by company users" ON public.family_needs FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "Needs deletable by company users" ON public.family_needs FOR DELETE USING (company_id = get_user_company_id());

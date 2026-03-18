
-- Budget envelope table: tracks allocated and spent amounts per subcategory
CREATE TABLE public.budget_envelopes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  category TEXT NOT NULL,
  subcategory TEXT NOT NULL,
  percentage NUMERIC NOT NULL DEFAULT 0,
  allocated_amount NUMERIC NOT NULL DEFAULT 0,
  spent_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BIF',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, subcategory)
);

ALTER TABLE public.budget_envelopes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Budget envelopes viewable by company users" ON public.budget_envelopes FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Budget envelopes insertable by company users" ON public.budget_envelopes FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Budget envelopes updatable by company users" ON public.budget_envelopes FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "Budget envelopes deletable by company users" ON public.budget_envelopes FOR DELETE USING (company_id = get_user_company_id());

-- Income records table
CREATE TABLE public.income_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BIF',
  source TEXT,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.income_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Income records viewable by company users" ON public.income_records FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Income records insertable by company users" ON public.income_records FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Income records updatable by company users" ON public.income_records FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "Income records deletable by company users" ON public.income_records FOR DELETE USING (company_id = get_user_company_id());

-- Expense records table (family-oriented)
CREATE TABLE public.expense_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BIF',
  category TEXT NOT NULL,
  subcategory TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.expense_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Expense records viewable by company users" ON public.expense_records FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Expense records insertable by company users" ON public.expense_records FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Expense records updatable by company users" ON public.expense_records FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "Expense records deletable by company users" ON public.expense_records FOR DELETE USING (company_id = get_user_company_id());


CREATE TABLE public.recurring_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BIF',
  category text NOT NULL DEFAULT 'other',
  transaction_type text NOT NULL DEFAULT 'expense',
  frequency text NOT NULL DEFAULT 'monthly',
  next_due_date date NOT NULL DEFAULT CURRENT_DATE,
  day_of_month integer DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  description text,
  last_generated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recurring viewable by company users" ON public.recurring_transactions
  FOR SELECT TO authenticated USING (company_id = get_user_company_id());
CREATE POLICY "Recurring insertable by company users" ON public.recurring_transactions
  FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Recurring updatable by company users" ON public.recurring_transactions
  FOR UPDATE TO authenticated USING (company_id = get_user_company_id());
CREATE POLICY "Recurring deletable by company users" ON public.recurring_transactions
  FOR DELETE TO authenticated USING (company_id = get_user_company_id());

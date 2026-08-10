CREATE TABLE public.savings_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  target_amount numeric NOT NULL DEFAULT 0,
  current_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BIF',
  target_date date,
  category text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'active',
  color text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.savings_goals TO authenticated;
GRANT ALL ON public.savings_goals TO service_role;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family can view savings goals" ON public.savings_goals FOR SELECT TO authenticated USING (company_id = public.get_user_company_id());
CREATE POLICY "Family can create savings goals" ON public.savings_goals FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company_id());
CREATE POLICY "Family can update savings goals" ON public.savings_goals FOR UPDATE TO authenticated USING (company_id = public.get_user_company_id());
CREATE POLICY "Family can delete savings goals" ON public.savings_goals FOR DELETE TO authenticated USING (company_id = public.get_user_company_id());

CREATE TRIGGER update_savings_goals_updated_at BEFORE UPDATE ON public.savings_goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.savings_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  goal_id uuid NOT NULL REFERENCES public.savings_goals(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  contributor text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.savings_contributions TO authenticated;
GRANT ALL ON public.savings_contributions TO service_role;
ALTER TABLE public.savings_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family can view savings contributions" ON public.savings_contributions FOR SELECT TO authenticated USING (company_id = public.get_user_company_id());
CREATE POLICY "Family can create savings contributions" ON public.savings_contributions FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company_id());
CREATE POLICY "Family can update savings contributions" ON public.savings_contributions FOR UPDATE TO authenticated USING (company_id = public.get_user_company_id());
CREATE POLICY "Family can delete savings contributions" ON public.savings_contributions FOR DELETE TO authenticated USING (company_id = public.get_user_company_id());

CREATE TRIGGER update_savings_contributions_updated_at BEFORE UPDATE ON public.savings_contributions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_savings_contributions_goal ON public.savings_contributions(goal_id);

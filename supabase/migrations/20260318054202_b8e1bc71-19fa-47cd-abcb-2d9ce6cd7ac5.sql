-- Family Assets / Patrimoine table
CREATE TABLE public.family_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  name text NOT NULL,
  asset_type text NOT NULL DEFAULT 'other',
  description text,
  purchase_date date,
  purchase_price numeric DEFAULT 0,
  current_value numeric DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  location text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.family_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Assets viewable by company users" ON public.family_assets FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Assets insertable by company users" ON public.family_assets FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Assets updatable by company users" ON public.family_assets FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "Assets deletable by company users" ON public.family_assets FOR DELETE USING (company_id = get_user_company_id());

-- Family Events table
CREATE TABLE public.family_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  title text NOT NULL,
  event_type text NOT NULL DEFAULT 'other',
  description text,
  start_date date NOT NULL,
  end_date date,
  location text,
  budget numeric DEFAULT 0,
  actual_cost numeric DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  participants text[],
  is_recurring boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.family_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events viewable by company users" ON public.family_events FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Events insertable by company users" ON public.family_events FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Events updatable by company users" ON public.family_events FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "Events deletable by company users" ON public.family_events FOR DELETE USING (company_id = get_user_company_id());

-- Family Projects table
CREATE TABLE public.family_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'not_started',
  priority text NOT NULL DEFAULT 'medium',
  budget numeric DEFAULT 0,
  spent numeric DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  start_date date,
  deadline date,
  progress integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.family_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Projects viewable by company users" ON public.family_projects FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Projects insertable by company users" ON public.family_projects FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Projects updatable by company users" ON public.family_projects FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "Projects deletable by company users" ON public.family_projects FOR DELETE USING (company_id = get_user_company_id());

-- Family Debts/Credits table
CREATE TABLE public.family_debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  name text NOT NULL,
  debt_type text NOT NULL DEFAULT 'debt',
  category text DEFAULT 'other',
  counterparty text NOT NULL,
  original_amount numeric NOT NULL DEFAULT 0,
  remaining_balance numeric NOT NULL DEFAULT 0,
  interest_rate numeric DEFAULT 0,
  monthly_payment numeric DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  start_date date,
  due_date date,
  status text NOT NULL DEFAULT 'unpaid',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.family_debts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Debts viewable by company users" ON public.family_debts FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Debts insertable by company users" ON public.family_debts FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Debts updatable by company users" ON public.family_debts FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "Debts deletable by company users" ON public.family_debts FOR DELETE USING (company_id = get_user_company_id());

-- Add updated_at triggers
CREATE TRIGGER update_family_assets_updated_at BEFORE UPDATE ON public.family_assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_family_events_updated_at BEFORE UPDATE ON public.family_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_family_projects_updated_at BEFORE UPDATE ON public.family_projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_family_debts_updated_at BEFORE UPDATE ON public.family_debts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
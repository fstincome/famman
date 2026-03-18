-- Enable RLS on all demo_baseline tables
ALTER TABLE public.demo_baseline_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_baseline_bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_baseline_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_baseline_expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_baseline_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_baseline_financial_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_baseline_fx_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_baseline_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_baseline_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_baseline_revenue_sources ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for demo_baseline_accounts
CREATE POLICY "Demo accounts viewable by company users"
ON public.demo_baseline_accounts
FOR SELECT
USING (company_id = get_user_company_id());

-- Add RLS policies for demo_baseline_bank_transactions
CREATE POLICY "Demo bank transactions viewable by company users"
ON public.demo_baseline_bank_transactions
FOR SELECT
USING (company_id = get_user_company_id());

-- Add RLS policies for demo_baseline_customers
CREATE POLICY "Demo customers viewable by company users"
ON public.demo_baseline_customers
FOR SELECT
USING (company_id = get_user_company_id());

-- Add RLS policies for demo_baseline_expense_categories
CREATE POLICY "Demo expense categories viewable by company users"
ON public.demo_baseline_expense_categories
FOR SELECT
USING (company_id = get_user_company_id());

-- Add RLS policies for demo_baseline_expenses
CREATE POLICY "Demo expenses viewable by company users"
ON public.demo_baseline_expenses
FOR SELECT
USING (company_id = get_user_company_id());

-- Add RLS policies for demo_baseline_financial_metrics
CREATE POLICY "Demo financial metrics viewable by company users"
ON public.demo_baseline_financial_metrics
FOR SELECT
USING (company_id = get_user_company_id());

-- Add RLS policies for demo_baseline_fx_rates
CREATE POLICY "Demo FX rates viewable by company users"
ON public.demo_baseline_fx_rates
FOR SELECT
USING (company_id = get_user_company_id());

-- Add RLS policies for demo_baseline_invoices
CREATE POLICY "Demo invoices viewable by company users"
ON public.demo_baseline_invoices
FOR SELECT
USING (company_id = get_user_company_id());

-- Add RLS policies for demo_baseline_payments
CREATE POLICY "Demo payments viewable by company users"
ON public.demo_baseline_payments
FOR SELECT
USING (company_id = get_user_company_id());

-- Add RLS policies for demo_baseline_revenue_sources
CREATE POLICY "Demo revenue sources viewable by company users"
ON public.demo_baseline_revenue_sources
FOR SELECT
USING (company_id = get_user_company_id());
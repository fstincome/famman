-- Create baseline tables for profitability data
CREATE TABLE IF NOT EXISTS public.demo_baseline_revenue_sources (
  id UUID NOT NULL,
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  percentage NUMERIC,
  growth_rate NUMERIC,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.demo_baseline_expense_categories (
  id UUID NOT NULL,
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  percentage NUMERIC,
  growth_rate NUMERIC,
  budget_amount NUMERIC,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.demo_baseline_financial_metrics (
  id UUID NOT NULL,
  company_id UUID NOT NULL,
  metric_type TEXT NOT NULL,
  period_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert demo baseline data for revenue sources
INSERT INTO public.demo_baseline_revenue_sources (id, company_id, name, category, amount, percentage, growth_rate, period_start, period_end) VALUES
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Enterprise Sales', 'channel', 450000, 45.0, 15.5, '2024-01-01', '2024-12-31'),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'SMB Sales', 'channel', 300000, 30.0, 22.3, '2024-01-01', '2024-12-31'),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Direct Sales', 'channel', 150000, 15.0, 8.7, '2024-01-01', '2024-12-31'),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Partner Channel', 'channel', 100000, 10.0, 12.1, '2024-01-01', '2024-12-31');

-- Insert demo baseline data for expense categories
INSERT INTO public.demo_baseline_expense_categories (id, company_id, name, category, amount, percentage, growth_rate, budget_amount, period_start, period_end) VALUES
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Cost of Goods Sold', 'COGS', 280000, 35.0, 10.2, 300000, '2024-01-01', '2024-12-31'),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Salaries & Wages', 'Operating', 200000, 25.0, 5.5, 220000, '2024-01-01', '2024-12-31'),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Marketing', 'Operating', 120000, 15.0, 18.3, 130000, '2024-01-01', '2024-12-31'),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Technology & Software', 'Operating', 80000, 10.0, 12.7, 85000, '2024-01-01', '2024-12-31'),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Office & Admin', 'Operating', 60000, 7.5, 3.2, 65000, '2024-01-01', '2024-12-31'),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Travel & Entertainment', 'Operating', 40000, 5.0, 8.9, 45000, '2024-01-01', '2024-12-31'),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Professional Services', 'Operating', 20000, 2.5, 15.1, 25000, '2024-01-01', '2024-12-31');

-- Insert demo baseline data for financial metrics
INSERT INTO public.demo_baseline_financial_metrics (id, company_id, metric_type, period_type, amount, period_start, period_end) VALUES
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'revenue', 'annual', 1000000, '2024-01-01', '2024-12-31'),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'mrr', 'monthly', 83333, '2024-01-01', '2024-12-31'),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'arr', 'annual', 1000000, '2024-01-01', '2024-12-31');

-- Update reset_demo_data function to include profitability data
CREATE OR REPLACE FUNCTION public.reset_demo_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  demo_company_id UUID := '550e8400-e29b-41d4-a716-446655440000';
BEGIN
  -- Delete all demo data from main tables
  DELETE FROM public.data_rejects WHERE company_id = demo_company_id;
  DELETE FROM public.payments WHERE company_id = demo_company_id;
  DELETE FROM public.invoices WHERE company_id = demo_company_id;
  DELETE FROM public.expenses_new WHERE company_id = demo_company_id;
  DELETE FROM public.bank_transactions WHERE company_id = demo_company_id;
  DELETE FROM public.fx_rates WHERE company_id = demo_company_id;
  DELETE FROM public.customers WHERE company_id = demo_company_id;
  DELETE FROM public.accounts WHERE company_id = demo_company_id;
  
  -- Delete profitability-related data
  DELETE FROM public.revenue_sources WHERE company_id = demo_company_id;
  DELETE FROM public.expense_categories WHERE company_id = demo_company_id;
  DELETE FROM public.financial_metrics WHERE company_id = demo_company_id;
  
  -- Clear session table
  DELETE FROM public.fx_rates_session WHERE company_id = demo_company_id;
  
  -- Reset fact tables
  DELETE FROM public.facts_ar WHERE company_id = demo_company_id;
  DELETE FROM public.facts_revenue_daily WHERE company_id = demo_company_id;
  DELETE FROM public.facts_expenses_daily WHERE company_id = demo_company_id;
  DELETE FROM public.facts_cashflow_daily WHERE company_id = demo_company_id;
  
  -- Restore baseline data
  INSERT INTO public.fx_rates (id, company_id, date, rate_to_base, is_imputed, currency)
  SELECT gen_random_uuid(), company_id, date, rate_to_base, is_imputed, currency
  FROM public.demo_baseline_fx_rates;
  
  INSERT INTO public.customers (id, company_id, name, email, country, created_at)
  SELECT id, company_id, name, email, country, created_at
  FROM public.demo_baseline_customers;
  
  INSERT INTO public.accounts (id, company_id, balance, name, currency, created_at)
  SELECT id, company_id, balance, name, currency, created_at
  FROM public.demo_baseline_accounts;
  
  INSERT INTO public.invoices (id, company_id, customer_id, issue_date, due_date, amount_total, open_amount, original_amount, amount_total_base, channel, original_currency, status, product_id, region, created_at)
  SELECT id, company_id, customer_id, issue_date, due_date, amount_total, open_amount, original_amount, amount_total_base, channel, original_currency, status, product_id, region, created_at
  FROM public.demo_baseline_invoices;
  
  INSERT INTO public.payments (id, company_id, invoice_id, date, amount, original_amount, amount_base, status, original_currency, created_at)
  SELECT id, company_id, invoice_id, date, amount, original_amount, amount_base, status, original_currency, created_at
  FROM public.demo_baseline_payments;
  
  INSERT INTO public.expenses_new (id, company_id, date, amount, original_amount, amount_base, category, vendor, project_id, original_currency, created_at)
  SELECT id, company_id, date, amount, original_amount, amount_base, category, vendor, project_id, original_currency, created_at
  FROM public.demo_baseline_expenses;
  
  INSERT INTO public.bank_transactions (id, company_id, account_id, date, amount, original_amount, amount_base, type, counterparty, category, original_currency, created_at)
  SELECT id, company_id, account_id, date, amount, original_amount, amount_base, type, counterparty, category, original_currency, created_at
  FROM public.demo_baseline_bank_transactions;
  
  -- Restore profitability baseline data
  INSERT INTO public.revenue_sources (id, company_id, name, category, amount, percentage, growth_rate, period_start, period_end, created_at)
  SELECT id, company_id, name, category, amount, percentage, growth_rate, period_start, period_end, created_at
  FROM public.demo_baseline_revenue_sources;
  
  INSERT INTO public.expense_categories (id, company_id, name, category, amount, percentage, growth_rate, budget_amount, period_start, period_end, created_at)
  SELECT id, company_id, name, category, amount, percentage, growth_rate, budget_amount, period_start, period_end, created_at
  FROM public.demo_baseline_expense_categories;
  
  INSERT INTO public.financial_metrics (id, company_id, metric_type, period_type, amount, period_start, period_end, created_at)
  SELECT id, company_id, metric_type, period_type, amount, period_start, period_end, created_at
  FROM public.demo_baseline_financial_metrics;
END;
$function$;
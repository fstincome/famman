-- Create baseline backup tables for demo data
CREATE TABLE IF NOT EXISTS public.demo_baseline_fx_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  date date NOT NULL,
  rate_to_base numeric NOT NULL,
  is_imputed boolean NOT NULL DEFAULT false,
  currency text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.demo_baseline_invoices (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  issue_date date NOT NULL,
  due_date date NOT NULL,
  amount_total numeric NOT NULL,
  open_amount numeric NOT NULL,
  original_amount numeric,
  amount_total_base numeric,
  channel text,
  original_currency text,
  status text NOT NULL,
  product_id text,
  region text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.demo_baseline_payments (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL,
  invoice_id uuid NOT NULL,
  date date NOT NULL,
  amount numeric NOT NULL,
  original_amount numeric,
  amount_base numeric,
  status text NOT NULL,
  original_currency text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.demo_baseline_expenses (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL,
  date date NOT NULL,
  amount numeric NOT NULL,
  original_amount numeric,
  amount_base numeric,
  category text NOT NULL,
  vendor text,
  project_id text,
  original_currency text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.demo_baseline_bank_transactions (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL,
  account_id uuid NOT NULL,
  date date NOT NULL,
  amount numeric NOT NULL,
  original_amount numeric,
  amount_base numeric,
  type text NOT NULL,
  counterparty text,
  category text,
  original_currency text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.demo_baseline_customers (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL,
  name text NOT NULL,
  email text,
  country text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.demo_baseline_accounts (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL,
  balance numeric NOT NULL DEFAULT 0,
  name text NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Update the reset_demo_data function to restore from baseline
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
END;
$function$;
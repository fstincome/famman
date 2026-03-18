-- Recreate reset_demo_data to also reseed facts tables for current year
CREATE OR REPLACE FUNCTION public.reset_demo_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  demo_company_id UUID := '550e8400-e29b-41d4-a716-446655440000';
  target_year INT := EXTRACT(YEAR FROM CURRENT_DATE)::int;
  start_date DATE := make_date(target_year, 1, 1);
  end_date DATE := make_date(target_year, 12, 31);
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
  
  -- Restore profitability baseline data (ensure current-year dates)
  INSERT INTO public.revenue_sources (id, company_id, name, category, amount, percentage, growth_rate, period_start, period_end, created_at)
  SELECT id, company_id, name, category, amount, percentage, growth_rate, start_date, end_date, created_at
  FROM public.demo_baseline_revenue_sources;
  
  INSERT INTO public.expense_categories (id, company_id, name, category, amount, percentage, growth_rate, budget_amount, period_start, period_end, created_at)
  SELECT id, company_id, name, category, amount, percentage, growth_rate, budget_amount, start_date, end_date, created_at
  FROM public.demo_baseline_expense_categories;
  
  INSERT INTO public.financial_metrics (id, company_id, metric_type, period_type, amount, period_start, period_end, created_at)
  SELECT id, company_id, metric_type, period_type, amount, start_date, end_date, created_at
  FROM public.demo_baseline_financial_metrics;
  
  -- Seed facts tables for current year from profitability baselines (even monthly spread)
  INSERT INTO public.facts_revenue_daily (company_id, date, amount_accrual, amount_cash, product_id, region, channel)
  SELECT 
    demo_company_id,
    (m)::date AS date,
    (rs.amount / 12.0) AS amount_accrual,
    (rs.amount / 12.0) AS amount_cash,
    NULL::text AS product_id,
    rs.category AS region,
    rs.name AS channel
  FROM generate_series(start_date, end_date, interval '1 month') m
  CROSS JOIN (
    SELECT name, category, amount
    FROM public.revenue_sources
    WHERE company_id = demo_company_id AND period_start = start_date AND period_end = end_date
  ) rs;
  
  INSERT INTO public.facts_expenses_daily (company_id, date, amount, category, vendor)
  SELECT 
    demo_company_id,
    (m)::date AS date,
    (ec.amount / 12.0) AS amount,
    ec.name AS category,
    NULL::text AS vendor
  FROM generate_series(start_date, end_date, interval '1 month') m
  CROSS JOIN (
    SELECT name, amount
    FROM public.expense_categories
    WHERE company_id = demo_company_id AND period_start = start_date AND period_end = end_date
  ) ec;
END;
$function$;

-- Execute the reset now so demo sees fresh data immediately
SELECT public.reset_demo_data();
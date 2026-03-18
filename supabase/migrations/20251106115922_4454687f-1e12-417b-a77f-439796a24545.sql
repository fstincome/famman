-- Populate facts tables with demo 2025 monthly data so Profitability shows values
DO $$
DECLARE
  demo_company UUID := '550e8400-e29b-41d4-a716-446655440000';
BEGIN
  -- Clean existing 2025 data
  DELETE FROM public.facts_revenue_daily 
  WHERE company_id = demo_company AND date BETWEEN '2025-01-01' AND '2025-12-31';

  DELETE FROM public.facts_expenses_daily 
  WHERE company_id = demo_company AND date BETWEEN '2025-01-01' AND '2025-12-31';

  -- Insert monthly revenue facts from revenue_sources (split evenly by month)
  INSERT INTO public.facts_revenue_daily (company_id, date, amount_accrual, amount_cash, product_id, region, channel)
  SELECT 
    demo_company,
    (months)::date AS date,
    (rs.amount / 12.0) AS amount_accrual,
    (rs.amount / 12.0) AS amount_cash,
    NULL::text AS product_id,
    NULL::text AS region,
    rs.name AS channel
  FROM generate_series('2025-01-01'::date, '2025-12-01'::date, interval '1 month') months
  CROSS JOIN LATERAL (
    SELECT name, amount
    FROM public.revenue_sources
    WHERE company_id = demo_company
  ) rs;

  -- Insert monthly expenses facts from expense_categories (split evenly by month)
  INSERT INTO public.facts_expenses_daily (company_id, date, amount, category, vendor)
  SELECT 
    demo_company,
    (months)::date AS date,
    (ec.amount / 12.0) AS amount,
    ec.name AS category,
    NULL::text AS vendor
  FROM generate_series('2025-01-01'::date, '2025-12-01'::date, interval '1 month') months
  CROSS JOIN LATERAL (
    SELECT name, amount
    FROM public.expense_categories
    WHERE company_id = demo_company
  ) ec;
END $$;
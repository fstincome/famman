-- Update demo baseline data to use current year dates (2025)
UPDATE demo_baseline_revenue_sources 
SET 
  period_start = '2025-01-01'::date,
  period_end = '2025-12-31'::date;

UPDATE demo_baseline_expense_categories 
SET 
  period_start = '2025-01-01'::date,
  period_end = '2025-12-31'::date;

UPDATE demo_baseline_financial_metrics 
SET 
  period_start = '2025-01-01'::date,
  period_end = '2025-12-31'::date;

-- Also update the actual tables for demo company
UPDATE revenue_sources 
SET 
  period_start = '2025-01-01'::date,
  period_end = '2025-12-31'::date
WHERE company_id = '550e8400-e29b-41d4-a716-446655440000';

UPDATE expense_categories 
SET 
  period_start = '2025-01-01'::date,
  period_end = '2025-12-31'::date
WHERE company_id = '550e8400-e29b-41d4-a716-446655440000';

UPDATE financial_metrics 
SET 
  period_start = '2025-01-01'::date,
  period_end = '2025-12-31'::date
WHERE company_id = '550e8400-e29b-41d4-a716-446655440000';
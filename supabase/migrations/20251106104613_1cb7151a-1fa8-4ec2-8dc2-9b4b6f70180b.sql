-- Create a function to reset all demo data
CREATE OR REPLACE FUNCTION public.reset_demo_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  demo_company_id UUID := '550e8400-e29b-41d4-a716-446655440000';
BEGIN
  -- Delete all demo data from various tables
  DELETE FROM public.data_rejects WHERE company_id = demo_company_id;
  DELETE FROM public.payments WHERE company_id = demo_company_id;
  DELETE FROM public.invoices WHERE company_id = demo_company_id;
  DELETE FROM public.expenses WHERE company_id = demo_company_id;
  DELETE FROM public.bank_transactions WHERE company_id = demo_company_id;
  DELETE FROM public.fx_rates WHERE company_id = demo_company_id;
  DELETE FROM public.customers WHERE company_id = demo_company_id;
  DELETE FROM public.accounts WHERE company_id = demo_company_id;
  
  -- Reset fact tables
  DELETE FROM public.facts_ar WHERE company_id = demo_company_id;
  DELETE FROM public.facts_revenue_daily WHERE company_id = demo_company_id;
  DELETE FROM public.facts_expenses_daily WHERE company_id = demo_company_id;
  DELETE FROM public.facts_cashflow_daily WHERE company_id = demo_company_id;
END;
$function$;
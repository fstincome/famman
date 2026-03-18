-- Fix search path for validation functions to prevent security issues
-- Use CREATE OR REPLACE to avoid dropping triggers

-- Fix validate_vendor_bill with secure search_path
CREATE OR REPLACE FUNCTION public.validate_vendor_bill()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Check required fields
  IF NEW.vendor_name IS NULL OR NEW.vendor_name = '' THEN
    RAISE EXCEPTION 'vendor_name is required';
  END IF;
  
  IF NEW.issue_date IS NULL THEN
    RAISE EXCEPTION 'issue_date is required';
  END IF;
  
  IF NEW.due_date IS NULL THEN
    RAISE EXCEPTION 'due_date is required';
  END IF;
  
  IF NEW.amount_total IS NULL OR NEW.amount_total <= 0 THEN
    RAISE EXCEPTION 'amount_total must be greater than 0';
  END IF;
  
  IF NEW.status IS NULL THEN
    RAISE EXCEPTION 'status is required';
  END IF;
  
  -- Check that due_date is not before issue_date
  IF NEW.due_date < NEW.issue_date THEN
    RAISE EXCEPTION 'due_date cannot be before issue_date';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix validate_invoice with secure search_path
CREATE OR REPLACE FUNCTION public.validate_invoice()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Check required fields
  IF NEW.customer_id IS NULL THEN
    RAISE EXCEPTION 'customer_id is required';
  END IF;
  
  IF NEW.issue_date IS NULL THEN
    RAISE EXCEPTION 'issue_date is required';
  END IF;
  
  IF NEW.amount_total IS NULL OR NEW.amount_total <= 0 THEN
    RAISE EXCEPTION 'amount_total must be greater than 0';
  END IF;
  
  IF NEW.status IS NULL THEN
    RAISE EXCEPTION 'status is required';
  END IF;
  
  -- Check future dates (allow if setting permits)
  IF NEW.issue_date > CURRENT_DATE THEN
    DECLARE
      allow_future BOOLEAN;
    BEGIN
      SELECT allow_future_dates INTO allow_future
      FROM accounting_settings
      WHERE company_id = NEW.company_id;
      
      IF NOT COALESCE(allow_future, false) THEN
        RAISE EXCEPTION 'Future dates not allowed';
      END IF;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix validate_payment with secure search_path
CREATE OR REPLACE FUNCTION public.validate_payment()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Check required fields
  IF NEW.invoice_id IS NULL THEN
    RAISE EXCEPTION 'invoice_id is required';
  END IF;
  
  IF NEW.date IS NULL THEN
    RAISE EXCEPTION 'date is required';
  END IF;
  
  IF NEW.amount IS NULL OR NEW.amount <= 0 THEN
    RAISE EXCEPTION 'amount must be greater than 0';
  END IF;
  
  IF NEW.status IS NULL THEN
    RAISE EXCEPTION 'status is required';
  END IF;
  
  -- Check that invoice exists
  IF NOT EXISTS (
    SELECT 1 FROM invoices WHERE id = NEW.invoice_id
  ) THEN
    RAISE EXCEPTION 'invoice_id does not exist';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix validate_expense with secure search_path
CREATE OR REPLACE FUNCTION public.validate_expense()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Check required fields
  IF NEW.date IS NULL THEN
    RAISE EXCEPTION 'date is required';
  END IF;
  
  IF NEW.amount IS NULL OR NEW.amount <= 0 THEN
    RAISE EXCEPTION 'amount must be greater than 0';
  END IF;
  
  IF NEW.category IS NULL OR NEW.category = '' THEN
    RAISE EXCEPTION 'category is required';
  END IF;
  
  RETURN NEW;
END;
$$;
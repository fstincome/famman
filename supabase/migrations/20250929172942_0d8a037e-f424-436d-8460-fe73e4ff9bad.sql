-- Phase 2: Database Functions for Business Logic

-- 1. Function to calculate DSO (Days Sales Outstanding)
CREATE OR REPLACE FUNCTION public.calculate_dso(
  _company_id UUID,
  _start_date DATE,
  _end_date DATE
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  avg_ar NUMERIC;
  credit_sales NUMERIC;
  days_in_period INTEGER;
  dso NUMERIC;
BEGIN
  -- Calculate days in period
  days_in_period := _end_date - _start_date + 1;
  
  -- Calculate average AR (open invoices)
  SELECT AVG(daily_ar) INTO avg_ar
  FROM (
    SELECT 
      SUM(open_amount_base) as daily_ar
    FROM facts_ar
    WHERE company_id = _company_id
    GROUP BY created_at::date
  ) ar_daily;
  
  -- Calculate total credit sales (accrual revenue)
  SELECT 
    SUM(amount_accrual) INTO credit_sales
  FROM facts_revenue_daily
  WHERE company_id = _company_id
    AND date BETWEEN _start_date AND _end_date;
  
  -- Calculate DSO
  IF credit_sales > 0 THEN
    dso := (avg_ar / (credit_sales / days_in_period));
  ELSE
    dso := 0;
  END IF;
  
  RETURN ROUND(dso, 1);
END;
$$;

-- 2. Function to check if user has specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 3. Function to get accounting basis for company
CREATE OR REPLACE FUNCTION public.get_accounting_basis(_company_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT basis
  FROM public.accounting_settings
  WHERE company_id = _company_id
  LIMIT 1
$$;

-- 4. Function to validate invoice data
CREATE OR REPLACE FUNCTION public.validate_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
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

-- 5. Function to validate payment data
CREATE OR REPLACE FUNCTION public.validate_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
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

-- 6. Function to validate expense data
CREATE OR REPLACE FUNCTION public.validate_expense()
RETURNS TRIGGER
LANGUAGE plpgsql
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

-- 7. Apply validation triggers
CREATE TRIGGER validate_invoice_trigger
  BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_invoice();

CREATE TRIGGER validate_payment_trigger
  BEFORE INSERT OR UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_payment();

CREATE TRIGGER validate_expense_trigger
  BEFORE INSERT OR UPDATE ON public.expenses_new
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_expense();

-- 8. Function to log audit trail
CREATE OR REPLACE FUNCTION public.log_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (company_id, user_id, action, table_name, record_id, new_values)
    VALUES (
      NEW.company_id,
      auth.uid(),
      'INSERT',
      TG_TABLE_NAME,
      NEW.id,
      to_jsonb(NEW)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (company_id, user_id, action, table_name, record_id, old_values, new_values)
    VALUES (
      NEW.company_id,
      auth.uid(),
      'UPDATE',
      TG_TABLE_NAME,
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (company_id, user_id, action, table_name, record_id, old_values)
    VALUES (
      OLD.company_id,
      auth.uid(),
      'DELETE',
      TG_TABLE_NAME,
      OLD.id,
      to_jsonb(OLD)
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 9. Apply audit triggers to key tables
CREATE TRIGGER audit_invoices_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audit();

CREATE TRIGGER audit_payments_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audit();

CREATE TRIGGER audit_expenses_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.expenses_new
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audit();
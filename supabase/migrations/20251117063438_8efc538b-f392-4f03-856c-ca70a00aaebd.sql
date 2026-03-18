-- Create vendor_bills table (mirrors invoices structure for AP)
CREATE TABLE public.vendor_bills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  vendor_name TEXT NOT NULL,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  amount_total NUMERIC NOT NULL,
  open_amount NUMERIC NOT NULL,
  original_amount NUMERIC,
  amount_total_base NUMERIC,
  original_currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL,
  category TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vendor_bills ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Vendor bills viewable by company users" 
ON public.vendor_bills 
FOR SELECT 
USING (company_id = get_user_company_id());

CREATE POLICY "Vendor bills insertable by company users" 
ON public.vendor_bills 
FOR INSERT 
WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Vendor bills updatable by company users" 
ON public.vendor_bills 
FOR UPDATE 
USING (company_id = get_user_company_id());

CREATE POLICY "Vendor bills deletable by company users" 
ON public.vendor_bills 
FOR DELETE 
USING (company_id = get_user_company_id());

-- Create trigger for updated_at
CREATE TRIGGER update_vendor_bills_updated_at
BEFORE UPDATE ON public.vendor_bills
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create validation function for vendor_bills
CREATE OR REPLACE FUNCTION public.validate_vendor_bill()
RETURNS TRIGGER
LANGUAGE plpgsql
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

-- Create trigger for validation
CREATE TRIGGER validate_vendor_bill_trigger
BEFORE INSERT OR UPDATE ON public.vendor_bills
FOR EACH ROW
EXECUTE FUNCTION public.validate_vendor_bill();

-- Create index for performance
CREATE INDEX idx_vendor_bills_company_id ON public.vendor_bills(company_id);
CREATE INDEX idx_vendor_bills_due_date ON public.vendor_bills(due_date);
CREATE INDEX idx_vendor_bills_status ON public.vendor_bills(status);
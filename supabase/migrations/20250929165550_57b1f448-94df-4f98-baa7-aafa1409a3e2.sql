-- Create customers table
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  country TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create accounts table
CREATE TABLE public.accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  balance NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create fx_rates table
CREATE TABLE public.fx_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  date DATE NOT NULL,
  currency TEXT NOT NULL,
  rate_to_base NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, date, currency)
);

-- Create invoices table
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  amount_total NUMERIC NOT NULL,
  open_amount NUMERIC NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Draft', 'Open', 'Paid', 'Partially Paid', 'Cancelled')),
  product_id TEXT,
  region TEXT,
  channel TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payments table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id),
  date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Update expenses table to match the new schema
CREATE TABLE public.expenses_new (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL,
  vendor TEXT,
  project_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bank_transactions table
CREATE TABLE public.bank_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  account_id UUID NOT NULL REFERENCES public.accounts(id),
  date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('in', 'out')),
  counterparty TEXT,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for customers
CREATE POLICY "Customers viewable by company users" ON public.customers
  FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Customers insertable by company users" ON public.customers
  FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Customers updatable by company users" ON public.customers
  FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "Customers deletable by company users" ON public.customers
  FOR DELETE USING (company_id = get_user_company_id());

-- Create RLS policies for accounts
CREATE POLICY "Accounts viewable by company users" ON public.accounts
  FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Accounts insertable by company users" ON public.accounts
  FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Accounts updatable by company users" ON public.accounts
  FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "Accounts deletable by company users" ON public.accounts
  FOR DELETE USING (company_id = get_user_company_id());

-- Create RLS policies for fx_rates
CREATE POLICY "FX rates viewable by company users" ON public.fx_rates
  FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "FX rates insertable by company users" ON public.fx_rates
  FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "FX rates updatable by company users" ON public.fx_rates
  FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "FX rates deletable by company users" ON public.fx_rates
  FOR DELETE USING (company_id = get_user_company_id());

-- Create RLS policies for invoices
CREATE POLICY "Invoices viewable by company users" ON public.invoices
  FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Invoices insertable by company users" ON public.invoices
  FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Invoices updatable by company users" ON public.invoices
  FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "Invoices deletable by company users" ON public.invoices
  FOR DELETE USING (company_id = get_user_company_id());

-- Create RLS policies for payments
CREATE POLICY "Payments viewable by company users" ON public.payments
  FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Payments insertable by company users" ON public.payments
  FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Payments updatable by company users" ON public.payments
  FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "Payments deletable by company users" ON public.payments
  FOR DELETE USING (company_id = get_user_company_id());

-- Create RLS policies for expenses_new
CREATE POLICY "Expenses viewable by company users" ON public.expenses_new
  FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Expenses insertable by company users" ON public.expenses_new
  FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Expenses updatable by company users" ON public.expenses_new
  FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "Expenses deletable by company users" ON public.expenses_new
  FOR DELETE USING (company_id = get_user_company_id());

-- Create RLS policies for bank_transactions
CREATE POLICY "Bank transactions viewable by company users" ON public.bank_transactions
  FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Bank transactions insertable by company users" ON public.bank_transactions
  FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Bank transactions updatable by company users" ON public.bank_transactions
  FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "Bank transactions deletable by company users" ON public.bank_transactions
  FOR DELETE USING (company_id = get_user_company_id());

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expenses_new_updated_at BEFORE UPDATE ON public.expenses_new
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bank_transactions_updated_at BEFORE UPDATE ON public.bank_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_invoices_company_id ON public.invoices(company_id);
CREATE INDEX idx_invoices_customer_id ON public.invoices(customer_id);
CREATE INDEX idx_invoices_issue_date ON public.invoices(issue_date);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_payments_invoice_id ON public.payments(invoice_id);
CREATE INDEX idx_payments_date ON public.payments(date);
CREATE INDEX idx_expenses_new_company_id ON public.expenses_new(company_id);
CREATE INDEX idx_expenses_new_date ON public.expenses_new(date);
CREATE INDEX idx_bank_transactions_company_id ON public.bank_transactions(company_id);
CREATE INDEX idx_bank_transactions_account_id ON public.bank_transactions(account_id);
CREATE INDEX idx_bank_transactions_date ON public.bank_transactions(date);
CREATE INDEX idx_customers_company_id ON public.customers(company_id);
CREATE INDEX idx_accounts_company_id ON public.accounts(company_id);
CREATE INDEX idx_fx_rates_company_date_currency ON public.fx_rates(company_id, date, currency);
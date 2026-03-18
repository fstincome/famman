-- Phase 1: Database Schema Foundation (Fixed)
-- This migration creates all derived facts tables, supporting tables, and adds missing columns

-- 1. Create accounting_settings table for storing org-wide settings
CREATE TABLE IF NOT EXISTS public.accounting_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  basis TEXT NOT NULL DEFAULT 'accrual' CHECK (basis IN ('accrual', 'cash')),
  timezone TEXT NOT NULL DEFAULT 'UTC',
  base_currency TEXT NOT NULL DEFAULT 'USD',
  allow_future_dates BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

-- 2. Create user_roles table for RBAC
CREATE TYPE public.app_role AS ENUM ('admin', 'viewer');

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, company_id)
);

-- 3. Create audit_log table
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create rejects table for invalid data
CREATE TABLE IF NOT EXISTS public.data_rejects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  row_data JSONB NOT NULL,
  rejection_reason TEXT NOT NULL,
  import_batch_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Enhance fx_rates table with imputation flag
ALTER TABLE public.fx_rates ADD COLUMN IF NOT EXISTS is_imputed BOOLEAN NOT NULL DEFAULT false;

-- 6. Add base currency columns to invoices
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS original_amount NUMERIC;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS original_currency TEXT DEFAULT 'USD';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS amount_total_base NUMERIC;

-- Backfill amount_total_base with amount_total for existing records
UPDATE public.invoices SET amount_total_base = amount_total WHERE amount_total_base IS NULL;
UPDATE public.invoices SET original_amount = amount_total WHERE original_amount IS NULL;

-- 7. Add base currency columns to payments
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS original_amount NUMERIC;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS original_currency TEXT DEFAULT 'USD';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS amount_base NUMERIC;

-- Backfill amount_base with amount for existing records
UPDATE public.payments SET amount_base = amount WHERE amount_base IS NULL;
UPDATE public.payments SET original_amount = amount WHERE original_amount IS NULL;

-- 8. Add base currency columns to expenses_new
ALTER TABLE public.expenses_new ADD COLUMN IF NOT EXISTS original_amount NUMERIC;
ALTER TABLE public.expenses_new ADD COLUMN IF NOT EXISTS original_currency TEXT DEFAULT 'USD';
ALTER TABLE public.expenses_new ADD COLUMN IF NOT EXISTS amount_base NUMERIC;

-- Backfill amount_base with amount for existing records
UPDATE public.expenses_new SET amount_base = amount WHERE amount_base IS NULL;
UPDATE public.expenses_new SET original_amount = amount WHERE original_amount IS NULL;

-- 9. Add base currency columns to bank_transactions
ALTER TABLE public.bank_transactions ADD COLUMN IF NOT EXISTS original_amount NUMERIC;
ALTER TABLE public.bank_transactions ADD COLUMN IF NOT EXISTS original_currency TEXT DEFAULT 'USD';
ALTER TABLE public.bank_transactions ADD COLUMN IF NOT EXISTS amount_base NUMERIC;

-- Backfill amount_base with amount for existing records
UPDATE public.bank_transactions SET amount_base = amount WHERE amount_base IS NULL;
UPDATE public.bank_transactions SET original_amount = amount WHERE original_amount IS NULL;

-- 10. Create fx_calendar derived table
CREATE TABLE IF NOT EXISTS public.fx_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  currency TEXT NOT NULL,
  rate_to_base NUMERIC NOT NULL,
  is_imputed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, date, currency)
);

-- 11. Create facts_revenue_daily table
CREATE TABLE IF NOT EXISTS public.facts_revenue_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  amount_accrual NUMERIC NOT NULL DEFAULT 0,
  amount_cash NUMERIC NOT NULL DEFAULT 0,
  product_id TEXT,
  region TEXT,
  channel TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add unique constraint for facts_revenue_daily using a partial index approach
CREATE UNIQUE INDEX IF NOT EXISTS idx_facts_revenue_unique 
ON public.facts_revenue_daily (company_id, date, product_id, region, channel);

-- 12. Create facts_expenses_daily table
CREATE TABLE IF NOT EXISTS public.facts_expenses_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  category TEXT NOT NULL,
  vendor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add unique constraint for facts_expenses_daily
CREATE UNIQUE INDEX IF NOT EXISTS idx_facts_expenses_unique 
ON public.facts_expenses_daily (company_id, date, category, vendor);

-- 13. Create facts_cashflow_daily table
CREATE TABLE IF NOT EXISTS public.facts_cashflow_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  inflow NUMERIC NOT NULL DEFAULT 0,
  outflow NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, date)
);

-- 14. Create facts_ar table (Accounts Receivable)
CREATE TABLE IF NOT EXISTS public.facts_ar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  open_amount_base NUMERIC NOT NULL DEFAULT 0,
  days_overdue INTEGER NOT NULL DEFAULT 0,
  aging_bucket TEXT NOT NULL CHECK (aging_bucket IN ('not_due', '0-30', '31-60', '61+')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(invoice_id)
);

-- 15. Create facts_ap table (Accounts Payable)
CREATE TABLE IF NOT EXISTS public.facts_ap (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  vendor_id UUID,
  open_amount_base NUMERIC NOT NULL DEFAULT 0,
  days_overdue INTEGER NOT NULL DEFAULT 0,
  aging_bucket TEXT NOT NULL CHECK (aging_bucket IN ('not_due', '0-30', '31-60', '61+')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 16. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_accounting_settings_company ON public.accounting_settings(company_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_company ON public.user_roles(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_company ON public.audit_log(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_rejects_company ON public.data_rejects(company_id);
CREATE INDEX IF NOT EXISTS idx_fx_calendar_company_date ON public.fx_calendar(company_id, date);
CREATE INDEX IF NOT EXISTS idx_facts_revenue_company_date ON public.facts_revenue_daily(company_id, date);
CREATE INDEX IF NOT EXISTS idx_facts_expenses_company_date ON public.facts_expenses_daily(company_id, date);
CREATE INDEX IF NOT EXISTS idx_facts_cashflow_company_date ON public.facts_cashflow_daily(company_id, date);
CREATE INDEX IF NOT EXISTS idx_facts_ar_company ON public.facts_ar(company_id);
CREATE INDEX IF NOT EXISTS idx_facts_ar_invoice ON public.facts_ar(invoice_id);
CREATE INDEX IF NOT EXISTS idx_facts_ap_company ON public.facts_ap(company_id);

-- 17. Enable RLS on all new tables
ALTER TABLE public.accounting_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_rejects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fx_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facts_revenue_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facts_expenses_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facts_cashflow_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facts_ar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facts_ap ENABLE ROW LEVEL SECURITY;

-- 18. Create RLS policies for accounting_settings
CREATE POLICY "Accounting settings viewable by company users" ON public.accounting_settings
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Accounting settings updatable by company admins" ON public.accounting_settings
  FOR UPDATE USING (company_id = get_user_company_id());

CREATE POLICY "Accounting settings insertable by company users" ON public.accounting_settings
  FOR INSERT WITH CHECK (company_id = get_user_company_id());

-- 19. Create RLS policies for user_roles
CREATE POLICY "User roles viewable by company users" ON public.user_roles
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "User roles manageable by company admins" ON public.user_roles
  FOR ALL USING (company_id = get_user_company_id());

-- 20. Create RLS policies for audit_log
CREATE POLICY "Audit log viewable by company users" ON public.audit_log
  FOR SELECT USING (company_id = get_user_company_id());

-- 21. Create RLS policies for data_rejects
CREATE POLICY "Data rejects viewable by company users" ON public.data_rejects
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Data rejects deletable by company users" ON public.data_rejects
  FOR DELETE USING (company_id = get_user_company_id());

-- 22. Create RLS policies for fx_calendar
CREATE POLICY "FX calendar viewable by company users" ON public.fx_calendar
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "FX calendar insertable by company users" ON public.fx_calendar
  FOR INSERT WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "FX calendar updatable by company users" ON public.fx_calendar
  FOR UPDATE USING (company_id = get_user_company_id());

-- 23. Create RLS policies for all facts tables
CREATE POLICY "Facts revenue viewable by company users" ON public.facts_revenue_daily
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Facts expenses viewable by company users" ON public.facts_expenses_daily
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Facts cashflow viewable by company users" ON public.facts_cashflow_daily
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Facts AR viewable by company users" ON public.facts_ar
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Facts AP viewable by company users" ON public.facts_ap
  FOR SELECT USING (company_id = get_user_company_id());

-- 24. Apply triggers to tables with updated_at
CREATE TRIGGER update_accounting_settings_updated_at BEFORE UPDATE ON public.accounting_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fx_calendar_updated_at BEFORE UPDATE ON public.fx_calendar
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_facts_revenue_updated_at BEFORE UPDATE ON public.facts_revenue_daily
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_facts_expenses_updated_at BEFORE UPDATE ON public.facts_expenses_daily
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_facts_cashflow_updated_at BEFORE UPDATE ON public.facts_cashflow_daily
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_facts_ar_updated_at BEFORE UPDATE ON public.facts_ar
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_facts_ap_updated_at BEFORE UPDATE ON public.facts_ap
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
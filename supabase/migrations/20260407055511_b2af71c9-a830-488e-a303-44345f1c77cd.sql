
ALTER TABLE public.accounts 
ADD COLUMN IF NOT EXISTS bank_name text,
ADD COLUMN IF NOT EXISTS account_number text,
ADD COLUMN IF NOT EXISTS iban text,
ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'checking',
ADD COLUMN IF NOT EXISTS holder_name text,
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

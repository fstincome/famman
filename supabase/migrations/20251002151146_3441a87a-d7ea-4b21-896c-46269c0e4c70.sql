-- Update invoice status constraint to support more statuses
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;

ALTER TABLE invoices ADD CONSTRAINT invoices_status_check 
  CHECK (status IN ('Draft', 'Open', 'Paid', 'Partially Paid', 'Cancelled', 'Canceled', 'Overdue', 'Pending'));

-- Add index on status for better query performance
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- Add index on dates for better ETL performance
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON invoices(issue_date);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses_new(date);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON bank_transactions(date);
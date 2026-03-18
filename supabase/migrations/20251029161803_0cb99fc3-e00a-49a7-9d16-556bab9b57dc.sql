-- Clear all transactional and fact data
-- Preserve: profiles, companies, accounting_settings, user_roles

-- Clear fact tables
DELETE FROM facts_revenue_daily;
DELETE FROM facts_expenses_daily;
DELETE FROM facts_cashflow_daily;
DELETE FROM facts_ar;
DELETE FROM facts_ap;

-- Clear transaction tables
DELETE FROM payments;
DELETE FROM invoices;
DELETE FROM bank_transactions;
DELETE FROM expenses_new;

-- Clear master data
DELETE FROM customers;
DELETE FROM accounts;
DELETE FROM fx_rates;
DELETE FROM fx_calendar;

-- Clear analytics tables
DELETE FROM revenue_sources;
DELETE FROM expense_categories;
DELETE FROM regional_revenue;
DELETE FROM clients;
DELETE FROM vendors;
DELETE FROM kpis;
DELETE FROM financial_metrics;

-- Clear audit and rejects
DELETE FROM data_rejects;
DELETE FROM audit_log;
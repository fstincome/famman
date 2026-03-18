-- Create financial dashboard tables with sample data

-- Companies/Organizations table for multi-tenant support
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User profiles with company association
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Financial metrics for dashboard overview
CREATE TABLE public.financial_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  metric_type TEXT NOT NULL, -- 'revenue', 'expenses', 'profit', 'cash_flow', etc.
  amount DECIMAL(15,2) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_type TEXT NOT NULL, -- 'day', 'week', 'month', 'quarter', 'year'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Revenue sources (products, services, subscriptions)
CREATE TABLE public.revenue_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'product', 'service', 'subscription'
  amount DECIMAL(15,2) NOT NULL,
  percentage DECIMAL(5,2),
  growth_rate DECIMAL(5,2),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Expense categories
CREATE TABLE public.expense_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'salaries', 'marketing', 'operations', 'technology'
  amount DECIMAL(15,2) NOT NULL,
  percentage DECIMAL(5,2),
  growth_rate DECIMAL(5,2),
  budget_amount DECIMAL(15,2),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Regional revenue data
CREATE TABLE public.regional_revenue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  region TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  percentage DECIMAL(5,2),
  growth_rate DECIMAL(5,2),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Top clients
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  revenue DECIMAL(15,2) NOT NULL,
  growth_rate DECIMAL(5,2),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Vendors/suppliers
CREATE TABLE public.vendors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- KPIs and ratios
CREATE TABLE public.kpis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  kpi_name TEXT NOT NULL,
  value DECIMAL(15,4) NOT NULL,
  unit TEXT, -- '%', 'months', '$', etc.
  growth_rate DECIMAL(5,2),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regional_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpis ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's company
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- RLS Policies for companies
CREATE POLICY "Users can view their own company" ON public.companies
FOR SELECT USING (id = public.get_user_company_id());

CREATE POLICY "Users can update their own company" ON public.companies
FOR UPDATE USING (id = public.get_user_company_id());

-- RLS Policies for profiles
CREATE POLICY "Profiles are viewable by users in same company" ON public.profiles
FOR SELECT USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT WITH CHECK (user_id = auth.uid());

-- RLS Policies for financial data (all tables follow same pattern)
CREATE POLICY "Financial metrics viewable by company users" ON public.financial_metrics
FOR SELECT USING (company_id = public.get_user_company_id());

CREATE POLICY "Financial metrics insertable by company users" ON public.financial_metrics
FOR INSERT WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Revenue sources viewable by company users" ON public.revenue_sources
FOR SELECT USING (company_id = public.get_user_company_id());

CREATE POLICY "Revenue sources insertable by company users" ON public.revenue_sources
FOR INSERT WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Expense categories viewable by company users" ON public.expense_categories
FOR SELECT USING (company_id = public.get_user_company_id());

CREATE POLICY "Expense categories insertable by company users" ON public.expense_categories
FOR INSERT WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Regional revenue viewable by company users" ON public.regional_revenue
FOR SELECT USING (company_id = public.get_user_company_id());

CREATE POLICY "Regional revenue insertable by company users" ON public.regional_revenue
FOR INSERT WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Clients viewable by company users" ON public.clients
FOR SELECT USING (company_id = public.get_user_company_id());

CREATE POLICY "Clients insertable by company users" ON public.clients
FOR INSERT WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Vendors viewable by company users" ON public.vendors
FOR SELECT USING (company_id = public.get_user_company_id());

CREATE POLICY "Vendors insertable by company users" ON public.vendors
FOR INSERT WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "KPIs viewable by company users" ON public.kpis
FOR SELECT USING (company_id = public.get_user_company_id());

CREATE POLICY "KPIs insertable by company users" ON public.kpis
FOR INSERT WITH CHECK (company_id = public.get_user_company_id());

-- Trigger function for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for timestamp updates
CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  company_uuid UUID;
BEGIN
  -- Create a default company for new users
  INSERT INTO public.companies (name) 
  VALUES (COALESCE(NEW.raw_user_meta_data ->> 'company_name', 'My Company'))
  RETURNING id INTO company_uuid;
  
  -- Create profile for the new user
  INSERT INTO public.profiles (user_id, company_id, first_name, last_name, email, role)
  VALUES (
    NEW.id,
    company_uuid,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.email,
    'admin'
  );
  
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
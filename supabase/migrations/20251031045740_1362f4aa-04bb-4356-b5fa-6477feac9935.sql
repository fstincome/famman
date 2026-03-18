-- Create scheduled_reports table
CREATE TABLE public.scheduled_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  report_type TEXT NOT NULL,
  report_name TEXT NOT NULL,
  frequency TEXT NOT NULL,
  next_run_date DATE NOT NULL,
  recipients TEXT[] NOT NULL DEFAULT '{}',
  format TEXT NOT NULL DEFAULT 'pdf',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.scheduled_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for scheduled_reports
CREATE POLICY "Scheduled reports viewable by company users" 
ON public.scheduled_reports 
FOR SELECT 
USING (company_id = get_user_company_id());

CREATE POLICY "Scheduled reports insertable by company users" 
ON public.scheduled_reports 
FOR INSERT 
WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Scheduled reports updatable by company users" 
ON public.scheduled_reports 
FOR UPDATE 
USING (company_id = get_user_company_id());

CREATE POLICY "Scheduled reports deletable by company users" 
ON public.scheduled_reports 
FOR DELETE 
USING (company_id = get_user_company_id());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_scheduled_reports_updated_at
BEFORE UPDATE ON public.scheduled_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
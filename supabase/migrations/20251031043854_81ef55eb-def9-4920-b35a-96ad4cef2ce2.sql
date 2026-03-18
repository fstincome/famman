-- Create contacts table
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  avatar_color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Create policies for contacts
CREATE POLICY "Contacts viewable by company users" 
ON public.contacts 
FOR SELECT 
USING (company_id = get_user_company_id());

CREATE POLICY "Contacts insertable by company users" 
ON public.contacts 
FOR INSERT 
WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Contacts updatable by company users" 
ON public.contacts 
FOR UPDATE 
USING (company_id = get_user_company_id());

CREATE POLICY "Contacts deletable by company users" 
ON public.contacts 
FOR DELETE 
USING (company_id = get_user_company_id());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_contacts_updated_at
BEFORE UPDATE ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
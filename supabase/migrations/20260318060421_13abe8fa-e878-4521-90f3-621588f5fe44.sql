-- Create the missing trigger for new user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Update handle_new_user to also assign admin role and use French default
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  company_uuid UUID;
BEGIN
  INSERT INTO public.companies (name) 
  VALUES (COALESCE(NEW.raw_user_meta_data ->> 'company_name', 'Ma Famille'))
  RETURNING id INTO company_uuid;
  
  INSERT INTO public.profiles (user_id, company_id, first_name, last_name, email, role)
  VALUES (
    NEW.id,
    company_uuid,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.email,
    'admin'
  );

  INSERT INTO public.user_roles (user_id, company_id, role)
  VALUES (NEW.id, company_uuid, 'admin');
  
  RETURN NEW;
END;
$$;
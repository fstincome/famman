-- Ensure demo company exists and update sample data to be properly linked
UPDATE public.companies 
SET name = 'FinanceFlow Demo Company'
WHERE id = '550e8400-e29b-41d4-a716-446655440000';

-- If the demo company doesn't exist, insert it
INSERT INTO public.companies (id, name) 
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'FinanceFlow Demo Company')
ON CONFLICT (id) DO NOTHING;

-- Create a function to setup demo user profile
CREATE OR REPLACE FUNCTION public.setup_demo_user_profile(demo_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert or update the demo profile
  INSERT INTO public.profiles (user_id, company_id, first_name, last_name, email, role)
  VALUES (
    demo_user_id,
    '550e8400-e29b-41d4-a716-446655440000',
    'Demo',
    'User',
    'demo@financeflow.app',
    'admin'
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    company_id = '550e8400-e29b-41d4-a716-446655440000',
    first_name = 'Demo',
    last_name = 'User',
    email = 'demo@financeflow.app',
    role = 'admin';
END;
$$;

CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  family_role text NOT NULL,
  action_key text NOT NULL,
  allowed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, family_role, action_key)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permissions viewable by company users"
  ON public.role_permissions FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Permissions insertable by admins"
  ON public.role_permissions FOR INSERT
  WITH CHECK (company_id = get_user_company_id() AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Permissions updatable by admins"
  ON public.role_permissions FOR UPDATE
  USING (company_id = get_user_company_id() AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Permissions deletable by admins"
  ON public.role_permissions FOR DELETE
  USING (company_id = get_user_company_id() AND has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_role_permissions_updated
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.has_permission(_action_key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _company uuid;
  _family_role text;
  _allowed boolean;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  IF has_role(auth.uid(), 'admin') THEN RETURN true; END IF;

  SELECT company_id, family_role INTO _company, _family_role
  FROM public.profiles WHERE user_id = auth.uid();

  IF _company IS NULL THEN RETURN false; END IF;

  SELECT allowed INTO _allowed
  FROM public.role_permissions
  WHERE company_id = _company
    AND family_role = COALESCE(_family_role, 'member')
    AND action_key = _action_key;

  RETURN COALESCE(_allowed, false);
END;
$$;

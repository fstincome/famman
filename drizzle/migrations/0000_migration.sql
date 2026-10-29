CREATE TABLE public.notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL,
  subject text NOT NULL,
  action text,
  entity_type text,
  entity_name text,
  recipient_email text NOT NULL,
  recipient_name text,
  status text NOT NULL DEFAULT 'sent',
  error_message text,
  triggered_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.notification_deliveries TO authenticated;
GRANT ALL ON public.notification_deliveries TO service_role;
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view deliveries of their family" ON public.notification_deliveries
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id() AND public.has_role(auth.uid(), 'admin'));
CREATE INDEX ON public.notification_deliveries (company_id, created_at DESC);
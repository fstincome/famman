
-- Notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Notifications viewable by company users" ON public.notifications
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Notifications insertable by company users" ON public.notifications
  FOR INSERT WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Notifications updatable by company users" ON public.notifications
  FOR UPDATE USING (company_id = get_user_company_id());

CREATE POLICY "Notifications deletable by company users" ON public.notifications
  FOR DELETE USING (company_id = get_user_company_id());

CREATE INDEX idx_notifications_company ON public.notifications(company_id, created_at DESC);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, read);

-- Activity log table
CREATE TABLE public.activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_name TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  entity_name TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Activity log viewable by company users" ON public.activity_log
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Activity log insertable by company users" ON public.activity_log
  FOR INSERT WITH CHECK (company_id = get_user_company_id());

CREATE INDEX idx_activity_log_company ON public.activity_log(company_id, created_at DESC);
CREATE INDEX idx_activity_log_entity ON public.activity_log(entity_type, entity_id);

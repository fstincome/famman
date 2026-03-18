
CREATE TABLE public.project_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.family_projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  task_name TEXT NOT NULL,
  task_order INTEGER NOT NULL DEFAULT 1,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project tasks viewable by company users" ON public.project_tasks
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Project tasks insertable by company users" ON public.project_tasks
  FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Project tasks updatable by company users" ON public.project_tasks
  FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Project tasks deletable by company users" ON public.project_tasks
  FOR DELETE TO authenticated
  USING (company_id = get_user_company_id());

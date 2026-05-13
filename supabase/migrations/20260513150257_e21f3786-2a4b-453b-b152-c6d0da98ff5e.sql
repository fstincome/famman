
CREATE TABLE public.family_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT,
  nickname TEXT,
  gender TEXT,
  family_role TEXT,
  birth_date DATE,
  birth_place TEXT,
  death_date DATE,
  marital_status TEXT,
  nationality TEXT,
  religion TEXT,
  languages TEXT[],
  blood_type TEXT,
  national_id TEXT,
  passport_number TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  current_city TEXT,
  current_country TEXT,
  profession TEXT,
  employer TEXT,
  father_name TEXT,
  mother_name TEXT,
  spouse_name TEXT,
  children_count INT DEFAULT 0,
  photo_url TEXT,
  biography TEXT,
  hobbies TEXT,
  notes TEXT,
  is_alive BOOLEAN NOT NULL DEFAULT true,
  avatar_color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members viewable by company" ON public.family_members FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Members insertable by company" ON public.family_members FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Members updatable by company" ON public.family_members FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "Members deletable by company" ON public.family_members FOR DELETE USING (company_id = get_user_company_id());
CREATE TRIGGER trg_family_members_updated BEFORE UPDATE ON public.family_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.member_education (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  institution TEXT NOT NULL,
  degree TEXT,
  field_of_study TEXT,
  start_year INT,
  end_year INT,
  grade TEXT,
  location TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.member_education ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Education viewable by company" ON public.member_education FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Education insertable by company" ON public.member_education FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Education updatable by company" ON public.member_education FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "Education deletable by company" ON public.member_education FOR DELETE USING (company_id = get_user_company_id());
CREATE TRIGGER trg_member_education_updated BEFORE UPDATE ON public.member_education FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.member_career (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  position TEXT NOT NULL,
  organization TEXT,
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN NOT NULL DEFAULT false,
  location TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.member_career ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Career viewable by company" ON public.member_career FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Career insertable by company" ON public.member_career FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Career updatable by company" ON public.member_career FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "Career deletable by company" ON public.member_career FOR DELETE USING (company_id = get_user_company_id());
CREATE TRIGGER trg_member_career_updated BEFORE UPDATE ON public.member_career FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.member_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  title TEXT NOT NULL,
  milestone_type TEXT,
  date DATE,
  location TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.member_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Milestones viewable by company" ON public.member_milestones FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Milestones insertable by company" ON public.member_milestones FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Milestones updatable by company" ON public.member_milestones FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "Milestones deletable by company" ON public.member_milestones FOR DELETE USING (company_id = get_user_company_id());
CREATE TRIGGER trg_member_milestones_updated BEFORE UPDATE ON public.member_milestones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_family_members_company ON public.family_members(company_id);
CREATE INDEX idx_member_education_member ON public.member_education(member_id);
CREATE INDEX idx_member_career_member ON public.member_career(member_id);
CREATE INDEX idx_member_milestones_member ON public.member_milestones(member_id);

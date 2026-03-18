-- Create table for filter segments/categories
CREATE TABLE public.filter_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  segment_type TEXT NOT NULL CHECK (segment_type IN ('project', 'department', 'product', 'region')),
  segment_value TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (company_id, segment_type, segment_value)
);

-- Enable RLS
ALTER TABLE public.filter_segments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Filter segments viewable by company users"
ON public.filter_segments
FOR SELECT
USING (company_id = get_user_company_id());

CREATE POLICY "Filter segments insertable by company users"
ON public.filter_segments
FOR INSERT
WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Filter segments updatable by company users"
ON public.filter_segments
FOR UPDATE
USING (company_id = get_user_company_id());

CREATE POLICY "Filter segments deletable by company users"
ON public.filter_segments
FOR DELETE
USING (company_id = get_user_company_id());

-- Create trigger for updated_at
CREATE TRIGGER update_filter_segments_updated_at
BEFORE UPDATE ON public.filter_segments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_filter_segments_company_type ON public.filter_segments(company_id, segment_type) WHERE is_active = true;
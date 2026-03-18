-- Create storage bucket for CSV uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'csv-imports',
  'csv-imports',
  false,
  10485760, -- 10MB limit
  ARRAY['text/csv', 'application/vnd.ms-excel', 'application/csv']
);

-- Create RLS policies for CSV storage
CREATE POLICY "Users can upload CSV files to their company folder"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'csv-imports' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own CSV files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'csv-imports' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own CSV files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'csv-imports' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Add import_batch_id to track CSV imports in audit log
ALTER TABLE audit_log
ADD COLUMN IF NOT EXISTS import_batch_id uuid;
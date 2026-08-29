CREATE POLICY "Company members can read application docs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'application-docs' AND (storage.foldername(name))[1] = public.get_user_company_id()::text);

CREATE POLICY "Company members can upload application docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'application-docs' AND (storage.foldername(name))[1] = public.get_user_company_id()::text);

CREATE POLICY "Company members can delete application docs"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'application-docs' AND (storage.foldername(name))[1] = public.get_user_company_id()::text);
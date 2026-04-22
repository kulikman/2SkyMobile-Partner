-- Create storage buckets for file uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('ticket-screenshots', 'ticket-screenshots', true, 10485760, ARRAY['image/png','image/jpeg','image/gif','image/webp']),
  ('project-files',      'project-files',      true, 52428800, NULL)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for ticket-screenshots
DROP POLICY IF EXISTS "Authenticated users can upload ticket screenshots" ON storage.objects;
CREATE POLICY "Authenticated users can upload ticket screenshots"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ticket-screenshots');

DROP POLICY IF EXISTS "Anyone can read ticket screenshots" ON storage.objects;
CREATE POLICY "Anyone can read ticket screenshots"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'ticket-screenshots');

DROP POLICY IF EXISTS "Owner can delete ticket screenshots" ON storage.objects;
CREATE POLICY "Owner can delete ticket screenshots"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'ticket-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS policies for project-files
DROP POLICY IF EXISTS "Authenticated users can upload project files" ON storage.objects;
CREATE POLICY "Authenticated users can upload project files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-files');

DROP POLICY IF EXISTS "Anyone can read project files" ON storage.objects;
CREATE POLICY "Anyone can read project files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'project-files');

DROP POLICY IF EXISTS "Admin can delete project files" ON storage.objects;
CREATE POLICY "Admin can delete project files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'project-files'
    AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- Ensure tech_spec column exists on folders
ALTER TABLE folders ADD COLUMN IF NOT EXISTS tech_spec jsonb;

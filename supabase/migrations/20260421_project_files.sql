CREATE TABLE project_files (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  folder_id   uuid REFERENCES folders(id) ON DELETE CASCADE NOT NULL,
  name        text NOT NULL,
  storage_path text NOT NULL,
  size        bigint,
  mime_type   text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX project_files_folder_id_idx ON project_files(folder_id);

ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on project_files"
  ON project_files FOR ALL
  USING (EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
  ));

CREATE POLICY "Partners can read files for their projects"
  ON project_files FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM folders f
    WHERE f.id = project_files.folder_id
      AND f.company_id::text = (
        SELECT raw_user_meta_data->>'company_id'
        FROM auth.users WHERE auth.users.id = auth.uid()
      )
  ));

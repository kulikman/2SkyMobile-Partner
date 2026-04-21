CREATE TABLE meetings (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  folder_id    uuid REFERENCES folders(id) ON DELETE CASCADE NOT NULL,
  title        text NOT NULL,
  meeting_date date NOT NULL,
  summary      text,
  created_at   timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX meetings_folder_id_idx ON meetings(folder_id);

ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on meetings"
  ON meetings FOR ALL
  USING (EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
  ));

CREATE POLICY "Partners can read meetings for their projects"
  ON meetings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM folders f
    WHERE f.id = meetings.folder_id
      AND f.company_id::text = (
        SELECT raw_user_meta_data->>'company_id'
        FROM auth.users WHERE auth.users.id = auth.uid()
      )
  ));

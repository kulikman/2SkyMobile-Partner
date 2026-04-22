-- Project members: links users to projects (folders)
CREATE TABLE IF NOT EXISTS project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(folder_id, user_id)
);

ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- Users can see their own memberships
DROP POLICY IF EXISTS "Users can see own memberships" ON project_members;
CREATE POLICY "Users can see own memberships"
  ON project_members FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- Only admin can manage memberships
DROP POLICY IF EXISTS "Admin can manage project_members" ON project_members;
CREATE POLICY "Admin can manage project_members"
  ON project_members FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Update folders RLS: viewers see only projects they're members of
DROP POLICY IF EXISTS "Authenticated users can read folders" ON folders;

DROP POLICY IF EXISTS "Users can read assigned folders" ON folders;
CREATE POLICY "Users can read assigned folders"
  ON folders FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.folder_id = folders.id AND pm.user_id = auth.uid()
    )
  );

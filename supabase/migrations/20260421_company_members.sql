-- Company members: links users to companies (replaces per-project membership)
CREATE TABLE IF NOT EXISTS company_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, user_id)
);

ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;

-- Users can see their own memberships; admins see all
CREATE POLICY "company_members_select"
  ON company_members FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- Only admins can manage memberships
CREATE POLICY "company_members_admin"
  ON company_members FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Update folders RLS: viewers see projects belonging to their company
DROP POLICY IF EXISTS "Users can read assigned folders" ON folders;

CREATE POLICY "Users can read assigned folders"
  ON folders FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR EXISTS (
      SELECT 1 FROM company_members cm
      WHERE cm.company_id = folders.company_id
        AND cm.user_id = auth.uid()
    )
  );

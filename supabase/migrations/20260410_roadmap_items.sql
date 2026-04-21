-- Roadmap items for projects
CREATE TABLE IF NOT EXISTS roadmap_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  position integer NOT NULL DEFAULT 0,
  due_date date,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE roadmap_items ENABLE ROW LEVEL SECURITY;

-- Users can read roadmap items for projects they're members of
CREATE POLICY "Members can read roadmap_items"
  ON roadmap_items FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.folder_id = roadmap_items.folder_id AND pm.user_id = auth.uid()
    )
  );

-- Only admin can manage roadmap items
CREATE POLICY "Admin can manage roadmap_items"
  ON roadmap_items FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

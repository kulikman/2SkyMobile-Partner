-- Chat messages for project communication
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  content text NOT NULL,
  author_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Members can read chat messages for their projects
CREATE POLICY "Members can read chat_messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.folder_id = chat_messages.folder_id AND pm.user_id = auth.uid()
    )
  );

-- Members can insert chat messages in their projects
CREATE POLICY "Members can insert chat_messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
      OR EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.folder_id = chat_messages.folder_id AND pm.user_id = auth.uid()
      )
    )
  );

-- Admin can manage all chat messages
CREATE POLICY "Admin can manage chat_messages"
  ON chat_messages FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

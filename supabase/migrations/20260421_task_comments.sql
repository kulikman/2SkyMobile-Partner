-- Task comments with threading support
CREATE TABLE task_comments (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id     uuid REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text NOT NULL,
  content     text NOT NULL,
  parent_id   uuid REFERENCES task_comments(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX task_comments_task_id_idx   ON task_comments(task_id);
CREATE INDEX task_comments_parent_id_idx ON task_comments(parent_id);

ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admin full access on task_comments"
  ON task_comments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
        AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Partners can read comments for tasks in their projects
CREATE POLICY "Partners can read task comments for their projects"
  ON task_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN folders f ON f.id = t.folder_id
      WHERE t.id = task_comments.task_id
        AND f.company_id::text = (
          SELECT raw_user_meta_data->>'company_id'
          FROM auth.users WHERE auth.users.id = auth.uid()
        )
    )
  );

-- Partners can insert comments for tasks in their projects
CREATE POLICY "Partners can create task comments"
  ON task_comments FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM tasks t
      JOIN folders f ON f.id = t.folder_id
      WHERE t.id = task_comments.task_id
        AND f.company_id::text = (
          SELECT raw_user_meta_data->>'company_id'
          FROM auth.users WHERE auth.users.id = auth.uid()
        )
    )
  );

-- Users can delete own comments; admin deletes any
CREATE POLICY "Users can delete own task comments"
  ON task_comments FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
        AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

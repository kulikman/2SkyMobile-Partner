-- Tasks table (replaces roadmap_items)
CREATE TABLE tasks (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  folder_id        uuid REFERENCES folders(id) ON DELETE CASCADE NOT NULL,
  group_label      text,
  title            text NOT NULL,
  description      text,
  type             text,  -- API | Native API | UI | Feature | Integration | Infrastructure | Testing
  role             text,  -- Backend | Mobile | UI/UX | QA
  status           text NOT NULL DEFAULT 'backlog',
                          -- backlog | in_progress | ready_for_testing | approved | done
  estimated_hours  numeric,
  depends_on       uuid[] DEFAULT '{}',  -- task IDs this task depends on (for schedule calc)
  position         integer NOT NULL DEFAULT 0,
  start_date       date,
  due_date         date,
  completed_at     timestamptz,
  created_at       timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX tasks_folder_id_idx ON tasks(folder_id);
CREATE INDEX tasks_status_idx    ON tasks(status);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Admin full access
DROP POLICY IF EXISTS "Admin full access on tasks" ON tasks;
CREATE POLICY "Admin full access on tasks"
  ON tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
        AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Partners can read tasks for projects belonging to their company
DROP POLICY IF EXISTS "Partners can read tasks for their projects" ON tasks;
CREATE POLICY "Partners can read tasks for their projects"
  ON tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM folders f
      WHERE f.id = tasks.folder_id
        AND f.company_id::text = (
          SELECT raw_user_meta_data->>'company_id'
          FROM auth.users WHERE auth.users.id = auth.uid()
        )
    )
  );

-- Partners can update status + add description comment (for testing feedback)
DROP POLICY IF EXISTS "Partners can update task status" ON tasks;
CREATE POLICY "Partners can update task status"
  ON tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM folders f
      WHERE f.id = tasks.folder_id
        AND f.company_id::text = (
          SELECT raw_user_meta_data->>'company_id'
          FROM auth.users WHERE auth.users.id = auth.uid()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM folders f
      WHERE f.id = tasks.folder_id
        AND f.company_id::text = (
          SELECT raw_user_meta_data->>'company_id'
          FROM auth.users WHERE auth.users.id = auth.uid()
        )
    )
  );

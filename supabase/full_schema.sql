-- ============================================================
-- FULL SCHEMA — 2SkyMobile Partner Portal
-- Apply this once to a fresh Supabase project.
-- Generated from schema.sql + all migrations in order.
-- ============================================================

-- ── 1. Base tables ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  image text,
  content text NOT NULL DEFAULT '',
  public_access_enabled boolean NOT NULL DEFAULT false,
  public_share_token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  public_comments_visible boolean NOT NULL DEFAULT false,
  anonymous_comments_enabled boolean NOT NULL DEFAULT false,
  doc_type text NOT NULL DEFAULT 'md',
  folder_id uuid,  -- FK added below after folders
  position integer NOT NULL DEFAULT 0,
  card_color text,
  card_icon text,
  report_type text,
  report_period_start date,
  report_period_end date,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS documents_doc_type_idx ON documents(doc_type);

CREATE TABLE IF NOT EXISTS invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  email text,
  used boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  expires_at timestamptz
);

CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid,  -- FK added below
  user_id uuid REFERENCES auth.users(id),
  anchor_text text,
  anchor_start integer,
  anchor_end integer,
  author_name text,
  is_anonymous boolean NOT NULL DEFAULT false,
  content text NOT NULL,
  parent_id uuid,  -- self-ref added below
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS comments_parent_id_idx ON comments(parent_id);

CREATE VIEW profiles AS SELECT id, email FROM auth.users;

-- ── 2. Folders ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text,
  icon text,
  public_share_token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  position integer NOT NULL DEFAULT 0,
  parent_id uuid REFERENCES folders(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'in_discussion',
  progress integer NOT NULL DEFAULT 0,
  client_name text,
  started_at timestamptz,
  deadline_at timestamptz,
  company_id uuid,  -- FK added below after companies
  tech_spec jsonb,
  stage_url text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS folders_status_idx ON folders(status);

-- Now add FK from documents → folders
ALTER TABLE documents
  ADD CONSTRAINT documents_folder_id_fkey
  FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
  NOT VALID;

-- FK from comments → documents
ALTER TABLE comments
  ADD CONSTRAINT comments_document_id_fkey
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
  NOT VALID;

-- Self-ref on comments
ALTER TABLE comments
  ADD CONSTRAINT comments_parent_id_fkey
  FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
  NOT VALID;

-- ── 3. RLS — documents, comments, invitations, folders ───────

ALTER TABLE documents  ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read documents"
  ON documents FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can manage documents"
  ON documents FOR ALL TO authenticated
  USING  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Authenticated users can read comments"
  ON comments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own comments"
  ON comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner or admin can delete comments"
  ON comments FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Admin can manage invitations"
  ON invitations FOR ALL TO authenticated
  USING  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admin can manage folders"
  ON folders FOR ALL TO authenticated
  USING  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- ── 4. project_members ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(folder_id, user_id)
);

ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see own memberships"
  ON project_members FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admin can manage project_members"
  ON project_members FOR ALL TO authenticated
  USING  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Folders RLS: viewers see only their projects (will be overridden by company_members migration)
CREATE POLICY "Users can read assigned folders"
  ON folders FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.folder_id = folders.id AND pm.user_id = auth.uid()
    )
  );

-- ── 5. roadmap_items ─────────────────────────────────────────

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

CREATE POLICY "Members can read roadmap_items"
  ON roadmap_items FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.folder_id = roadmap_items.folder_id AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin can manage roadmap_items"
  ON roadmap_items FOR ALL TO authenticated
  USING  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- ── 6. chat_messages ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  content text NOT NULL,
  author_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read chat_messages"
  ON chat_messages FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.folder_id = chat_messages.folder_id AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can insert chat_messages"
  ON chat_messages FOR INSERT TO authenticated
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

CREATE POLICY "Admin can manage chat_messages"
  ON chat_messages FOR ALL TO authenticated
  USING  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- ── 7. companies ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS companies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  logo_url text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE folders
  ADD CONSTRAINT folders_company_id_fkey
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
  NOT VALID;

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on companies"
  ON companies FOR ALL
  USING (EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
  ));

CREATE POLICY "Partners can read own company"
  ON companies FOR SELECT
  USING (
    id::text = (
      SELECT raw_user_meta_data->>'company_id'
      FROM auth.users WHERE auth.users.id = auth.uid()
    )
  );

-- ── 8. company_members ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS company_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, user_id)
);

ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_members_select"
  ON company_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "company_members_admin"
  ON company_members FOR ALL TO authenticated
  USING  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Replace project_members-based folders policy with company_members-based
DROP POLICY IF EXISTS "Users can read assigned folders" ON folders;

CREATE POLICY "Users can read assigned folders"
  ON folders FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR EXISTS (
      SELECT 1 FROM company_members cm
      WHERE cm.company_id = folders.company_id AND cm.user_id = auth.uid()
    )
  );

-- ── 9. tasks ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tasks (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  folder_id       uuid REFERENCES folders(id) ON DELETE CASCADE NOT NULL,
  group_label     text,
  title           text NOT NULL,
  description     text,
  type            text,
  role            text,
  status          text NOT NULL DEFAULT 'backlog',
  estimated_hours numeric,
  depends_on      uuid[] DEFAULT '{}',
  position        integer NOT NULL DEFAULT 0,
  start_date      date,
  due_date        date,
  completed_at    timestamptz,
  created_at      timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS tasks_folder_id_idx ON tasks(folder_id);
CREATE INDEX IF NOT EXISTS tasks_status_idx    ON tasks(status);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on tasks"
  ON tasks FOR ALL
  USING (EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
  ));

CREATE POLICY "Partners can read tasks for their projects"
  ON tasks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM folders f
    WHERE f.id = tasks.folder_id
      AND f.company_id::text = (
        SELECT raw_user_meta_data->>'company_id'
        FROM auth.users WHERE auth.users.id = auth.uid()
      )
  ));

CREATE POLICY "Partners can update task status"
  ON tasks FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM folders f
    WHERE f.id = tasks.folder_id
      AND f.company_id::text = (
        SELECT raw_user_meta_data->>'company_id'
        FROM auth.users WHERE auth.users.id = auth.uid()
      )
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM folders f
    WHERE f.id = tasks.folder_id
      AND f.company_id::text = (
        SELECT raw_user_meta_data->>'company_id'
        FROM auth.users WHERE auth.users.id = auth.uid()
      )
  ));

-- ── 10. task_comments ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS task_comments (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id     uuid REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text NOT NULL,
  content     text NOT NULL,
  parent_id   uuid REFERENCES task_comments(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS task_comments_task_id_idx   ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS task_comments_parent_id_idx ON task_comments(parent_id);

ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on task_comments"
  ON task_comments FOR ALL
  USING (EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
  ));

CREATE POLICY "Partners can read task comments for their projects"
  ON task_comments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tasks t
    JOIN folders f ON f.id = t.folder_id
    WHERE t.id = task_comments.task_id
      AND f.company_id::text = (
        SELECT raw_user_meta_data->>'company_id'
        FROM auth.users WHERE auth.users.id = auth.uid()
      )
  ));

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

-- ── 11. notifications ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type       text NOT NULL,
  title      text NOT NULL,
  body       text,
  link       text,
  read       boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx    ON notifications(user_id, read) WHERE read = false;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notifications"
  ON notifications FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Admin can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
        AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
    OR user_id = auth.uid()
  );

-- ── 12. project_files ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS project_files (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  folder_id    uuid REFERENCES folders(id) ON DELETE CASCADE NOT NULL,
  name         text NOT NULL,
  storage_path text NOT NULL,
  size         bigint,
  mime_type    text,
  uploaded_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS project_files_folder_id_idx ON project_files(folder_id);

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

-- ── 13. meetings ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS meetings (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  folder_id    uuid REFERENCES folders(id) ON DELETE CASCADE NOT NULL,
  title        text NOT NULL,
  meeting_date date NOT NULL,
  summary      text,
  created_at   timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS meetings_folder_id_idx ON meetings(folder_id);

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

-- ── 14. tickets ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tickets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id       uuid NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  title           text NOT NULL,
  description     text,
  url             text,
  screenshot_path text,
  status          text NOT NULL DEFAULT 'new',
  created_by      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tickets_admin"
  ON tickets FOR ALL TO authenticated
  USING  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "tickets_partner_select"
  ON tickets FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM folders f
    JOIN company_members cm ON cm.company_id = f.company_id
    WHERE f.id = tickets.folder_id AND cm.user_id = auth.uid()
  ));

CREATE POLICY "tickets_partner_insert"
  ON tickets FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM folders f
      JOIN company_members cm ON cm.company_id = f.company_id
      WHERE f.id = folder_id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "tickets_partner_update"
  ON tickets FOR UPDATE TO authenticated
  USING  (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

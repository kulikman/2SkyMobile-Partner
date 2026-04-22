CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
SET search_path TO "$user", public, extensions;

-- Documents
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  image text,
  content text NOT NULL,
  public_access_enabled boolean NOT NULL DEFAULT false,
  public_share_token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  public_comments_visible boolean NOT NULL DEFAULT false,
  anonymous_comments_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Invitations
CREATE TABLE IF NOT EXISTS invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  email text,
  used boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  expires_at timestamptz
);

-- Comments
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  anchor_text text,
  anchor_start integer,
  anchor_end integer,
  author_name text,
  is_anonymous boolean NOT NULL DEFAULT false,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Profiles view
CREATE OR REPLACE VIEW profiles AS SELECT id, email FROM auth.users;

-- Folders
CREATE TABLE IF NOT EXISTS folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text,
  icon text,
  public_share_token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  position integer NOT NULL DEFAULT 0,
  parent_id uuid REFERENCES folders(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE documents  ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read documents" ON documents;
CREATE POLICY "Authenticated users can read documents"
  ON documents FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin can manage documents" ON documents;
CREATE POLICY "Admin can manage documents"
  ON documents FOR ALL TO authenticated
  USING  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Authenticated users can read comments" ON comments;
CREATE POLICY "Authenticated users can read comments"
  ON comments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can insert own comments" ON comments;
CREATE POLICY "Users can insert own comments"
  ON comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owner or admin can delete comments" ON comments;
CREATE POLICY "Owner or admin can delete comments"
  ON comments FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

DROP POLICY IF EXISTS "Admin can manage invitations" ON invitations;
CREATE POLICY "Admin can manage invitations"
  ON invitations FOR ALL TO authenticated
  USING  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

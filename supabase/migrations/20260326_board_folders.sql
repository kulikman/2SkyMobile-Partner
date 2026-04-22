-- Folders table
CREATE TABLE IF NOT EXISTS folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text,
  icon text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Add board columns to documents
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES folders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS card_color text,
  ADD COLUMN IF NOT EXISTS card_icon text;

-- Initialise position from created_at order
WITH ordered AS (
  SELECT id, (ROW_NUMBER() OVER (ORDER BY created_at ASC)) - 1 AS rn
  FROM documents
)
UPDATE documents SET position = ordered.rn
FROM ordered WHERE documents.id = ordered.id;

-- RLS for folders
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read folders" ON folders;
CREATE POLICY "Authenticated users can read folders"
  ON folders FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin can manage folders" ON folders;
CREATE POLICY "Admin can manage folders"
  ON folders FOR ALL TO authenticated
  USING  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

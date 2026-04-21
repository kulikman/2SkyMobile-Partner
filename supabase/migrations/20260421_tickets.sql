CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  url text,
  screenshot_path text,
  status text NOT NULL DEFAULT 'new',
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- status values: new | in_progress | ready_for_testing | approved

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Admins see and manage all tickets
CREATE POLICY "tickets_admin"
  ON tickets FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Partners can read tickets for their company's projects
CREATE POLICY "tickets_partner_select"
  ON tickets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM folders f
      JOIN company_members cm ON cm.company_id = f.company_id
      WHERE f.id = tickets.folder_id AND cm.user_id = auth.uid()
    )
  );

-- Partners can create tickets for their company's projects
CREATE POLICY "tickets_partner_insert"
  ON tickets FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM folders f
      JOIN company_members cm ON cm.company_id = f.company_id
      WHERE f.id = folder_id AND cm.user_id = auth.uid()
    )
  );

-- Partners can update only their own tickets (to approve)
CREATE POLICY "tickets_partner_update"
  ON tickets FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

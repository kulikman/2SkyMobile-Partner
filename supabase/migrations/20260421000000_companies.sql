-- Companies table
CREATE TABLE companies (
  id        uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name      text NOT NULL,
  logo_url  text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Link folders (projects) to a company
ALTER TABLE folders ADD COLUMN company_id uuid REFERENCES companies(id) ON DELETE SET NULL;

-- Store tech stack + infrastructure as JSONB on the project folder
ALTER TABLE folders ADD COLUMN tech_spec jsonb;

-- RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Admin can do anything
DROP POLICY IF EXISTS "Admin full access on companies" ON companies;
CREATE POLICY "Admin full access on companies"
  ON companies FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
        AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Partners can read their own company
DROP POLICY IF EXISTS "Partners can read own company" ON companies;
CREATE POLICY "Partners can read own company"
  ON companies FOR SELECT
  USING (
    id::text = (
      SELECT raw_user_meta_data->>'company_id'
      FROM auth.users
      WHERE auth.users.id = auth.uid()
    )
  );

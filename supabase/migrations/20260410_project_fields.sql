-- Add project-specific fields to folders
ALTER TABLE folders ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'in_discussion';
ALTER TABLE folders ADD COLUMN IF NOT EXISTS progress integer NOT NULL DEFAULT 0;
ALTER TABLE folders ADD COLUMN IF NOT EXISTS client_name text;
ALTER TABLE folders ADD COLUMN IF NOT EXISTS started_at timestamptz;
ALTER TABLE folders ADD COLUMN IF NOT EXISTS deadline_at timestamptz;

CREATE INDEX IF NOT EXISTS folders_status_idx ON folders(status);

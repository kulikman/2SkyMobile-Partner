-- Allow folders to be nested inside other folders
ALTER TABLE folders
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES folders(id) ON DELETE SET NULL;

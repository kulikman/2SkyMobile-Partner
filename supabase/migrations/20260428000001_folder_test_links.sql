-- Array of { label, url } objects for project test/staging links
ALTER TABLE folders ADD COLUMN IF NOT EXISTS test_links jsonb NOT NULL DEFAULT '[]'::jsonb;

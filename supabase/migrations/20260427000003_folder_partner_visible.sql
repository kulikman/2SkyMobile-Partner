-- Toggle to show/hide a project from partner view
ALTER TABLE folders ADD COLUMN IF NOT EXISTS partner_visible boolean NOT NULL DEFAULT true;

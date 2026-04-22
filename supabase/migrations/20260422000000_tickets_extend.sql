-- Extend tickets with spreadsheet-matching fields
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS module   text,
  ADD COLUMN IF NOT EXISTS type     text,
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS severity text DEFAULT 'moderate',
  ADD COLUMN IF NOT EXISTS comments text;

-- Expand valid status set (on_hold, closed added)
-- No enum change needed — status is plain text

-- Add report metadata to documents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS report_type text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS report_period_start date;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS report_period_end date;

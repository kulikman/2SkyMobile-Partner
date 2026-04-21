-- Add document type column
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS doc_type text NOT NULL DEFAULT 'md';

-- Index for filtering by type
CREATE INDEX IF NOT EXISTS documents_doc_type_idx ON public.documents(doc_type);

-- Tracks which predefined (static) test steps have been hidden per folder.
-- Only admins can hide/show steps; hiding is non-destructive (step_id is the
-- string id from the STEPS constant, e.g. '1', '42').

CREATE TABLE IF NOT EXISTS public.testing_hidden_steps (
  folder_id  uuid   NOT NULL REFERENCES public.folders(id) ON DELETE CASCADE,
  step_id    text   NOT NULL,
  hidden_at  timestamptz NOT NULL DEFAULT now(),
  hidden_by  uuid   REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (folder_id, step_id)
);

-- Admins access this via service_role in API routes; no RLS needed.
ALTER TABLE public.testing_hidden_steps ENABLE ROW LEVEL SECURITY;

-- Allow service_role full access (used by API routes via createAdminClient)
CREATE POLICY "service_role full access"
  ON public.testing_hidden_steps
  USING (true)
  WITH CHECK (true);

alter table public.documents
  add column if not exists description text,
  add column if not exists image text;

alter table public.comments
  add column if not exists anchor_text text,
  add column if not exists anchor_start integer,
  add column if not exists anchor_end integer;

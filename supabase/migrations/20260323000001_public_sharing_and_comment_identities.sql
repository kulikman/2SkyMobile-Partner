alter table public.documents
  add column if not exists public_access_enabled boolean not null default false,
  add column if not exists public_comments_visible boolean not null default false,
  add column if not exists anonymous_comments_enabled boolean not null default false;

alter table public.comments
  add column if not exists author_name text,
  add column if not exists is_anonymous boolean not null default false;

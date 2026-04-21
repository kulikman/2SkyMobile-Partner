-- Documents
create table documents (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  image text,
  content text not null,
  public_access_enabled boolean not null default false,
  public_share_token text unique not null default encode(gen_random_bytes(16), 'hex'),
  public_comments_visible boolean not null default false,
  anonymous_comments_enabled boolean not null default false,
  created_at timestamptz default now()
);

-- Invitations
create table invitations (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  email text,
  used boolean default false,
  created_by uuid references auth.users(id),
  expires_at timestamptz
);

-- Comments
create table comments (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  user_id uuid references auth.users(id),
  anchor_text text,
  anchor_start integer,
  anchor_end integer,
  author_name text,
  is_anonymous boolean not null default false,
  content text not null,
  created_at timestamptz default now()
);

-- Profiles view (for joining user email to comments)
create view profiles as
  select id, email from auth.users;

create table if not exists folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text,
  icon text,
  public_share_token text unique not null default encode(gen_random_bytes(16), 'hex'),
  position integer not null default 0,
  parent_id uuid references folders(id) on delete set null,
  created_at timestamptz default now()
);

alter table folders
  add column if not exists public_share_token text unique not null default encode(gen_random_bytes(16), 'hex');

-- ── RLS ────────────────────────────────────────────────────────────────────────

alter table documents enable row level security;
alter table invitations enable row level security;
alter table comments enable row level security;

-- Documents: any authenticated user can read
create policy "Authenticated users can read documents"
  on documents for select
  to authenticated
  using (true);

-- Documents: only admin can insert/update/delete
create policy "Admin can manage documents"
  on documents for all
  to authenticated
  using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Comments: any authenticated user can read
create policy "Authenticated users can read comments"
  on comments for select
  to authenticated
  using (true);

-- Comments: owner can insert
create policy "Users can insert own comments"
  on comments for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Comments: owner can delete their own; admin can delete any
create policy "Owner or admin can delete comments"
  on comments for delete
  to authenticated
  using (
    auth.uid() = user_id
    or (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- Invitations: only admin can manage
create policy "Admin can manage invitations"
  on invitations for all
  to authenticated
  using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

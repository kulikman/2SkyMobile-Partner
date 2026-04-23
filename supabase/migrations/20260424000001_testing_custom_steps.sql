create table if not exists testing_custom_steps (
  id          uuid        primary key default gen_random_uuid(),
  folder_id   uuid        not null references folders(id) on delete cascade,
  module      text        not null,
  scenario    text        not null,
  type        text        not null check (type in ('Automated', 'Manual')),
  validates   text        not null default '',
  created_at  timestamptz not null default now()
);

alter table testing_custom_steps enable row level security;

create policy "authenticated users can manage testing_custom_steps"
  on testing_custom_steps for all
  using (auth.uid() is not null);

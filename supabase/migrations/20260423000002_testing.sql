-- Testing results: one row per (folder, step) stores status + notes
create table if not exists testing_results (
  id          uuid        default gen_random_uuid() primary key,
  folder_id   uuid        not null references folders(id) on delete cascade,
  step_id     text        not null,
  status      text        not null default 'pending'
                          check (status in ('pending','pass','fail','blocked')),
  notes       text,
  updated_by  text,
  updated_at  timestamptz default now(),
  unique (folder_id, step_id)
);

-- Testing comments: chat messages attached to a step (step_id null = general)
create table if not exists testing_comments (
  id           uuid        default gen_random_uuid() primary key,
  folder_id    uuid        not null references folders(id) on delete cascade,
  step_id      text,
  author_id    uuid,
  author_email text        not null,
  message      text        not null,
  created_at   timestamptz default now()
);

create index if not exists testing_results_folder_idx  on testing_results  (folder_id);
create index if not exists testing_comments_folder_idx on testing_comments (folder_id);
create index if not exists testing_comments_step_idx   on testing_comments (folder_id, step_id);

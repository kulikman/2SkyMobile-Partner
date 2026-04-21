alter table public.folders
  add column if not exists public_share_token text;

update public.folders
set public_share_token = encode(gen_random_bytes(16), 'hex')
where public_share_token is null;

alter table public.folders
  alter column public_share_token set default encode(gen_random_bytes(16), 'hex'),
  alter column public_share_token set not null;

create unique index if not exists folders_public_share_token_key
  on public.folders(public_share_token);

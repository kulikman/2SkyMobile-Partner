SET search_path TO "$user", public, extensions;

alter table public.documents
  add column if not exists public_share_token text;

update public.documents
set public_share_token = encode(gen_random_bytes(16), 'hex')
where public_share_token is null;

alter table public.documents
  alter column public_share_token set default encode(gen_random_bytes(16), 'hex'),
  alter column public_share_token set not null;

create unique index if not exists documents_public_share_token_key
  on public.documents(public_share_token);

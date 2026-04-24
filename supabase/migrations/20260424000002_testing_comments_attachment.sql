-- Add attachment support to testing_comments
alter table testing_comments add column if not exists attachment_url text;

-- Create public storage bucket for testing attachments
insert into storage.buckets (id, name, public, file_size_limit)
values ('testing-attachments', 'testing-attachments', true, 10485760)
on conflict (id) do nothing;

create policy "authenticated users can upload testing attachments"
  on storage.objects for insert
  with check (bucket_id = 'testing-attachments' and auth.uid() is not null);

create policy "anyone can view testing attachments"
  on storage.objects for select
  using (bucket_id = 'testing-attachments');

-- SIGMA-U: ampliación de comunidad, archivos adjuntos y perfil académico
-- Ejecutar UNA SOLA VEZ en Supabase > SQL Editor.
alter table public.profiles add column if not exists campus text;
alter table public.profiles add column if not exists semester text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists interests text;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, program, campus)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'Estudiante'),
    nullif(trim(new.raw_user_meta_data ->> 'program'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'campus'), '')
  ) on conflict (id) do nothing;
  return new;
end;
$$;

create table if not exists public.post_attachments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null default 'application/octet-stream',
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  created_at timestamptz not null default now()
);
create index if not exists post_attachments_post_id_idx on public.post_attachments(post_id);
alter table public.post_attachments enable row level security;
drop policy if exists "attachments_select_authenticated" on public.post_attachments;
create policy "attachments_select_authenticated" on public.post_attachments for select to authenticated using (true);
drop policy if exists "attachments_insert_own" on public.post_attachments;
create policy "attachments_insert_own" on public.post_attachments for insert to authenticated with check (auth.uid() = author_id and exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid()));
drop policy if exists "attachments_delete_own" on public.post_attachments;
create policy "attachments_delete_own" on public.post_attachments for delete to authenticated using (auth.uid() = author_id);
grant select, insert, delete on public.post_attachments to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'community-files',
  'community-files',
  true,
  104857600,
  array[
    'image/jpeg','image/png','image/gif','image/webp',
    'video/mp4','video/webm','video/quicktime',
    'application/pdf','application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain','text/csv','application/zip','application/x-zip-compressed'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "community_files_public_read" on storage.objects;
create policy "community_files_public_read" on storage.objects for select using (bucket_id = 'community-files');
drop policy if exists "community_files_auth_upload" on storage.objects;
create policy "community_files_auth_upload" on storage.objects for insert to authenticated with check (bucket_id = 'community-files' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "community_files_owner_update" on storage.objects;
create policy "community_files_owner_update" on storage.objects for update to authenticated using (bucket_id = 'community-files' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'community-files' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "community_files_owner_delete" on storage.objects;
create policy "community_files_owner_delete" on storage.objects for delete to authenticated using (bucket_id = 'community-files' and (storage.foldername(name))[1] = auth.uid()::text);

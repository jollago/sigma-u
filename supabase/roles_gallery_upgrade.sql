-- SIGMA-U: roles, moderation and public gallery
-- Ejecutar después de schema.sql y community_upgrade.sql.

create schema if not exists private;

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','user')),
  created_at timestamptz not null default now()
);
alter table public.user_roles enable row level security;
grant select on public.user_roles to authenticated;
drop policy if exists user_roles_select_own on public.user_roles;
create policy user_roles_select_own on public.user_roles
  for select to authenticated
  using ((select auth.uid()) = user_id);

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role = 'admin'
  );
$$;
revoke all on function private.is_admin() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

drop policy if exists posts_delete_own on public.posts;
create policy posts_delete_own on public.posts
  for delete to authenticated
  using ((select auth.uid()) = author_id or (select private.is_admin()));

drop policy if exists comments_delete_own on public.comments;
create policy comments_delete_own on public.comments
  for delete to authenticated
  using ((select auth.uid()) = author_id or (select private.is_admin()));

-- Permite al administrador retirar adjuntos de publicaciones moderadas.
drop policy if exists community_files_admin_delete on storage.objects;
create policy community_files_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'community-files' and (select private.is_admin()));

create table if not exists public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  title text,
  description text,
  storage_path text not null unique,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
alter table public.gallery_items enable row level security;
grant select on public.gallery_items to anon, authenticated;
grant insert, update, delete on public.gallery_items to authenticated;

drop policy if exists gallery_items_read_public on public.gallery_items;
create policy gallery_items_read_public on public.gallery_items
  for select to anon, authenticated using (true);
drop policy if exists gallery_items_admin_insert on public.gallery_items;
create policy gallery_items_admin_insert on public.gallery_items
  for insert to authenticated with check ((select private.is_admin()) and uploaded_by = (select auth.uid()));
drop policy if exists gallery_items_admin_update on public.gallery_items;
create policy gallery_items_admin_update on public.gallery_items
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
drop policy if exists gallery_items_admin_delete on public.gallery_items;
create policy gallery_items_admin_delete on public.gallery_items
  for delete to authenticated using ((select private.is_admin()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sigma-gallery', 'sigma-gallery', true, 10485760, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update
set public=true, file_size_limit=10485760, allowed_mime_types=array['image/jpeg','image/png','image/webp','image/gif'];

drop policy if exists sigma_gallery_public_read on storage.objects;
create policy sigma_gallery_public_read on storage.objects
  for select to anon, authenticated using (bucket_id = 'sigma-gallery');
drop policy if exists sigma_gallery_admin_upload on storage.objects;
create policy sigma_gallery_admin_upload on storage.objects
  for insert to authenticated with check (bucket_id = 'sigma-gallery' and (select private.is_admin()));
drop policy if exists sigma_gallery_admin_delete on storage.objects;
create policy sigma_gallery_admin_delete on storage.objects
  for delete to authenticated using (bucket_id = 'sigma-gallery' and (select private.is_admin()));

-- Asignación inicial del rol: sustituir el correo por la cuenta autorizada.
-- insert into public.user_roles (user_id, role)
-- select id, 'admin' from auth.users where lower(email)=lower('CORREO_ADMIN')
-- on conflict (user_id) do update set role=excluded.role;

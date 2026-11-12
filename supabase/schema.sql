-- SIGMA-U: esquema inicial para Supabase (PostgreSQL)
-- Ejecuta este archivo completo en Supabase > SQL Editor > New query.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default 'Estudiante',
  program text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'Publicación' check (type in ('Publicación','Pregunta','Noticia','Recurso')),
  content text not null check (char_length(trim(content)) between 1 and 10000),
  attachment_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 3000),
  created_at timestamptz not null default now()
);

create table if not exists public.reactions (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id,user_id)
);

create table if not exists public.saved_posts (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id,user_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  post_id uuid references public.posts(id) on delete cascade,
  type text not null check (type in ('comment','reaction','mention','system')),
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists posts_created_at_idx on public.posts(created_at desc);
create index if not exists posts_author_id_idx on public.posts(author_id);
create index if not exists comments_post_id_idx on public.comments(post_id,created_at);
create index if not exists notifications_user_created_idx on public.notifications(user_id,created_at desc);

-- Crear automáticamente el perfil al registrarse en Auth.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, program)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'Estudiante'),
    nullif(trim(new.raw_user_meta_data ->> 'program'), '')
  ) on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

-- RLS habilitada en todas las tablas expuestas.
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.reactions enable row level security;
alter table public.saved_posts enable row level security;
alter table public.notifications enable row level security;

-- Perfiles: lectura para usuarios autenticados; cada persona edita solo el suyo.
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated" on public.profiles for select to authenticated using (true);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Feed: usuarios autenticados pueden leer; solo el autor crea/edita/elimina su publicación.
drop policy if exists "posts_select_authenticated" on public.posts;
create policy "posts_select_authenticated" on public.posts for select to authenticated using (true);
drop policy if exists "posts_insert_own" on public.posts;
create policy "posts_insert_own" on public.posts for insert to authenticated with check (auth.uid() = author_id);
drop policy if exists "posts_update_own" on public.posts;
create policy "posts_update_own" on public.posts for update to authenticated using (auth.uid() = author_id) with check (auth.uid() = author_id);
drop policy if exists "posts_delete_own" on public.posts;
create policy "posts_delete_own" on public.posts for delete to authenticated using (auth.uid() = author_id);

-- Comentarios: lectura autenticada; cada usuario gestiona sus comentarios.
drop policy if exists "comments_select_authenticated" on public.comments;
create policy "comments_select_authenticated" on public.comments for select to authenticated using (true);
drop policy if exists "comments_insert_own" on public.comments;
create policy "comments_insert_own" on public.comments for insert to authenticated with check (auth.uid() = author_id);
drop policy if exists "comments_delete_own" on public.comments;
create policy "comments_delete_own" on public.comments for delete to authenticated using (auth.uid() = author_id);

-- Reacciones: lectura autenticada y cada usuario solo administra la propia.
drop policy if exists "reactions_select_authenticated" on public.reactions;
create policy "reactions_select_authenticated" on public.reactions for select to authenticated using (true);
drop policy if exists "reactions_insert_own" on public.reactions;
create policy "reactions_insert_own" on public.reactions for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "reactions_delete_own" on public.reactions;
create policy "reactions_delete_own" on public.reactions for delete to authenticated using (auth.uid() = user_id);

-- Guardados: privados para cada usuario.
drop policy if exists "saved_select_own" on public.saved_posts;
create policy "saved_select_own" on public.saved_posts for select to authenticated using (auth.uid() = user_id);
drop policy if exists "saved_insert_own" on public.saved_posts;
create policy "saved_insert_own" on public.saved_posts for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "saved_delete_own" on public.saved_posts;
create policy "saved_delete_own" on public.saved_posts for delete to authenticated using (auth.uid() = user_id);

-- Notificaciones: solo el destinatario puede consultarlas y marcarlas como leídas.
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications for select to authenticated using (auth.uid() = user_id);
drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Concede acceso a las tablas al rol autenticado (RLS sigue aplicando).
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles, public.posts, public.comments, public.reactions, public.saved_posts, public.notifications to authenticated;

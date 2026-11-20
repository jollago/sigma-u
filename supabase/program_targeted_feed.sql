-- SIGMA-U: publicaciones dirigidas por programa académico.
-- Ya fue aplicada al proyecto Supabase vdrosxnfafwkuuniipgf.
alter table public.posts add column if not exists target_program text;
create index if not exists posts_target_program_created_idx
on public.posts(target_program, created_at desc);
comment on column public.posts.target_program is
'Programa académico al que se dirige la publicación. NULL significa que es para toda la comunidad.';

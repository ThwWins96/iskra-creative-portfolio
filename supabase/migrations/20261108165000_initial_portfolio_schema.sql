create extension if not exists pgcrypto;
create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, username text unique, display_name text not null default 'Творец', bio text not null default '', avatar_url text, created_at timestamptz not null default now(), constraint profiles_username_length check (username is null or char_length(username) between 3 and 24), constraint profiles_username_format check (username is null or username ~ '^[a-zA-Z0-9_]+$'));
create table public.categories (id text primary key, title text not null, icon text not null, sort_order int not null default 0);
insert into public.categories(id,title,icon,sort_order) values ('3d','3D и Blender','◈',1),('art','Рисунки','✳',2),('games','Игры','⌘',3),('photo','Фото и видео','▧',4),('code','Код и проекты','⟡',5),('other','Другое','✦',6);
create table public.works (id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade, category_id text not null references public.categories(id), title text not null, description text not null default '', image_url text, project_url text, created_at timestamptz not null default now(), constraint works_title_length check (char_length(title) between 1 and 120));
create index works_created_at_idx on public.works(created_at desc);
create index works_owner_created_idx on public.works(owner_id, created_at desc);
create index works_category_idx on public.works(category_id);
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.works enable row level security;
grant select on public.profiles, public.categories, public.works to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant insert, update, delete on public.works to authenticated;
create policy "Profiles are public" on public.profiles for select to anon, authenticated using (true);
create policy "User creates own profile" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "User edits own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "Categories are public" on public.categories for select to anon, authenticated using (true);
create policy "Works are public" on public.works for select to anon, authenticated using (true);
create policy "Users add own works" on public.works for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "Users edit own works" on public.works for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "Users delete own works" on public.works for delete to authenticated using ((select auth.uid()) = owner_id);
create or replace function public.create_profile_for_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.profiles (id, display_name) values (new.id, coalesce(nullif(new.raw_user_meta_data->>'display_name',''), 'Творец'));
 return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.create_profile_for_user();
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values ('work-media','work-media',true,52428800,array['image/jpeg','image/png','image/webp','image/gif']) on conflict (id) do nothing;
create policy "Work images are public" on storage.objects for select to anon, authenticated using (bucket_id='work-media');
create policy "Users upload own work images" on storage.objects for insert to authenticated with check (bucket_id='work-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "Users update own work images" on storage.objects for update to authenticated using (bucket_id='work-media' and (storage.foldername(name))[1]=(select auth.uid())::text) with check (bucket_id='work-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "Users delete own work images" on storage.objects for delete to authenticated using (bucket_id='work-media' and (storage.foldername(name))[1]=(select auth.uid())::text);


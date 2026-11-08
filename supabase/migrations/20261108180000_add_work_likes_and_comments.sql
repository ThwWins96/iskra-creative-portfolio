alter table public.works
  add column likes_count integer not null default 0
  constraint works_likes_count_nonnegative check (likes_count >= 0);

create table public.work_likes (
  work_id uuid not null references public.works(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (work_id, user_id)
);

create index work_likes_user_idx on public.work_likes(user_id);

create table public.work_comments (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.works(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  author_name text not null check (char_length(btrim(author_name)) between 1 and 40),
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index work_comments_work_created_idx on public.work_comments(work_id, created_at desc);

alter table public.work_likes enable row level security;
alter table public.work_comments enable row level security;

grant select, insert, delete on public.work_likes to authenticated;
grant select, insert on public.work_comments to anon, authenticated;

create policy "Users can see their own likes"
  on public.work_likes for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can like works as themselves"
  on public.work_likes for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can remove their own likes"
  on public.work_likes for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "Comments are public"
  on public.work_comments for select to anon, authenticated
  using (true);
create policy "Guests can leave comments"
  on public.work_comments for insert to anon
  with check (author_id is null);
create policy "Signed-in users can leave comments"
  on public.work_comments for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and author_name = (
      select p.display_name from public.profiles as p
      where p.id = (select auth.uid())
    )
  );

create or replace function public.adjust_work_likes_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.works set likes_count = likes_count + 1 where id = new.work_id;
    return new;
  end if;
  update public.works set likes_count = likes_count - 1 where id = old.work_id;
  return old;
end;
$$;

revoke all on function public.adjust_work_likes_count() from public, anon, authenticated;

create trigger work_like_count_after_insert
  after insert on public.work_likes
  for each row execute function public.adjust_work_likes_count();
create trigger work_like_count_after_delete
  after delete on public.work_likes
  for each row execute function public.adjust_work_likes_count();

revoke update on public.works from authenticated;
grant update (title, category_id, description, image_url, project_url)
  on public.works to authenticated;


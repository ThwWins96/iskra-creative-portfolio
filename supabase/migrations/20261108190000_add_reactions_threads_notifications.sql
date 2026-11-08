alter table public.work_likes
  add column reaction text not null default 'like'
  constraint work_likes_reaction_valid check (reaction in ('like', 'dislike'));

grant update (reaction) on public.work_likes to authenticated;

create policy "Users update their own work reaction"
  on public.work_likes for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter table public.work_comments
  add column parent_id uuid references public.work_comments(id) on delete cascade,
  add column like_count integer not null default 0 check (like_count >= 0),
  add column dislike_count integer not null default 0 check (dislike_count >= 0);

create index work_comments_parent_idx on public.work_comments(parent_id, created_at);

create table public.comment_reactions (
  comment_id uuid not null references public.work_comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null check (reaction in ('like', 'dislike')),
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create index comment_reactions_user_idx on public.comment_reactions(user_id);
alter table public.comment_reactions enable row level security;
grant select, insert, update, delete on public.comment_reactions to authenticated;

create policy "Users see their own comment reactions"
  on public.comment_reactions for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users add their own comment reactions"
  on public.comment_reactions for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users change their own comment reactions"
  on public.comment_reactions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users remove their own comment reactions"
  on public.comment_reactions for delete to authenticated
  using ((select auth.uid()) = user_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text not null,
  notification_type text not null check (notification_type in ('work_like', 'work_dislike', 'comment_reply')),
  work_id uuid references public.works(id) on delete set null,
  comment_id uuid references public.work_comments(id) on delete set null,
  work_title text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_created_idx on public.notifications(user_id, created_at desc);
alter table public.notifications enable row level security;
grant select on public.notifications to authenticated;
grant update (is_read) on public.notifications to authenticated;

create policy "Users read their own notifications"
  on public.notifications for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users mark their own notifications read"
  on public.notifications for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop trigger work_like_count_after_insert on public.work_likes;
drop trigger work_like_count_after_delete on public.work_likes;

create or replace function public.adjust_work_likes_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.reaction = 'like' then
      update public.works set likes_count = likes_count + 1 where id = new.work_id;
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    if old.reaction = 'like' then
      update public.works set likes_count = likes_count - 1 where id = old.work_id;
    end if;
    return old;
  elsif old.reaction is distinct from new.reaction then
    if old.reaction = 'like' then
      update public.works set likes_count = likes_count - 1 where id = old.work_id;
    elsif new.reaction = 'like' then
      update public.works set likes_count = likes_count + 1 where id = new.work_id;
    end if;
  end if;
  return new;
end;
$$;

create trigger work_like_count_after_insert
  after insert on public.work_likes
  for each row execute function public.adjust_work_likes_count();
create trigger work_like_count_after_delete
  after delete on public.work_likes
  for each row execute function public.adjust_work_likes_count();
create trigger work_like_count_after_update
  after update of reaction on public.work_likes
  for each row execute function public.adjust_work_likes_count();

revoke all on function public.adjust_work_likes_count() from public, anon, authenticated;

create or replace function public.adjust_comment_reaction_counts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.reaction = 'like' then
      update public.work_comments set like_count = like_count + 1 where id = new.comment_id;
    else
      update public.work_comments set dislike_count = dislike_count + 1 where id = new.comment_id;
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    if old.reaction = 'like' then
      update public.work_comments set like_count = like_count - 1 where id = old.comment_id;
    else
      update public.work_comments set dislike_count = dislike_count - 1 where id = old.comment_id;
    end if;
    return old;
  elsif old.reaction is distinct from new.reaction then
    if old.reaction = 'like' then
      update public.work_comments set like_count = like_count - 1, dislike_count = dislike_count + 1 where id = old.comment_id;
    else
      update public.work_comments set dislike_count = dislike_count - 1, like_count = like_count + 1 where id = old.comment_id;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.adjust_comment_reaction_counts() from public, anon, authenticated;

create trigger comment_reaction_count_after_insert
  after insert on public.comment_reactions
  for each row execute function public.adjust_comment_reaction_counts();
create trigger comment_reaction_count_after_delete
  after delete on public.comment_reactions
  for each row execute function public.adjust_comment_reaction_counts();
create trigger comment_reaction_count_after_update
  after update of reaction on public.comment_reactions
  for each row execute function public.adjust_comment_reaction_counts();

create or replace function public.notify_work_reaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and old.reaction is not distinct from new.reaction then
    return new;
  end if;
  insert into public.notifications (user_id, actor_id, actor_name, notification_type, work_id, work_title)
  select w.owner_id, new.user_id, p.display_name,
         case new.reaction when 'like' then 'work_like' else 'work_dislike' end,
         w.id, w.title
  from public.works as w
  join public.profiles as p on p.id = new.user_id
  where w.id = new.work_id and w.owner_id <> new.user_id;
  return new;
end;
$$;

revoke all on function public.notify_work_reaction() from public, anon, authenticated;

create trigger notify_after_work_reaction_insert
  after insert on public.work_likes
  for each row execute function public.notify_work_reaction();
create trigger notify_after_work_reaction_update
  after update of reaction on public.work_likes
  for each row execute function public.notify_work_reaction();

create or replace function public.notify_comment_reply()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient_id uuid;
  target_title text;
begin
  if new.parent_id is null or new.author_id is null then
    return new;
  end if;
  select parent.author_id, works.title
    into recipient_id, target_title
  from public.work_comments as parent
  join public.works on works.id = new.work_id
  where parent.id = new.parent_id;
  if recipient_id is not null and recipient_id <> new.author_id then
    insert into public.notifications (user_id, actor_id, actor_name, notification_type, work_id, comment_id, work_title)
    values (recipient_id, new.author_id, new.author_name, 'comment_reply', new.work_id, new.id, coalesce(target_title, 'работе'));
  end if;
  return new;
end;
$$;

revoke all on function public.notify_comment_reply() from public, anon, authenticated;

create trigger notify_after_comment_reply
  after insert on public.work_comments
  for each row execute function public.notify_comment_reply();


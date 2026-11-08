alter table public.notifications
  drop constraint if exists notifications_notification_type_check;

alter table public.notifications
  add constraint notifications_notification_type_check
  check (notification_type in ('work_like', 'work_dislike', 'comment_reply', 'work_comment'));

create or replace function public.notify_comment_reply()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid;
  parent_author_id uuid;
  target_title text;
begin
  select works.owner_id, works.title, parent.author_id
    into owner_id, target_title, parent_author_id
  from public.works
  left join public.work_comments as parent on parent.id = new.parent_id
  where works.id = new.work_id;

  if owner_id is not null and owner_id is distinct from new.author_id then
    insert into public.notifications (user_id, actor_id, actor_name, notification_type, work_id, comment_id, work_title)
    values (owner_id, new.author_id, new.author_name, 'work_comment', new.work_id, new.id, coalesce(target_title, 'work'));
  end if;

  if new.parent_id is not null
     and parent_author_id is not null
     and parent_author_id is distinct from new.author_id
     and parent_author_id is distinct from owner_id then
    insert into public.notifications (user_id, actor_id, actor_name, notification_type, work_id, comment_id, work_title)
    values (parent_author_id, new.author_id, new.author_name, 'comment_reply', new.work_id, new.id, coalesce(target_title, 'work'));
  end if;

  return new;
end;
$$;

revoke all on function public.notify_comment_reply() from public, anon, authenticated;


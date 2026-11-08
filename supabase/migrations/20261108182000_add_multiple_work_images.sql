create table public.work_images (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.works(id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  unique (work_id, sort_order)
);

create index work_images_work_sort_idx on public.work_images(work_id, sort_order);

alter table public.work_images enable row level security;

grant select on public.work_images to anon, authenticated;
grant insert, delete on public.work_images to authenticated;

create policy "Work images are public"
  on public.work_images for select to anon, authenticated
  using (true);

create policy "Owners attach images to their works"
  on public.work_images for insert to authenticated
  with check (
    exists (
      select 1 from public.works as w
      where w.id = work_id and w.owner_id = (select auth.uid())
    )
  );

create policy "Owners remove images from their works"
  on public.work_images for delete to authenticated
  using (
    exists (
      select 1 from public.works as w
      where w.id = work_id and w.owner_id = (select auth.uid())
    )
  );


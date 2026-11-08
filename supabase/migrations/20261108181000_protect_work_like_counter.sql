revoke insert on public.works from authenticated;
grant insert (owner_id, title, category_id, description, image_url, project_url)
  on public.works to authenticated;


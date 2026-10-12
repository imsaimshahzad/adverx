-- Store public homepage content separately from numeric financial admin_settings.
create table if not exists public.homepage_settings (
  key text primary key,
  label text not null,
  category text not null,
  description text,
  text_value text not null,
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now()
);

alter table public.homepage_settings enable row level security;

drop policy if exists "Homepage settings are publicly readable" on public.homepage_settings;
create policy "Homepage settings are publicly readable"
  on public.homepage_settings
  for select
  to anon, authenticated
  using (key = 'homepage_hero');

drop policy if exists "Admins can insert homepage settings" on public.homepage_settings;
create policy "Admins can insert homepage settings"
  on public.homepage_settings
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update homepage settings" on public.homepage_settings;
create policy "Admins can update homepage settings"
  on public.homepage_settings
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.set_homepage_settings_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;

drop trigger if exists homepage_settings_set_updated_at on public.homepage_settings;
create trigger homepage_settings_set_updated_at
  before update on public.homepage_settings
  for each row execute function public.set_homepage_settings_updated_at();

notify pgrst, 'reload schema';

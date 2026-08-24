create table public.user_registration_events (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  google_ads_conversion_recorded_at timestamptz null
);

alter table public.user_registration_events enable row level security;

create policy "Users can view their own registration marker"
on public.user_registration_events
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their own registration marker"
on public.user_registration_events
for insert
to authenticated
with check ((select auth.uid()) = user_id);

insert into public.user_registration_events (user_id)
select id
from auth.users
on conflict (user_id) do nothing;
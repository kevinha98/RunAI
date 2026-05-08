-- RunAI: per-user Strava data storage
-- Run this in Supabase → SQL Editor

create table if not exists public.user_strava (
  user_id             uuid primary key references auth.users(id) on delete cascade,
  strava_athlete_id   bigint unique,
  access_token        text not null,
  refresh_token       text not null,
  token_expires_at    bigint not null,
  athlete             jsonb,
  strava_stats        jsonb,
  recent_runs         jsonb not null default '[]'::jsonb,
  recent_activities   jsonb not null default '[]'::jsonb,
  computed            jsonb,
  last_sync           timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Row-level security: each user can only see their own row
alter table public.user_strava enable row level security;

create policy "users_own_strava_data"
  on public.user_strava for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger user_strava_updated_at
  before update on public.user_strava
  for each row execute function public.set_updated_at();

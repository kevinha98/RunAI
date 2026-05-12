-- RunAI: per-user weekly session plans
-- Stores plan sessions per week, with completion + comments per session.
-- source: 'plan' = from plan-data.ts baseline, 'llm' = AI-generated, 'manual' = user-edited

create table if not exists public.weekly_sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  week_number   int not null,
  sessions      jsonb not null default '[]'::jsonb,
  source        text not null default 'plan',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique(user_id, week_number)
);

alter table public.weekly_sessions enable row level security;

create policy "users_own_sessions"
  on public.weekly_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger weekly_sessions_updated_at
  before update on public.weekly_sessions
  for each row execute function public.set_updated_at();

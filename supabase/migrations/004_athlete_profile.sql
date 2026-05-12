-- RunAI: athlete profile — LLM-generated + user-editable narrative
-- Two columns: llm_content (always AI-generated), user_content (nullable user override).
-- Active content = user_content ?? llm_content.

create table if not exists public.athlete_profile (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  llm_content   text not null default '',
  user_content  text,              -- null = use llm_content
  generated_at  timestamptz,       -- when llm_content was last refreshed
  updated_at    timestamptz not null default now()
);

alter table public.athlete_profile enable row level security;

create policy "users_own_profile"
  on public.athlete_profile for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger athlete_profile_updated_at
  before update on public.athlete_profile
  for each row execute function public.set_updated_at();

-- RunAI: coach memory + persistent conversation
-- coach_memory: individual facts extracted from conversations (like ChatGPT memory)
-- coach_conversation: last N messages so the chat resumes across sessions

-- ─── coach_memory ─────────────────────────────────────────────────────────────

create table if not exists public.coach_memory (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  memory      text not null,
  category    text not null default 'generell', -- helse | mål | preferanse | observasjon | generell
  source      text not null default 'auto',     -- auto (LLM extracted) | manual (user added)
  created_at  timestamptz not null default now()
);

create index if not exists coach_memory_user_created
  on public.coach_memory(user_id, created_at desc);

alter table public.coach_memory enable row level security;

create policy "users_own_coach_memory"
  on public.coach_memory for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── coach_conversation ───────────────────────────────────────────────────────

create table if not exists public.coach_conversation (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  messages    jsonb not null default '[]',
  updated_at  timestamptz not null default now()
);

alter table public.coach_conversation enable row level security;

create policy "users_own_coach_conversation"
  on public.coach_conversation for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger coach_conversation_updated_at
  before update on public.coach_conversation
  for each row execute function public.set_updated_at();

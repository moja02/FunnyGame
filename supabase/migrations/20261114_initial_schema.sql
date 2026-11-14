-- ==============================================================================
-- FunnyGame Database Schema & Row-Level Security (RLS)
-- Multi-tier Brain Arcade Platform with Anti-Cheat, Leagues & Daily Challenges
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. Profiles Table
-- ------------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  nickname text not null default 'بطل التحدي',
  avatar text not null default '⚡',
  city text default null,
  mind_score integer not null default 0 check (mind_score >= 0 and mind_score <= 1000),
  current_streak integer not null default 0 check (current_streak >= 0),
  last_daily_date date default null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Profiles RLS
alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can update their own personal profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create profile on signup trigger
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nickname, avatar)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nickname', 'بطل التحدي'),
    coalesce(new.raw_user_meta_data->>'avatar', '⚡')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 2. Game Runs Table (Verified via Route Handlers Only)
-- ------------------------------------------------------------------------------
create table if not exists public.game_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  game_id text not null,
  mode text not null check (mode in ('practice', 'free', 'daily')),
  seed bigint not null,
  score integer not null default 0 check (score >= 0),
  stage_reached integer not null default 1 check (stage_reached >= 1),
  answers_json jsonb not null default '[]'::jsonb,
  is_suspicious boolean not null default false,
  validated boolean not null default true,
  started_at timestamptz not null default now(),
  submitted_at timestamptz not null default now()
);

alter table public.game_runs enable row level security;

create policy "Game runs are viewable by owner and for leaderboards"
  on public.game_runs for select
  using (true);

-- Disallow public inserts directly from client (Only service_role can insert)
create policy "Only service_role can insert verified runs"
  on public.game_runs for insert
  with check (auth.role() = 'service_role');

-- ------------------------------------------------------------------------------
-- 3. Daily Challenges & Submissions Table
-- ------------------------------------------------------------------------------
create table if not exists public.daily_challenges (
  challenge_date date primary key,
  game_id text not null,
  seed bigint not null,
  created_at timestamptz not null default now()
);

alter table public.daily_challenges enable row level security;

create policy "Daily challenge config is viewable by all"
  on public.daily_challenges for select
  using (true);

create table if not exists public.daily_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  challenge_date date references public.daily_challenges(challenge_date) on delete cascade not null,
  run_id uuid references public.game_runs(id) on delete cascade not null,
  score integer not null check (score >= 0),
  duration_ms integer not null check (duration_ms > 0),
  created_at timestamptz not null default now(),
  -- Exactly 1 official daily submission allowed per player per day
  unique(user_id, challenge_date)
);

alter table public.daily_submissions enable row level security;

create policy "Daily submissions viewable for daily leaderboards"
  on public.daily_submissions for select
  using (true);

create policy "Only service_role can record daily submissions"
  on public.daily_submissions for insert
  with check (auth.role() = 'service_role');

-- ------------------------------------------------------------------------------
-- 4. Weekly Leagues Table (30-Player Cohorts)
-- ------------------------------------------------------------------------------
create table if not exists public.weekly_leagues (
  id uuid primary key default gen_random_uuid(),
  week_id text not null, -- Format: YYYY-Www
  tier text not null check (tier in ('bronze', 'silver', 'gold', 'diamond')),
  group_id integer not null default 1,
  user_id uuid references public.profiles(id) on delete cascade not null,
  total_score integer not null default 0,
  rank integer default null,
  unique(week_id, user_id)
);

alter table public.weekly_leagues enable row level security;

create policy "League standings viewable by all players in cohort"
  on public.weekly_leagues for select
  using (true);

create policy "Only service_role can manage leagues"
  on public.weekly_leagues for all
  using (auth.role() = 'service_role');

-- ------------------------------------------------------------------------------
-- 5. Leaderboard Views
-- ------------------------------------------------------------------------------

-- Global Game High Scores
create or replace view public.view_leaderboard_global as
select
  gr.game_id,
  p.id as user_id,
  p.nickname,
  p.avatar,
  p.city,
  max(gr.score) as best_score,
  max(gr.stage_reached) as highest_stage
from public.game_runs gr
join public.profiles p on gr.user_id = p.id
where gr.validated = true and gr.mode != 'practice'
group by gr.game_id, p.id, p.nickname, p.avatar, p.city;

-- Daily Standings View
create or replace view public.view_daily_leaderboard as
select
  ds.challenge_date,
  p.id as user_id,
  p.nickname,
  p.avatar,
  p.city,
  ds.score,
  ds.duration_ms,
  dense_rank() over (partition by ds.challenge_date order by ds.score desc, ds.duration_ms asc) as rank
from public.daily_submissions ds
join public.profiles p on ds.user_id = p.id;

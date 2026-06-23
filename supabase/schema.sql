-- Supabase SQL Editor 또는 CLI에서 실행하세요.

create table if not exists public.players (
  id uuid primary key,
  nickname text not null default '플레이어',
  stats jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.game_records (
  id bigint generated always as identity primary key,
  player_id uuid not null references public.players(id) on delete cascade,
  game_id text not null,
  event_type text not null default 'play',
  value numeric,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists game_records_player_id_idx on public.game_records (player_id);
create index if not exists game_records_game_id_idx on public.game_records (game_id);
create index if not exists game_records_created_at_idx on public.game_records (created_at desc);

alter table public.players enable row level security;
alter table public.game_records enable row level security;

-- 서버(service role)만 접근. 클라이언트는 Vercel API 경유.
create policy "players_service_only" on public.players
  for all using (false) with check (false);

create policy "game_records_service_only" on public.game_records
  for all using (false) with check (false);

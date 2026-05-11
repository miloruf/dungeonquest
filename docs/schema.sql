-- DungeonQuest Database Schema
-- Paste this into: Supabase Dashboard → SQL Editor → New query → Run

create table if not exists rooms (
  id uuid default gen_random_uuid() primary key,
  room_code text unique not null,
  players jsonb default '[]'::jsonb not null,
  status text default 'waiting' not null check (status in ('waiting', 'playing', 'finished')),
  current_turn text default '' not null,
  difficulty text default 'medium' not null check (difficulty in ('easy', 'medium', 'hard')),
  current_scene text default 'start' not null,
  story_history jsonb default '[]'::jsonb not null,
  last_event jsonb,
  dice_result integer,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Auto-update updated_at on every change
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger rooms_updated_at
  before update on rooms
  for each row execute function update_updated_at();

-- Row Level Security
alter table rooms enable row level security;

create policy "Anyone can read rooms"   on rooms for select using (true);
create policy "Anyone can create rooms" on rooms for insert with check (true);
create policy "Anyone can update rooms" on rooms for update using (true);

-- Clean up old finished rooms (optional, keeps DB tidy)
create index rooms_room_code_idx on rooms (room_code);
create index rooms_status_idx on rooms (status);

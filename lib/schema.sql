-- ============================================================
-- SelahApp — Supabase Database Schema
-- Run this once in the Supabase SQL Editor for your project.
-- Go to: https://supabase.com → Your Project → SQL Editor → New Query
-- ============================================================

-- Songs table (users own their songs via RLS)
create table if not exists songs (
  id              bigserial primary key,
  user_id         uuid references auth.users not null,
  title           text not null,
  genre           text,
  music_key       text,
  lang            text,
  theme           text,
  scripture       text,
  lyrics          jsonb,
  chords          text[],
  emotional_mode  text,
  instrumentation text,
  vocal_gender    text,
  audio_url       text,
  tracks          jsonb,
  ai_source       text,
  is_public       boolean default true,
  created_at      timestamptz default now()
);

-- Row Level Security: users only access their own songs
-- Public songs are readable by everyone
alter table songs enable row level security;

create policy "Users can manage their own songs"
  on songs for all
  using (auth.uid() = user_id);

create policy "Public songs are readable by anyone"
  on songs for select
  using (is_public = true);

-- Likes table
create table if not exists song_likes (
  id          bigserial primary key,
  user_id     uuid references auth.users not null,
  song_id     bigint references songs on delete cascade not null,
  created_at  timestamptz default now(),
  unique(user_id, song_id)
);

alter table song_likes enable row level security;

create policy "Users manage their own likes"
  on song_likes for all
  using (auth.uid() = user_id);

create policy "Like counts are readable by anyone"
  on song_likes for select
  using (true);

-- User profiles (auto-created on sign-up via trigger)
create table if not exists profiles (
  id          uuid references auth.users primary key,
  display_name text,
  avatar_url  text,
  created_at  timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can read all profiles"
  on profiles for select using (true);

create policy "Users can update their own profile"
  on profiles for update using (auth.uid() = id);

-- Auto-create a profile row when a new user signs up
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

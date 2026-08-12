-- CSBT HUB phase-two tools migration
-- Inventory, wishlist, community trade voting, and feedback.
-- Run this once in Supabase Dashboard > SQL Editor. Safe to run again.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================
-- Saved inventory
-- =========================
create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  item_name text not null,
  image_url text,
  category text not null,
  value_type text not null default 'NORMAL' check (value_type in ('NORMAL','NEON','MEGA')),
  potion_status text not null default 'BASE' check (potion_status in ('BASE','NO_POTION','RIDE','FLY','FLY_RIDE')),
  quantity integer not null default 1 check (quantity between 1 and 999),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, item_id, value_type, potion_status)
);

create index if not exists inventory_items_user_idx on public.inventory_items (user_id, updated_at desc);
drop trigger if exists inventory_items_set_updated_at on public.inventory_items;
create trigger inventory_items_set_updated_at before update on public.inventory_items for each row execute function public.set_updated_at();
alter table public.inventory_items enable row level security;
drop policy if exists "Members manage own inventory" on public.inventory_items;
create policy "Members manage own inventory" on public.inventory_items for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.inventory_items to authenticated;

-- =========================
-- Wishlist
-- =========================
create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  item_name text not null,
  image_url text,
  category text not null,
  created_at timestamptz not null default now(),
  unique (user_id, item_id)
);

create index if not exists wishlist_items_user_idx on public.wishlist_items (user_id, created_at desc);
alter table public.wishlist_items enable row level security;
drop policy if exists "Members manage own wishlist" on public.wishlist_items;
create policy "Members manage own wishlist" on public.wishlist_items for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.wishlist_items to authenticated;

-- =========================
-- Community W/F/L trade feed
-- =========================
create table if not exists public.community_trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null default 'CSBT Member',
  value_source text not null default 'GCASH' check (value_source in ('GCASH','ELVE')),
  your_items jsonb not null default '[]'::jsonb,
  their_items jsonb not null default '[]'::jsonb,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_trades_your_items_limit check (jsonb_typeof(your_items) = 'array' and jsonb_array_length(your_items) between 1 and 18),
  constraint community_trades_their_items_limit check (jsonb_typeof(their_items) = 'array' and jsonb_array_length(their_items) between 1 and 18),
  constraint community_trades_note_length check (note is null or char_length(note) <= 300)
);

create index if not exists community_trades_created_idx on public.community_trades (created_at desc);
drop trigger if exists community_trades_set_updated_at on public.community_trades;
create trigger community_trades_set_updated_at before update on public.community_trades for each row execute function public.set_updated_at();

create or replace function public.fill_community_trade_display_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_name text;
begin
  select coalesce(nullif(trim(p.display_name), ''), 'CSBT Member')
  into resolved_name
  from public.profiles p
  where p.user_id = new.user_id;
  new.display_name := coalesce(resolved_name, 'CSBT Member');
  return new;
end;
$$;

drop trigger if exists community_trades_fill_display_name on public.community_trades;
create trigger community_trades_fill_display_name before insert on public.community_trades for each row execute function public.fill_community_trade_display_name();

alter table public.community_trades enable row level security;
drop policy if exists "Community trades are publicly readable" on public.community_trades;
create policy "Community trades are publicly readable" on public.community_trades for select to anon, authenticated using (true);
drop policy if exists "Members create own community trades" on public.community_trades;
create policy "Members create own community trades" on public.community_trades for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Members update own community trades" on public.community_trades;
create policy "Members update own community trades" on public.community_trades for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Members delete own community trades" on public.community_trades;
create policy "Members delete own community trades" on public.community_trades for delete to authenticated using ((select auth.uid()) = user_id);
grant select on public.community_trades to anon, authenticated;
grant insert, update, delete on public.community_trades to authenticated;

create table if not exists public.community_trade_votes (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references public.community_trades(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  vote text not null check (vote in ('WIN','FAIR','LOSE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trade_id, user_id)
);

create index if not exists community_trade_votes_trade_idx on public.community_trade_votes (trade_id);
drop trigger if exists community_trade_votes_set_updated_at on public.community_trade_votes;
create trigger community_trade_votes_set_updated_at before update on public.community_trade_votes for each row execute function public.set_updated_at();
alter table public.community_trade_votes enable row level security;
drop policy if exists "Community trade votes are publicly readable" on public.community_trade_votes;
create policy "Community trade votes are publicly readable" on public.community_trade_votes for select to anon, authenticated using (true);
drop policy if exists "Members manage own community trade vote" on public.community_trade_votes;
create policy "Members manage own community trade vote" on public.community_trade_votes for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select on public.community_trade_votes to anon, authenticated;
grant insert, update, delete on public.community_trade_votes to authenticated;

-- =========================
-- Feedback inbox
-- =========================
create table if not exists public.feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  category text not null check (category in ('WRONG_VALUE','MISSING_ITEM','BUG','FEATURE','OTHER')),
  item_id text,
  item_name text,
  message text not null,
  page_url text,
  status text not null default 'new' check (status in ('new','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now(),
  constraint feedback_message_length check (char_length(trim(message)) between 5 and 2000)
);

create index if not exists feedback_submissions_created_idx on public.feedback_submissions (created_at desc);
alter table public.feedback_submissions enable row level security;
drop policy if exists "Visitors can submit feedback" on public.feedback_submissions;
create policy "Visitors can submit feedback" on public.feedback_submissions for insert to anon, authenticated
with check (user_id is null or user_id = (select auth.uid()));
grant insert on public.feedback_submissions to anon, authenticated;

-- Realtime is useful for community vote counts.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'community_trades'
  ) then alter publication supabase_realtime add table public.community_trades; end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'community_trade_votes'
  ) then alter publication supabase_realtime add table public.community_trade_votes; end if;
end
$$;

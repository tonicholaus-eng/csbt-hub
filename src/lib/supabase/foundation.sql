-- CSBT HUB foundation migration
-- Run once in Supabase Dashboard > SQL Editor.
-- Safe to run more than once.

create extension if not exists pgcrypto;

-- =========================
-- Profiles
-- =========================
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'CSBT Member',
  avatar_path text,
  country_code text,
  roblox_username text,
  roblox_user_id text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- If an earlier CSBT profile table already exists, add every field this migration relies on.
alter table public.profiles add column if not exists display_name text default 'CSBT Member';
alter table public.profiles add column if not exists avatar_path text;
alter table public.profiles add column if not exists country_code text;
alter table public.profiles add column if not exists roblox_username text;
alter table public.profiles add column if not exists roblox_user_id text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists created_at timestamptz default now();
alter table public.profiles add column if not exists updated_at timestamptz default now();

alter table public.profiles alter column display_name set default 'CSBT Member';
alter table public.profiles alter column created_at set default now();
alter table public.profiles alter column updated_at set default now();

-- Normalize legacy rows before applying stricter profile constraints.
update public.profiles
set display_name = 'CSBT Member'
where display_name is null or char_length(trim(display_name)) < 2;

update public.profiles
set display_name = left(trim(display_name), 32)
where char_length(trim(display_name)) > 32;

update public.profiles set created_at = now() where created_at is null;
update public.profiles set updated_at = now() where updated_at is null;

alter table public.profiles alter column display_name set not null;
alter table public.profiles alter column created_at set not null;
alter table public.profiles alter column updated_at set not null;

alter table public.profiles drop constraint if exists profiles_display_name_length;
alter table public.profiles add constraint profiles_display_name_length
  check (char_length(trim(display_name)) between 2 and 32);

alter table public.profiles drop constraint if exists profiles_bio_length;
alter table public.profiles add constraint profiles_bio_length
  check (bio is null or char_length(bio) <= 180);

alter table public.profiles drop constraint if exists profiles_country_code_length;
alter table public.profiles add constraint profiles_country_code_length
  check (country_code is null or char_length(country_code) between 2 and 3);

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

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    case
      when char_length(trim(coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(new.email, ''), '@', 1)))) between 2 and 32
        then trim(coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(new.email, ''), '@', 1)))
      when char_length(trim(coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(new.email, ''), '@', 1)))) > 32
        then left(trim(coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(new.email, ''), '@', 1))), 32)
      else 'CSBT Member'
    end
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();

insert into public.profiles (user_id, display_name)
select
  u.id,
  case
    when char_length(trim(coalesce(nullif(u.raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(u.email, ''), '@', 1)))) between 2 and 32
      then trim(coalesce(nullif(u.raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(u.email, ''), '@', 1)))
    when char_length(trim(coalesce(nullif(u.raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(u.email, ''), '@', 1)))) > 32
      then left(trim(coalesce(nullif(u.raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(u.email, ''), '@', 1))), 32)
    else 'CSBT Member'
  end
from auth.users u
on conflict (user_id) do nothing;

alter table public.profiles enable row level security;

drop policy if exists "Profiles are publicly readable" on public.profiles;
create policy "Profiles are publicly readable"
on public.profiles for select
to anon, authenticated
using (true);

drop policy if exists "Members create own profile" on public.profiles;
create policy "Members create own profile"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Members update own profile" on public.profiles;
create policy "Members update own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;

-- =========================
-- Avatar storage
-- =========================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  1048576,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can view avatars" on storage.objects;
create policy "Anyone can view avatars"
on storage.objects for select
to public
using (bucket_id = 'avatars');

drop policy if exists "Members upload own avatar" on storage.objects;
create policy "Members upload own avatar"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Members update own avatar" on storage.objects;
create policy "Members update own avatar"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and owner_id = (select auth.uid())::text
)
with check (
  bucket_id = 'avatars'
  and owner_id = (select auth.uid())::text
);

drop policy if exists "Members delete own avatar" on storage.objects;
create policy "Members delete own avatar"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and owner_id = (select auth.uid())::text
);

-- =========================
-- Notification preferences
-- =========================
create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  value_changes boolean not null default true,
  trade_activity boolean not null default true,
  community_updates boolean not null default true,
  product_updates boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists notification_preferences_set_updated_at on public.notification_preferences;
create trigger notification_preferences_set_updated_at
before update on public.notification_preferences
for each row execute function public.set_updated_at();

alter table public.notification_preferences enable row level security;

drop policy if exists "Members read notification preferences" on public.notification_preferences;
create policy "Members read notification preferences"
on public.notification_preferences for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Members create notification preferences" on public.notification_preferences;
create policy "Members create notification preferences"
on public.notification_preferences for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Members update notification preferences" on public.notification_preferences;
create policy "Members update notification preferences"
on public.notification_preferences for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select, insert, update on public.notification_preferences to authenticated;

-- =========================
-- Notifications
-- =========================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'system',
  title text not null,
  body text not null default '',
  href text,
  dedupe_key text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications add column if not exists dedupe_key text;

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);
create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, read_at) where read_at is null;
create unique index if not exists notifications_dedupe_key_idx
  on public.notifications (dedupe_key) where dedupe_key is not null;

alter table public.notifications enable row level security;

drop policy if exists "Members read own notifications" on public.notifications;
create policy "Members read own notifications"
on public.notifications for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Members update own notifications" on public.notifications;
create policy "Members update own notifications"
on public.notifications for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Members delete own notifications" on public.notifications;
create policy "Members delete own notifications"
on public.notifications for delete
to authenticated
using ((select auth.uid()) = user_id);

grant select, update, delete on public.notifications to authenticated;

-- Intentionally no authenticated INSERT policy.
-- New notifications should be created by trusted server-side code/service role.

-- =========================
-- Value watchlist (foundation for price alerts)
-- =========================
create table if not exists public.value_watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  item_name text not null,
  source text not null default 'GCASH',
  value_type text not null default 'NORMAL',
  alert_percent numeric(7,2) not null default 10,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, item_id, source, value_type)
);

alter table public.value_watchlist enable row level security;

drop policy if exists "Members manage own value watchlist" on public.value_watchlist;
create policy "Members manage own value watchlist"
on public.value_watchlist for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.value_watchlist to authenticated;

-- =========================
-- Value history
-- =========================
create table if not exists public.value_history (
  id bigint generated by default as identity primary key,
  snapshot_date date not null,
  captured_at timestamptz not null default now(),
  item_id text not null,
  item_name text not null,
  category text not null,
  source text not null,
  value_type text not null,
  value numeric,
  unique (snapshot_date, item_id, source, value_type)
);

create index if not exists value_history_item_idx
  on public.value_history (item_id, source, value_type, snapshot_date desc);

alter table public.value_history enable row level security;

drop policy if exists "Value history is publicly readable" on public.value_history;
create policy "Value history is publicly readable"
on public.value_history for select
to anon, authenticated
using (true);

grant select on public.value_history to anon, authenticated;

-- Ingestion is service-role only. Do not expose the service-role key to the browser.

-- =========================
-- Realtime publications
-- =========================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end
$$;

-- =========================
-- Community post flood protection
-- =========================
create or replace function public.enforce_community_post_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent_count integer;
begin
  select count(*) into recent_count
  from public.community_posts
  where user_id = new.user_id
    and created_at > now() - interval '60 seconds';

  if recent_count >= 6 then
    raise exception 'Please wait before posting again.' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

do $$
begin
  if to_regclass('public.community_posts') is not null then
    execute 'drop trigger if exists community_posts_rate_limit on public.community_posts';
    execute 'create trigger community_posts_rate_limit before insert on public.community_posts for each row execute function public.enforce_community_post_rate_limit()';
  end if;
end
$$;

-- =========================
-- Welcome notification
-- =========================
create or replace function public.create_welcome_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (user_id, type, title, body, href)
  values (
    new.id,
    'welcome',
    'Welcome to CSBT HUB',
    'Your account is ready. Notifications will appear here as new trading tools are connected.',
    '/profile'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_welcome_notification on auth.users;
create trigger on_auth_user_created_welcome_notification
after insert on auth.users
for each row execute function public.create_welcome_notification();

insert into public.notifications (user_id, type, title, body, href)
select
  u.id,
  'welcome',
  'Welcome to CSBT HUB',
  'Your account is ready. Notifications will appear here as new trading tools are connected.',
  '/profile'
from auth.users u
where not exists (
  select 1 from public.notifications n
  where n.user_id = u.id and n.type = 'welcome'
);

-- =========================
-- Saved trade history / status
-- =========================
create table if not exists public.trade_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  value_source text not null check (value_source in ('GCASH','ELVE')),
  your_items jsonb not null default '[]'::jsonb,
  their_items jsonb not null default '[]'::jsonb,
  your_total numeric not null default 0,
  their_total numeric not null default 0,
  verdict text not null check (verdict in ('WIN','FAIR','LOSE','READY')),
  status text not null default 'draft' check (status in ('draft','pending','completed','cancelled')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trade_history_your_items_limit check (jsonb_typeof(your_items) = 'array' and jsonb_array_length(your_items) <= 18),
  constraint trade_history_their_items_limit check (jsonb_typeof(their_items) = 'array' and jsonb_array_length(their_items) <= 18),
  constraint trade_history_note_limit check (note is null or char_length(note) <= 300)
);

create index if not exists trade_history_user_created_idx
  on public.trade_history (user_id, created_at desc);

drop trigger if exists trade_history_set_updated_at on public.trade_history;
create trigger trade_history_set_updated_at
before update on public.trade_history
for each row execute function public.set_updated_at();

alter table public.trade_history enable row level security;

drop policy if exists "Members manage own trade history" on public.trade_history;
create policy "Members manage own trade history"
on public.trade_history for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.trade_history to authenticated;


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

-- CSBT Exchange migration
-- Evolved marketplace: listings, offers/counteroffers, smart preferences,
-- trade rooms, trust/reviews, safety, middleman requests, and market signals.
-- Run once in Supabase Dashboard > SQL Editor. Safe to run again.

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

-- Exchange notification triggers use ON CONFLICT (dedupe_key). A normal UNIQUE index
-- still allows multiple NULL values and can be inferred safely by PostgreSQL.
drop index if exists public.notifications_dedupe_key_idx;
create unique index if not exists notifications_dedupe_key_idx on public.notifications (dedupe_key);

-- =========================
-- User marketplace preferences
-- =========================
create table if not exists public.marketplace_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  value_source text not null default 'GCASH' check (value_source in ('GCASH','ELVE')),
  prefer_upgrades boolean not null default true,
  prefer_downgrades boolean not null default false,
  prefer_high_demand boolean not null default true,
  prefer_overpays boolean not null default false,
  avoid_randoms boolean not null default true,
  avoid_hard_to_trade boolean not null default false,
  accepts_pets boolean not null default true,
  accepts_petwear boolean not null default true,
  accepts_vehicles boolean not null default true,
  accepts_food boolean not null default false,
  accepts_gifts boolean not null default false,
  accepts_strollers boolean not null default false,
  accepts_toys boolean not null default false,
  accepts_stickers boolean not null default false,
  accepts_other boolean not null default false,
  min_match_score integer not null default 65 check (min_match_score between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists marketplace_preferences_set_updated_at on public.marketplace_preferences;
create trigger marketplace_preferences_set_updated_at before update on public.marketplace_preferences
for each row execute function public.set_updated_at();

alter table public.marketplace_preferences enable row level security;
drop policy if exists "Members manage own marketplace preferences" on public.marketplace_preferences;
create policy "Members manage own marketplace preferences" on public.marketplace_preferences
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.marketplace_preferences to authenticated;

-- =========================
-- Listings
-- =========================
create table if not exists public.marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null default 'CSBT Member',
  value_source text not null default 'GCASH' check (value_source in ('GCASH','ELVE')),
  intent text not null default 'OPEN_OFFERS' check (intent in ('SPECIFIC','SIMILAR_VALUE','UPGRADE','DOWNGRADE','WISHLIST','OPEN_OFFERS')),
  status text not null default 'OPEN' check (status in ('OPEN','PAUSED','MATCHED','CLOSED','EXPIRED')),
  title text,
  note text,
  preferences jsonb not null default '{}'::jsonb,
  allow_counteroffers boolean not null default true,
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketplace_listing_title_length check (title is null or char_length(title) <= 90),
  constraint marketplace_listing_note_length check (note is null or char_length(note) <= 600)
);

create index if not exists marketplace_listings_status_created_idx on public.marketplace_listings (status, created_at desc);
create index if not exists marketplace_listings_user_idx on public.marketplace_listings (user_id, created_at desc);

drop trigger if exists marketplace_listings_set_updated_at on public.marketplace_listings;
create trigger marketplace_listings_set_updated_at before update on public.marketplace_listings
for each row execute function public.set_updated_at();

create or replace function public.fill_marketplace_listing_display_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare resolved_name text;
begin
  select coalesce(nullif(trim(p.display_name), ''), 'CSBT Member')
  into resolved_name
  from public.profiles p where p.user_id = new.user_id;
  new.display_name := coalesce(resolved_name, 'CSBT Member');
  return new;
end;
$$;

drop trigger if exists marketplace_listings_fill_display_name on public.marketplace_listings;
create trigger marketplace_listings_fill_display_name before insert on public.marketplace_listings
for each row execute function public.fill_marketplace_listing_display_name();

alter table public.marketplace_listings enable row level security;
drop policy if exists "Open marketplace listings are readable" on public.marketplace_listings;
create policy "Open marketplace listings are readable" on public.marketplace_listings
for select to anon, authenticated
using (status = 'OPEN' or user_id = (select auth.uid()));
drop policy if exists "Members create own marketplace listings" on public.marketplace_listings;
create policy "Members create own marketplace listings" on public.marketplace_listings
for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Members update own marketplace listings" on public.marketplace_listings;
create policy "Members update own marketplace listings" on public.marketplace_listings
for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Members delete own marketplace listings" on public.marketplace_listings;
create policy "Members delete own marketplace listings" on public.marketplace_listings
for delete to authenticated using ((select auth.uid()) = user_id);
grant select on public.marketplace_listings to anon, authenticated;
grant insert, update, delete on public.marketplace_listings to authenticated;

create table if not exists public.marketplace_listing_items (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.marketplace_listings(id) on delete cascade,
  side text not null check (side in ('HAVE','WANT')),
  item_id text not null,
  item_name text not null,
  image_url text,
  category text not null,
  value_type text not null default 'NORMAL' check (value_type in ('NORMAL','NEON','MEGA')),
  potion_status text not null default 'BASE' check (potion_status in ('BASE','NO_POTION','RIDE','FLY','FLY_RIDE')),
  quantity integer not null default 1 check (quantity between 1 and 99),
  snapshot_value numeric,
  demand_tier text,
  created_at timestamptz not null default now()
);

create index if not exists marketplace_listing_items_listing_idx on public.marketplace_listing_items (listing_id, side);
create index if not exists marketplace_listing_items_item_idx on public.marketplace_listing_items (item_id, side);

alter table public.marketplace_listing_items enable row level security;
drop policy if exists "Visible listing items are readable" on public.marketplace_listing_items;
create policy "Visible listing items are readable" on public.marketplace_listing_items
for select to anon, authenticated using (
  exists (
    select 1 from public.marketplace_listings l
    where l.id = listing_id and (l.status = 'OPEN' or l.user_id = (select auth.uid()))
  )
);
drop policy if exists "Listing owners manage listing items" on public.marketplace_listing_items;
create policy "Listing owners manage listing items" on public.marketplace_listing_items
for all to authenticated
using (exists (select 1 from public.marketplace_listings l where l.id = listing_id and l.user_id = (select auth.uid())))
with check (exists (select 1 from public.marketplace_listings l where l.id = listing_id and l.user_id = (select auth.uid())));
grant select on public.marketplace_listing_items to anon, authenticated;
grant insert, update, delete on public.marketplace_listing_items to authenticated;

-- =========================
-- Offers + counteroffers
-- =========================
create table if not exists public.marketplace_offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.marketplace_listings(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  parent_offer_id uuid references public.marketplace_offers(id) on delete set null,
  status text not null default 'PENDING' check (status in ('PENDING','COUNTERED','ACCEPTED','DECLINED','WITHDRAWN','SUPERSEDED')),
  value_source text not null default 'GCASH' check (value_source in ('GCASH','ELVE')),
  sender_total numeric not null default 0,
  recipient_total numeric not null default 0,
  compatibility_score integer check (compatibility_score is null or compatibility_score between 0 and 100),
  explanation jsonb not null default '{}'::jsonb,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketplace_offer_note_length check (note is null or char_length(note) <= 500),
  constraint marketplace_offer_distinct_users check (sender_id <> recipient_id)
);

create index if not exists marketplace_offers_listing_idx on public.marketplace_offers (listing_id, created_at desc);
create index if not exists marketplace_offers_sender_idx on public.marketplace_offers (sender_id, created_at desc);
create index if not exists marketplace_offers_recipient_idx on public.marketplace_offers (recipient_id, created_at desc);

drop trigger if exists marketplace_offers_set_updated_at on public.marketplace_offers;
create trigger marketplace_offers_set_updated_at before update on public.marketplace_offers
for each row execute function public.set_updated_at();

alter table public.marketplace_offers enable row level security;
drop policy if exists "Offer participants can read offers" on public.marketplace_offers;
create policy "Offer participants can read offers" on public.marketplace_offers
for select to authenticated using ((select auth.uid()) in (sender_id, recipient_id));
drop policy if exists "Members can send offers to listing owners" on public.marketplace_offers;
create policy "Members can send offers to listing owners" on public.marketplace_offers
for insert to authenticated with check (
  sender_id = (select auth.uid())
  and recipient_id <> sender_id
  and exists (
    select 1 from public.marketplace_listings l
    where l.id = listing_id and l.user_id = recipient_id and l.status = 'OPEN' and l.user_id <> sender_id
  )
);
-- Direct offer updates are intentionally not granted; use the RPCs below.
grant select, insert on public.marketplace_offers to authenticated;

create table if not exists public.marketplace_offer_items (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.marketplace_offers(id) on delete cascade,
  side text not null check (side in ('SENDER','RECIPIENT')),
  item_id text not null,
  item_name text not null,
  image_url text,
  category text not null,
  value_type text not null default 'NORMAL' check (value_type in ('NORMAL','NEON','MEGA')),
  potion_status text not null default 'BASE' check (potion_status in ('BASE','NO_POTION','RIDE','FLY','FLY_RIDE')),
  quantity integer not null default 1 check (quantity between 1 and 99),
  snapshot_value numeric,
  demand_tier text,
  created_at timestamptz not null default now()
);

create index if not exists marketplace_offer_items_offer_idx on public.marketplace_offer_items (offer_id, side);
create index if not exists marketplace_offer_items_item_idx on public.marketplace_offer_items (item_id, side);

alter table public.marketplace_offer_items enable row level security;
drop policy if exists "Offer participants read offer items" on public.marketplace_offer_items;
create policy "Offer participants read offer items" on public.marketplace_offer_items
for select to authenticated using (
  exists (
    select 1 from public.marketplace_offers o where o.id = offer_id
    and (select auth.uid()) in (o.sender_id, o.recipient_id)
  )
);
drop policy if exists "Offer sender creates offer items" on public.marketplace_offer_items;
create policy "Offer sender creates offer items" on public.marketplace_offer_items
for insert to authenticated with check (
  exists (
    select 1 from public.marketplace_offers o where o.id = offer_id
    and o.sender_id = (select auth.uid()) and o.status = 'PENDING'
  )
);
grant select, insert on public.marketplace_offer_items to authenticated;

-- Offer participants can still read a listing and its items after it moves from OPEN to MATCHED.
drop policy if exists "Offer participants read matched listings" on public.marketplace_listings;
create policy "Offer participants read matched listings" on public.marketplace_listings
for select to authenticated using (
  exists (
    select 1 from public.marketplace_offers o
    where o.listing_id = id and (select auth.uid()) in (o.sender_id,o.recipient_id)
  )
);
drop policy if exists "Offer participants read matched listing items" on public.marketplace_listing_items;
create policy "Offer participants read matched listing items" on public.marketplace_listing_items
for select to authenticated using (
  exists (
    select 1 from public.marketplace_offers o
    where o.listing_id = listing_id and (select auth.uid()) in (o.sender_id,o.recipient_id)
  )
);

-- =========================
-- Trade rooms + locked transaction state
-- =========================
create table if not exists public.trade_rooms (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.marketplace_listings(id) on delete set null,
  accepted_offer_id uuid unique references public.marketplace_offers(id) on delete set null,
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  status text not null default 'OFFER_LOCKED' check (status in ('OFFER_LOCKED','CONNECTING','JOINED','COMPLETED','DISPUTED','CANCELLED')),
  lock_snapshot jsonb not null default '{}'::jsonb,
  completed_by_a boolean not null default false,
  completed_by_b boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trade_room_distinct_users check (user_a <> user_b)
);

create index if not exists trade_rooms_user_a_idx on public.trade_rooms (user_a, updated_at desc);
create index if not exists trade_rooms_user_b_idx on public.trade_rooms (user_b, updated_at desc);

drop trigger if exists trade_rooms_set_updated_at on public.trade_rooms;
create trigger trade_rooms_set_updated_at before update on public.trade_rooms
for each row execute function public.set_updated_at();

alter table public.trade_rooms enable row level security;
drop policy if exists "Trade room participants can read rooms" on public.trade_rooms;
create policy "Trade room participants can read rooms" on public.trade_rooms
for select to authenticated using ((select auth.uid()) in (user_a, user_b));
grant select on public.trade_rooms to authenticated;

create table if not exists public.trade_room_events (
  id bigint generated by default as identity primary key,
  room_id uuid not null references public.trade_rooms(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  body text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists trade_room_events_room_idx on public.trade_room_events (room_id, created_at asc);
alter table public.trade_room_events enable row level security;
drop policy if exists "Trade room participants read events" on public.trade_room_events;
create policy "Trade room participants read events" on public.trade_room_events
for select to authenticated using (
  exists (select 1 from public.trade_rooms r where r.id = room_id and (select auth.uid()) in (r.user_a,r.user_b))
);
grant select on public.trade_room_events to authenticated;

create table if not exists public.trade_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.trade_rooms(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  message_type text not null default 'QUICK' check (message_type in ('QUICK','TEXT','SYSTEM')),
  body text not null,
  created_at timestamptz not null default now(),
  constraint trade_message_length check (char_length(trim(body)) between 1 and 500),
  constraint trade_message_no_urls check (body !~* '(https?://|www[.]|discord[.]gg|bit[.]ly|tinyurl[.])')
);
create index if not exists trade_messages_room_idx on public.trade_messages (room_id, created_at asc);
alter table public.trade_messages enable row level security;
drop policy if exists "Trade room participants read messages" on public.trade_messages;
create policy "Trade room participants read messages" on public.trade_messages
for select to authenticated using (
  exists (select 1 from public.trade_rooms r where r.id = room_id and (select auth.uid()) in (r.user_a,r.user_b))
);
drop policy if exists "Trade room participants send messages" on public.trade_messages;
create policy "Trade room participants send messages" on public.trade_messages
for insert to authenticated with check (
  sender_id = (select auth.uid())
  and exists (select 1 from public.trade_rooms r where r.id = room_id and (select auth.uid()) in (r.user_a,r.user_b) and r.status not in ('CANCELLED'))
  and message_type in ('QUICK','TEXT')
);
grant select, insert on public.trade_messages to authenticated;

-- =========================
-- Trust, reviews, reports, blocks
-- =========================
create table if not exists public.trade_reviews (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.trade_rooms(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  reviewee_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  communication integer check (communication is null or communication between 1 and 5),
  safety integer check (safety is null or safety between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (room_id, reviewer_id),
  constraint trade_review_not_self check (reviewer_id <> reviewee_id),
  constraint trade_review_comment_length check (comment is null or char_length(comment) <= 500)
);
create index if not exists trade_reviews_reviewee_idx on public.trade_reviews (reviewee_id, created_at desc);
alter table public.trade_reviews enable row level security;
drop policy if exists "Trade reviews are publicly readable" on public.trade_reviews;
create policy "Trade reviews are publicly readable" on public.trade_reviews for select to anon, authenticated using (true);
drop policy if exists "Completed trade participants create reviews" on public.trade_reviews;
create policy "Completed trade participants create reviews" on public.trade_reviews
for insert to authenticated with check (
  reviewer_id = (select auth.uid())
  and exists (
    select 1 from public.trade_rooms r
    where r.id = room_id and r.status = 'COMPLETED'
      and reviewer_id in (r.user_a,r.user_b)
      and reviewee_id in (r.user_a,r.user_b)
      and reviewer_id <> reviewee_id
  )
);
grant select on public.trade_reviews to anon, authenticated;
grant insert on public.trade_reviews to authenticated;

create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_block_not_self check (blocker_id <> blocked_id)
);
alter table public.user_blocks enable row level security;
drop policy if exists "Members manage own blocks" on public.user_blocks;
create policy "Members manage own blocks" on public.user_blocks
for all to authenticated using (blocker_id = (select auth.uid())) with check (blocker_id = (select auth.uid()));
grant select, insert, delete on public.user_blocks to authenticated;

create table if not exists public.marketplace_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid references auth.users(id) on delete set null,
  listing_id uuid references public.marketplace_listings(id) on delete set null,
  room_id uuid references public.trade_rooms(id) on delete set null,
  category text not null check (category in ('SCAM_RISK','HARASSMENT','SPAM','FAKE_LISTING','OFF_PLATFORM_LINK','SWITCH_ATTEMPT','OTHER')),
  details text not null,
  status text not null default 'NEW' check (status in ('NEW','REVIEWING','UPHELD','DISMISSED')),
  created_at timestamptz not null default now(),
  constraint marketplace_report_length check (char_length(trim(details)) between 5 and 1500)
);
create index if not exists marketplace_reports_reporter_idx on public.marketplace_reports (reporter_id, created_at desc);
alter table public.marketplace_reports enable row level security;
drop policy if exists "Members create reports" on public.marketplace_reports;
create policy "Members create reports" on public.marketplace_reports for insert to authenticated
with check (reporter_id = (select auth.uid()));
drop policy if exists "Members read own reports" on public.marketplace_reports;
create policy "Members read own reports" on public.marketplace_reports for select to authenticated
using (reporter_id = (select auth.uid()));
grant insert, select on public.marketplace_reports to authenticated;

-- =========================
-- Exchange moderation staff
-- Admin-managed roster. Members cannot grant themselves moderation access.
-- =========================
create table if not exists public.exchange_staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null default 'MODERATOR' check (role in ('MODERATOR','ADMIN')),
  approved_at timestamptz not null default now()
);
alter table public.exchange_staff enable row level security;
drop policy if exists "Exchange staff can read own role" on public.exchange_staff;
create policy "Exchange staff can read own role" on public.exchange_staff
for select to authenticated using (user_id=(select auth.uid()));
grant select on public.exchange_staff to authenticated;

-- Approved Exchange staff can inspect reported Trade Rooms read-only during moderation.
drop policy if exists "Exchange staff can read trade rooms" on public.trade_rooms;
create policy "Exchange staff can read trade rooms" on public.trade_rooms
for select to authenticated using (exists (select 1 from public.exchange_staff s where s.user_id=(select auth.uid())));
drop policy if exists "Exchange staff can read room events" on public.trade_room_events;
create policy "Exchange staff can read room events" on public.trade_room_events
for select to authenticated using (exists (select 1 from public.exchange_staff s where s.user_id=(select auth.uid())));
drop policy if exists "Exchange staff can read room messages" on public.trade_messages;
create policy "Exchange staff can read room messages" on public.trade_messages
for select to authenticated using (exists (select 1 from public.exchange_staff s where s.user_id=(select auth.uid())));

alter table public.marketplace_reports add column if not exists reviewed_by uuid references auth.users(id) on delete set null;
alter table public.marketplace_reports add column if not exists reviewed_at timestamptz;
alter table public.marketplace_reports add column if not exists resolution_note text;

drop policy if exists "Exchange staff read all reports" on public.marketplace_reports;
create policy "Exchange staff read all reports" on public.marketplace_reports
for select to authenticated using (
  exists (select 1 from public.exchange_staff s where s.user_id=(select auth.uid()))
);

create or replace function public.marketplace_moderate_report(p_report_id uuid, p_status text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  report_row public.marketplace_reports%rowtype;
  normalized text := upper(coalesce(p_status,''));
begin
  if not exists (select 1 from public.exchange_staff s where s.user_id=auth.uid()) then raise exception 'Exchange staff access required'; end if;
  if normalized not in ('REVIEWING','UPHELD','DISMISSED') then raise exception 'Invalid moderation status'; end if;
  select * into report_row from public.marketplace_reports where id=p_report_id for update;
  if report_row.id is null then raise exception 'Report not found'; end if;

  update public.marketplace_reports
  set status=normalized, reviewed_by=auth.uid(), reviewed_at=now(), resolution_note=nullif(left(trim(coalesce(p_note,'')),500),'')
  where id=p_report_id;

  if normalized='UPHELD' and report_row.listing_id is not null then
    update public.marketplace_listings set status='CLOSED'
    where id=report_row.listing_id and status='OPEN';
  end if;

  insert into public.notifications (user_id,type,title,body,href,dedupe_key)
  values (report_row.reporter_id,'marketplace_report_update','Exchange report reviewed',
          case when normalized='UPHELD' then 'CSBT staff upheld your Exchange report.' when normalized='DISMISSED' then 'CSBT staff reviewed and dismissed your Exchange report.' else 'CSBT staff is reviewing your Exchange report.' end,
          '/exchange','exchange-report-'||p_report_id::text||'-'||normalized||'-reporter')
  on conflict (dedupe_key) do nothing;

  if normalized='UPHELD' and report_row.target_user_id is not null then
    insert into public.notifications (user_id,type,title,body,href,dedupe_key)
    values (report_row.target_user_id,'marketplace_safety_action','Exchange safety action',
            'CSBT staff upheld a safety report involving your Exchange activity. Review the Safe Trader rules before continuing.',
            '/seminar','exchange-report-'||p_report_id::text||'-upheld-target')
    on conflict (dedupe_key) do nothing;
  end if;
end;
$$;
grant execute on function public.marketplace_moderate_report(uuid,text,text) to authenticated;

-- =========================
-- Middleman roster + requests
-- Staff roster is intentionally admin-managed in Supabase; regular users cannot self-approve.
-- =========================
create table if not exists public.middleman_roster (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  status text not null default 'OFFLINE' check (status in ('ONLINE','BUSY','OFFLINE')),
  completed_cases integer not null default 0,
  approved_at timestamptz not null default now()
);
alter table public.middleman_roster enable row level security;
drop policy if exists "Approved middlemen are publicly readable" on public.middleman_roster;
create policy "Approved middlemen are publicly readable" on public.middleman_roster for select to anon, authenticated using (true);
grant select on public.middleman_roster to anon, authenticated;

create table if not exists public.middleman_requests (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null unique references public.trade_rooms(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  assigned_middleman uuid references auth.users(id) on delete set null,
  status text not null default 'PENDING' check (status in ('PENDING','ASSIGNED','IN_PROGRESS','COMPLETED','CANCELLED')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint middleman_request_note_length check (note is null or char_length(note) <= 500)
);
drop trigger if exists middleman_requests_set_updated_at on public.middleman_requests;
create trigger middleman_requests_set_updated_at before update on public.middleman_requests
for each row execute function public.set_updated_at();
alter table public.middleman_requests enable row level security;
drop policy if exists "Room participants and assigned middleman read requests" on public.middleman_requests;
create policy "Room participants and assigned middleman read requests" on public.middleman_requests
for select to authenticated using (
  assigned_middleman = (select auth.uid())
  or exists (select 1 from public.trade_rooms r where r.id = room_id and (select auth.uid()) in (r.user_a,r.user_b))
);
drop policy if exists "Room participants request middleman" on public.middleman_requests;
create policy "Room participants request middleman" on public.middleman_requests
for insert to authenticated with check (
  requested_by = (select auth.uid())
  and exists (select 1 from public.trade_rooms r where r.id = room_id and (select auth.uid()) in (r.user_a,r.user_b))
);
grant select on public.middleman_requests to authenticated;

-- Approved middlemen need a safe way to discover pending cases and read only rooms assigned to them.
drop policy if exists "Approved middlemen read available requests" on public.middleman_requests;
create policy "Approved middlemen read available requests" on public.middleman_requests
for select to authenticated using (
  exists (select 1 from public.middleman_roster mr where mr.user_id = (select auth.uid()))
  and (status = 'PENDING' or assigned_middleman = (select auth.uid()))
);

create or replace function public.marketplace_is_assigned_middleman(p_room_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.middleman_requests mr
    where mr.room_id = p_room_id
      and mr.assigned_middleman = p_user_id
      and mr.status in ('ASSIGNED','IN_PROGRESS','COMPLETED')
  );
$$;
grant execute on function public.marketplace_is_assigned_middleman(uuid,uuid) to authenticated;

drop policy if exists "Assigned middlemen can read rooms" on public.trade_rooms;
create policy "Assigned middlemen can read rooms" on public.trade_rooms
for select to authenticated using (public.marketplace_is_assigned_middleman(id,(select auth.uid())));

drop policy if exists "Assigned middlemen read room events" on public.trade_room_events;
create policy "Assigned middlemen read room events" on public.trade_room_events
for select to authenticated using (public.marketplace_is_assigned_middleman(room_id,(select auth.uid())));

drop policy if exists "Assigned middlemen read messages" on public.trade_messages;
create policy "Assigned middlemen read messages" on public.trade_messages
for select to authenticated using (public.marketplace_is_assigned_middleman(room_id,(select auth.uid())));

drop policy if exists "Assigned middlemen send messages" on public.trade_messages;
create policy "Assigned middlemen send messages" on public.trade_messages
for insert to authenticated with check (
  sender_id = (select auth.uid())
  and public.marketplace_is_assigned_middleman(room_id,(select auth.uid()))
  and message_type in ('QUICK','TEXT')
);

-- =========================
-- Market event stream (server/triggers only)
-- =========================
create table if not exists public.marketplace_events (
  id bigint generated by default as identity primary key,
  event_type text not null,
  listing_id uuid references public.marketplace_listings(id) on delete set null,
  offer_id uuid references public.marketplace_offers(id) on delete set null,
  room_id uuid references public.trade_rooms(id) on delete set null,
  item_id text,
  value_source text,
  value numeric,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists marketplace_events_item_idx on public.marketplace_events (item_id, created_at desc);
create index if not exists marketplace_events_type_idx on public.marketplace_events (event_type, created_at desc);
alter table public.marketplace_events enable row level security;
drop policy if exists "Market signals are publicly readable" on public.marketplace_events;
create policy "Market signals are publicly readable" on public.marketplace_events for select to anon, authenticated using (true);
grant select on public.marketplace_events to anon, authenticated;

-- Server-only telemetry rate buckets prevent public event spam from becoming fake market intelligence.
create table if not exists public.marketplace_event_rate_limits (
  fingerprint text not null,
  bucket timestamptz not null,
  event_type text not null,
  event_count integer not null default 1,
  primary key (fingerprint,bucket,event_type)
);
alter table public.marketplace_event_rate_limits enable row level security;

create or replace function public.marketplace_log_client_event(
  p_fingerprint text,
  p_event_type text,
  p_listing_id uuid default null,
  p_item_id text default null,
  p_value_source text default null,
  p_value numeric default null,
  p_metadata jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_type text := upper(coalesce(p_event_type,''));
  normalized_source text := case when upper(coalesce(p_value_source,'')) in ('GCASH','ELVE') then upper(p_value_source) else null end;
  minute_bucket timestamptz := date_trunc('minute',now());
  next_count integer;
  event_limit integer;
begin
  if normalized_type not in ('LISTING_VIEW','SEARCH','MATCH_VIEW','OFFER_BUILDER_OPEN') then return false; end if;
  if char_length(coalesce(p_fingerprint,'')) < 32 then return false; end if;
  if char_length(coalesce(p_item_id,'')) > 180 or char_length(coalesce(p_metadata::text,'')) > 1200 then return false; end if;
  if normalized_type in ('LISTING_VIEW','MATCH_VIEW','OFFER_BUILDER_OPEN') and (p_listing_id is null or not exists (select 1 from public.marketplace_listings l where l.id=p_listing_id)) then return false; end if;
  event_limit := case when normalized_type='SEARCH' then 10 else 40 end;

  insert into public.marketplace_event_rate_limits (fingerprint,bucket,event_type,event_count)
  values (p_fingerprint,minute_bucket,normalized_type,1)
  on conflict (fingerprint,bucket,event_type) do update
  set event_count = public.marketplace_event_rate_limits.event_count + 1
  returning event_count into next_count;
  if next_count > event_limit then return false; end if;

  insert into public.marketplace_events (event_type,listing_id,item_id,value_source,value,metadata)
  values (normalized_type,p_listing_id,nullif(left(coalesce(p_item_id,''),180),''),normalized_source,p_value,coalesce(p_metadata,'{}'::jsonb));
  return true;
end;
$$;
revoke all on function public.marketplace_log_client_event(text,text,uuid,text,text,numeric,jsonb) from public, anon, authenticated;
grant execute on function public.marketplace_log_client_event(text,text,uuid,text,text,numeric,jsonb) to service_role;

-- =========================
-- Helper: blocked user safety
-- =========================
create or replace function public.marketplace_users_blocked(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_blocks ub
    where (ub.blocker_id = a and ub.blocked_id = b)
       or (ub.blocker_id = b and ub.blocked_id = a)
  );
$$;

-- =========================
-- Notification + event triggers
-- =========================
create or replace function public.notify_marketplace_listing_match()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  listing_owner uuid;
  listing_status text;
  matched_user uuid;
begin
  select l.user_id, l.status into listing_owner, listing_status
  from public.marketplace_listings l where l.id = new.listing_id;

  if listing_status <> 'OPEN' then return new; end if;

  if new.side = 'HAVE' then
    for matched_user in
      select distinct w.user_id
      from public.wishlist_items w
      where w.item_id = new.item_id
        and w.user_id <> listing_owner
        and not public.marketplace_users_blocked(w.user_id, listing_owner)
      limit 75
    loop
      insert into public.notifications (user_id,type,title,body,href,dedupe_key)
      values (
        matched_user,
        'marketplace_match',
        'Wishlist match found',
        new.item_name || ' was just listed on CSBT Exchange.',
        '/exchange/' || new.listing_id::text,
        'exchange-listing-' || new.listing_id::text || '-wishlist-' || matched_user::text
      ) on conflict (dedupe_key) do nothing;
    end loop;
  elsif new.side = 'WANT' then
    for matched_user in
      select distinct i.user_id
      from public.inventory_items i
      where i.item_id = new.item_id
        and i.user_id <> listing_owner
        and not public.marketplace_users_blocked(i.user_id, listing_owner)
      limit 75
    loop
      insert into public.notifications (user_id,type,title,body,href,dedupe_key)
      values (
        matched_user,
        'marketplace_opportunity',
        'Someone wants an item you own',
        'A new listing is looking for ' || new.item_name || '.',
        '/exchange/' || new.listing_id::text,
        'exchange-listing-' || new.listing_id::text || '-inventory-' || matched_user::text
      ) on conflict (dedupe_key) do nothing;
    end loop;
  end if;

  insert into public.marketplace_events (event_type, listing_id, item_id, value_source, value, metadata)
  select 'LISTING_ITEM', new.listing_id, new.item_id, l.value_source, new.snapshot_value,
         jsonb_build_object('side',new.side,'quantity',new.quantity,'value_type',new.value_type)
  from public.marketplace_listings l where l.id = new.listing_id;

  -- Demand-spike alert at meaningful 10-request milestones in the last 24 hours.
  if new.side = 'WANT' and (
    select count(*) from public.marketplace_events e
    where e.event_type = 'LISTING_ITEM'
      and e.item_id = new.item_id
      and e.metadata ->> 'side' = 'WANT'
      and e.created_at > now() - interval '24 hours'
  ) >= 10 and mod((
    select count(*) from public.marketplace_events e
    where e.event_type = 'LISTING_ITEM'
      and e.item_id = new.item_id
      and e.metadata ->> 'side' = 'WANT'
      and e.created_at > now() - interval '24 hours'
  )::integer, 10) = 0 then
    for matched_user in
      select distinct i.user_id from public.inventory_items i
      where i.item_id = new.item_id and i.user_id <> listing_owner
      limit 100
    loop
      insert into public.notifications (user_id,type,title,body,href,dedupe_key)
      values (
        matched_user,'marketplace_demand_spike','Demand spike: '||new.item_name,
        new.item_name||' is being requested more often on CSBT Exchange today.',
        '/exchange?tab=market',
        'exchange-demand-'||new.item_id||'-'||to_char(now(),'YYYYMMDDHH24')||'-'||matched_user::text
      ) on conflict (dedupe_key) do nothing;
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists marketplace_listing_item_match_notifications on public.marketplace_listing_items;
create trigger marketplace_listing_item_match_notifications after insert on public.marketplace_listing_items
for each row execute function public.notify_marketplace_listing_match();

create or replace function public.notify_marketplace_offer_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (user_id,type,title,body,href,dedupe_key)
  values (
    new.recipient_id,
    case when new.parent_offer_id is null then 'marketplace_offer' else 'marketplace_counteroffer' end,
    case when new.parent_offer_id is null then 'New Exchange offer' else 'New counteroffer' end,
    'A trader sent you an offer on CSBT Exchange.',
    '/exchange?offer=' || new.id::text,
    'exchange-offer-' || new.id::text
  ) on conflict (dedupe_key) do nothing;

  insert into public.marketplace_events (event_type, listing_id, offer_id, value_source, value, metadata)
  values ('OFFER_CREATED', new.listing_id, new.id, new.value_source, new.sender_total,
          jsonb_build_object('compatibility_score',new.compatibility_score));
  return new;
end;
$$;

drop trigger if exists marketplace_offer_created_notification on public.marketplace_offers;
create trigger marketplace_offer_created_notification after insert on public.marketplace_offers
for each row execute function public.notify_marketplace_offer_created();

-- =========================
-- Atomic creation RPCs
-- =========================
create or replace function public.marketplace_create_listing(
  p_value_source text,
  p_intent text,
  p_title text,
  p_note text,
  p_preferences jsonb,
  p_allow_counteroffers boolean,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_listing_id uuid;
  item_row jsonb;
  normalized_source text := upper(coalesce(p_value_source,'GCASH'));
  normalized_intent text := upper(coalesce(p_intent,'OPEN_OFFERS'));
  normalized_side text;
  normalized_value_type text;
  canonical_name text;
  canonical_category text;
  canonical_value numeric;
  have_count integer := 0;
begin
  if auth.uid() is null then raise exception 'Sign in to create a listing'; end if;
  if normalized_source not in ('GCASH','ELVE') then raise exception 'Invalid value source'; end if;
  if normalized_intent not in ('SPECIFIC','SIMILAR_VALUE','UPGRADE','DOWNGRADE','WISHLIST','OPEN_OFFERS') then raise exception 'Invalid listing intent'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 36 then raise exception 'Listing must contain 1 to 36 item rows'; end if;
  if coalesce(p_title,'') ~* '(https?://|www[.]|discord[.]gg|bit[.]ly|tinyurl[.])' or coalesce(p_note,'') ~* '(https?://|www[.]|discord[.]gg|bit[.]ly|tinyurl[.])' then raise exception 'External links are not allowed in Exchange listings'; end if;

  select count(*) into have_count from jsonb_array_elements(p_items) as item_entry where upper(item_entry->>'side') = 'HAVE';
  if have_count < 1 then raise exception 'Add at least one item you have'; end if;
  if normalized_intent = 'SPECIFIC' and not exists (select 1 from jsonb_array_elements(p_items) as item_entry where upper(item_entry->>'side') = 'WANT') then raise exception 'Specific listings need at least one wanted item'; end if;

  insert into public.marketplace_listings (user_id,value_source,intent,title,note,preferences,allow_counteroffers)
  values (auth.uid(),normalized_source,normalized_intent,nullif(left(trim(coalesce(p_title,'')),90),''),nullif(left(trim(coalesce(p_note,'')),600),''),coalesce(p_preferences,'{}'::jsonb),coalesce(p_allow_counteroffers,true))
  returning id into new_listing_id;

  for item_row in select value from jsonb_array_elements(p_items) as item_entry(value)
  loop
    normalized_side := upper(coalesce(item_row->>'side',''));
    normalized_value_type := upper(coalesce(item_row->>'value_type','NORMAL'));
    if normalized_side not in ('HAVE','WANT') then raise exception 'Invalid listing item side'; end if;
    if normalized_value_type not in ('NORMAL','NEON','MEGA') then raise exception 'Invalid item variant'; end if;
    if nullif(trim(coalesce(item_row->>'item_id','')),'') is null then raise exception 'Missing item ID'; end if;

    canonical_name := null;
    canonical_category := null;
    canonical_value := null;
    select vh.item_name, vh.category, vh.value
      into canonical_name, canonical_category, canonical_value
    from public.value_history vh
    where vh.item_id = item_row->>'item_id'
      and upper(vh.source) = normalized_source
      and upper(vh.value_type) = normalized_value_type
    order by vh.snapshot_date desc, vh.captured_at desc
    limit 1;

    if canonical_name is null then
      raise exception 'Item % / % is not in the current CSBT value catalog', item_row->>'item_id', normalized_value_type;
    end if;

    insert into public.marketplace_listing_items (
      listing_id,side,item_id,item_name,image_url,category,value_type,potion_status,quantity,snapshot_value,demand_tier
    ) values (
      new_listing_id,
      normalized_side,
      item_row->>'item_id',
      left(canonical_name,120),
      case
        when coalesce(item_row->>'image_url','') ~ '^/images/' then item_row->>'image_url'
        when coalesce(item_row->>'image_url','') ~ '^https://elvebredd[.]com/' then item_row->>'image_url'
        else null
      end,
      upper(coalesce(canonical_category,'OTHER')),
      normalized_value_type,
      upper(coalesce(item_row->>'potion_status','BASE')),
      greatest(1,least(99,coalesce((item_row->>'quantity')::integer,1))),
      canonical_value,
      case when upper(coalesce(item_row->>'demand_tier','')) in ('S','A','B','C','D') then upper(item_row->>'demand_tier') else null end
    );
  end loop;

  return new_listing_id;
end;
$$;
grant execute on function public.marketplace_create_listing(text,text,text,text,jsonb,boolean,jsonb) to authenticated;

create or replace function public.marketplace_create_offer(
  p_listing_id uuid,
  p_parent_offer_id uuid,
  p_value_source text,
  p_sender_total numeric,
  p_recipient_total numeric,
  p_compatibility_score integer,
  p_explanation jsonb,
  p_note text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  listing_row public.marketplace_listings%rowtype;
  parent_row public.marketplace_offers%rowtype;
  recipient uuid;
  new_offer_id uuid;
  item_row jsonb;
  sender_count integer;
  recipient_count integer;
  normalized_source text := upper(coalesce(p_value_source,'GCASH'));
  normalized_side text;
  normalized_value_type text;
  canonical_name text;
  canonical_category text;
  canonical_value numeric;
  server_sender_total numeric := 0;
  server_recipient_total numeric := 0;
  server_value_score integer := 70;
begin
  if auth.uid() is null then raise exception 'Sign in to send an offer'; end if;
  select * into listing_row from public.marketplace_listings where id = p_listing_id for update;
  if listing_row.id is null or listing_row.status <> 'OPEN' or listing_row.expires_at <= now() then raise exception 'This listing is no longer open'; end if;
  if normalized_source not in ('GCASH','ELVE') or normalized_source <> listing_row.value_source then raise exception 'Offer value source must match the listing'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 2 or jsonb_array_length(p_items) > 36 then raise exception 'Offer must contain both sides'; end if;
  if coalesce(p_note,'') ~* '(https?://|www[.]|discord[.]gg|bit[.]ly|tinyurl[.])' then raise exception 'External links are not allowed in Exchange offers'; end if;

  if p_parent_offer_id is null then
    recipient := listing_row.user_id;
  else
    if not listing_row.allow_counteroffers then raise exception 'This listing does not allow counteroffers'; end if;
    select * into parent_row from public.marketplace_offers where id = p_parent_offer_id for update;
    if parent_row.id is null or parent_row.listing_id <> p_listing_id then raise exception 'Counteroffer chain mismatch'; end if;
    if parent_row.recipient_id <> auth.uid() or parent_row.status <> 'PENDING' then raise exception 'The original offer cannot be countered'; end if;
    recipient := parent_row.sender_id;
  end if;

  if recipient = auth.uid() then raise exception 'You cannot offer to yourself'; end if;
  if public.marketplace_users_blocked(auth.uid(),recipient) then raise exception 'This trade is blocked'; end if;

  select count(*) into sender_count from jsonb_array_elements(p_items) as item_entry where upper(item_entry->>'side') = 'SENDER';
  select count(*) into recipient_count from jsonb_array_elements(p_items) as item_entry where upper(item_entry->>'side') = 'RECIPIENT';
  if sender_count < 1 or recipient_count < 1 then raise exception 'Both sides need at least one item'; end if;

  -- Totals and compatibility are intentionally initialized server-side. The client values in
  -- p_sender_total / p_recipient_total / p_compatibility_score are accepted only for backwards
  -- RPC compatibility and are never trusted for Exchange market data.
  insert into public.marketplace_offers (listing_id,sender_id,recipient_id,parent_offer_id,value_source,sender_total,recipient_total,compatibility_score,explanation,note)
  values (p_listing_id,auth.uid(),recipient,p_parent_offer_id,normalized_source,0,0,70,coalesce(p_explanation,'{}'::jsonb),nullif(left(trim(coalesce(p_note,'')),500),''))
  returning id into new_offer_id;

  for item_row in select value from jsonb_array_elements(p_items) as item_entry(value)
  loop
    normalized_side := upper(coalesce(item_row->>'side',''));
    normalized_value_type := upper(coalesce(item_row->>'value_type','NORMAL'));
    if normalized_side not in ('SENDER','RECIPIENT') then raise exception 'Invalid offer item side'; end if;
    if normalized_value_type not in ('NORMAL','NEON','MEGA') then raise exception 'Invalid item variant'; end if;
    if nullif(trim(coalesce(item_row->>'item_id','')),'') is null then raise exception 'Missing item ID'; end if;

    canonical_name := null;
    canonical_category := null;
    canonical_value := null;
    select vh.item_name, vh.category, vh.value
      into canonical_name, canonical_category, canonical_value
    from public.value_history vh
    where vh.item_id = item_row->>'item_id'
      and upper(vh.source) = normalized_source
      and upper(vh.value_type) = normalized_value_type
    order by vh.snapshot_date desc, vh.captured_at desc
    limit 1;

    if canonical_name is null then
      raise exception 'Item % / % is not in the current CSBT value catalog', item_row->>'item_id', normalized_value_type;
    end if;

    insert into public.marketplace_offer_items (offer_id,side,item_id,item_name,image_url,category,value_type,potion_status,quantity,snapshot_value,demand_tier)
    values (
      new_offer_id,
      normalized_side,
      item_row->>'item_id',
      left(canonical_name,120),
      case
        when coalesce(item_row->>'image_url','') ~ '^/images/' then item_row->>'image_url'
        when coalesce(item_row->>'image_url','') ~ '^https://elvebredd[.]com/' then item_row->>'image_url'
        else null
      end,
      upper(coalesce(canonical_category,'OTHER')),
      normalized_value_type,
      upper(coalesce(item_row->>'potion_status','BASE')),
      greatest(1,least(99,coalesce((item_row->>'quantity')::integer,1))),
      canonical_value,
      case when upper(coalesce(item_row->>'demand_tier','')) in ('S','A','B','C','D') then upper(item_row->>'demand_tier') else null end
    );
  end loop;

  select coalesce(sum(coalesce(snapshot_value,0) * quantity),0) into server_sender_total
  from public.marketplace_offer_items where offer_id = new_offer_id and side = 'SENDER';
  select coalesce(sum(coalesce(snapshot_value,0) * quantity),0) into server_recipient_total
  from public.marketplace_offer_items where offer_id = new_offer_id and side = 'RECIPIENT';

  if server_recipient_total > 0 then
    server_value_score := greatest(0,least(100,round(100 - (abs(server_sender_total-server_recipient_total) / server_recipient_total) * 100)::integer));
  end if;

  update public.marketplace_offers
  set sender_total = server_sender_total,
      recipient_total = server_recipient_total,
      compatibility_score = server_value_score,
      explanation = coalesce(p_explanation,'{}'::jsonb) || jsonb_build_object(
        'server_validated', true,
        'server_value_score', server_value_score,
        'server_sender_total', server_sender_total,
        'server_recipient_total', server_recipient_total
      )
  where id = new_offer_id;

  if p_parent_offer_id is not null then
    update public.marketplace_offers set status = 'COUNTERED' where id = p_parent_offer_id;
  end if;
  return new_offer_id;
end;
$$;
grant execute on function public.marketplace_create_offer(uuid,uuid,text,numeric,numeric,integer,jsonb,text,jsonb) to authenticated;

create or replace function public.marketplace_set_listing_status(p_listing_id uuid, p_action text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  listing_row public.marketplace_listings%rowtype;
  normalized_action text := upper(coalesce(p_action,''));
begin
  if auth.uid() is null then raise exception 'Sign in to manage a listing'; end if;
  select * into listing_row from public.marketplace_listings where id=p_listing_id for update;
  if listing_row.id is null or listing_row.user_id <> auth.uid() then raise exception 'Listing not found'; end if;

  if normalized_action = 'CLOSE' then
    if listing_row.status not in ('OPEN','PAUSED') then raise exception 'This listing can no longer be closed'; end if;
    update public.marketplace_listings set status='CLOSED' where id=p_listing_id;
  elsif normalized_action = 'PAUSE' then
    if listing_row.status <> 'OPEN' then raise exception 'Only open listings can be paused'; end if;
    update public.marketplace_listings set status='PAUSED' where id=p_listing_id;
  elsif normalized_action = 'RESUME' then
    if listing_row.status <> 'PAUSED' or listing_row.expires_at <= now() then raise exception 'This listing cannot be resumed'; end if;
    update public.marketplace_listings set status='OPEN' where id=p_listing_id;
  else
    raise exception 'Invalid listing action';
  end if;
end;
$$;
grant execute on function public.marketplace_set_listing_status(uuid,text) to authenticated;

-- Browser clients use atomic creation RPCs instead of partial multi-write creation.
revoke insert, update, delete on public.marketplace_listings from authenticated;
revoke insert, update, delete on public.marketplace_listing_items from authenticated;
revoke insert on public.marketplace_offers from authenticated;
revoke insert on public.marketplace_offer_items from authenticated;

-- =========================
-- Safe offer response RPC
-- =========================
create or replace function public.marketplace_respond_offer(p_offer_id uuid, p_action text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  offer_row public.marketplace_offers%rowtype;
  room_id uuid;
  sender_items jsonb;
  recipient_items jsonb;
begin
  select * into offer_row from public.marketplace_offers where id = p_offer_id for update;
  if offer_row.id is null then raise exception 'Offer not found'; end if;
  if offer_row.recipient_id <> auth.uid() then raise exception 'Only the recipient can respond to this offer'; end if;
  if offer_row.status <> 'PENDING' then raise exception 'This offer is no longer pending'; end if;
  if upper(p_action) not in ('ACCEPT','DECLINE') then raise exception 'Invalid action'; end if;

  if upper(p_action) = 'DECLINE' then
    update public.marketplace_offers set status = 'DECLINED' where id = p_offer_id;
    insert into public.notifications (user_id,type,title,body,href,dedupe_key)
    values (offer_row.sender_id,'marketplace_offer_declined','Offer declined','Your CSBT Exchange offer was declined.','/exchange?offer='||p_offer_id::text,'exchange-declined-'||p_offer_id::text)
    on conflict (dedupe_key) do nothing;
    return null;
  end if;

  if public.marketplace_users_blocked(offer_row.sender_id, offer_row.recipient_id) then
    raise exception 'This trade cannot continue because one participant blocked the other';
  end if;

  update public.marketplace_offers set status = 'ACCEPTED' where id = p_offer_id;
  update public.marketplace_offers set status = 'DECLINED'
    where listing_id = offer_row.listing_id and id <> p_offer_id and status = 'PENDING';
  update public.marketplace_listings set status = 'MATCHED' where id = offer_row.listing_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'item_id',oi.item_id,'item_name',oi.item_name,'image_url',oi.image_url,'category',oi.category,
    'value_type',oi.value_type,'potion_status',oi.potion_status,'quantity',oi.quantity,
    'snapshot_value',oi.snapshot_value,'demand_tier',oi.demand_tier
  ) order by oi.created_at),'[]'::jsonb)
  into sender_items from public.marketplace_offer_items oi
  where oi.offer_id = p_offer_id and oi.side = 'SENDER';

  select coalesce(jsonb_agg(jsonb_build_object(
    'item_id',oi.item_id,'item_name',oi.item_name,'image_url',oi.image_url,'category',oi.category,
    'value_type',oi.value_type,'potion_status',oi.potion_status,'quantity',oi.quantity,
    'snapshot_value',oi.snapshot_value,'demand_tier',oi.demand_tier
  ) order by oi.created_at),'[]'::jsonb)
  into recipient_items from public.marketplace_offer_items oi
  where oi.offer_id = p_offer_id and oi.side = 'RECIPIENT';

  insert into public.trade_rooms (listing_id,accepted_offer_id,user_a,user_b,status,lock_snapshot)
  values (
    offer_row.listing_id,p_offer_id,offer_row.sender_id,offer_row.recipient_id,'OFFER_LOCKED',
    jsonb_build_object(
      'value_source',offer_row.value_source,
      'sender_total',offer_row.sender_total,
      'recipient_total',offer_row.recipient_total,
      'sender_items',sender_items,
      'recipient_items',recipient_items,
      'locked_at',now()
    )
  ) returning id into room_id;

  insert into public.trade_room_events (room_id,actor_id,event_type,body)
  values (room_id,offer_row.recipient_id,'OFFER_LOCKED','Both sides accepted the offer. The agreed trade is now locked.');

  insert into public.notifications (user_id,type,title,body,href,dedupe_key)
  values (offer_row.sender_id,'marketplace_offer_accepted','Offer accepted','Your offer was accepted. A secure trade room is ready.','/exchange/rooms/'||room_id::text,'exchange-accepted-'||p_offer_id::text)
  on conflict (dedupe_key) do nothing;

  insert into public.notifications (user_id,type,title,body,href,dedupe_key)
  values (offer_row.recipient_id,'marketplace_trade_room','Trade room created','Your agreed trade is locked and ready to complete.','/exchange/rooms/'||room_id::text,'exchange-room-'||room_id::text||'-recipient')
  on conflict (dedupe_key) do nothing;

  insert into public.marketplace_events (event_type,listing_id,offer_id,room_id,value_source,value,metadata)
  values ('OFFER_ACCEPTED',offer_row.listing_id,p_offer_id,room_id,offer_row.value_source,offer_row.sender_total,
          jsonb_build_object('recipient_total',offer_row.recipient_total,'compatibility_score',offer_row.compatibility_score));

  -- Accepted-item signals are transaction-implied rather than a copy of the value list.
  -- Each item's canonical snapshot is adjusted by the accepted trade's opposite-side ratio.
  -- Over time, averaging these real accepted signals gives CSBT its own observed market layer.
  insert into public.marketplace_events (event_type,listing_id,offer_id,room_id,item_id,value_source,value,metadata)
  select
    'ACCEPTED_ITEM', offer_row.listing_id, p_offer_id, room_id, oi.item_id, offer_row.value_source,
    case
      when oi.snapshot_value is null then null
      when oi.side = 'SENDER' and offer_row.sender_total > 0
        then oi.snapshot_value * (offer_row.recipient_total / offer_row.sender_total)
      when oi.side = 'RECIPIENT' and offer_row.recipient_total > 0
        then oi.snapshot_value * (offer_row.sender_total / offer_row.recipient_total)
      else oi.snapshot_value
    end,
    jsonb_build_object(
      'quantity',oi.quantity,
      'value_type',oi.value_type,
      'side',oi.side,
      'catalog_snapshot',oi.snapshot_value,
      'sender_total',offer_row.sender_total,
      'recipient_total',offer_row.recipient_total,
      'trade_ratio',case when offer_row.recipient_total > 0 then offer_row.sender_total / offer_row.recipient_total else null end
    )
  from public.marketplace_offer_items oi
  where oi.offer_id = p_offer_id;

  return room_id;
end;
$$;
grant execute on function public.marketplace_respond_offer(uuid,text) to authenticated;

create or replace function public.marketplace_withdraw_offer(p_offer_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare offer_row public.marketplace_offers%rowtype;
begin
  select * into offer_row from public.marketplace_offers where id = p_offer_id for update;
  if offer_row.sender_id <> auth.uid() then raise exception 'Only the sender can withdraw this offer'; end if;
  if offer_row.status <> 'PENDING' then raise exception 'Only pending offers can be withdrawn'; end if;
  update public.marketplace_offers set status = 'WITHDRAWN' where id = p_offer_id;
end;
$$;
grant execute on function public.marketplace_withdraw_offer(uuid) to authenticated;

create or replace function public.marketplace_mark_parent_countered(p_parent_offer_id uuid, p_child_offer_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare parent_row public.marketplace_offers%rowtype;
declare child_row public.marketplace_offers%rowtype;
begin
  select * into parent_row from public.marketplace_offers where id = p_parent_offer_id for update;
  select * into child_row from public.marketplace_offers where id = p_child_offer_id;
  if child_row.sender_id <> auth.uid() then raise exception 'Invalid counteroffer sender'; end if;
  if child_row.parent_offer_id <> p_parent_offer_id then raise exception 'Counteroffer chain mismatch'; end if;
  if parent_row.recipient_id <> auth.uid() then raise exception 'Only the recipient can counter this offer'; end if;
  if parent_row.status <> 'PENDING' then raise exception 'The original offer is no longer pending'; end if;
  update public.marketplace_offers set status = 'COUNTERED' where id = p_parent_offer_id;
end;
$$;
grant execute on function public.marketplace_mark_parent_countered(uuid,uuid) to authenticated;

-- =========================
-- Trade room state RPCs
-- =========================
create or replace function public.marketplace_set_room_status(p_room_id uuid, p_status text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare room public.trade_rooms%rowtype;
declare normalized text := upper(p_status);
begin
  select * into room from public.trade_rooms where id = p_room_id for update;
  if room.id is null then raise exception 'Trade room not found'; end if;
  if auth.uid() not in (room.user_a,room.user_b) then raise exception 'Not a room participant'; end if;
  if normalized not in ('CONNECTING','JOINED','DISPUTED','CANCELLED') then raise exception 'Invalid room status'; end if;
  if room.status = 'COMPLETED' then raise exception 'Completed trades cannot be changed'; end if;

  update public.trade_rooms set status = normalized where id = p_room_id;
  insert into public.trade_room_events (room_id,actor_id,event_type,body)
  values (p_room_id,auth.uid(),'STATUS_'||normalized,'Trade room status changed to '||normalized||'.');
  return normalized;
end;
$$;
grant execute on function public.marketplace_set_room_status(uuid,text) to authenticated;

create or replace function public.marketplace_confirm_completion(p_room_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare room public.trade_rooms%rowtype;
declare new_status text;
begin
  select * into room from public.trade_rooms where id = p_room_id for update;
  if room.id is null then raise exception 'Trade room not found'; end if;
  if auth.uid() not in (room.user_a,room.user_b) then raise exception 'Not a room participant'; end if;
  if room.status in ('CANCELLED','DISPUTED') then raise exception 'Resolve the room before completing it'; end if;

  if auth.uid() = room.user_a then
    update public.trade_rooms set completed_by_a = true where id = p_room_id;
    room.completed_by_a := true;
  else
    update public.trade_rooms set completed_by_b = true where id = p_room_id;
    room.completed_by_b := true;
  end if;

  if room.completed_by_a and room.completed_by_b then
    update public.trade_rooms set status = 'COMPLETED' where id = p_room_id;
    new_status := 'COMPLETED';
    insert into public.trade_room_events (room_id,actor_id,event_type,body)
    values (p_room_id,auth.uid(),'TRADE_COMPLETED','Both traders confirmed the trade was completed.');
    insert into public.marketplace_events (event_type,listing_id,offer_id,room_id,metadata)
    values ('TRADE_COMPLETED',room.listing_id,room.accepted_offer_id,p_room_id,jsonb_build_object('completed_at',now()));
    insert into public.notifications (user_id,type,title,body,href,dedupe_key)
    values (room.user_a,'marketplace_trade_completed','Trade completed','Both sides confirmed this CSBT Exchange trade. You can now leave a review.','/exchange/rooms/'||p_room_id::text,'exchange-completed-'||p_room_id::text||'-a')
    on conflict (dedupe_key) do nothing;
    insert into public.notifications (user_id,type,title,body,href,dedupe_key)
    values (room.user_b,'marketplace_trade_completed','Trade completed','Both sides confirmed this CSBT Exchange trade. You can now leave a review.','/exchange/rooms/'||p_room_id::text,'exchange-completed-'||p_room_id::text||'-b')
    on conflict (dedupe_key) do nothing;
  else
    new_status := room.status;
    insert into public.trade_room_events (room_id,actor_id,event_type,body)
    values (p_room_id,auth.uid(),'COMPLETION_CONFIRMED','One trader confirmed completion. Waiting for the other trader.');
  end if;
  return new_status;
end;
$$;
grant execute on function public.marketplace_confirm_completion(uuid) to authenticated;

-- Participants request middleman support through an atomic RPC so cancelled requests can be safely reopened.
create or replace function public.marketplace_request_middleman(p_room_id uuid, p_note text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  room_row public.trade_rooms%rowtype;
  request_row public.middleman_requests%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select * into room_row from public.trade_rooms where id = p_room_id;
  if room_row.id is null then raise exception 'Trade room not found'; end if;
  if auth.uid() not in (room_row.user_a,room_row.user_b) then raise exception 'Only trade participants can request a middleman'; end if;
  if room_row.status in ('COMPLETED','CANCELLED') then raise exception 'This trade room is already closed'; end if;

  select * into request_row from public.middleman_requests where room_id = p_room_id for update;
  if request_row.id is null then
    insert into public.middleman_requests (room_id,requested_by,note)
    values (p_room_id,auth.uid(),nullif(left(trim(coalesce(p_note,'')),500),''))
    returning * into request_row;
  elsif request_row.status = 'CANCELLED' then
    update public.middleman_requests
    set requested_by = auth.uid(), assigned_middleman = null, status = 'PENDING', note = nullif(left(trim(coalesce(p_note,'')),500),'')
    where id = request_row.id
    returning * into request_row;
  elsif request_row.status = 'COMPLETED' then
    raise exception 'This room already has a completed middleman case';
  end if;

  insert into public.trade_room_events (room_id,actor_id,event_type,body)
  values (p_room_id,auth.uid(),'MIDDLEMAN_REQUESTED','A trader requested an approved CSBT middleman.')
  on conflict do nothing;
  return request_row.id;
end;
$$;
grant execute on function public.marketplace_request_middleman(uuid,text) to authenticated;

-- Middleman claim RPC: only approved roster members can claim a pending request.
create or replace function public.marketplace_claim_middleman_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  mm_status text;
  request_row public.middleman_requests%rowtype;
  room_row public.trade_rooms%rowtype;
begin
  select status into mm_status from public.middleman_roster where user_id = auth.uid();
  if mm_status is null then raise exception 'You are not an approved CSBT middleman'; end if;
  if mm_status = 'OFFLINE' then raise exception 'Set your middleman status to online first'; end if;

  select * into request_row from public.middleman_requests where id = p_request_id for update;
  if request_row.id is null or request_row.status <> 'PENDING' then raise exception 'Request is no longer available'; end if;
  select * into room_row from public.trade_rooms where id = request_row.room_id;

  update public.middleman_requests
  set assigned_middleman = auth.uid(), status = 'ASSIGNED'
  where id = p_request_id;
  update public.middleman_roster set status = 'BUSY' where user_id = auth.uid();

  insert into public.trade_room_events (room_id,actor_id,event_type,body)
  values (request_row.room_id,auth.uid(),'MIDDLEMAN_ASSIGNED','An approved CSBT middleman claimed this case.');
  insert into public.notifications (user_id,type,title,body,href,dedupe_key)
  values (room_row.user_a,'marketplace_middleman_assigned','CSBT middleman assigned','An approved CSBT middleman has claimed your trade case.','/exchange/rooms/'||request_row.room_id::text,'exchange-mm-assigned-'||p_request_id::text||'-a')
  on conflict (dedupe_key) do nothing;
  insert into public.notifications (user_id,type,title,body,href,dedupe_key)
  values (room_row.user_b,'marketplace_middleman_assigned','CSBT middleman assigned','An approved CSBT middleman has claimed your trade case.','/exchange/rooms/'||request_row.room_id::text,'exchange-mm-assigned-'||p_request_id::text||'-b')
  on conflict (dedupe_key) do nothing;
end;
$$;
grant execute on function public.marketplace_claim_middleman_request(uuid) to authenticated;

create or replace function public.marketplace_set_middleman_status(p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare normalized text := upper(p_status);
begin
  if normalized not in ('ONLINE','BUSY','OFFLINE') then raise exception 'Invalid middleman status'; end if;
  update public.middleman_roster set status = normalized where user_id = auth.uid();
  if not found then raise exception 'You are not an approved CSBT middleman'; end if;
end;
$$;
grant execute on function public.marketplace_set_middleman_status(text) to authenticated;

create or replace function public.marketplace_update_middleman_request(p_request_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_row public.middleman_requests%rowtype;
  room_row public.trade_rooms%rowtype;
  normalized text := upper(p_status);
begin
  if normalized not in ('IN_PROGRESS','COMPLETED') then raise exception 'Invalid middleman case status'; end if;
  select * into request_row from public.middleman_requests where id = p_request_id for update;
  if request_row.id is null then raise exception 'Middleman request not found'; end if;
  if request_row.assigned_middleman <> auth.uid() then raise exception 'This case is not assigned to you'; end if;
  if request_row.status in ('CANCELLED','COMPLETED') then raise exception 'This case is already closed'; end if;
  select * into room_row from public.trade_rooms where id = request_row.room_id;

  update public.middleman_requests set status = normalized where id = p_request_id;
  insert into public.trade_room_events (room_id,actor_id,event_type,body)
  values (request_row.room_id,auth.uid(),'MIDDLEMAN_'||normalized,
          case when normalized='IN_PROGRESS' then 'The assigned CSBT middleman started handling this case.' else 'The assigned CSBT middleman marked the middleman case completed.' end);

  if normalized = 'COMPLETED' then
    update public.middleman_roster set completed_cases = completed_cases + 1, status = 'ONLINE' where user_id = auth.uid();
  end if;

  insert into public.notifications (user_id,type,title,body,href,dedupe_key)
  values (room_row.user_a,'marketplace_middleman_update','Middleman case updated',
          'Your CSBT middleman case is now '||replace(normalized,'_',' ')||'.',
          '/exchange/rooms/'||request_row.room_id::text,
          'exchange-mm-status-'||p_request_id::text||'-'||normalized||'-a')
  on conflict (dedupe_key) do nothing;
  insert into public.notifications (user_id,type,title,body,href,dedupe_key)
  values (room_row.user_b,'marketplace_middleman_update','Middleman case updated',
          'Your CSBT middleman case is now '||replace(normalized,'_',' ')||'.',
          '/exchange/rooms/'||request_row.room_id::text,
          'exchange-mm-status-'||p_request_id::text||'-'||normalized||'-b')
  on conflict (dedupe_key) do nothing;
end;
$$;
grant execute on function public.marketplace_update_middleman_request(uuid,text) to authenticated;

create or replace function public.marketplace_cancel_middleman_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare request_row public.middleman_requests%rowtype;
begin
  select * into request_row from public.middleman_requests where id = p_request_id for update;
  if request_row.id is null then raise exception 'Request not found'; end if;
  if not exists (select 1 from public.trade_rooms r where r.id = request_row.room_id and auth.uid() in (r.user_a,r.user_b)) then raise exception 'Not a room participant'; end if;
  if request_row.status = 'COMPLETED' then raise exception 'Completed middleman requests cannot be cancelled'; end if;
  update public.middleman_requests set status = 'CANCELLED' where id = p_request_id;
end;
$$;
grant execute on function public.marketplace_cancel_middleman_request(uuid) to authenticated;

-- =========================
-- Public trust score view
-- =========================
drop view if exists public.marketplace_user_stats;
create view public.marketplace_user_stats
as
select
  p.user_id,
  p.display_name,
  p.avatar_path,
  p.roblox_username,
  (p.roblox_user_id is not null) as roblox_verified,
  greatest(0, floor(extract(epoch from (now() - p.created_at)) / 86400))::int as account_age_days,
  coalesce(room_stats.completed_trades,0)::int as completed_trades,
  coalesce(room_stats.total_rooms,0)::int as total_rooms,
  case when coalesce(room_stats.total_rooms,0) = 0 then null
       else round((coalesce(room_stats.completed_trades,0)::numeric / room_stats.total_rooms::numeric) * 100,1) end as completion_rate,
  coalesce(review_stats.review_count,0)::int as review_count,
  review_stats.avg_rating,
  coalesce(mm_stats.middleman_trades,0)::int as middleman_trades,
  coalesce(report_stats.upheld_reports,0)::int as upheld_reports,
  least(100, greatest(0,
    30
    + least(coalesce(room_stats.completed_trades,0),25)
    + least(floor(extract(epoch from (now() - p.created_at)) / 86400 / 30),10)
    + case when p.roblox_user_id is not null then 5 else 0 end
    + least(coalesce(mm_stats.middleman_trades,0),10)
    + least(20, greatest(0, round((coalesce(review_stats.avg_rating,1) - 1) * 5)))
    + case when coalesce(room_stats.total_rooms,0) >= 3 then round((coalesce(room_stats.completed_trades,0)::numeric / greatest(room_stats.total_rooms,1)::numeric) * 10) else 0 end
    - least(coalesce(report_stats.upheld_reports,0) * 20,40)
  ))::int as trust_score
from public.profiles p
left join (
  select user_id, count(*) as total_rooms, count(*) filter (where status='COMPLETED') as completed_trades
  from (
    select user_a as user_id, status from public.trade_rooms
    union all
    select user_b as user_id, status from public.trade_rooms
  ) q group by user_id
) room_stats on room_stats.user_id = p.user_id
left join (
  select reviewee_id as user_id, count(*) as review_count, round(avg(rating)::numeric,2) as avg_rating
  from public.trade_reviews group by reviewee_id
) review_stats on review_stats.user_id = p.user_id
left join (
  select participant as user_id, count(*) as middleman_trades
  from (
    select r.user_a as participant from public.middleman_requests mr join public.trade_rooms r on r.id=mr.room_id where mr.status='COMPLETED'
    union all
    select r.user_b as participant from public.middleman_requests mr join public.trade_rooms r on r.id=mr.room_id where mr.status='COMPLETED'
  ) mm group by participant
) mm_stats on mm_stats.user_id = p.user_id
left join (
  select target_user_id as user_id, count(*) as upheld_reports
  from public.marketplace_reports
  where status='UPHELD' and target_user_id is not null
  group by target_user_id
) report_stats on report_stats.user_id = p.user_id;

grant select on public.marketplace_user_stats to anon, authenticated;

-- =========================
-- Reputation by category (completed trade counts)
-- =========================
drop view if exists public.marketplace_user_category_stats;
create view public.marketplace_user_category_stats as
select user_id, category, count(distinct room_id)::int as completed_trades
from (
  select r.id as room_id, r.user_a as user_id, coalesce(item->>'category','OTHER') as category
  from public.trade_rooms r,
       lateral jsonb_array_elements(coalesce(r.lock_snapshot->'sender_items','[]'::jsonb)) item
  where r.status = 'COMPLETED'
  union all
  select r.id as room_id, r.user_b as user_id, coalesce(item->>'category','OTHER') as category
  from public.trade_rooms r,
       lateral jsonb_array_elements(coalesce(r.lock_snapshot->'recipient_items','[]'::jsonb)) item
  where r.status = 'COMPLETED'
) x
group by user_id, category;
grant select on public.marketplace_user_category_stats to anon, authenticated;

-- =========================
-- Realtime
-- =========================
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='marketplace_listings') then
    alter publication supabase_realtime add table public.marketplace_listings;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='marketplace_offers') then
    alter publication supabase_realtime add table public.marketplace_offers;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='trade_rooms') then
    alter publication supabase_realtime add table public.trade_rooms;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='trade_messages') then
    alter publication supabase_realtime add table public.trade_messages;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='middleman_requests') then
    alter publication supabase_realtime add table public.middleman_requests;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='marketplace_reports') then
    alter publication supabase_realtime add table public.marketplace_reports;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='marketplace_events') then
    alter publication supabase_realtime add table public.marketplace_events;
  end if;
end $$;

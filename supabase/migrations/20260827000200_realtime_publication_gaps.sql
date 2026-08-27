-- CSBT realtime publication gaps
--
-- PROBLEM (audit 09_SUPABASE_DATABASE_AUDIT DB-04 / 19 B-06)
-- The client subscribes to postgres_changes on three tables that were never
-- added to the supabase_realtime publication, so those subscriptions can never
-- fire. Verified by a multiline-aware scan of every `add table` statement across
-- all migrations: 14 tables are published, and these three are not.
--
--   trade_room_events         <- useTradeRoomData.ts:59
--   marketplace_listing_items <- useExchangeData.ts:363
--   marketplace_offer_items   <- useExchangeData.ts:369
--
-- User-visible effect: the trade-room timeline never updates live. A
-- participant sees no new status changes or middleman events until they reload.
-- The two *_items gaps are masked, because the parent listing/offer rows are
-- published and every RPC touches their updated_at - but the subscriptions still
-- cost a slot for nothing.
--
-- NON-DESTRUCTIVE: adds tables to a publication only. No data is touched.
-- Guarded and re-runnable, matching the style of the existing publication blocks.
--
-- NOTE ON REPLICA IDENTITY
-- These tables keep the default replica identity (primary key). The client only
-- reads `id` / `room_id` / `listing_id` / `offer_id` from DELETE payloads, and
-- the primary key is always present, so REPLICA IDENTITY FULL is not required.
-- RLS still applies to realtime, so a subscriber receives only rows it may read.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'trade_room_events'
  ) then
    alter publication supabase_realtime add table public.trade_room_events;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'marketplace_listing_items'
  ) then
    alter publication supabase_realtime add table public.marketplace_listing_items;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'marketplace_offer_items'
  ) then
    alter publication supabase_realtime add table public.marketplace_offer_items;
  end if;
end
$$;

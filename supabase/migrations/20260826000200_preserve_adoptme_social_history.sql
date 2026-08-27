-- CSBT multi-game compatibility backfill
-- Preserves all existing single-game community/exchange rows as Adopt Me.
-- This migration is intentionally non-destructive: no DELETE/TRUNCATE/DROP statements.

alter table if exists public.community_posts add column if not exists game_id text default 'adopt-me';
alter table if exists public.community_trades add column if not exists game_id text default 'adopt-me';
alter table if exists public.marketplace_listings add column if not exists game_id text default 'adopt-me';
alter table if exists public.marketplace_offers add column if not exists game_id text default 'adopt-me';
alter table if exists public.trade_rooms add column if not exists game_id text default 'adopt-me';
alter table if exists public.marketplace_events add column if not exists game_id text default 'adopt-me';

update public.community_posts set game_id = 'adopt-me' where game_id is null or game_id = '';
update public.community_trades set game_id = 'adopt-me' where game_id is null or game_id = '';
update public.marketplace_listings set game_id = 'adopt-me' where game_id is null or game_id = '';
update public.marketplace_offers set game_id = 'adopt-me' where game_id is null or game_id = '';
update public.trade_rooms set game_id = 'adopt-me' where game_id is null or game_id = '';
update public.marketplace_events set game_id = 'adopt-me' where game_id is null or game_id = '';

alter table if exists public.community_posts alter column game_id set default 'adopt-me';
alter table if exists public.community_trades alter column game_id set default 'adopt-me';
alter table if exists public.marketplace_listings alter column game_id set default 'adopt-me';
alter table if exists public.marketplace_offers alter column game_id set default 'adopt-me';
alter table if exists public.trade_rooms alter column game_id set default 'adopt-me';
alter table if exists public.marketplace_events alter column game_id set default 'adopt-me';

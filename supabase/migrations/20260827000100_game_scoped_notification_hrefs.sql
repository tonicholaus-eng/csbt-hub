-- CSBT multi-game notification routing
--
-- PROBLEM (audit 19 / B-11, 03_ROUTE_MAP R-04)
-- Every notification href produced server-side is hard-coded to the Adopt Me
-- route family: '/exchange', '/exchange/<listing>', '/exchange?offer=<offer>',
-- '/exchange/rooms/<room>'. Seventeen such literals are spread across seven
-- functions in 20260816000000_legacy_foundation.sql and
-- 20260826000100_multigame_social.sql.
--
-- The result is that an MM2 trader whose offer is accepted receives
-- "A secure trade room is ready" pointing at /exchange/rooms/<id> - the ADOPT ME
-- route. Acting on the notification silently drops them out of MM2 mode. That is
-- the failure CLAUDE.md lists as non-negotiable rule #5.
--
-- APPROACH
-- Rather than transcribing and redefining seven large functions - which risks
-- silently altering unrelated trade logic - this migration adds ONE trigger on
-- public.notifications that derives the correct route prefix from the game of
-- the entity the href already points at.
--
-- Benefits:
--   * a single place to reason about and to test
--   * covers any future function that emits an exchange href, automatically
--   * no existing trade/offer/room logic is touched
--
-- Adopt Me behaviour is unchanged: a row whose linked entity is 'adopt-me', or
-- whose game cannot be determined, is left exactly as-is.
--
-- NON-DESTRUCTIVE: no DELETE, DROP TABLE, TRUNCATE, or column removal.
-- Existing notification rows are not rewritten; only new inserts are scoped.
-- Re-runnable.

create or replace function public.marketplace_scope_notification_href()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  linked_game text;
  target_id uuid;
  uuid_pattern constant text := '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
begin
  -- Only Adopt-Me-shaped exchange links are candidates. Anything already scoped
  -- (e.g. '/mm2/...' or '/exchange?game=adopt-me&...') and every non-exchange
  -- href (value alerts at '/values/<id>', '/seminar', ...) is left untouched.
  if new.href is null or left(new.href, 9) <> '/exchange' then
    return new;
  end if;
  if position('game=' in new.href) > 0 then
    return new;
  end if;

  -- /exchange/rooms/<room uuid>
  if new.href ~ ('^/exchange/rooms/' || uuid_pattern) then
    target_id := (substring(new.href from ('^/exchange/rooms/(' || uuid_pattern || ')')))::uuid;
    select r.game_id into linked_game from public.trade_rooms r where r.id = target_id;

  -- /exchange?offer=<offer uuid>
  elsif new.href ~ ('^/exchange\?offer=' || uuid_pattern) then
    target_id := (substring(new.href from ('offer=(' || uuid_pattern || ')')))::uuid;
    select o.game_id into linked_game from public.marketplace_offers o where o.id = target_id;

  -- /exchange/<listing uuid>
  elsif new.href ~ ('^/exchange/' || uuid_pattern) then
    target_id := (substring(new.href from ('^/exchange/(' || uuid_pattern || ')')))::uuid;
    select l.game_id into linked_game from public.marketplace_listings l where l.id = target_id;
  end if;

  -- Only MM2 needs a prefix. Unknown or adopt-me stays on the Adopt Me routes,
  -- which is the correct default for legacy rows with no game_id.
  if linked_game = 'mm2' then
    new.href := '/mm2' || new.href;
  end if;

  return new;
end;
$$;

drop trigger if exists notifications_scope_exchange_href on public.notifications;
create trigger notifications_scope_exchange_href
before insert on public.notifications
for each row execute function public.marketplace_scope_notification_href();

-- The demand-spike notification in 20260826000100_multigame_social.sql already
-- carries '?game=adopt-me', so it is skipped by the 'game=' guard above and
-- keeps working exactly as before.

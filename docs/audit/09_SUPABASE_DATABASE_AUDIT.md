# 09 — Supabase / Database Audit

Scope: 12 migrations in `supabase/migrations/` (5,027 lines) plus 6 legacy `.sql` files in `src/lib/supabase/`.
**The live database was not queried.** Every statement below is derived from migration source. Where live state could differ, that is called out.

---

## 1. Migration inventory

| File | Lines | Contents |
|---|---|---|
| `20260816000000_legacy_foundation.sql` | 2,213 | Consolidated baseline: 27 tables, 3 views, storage bucket `avatars`, ~30 functions |
| `20260816000100_community_lounge.sql` | 414 | `community_posts` (+ channels), `community_reactions`, `community_replies`, `community-images` bucket |
| `20260816000200_exchange_item_alias_hotfix.sql` | 232 | Item-alias resolution hotfix |
| `20260816000300_public_profile_privacy.sql` | 22 | `public_profiles` view; **removes** the public-read policy on `profiles` |
| `20260816000400_nich_durable_quota.sql` | 66 | `nich_usage_buckets` + `nich_consume_quota` |
| `20260816000500_community_channel_counts.sql` | 15 | `community_channel_counts()` |
| `20260816000600_feedback_rate_limit.sql` | 61 | `feedback_rate_limits` + `feedback_consume_quota` |
| `20260816000700_telemetry_retention.sql` | 32 | `marketplace_prune_short_lived_telemetry()` |
| `20260816000800_trade_room_inventory_apply.sql` | 158 | `trade_room_inventory_applies` + `marketplace_apply_completed_trade_to_inventory` |
| `20260816000900_nich_user_memory.sql` | 37 | `nich_user_memory` |
| `20260826000100_multigame_social.sql` | **1,753** | `game_catalog_items` + ~1,200-line MM2 seed, `game_id` on 6 tables, game-aware RPC overloads, 3 propagation triggers |
| `20260826000200_preserve_adoptme_social_history.sql` | 24 | Idempotent non-destructive `game_id` backfill |

### Duplicate SQL sources (VERIFIED by `diff`)
| `src/lib/supabase/…` | Relationship |
|---|---|
| `foundation.sql` (2,213) | **byte-identical** to `20260816000000_legacy_foundation.sql` |
| `community-feed.sql` (414) | **byte-identical** to `20260816000100_community_lounge.sql` |
| `exchange-item-alias-hotfix.sql` (232) | **byte-identical** to `20260816000200_…` |
| `exchange.sql` (1,545), `community-lounge.sql` (164), `phase-two.sql` (180) | Superseded pre-consolidation migrations, now folded into `foundation.sql` |

Six SQL files totalling ~4,750 lines sit inside `src/` where they are never imported. They are a second, unversioned copy of the schema — a competing source of truth for anyone reading the codebase. `supabase/README.md` also references the **old filename** `20260816_000_legacy_foundation.sql`, which no longer exists.

---

## 2. Text ERD

```
auth.users (Supabase)
  │
  ├─1:1─ profiles ─────view──▶ public_profiles (user_id, display_name, avatar_path,
  │        │                    roblox_username, roblox_verified, bio, timestamps)
  │        └────view──▶ marketplace_user_stats (trust_score, completed_trades,
  │                      completion_rate, review_count, avg_rating, middleman_trades,
  │                      upheld_reports, account_age_days)
  │
  ├─1:N─ notification_preferences (1:1 in practice)
  ├─1:N─ notifications ─── dedupe_key UNIQUE
  ├─1:N─ value_watchlist ──┐
  ├─1:N─ wishlist_items ───┤   item_id (text, NOT FK — points at generated JSON)
  ├─1:N─ inventory_items ──┘
  ├─1:N─ trade_history
  ├─1:N─ nich_user_memory
  ├─1:N─ user_blocks (blocker_id, blocked_id)
  ├─1:1─ exchange_staff (role)          ← admin-managed, no self-service policy
  ├─1:1─ middleman_roster (status, completed_cases)
  │
  ├─1:N─ community_trades ──1:N── community_trade_votes
  ├─1:N─ community_posts ──┬─1:N── community_reactions
  │                        └─1:N── community_replies
  │
  ├─1:N─ marketplace_preferences
  ├─1:N─ marketplace_listings ──1:N── marketplace_listing_items
  │            │  (game_id, value_source, intent, status, expires_at, preferences jsonb)
  │            ▼
  │        marketplace_offers ──1:N── marketplace_offer_items
  │            │  (sender_id, recipient_id, parent_offer_id → self, status,
  │            │   sender_total, recipient_total, compatibility_score, explanation jsonb)
  │            ▼
  │        trade_rooms (user_a, user_b, lock_snapshot jsonb, completed_by_a/b)
  │            ├─1:N── trade_messages
  │            ├─1:N── trade_room_events
  │            ├─1:N── trade_reviews
  │            ├─1:1── middleman_requests ──▶ middleman_roster
  │            └─1:N── trade_room_inventory_applies
  │
  └─1:N─ marketplace_reports (reporter_id, target_user_id, listing_id, status)

 Standalone / service-role only:
   value_history (snapshot_date, item_id, source, value_type, value)  UNIQUE(4)
   game_catalog_items (game_id, item_id) PK
   marketplace_events (game_id, event_type, listing_id, offer_id, room_id, item_id, …)
   marketplace_event_rate_limits · feedback_rate_limits · nich_usage_buckets
   feedback_submissions

 Storage buckets: avatars · community-images   (both path-scoped to auth.uid())
```

**Referential integrity:** 27 FKs to `auth.users(id) ON DELETE CASCADE`, 5 `ON DELETE SET NULL`, plus internal cascades. Account deletion cleanly removes user-owned rows while `SET NULL` preserves counterparty-visible history (e.g. `trade_rooms.listing_id`). Sound.

**Deliberate non-FK:** every `item_id` is `text` with no foreign key, because the catalog lives in generated JSON and (for MM2) in `game_catalog_items`. Integrity is enforced at write time inside the RPCs instead. Reasonable for this architecture, but it means a stale `wishlist_items.item_id` can silently point at a deleted item — handled at read time by `getItemById()` returning `undefined`.

---

## 3. RLS coverage — 34 tables, all enabled

Verified against every `create table if not exists public.*` in the migrations. **Zero tables are missing `enable row level security`.** (An early automated check appeared to flag `community_posts`; that was a false negative caused by the statement being line-wrapped at `20260816000100_community_lounge.sql:70-72`. It is enabled.)

### Policy shapes
| Pattern | Tables |
|---|---|
| Own-row only (`auth.uid() = user_id`) | `inventory_items`, `wishlist_items`, `value_watchlist`, `trade_history`, `notifications`, `notification_preferences`, `marketplace_preferences`, `user_blocks`, `nich_user_memory`, `trade_room_inventory_applies` |
| Public read + own write | `community_trades`, `community_trade_votes`, `community_posts`, `community_replies`, `community_reactions`, `trade_reviews`, `marketplace_listings` (read gated on `status='OPEN' or user_id=auth.uid()`) |
| Participant-scoped | `marketplace_offers`, `marketplace_offer_items`, `trade_rooms`, `trade_messages`, `trade_room_events`, `middleman_requests` |
| Role-scoped extra grants | `exchange_staff` (read-own-role, plus staff read on rooms/events/messages/reports), `middleman_roster` (public read; assigned-middleman read+send on rooms) |
| Public read only | `value_history`, `marketplace_events`, `game_catalog_items` |
| No policy → default deny | `feedback_rate_limits`, `marketplace_event_rate_limits`, `nich_usage_buckets` (RLS on, service-role/definer only) ✅ |
| Insert-only for anon | `feedback_submissions` — **no SELECT policy**, so feedback is write-only from the client ✅ |

`notifications` has **no INSERT policy** — every notification is written by a `SECURITY DEFINER` trigger/RPC or the service role. Correct.

### Views bypass RLS by design
`public_profiles`, `marketplace_user_stats`, `marketplace_user_category_stats` are created **without `security_invoker = on`** (`grep security_invoker` → 0 hits repo-wide). In PostgreSQL these execute with the view owner's privileges and therefore bypass the underlying `profiles` RLS.

This is **intentional and correct here** — `20260816000300` deliberately drops the public-read policy on `profiles` and replaces it with a curated projection. It will trip Supabase's "Security Definer View" linter; that is a false positive for this design. Worth documenting so nobody "fixes" it by adding `security_invoker`, which would break every trust badge on the site.

One privacy note: `public_profiles` exposes `bio` and `roblox_username` for **all** users with no opt-out column. If profile privacy is ever a product requirement, that is where it goes.

---

## 4. Server-side write path (the strongest part of the system)

18 RPCs are called from the client. The critical two:

### `marketplace_create_offer` — client totals are ignored
```
p_sender_total / p_recipient_total / p_compatibility_score  ← accepted from the client
                                                            ← and never used
…
insert into marketplace_offers (…, sender_total, recipient_total, compatibility_score)
values (…, 0, 0, 70)                                        ← placeholder

-- then, after inserting server-resolved items:
select coalesce(sum(coalesce(snapshot_value,0) * quantity),0),
       (count(*) filter (where snapshot_value is null))::integer
  into server_sender_total, missing_value_count …

update marketplace_offers
   set sender_total = server_sender_total,
       recipient_total = server_recipient_total,
       compatibility_score = server_value_score,
       explanation = … || jsonb_build_object('server_validated', true, …)
```
(`20260826000100_multigame_social.sql:1613-1748`)

Every item's `item_name`, `category`, `image_url`, `demand_tier` and `snapshot_value` is re-resolved server-side — from `value_history` for Adopt Me, from `game_catalog_items` for MM2 — and the RPC **raises** if the item is unknown. Client-supplied image URLs are whitelist-filtered to `^/images/` or `^https://elvebredd[.]com/` (`:1667-1670`). Quantities are clamped `greatest(1, least(99, …))`.

When any item lacks a value, `compatibility_score` is set to **`NULL`**, not to a guess (`:1729-1731`). This is the No-Fake-Data rule implemented at the database layer.

### Other guards worth naming
- Self-dealing blocked: `if recipient = auth.uid() then raise 'You cannot offer to yourself'`.
- Blocks honoured server-side: `marketplace_users_blocked(auth.uid(), recipient)`.
- Counteroffer chain validated: parent must belong to the same listing, be `PENDING`, and be addressed to the caller.
- External links rejected in titles/notes: `~* '(https?://|www[.]|discord[.]gg|bit[.]ly|tinyurl[.])'` — an anti-scam control at the DB layer.
- Every definer function sets `search_path = ''` and fully qualifies names — correct hardening against search-path attacks. **42/42 functions do this.**

---

## 5. Findings

### 🟠 DB-01 · `display_name` can be changed after insert (impersonation) · CONFIRMED
| Table | Fill trigger | Update policy |
|---|---|---|
| `marketplace_listings` | `fill_marketplace_listing_display_name` — **BEFORE INSERT only** (`:776`) | `for update … using (auth.uid() = user_id)` — all columns |
| `community_trades` | `fill_community_trade_display_name` — **BEFORE INSERT only** (`:595`) | same |
| `community_posts` | **no fill trigger at all** — client supplies `display_name` on insert (`CSBTLounge.tsx:599`), constrained only to 2–32 chars | same |

A signed-in user holding the (public) anon key can therefore `UPDATE` their own listing/trade and set `display_name` to any string, including another trader's. `ListingCard`, `ListingDetail` and `TradeVotingBoard` render `listing.display_name` / `trade.display_name` straight from the row rather than joining `public_profiles`.

**Impact:** social-engineering impersonation inside a trading marketplace — the highest-value attack in this product category. **Likelihood:** low-moderate (requires a crafted PostgREST call; the UI never exposes it).
**Fix:** change both triggers to `BEFORE INSERT OR UPDATE`, add one to `community_posts`, or render from `public_profiles` instead of the denormalised column.

### 🟠 DB-02 · Announcements-channel gate is INSERT-only · CONFIRMED
`can_post_lounge_channel()` restricts `#announcements` to `exchange_staff` — but it appears **only** in the INSERT policy (`20260816000100_community_lounge.sql:382-390`). The UPDATE policy is plain `auth.uid() = user_id` (`:98-112`).

A non-staff member can insert a post into `#general` and then `UPDATE community_posts SET channel_slug = 'announcements'` on their own row. The client-side check at `CSBTLounge.tsx:582` is UI-only.
**Fix:** add `and public.can_post_lounge_channel(channel_slug)` to the UPDATE `WITH CHECK`.

### 🟠 DB-03 · A listing's `game_id` can be flipped after creation · CONFIRMED
`marketplace_listings` UPDATE grants all columns to the owner. `game_id` is guarded only by
`check (game_id in ('adopt-me','mm2'))` and the paired
`check ((game_id='adopt-me' and value_source in ('GCASH','ELVE')) or (game_id='mm2' and value_source='SUPREME'))`.
Setting `game_id='mm2'` **and** `value_source='SUPREME'` in one statement satisfies both constraints and moves a listing full of Adopt Me items into MM2 scope. Its `marketplace_listing_items` rows are untouched.
Same applies to `expires_at` (a listing can be extended indefinitely past the 14-day default) and `status`.
**Fix:** restrict the UPDATE policy to the columns that should be user-editable (`title`, `note`, `preferences`, `allow_counteroffers`), and route the rest through `marketplace_set_listing_status`, which already exists.

### 🟠 DB-04 · Three subscribed tables are not in the realtime publication · CONFIRMED (repo evidence)
Exhaustive, multiline-aware scan of all 12 migrations for `add table public.*` yields 14 tables. Three tables the client subscribes to are **absent**:

| Table | Subscriber |
|---|---|
| `marketplace_listing_items` | `useExchangeData.ts:363` |
| `marketplace_offer_items` | `useExchangeData.ts:369` |
| `trade_room_events` | `useTradeRoomData.ts:59` |

**Impact:** the trade-room event timeline never updates live — a participant sees no new timeline entries until reload. For the two `*_items` tables the impact is masked, because the parent `marketplace_listings` / `marketplace_offers` rows *are* published and every RPC touches their `updated_at`.
**Caveat:** the publication could have been altered by hand in the production project. Only the live DB can confirm. As a repo-consistency defect it is confirmed.

### 🟡 DB-05 · Realtime fan-out is unfiltered on the Exchange channel
`useExchangeData.ts:360-383` subscribes to 6 tables with `event: "*"` and **no `filter:`**. Every listing change anywhere triggers a `refreshListing(id)` fetch on **every** connected client. At N concurrent users and M listing writes/min this is O(N×M) reads.
`useTradeRoomData` and `useUnreadNotifications` both use proper `filter:` clauses — the pattern is known, just not applied here.
**Fix:** `filter: "game_id=eq.<gameId>"` at minimum, or fold the payload into state instead of refetching.

### 🟡 DB-06 · `marketplace_events` is publicly readable and stores search terms
`create policy "Market signals are publicly readable" … using (true)` (`:1267`).
`marketplace_log_client_event` writes `SEARCH` events with `metadata.query` — the user's raw search text, truncated to 80 chars (`api/exchange/event/route.ts:33-35`). Anyone can read the site's full search stream.
The events are pseudonymous (a salted SHA-256 fingerprint of IP+UA is used only for rate limiting and is **not** stored on the event row), and `marketplace_prune_short_lived_telemetry()` exists — but is **never invoked** by any script, workflow, or `pg_cron` job in this repo.
**Fix:** schedule the pruner, and consider dropping `metadata.query` from public reads.

### 🟢 DB-07 · Indexing is good
33 indexes, correctly shaped for the actual access patterns: `(game_id, status, created_at desc)` for listings, `(sender_id|recipient_id, created_at desc)` for offers, `(user_a|user_b, updated_at desc)` for rooms, `(room_id, created_at asc)` for messages/events, `(item_id, source, value_type, snapshot_date desc)` for `value_history` — which exactly matches the `ORDER BY snapshot_date desc, captured_at desc LIMIT 1` in `marketplace_create_offer`.

Gaps: no index on `marketplace_reports(status)` (the Moderation Desk's main filter) and none on `middleman_requests(status)` (the Middleman Desk's). Both tables are small today.

### 🟢 DB-08 · The multi-game backfill is genuinely non-destructive
`20260826000200_preserve_adoptme_social_history.sql` contains **zero** `DELETE`/`DROP`/`TRUNCATE`, uses `add column if not exists` + `update … where game_id is null or game_id = ''`, and says so in a header comment. `20260826000100:1234-1239` adds `game_id text not null default 'adopt-me'`, which PostgreSQL 11+ backfills without a table rewrite. Legacy Adopt Me social history is preserved exactly as `CLAUDE.md` requires.

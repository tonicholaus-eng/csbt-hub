# CSBT HUB Feature Upgrade (Items 1–9)

This project now includes the requested pre-marketplace feature set.

## Supabase migration required

If you already ran `src/lib/supabase/foundation.sql` before this upgrade, run this additional file once in Supabase SQL Editor:

`src/lib/supabase/phase-two.sql`

It adds:

- `inventory_items`
- `wishlist_items`
- `community_trades`
- `community_trade_votes`
- `feedback_submissions`

The updated `foundation.sql` also contains these phase-two tables for fresh installations.

## New user routes

- `/inventory` — inventory calculator and saved inventory
- `/wishlist` — wishlist and value-alert management
- `/trade-feed` — community Win / Fair / Lose voting
- `/feedback` — wrong value, missing item, bug, feature, and other feedback
- `/values/[id]` — dedicated item detail pages

## Existing routes upgraded

- `/values` — 10 categories, rarity/demand filters, sort tools, shareable item pages
- `/profile` — profile hub, activity counts, quick links, avatar, country, Roblox username
- `/calculator` — supports direct “Add to Calculator” links from item pages

## Value history

7D / 30D / 90D charts use real Supabase `value_history` snapshots. No historical values are fabricated. Keep using:

```bash
npm run refresh:values
```

so future snapshots and alerts continue to accumulate.

## Not included

The existing marketplace/listing backend was deliberately left unchanged. Roblox OAuth, automatic Adopt Me inventory import, reputation, and verification badges remain later-phase work.

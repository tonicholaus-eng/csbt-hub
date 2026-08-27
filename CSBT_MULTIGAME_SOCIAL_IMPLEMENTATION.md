# CSBT Multi-Game Social Platform

## Canonical shared routes

- `/exchange?game=adopt-me|mm2`
- `/trade-opinions?game=adopt-me|mm2|all`
- `/lounge?game=adopt-me|mm2|all`

Legacy routes remain compatible through redirects:

- `/community` -> `/lounge`
- `/trade-feed` -> `/trade-opinions`

## Architecture

Adopt Me remains the canonical CSBT product structure. Shared systems use the game registry/adapters under `src/games/`, while each supported game supplies its own item database, value sources, variants, calculator routes, and terminology.

The shared social systems are:

- CSBT Exchange
- Trade Opinions
- CSBT Lounge

Adopt Me retains its existing inventory/wishlist Smart Match behavior. MM2 reuses the Exchange/social structure with its own MM2 catalog and Supreme values; it does not pretend to have Adopt Me-specific inventory mechanics or variants.

## Supabase migration

Apply:

`supabase/migrations/20260826000100_multigame_social.sql`

The migration introduces game-aware social/exchange records, a server-side game catalog, game-aware validation/RPC behavior, and seeds the current 1,099-item MM2 catalog.

Recommended deployment order:

1. Back up the current Supabase project.
2. Apply the migration in a staging/dev Supabase project first.
3. Verify existing Adopt Me listings, offers, trade rooms, community posts, and trade opinions still resolve as `adopt-me`.
4. Verify an MM2 Exchange listing/offer and MM2 Trade Opinion end-to-end.
5. Deploy the frontend.

## QA performed in this package

- TypeScript/TSX syntax transpile check: passed for 218 source files.
- Internal relative import resolution check: passed for 218 source files.
- Canonical route/link checks: passed.
- MM2-scoped Nich route reference check: passed; no MM2 -> `/nich` links remain.
- MM2 database validator: passed for 1,099 items.
- Adopt Me trading database validator: passed for 3,382 items / 3,382 unique IDs.
- MM2 SQL catalog seed comparison: 1,099/1,099 current MM2 items found exactly once.

A full `next build` was not executable in the QA environment because dependencies could not be installed from the npm registry (`EAI_AGAIN` DNS/registry resolution failure). The partial `node_modules` created by that failed install is intentionally excluded from this package.

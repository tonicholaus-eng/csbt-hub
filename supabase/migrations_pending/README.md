# Pending migrations — NOT APPLIED, NOT DEPLOYED

Files in this folder are **prepared but deliberately not applied**, and they are
deliberately **outside `supabase/migrations/`** so that any pipeline which
applies that folder in filename order cannot pick them up by accident.

Move a file into `supabase/migrations/` only when you have decided to ship the
feature it supports, and apply it as a normal manual Supabase action.

## `20260829000100_nich_user_memory_game_scope.sql`

Adds a game dimension to `public.nich_user_memory`.

**Why it is not needed yet.** MM2 NICH conversation state (recent weapons, the
sticky value source, the last trade, per-user MM2 aliases) currently lives only
in the browser, under an MM2-namespaced `localStorage` key
(`csbt-hub:nich-context:mm2:v1`). Nothing MM2 is written to Supabase, so the
existing table is not wrong today — it is simply Adopt Me only.

**What it would change.** The table is keyed by `user_id` alone and constrains
`preferred_value_source` to `('GCASH','ELVE')` — both Adopt Me facts. To persist
MM2 memory server-side you need one row *per user per game*, and MM2's value
sources are `('SUPREME','GCASH')`. The migration:

- adds `game_id` defaulting to `'adopt-me'`, so every existing row is correctly
  labelled without a data backfill;
- widens the primary key to `(user_id, game_id)`;
- replaces the value-source check with a **per-game** check, so an MM2 row
  cannot store `ELVE` and an Adopt Me row cannot store `SUPREME`. That is the
  database-level half of the isolation contract the application enforces in
  `src/lib/nich/game/guard.ts`.

It is non-destructive: no row is deleted, no column is dropped, and existing
Adopt Me memory keeps working unchanged whether or not it is applied.

The client would also need updating (`persistNichUserMemoryToSupabase` and
`useNichLocalData` both assume one row per user) — that work is **not** done, on
purpose, because applying schema without the code that uses it is the riskier
half of the change.

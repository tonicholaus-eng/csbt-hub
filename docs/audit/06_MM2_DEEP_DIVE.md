# 06 — MM2 Deep Dive

MM2 is a first-class *product surface* built on the shared social engine, with its own catalog, its own navbar, its own visual system, and its own (better) calculator. It is also the least mature *engineering* surface in the repo — and it is entirely uncommitted to git.

---

## 1. The MM2 dataset (VERIFIED by direct inspection of `src/data/mm2Items.json`)

| Metric | Value |
|---|---|
| Total items | **1,099** |
| With a Supreme value (`SOURCE_VALUE`) | **910** |
| Without a Supreme value | **189** — `UNTRADABLE` 171, `EVO` 16, `PET` 2 |
| With `GCASH_VALUE` | **0** |
| With `CSBT_VALUE` | **0** |
| With `DEMAND` | 910 (same set as priced items) |
| `SOURCE_VALUE === 0` | 0 — no zero-as-missing contamination ✅ |
| Categories | 14 (COMMON 220, UNTRADABLE 171, UNCOMMON 142, GODLY 126, RARE 107, SET 104, LEGENDARY 76, PET 57, CHROMA 44, EVO 16, ANCIENT 13, MISC 13, VINTAGE 9, UNIQUE 1) |
| `TYPE` | `"OTHER"` for **all 1,099** — the workbook's TYPE column is empty |
| Source | Supreme Values, fetched `2026-08-24T20:26:23Z` |

Top values look plausible (Black Luger 1,000,000; Chroma Ever Set 123,000), and the 16 unpriced `EVO` items are variant rows (`Gingerscythe (Var. 1–4)`, `Icecrusher (Variant 1–4)`, `Reaver (Variant 1–4)`) — Supreme genuinely does not price those individually.

### 🟠 Finding M-01 · The MM2 calculator offers a value source with zero data
`MM2TradeCalculator.tsx:391` renders a `<option value="GCASH">` in the value-source select, and `getItemValue()` (`:30-33`) reads `item.GCASH_VALUE` for it. **Every one of the 1,099 items has `GCASH_VALUE: null`.**

Selecting GCash therefore makes every selected weapon unpriced, `missingFor()` counts them all, and the result becomes `CHECK` — *"N selected items are missing the active value source."* It **fails safely and truthfully**, which is to its credit, but it is a dropdown option that can never produce a result.

This also contradicts the adapter: `registry.ts:151-153` declares `mm2Adapter.valueSources = [SUPREME]` only, so Exchange and Trade Opinions correctly offer Supreme alone. The calculator is the odd one out.

### 🟡 Finding M-02 · `TYPE` is a dead field and `mm2Categories.json` is an abandoned fix for it
`generate-mm2-items.js:284-290` reads a `TYPE` column and defaults to `"OTHER"`; the column is empty so `mm2Meta.typeCounts` is `{ OTHER: 1099 }`.
`src/data/mm2Categories.json` contains exactly the taxonomy that would populate it — 14 categories mapped to `Weapon` / `Set` / `Pet` / `Misc` / `Evo` / `Untradable`. It is **written by no script and read by no code** (`grep mm2Categories` → 0 hits outside the file). An abandoned experiment.

---

## 2. MM2 routes and shell

Seven live routes plus one broken legacy route — see `03_ROUTE_MAP.md` §3.

`MM2Navbar.tsx` (217 ln) is a fully independent 288 px control rail: its own inline SVG icon set, its own `activeFor()` matcher, and a two-cell `ADM | MM2` game switcher at the bottom. It shares **nothing** with `Navbar.tsx` (Adopt Me, 268 px, driven by `lib/navigation.ts`).

`app/mm2/layout.tsx` supplies metadata only and returns `children` unchanged — every MM2 page must remember to render `<MM2Navbar/>` and the `lg:pl-[288px]` offset itself. All seven do, but there is no shell enforcing it.

`.mm2-social-mode` (`globals.css:4826-4882`) is the CSS bridge that lets the *shared* Adopt-Me-styled social components render in MM2's dark/crimson palette. It is applied on `/mm2/exchange*`, `/mm2/trade-opinions`, `/mm2/lounge`. Scoped correctly — no MM2 selector leaks into Adopt Me.

---

## 3. MM2 Trade Calculator — the best calculator in the repo

`MM2TradeCalculator.tsx` (687) + `MM2TradeWorkflow.ts` (152) + `MM2TradeSummary.tsx` (259) + `MM2TradeBreakdown.tsx` (277) + `MM2TradeBalanceFinder.tsx` (299) + `MM2TradeSide.tsx` + `MM2TradeWeaponCard.tsx` + `MM2AddWeaponModal.tsx`.

| Capability | Implementation |
|---|---|
| Quantity 1–99 | `changeQuantity()` `:177-195`, clamped both ends |
| Duplicate merging | `addItem()` `:111-137` finds an existing row by `ID ?? NAME` and increments |
| URL hydration | `:212-244`, once-only via `hydratedFromUrl` ref; also supports a single-item `?add=` deep link |
| Share link | `buildTradeUrl()` + `navigator.clipboard` `:246-260` |
| Recent trades | `localStorage` key `csbt:mm2:calculator:recent`, capped at 6 |
| Balance Finder | Suggests up to 6 catalog items that would bring the lower side within 5% |
| **Truthful missing-value handling** | `missingFor()` `:49-58` counts unpriced units; `getMM2TradeResult()` returns `CHECK` — *"CSBT withholds W/F/L instead of estimating missing MM2 values"* (`MM2TradeSummary.tsx:43-52`) |

The `CHECK` state is the single best correctness decision in the whole calculator layer and is exactly what the Adopt Me calculator lacks.

**URL codec compatibility (VERIFIED):** `registry.ts:224-227` emits MM2 rows as `JSON.stringify([{key, quantity}])`; `MM2TradeWorkflow.decodeTradeRows()` (`:66-92`) parses that shape; `rowsToSelected()` resolves `key` against the catalog by id *or* name, case-insensitively. The Trade Opinions → MM2 Calculator handoff **works**.

That same JSON shape is re-implemented **three more times**: `ExchangeHub.tsx:50-64` (`decodeMM2TradeRows`), `TradeVotingBoard.tsx:54-72` (`decodeMM2Rows`), and the encoder in `registry.ts`. Four copies of one wire format.

---

## 4. What is genuinely SHARED between the two games

| System | Shared? | Mechanism |
|---|---|---|
| Exchange hub, listings, offers, trade rooms, middleman, moderation | ✅ fully | `fixedGameId` + `*BasePath` props on 9 components |
| Trade Opinions | ✅ fully | `TradeVotingBoard fixedGameId` |
| Lounge | ✅ fully | `CSBTLounge fixedGameId` + 3 base paths |
| Item picking | ✅ | `GameItemPicker(gameId)` → adapter |
| Database schema | ✅ | one set of tables + `game_id` column + CHECK constraints |
| Server-side offer validation | ✅ | one RPC pair branching on `listing_row.game_id` |
| Auth / profiles / trust score | ✅ | game-agnostic by design |
| Value sources | ⚠ partial | adapter declares them; `lib/valueSystem.ts` still hardcodes `GCASH|ELVE` |

## 5. What is DUPLICATED

| Concern | Copies | Files |
|---|---|---|
| Navbar | 2 | `Navbar.tsx`, `mm2/MM2Navbar.tsx` |
| Calculator (all of it) | 2 | `components/trade/*`, `components/mm2/MM2Trade*` |
| W/F/L threshold rule | 4 | `TradeCalculator.tsx:204`, `TradeSummary.tsx:62`, `MM2TradeSummary.tsx:58`, `MM2TradeBalanceFinder.tsx:70` |
| MM2 URL row codec | 4 | `registry.ts`, `MM2TradeWorkflow.ts`, `ExchangeHub.tsx`, `TradeVotingBoard.tsx` |
| Item-picker modal | 2 | `AddPetModal.tsx` (827), `MM2AddWeaponModal.tsx` (361) |
| MM2 image-URL prefixing | 3 | `registry.ts:26-31`, `MM2AddWeaponModal.tsx:15-20`, `mm2/values/[id]/page.tsx:19-23` |
| MM2 catalog values | 2 sources of truth | `src/data/mm2Items.json` **and** `game_catalog_items` (seeded in-migration) |

## 6. What is MM2-SPECIFIC and should stay that way

- 14-tier weapon rarity taxonomy (no Adopt Me analogue).
- Numeric `DEMAND` 0–10 vs Adopt Me's `S/A/B/C/D` tiers.
- No variants — `mm2Adapter.getVariants()` returns `["NORMAL"]` and the RPCs reject anything else (`marketplace_create_listing`: *"MM2 items do not use Adopt Me variants"*).
- No potions — the RPC force-sets `potion_status = 'BASE'` for MM2.
- The crimson/graphite visual system and `MM2HQHome.module.css`.

## 7. What is still ADOPT-ME-COUPLED (MM2 gaps)

| Gap | Evidence |
|---|---|
| No inventory / wishlist / preferences for MM2 | `useExchangeData.ts:237-239` forces empty sets when `gameId !== "adopt-me"` |
| No smart matching for MM2 | `ExchangeHub.tsx:153-156` → `basicMatches()` returns all-zero scores |
| No MM2 value history | `value_history` has no `game_id`; `/api/value-history` accepts only `GCASH|ELVE` |
| No MM2 value alerts | `value_watchlist` is Adopt-Me-shaped |
| No MM2 profile / notifications / trades routes | `MM2Navbar` has 6 links; none reach account surfaces |
| No MM2 demand feed | `/api/demand` calls amvgg.com for Adopt Me pets only; `/mm2/demand` derives everything from the local `DEMAND` field |
| No MM2 Nich | intentional — `GlobalNichAssistant.tsx:12-19` |
| All notification hrefs point to `/exchange…` | 17 literals in SQL; see `03_ROUTE_MAP.md` R-04 |
| Sitemap contains zero MM2 URLs | `app/sitemap.ts:6` |

---

## 8. Engineering quality gap (VERIFIED by running the tools)

Every one of the 7 `tsc` errors and 49 ESLint problems is in MM2 code or the two calculator files:

| File | Problem |
|---|---|
| `mm2/MM2AddWeaponModal.tsx:45` | 🔴 `TS2304: Cannot find name 'MM2SelectedTradeItem'` — used in the props type at `:45`, but `:11` imports only `MM2Item, MM2ValueSource`. Type-only, so SWC erases it at runtime; **it breaks `next build`.** |
| `app/mm2/values/page.tsx:8` | 🔴 `TS2322` — raw JSON's `SOURCE_VALUE: null` is not assignable to `number \| undefined`; also declares an unused `categories` const |
| `lib/exchange/matching.ts:111,118` | 🔴 `TS2345` — `CSBTValueSource` (incl. `"SUPREME"`) passed where `ValueSource` (`GCASH\|ELVE`) is required. Unreachable at runtime because the call site is adopt-me-gated, but it is a real type hole. |
| `mm2/values/[id]/page.tsx` | 20 × `no-explicit-any` |
| `mm2/MM2ValuesBrowser.tsx:214` | `no-explicit-any` |
| `mm2/MM2TradeCalculator.tsx:209,224` | `react-hooks/set-state-in-effect` × 2 |
| 6 MM2 components | `@next/next/no-img-element` — raw `<img>` for `supremevalues.com` images despite `next.config.ts` already whitelisting that host in `images.remotePatterns` |

---

## 9. 🔴 The largest risk in the repository

`git status` reports the entire MM2 subsystem as **untracked**:

```
?? src/app/mm2/                                   ?? src/games/
?? src/components/mm2/                            ?? src/components/games/
?? src/components/GameSwitcher.tsx                ?? src/data/mm2Items.json
?? src/data/mm2ItemsIndex.json                    ?? src/data/mm2Meta.json
?? src/data/mm2Categories.json                    ?? src/lib/supabase/multigameCompat.ts
?? supabase/migrations/20260826000100_multigame_social.sql
?? supabase/migrations/20260826000200_preserve_adoptme_social_history.sql
?? scripts/generate-mm2-items.js   ?? scripts/lib/mm2-source.js
?? scripts/refresh-mm2-master.js   ?? scripts/sync-mm2-source-to-master.js
?? scripts/update-mm2-supreme-values.js   ?? scripts/validate-mm2-data.js
?? source-data/mm2-*.{json,xlsx}   ?? public/themes/mm2/
```

A `git clean -fd`, a fresh clone, or a stash-and-switch loses **all** of MM2, the multi-game adapter layer, and both database migrations. The 26 modified tracked files (Exchange, Lounge, Voting, hooks, `globals.css`) are the *other* half of the same feature and are also uncommitted.

This is the single action worth taking before anything else in this audit.

# 07 — Multi-Game Architecture

## 1. The target shape vs the implemented shape

```
TARGET                                  IMPLEMENTED (2026-08-27)

Shared Platform Engine                  ┌── Exchange engine ──────────── ✅ shared
        ↓                               ├── Trade Opinions ───────────── ✅ shared
Game Adapter / Configuration            ├── Lounge ───────────────────── ✅ shared
        ↓                               ├── Item picking ─────────────── ✅ shared (adapter)
Adopt Me · MM2 · Future                 ├── DB schema + game_id ──────── ✅ shared
                                        ├── Offer validation RPCs ────── ✅ shared (branches on game)
                                        ├── Auth / profiles / trust ──── ✅ shared
                                        │
                                        ├── Value system ────────────── ⚠ Adopt-Me-shaped
                                        ├── Match engine ───────────── ❌ Adopt-Me-only
                                        ├── Calculator ─────────────── ❌ duplicated per game
                                        ├── Navbar / shell ─────────── ❌ duplicated per game
                                        ├── Personal tools ─────────── ❌ Adopt-Me-only
                                        ├── Value history / alerts ─── ❌ Adopt-Me-only
                                        ├── Notification hrefs ─────── ❌ hard-coded Adopt Me
                                        └── Nich ───────────────────── ❌ Adopt-Me-only (intentional)
```

---

## 2. The scoping primitives that exist (VERIFIED)

| Primitive | Where | Notes |
|---|---|---|
| `CSBTGameId = "adopt-me" \| "mm2"` | `src/games/types.ts:1` | Two-value union, hard-coded |
| `CSBTGameScope = CSBTGameId \| "all"` | `:2` | Used only by the Lounge scope picker |
| `CSBTGameAdapter` | `:17-35` | 12 members: identity, 4 hrefs, `valueSources`, `items`, `getItem`, `searchItems`, `getVariants`, `getValue`, `getDemandLabel`, `itemProfileHref` |
| `REGISTRY: Record<CSBTGameId, CSBTGameAdapter>` | `registry.ts:168-171` | Static object literal |
| `parseGameId` / `parseGameScope` | `:192-199` | Tolerates the legacy `"adopt"` alias |
| `buildCalculatorHref` | `:217-236` | **Branches on `gameId === "mm2"`** — an if/else, not an adapter method |
| `fixedGameId` prop | 4 components | The main runtime scoping mechanism |
| `routeBasePath` / `exchangeBasePath` / `tradeOpinionsBasePath` / `loungeBasePath` | 9 components | Path injection instead of a route registry |
| `game_id` column | 6 tables | `text not null default 'adopt-me'` + `check (game_id in ('adopt-me','mm2'))` |
| `game_catalog_items` | 1 table | `(game_id, item_id)` PK — the only *generic* game table |
| `isLegacyGameSchemaError()` | `lib/supabase/multigameCompat.ts` | Detects pre-migration schema and retries without `game_id` — **adopt-me only** |

---

## 3. Where the abstraction leaks

### 3.1 The value type system never became generic
`src/lib/valueSystem.ts:3` — `ValueSource = "GCASH" | "ELVE"`. There is a *parallel* `CSBTValueSource = "GCASH" | "ELVE" | "SUPREME"` in `games/types.ts:3`. The two coexist and the boundary between them is where the type errors live:

```
lib/exchange/matching.ts:111  buildOptimizedOffer(inventory, listing.value_source /* CSBTValueSource */, …)
lib/exchange/matching.ts:118  inventoryValue(row, listing.value_source)
→ TS2345: Type '"SUPREME"' is not assignable to type 'ValueSource'.
```
It is unreachable at runtime only because `ExchangeHub.tsx:154` gates the call to `adopt-me`. The type system is telling the truth about an abstraction that was never finished.

### 3.2 `buildCalculatorHref` is a branch, not an adapter method
```ts
// registry.ts:217-236
export function buildCalculatorHref(gameId, rows, source) {
  if (gameId === "mm2") { /* JSON encoding */ return `/mm2/calculator?…`; }
  /* tilde encoding */    return `/calculator?…`;
}
```
Adding a third game means editing this function. The same is true of `sourceSymbol()` (`:205-209`) and `sourceLabel()` (`:211-215`), which are `if/else` chains over the three known sources rather than reads from `adapter.valueSources`.

### 3.3 One wire format, four implementations
The MM2 `[{key, quantity}]` JSON row format is encoded in `registry.ts:225-226` and decoded independently in `MM2TradeWorkflow.ts:66-92`, `ExchangeHub.tsx:50-64`, and `TradeVotingBoard.tsx:54-72`. The Adopt Me `id~variant~qty` format lives in `lib/tradeContext.ts` and is decoded in two of the same files. There is no single codec module.

### 3.4 Routes are strings passed down props, not a registry
The adapter *has* `homeHref`, `valuesHref`, `calculatorHref`, `demandHref` — but the social routes are passed as four separate props to four separate components at five call sites. Nothing prevents `/mm2/lounge` from being handed `exchangeBasePath="/exchange"`, and nothing type-checks that a base path matches the `fixedGameId`.

### 3.5 The server does not know about routes at all
17 hard-coded `'/exchange…'` literals in the migrations produce notification hrefs (`03_ROUTE_MAP.md` R-04). The database has `game_id` on the listing/offer/room and still writes the Adopt Me path.

### 3.6 Legacy-compat is one-way
`isLegacyGameSchemaError()` retry paths in `useExchangeData.ts` are all guarded by `gameId === "adopt-me"` (lines 136, 157, 195, 211, 227, 299, 315). That is *correct* — an MM2 query against a pre-migration schema should fail loudly, not silently fall back to Adopt Me rows. Good design, worth preserving.

---

## 4. Score: **6 / 10**

| Dimension | Score | Why |
|---|---|---|
| Data model | 8/10 | `game_id` + CHECK constraints + `game_catalog_items` + non-destructive backfill is textbook |
| Server logic | 8/10 | One RPC pair serving both games with per-game validation branches |
| Social feature reuse | 9/10 | Exchange, Opinions, Lounge genuinely share one implementation |
| Adapter completeness | 5/10 | Covers items/values/hrefs; misses calculators, matching, formatting, routing |
| Route architecture | 4/10 | Prop-drilled path strings; no route registry; server unaware |
| Personal/value tooling | 2/10 | Inventory, wishlist, alerts, value history, Nich all Adopt-Me-only |
| Type safety across games | 4/10 | Two competing `ValueSource` unions produce real compile errors |
| **Weighted overall** | **6/10** | |

The honest read: **the hard half is done.** The database, the RPC layer, and the three community systems are properly multi-game. The remaining work is the *presentation and personal-tools* half, which is larger in line count but far lower in risk.

---

## 5. What adding a THIRD game would actually require today

Say "Blox Fruits". Concretely:

### Would just work (≈0 lines)
- Exchange listings/offers/rooms/middleman/moderation — once `game_id` accepts the new value.
- Trade Opinions and Lounge.
- Auth, profiles, trust score, reviews, blocks, reports, notifications *(as records — the links would be wrong)*.

### Small, mechanical edits (~1 day)
| Change | File(s) |
|---|---|
| Extend the union | `games/types.ts:1` |
| Add an adapter | `games/registry.ts` (~60 lines) |
| Extend `parseGameId` | `registry.ts:192-194` |
| Widen 6 CHECK constraints + 3 `value_source` CHECKs | new migration |
| Seed `game_catalog_items` | new migration or a loader script |
| Add the new game to `isLegacyGameSchemaError` guards *(or deliberately not)* | `useExchangeData.ts` × 7 |

### Real work (~2–3 weeks)
| Change | Why | Size |
|---|---|---|
| A third navbar | No shared nav primitive exists | ~220 lines |
| A third calculator | Zero shared calculator code | ~1,500 lines (or ~400 if MM2's is generalised first) |
| A third URL codec | Four existing copies, none generic | ~100 lines × N call sites |
| A third data pipeline | scrape → xlsx → generator → validator → JSON → DB seed | ~600 lines |
| Route wiring for 7 pages | Each page must remember its own navbar + padding offset | ~7 files |
| Widen `ValueSource` or fix the two type errors | `lib/valueSystem.ts`, `lib/exchange/matching.ts` | small but touches the calculator |
| Game-aware notification hrefs | 17 SQL literals | 1 migration |
| Extend `sourceSymbol` / `sourceLabel` / `buildCalculatorHref` | if/else chains | 3 functions |
| Matching engine (or accept `basicMatches`) | Adopt-Me-only today | ~480 lines, or accept the gap |
| Personal tools (inventory/wishlist/alerts) | Adopt-Me-only today | large — or accept the gap, as MM2 does |

**Estimate: ~3 weeks for feature parity with MM2** (i.e. accepting the same gaps MM2 has), versus ~2–3 months for parity with Adopt Me.

That asymmetry *is* the architecture's current state: **a second game is cheap; a second *complete* game is not.**

---

## 6. The three highest-leverage abstraction investments

Recommended only where there is a concrete maintainability payoff — not abstraction for its own sake.

| # | Investment | Payoff | Effort |
|---|---|---|---|
| 1 | **One trade-row codec module** (`lib/tradeRows.ts`) exposing `encode(gameId, rows)` / `decode(gameId, value)` | Kills 4 duplicate decoders and the Adopt-Me-calculator URL bug in the same change | S |
| 2 | **Move `valueSources`, `symbol`, `label`, `calculatorHref`, and `wflThresholds` onto the adapter** | Removes every `if (gameId === "mm2")` branch outside the registry; makes game #3 a data change | M |
| 3 | **A `GameShell` layout component** taking the adapter and rendering navbar + workspace padding | Removes the duplicated navbar and the per-page `lg:pl-[288px]` convention | M |

Explicitly **not** recommended: unifying the two calculators before the Adopt Me one reaches MM2's feature level. Merging a weaker implementation into a stronger one first would lock in the weaker semantics.

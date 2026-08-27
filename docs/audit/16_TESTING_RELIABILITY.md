# 16 — Testing & Reliability

---

## 1. Validation actually executed during this audit

Every command below was run against the working tree at `calculator-redesign-v2` / `2660a50`. Outputs are recorded verbatim. **Nothing is reported as passing that was not observed passing.**

| # | Command | Exit | Result |
|---|---|---|---|
| 1 | `npm test` (`tsx --test tests/*.test.ts`) | **0** | ✅ **49 pass, 0 fail** |
| 2 | `npm run data:validate` | **0** | ✅ `3382 items, 3382 unique IDs` |
| 3 | `npm run data:validate:mm2` | **0** | ✅ `MM2 data validation passed (1099 items)` |
| 4 | `npx tsc --noEmit -p tsconfig.json` | **1** | 🔴 **7 errors** |
| 5 | `npx eslint .` | **1** | 🔴 **31 errors, 18 warnings** |
| 6 | `npm run build` (`next build`) | **1** | 🔴 **`Failed to type check`** after `✓ Compiled successfully in 5.4s` |

Not run, and why:
| Command | Reason |
|---|---|
| `npm run deploy` / `preview` / `upload` | Deploys to production Cloudflare — outside audit permissions |
| `npm run refresh:values` / `refresh:mm2` | Overwrites `source-data/` and `src/data/` — modifies application data |
| `npm run snapshot:values` / `alerts:values` | Writes to the live Supabase project |
| `test:nich*` scripts | Require `GEMINI_API_KEY` / a local Ollama and would spend API credit |
| Any SQL execution | No live database access; audit is read-only |

### The distinction that matters
- **Syntax/compile:** ✅ Turbopack compiled successfully in 5.4 s.
- **Type check:** 🔴 fails.
- **Lint:** 🔴 fails.
- **Unit tests:** ✅ pass.
- **Data validation:** ✅ passes for both games.
- **Production build:** 🔴 fails.
- **Runtime / visual verification:** not performed.

---

## 2. What IS tested

`tests/` — 5 files, 49 tests, all `node:test` via `tsx --test`.

| File | Tests | Covers |
|---|---|---|
| `nichVisionState.test.ts` | ~22 | Vision confidence separation, catalog verification, geometry repair, cross-pass agreement, visual-confusion families |
| `nichTradeSession.test.ts` | ~17 | Conversational corrections, ordinals, variant/quantity commands, move, undo, what-if branching, shorthand memory |
| `valueSystem.test.ts` | 3 | `parseTradeValue` (numbers, formatted strings, ranges), `detectValueSource`, GCash/Elve separation |
| `search.test.ts` | 3 | Compact index size, exact + fuzzy search, id lookup |
| `exchange.test.ts` | 3 | Quantity in item totals, default preference threshold, **demand is not fabricated during offer building** |

### These are good tests
They assert *behaviour the product promises*, not implementation detail. A representative sample:
```
✔ vision catalog verification never accepts an invented canonical item
✔ independent vision disagreement never auto-confirms a wrong pet
✔ known visual-confusion families require a targeted audit before auto-confirming
✔ empty item vision result does not claim successful recognition
✔ unknown catalog demand is not fabricated by offer building
✔ getItemValue keeps GCash and Elve systems separate
✔ Sugar Skull Dog stays ambiguous against Sugar Axolotl until audited
```
Several are explicit regression guards for the No-Fake-Data rule. `tests/vision/fixtures/elvebredd/cabbit-tuxedo-regression.json` is a captured real-world failure kept as a fixture. This is mature testing practice.

---

## 3. What is NOT tested

~40 of the 49 tests cover Nich vision and trade sessions. The distribution is heavily skewed away from the highest-revenue-risk surfaces.

| Untested area | Product risk if wrong |
|---|---|
| **`TradeCalculator` W/F/L** | A wrong verdict costs a user a real trade. The rule is duplicated in 4 places with no test asserting they agree. |
| **`MM2TradeCalculator` totals / `CHECK` state** | Same, plus the quantity multiplication path |
| **`getStartingValueType` / `changeValueSource`** | Silent-zero behaviour is exactly what a test would have caught |
| **`lib/tradeContext.ts` encode/decode round-trip** | Would have caught the "Open in Calculator" dead link immediately |
| **`MM2TradeWorkflow` encode/decode round-trip** | — |
| **`lib/exchange/matching.ts`** (482 ln scoring engine) | Only `DEFAULT_MARKETPLACE_PREFERENCES.min_match_score` is asserted |
| **Any API route** (7 handlers, incl. 2,166-line `api/nich`) | Rate limits, validation, allowlists, error shapes — all unverified |
| **RLS policies** | The *entire* authorization boundary has zero automated verification |
| **RPC behaviour** (18 functions, incl. the offer-total recomputation) | The single most security-critical logic in the product |
| **`useExchangeData`** (409 ln, 6 subscriptions, 5 fallbacks) | Highest-coupling module in the app |
| **Realtime subscription/publication consistency** | Would have caught DB-04 |
| **Any React component** | No component/DOM tests at all |
| **Route reachability** | Would have caught the broken `/mm2/item/[name]` |
| **Data pipeline scripts** | Generators and sync scripts are unverified beyond the output validators |

No test runner config, no coverage tooling, no CI test step — `.github/workflows/update-elve-shark-values.yml` runs `update:elve`, `generate:data`, `data:validate` and nothing else. **`npm test`, `tsc`, and `eslint` never run in CI**, which is why a branch with a broken build can sit as the working head.

---

## 4. Recommended testing hierarchy, ordered by actual product risk

### Tier 0 — CI gate (do first, ~1 hour)
Add to a `.github/workflows/ci.yml` on push/PR:
```
npm ci → npx tsc --noEmit → npx eslint . → npm test → npm run data:validate → npm run data:validate:mm2
```
This alone would have blocked the current broken build.

### Tier 1 — Unit, correctness-critical (~1 day)
| Target | Assertion |
|---|---|
| W/F/L rule | Extract the shared threshold function; assert boundaries at 0 %, 4.9 %, 5.0 %, 5.1 %, and equal totals |
| Adopt Me vs MM2 verdict parity | Same totals → same verdict in both engines |
| Missing values | An unpriced item must not silently contribute 0 (this test **fails today** for Adopt Me — that is the point) |
| `tradeContext` round-trip | `encode(decode(x)) === x`, including quantity and 18-row cap |
| `MM2TradeWorkflow` round-trip | Same, plus `rowsToSelected` name-vs-id resolution |
| `matching.ts` | `getKnownDemandScore(null) === null`; category rejection; owner-preference effects |
| `registry.ts` | `getValue` fallback chains for both games; `parseGameId` legacy `"adopt"` alias |

### Tier 2 — Database / RPC (~2–3 days, highest security value)
Against a throwaway Supabase branch or local `supabase start`:
| Assertion |
|---|
| User A cannot read User B's `inventory_items`, `notifications`, `trade_history`, `nich_user_memory` |
| A non-participant cannot read a `trade_rooms` row or its `trade_messages` |
| A non-staff user cannot call `marketplace_moderate_report` |
| A non-staff user cannot insert **or update** a post into `#announcements` ← would catch DB-02 |
| `display_name` cannot be changed after insert ← would catch DB-01 |
| `game_id` cannot be flipped on an existing listing ← would catch DB-03 |
| `marketplace_create_offer` ignores inflated client totals |
| `compatibility_score` is `NULL` when any item is unpriced |
| Listing creation fails cleanly when `value_history` / `game_catalog_items` is empty ← would surface D-03 |
| Every table the client subscribes to is in `supabase_realtime` ← would catch DB-04 |

### Tier 3 — API routes (~1–2 days)
Rate-limit enforcement (including the `cf-connecting-ip` fix), allowlist rejection, honeypot behaviour, `days` clamping, malformed-JSON handling, missing-env 503 paths.

### Tier 4 — End-to-end (~1 week)
Playwright is **already a dependency**. Smoke the six flows in `12_USER_FLOW_MAP.md`, plus:
- every route in `03_ROUTE_MAP.md` returns 200 and renders its heading (catches `/mm2/item/[name]`);
- cross-game guard messages appear where they should;
- Calculator → Trade Opinions → Calculator round-trips in both games.

---

## 5. Reliability posture summary

| Property | State |
|---|---|
| Graceful degradation without Supabase | ✅ Excellent — `getSupabaseBrowserClient()` returns `null`, every consumer guards, `MarketNow` shows "Unavailable" |
| Graceful degradation without `GEMINI_API_KEY` | ✅ 503 with an actionable message |
| Graceful degradation without the migration | ✅ `isLegacyGameSchemaError` fallback (Adopt Me), explicit instruction (MM2) |
| Graceful degradation of the external demand feed | ✅ 502 + empty list, no invented trends |
| Quota store unavailable | ✅ Per-instance fallback + one-time warning |
| Corrupt `localStorage` | ✅ `try/catch` at every read site |
| Malformed trade URL | ✅ `decodeTradeRows` validates ids against the catalog and clamps quantity |
| **Build reproducibility** | 🔴 **Broken on this branch** |
| **CI verification** | 🔴 None beyond data validation |
| **Authorization verification** | 🔴 None |

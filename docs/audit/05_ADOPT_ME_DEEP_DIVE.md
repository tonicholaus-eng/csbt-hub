# 05 — Adopt Me Deep Dive

Adopt Me is the mature product: 3,382 items, two value sources, per-item potion values, demand tiers, value history, inventory, wishlist, alerts, saved trades, and Nich.

---

## 1. The item model

`src/components/trade/types.ts:23-56` — `TradeItem`:

```
ID, NAME, IMAGE, CATEGORY (10 enum values)
GCASH_NORMAL/NEON/MEGA          ← canonical GCash
ELVE_NORMAL/NEON/MEGA           ← canonical Elve
NORMAL/NEON/MEGA                ← legacy GCash aliases
INGAME_VALUE                    ← legacy Elve-regular alias
RARITY, DEMAND_TIER (S|A|B|C|D), UPDATED_AT
POTION_VALUES?: { [source]: { [variant]: { NO_POTION|RIDE|FLY|FLY_RIDE: value } } }
```

Resolution order is centralised in `src/lib/valueSystem.ts:19-33` and honours the legacy aliases:
- `ELVE/NORMAL` → `ELVE_NORMAL ?? INGAME_VALUE`
- `GCASH/NORMAL` → `GCASH_NORMAL ?? NORMAL` (same for NEON/MEGA)

`parseTradeValue()` (`:68-90`) is defensive on purpose — it parses numbers, comma-formatted strings, and **ranges** (`"120-150"`, `"120 to 150"`, en/em dashes), returning the **minimum** of a range. The comment says values are generated as numbers now and this is legacy tolerance. `formatTradeValue()` returns the literal string `"N/A"` for null — the truthful missing-data state.

Potion handling is genuinely careful: `getInventoryItemValue()` (`:45-56`) falls back to the base value **only** when the potion-specific value parses to `null`, and `getAvailablePotionStatuses()` (`:58-65`) only lists statuses that actually exist for that item/source/variant. No fabrication.

---

## 2. Values browser and item profile

**`/values`** — `src/app/values/page.tsx` is a **client component** that imports `itemList` (from the 629 KB compact `tradingItemsIndex.json`) and does search/category/rarity/demand filtering, five sort modes, and 60-per-page windowing entirely in the browser.

`src/lib/search.ts` is the search engine:
- deduplicates by `CATEGORY:normalizedName` (`:10`) — so two items with the same name in different categories both survive, but exact duplicates collapse
- builds acronym aliases for multi-word names (`:23-29`)
- `getSearchScore()` (`:68-94`) is a tiered scorer: exact 1200 → alias 1160 → prefix 1080 → alias-prefix 1030 → substring 900 → multi-token 760+ → single-token 620+ → Levenshtein ≥0.72
- `searchVisionItems()` (`:106-162`) is a deliberately **cheaper** variant for the Nich vision path, with a comment explaining that full-catalog Levenshtein is too expensive inside a Cloudflare Free 10 ms invocation. It only falls back to Levenshtein on a first-letter-and-length-bucketed subset.

**`/values/[id]`** → `PetDetails.tsx`: GCash + Elve regular summary cards, a variant grid, `ValueHistoryCard` (fetches `/api/value-history`, `AbortController`-cancelled), `WishlistButton`, `WatchValueButton`, and a "Similar-value items" section labelled **"Deterministic · {source}"** — the UI states its own method rather than implying a recommendation engine.

---

## 3. Trade Calculator — the full trace

`/calculator` → `TradeCalculator.tsx` (644 ln).

```
user clicks "+"          openAddItemModal(side)         setActiveSide, setModalOpen
       ↓
AddPetModal              itemList (compact index)       search + category filter
       ↓ onSelect
addItem(item)            createSelectedItem()           id: crypto.randomUUID()
                         getStartingValueType()         first variant with value > 0
       ↓
yourItems / theirItems   useMemo reduce                 parseItemValue() → ?? 0
       ↓
yourTotal / theirTotal   →  TradeSummary (desktop)  ·  mobileResult (mobile aside)
       ↓
tradeContextQuery        buildTradeContextParams()      source + your + their
       ↓
"⇄ Find Trades"          /exchange?game=adopt-me&…      ✅ ExchangeHub decodes it
"🗳 Ask Trade Opinions"  /trade-opinions?game=adopt-me&… ✅ TradeVotingBoard decodes it
```

### What it does correctly
- **W/F/L is consistent between mobile and desktop.** `TradeCalculator.tsx:169-233` and `TradeSummary.tsx:40-92` implement the same rule: `difference / max(your, their, 1) * 100`; `≤5%` → FAIR; else `their > your` → WIN, else LOSE. Both clamp negatives and non-finite values to 0 first. (These are two *copies* of the rule, not one shared function — a divergence risk, but they currently agree.)
- **Switching value source re-normalises variants.** `changeValueSource()` (`:341-354`) re-runs `getStartingValueType` for every selected item so an item with no ELVE_NEON silently drops to a variant that exists rather than to zero.
- Outbound Exchange / Trade Opinions links are `aria-disabled` and `pointer-events-none` when the trade is empty.

### What it does NOT do — CONFIRMED gaps
| Capability | Adopt Me | MM2 | Evidence |
|---|---|---|---|
| Reads its own URL params | ❌ | ✅ | `TradeCalculator.tsx` contains no `useSearchParams` / `window.location` reference at all |
| Quantity | ❌ (always 1) | ✅ 1–99 | `tradeContext.ts:25` hardcodes `quantity: 1` in `selectedItemsToRows` |
| Merges duplicate items | ❌ (new row each add) | ✅ | `TradeCalculator.tsx:242-269` always appends |
| Share / copy trade link | ❌ | ✅ | — |
| Saved / recent trades | ❌ | ✅ localStorage | `SaveTradeButton.tsx` exists but **has no importer** |
| Balance Finder | ❌ | ✅ | `MM2TradeBalanceFinder.tsx` |
| Truthful missing-value state | ❌ | ✅ `CHECK` | see below |

### 🔴 CONFIRMED BUG — the "Open in Calculator" link is a dead end
`buildCalculatorHref("adopt-me", …)` (`src/games/registry.ts:230-235`) emits
`/calculator?source=GCASH&your=<id>~NORMAL~2&their=…`, and `TradeVotingBoard.tsx:435-439` renders it as **"Open in Calculator →"** on every Adopt Me trade card.
`/calculator` ignores all of it and opens empty. The MM2 branch of the same function works.
`lib/tradeContext.ts` even ships a fully-written `decodeTradeRows()` (validating the id against the catalog, clamping quantity to 1–99, capping at 18 rows) — it is consumed by `ExchangeHub` and `TradeVotingBoard` but **never by the calculator it was written for**.

### 🟠 Missing values are silently counted as zero
`TradeCalculator.tsx:42-50`:
```ts
function parseItemValue(item, valueType, valueSource) {
  return parseTradeValue(getItemValue(item, valueSource, valueType)) ?? 0;
}
```
If an item has no value in the selected source/variant, it contributes **0** to the total and the W/F/L verdict is still shown with full confidence. `getStartingValueType()` mitigates this at add-time by preferring a variant that has a value, but it explicitly falls through to `preferredValueType` when **no** variant has one (`:60-71`), and `changeValueSource` can move a fully-priced trade into a source where some items are unpriced.

MM2 solves exactly this problem correctly — `missingFor()` counts unpriced units and `getMM2TradeResult()` returns `CHECK` with *"CSBT withholds W/F/L instead of estimating missing MM2 values"* (`MM2TradeSummary.tsx:43-52`). Porting that behaviour to Adopt Me is the single highest-value calculator fix.

---

## 4. Inventory

`/inventory` → `InventoryCalculator.tsx` (576 ln).

- Identity key is `itemId:valueType:potionStatus` (`:49-51`) — quantity merges on that triple.
- **Dual persistence:** signed-in → `inventory_items` table; signed-out → `localStorage` under `LOCAL_KEY`. On sign-in the local set is read as a fallback when the DB returns nothing (`:110`).
- Values resolve through `getInventoryItemValue(item, source, valueType, potionStatus)` so potion-specific values are honoured with a truthful base fallback.
- Each row links to `/calculator?<buildTradeContextParams…>` (`:502`) — **which the calculator ignores**, same bug as above.

---

## 5. Wishlist / watchlist / alerts

- `wishlist_items` (item ids) drives Exchange wishlist matching and the `notify_marketplace_listing_match` trigger.
- `value_watchlist` (item + source + value_type + `alert_percent` + `enabled`) drives `scripts/process-value-alerts.mjs`.
- The alert job compares the **latest two `value_history` snapshots** for that exact `(item, source, value_type)`, skips when fewer than two exist or the previous value is 0, and honours `notification_preferences.value_changes` (`process-value-alerts.mjs:44`, `:55-62`). Deduped by `value-watch:<watchId>:<snapshotDate>`.
- **This whole feature is inert unless `npm run alerts:values` is scheduled.** It is not in the GitHub workflow.

---

## 6. Exchange (Adopt Me path)

`ExchangeHub fixedGameId="adopt-me"` with 8 tabs: Find Trades · Browse · My Listings · Offers · Trade Rooms · Live Feed · Market · Trading Style.

Adopt-Me-exclusive behaviour inside the shared engine:
- `loadPrivate()` populates `inventory`, `wishlistIds`, `marketplace_preferences` **only for adopt-me** (`useExchangeData.ts:237-239`).
- `rankListingMatches()` runs only for adopt-me (`ExchangeHub.tsx:153-156`).
- `lib/exchange/matching.ts` scores each listing on six axes: inventory compatibility, value compatibility (via `buildOptimizedOffer`), wishlist, demand, preferences, freshness.
  - `getKnownDemandScore()` returns `null` for an unknown tier and the demand axis becomes `null` rather than a default — with a comment stating *"missing demand never masquerades as known data"* (`matching.ts:15-24`). The `getDemandScore()` fallback-to-60 helper is kept **only** for deterministic Nich callers.
  - It respects the listing owner's declared style (`highDemandOnly`, `noRandoms`) rather than matching on value alone (`:161-177`).
- `TradeRoomExperience` offers "Update saved inventory" from a completed room — gated on `room.game_id === "adopt-me"` (`:60`).

### The hard dependency worth repeating
`marketplace_create_listing` / `marketplace_create_offer` resolve every Adopt Me item against `public.value_history` and **raise** if there is no row. `value_history` is populated only by `scripts/push-value-snapshot.mjs`, which the nightly CI workflow does not run. See `18_DEPLOYMENT_OPERATIONS.md` §4.

---

## 7. Trade Opinions & Lounge (Adopt Me path)

`/trade-opinions` → `TradeVotingBoard fixedGameId="adopt-me"`; `/lounge` → `CSBTLounge fixedGameId="adopt-me"`.
Both hydrate an incoming trade from `?your=&their=&source=` via `rowsFromSearch()` → `decodeTradeRows()`, so the Calculator → Trade Opinions handoff **works** in that direction. Only the reverse (Trade Opinions → Calculator) is broken.

Voting writes to `community_trade_votes` with RLS `for all to authenticated using auth.uid() = user_id` — one vote per user per trade, enforced by the table's unique constraint.

---

## 8. Nich (Adopt Me only)

Nich is Adopt-Me-scoped by construction:
- `GlobalNichAssistant.tsx:12-19` hides the launcher on `/nich` and on **every** `/mm2/*` route, with a comment stating MM2 Nich integration is intentionally disabled.
- `useNichLocalData.ts` reads Adopt Me inventory, wishlist, watchlist, saved trades and Exchange listings.
- `lib/nich/itemResolver.ts` and `lib/search.ts:searchVisionItems` resolve against the Adopt Me catalog only.

Full analysis in `11_NICHAI_AUDIT.md`.

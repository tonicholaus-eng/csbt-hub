# 14 — Performance Audit

**No runtime benchmarks were taken.** Every number below is either a file size, a build artefact size, or a static code count. Nothing here is a measured page-load or Lighthouse figure, and none is claimed as one.

---

## 1. 🔴 P-01 · The full Adopt Me and MM2 datasets ship to the browser — CONFIRMED

### Evidence
The build emitted (measured with `find .next/static/chunks -printf "%s %p"` after `next build`):

| Chunk | Size | Contains |
|---|---|---|
| `3sx7vzsxc-8ti.js` | **1,653 KB** | `ELVE_MEGA` **and** `SOURCE_VALUE` → both `tradingItems.json` and `mm2Items.json` |
| `0u9825_8-s7dw.js` | 620 KB | `ELVE_MEGA` + `POTION_VALUES` → `tradingItemsIndex.json` |
| `04bcb6v94_453.js` | 620 KB | same |
| next 3 chunks | 230 / 227 / 221 KB | — |

### Cause
```ts
// src/games/registry.ts:1-2
import tradingItems from "../data/tradingItems.json";   // 1.7 MB, 3,382 full records
import mm2Items     from "../data/mm2Items.json";       // 497 KB, 1,099 records
```
`registry.ts` has no `"use client"` of its own, but it is imported by ten client components — `ExchangeHub`, `CreateListingPanel`, `ExchangeItemBuilder`, `ListingCard`, `ListingDetail`, `OfferComposer`, `TradeRoomExperience`, `CSBTLounge`, `TradeVotingBoard`, `GameItemPicker` — so it lands in the client graph. Every visit to `/exchange`, `/mm2/exchange`, `/trade-opinions`, `/mm2/trade-opinions`, `/lounge`, or `/mm2/lounge` downloads that 1.65 MB chunk.

### Why this is avoidable
`src/lib/clientItemIndex.ts` exists **specifically** to solve this: `tradingItemsIndex.json` is a 14-field tuple array (629 KB vs 1.7 MB) covering exactly the fields `registry.ts` actually reads —
```ts
// registry.ts:34-43 — the only adopt-me fields consumed
id: item.ID, name: item.NAME, image: item.IMAGE, category: item.CATEGORY,
rarity: item.RARITY, demandLabel: item.DEMAND_TIER ? … : null, raw: item
```
plus `raw` for `getValue()`, which reads `GCASH_*` / `ELVE_*` / `INGAME_VALUE` — all present in the compact index.

An Adopt Me visitor also pays for the **entire MM2 catalog** (497 KB) and vice-versa, because both adapters are constructed eagerly at module scope in the same file.

### Recommendation
1. Point `registry.ts` at `clientItemList` instead of `tradingItems.json` → **≈1 MB saved**.
2. Split the registry per game (or lazy-construct adapters) so a single-game page never loads the other game's catalog → **another ≈0.5 MB**.
Combined: roughly **1.5 MB of uncompressed JS removed** from the six busiest routes. Gzip/Brotli will reduce the wire cost substantially; the parse/JSON-materialise cost on low-end mobile does not compress away.

---

## 2. 🟠 P-02 · `/values` renders 3,382 items client-side while an unused API does it server-side

`src/app/values/page.tsx` is `"use client"` and imports `itemList` directly. Every keystroke path runs:
- `searchItems()` — which scores **every** item, and for non-matching short queries falls through to `getSimilarity()` → `getLevenshteinDistance()`, an O(n·m) DP allocating a fresh matrix per comparison (`lib/search.ts:44-54`);
- then `.filter()` over the result for category / rarity / demand;
- then `.sort()`;
- then a 60-item window.

Mitigations already present: the search input is debounced (`:39-41`), and results are windowed. But the sort and filter re-run on the full list for each state change, and none of it is memoised across renders.

Meanwhile `src/app/api/items/route.ts` implements exactly this — search, category, rarity, demand, five sort modes, offset/limit, rarity facets, and `Cache-Control: public, max-age=300, stale-while-revalidate=1800` — and has **zero consumers** (`grep "api/items"` outside its own file → 0 hits). One of the two implementations is redundant.

`searchVisionItems()` (`lib/search.ts:106-162`) shows the team already understands this cost — it exists purely to avoid full-catalog Levenshtein inside a 10 ms Workers Free invocation, with the reasoning in a comment. The same reasoning applies to the interactive search path on a phone.

---

## 3. 🟠 P-03 · Unfiltered realtime fan-out on the Exchange channel

`useExchangeData.ts:360-383` subscribes with `event: "*"` and **no `filter:`** to six tables:
`marketplace_listings`, `marketplace_listing_items`, `marketplace_offers`, `marketplace_offer_items`, `trade_rooms`, `marketplace_events`.

Each `marketplace_listings` change calls `refreshListing(id)` — a fresh `select("*,marketplace_listing_items(*)")` round-trip — **on every connected client**, regardless of game or relevance. With N concurrent users and M listing writes per minute that is O(N×M) reads plus O(N×M) realtime frames.

The correct pattern is used elsewhere in the same codebase: `useTradeRoomData.ts:54-60` filters `room_id=eq.${roomId}`, and `useUnreadNotifications.ts:38` filters `user_id=eq.${id}`.

**Cheapest fix:** add `filter: "game_id=eq.<gameId>"` on the listing/offer/room subscriptions. **Better fix:** apply the realtime payload to local state directly instead of refetching.

Related: two of those six subscriptions (`marketplace_listing_items`, `marketplace_offer_items`) never fire at all, because the tables are not in the `supabase_realtime` publication (`09_SUPABASE_DATABASE_AUDIT.md` DB-04) — so they cost a subscription slot for nothing.

---

## 4. 🟡 P-04 · 3,382 pages prerendered at build time

```ts
// src/app/values/[id]/page.tsx:8-11
export const dynamicParams = false;
export function generateStaticParams() {
  return itemList.map((item) => ({ id: item.ID }));
}
```
This is the **right** call for a Workers Free deployment — `open-next.config.ts` deliberately serves prerendered routes from Workers Static Assets so the NextServer is not invoked per page request, and the comment says so explicitly. The cost is build time and `.open-next/assets` size, both of which grow linearly with the catalog. Worth watching if the catalog doubles.

`sitemap.ts` likewise emits 3,382 + 15 URLs in one response.

---

## 5. 🟡 P-05 · Home renders all four theme heroes' code paths

`ThemeAwareHomeHero` picks one of `Hero` / `SnoopyHomeHero` / `RobloxHomeHero` / `HalloweenHomeHero` at runtime, so all four are in the client graph. `HomeDeferredSections` additionally renders `RobloxTradeJourney` and `HalloweenHauntedTrail` **unconditionally**, hiding them with CSS slot classes rather than skipping the mount.

Impact is modest (these are small components), but the pattern means adding a fifth theme adds unconditional weight to every homepage visit. `dynamic()` per theme would fix it — the codebase already uses that pattern correctly for `BirthdayEventExperience`, `NichAssistant`, `NichChat` and `NichIntroMascot`.

---

## 6. 🟡 P-06 · `/api/demand` can make six serial external calls with no timeout

`src/app/api/demand/route.ts:230-244` loops up to `MAX_PAGES = 6`, awaiting each `fetchUpdatePage()` sequentially. Each is `fetch(url, { cache: "no-store" })` with **no `AbortSignal`** (`:194-202`).

On Cloudflare Workers a slow upstream can consume the whole invocation. Response caching (`public, max-age=120, s-maxage=1800`) limits how often this is paid, and failure returns 502 with an empty list rather than hanging the UI — but an `AbortSignal.timeout(…)` and parallel page fetches would both be cheap wins.

---

## 7. 🟡 P-07 · 44% of `src/**` is client code

100 of 226 files carry `"use client"`. Some are unavoidable (every Supabase-touching component must be, given the browser-only auth model). Some are not:

| File | Why it is client | Could be server? |
|---|---|---|
| `app/values/page.tsx` | interactive filtering | Partly — filters could be URL state with server rendering (the API already exists) |
| `Navbar.tsx` / `MM2Navbar.tsx` | `usePathname()` for active state | Could pass the active key down from the server layout |
| `ui/CSBTUI.tsx` | — | Already server ✅ |

Not a defect, but the ratio is the main lever on hydration cost.

---

## 8. 🟢 What is already done well

- **Correct code-splitting where it matters most.** `NichAssistant` → `NichChat` (1,883 ln) and `NichIntroMascot` (597 ln) are `dynamic(ssr:false)`; so is `BirthdayEventExperience`. The single largest interactive subsystem is not in the initial bundle.
- **`open-next.config.ts` is tuned for the actual platform** — `staticAssetsIncrementalCache` + `enableCacheInterception`, with a comment explaining the Workers Free 10 ms CPU budget.
- **`public/_headers`** sets `max-age=31536000, immutable` on `/_next/static/*` and a week on branding assets, correctly bypassing the `headers()` path that Workers Static Assets ignores.
- **API cache headers everywhere**: `/api/items` 60 s/300 s, `/api/value-history` 60 s/300 s, `/api/demand` 120 s/1800 s.
- **`useDeferredValue`** in `MM2AddWeaponModal` for the search input; pagination at 30 items.
- **`MotionConfig`** shortens transitions to 0.18 s on mobile (`PerformanceProvider.tsx:17`).
- **Nich cost engineering**: response cache, in-flight dedupe, and a purpose-built cheap search path.
- **Database indexing matches the query shapes** — see `09_SUPABASE_DATABASE_AUDIT.md` DB-07.

---

## 9. Prioritised performance work

| # | Change | Expected effect | Effort | Risk |
|---|---|---|---|---|
| 1 | `registry.ts` → `clientItemList` | −≈1 MB on 6 routes | S | Low — same fields |
| 2 | Per-game adapter construction | −≈0.5 MB more | S | Low |
| 3 | Add `filter:` to the Exchange realtime subscriptions | O(N×M) → O(N) reads | S | Medium — verify nothing depends on cross-game events |
| 4 | Delete the two never-firing `*_items` subscriptions (or publish the tables) | 2 fewer subscriptions | XS | Low |
| 5 | `/values` → `/api/items`, or memoise the filter/sort chain | Less main-thread work per keystroke | M | Medium |
| 6 | `AbortSignal.timeout()` + parallel pages in `/api/demand` | Bounded worst case | S | Low |
| 7 | `dynamic()` the three unused theme heroes | Smaller homepage bundle | S | Low |

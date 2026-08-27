# 03 — Complete Route Map

63 route files verified via `find src/app -type f \( -name page.tsx -o -name layout.tsx -o -name route.ts -o -name loading.tsx -o -name error.tsx -o -name not-found.tsx \)`.

Legend — **Auth**: `public` / `client-gated` (renders an `AuthCard` when signed out) / `RLS` (data protected by Postgres policies only).

---

## 1. Global shell

| File | Role |
|---|---|
| `src/app/layout.tsx` | Root. Plus Jakarta Sans, GA `G-XZN26M5996`, blocking theme script, JSON-LD `WebSite`, `ThemeProvider → PerformanceProvider → ThemeDecorations + BirthdayEventGateway + children + GlobalNichAssistant` |
| `src/app/loading.tsx` / `error.tsx` / `not-found.tsx` | Root skeleton / `FeatureError` / 404 with recovery links |
| `src/app/sitemap.ts` | 15 static routes + one URL per Adopt Me item (**3,382 URLs**) |
| `src/app/robots.ts` | Disallows `/api/`, `/notifications`, `/profile`, `/inventory`, `/wishlist`, `/exchange/rooms/`, `/exchange/moderation`, `/exchange/middleman` |
| `src/app/mm2/layout.tsx` | Metadata only — returns `children` unchanged (no MM2 shell) |
| `src/app/values/layout.tsx`, `about/layout.tsx`, `nich/layout.tsx` | Metadata-only wrappers |

---

## 2. Adopt Me routes

| Route | Purpose | Page → Major components | Data source | Auth | Backend | Risks |
|---|---|---|---|---|---|---|
| `/` | Landing | `page.tsx` → `Navbar`, `ThemeAwareHomeHero`, `HomeDeferredSections`, `Footer` | `tradingMeta.json` | public | none | Hero varies by theme (4 variants) |
| `/values` | Values browser | `values/page.tsx` (135 ln, server) → `SearchBar`-less inline UI | `tradingMeta`, `valueSources`, `/api/items` | public | none | Has `loading.tsx` + `error.tsx` |
| `/values/[id]` | Item profile | → `PetDetails`, `ValueHistoryCard`, `WishlistButton`, `WatchValueButton` | `lib/search` + `/api/value-history` | public / RLS for buttons | `value_history` | — |
| `/calculator` | Trade Calculator | → `TradeCalculator` (Suspense) | `lib/search` via `AddPetModal` | public | none | **Ignores all URL params** — see §5 |
| `/demand` | Demand trends | → `ExchangeDemandPulse`, `DemandBoard` | `/api/demand` (amvgg.com) | public | `marketplace_events` | External 3rd-party dependency |
| `/inventory` | Inventory calculator | → `InventoryCalculator` (Suspense) | `lib/search` | client-gated | `inventory_items` | — |
| `/wishlist` | Wishlist & alerts | → `WishlistWatchlist` | — | client-gated | `wishlist_items`, `value_watchlist` | — |
| `/trades` | Saved trades | → `TradeHistory` | — | client-gated | `trade_history` | — |
| `/profile` | Account | → `ProfileDashboard` | — | client-gated | `profiles`, `avatars`, many | — |
| `/notifications` | Inbox | → `NotificationCenter` | — | client-gated | `notifications`, `notification_preferences` | — |
| `/exchange` | Exchange hub | → `ExchangeHub fixedGameId="adopt-me"` | Supabase + registry | RLS | 8 tables + 12 RPCs | `loading.tsx` + `error.tsx` present |
| `/exchange/[id]` | Listing detail | → `ListingDetail listingId={id}` | Supabase | RLS | `marketplace_listings` | ⚠ **No `expectedGameId`** — MM2 listings render here |
| `/exchange/rooms/[id]` | Trade room | → `TradeRoomExperience roomId={id}` | Supabase | RLS | `trade_rooms`, `trade_messages`, … | ⚠ No game guard at all |
| `/exchange/middleman` | Middleman desk | → `MiddlemanDesk` | Supabase | RLS (`middleman_roster`) | `middleman_requests` | — |
| `/exchange/moderation` | Moderation desk | → `ModerationDesk` | Supabase | RLS (`exchange_staff`) | `marketplace_reports` | — |
| `/trade-opinions` | W/F/L voting | → `TradeVotingBoard fixedGameId="adopt-me"` | Supabase + registry | RLS | `community_trades`, `community_trade_votes` | — |
| `/lounge` | Community chat | → `CSBTLounge fixedGameId="adopt-me"` | Supabase + Storage | RLS | `community_posts/_replies/_reactions` | — |
| `/nich` | AI assistant page | → `NichBody` | `/api/nich`, `/api/nich/vision` | public | Gemini/Ollama | `loading.tsx` + `error.tsx` present |
| `/seminar` | Safe Trader Academy | → `SeminarAcademy`, `SeminarMission`, `SeminarQuiz` | `data/seminarContent.ts` | public | none | — |
| `/trading-servers` | Discord/FB/Roblox directory | → `TradingServersDirectory` | inline | public | none | — |
| `/feedback` | Feedback form | → `FeedbackForm` | `/api/feedback` | public (+optional bearer) | `feedback_submissions` | — |
| `/about`, `/privacy`, `/terms`, `/community-guidelines` | Static content | — | inline | public | none | — |

### Redirect aliases (VERIFIED)
| Route | Behaviour | Evidence |
|---|---|---|
| `/trade-feed` | `redirect("/trade-opinions")` | `trade-feed/page.tsx:4` |
| `/community` | `redirect("/lounge")` | `community/page.tsx:4` |

⚠ **`src/app/sitemap.ts:6` still lists `/trade-feed` and `/community` as canonical URLs.** The sitemap advertises two permanent redirects to crawlers. It also lists **zero MM2 routes**.

---

## 3. MM2 routes

| Route | Purpose | Page → Components | Data | Auth | Risks |
|---|---|---|---|---|---|
| `/mm2` | MM2 HQ home | → `MM2Navbar`, `MM2HQHome` | `mm2Items`, `mm2Meta` | public | — |
| `/mm2/values` | Weapon values | → `MM2ValuesBrowser` | `mm2Items` | public | Unused `categories` var (lint), type error at `:8` |
| `/mm2/values/[id]` | Weapon profile | → `MM2WeaponDetails` (+ related, demand context) | `mm2Items` | public | Correct `await params`; heavy `any` usage |
| `/mm2/calculator` | MM2 calculator | → `MM2TradeCalculator` | `mm2Items` | public | Best calculator in the repo |
| `/mm2/demand` | Demand intelligence | → `MM2DemandIntelligence` | `mm2Items` | public | Purely local demand scores, no external feed |
| `/mm2/exchange` | Exchange (MM2 scope) | → `ExchangeHub fixedGameId="mm2"` | Supabase | RLS | No inventory/wishlist matching (by design) |
| `/mm2/exchange/[id]` | Listing detail | → `ListingDetail expectedGameId="mm2"` | Supabase | RLS | ✅ Guarded |
| `/mm2/exchange/rooms/[id]` | Trade room | → `TradeRoomExperience exchangeBasePath="/mm2/exchange"` | Supabase | RLS | ⚠ No game guard |
| `/mm2/exchange/middleman` | Middleman desk | → `MiddlemanDesk exchangeBasePath="/mm2/exchange"` | Supabase | RLS | — |
| `/mm2/exchange/moderation` | Moderation | → `ModerationDesk exchangeBasePath="/mm2/exchange"` | Supabase | RLS | — |
| `/mm2/trade-opinions` | W/F/L voting | → `TradeVotingBoard fixedGameId="mm2"` | Supabase | RLS | — |
| `/mm2/lounge` | Community chat | → `CSBTLounge fixedGameId="mm2"` | Supabase | RLS | — |
| **`/mm2/item/[name]`** | **Legacy duplicate weapon page** | → `MM2DemandPanel`, `MM2TradePanel` | `mm2Items` | public | 🔴 **BROKEN — see §5** |

### MM2 routes that do NOT exist
`/mm2/inventory`, `/mm2/wishlist`, `/mm2/profile`, `/mm2/notifications`, `/mm2/trades`, `/mm2/nich`, `/mm2/seminar`, `/mm2/feedback`, `/mm2/about`.

`MM2Navbar` exposes only 6 links (Home, Values, Calculator, Exchange, Trade Opinions, Lounge) plus an `ADM | MM2` switcher. There is **no path from MM2 mode to your own profile or notifications** without leaving MM2. This is a real UX gap, documented in `13_UI_UX_AUDIT.md`.

---

## 4. API routes

| Route | Method | Auth model | Key | Rate limit | Notes |
|---|---|---|---|---|---|
| `/api/items` | GET | public | none | none | Filters/sorts `itemList` in memory; `Cache-Control` 60 s / 300 s |
| `/api/value-history` | GET | public | **anon** | none | Reads `value_history`; treats missing relation as `configured:false` |
| `/api/demand` | GET | public | none | none | Up to **6 sequential** `fetch`es to `amvgg.com` with **no timeout / no `AbortSignal`** |
| `/api/exchange/event` | POST | none | **service-role** | RPC-side, per-fingerprint | Only `LISTING_VIEW/SEARCH/MATCH_VIEW/OFFER_BUILDER_OPEN`; RPC is granted to `service_role` only |
| `/api/feedback` | POST | optional `Bearer` → `auth.getUser()` | **service-role** | RPC `feedback_consume_quota` 5/15 min | Honeypot field `website`; length-bounded |
| `/api/nich` | GET, POST | none | — | `nich-text-minute` 24/min + `nich-gemini-text-daily` | Gemini/Ollama routing, response cache, in-flight dedupe |
| `/api/nich/vision` | GET, POST | none | — | `nich-vision-minute` 6/min + `nich-gemini-vision-daily` 100/day | Raw image body; MIME + size + dimension validation |

---

## 5. Route-level defects

### 🔴 R-01 · `/mm2/item/[name]` is permanently broken · CONFIRMED BUG
```ts
// src/app/mm2/item/[name]/page.tsx:5-6
export default function Page({params}:{params:{name:string}}){
 const item:any=mm2Items.find(i=>i.NAME===decodeURIComponent(params.name));
```
Under Next.js 15+/16, `params` is a **Promise**. `params.name` is `undefined`, `decodeURIComponent(undefined)` yields the string `"undefined"`, no item matches, and the page **always renders `Not found`**. Every other dynamic route in the repo correctly does `const { id } = await params;`.

It is also a functional duplicate of `/mm2/values/[id]`, is linked from nowhere (only `MM2Navbar.tsx:76` mentions the prefix for active-state matching), and is the sole consumer of the two 1-line placeholder components `MM2DemandPanel.tsx` / `MM2TradePanel.tsx` (which render literal text "Historical tracking architecture ready." and "…will connect here").
**Recommendation: delete the route and both panels.**

### 🔴 R-02 · Adopt Me `/calculator` silently discards its own URL contract · CONFIRMED BUG
`src/games/registry.ts:217-236` `buildCalculatorHref()` produces, for Adopt Me:
`/calculator?source=GCASH&your=<id>~NORMAL~2&their=<id>~NEON~1`

`TradeVotingBoard.tsx:435-439` renders that as **"Open in Calculator →"** on every trade card.

`src/components/trade/TradeCalculator.tsx` never calls `useSearchParams` and never reads `window.location.search` (verified: the file has no `searchParams`/`location` reference at all). The link therefore opens an **empty** calculator, silently dropping the trade the user clicked on.

The MM2 branch of the same function works — `MM2TradeCalculator.tsx:212-244` hydrates from the URL. The bug is Adopt-Me-only.

### 🟠 R-03 · One-way cross-game route leak · CONFIRMED
| Route | Guard |
|---|---|
| `/mm2/exchange/[id]` | ✅ `expectedGameId="mm2"` → `ListingDetail.tsx:59-61` shows "This listing belongs to …, not the current … mode." |
| `/exchange/[id]` | ❌ no `expectedGameId` prop passed |
| `/exchange/rooms/[id]` and `/mm2/exchange/rooms/[id]` | ❌ `TradeRoomExperience` has no game-scope prop at all |

Combined with the hard-coded notification `href`s (below), MM2 users are *actively routed* into the Adopt Me shell.

### 🟠 R-04 · Every server-generated notification href is Adopt-Me-only · CONFIRMED
17 hard-coded `'/exchange…'` string literals across the migrations, **none** updated by the multi-game migration:
```
20260816000000_legacy_foundation.sql:1373,1392,1426,1453,1759,1806,1810,1940,1943,2022,2025,2076,2082,1145
20260826000100_multigame_social.sql:1459,1471,1498
```
So an MM2 trader whose offer is accepted receives *"A secure trade room is ready"* pointing at `/exchange/rooms/<id>` — the Adopt Me route. This is the exact failure mode `CLAUDE.md` lists as non-negotiable rule #5.

Note `20260826000100:1498` is scoped correctly (`/exchange?game=adopt-me&tab=market`) — proof the author was thinking about it in one place and not the others.

### 🟡 R-05 · `/api/demand` has no timeout and can make 6 serial external calls
`src/app/api/demand/route.ts:194-202, 230-244` — `fetch(url, { cache: "no-store" })` with no `AbortSignal`. On Cloudflare Workers this can consume the whole invocation budget if `amvgg.com` is slow. Failure is at least handled honestly (HTTP 502 + `items: []`), so `/demand` degrades to an empty state rather than fake data.

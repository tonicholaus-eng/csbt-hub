# 02 — System Architecture (reconstructed from source)

Everything below is traced from repository evidence, not from documentation.

---

## 1. Stack (VERIFIED from `package.json`)

| Layer | Choice | Version |
|---|---|---|
| Framework | Next.js App Router (Turbopack) | `16.2.11` |
| React | React + React DOM | `19.2.4` |
| Language | TypeScript (`strict: true`) | `5.9.3` |
| Styling | Tailwind CSS v4 via `@tailwindcss/postcss` + one 4,953-line `globals.css` + 2 CSS Modules | `^4` |
| Animation | `framer-motion` | `^12.42.2` |
| Backend | Supabase (`@supabase/supabase-js`) | `^2.111.0` |
| Hosting | Cloudflare Workers via `@opennextjs/cloudflare` + `wrangler` | `1.20.2` / `4.123.0` |
| Analytics | `@next/third-parties` Google Analytics (`G-XZN26M5996`, hard-coded in `src/app/layout.tsx:143`) | `16.3.0` |
| Scraping (build-time only) | `playwright`, `cheerio`, `axios`, `xlsx`, `sharp` | — |
| Tests | `node:test` via `tsx --test` | — |

> `playwright` (~large) and `sharp` are **runtime `dependencies`**, not `devDependencies`, even though they are used only by `scripts/*`. See `17_TECHNICAL_DEBT.md`.

---

## 2. Actual runtime architecture

```
                          ┌───────────────────────────────────────────┐
   Browser                │  Cloudflare Workers (csbthub.com)         │
 ┌──────────┐   HTML/RSC  │  wrangler.jsonc → .open-next/worker.js    │
 │  Next.js │◀────────────│                                           │
 │  client  │             │  ┌─────────────────────────────────────┐  │
 │  chunks  │             │  │ Workers Static Assets (ASSETS bind) │  │
 └────┬─────┘             │  │  prerendered pages + /_next/static  │  │
      │                   │  │  ← open-next.config.ts installs     │  │
      │                   │  │    staticAssetsIncrementalCache +   │  │
      │                   │  │    enableCacheInterception          │  │
      │                   │  └─────────────────────────────────────┘  │
      │                   │  ┌─────────────────────────────────────┐  │
      │  fetch /api/*     │  │ NextServer (dynamic routes only)    │  │
      ├──────────────────▶│  │  7 route handlers, runtime="nodejs" │  │
      │                   │  └──────────┬───────────┬──────────────┘  │
      │                   └─────────────┼───────────┼─────────────────┘
      │                                 │           │
      │  ANON KEY (public)              │ SERVICE   │  server-only
      │  postgrest + realtime WS        │ ROLE KEY  │
      ▼                                 ▼           ▼
 ┌─────────────────────────────┐   ┌──────────┐  ┌──────────────┐
 │        SUPABASE             │   │ Supabase │  │  Gemini API  │
 │  ┌───────────────────────┐  │   │ (secret) │  │ 3.6-flash    │
 │  │ Postgres + RLS        │◀─┼───┤          │  │ text+vision  │
 │  │ 34 RLS tables         │  │   └──────────┘  └──────────────┘
 │  │ 42 SECURITY DEFINER fn│  │
 │  │ 3 views (definer)     │  │   ┌──────────────────────────┐
 │  │ supabase_realtime pub │  │   │ amvgg.com  (demand feed) │
 │  └───────────────────────┘  │   │ ← /api/demand, no auth   │
 │  Storage: avatars,          │   └──────────────────────────┘
 │           community-images  │
 │  Auth: email/password       │   ┌──────────────────────────┐
 └─────────────────────────────┘   │ Ollama (localhost only)  │
                                   │ ← dev/self-host fallback │
                                   └──────────────────────────┘

  BUILD-TIME ONLY (never runs in production):
   supremevalues.com ──playwright──▶ source-data/mm2-source-values.json
   elvebredd.com     ──axios/cheerio▶ source-data/elve-shark-values.json
```

---

## 3. Server / client boundary (VERIFIED)

**100 of 226 `src/**` files carry `"use client"` (44%).**

| Kind | Count | Notes |
|---|---|---|
| Server Components | Every `src/app/**/page.tsx` except none — all pages are server components | They import JSON at module scope and pass it down |
| Client Components | All of `src/components/exchange/**`, `community/**`, `account/**`, `nich/**`, `mm2/**`, `trade/**` | Every Supabase-touching component is a client component |
| Route handlers | 7, all `runtime = "nodejs"` | `maxDuration` 60 s (Nich text) / 90 s (Nich vision) |
| Middleware | **None** | No `middleware.ts` anywhere — no edge auth, no redirects, no rewrites |
| Server Actions | **None** | `grep "use server"` → 0 hits |

### The important consequence
There is **no server-side Supabase client with cookie/session handling**. `src/lib/supabase/client.ts` is the only client factory and it is `"use client"`. Auth state lives in `localStorage` (`persistSession: true`) and every authenticated read/write is a direct browser→PostgREST call.

This is a legitimate architecture *given* the RLS quality here — but it means:
- Every protected page is client-rendered and flashes an unauthenticated state first.
- `robots.ts` disallows `/profile`, `/inventory`, `/wishlist`, `/notifications`, `/exchange/rooms/` — that is the **only** thing keeping those out of search results, since they are otherwise publicly routable shells.
- Any authorization bug is a *database* bug, not an app bug. There is no second line of defence.

---

## 4. Data architecture — three parallel item sources

This is the most important architectural subtlety in the repo.

```
                        ┌────────────────────────────────────────┐
 tradingItems.json      │ 1.7 MB · 3,382 items · FULL records    │
 (generated)            │  ├─ src/games/registry.ts ─────────────┼──▶ CLIENT BUNDLE
                        │  └─ scripts/push-value-snapshot.mjs    │    (see §6)
                        └────────────────────────────────────────┘
 tradingItemsIndex.json ┌────────────────────────────────────────┐
 (generated, compact    │ 629 KB · tuple-encoded 14-field rows   │
  tuple array)          │  └─ src/lib/clientItemIndex.ts ────────┼──▶ src/lib/search.ts
                        └────────────────────────────────────────┘    → SearchBar/AddPetModal/Nich
 value_history (DB)     ┌────────────────────────────────────────┐
                        │ canonical server-side Adopt Me values   │
                        │  └─ marketplace_create_listing/offer   │
                        └────────────────────────────────────────┘
```

`clientItemIndex.ts` exists **specifically** to avoid shipping the full dataset, and `src/games/registry.ts` then imports the full dataset anyway. Both end up in client chunks. Evidence in `14_PERFORMANCE_AUDIT.md`.

MM2 has the same split, worse:
- `mm2Items.json` (497 KB) → `src/games/registry.ts` + all five MM2 pages.
- `mm2ItemsIndex.json` (248 KB) → **generated and never read by anything**.
- `game_catalog_items` (Postgres) → seeded by a ~1,200-line literal `INSERT` inside `20260826000100_multigame_social.sql`, and is the canonical source for MM2 Exchange validation.

**Consequence (POSSIBLE ISSUE → likely):** `npm run refresh:mm2` updates `mm2Items.json` but *not* `game_catalog_items`. The DB catalog and the shipped JSON drift apart silently, and the drift only surfaces as an MM2 listing failing with "not in the current CSBT mm2 catalog". See `08_DATA_PIPELINES.md`.

---

## 5. Multi-game abstraction (as implemented)

```
src/games/types.ts     CSBTGameId = "adopt-me" | "mm2"
                       CSBTGameAdapter { items, getItem, searchItems,
                                         getVariants, getValue, hrefs… }
src/games/registry.ts  adoptAdapter · mm2Adapter · REGISTRY
                       + parseGameId / parseGameScope / buildCalculatorHref
                         ▲
       ┌─────────────────┼──────────────────┬───────────────────┐
       │                 │                  │                   │
 ExchangeHub      TradeVotingBoard    CSBTLounge         GameItemPicker
 (fixedGameId)    (fixedGameId)       (fixedGameId)      (gameId)
       │                 │                  │
  /exchange          /trade-opinions      /lounge          ← adopt-me props
  /mm2/exchange      /mm2/trade-opinions  /mm2/lounge      ← mm2 props
```

**What the adapter genuinely abstracts:** item lookup, item search, variants, value resolution, value-source list, item-profile href, calculator href, and game display metadata.

**What it does NOT abstract** (and therefore what a third game would still need to touch):
- `src/lib/valueSystem.ts` — `ValueSource = "GCASH" | "ELVE"` only; Adopt-Me-shaped.
- `src/lib/exchange/matching.ts` — the whole match engine is Adopt-Me-only; MM2 gets `basicMatches()` stubs (`ExchangeHub.tsx:66-76, :153-156`).
- `src/lib/tradeContext.ts` — the Adopt Me URL codec; MM2 has a *separate, incompatible* JSON codec in `MM2TradeWorkflow.ts` plus a third copy inlined in `ExchangeHub.tsx:50-64` and a fourth in `TradeVotingBoard.tsx:54-72`.
- The navbar. `Navbar.tsx` (Adopt Me, 268 px rail) and `MM2Navbar.tsx` (MM2, 288 px rail) are wholly separate implementations with separate icon sets.
- Every notification `href` in SQL (hard-coded `/exchange…`).
- The calculators — two independent implementations sharing no logic.

Scored in detail in `07_MULTIGAME_ARCHITECTURE.md`.

---

## 6. State management

There is no state library. State is held in four places:

| Mechanism | Used for | Evidence |
|---|---|---|
| `useState` in page-level client components | All UI state | e.g. `ExchangeHub.tsx:93-102` |
| Custom hooks over Supabase + realtime | Exchange, trade rooms, notifications, auth | `src/hooks/*.ts` (5 hooks) |
| `localStorage` | Theme (`csbt-theme`), sidebar groups (`csbt-sidebar-groups-v2`), MM2 recent trades (`csbt:mm2:calculator:recent`), Nich chat persistence | `lib/theme.ts:1`, `lib/navigation.ts:39`, `MM2TradeWorkflow.ts:20`, `NichChatPersistence.ts` |
| URL search params | Game scope (`?game=`), tab, source, trade payload | `parseGameId(searchParams.get("game"))` |

The theme is applied by an **inline blocking script** in `<head>` (`layout.tsx:99-131`) that reads `localStorage` and stamps `data-theme` before paint — a correct anti-FOUC pattern, paired with `suppressHydrationWarning` on `<html>`.

---

## 7. Realtime architecture

`useExchangeData` opens one channel per `(gameId, userId)` subscribing to **6 tables with no server-side filter** (`useExchangeData.ts:360-383`). Every listing/offer/room change anywhere triggers a `refreshListing(id)` / `refreshOffer(id)` round-trip on every connected client.

`useTradeRoomData` opens a per-room channel with proper `filter:` clauses (`room_id=eq.${roomId}`) — the correct pattern.
`useUnreadNotifications` filters on `user_id=eq.${id}` — also correct.

Three subscribed tables are **not in the `supabase_realtime` publication** and therefore never fire (verified exhaustively, multiline-aware, against all 12 migrations): `marketplace_listing_items`, `marketplace_offer_items`, `trade_room_events`. See `19_BUG_EDGE_CASE_REPORT.md` #B-04.

---

## 8. Deployment architecture

```
 source ──▶ next build (Turbopack) ──▶ opennextjs-cloudflare build ──▶ .open-next/
                                                                       ├─ worker.js  (main)
                                                                       └─ assets/    (ASSETS binding)
        ──▶ opennextjs-cloudflare deploy ──▶ wrangler ──▶ csbthub.com (custom domain)
```

`npm run deploy` = `verify:vision-source && opennextjs-cloudflare build && … deploy && verify:vision-live`.
`compatibility_flags: ["nodejs_compat", "global_fetch_strictly_public"]`.
Non-secret Nich flags live in `wrangler.jsonc:vars`; `GEMINI_API_KEY` and `SUPABASE_SECRET_KEY` must be Worker secrets.

Full operational analysis, including the CI/local pipeline divergence: `18_DEPLOYMENT_OPERATIONS.md`.

---

## 9. Security headers (VERIFIED `next.config.ts`)

Applied to `/:path*` for dynamic responses: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, **`Content-Security-Policy-Report-Only`**, plus HSTS in production.

Two observations:
1. CSP is **Report-Only** and has **no `report-uri`/`report-to`** — so violations are logged to browser consoles and collected by nobody. It is currently decorative.
2. Static assets served by Workers Static Assets **bypass `headers()`** entirely — the code comments acknowledge this and route caching through `public/_headers`, but `public/_headers` sets only `Cache-Control`, no security headers.

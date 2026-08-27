# 00 — Repository Coverage Ledger

**Repo:** `csbt-price-checker` (CSBT HUB)
**Branch audited:** `calculator-redesign-v2` · **HEAD:** `2660a50 Restore stable calculator and create production checkpoint`
**Audit dates:** 2026-08-27 · **Status: COMPLETE** — all major subsystems `DEEP REVIEW COMPLETE`, adversarial verification performed (`23`).

Statuses: `NOT STARTED` · `PARTIAL` · `DEEP REVIEW COMPLETE`

---

## Repository shape (VERIFIED by execution, not estimate)

| Metric | Value | Command |
|---|---|---|
| Files excl. `node_modules`/`.git`/`.next` | 8,641 | `find . -type f` |
| `src/**` TS/TSX modules | **226** | `find src -name '*.ts' -o -name '*.tsx'` |
| — reachable from a route entry | 207 | transitive import closure (`23` C-1) |
| — **unreachable (dead)** | **19 / 6,268 lines** | same |
| Files containing `"use client"` | 100 / 226 (44%) | `grep -rln` |
| `src/components/**` modules | 134 | `find src/components` |
| App Router route files | **63** | page/layout/route/loading/error/not-found |
| API route handlers | 7 | `src/app/api/**/route.ts` |
| Supabase migrations | **12** (5,027 lines) | `ls supabase/migrations/*.sql` |
| Legacy SQL inside `src/lib/supabase/` | 6 files (~4,750 lines) | 3 byte-identical to migrations |
| Scripts | 19 in `scripts/` + 2 in `scripts/lib/` | |
| Test files | 5 (49 tests, all passing) | `tests/*.test.ts` |
| Generated data in `src/data` | 11 files | 3 of them dead |
| Public assets | 23 files / 17 MB | `du -sh public/*` |
| Loose status docs at root | 19 (18 `.md` + 1 `.txt`, excl. README) | |
| Adopt Me items / MM2 weapons | **3,382** / **1,099** | validators executed |
| Largest emitted client chunk | **1,692,945 bytes** | contains `ELVE_NORMAL` × 3,382 |

---

## Coverage table — all areas

| Area | Purpose | Key files | Depth | Report |
|---|---|---|---|---|
| Root config | Build/runtime/lint/TS/CSP | `package.json`, `next.config.ts`, `tsconfig*.json`, `eslint.config.mjs`, `postcss.config.mjs`, `open-next.config.ts`, `wrangler.jsonc`, `.gitignore` | **DEEP REVIEW COMPLETE** | 02, 18 |
| Environment & secrets | Config surface, leak check | `.env.example`, `ENV_SETUP.txt`, `wrangler.jsonc:vars`; git history checked | **DEEP REVIEW COMPLETE** | 10 SEC-08, 18 |
| Git state | Branches, uncommitted work, build artifacts | `git status/log/branch`, `.open-next` manifests | **DEEP REVIEW COMPLETE** | 18 OPS-05, 23 N-3 |
| Route map | All 63 route files traced | `src/app/**` | **DEEP REVIEW COMPLETE** | 03 |
| API routes | 7 handlers, incl. auth/validation/limits | `src/app/api/**` | **DEEP REVIEW COMPLETE** | 03 §4, 10 |
| Game registry / adapters | Multi-game abstraction | `src/games/types.ts`, `registry.ts` | **DEEP REVIEW COMPLETE** | 07 |
| Navigation | Both nav models | `lib/navigation.ts`, `Navbar.tsx`, `MM2Navbar.tsx`, `GameSwitcher.tsx` | **DEEP REVIEW COMPLETE** | 04, 13 |
| Value system (Adopt Me) | Value resolution, potions, parsing | `lib/valueSystem.ts`, `components/trade/types.ts` | **DEEP REVIEW COMPLETE** | 05 §1 |
| Search / item index | Lookup, scoring, vision search | `lib/search.ts`, `clientItemIndex.ts`, `itemCategory.ts`, `relatedItems.ts` | **DEEP REVIEW COMPLETE** | 05 §2, 14 |
| Adopt Me calculator | Correctness-critical | `components/trade/*` (7 files) | **DEEP REVIEW COMPLETE** | 05 §3 |
| MM2 calculator | Correctness-critical | `MM2Trade*.tsx`, `MM2TradeWorkflow.ts`, `MM2AddWeaponModal.tsx` | **DEEP REVIEW COMPLETE** | 06 §3 |
| Inventory | Dual persistence, potion values | `InventoryCalculator.tsx` | **DEEP REVIEW COMPLETE** | 05 §4 |
| Values browser / item profile | Adopt Me values UX | `app/values/**`, `PetDetails.tsx`, `ValueHistoryCard.tsx`, `Wishlist/WatchValueButton` | **DEEP REVIEW COMPLETE** | 05 §2 |
| MM2 values / weapon profile | MM2 values UX + route collisions | `app/mm2/values/**`, `MM2ValuesBrowser`, `MM2WeaponDetails`, `MM2WeaponCard`, `MM2RelatedWeapons` | **DEEP REVIEW COMPLETE** | 06, 19 B-04 |
| Demand | Both games + external feed | `api/demand/route.ts`, `DemandBoard`, `ExchangeDemandPulse`, `MM2DemandIntelligence` | **DEEP REVIEW COMPLETE** | 03, 06, 14 |
| Exchange | Listings/offers/rooms/middleman/moderation | `components/exchange/*` (9), `useExchangeData.ts`, `useTradeRoomData.ts`, `lib/exchange/*` | **DEEP REVIEW COMPLETE** | 04 §5, 05 §6, 12 |
| Trade Opinions | W/F/L voting, both games | `TradeVotingBoard.tsx` | **DEEP REVIEW COMPLETE** | 05 §7, 12 |
| Lounge | 11 channels, realtime, storage | `CSBTLounge.tsx` | **DEEP REVIEW COMPLETE** | 04 §6, 09, 12 |
| Account / auth UI | Auth, profile, trust | `components/account/*` (5), `useAuthSession.ts` | **DEEP REVIEW COMPLETE** | 10 §1 |
| Notifications | Inbox + realtime badge | `NotificationCenter.tsx`, `useUnreadNotifications.ts`, `accountTypes.ts` | **DEEP REVIEW COMPLETE** | 12, 23 C |
| Wishlist / watchlist / alerts | Value alerts end-to-end | `WishlistWatchlist.tsx`, `process-value-alerts.mjs` | **DEEP REVIEW COMPLETE** | 05 §5 |
| Item pickers | Both implementations compared | `items/ItemSearchPicker.tsx`, `games/GameItemPicker.tsx` | **DEEP REVIEW COMPLETE** | 04 §11, 13, 23 N-1 |
| Nich AI — client | Chat, persistence, local data | `nich/assistant/**` (25 files incl. all 14 `brain/`, 3 `tools/`, `memory/`) | **DEEP REVIEW COMPLETE** | 11 |
| Nich AI — server | Model calls, vision, quota | `api/nich/route.ts`, `api/nich/vision/route.ts`, `lib/nich/*` (5) | **DEEP REVIEW COMPLETE** | 11 |
| Nich AI — mascot cluster | Dead-code cluster | `NichMascot`, `NichBody`, `NichFace`, `NichReactions`, `NichTradeReviewCard`, `NichButton` | **DEEP REVIEW COMPLETE** | 23 C-1, C |
| Home | 4 theme heroes + deferred sections | `components/home/*` (13), `Hero.tsx`, `Stats.tsx` | **DEEP REVIEW COMPLETE** | 04 §2, 14 |
| MM2 home / HQ | MM2 landing | `MM2HQHome.tsx` + `.module.css` (1,193) | **DEEP REVIEW COMPLETE** | 06 §2 |
| Theming | 4 themes + MM2 system | `lib/theme.ts`, `ThemeProvider.tsx`, `AppearanceSelector.tsx`, `ThemeDecorations.tsx`, `globals.css` (4,953) | **DEEP REVIEW COMPLETE** | 13 E, 15, 17 |
| Birthday event | Seasonal subsystem (expired) | `components/birthday/*` (8), `config/birthdayEvent.ts`, `useBirthdayEventActive.ts` | **DEEP REVIEW COMPLETE** | 17 §1.1b, 23 N-4 |
| Seminar / Academy | Education + fake-data check | `components/seminar/*` (3), `data/seminarContent.ts` | **DEEP REVIEW COMPLETE** | 23 A20 |
| Trading servers | Directory + safety disclaimer | `TradingServersDirectory.tsx` | **DEEP REVIEW COMPLETE** | 23 A20 |
| Feedback | Form + API + quota | `FeedbackForm.tsx`, `api/feedback/route.ts` | **DEEP REVIEW COMPLETE** | 03, 10 |
| Static content | About/privacy/terms/guidelines | `app/about`, `privacy`, `terms`, `community-guidelines` | **DEEP REVIEW COMPLETE** | 03, 11 §4 |
| Data pipeline (Adopt Me) | Source → generated → DB | `scripts/lib/elve-shark.js`, `update-elve-shark-values.js`, `sync-elve-to-master.js`, `generate-trading-items.js`, `validate-trading-data.js` | **DEEP REVIEW COMPLETE** | 08 §1 |
| Data pipeline (MM2) | Source → generated → DB | `scripts/lib/mm2-source.js`, `update-mm2-supreme-values.js`, `sync-mm2-source-to-master.js`, `generate-mm2-items.js`, `validate-mm2-data.js`, `refresh-mm2-master.js` | **DEEP REVIEW COMPLETE** | 08 §2 |
| Value history / alerts ops | Snapshots & notifications | `push-value-snapshot.mjs`, `process-value-alerts.mjs`, `load-local-env.mjs`, `api/value-history` | **DEEP REVIEW COMPLETE** | 08 §3, 18 |
| Ops / verification scripts | Deploy pre/post-flight, export | `verify-vision-source.mjs`, `verify-live-vision.mjs`, `create-safe-export.mjs`, 4 `test-nich-*.ts` | **DEEP REVIEW COMPLETE** | 18, 10 SEC-05 |
| Supabase migrations | Schema of record | `supabase/migrations/*.sql` (12) | **DEEP REVIEW COMPLETE** | 09 |
| Supabase legacy SQL | Duplication analysis | `src/lib/supabase/*.sql` (6) — verified by `diff` | **DEEP REVIEW COMPLETE** | 09 §1, 17 §1.4 |
| RLS / authorization | The whole security boundary | 34 RLS tables, 42 definer fns, 3 views, storage policies | **DEEP REVIEW COMPLETE** | 09 §3–5, 10 |
| Realtime | Publication vs subscriptions | `pg_publication` blocks vs 3 hooks + Lounge | **DEEP REVIEW COMPLETE** | 09 DB-04/05, 14 |
| Tests | Coverage & quality, executed | `tests/*.test.ts` (5) + vision fixture | **DEEP REVIEW COMPLETE** | 16 |
| Deployment / ops | Build → prod, CI | `open-next.config.ts`, `wrangler.jsonc`, `public/_headers`, `.github/workflows/`, `.open-next` artifacts | **DEEP REVIEW COMPLETE** | 18 |
| Public assets | Artwork, themes | `public/**` (23 files, 4 theme dirs) | **DEEP REVIEW COMPLETE** | 02, 13 E |
| Documentation | Accuracy vs implementation | `README.md`, `supabase/README.md`, 19 root status files, `CLAUDE.md` | **DEEP REVIEW COMPLETE** | 23 N-2, 17 §1.5 |

**Every one of the 226 `src` modules is named in at least one report** (13 gaps found during the adversarial sweep and closed — `23` Part C).

---

## Validation actually executed

| Command | Exit | Result |
|---|---|---|
| `npm test` | **0** | ✅ 49 pass / 0 fail |
| `npm run data:validate` | **0** | ✅ 3,382 items, 3,382 unique IDs |
| `npm run data:validate:mm2` | **0** | ✅ 1,099 items |
| `npx tsc --noEmit` | **1** | 🔴 7 errors |
| `npx eslint .` | **1** | 🔴 31 errors / 18 warnings |
| `npm run build` | **1** | 🔴 `Failed to type check` after `✓ Compiled in 5.4s` |

Not run (out of audit scope): `deploy`/`preview`/`upload` (production), `refresh:values`/`refresh:mm2` (rewrites application data), `snapshot:values`/`alerts:values` (writes to live Supabase), `test:nich*` (needs API credit), any SQL execution (no live DB access).

---

## Deliberately NOT inspected

| Path | Reason |
|---|---|
| `node_modules/` | Third-party; `package.json` + lockfile reviewed instead |
| `.next/` | Build output — used only as **evidence** for chunk-size analysis |
| `.open-next/` | Build output — used only as **evidence** for the MM2-never-deployed finding |
| `.wrangler/`, `supabase/.temp/` | Local tool state, gitignored |
| `supabase/migrations_backup_20260817/` | Byte-identical duplicates of `migrations/` (verified by `diff`) |
| `.env.local`, `.dev.vars` | Real secrets — key **names** read, values never printed |
| `source-data/*.xlsx` | Binary masters — schema traced through the scripts that read them |

---

## Report index

| # | Report | Status |
|---|---|---|
| 00 | Repository Coverage Ledger | ✅ this file |
| 01 | Executive Summary | ✅ *(scores updated post-adversarial)* |
| 02 | System Architecture | ✅ |
| 03 | Route Map | ✅ |
| 04 | Component Architecture | ✅ *(§10 corrected, §11 added)* |
| 05 | Adopt Me Deep Dive | ✅ |
| 06 | MM2 Deep Dive | ✅ |
| 07 | Multi-Game Architecture | ✅ |
| 08 | Data Pipelines | ✅ |
| 09 | Supabase / Database Audit | ✅ |
| 10 | Auth & Security Audit | ✅ *(SEC-01 confidence reclassified)* |
| 11 | Nich AI Audit | ✅ |
| 12 | User Flow Map | ✅ |
| 13 | UI / UX Audit | ✅ *(N-1 added)* |
| 14 | Performance Audit | ✅ |
| 15 | Next.js / React Audit | ✅ |
| 16 | Testing & Reliability | ✅ |
| 17 | Technical Debt | ✅ *(§1.1 corrected, §1.1b added)* |
| 18 | Deployment & Operations | ✅ |
| 19 | Bug & Edge-Case Report | ✅ |
| 20 | Product Architecture Review | ✅ |
| 21 | Prioritized Roadmap | ✅ |
| 22 | Project Defense Guide | ✅ |
| 23 | **Adversarial Verification, Corrections & Final Scoring** | ✅ **read this alongside 01** |

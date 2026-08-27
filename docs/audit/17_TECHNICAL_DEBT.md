# 17 — Technical Debt

Grouped by the risk of removing it, not by how much it annoys.

---

# TIER 1 — SAFE CLEANUP
*No behaviour change. Verified to have no consumers.*

## 1.1 · Dead components — 19 modules, 6,268 lines
Verified by a **transitive reachability closure**: every static and dynamic import across all 226 `src` modules, resolved and walked from the 65 Next.js entry files. Method and correction: `23_ADVERSARIAL_VERIFICATION_AND_SCORING.md` C-1.

> An earlier grep-by-basename pass reported 16 modules / 4,982 lines. It missed three **transitively** dead files whose only importers are themselves dead.

| File | Lines | Note |
|---|---|---|
| `components/home/LiveCommunityFeed.tsx` | 3,044 | |
| `components/nich/NichBody.tsx` | 1,088 | only importer: dead `NichMascot` |
| `components/SearchBar.tsx` | 845 | |
| `components/nich/NichMascot.tsx` | 247 | |
| `components/mm2/MM2Hero.tsx` | 150 | |
| `components/PopularPets.tsx` | 128 | |
| `components/mm2/MM2HeroSearch.tsx` | 119 | only importer: dead `MM2Hero` |
| `components/mm2/MM2MarketHighlights.tsx` | 100 | |
| `components/trade/SaveTradeButton.tsx` | 88 | |
| `components/mm2/MM2FeatureCards.tsx` | 78 | |
| `components/mm2/MM2CommunityHub.tsx` | 67 | |
| `components/nich/NichFace.tsx` | 63 | only importer: dead `NichMascot` |
| `components/mm2/MM2HomeBoard.tsx` | 59 | |
| `components/home/MM2TradingHQ.tsx` | 47 | |
| `components/mm2/MM2ValueCard.tsx` | 46 | |
| `components/mm2/MM2Trending.tsx` | 31 | |
| `components/AppFooter.tsx` | 29 | |
| `components/mm2/MM2ValueHero.tsx` | 24 | |
| `components/mm2/MM2ValueSearchPanel.tsx` | 15 | |

Delete as two clusters, not 19 individual files:
`NichMascot → NichBody + NichFace` (1,398 ln) · `MM2Hero → MM2HeroSearch` (269 ln).

They are outside every import graph, so Turbopack already tree-shakes them — **there is no runtime cost**. The cost is comprehension: `LiveCommunityFeed.tsx` and `SearchBar.tsx` are the #1 and #3 largest components in the repo, `NichBody.tsx` is the second-largest Nich file, and a reader will reasonably assume all three are load-bearing. `SaveTradeButton.tsx` in particular implies the calculator has a save feature; it does not.

## 1.1b · Dormant seasonal code — 8 components, ~360 lines
`src/config/birthdayEvent.ts` defines a hardcoded personal event with the window `2026-08-13T16:00Z → 2026-08-15T16:00Z`. Against the audit date (2026-08-27) `isBirthdayEventActive()` returns **false** — it expired 12 days ago, with `enabled: true`.

The **gating is correct and worth keeping as a pattern**: `BirthdayEventGateway` returns `null` when inactive and loads `BirthdayEventExperience` via `dynamic(ssr:false)`, and `useBirthdayEventActive` supplies `getServerSnapshot: () => false` so there is no hydration mismatch. The experience genuinely does not load.

Two residual costs: `BirthdayIcons.tsx` is **statically** imported by `Navbar.tsx:13`, `NichButton.tsx` and `NichChat.tsx`, so it ships on every page permanently; and the source carries a hardcoded personal message (`"HAPPY BIRTHDAY, FROM PINAKA POGING NICH CAST 😜"`) plus an individual's name. For a codebase shown to technical evaluators, move this behind a data-driven flag or remove it.

## 1.2 · Dead API route
`src/app/api/items/route.ts` (43 ln) — zero consumers. `/values` reimplements the same filtering client-side. Keep **one** implementation; if the route is kept, wire `/values` to it (that would also fix P-02 in `14_PERFORMANCE_AUDIT.md`).

## 1.3 · Dead generated data — 251 KB
| File | Status |
|---|---|
| `src/data/mm2ItemsIndex.json` (248 KB) | Written by `generate-mm2-items.js:460`, read by nothing |
| `src/data/mm2Categories.json` (858 B) | Written by nothing, read by nothing |
| `src/data/homePopularItems.json` (3 KB) | Only consumer is the dead `PopularPets.tsx` |

## 1.4 · Duplicate SQL inside `src/` — ~4,750 lines
`src/lib/supabase/*.sql` — six files never imported by any code. Three are **byte-identical** to migrations (`foundation.sql`, `community-feed.sql`, `exchange-item-alias-hotfix.sql`); three are superseded pre-consolidation migrations (`exchange.sql`, `community-lounge.sql`, `phase-two.sql`). They are a second, unversioned copy of the schema sitting in the application source tree.

Move to `docs/sql-history/` or delete. Also fix `supabase/README.md`, which references the old filename `20260816_000_legacy_foundation.sql`.

## 1.5 · 19 loose status files at the repo root (18 `.md` + 1 `.txt`, excluding README)
`MM2_HOMEPAGE_ATMOSPHERE_REFINEMENT_V3.md` … `_V9.md`, `MM2_HQ_REBUILD_NOTES.md`, `MM2_PHASE1.md`, `PHASE14B_DEMAND_INTEGRATION.md`, `ADM_MM2_SOCIAL_ROUTE_AND_HISTORY_FIX.md`, and 13 more — all untracked work logs. Nine of them are sequential versions of the same MM2 homepage redesign. Move to `docs/history/`.

## 1.6 · Vestigial placeholder components
`mm2/MM2DemandPanel.tsx` and `mm2/MM2TradePanel.tsx` are 1-line components rendering literal text *"Historical tracking architecture ready."* and *"…will connect here."* Their only consumer is the permanently broken `/mm2/item/[name]` route. Delete the route and both files together.

## 1.7 · Dependency placement
`playwright`, `sharp`, `cheerio`, `axios`, `xlsx`, `fs-extra`, `node-fetch` are in `dependencies` but used only by `scripts/`. Nothing under `src/` imports them, so they never reach the Worker bundle — this is an install/CI cost, not a runtime one. Move to `devDependencies`.

## 1.8 · `tsconfig.qa.json` is orphaned
Correctly scoped to `src/**` but referenced by no npm script.

---

# TIER 2 — ARCHITECTURAL REFACTOR
*Behaviour-preserving but touches live code. Needs tests first.*

## 2.1 · One wire format, four decoders
The MM2 `[{key, quantity}]` JSON row format is implemented independently in:
`registry.ts:225-226` (encode), `MM2TradeWorkflow.ts:66-92`, `ExchangeHub.tsx:50-64`, `TradeVotingBoard.tsx:54-72`.
The Adopt Me `id~variant~qty` format lives in `lib/tradeContext.ts` and is decoded in two of the same files.

**Consolidate into `lib/tradeRows.ts` with `encode(gameId, rows)` / `decode(gameId, value)`.** This is also the natural place to fix the broken Adopt Me calculator hydration — one change, two problems.

## 2.2 · W/F/L threshold duplicated four times
`TradeCalculator.tsx:204`, `TradeSummary.tsx:62`, `MM2TradeSummary.tsx:58`, `MM2TradeBalanceFinder.tsx:70` each hard-code `differencePercent <= 5`. They currently agree. Nothing enforces that they continue to.
Extract `getTradeVerdict(yourTotal, theirTotal, { missingCount })` and let both games call it — `CLAUDE.md` treats calculator semantics as correctness-critical, and this is the mechanism by which they would silently diverge.

## 2.3 · Two competing `ValueSource` unions
`lib/valueSystem.ts:3` `"GCASH" | "ELVE"` vs `games/types.ts:3` `"GCASH" | "ELVE" | "SUPREME"`. This produces two of the seven build-breaking type errors (`matching.ts:111, 118`). Either widen `valueSystem` and branch internally, or make `matching.ts` accept only the narrowed type with an explicit guard at the boundary.

## 2.4 · Oversized modules
| File | Lines | Split suggestion |
|---|---|---|
| `api/nich/route.ts` | 2,166 | provider selection · caching/dedupe · quota · prompt assembly · handler |
| `nich/assistant/tools/petSearch.ts` | 3,008 | — |
| `nich/assistant/NichChat.tsx` | 1,883 | chat UI · upload · persistence |
| `nich/assistant/tools/tradeComparison.ts` (1,631) vs `brain/tradeComparison.ts` (453) | — | two implementations of one concept; reconcile |
| `community/CSBTLounge.tsx` | 836 | channels · composer · post list · presence |
| `hooks/useExchangeData.ts` | 409 | public loader · private loader · realtime |

## 2.5 · Type weakness concentrated in MM2
28 `no-explicit-any` errors, 20 of them in `app/mm2/values/[id]/page.tsx` alone. `MM2Item` exists in `MM2TradeTypes.ts` and is simply not used by the value-profile route. `app/mm2/item/[name]/page.tsx:6` uses `const item:any`.

## 2.6 · Two navbars, no shared primitive
`Navbar.tsx` (238) and `MM2Navbar.tsx` (217) share zero code — different icon sets, different active-state logic, different rail widths (268 vs 288 px), and every page hard-codes the matching `lg:pl-[…]` offset. A `GameShell` taking the adapter would remove both duplications.

## 2.7 · CSS debt
`globals.css` is 4,953 lines with **157 `!important`** declarations, concentrated in theme overrides that force Tailwind utility colours to obey the token system:
```css
[data-theme="light"] .csbt-lounge [class*="text-white/"] { color: var(--foreground-muted) !important; }
```
Only two CSS Modules exist, both in MM2 — the newest code follows `CLAUDE.md`'s preference, the rest does not. Any new theme work will hit this specificity wall.

## 2.8 · Inconsistent code formatting
`TradeCalculator.tsx` uses ~2-token-per-line vertical formatting (644 lines for what is ~250 lines of logic) while `values/page.tsx`, `QuickActions.tsx`, `CSBTUI.tsx`, and most `page.tsx` files are aggressively single-lined (some over 1,000 characters). Both extremes hurt diff review. There is no Prettier config.

---

# TIER 3 — HIGH-RISK REFACTOR
*Do not attempt without Tier-2 tests in place.*

## 3.1 · Unifying the two calculators
Tempting, but **do it in the right order**: the Adopt Me calculator lacks quantity, URL state, persistence, sharing, Balance Finder, and truthful missing-value handling. Merging today would either lock in the weaker semantics or silently change Adopt Me's behaviour — which `CLAUDE.md` lists as a non-negotiable.
**Correct sequence:** (1) extract the shared verdict function, (2) bring Adopt Me to MM2's feature level with tests, (3) *then* consider a shared engine.

## 3.2 · Making `game_catalog_items` the single MM2 source of truth
Would fix D-02 in `08_DATA_PIPELINES.md`, but the seed currently lives inside a migration. Requires a new push script, a migration that stops carrying data, and an operational runbook.

## 3.3 · Changing the `queueMicrotask(setState)` house pattern
100 call sites across 36 files. Individually safe, collectively a workaround. Any bulk change risks introducing render-timing regressions in components with no tests. Address opportunistically, per component, as those components get tests.

## 3.4 · Adding a server-side Supabase client
Would enable real route protection and remove the signed-out flash — but it changes the security model from "RLS only" to "RLS + server checks", touches every protected page, and requires cookie-based session handling that does not exist today. High value, high blast radius.

---

# Debt scoreboard

| Category | Volume | Removal risk |
|---|---|---|
| Dead components | **6,268 lines** | **None** |
| Dormant seasonal code | ~360 lines (expired event) | **None** |
| Duplicate SQL in `src/` | ≈4,750 lines | **None** |
| Dead generated data | 251 KB | **None** |
| Loose root markdown | 20 files | **None** |
| Dead API route | 43 lines | Low |
| Duplicated wire codecs | 4 copies | Low–Medium |
| Duplicated W/F/L rule | 4 copies | Medium (correctness-critical) |
| Type weakness | 28 `any` + 7 errors | Low–Medium |
| CSS `!important` | 157 | Medium |
| Oversized modules | 6 files > 800 lines | Medium |
| Calculator duplication | ~2,100 lines | **High** |

# 04 — Component Architecture

Grouped by product responsibility. 226 TS/TSX files in `src/**`; 100 carry `"use client"`.

---

## 1. Global shell

| Component | Lines | Client? | Purpose | Notes |
|---|---|---|---|---|
| `app/layout.tsx` | 146 | server | Fonts, metadata, GA, JSON-LD, blocking theme script | GA id `G-XZN26M5996` hard-coded at `:143` |
| `ThemeProvider.tsx` | 60 | ✅ | `useSyncExternalStore` over `document.documentElement.dataset.theme` | Correct SSR-safe pattern; server snapshot returns `"dark"` |
| `PerformanceProvider.tsx` | 22 | ✅ | `MotionConfig reducedMotion="user"`, shorter transitions on mobile | Good |
| `ThemeDecorations.tsx` | 115 | ✅ | Per-theme background art | — |
| `BirthdayEventGateway.tsx` | 12 | ✅ | `dynamic(ssr:false)` gate for the seasonal event | Correct code-splitting |
| `GlobalNichAssistant.tsx` | 21 | ✅ | `dynamic(ssr:false)` Nich launcher | ✅ Correctly hidden on `/nich` and all `/mm2/*` |
| `Navbar.tsx` | 238 | ✅ | Adopt Me 268 px sidebar rail + mobile bar | Driven by `lib/navigation.ts` |
| `mm2/MM2Navbar.tsx` | 217 | ✅ | MM2 288 px rail, own inline SVG icon set | **Wholly separate implementation** — no shared nav primitive |
| `ui/CSBTUI.tsx` | 8 (minified) | server | `Surface`, `PageHeader`, `SectionHeader`, `EmptyState`, `Badge` | The only real shared UI kit; MM2 barely uses it |
| `ui/AccessibleDialog.tsx` | 96 | ✅ | Focus-trapped dialog | Used by `ExchangeHub` |
| `system/FeatureError.tsx` | 17 | ✅ | Shared error boundary body | Used by 4 `error.tsx` files |
| `Footer.tsx` | 4 | server | — | `AppFooter.tsx` (28 ln) is a **dead duplicate** |

---

## 2. Home

`app/page.tsx` → `ThemeAwareHomeHero` + `HomeDeferredSections`.

`ThemeAwareHomeHero.tsx` switches on the active theme between **four completely separate hero components**: `Hero` (dark), `SnoopyHomeHero`, `RobloxHomeHero`, `HalloweenHomeHero`. All four are client components, all four ship.

`HomeDeferredSections` (server) renders, in order: `RobloxTradeJourney`, `HalloweenHauntedTrail`, `MarketNow`, `MemberPulse`, `QuickActions`, `MeetNich`, `Stats`. Theme-specific sections are rendered **always** and hidden by CSS class slots (`roblox-journey-slot`, `halloween-trail-slot`) — not conditionally mounted.

**`MarketNow.tsx` is the reference implementation for the No-Fake-Data rule.** On any Supabase error it renders the literal string `"Unavailable"` and prints *"Only real CSBT data is shown. Missing activity stays unavailable instead of being estimated."* (`MarketNow.tsx:82`). `MemberPulse` returns `null` when signed out rather than showing placeholder numbers.

⚠ `QuickActions.tsx` links to `/trade-feed`, which is a `redirect()` alias for `/trade-opinions` — an unnecessary extra navigation hop from the homepage.

---

## 3. Values & item profiles (Adopt Me)

| Component | Lines | Notes |
|---|---|---|
| `app/values/page.tsx` | 135 | **`"use client"`** — imports `itemList` and does all filtering/sorting/pagination in the browser over 3,382 items |
| `SearchResults.tsx` | 11 | Thin list wrapper |
| `PetDetails.tsx` | 127 | Item profile: GCash + Elve summary, variant grid, `ValueHistoryCard`, related items |
| `values/ValueHistoryCard.tsx` | 127 | Fetches `/api/value-history`, aborts on unmount (`AbortController`) |
| `values/WishlistButton.tsx` / `WatchValueButton.tsx` | 39 / 43 | Direct Supabase writes, RLS-protected |
| `lib/relatedItems.ts` | 30 | Deterministic value-distance ranking, labelled "Deterministic · {source}" in the UI — honest |

**Architectural inconsistency:** `/api/items` implements server-side filtering, sorting, rarity facets and pagination for exactly this page — and **has zero consumers** (`grep "api/items"` outside its own directory → 0 hits). The page reimplements the same logic client-side. One of the two should go.

---

## 4. Calculators — two independent implementations

| | Adopt Me (`components/trade/`) | MM2 (`components/mm2/`) |
|---|---|---|
| Entry | `TradeCalculator.tsx` (644) | `MM2TradeCalculator.tsx` (687) |
| Item picker | `AddPetModal.tsx` (827) | `MM2AddWeaponModal.tsx` (361) |
| Side | `TradeSide.tsx` (347) + `TradePetCard.tsx` (215) | `MM2TradeSide.tsx` (175) + `MM2TradeWeaponCard.tsx` (149) |
| Result | `TradeSummary.tsx` (505) | `MM2TradeSummary.tsx` (259) + `MM2TradeBreakdown.tsx` (277) |
| Balance finder | ❌ | `MM2TradeBalanceFinder.tsx` (299) |
| URL codec | `lib/tradeContext.ts` (tilde format) | `MM2TradeWorkflow.ts` (JSON format) |
| **Shared code between them** | **none** | |

Feature matrix in `05_ADOPT_ME_DEEP_DIVE.md` §3 and `06_MM2_DEEP_DIVE.md` §3. The W/F/L thresholds happen to be identical (`≤5%` = FAIR) but are duplicated constants, not a shared function — a silent-divergence risk exactly of the kind `CLAUDE.md` warns about.

---

## 5. Exchange (shared engine — the architectural high point)

All nine components accept path props so the *same* code serves both games:

```
ExchangeHub(fixedGameId, exchangeBasePath, tradeOpinionsHref, loungeHref)
 ├── useExchangeData(supabase, user, authLoading, gameId, loadMarketEvents)
 ├── CreateListingPanel(gameId, initialSource, initialHave, initialWant)
 │    └── ExchangeItemBuilder(gameId) ── GameItemPicker(gameId) ── registry adapter
 ├── ListingCard(listing, match, …)
 ├── OfferComposer(listing, …)
 └── AccessibleDialog

ListingDetail(listingId, expectedGameId?, exchangeBasePath, …)
TradeRoomExperience(roomId, exchangeBasePath)  ── useTradeRoomData
MiddlemanDesk(exchangeBasePath)
ModerationDesk(exchangeBasePath)
```

This is genuinely well factored. The two gaps:
1. `TradeRoomExperience` has **no `expectedGameId`** — the only shared component without a scope guard.
2. `lib/exchange/matching.ts` (482 ln) is Adopt-Me-only. `ExchangeHub.tsx:153-156` branches: `gameId === "adopt-me" ? rankListingMatches(...) : basicMatches(...)` where `basicMatches` returns all-zero scores. MM2's "Find Trades" tab is therefore an unranked list. The UI is honest about it (`ExchangeHub.tsx:399` states MM2 inventory matching is "intentionally not applied").

`useExchangeData.ts` (409 ln) is the highest-coupling module in the repo: 11 pieces of state, 6 realtime subscriptions, legacy-schema fallbacks on 5 separate queries, and it is imported by both games' hubs. **Highest risk-if-modified file outside SQL.**

---

## 6. Community

| Component | Lines | Shared? | Notes |
|---|---|---|---|
| `community/CSBTLounge.tsx` | 836 | ✅ `fixedGameId` + 3 base-path props | 11 channels, reactions, replies, presence, image upload to `community-images` bucket, 5 MB cap |
| `community/TradeVotingBoard.tsx` | 460 | ✅ `fixedGameId` + 2 base-path props | Builds trades with `GameItemPicker`, W/F/L voting |
| `games/GameScopePicker.tsx` | 37 | ✅ | Only rendered when `fixedGameId` is absent — i.e. never, since all four pages pass it |
| `games/GameItemPicker.tsx` | 64 | ✅ | Adapter-driven search box |

`GameScopePicker` is effectively unreachable in the current route set: `CSBTLounge.tsx:685` renders it only `{!fixedGameId && …}`, and both `/lounge` and `/mm2/lounge` pass `fixedGameId`. It is not dead code (a future "all games" route would use it) but it is currently unreachable UI.

---

## 7. Account / notifications

`account/AuthCard.tsx` (158) · `ProfileDashboard.tsx` (421) · `NotificationCenter.tsx` (176) · `TradeHistory.tsx` (174) · `WishlistWatchlist.tsx` (68) — all Adopt-Me-only, all reachable only from the Adopt Me navbar. There is no MM2 equivalent and no MM2 entry point.

---

## 8. Nich AI (25 files, largest subsystem by file count)

```
GlobalNichAssistant ─dynamic─▶ NichAssistant ─dynamic─▶ NichChat (1,883)
                                             └dynamic─▶ NichIntroMascot (597)
NichChat ── useNich · useNichLocalData (397) · NichChatPersistence (797)
         └─▶ POST /api/nich, POST /api/nich/vision

brain/ (14 files, ~7,300 lines)   router · messageAnalysis · localIntelligence
                                  activeTrade · contextResolver · smartFallback
                                  tradeComparison · followUp · petLookup
                                  intentScoring · language · nearbyPets
                                  websiteKnowledge · types
tools/ (3)                        petSearch (3,008) · tradeComparison (1,631) · nearbySearch
memory/context.ts                 conversation context reset/merge
```

`brain/router.ts` is imported **by the server route** (`api/nich/route.ts:3`) — so the "local brain" runs server-side on the Worker, not in the browser. `useNichLocalData` is the browser-side data gatherer. Detail in `11_NICHAI_AUDIT.md`.

---

## 9. Oversized / high-coupling components

| File | Lines | Concern |
|---|---|---|
| `home/LiveCommunityFeed.tsx` | 3,043 | **Dead** — no importer |
| `nich/assistant/tools/petSearch.ts` | 3,008 | Single-purpose but enormous |
| `api/nich/route.ts` | 2,166 | Route handler doing routing, caching, provider selection, quota, prompt assembly |
| `nich/assistant/NichChat.tsx` | 1,883 | UI + upload + persistence + streaming |
| `mm2/MM2HQHome.module.css` | 1,193 | Largest CSS module |
| `nich/assistant/tools/tradeComparison.ts` | 1,631 | Duplicated concept with `brain/tradeComparison.ts` (453) |
| `community/CSBTLounge.tsx` | 836 | 11 channels + realtime + storage + presence in one file |
| `SearchBar.tsx` | 844 | **Dead** — no importer |
| `trade/AddPetModal.tsx` | 827 | Picker + filters + potion selection |
| `hooks/useExchangeData.ts` | 409 | 6 subscriptions, 5 fallbacks, 11 states |

---

## 10. Dead components (VERIFIED by transitive reachability closure)

**Method — corrected during the adversarial pass, see `23_ADVERSARIAL_VERIFICATION_AND_SCORING.md` C-1:** parse every static and dynamic import across all 226 `src` TS/TSX files, resolve `@/` and relative specifiers against the real file set, and walk the graph from all 65 Next.js entry files.

> An earlier grep-by-basename method reported 16 files / 4,982 lines. It cannot detect **transitively dead** modules — files whose only importer is itself dead. Corrected figure: **19 files / 6,268 lines**.

| File | Lines | Note |
|---|---|---|
| `home/LiveCommunityFeed.tsx` | 3,044 | |
| `nich/NichBody.tsx` | 1,088 | only importer is dead `NichMascot` |
| `SearchBar.tsx` | 845 | |
| `nich/NichMascot.tsx` | 247 | |
| `mm2/MM2Hero.tsx` | 150 | |
| `PopularPets.tsx` | 128 | |
| `mm2/MM2HeroSearch.tsx` | 119 | only importer is dead `MM2Hero` |
| `mm2/MM2MarketHighlights.tsx` | 100 | |
| `trade/SaveTradeButton.tsx` | 88 | |
| `mm2/MM2FeatureCards.tsx` | 78 | |
| `mm2/MM2CommunityHub.tsx` | 67 | |
| `nich/NichFace.tsx` | 63 | only importer is dead `NichMascot` |
| `mm2/MM2HomeBoard.tsx` | 59 | |
| `home/MM2TradingHQ.tsx` | 47 | |
| `mm2/MM2ValueCard.tsx` | 46 | |
| `mm2/MM2Trending.tsx` | 31 | |
| `AppFooter.tsx` | 29 | |
| `mm2/MM2ValueHero.tsx` | 24 | |
| `mm2/MM2ValueSearchPanel.tsx` | 15 | |
| **Total** | **6,268** | |

**Two dead clusters:**
```
NichMascot (247) → NichBody (1,088) + NichFace (63)   = 1,398 lines
MM2Hero    (150) → MM2HeroSearch (119)                =   269 lines
```
Verified directly: `/nich/page.tsx` renders `NichChat` plus a static `/nich/nich-face.png` image — it does **not** render `NichBody`.
Correctly **excluded**: `NichIntroMascot.tsx` (597) is reachable via `dynamic(() => import("../NichIntroMascot"))` at `NichAssistant.tsx:9`; `NichReactions.ts` is reachable via `useNich.ts`.

Transitively dead data: `src/data/homePopularItems.json` (only consumer is `PopularPets.tsx`).
Reachable-but-vestigial: `mm2/MM2DemandPanel.tsx` and `mm2/MM2TradePanel.tsx` — 1-line placeholders whose only consumer is the permanently broken `/mm2/item/[name]` route.

These are outside every import graph, so Turbopack tree-shakes them — **no runtime cost**. The cost is comprehension: `LiveCommunityFeed.tsx` and `SearchBar.tsx` are the #1 and #3 largest components in the repo, and `NichBody.tsx` is the second-largest Nich file — a newcomer will reasonably assume all three are load-bearing.

---

## 11. Two item pickers — and the newer, more central one is worse

Discovered while closing the coverage gap (`23` N-1).

| | `items/ItemSearchPicker.tsx` (192) | `games/GameItemPicker.tsx` (64) |
|---|---|---|
| Scope | Adopt Me only | **Both games** |
| Used by | `WishlistWatchlist`, `FeedbackForm`, `InventoryCalculator`, all 4 home heroes | **`ExchangeItemBuilder`, `TradeVotingBoard`** |
| ARIA | `role="combobox"/"listbox"/"option"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`, `aria-autocomplete`, `aria-selected` — **6 distinct** | **none** |
| Keyboard | Arrow Up/Down (wrapping) + Enter + Escape | **none** |
| Focus restored after select | ✅ `requestAnimationFrame` | ❌ |
| Images | `next/image` | raw `<img>` (`:52`) |

A keyboard-only user can manage their inventory and wishlist but **cannot build an Exchange listing or a Trade Opinions post** — in either game. The correct pattern already exists in this repository, 130 lines away.

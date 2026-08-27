# 13 — UI / UX Audit

Auditing the product as it is. No redesign proposed. Functional problems and art-direction observations are kept strictly separate.

---

# PART A — FUNCTIONAL UX PROBLEMS

## A-1 · MM2 mode is a dead end for account tasks — HIGH
`MM2Navbar` exposes six links: Home, Weapon Values, Trade Calculator, CSBT Exchange, Trade Opinions, CSBT Lounge — plus an `ADM | MM2` switcher.

There is **no path from MM2 to** `/profile`, `/notifications`, `/inventory`, `/wishlist`, `/trades`, `/feedback`, or `/seminar`. A user who receives an MM2 Exchange offer has no in-mode way to reach their notifications; they must click `ADM`, which drops them onto the Adopt Me homepage and loses MM2 context entirely.

Compounding it: server-generated notification links point at `/exchange/...` (Adopt Me), so acting on an MM2 notification silently changes the user's game mode.

**Minimum fix:** add Profile + Notifications to `MM2Navbar` (those routes are game-agnostic and would work as-is), and make the SQL `href`s game-aware.

## A-2 · "Open in Calculator" does nothing on Adopt Me — HIGH
Every Adopt Me trade card in Trade Opinions ends with **"Open in Calculator →"**. It navigates to `/calculator?source=…&your=…&their=…` and the calculator opens **empty**. The user's most likely next action after reading community votes is the one action that silently fails. Detail: `03_ROUTE_MAP.md` R-02.

## A-3 · Two calculators with different capabilities and different honesty — HIGH
| | `/calculator` | `/mm2/calculator` |
|---|---|---|
| Quantity | ✗ | ✓ 1–99 |
| Duplicate merge | ✗ (a second Frost Dragon becomes a second row) | ✓ |
| Share link | ✗ | ✓ |
| Recent trades | ✗ | ✓ |
| Balance Finder | ✗ | ✓ |
| Line-by-line breakdown | ✗ | ✓ |
| Missing value | silently counted as **0**, verdict still shown | **CHECK** — verdict withheld |

Users moving between games meet two different products. The Adopt Me version — the flagship — is the weaker one, and the silent-zero behaviour can produce a confident **WIN** on a trade the calculator could not actually price.

## A-4 · MM2 calculator offers a value source with no data — MEDIUM
`MM2TradeCalculator.tsx:391` renders a **GCash** option. All 1,099 MM2 items have `GCASH_VALUE: null`, so selecting it turns the entire trade into `CHECK`. It fails safely and truthfully, but it is an option that can never work. The game adapter already declares Supreme as MM2's only source (`registry.ts:151-153`) — the calculator disagrees with it.

## A-5 · `/mm2/item/[name]` always says "Not found" — MEDIUM
Broken under Next 16's async `params` (`03_ROUTE_MAP.md` R-01). Not linked from the UI, but it is indexable and shareable, and `MM2Navbar.tsx:76` still treats the prefix as an active nav state.

## A-6 · Homepage routes through two redirects — LOW
`QuickActions` "Vote on Trades" → `/trade-feed` → `redirect()` → `/trade-opinions`. `sitemap.ts` also advertises `/trade-feed` and `/community` as canonical. Both should point at the real routes.

## A-7 · No MM2 URLs in the sitemap — MEDIUM (discoverability)
`app/sitemap.ts:6` lists 15 Adopt Me routes plus 3,382 item pages. Zero MM2 entries — not `/mm2`, not `/mm2/values`, not the 1,099 weapon pages. Half the product is invisible to search.

## A-8 · Protected pages flash an unauthenticated state — LOW
Because there is no server-side session, `/profile`, `/inventory`, `/wishlist`, `/notifications` render as public shells, then a client effect resolves the session and swaps in an `AuthCard` or the real content. Unavoidable without an SSR auth client; worth a skeleton that does not read as "signed out".

## A-9 · MM2 pages carry no `loading.tsx` or `error.tsx` — LOW
Adopt Me has `loading.tsx`/`error.tsx` at the root and for `/values`, `/exchange`, `/community`, `/nich`. `src/app/mm2/**` has **none** — only `layout.tsx` (metadata-only). An MM2 render error falls through to the root `error.tsx`, which renders the **Adopt Me** shell.

## A-10 · Feedback and Trading Servers are Adopt-Me-only surfaces — LOW
`/feedback` posts `itemId`/`itemName` from the Adopt Me catalog only. `/trading-servers` lists Adopt Me communities. Neither is reachable from MM2.

---

# PART B — WHAT WORKS WELL (functional)

- **Empty and missing states are honest everywhere checked.** `formatTradeValue()` → `"N/A"`; `MarketNow` → `"Unavailable"` plus an explicit note that missing activity is not estimated; `/api/demand` failure → empty board, no invented trends; MM2 → `CHECK`.
- **Error boundaries** on five route segments, all sharing `FeatureError` with a working `reset()` and a "Back home" escape.
- **Loading states** are real skeletons (`loading.tsx` + `Suspense` fallbacks sized to the content), not spinners.
- **Recovery-oriented 404.** `not-found.tsx` offers Search Values / Open Exchange / Home rather than a dead end.
- **Cross-game guard messaging** on `/mm2/exchange/[id]`: *"This listing belongs to Adopt Me, not the current MM2 mode."* — precise and actionable.
- **MM2 migration messaging**: *"MM2 Lounge needs the included multi-game Supabase migration before posting."* — tells the operator exactly what to do.
- **Destructive-action confirmation** on lounge post deletion (`window.confirm`).
- **Progressive disclosure** in Exchange: 5 core tabs + 3 advanced (`Live Feed`, `Market`, `Trading Style`).
- **`MemberPulse` next-best-action** — computes the single most useful next step (add Roblox username → build inventory → add wishlist → review offers) instead of a generic dashboard.

---

# PART C — ACCESSIBILITY

Measured across `src/**/*.tsx` and `globals.css`:

| Signal | Count |
|---|---|
| `aria-label` | 126 |
| `aria-hidden` | 171 |
| `aria-current` | 19 |
| `aria-live` | 8 |
| `aria-pressed` | 7 |
| `role=` | 27 |
| `alt=""` (decorative) | 37 |
| `sr-only` | 12 |
| `useReducedMotion()` | 54 |
| `@media (prefers-reduced-motion: reduce)` blocks | 8 |
| Components with ≥44 px touch targets (`min-h-11`+) | 42 |

**Strengths**
- `useReducedMotion()` in 54 components, plus `MotionConfig reducedMotion="user"` globally (`PerformanceProvider.tsx:17`) and CSS-level reduced-motion blocks. This is thorough.
- `AccessibleDialog.tsx` implements a real focus trap; `AddPetModal` and `ExchangeHub` use it.
- Live regions on the results that change: `TradeSummary` and `MM2TradeSummary` are `aria-live="polite"`; the mobile calculator aside is too.
- `aria-current="page"` on both navbars; `aria-pressed` on toggles (`GameSwitcher`, W/F/L vote buttons, values filters).
- Decorative art consistently `aria-hidden` or `alt=""`.
- `<html lang="en">` + `suppressHydrationWarning` + `colorScheme` set per theme so native controls match.

**Gaps**

### 🔴 The most serious accessibility defect: `GameItemPicker` is mouse-only (found in the adversarial pass — `23` N-1)

The repository contains **two** item pickers, and the newer, more strategically central one is far worse:

| | `items/ItemSearchPicker.tsx` (192 ln) | `games/GameItemPicker.tsx` (64 ln) |
|---|---|---|
| Scope | Adopt Me only | **Both games** |
| Used by | `WishlistWatchlist`, `FeedbackForm`, `InventoryCalculator`, all 4 home heroes | **`ExchangeItemBuilder`, `TradeVotingBoard`** |
| ARIA roles/attributes | `role="combobox"/"listbox"/"option"` + `aria-expanded`, `aria-controls`, `aria-activedescendant`, `aria-autocomplete`, `aria-selected` — **6 distinct** | **0** |
| Arrow-key navigation | ✅ Up/Down with wraparound | ❌ |
| Enter to select, Escape to close | ✅ | ❌ |
| Focus restored after selection | ✅ `requestAnimationFrame` | ❌ |
| Images | `next/image` | raw `<img>` (`:52`) |

**Consequence:** a keyboard-only or screen-reader user can manage their inventory and wishlist, but **cannot create an Exchange listing or post to Trade Opinions** — in either game. Those are the product's two core community actions.

This is not a hard problem to fix: the fully-accessible implementation already exists in the same repository, 130 lines away, and was written first. The multi-game rewrite dropped it.

### Other gaps
- **9+ raw `<img>`** with no width/height (ESLint reports 14 `no-img-element` warnings) in `MM2DemandIntelligence`, `MM2ValueCard`, `MM2WeaponCard`, `MM2TradeWeaponCard`, `MM2WeaponDetails`, `TradeVotingBoard`, `GameItemPicker`, `ExchangeItemBuilder`. These cause layout shift and skip Next's optimiser — even though `next.config.ts` already whitelists `supremevalues.com/media/**`.
- `aria-disabled` on the calculator's `Link`s (`TradeCalculator.tsx:566-567`) is paired with `pointer-events-none` but the link stays in the tab order — keyboard users can focus and activate a "disabled" control.
- No skip-to-content link, despite a 268/288 px sidebar preceding main content on every page.
- `TradeVotingBoard.tsx:52` disables the vote buttons for signed-out users with no accessible explanation of *why*.
- Contrast risk: the MM2 palette uses `text-zinc-700` and `text-zinc-800` on `#05070a`/`#090d14` backgrounds (e.g. `MM2Navbar.tsx:123, 127`) — likely below WCAG AA for the small, wide-tracked labels it is applied to. Not measured; flagged as **POSSIBLE ISSUE**.

---

# PART D — RESPONSIVENESS

Breakpoint usage across all TSX: `sm:` 776 · `lg:` 241 · `xl:` 68 · `md:` 45 · `2xl:` 12.

The `sm:`-heavy distribution indicates a genuine mobile-first authoring style rather than desktop shrinking. Evidence of real recomposition rather than scaling:
- Both navbars render a **fixed sidebar** on `lg:` and a **separate sticky top bar** on mobile — different DOM, not a hidden sidebar.
- The Adopt Me calculator renders `TradeSummary` only on `lg:` and a **fixed bottom result aside** on mobile (`TradeCalculator.tsx:575-633`) — a different result presentation for each form factor.
- `globals.css` has dedicated `@media (max-width: 767px)` and `@media (max-width: 1023px)` blocks (`:798`, `:841`, `:872`), plus `@media (min-width: 1024px)` and `(min-width: 1536px)` workspace expansions (`:961`, `:969`) — i.e. large-desktop is explicitly designed for, not just left to `max-width`.
- `overflow-x-hidden` on `<body>` and on most `<main>` elements guards against horizontal scroll.

**Gaps**
- `2xl:` appears only 12 times. On a 1600 px+ display most pages cap at `max-width: 1450–1680px` and the remaining space is empty — acceptable, but density above 1600 px is unexploited.
- `MM2Navbar`'s mobile bar puts all six nav items in a horizontally scrolling row of 32 px-tall chips (`:196-212`) — **below the 44 px touch-target minimum** the rest of the app respects.
- `.mm2-control-rail` is `fixed inset-y-0 … overflow-y-auto`, so on a short laptop viewport the MM2 rail scrolls independently. Fine, but the `Game Network` switcher sits in `mt-auto` and can end up below the fold.

---

# PART E — ART DIRECTION (observations only, no functional impact)

- **Two visual systems.** Adopt Me uses CSS custom properties from `globals.css` (`--surface-1`, `--brand-primary`, `--radius-card`) across four themes (Dark, Halloween, Roblox-light, Snoopy). MM2 uses hard-coded hex (`#05070b`, `#07080d`, `#090d14`) plus crimson accents. `.mm2-social-mode` (`globals.css:4826-4882`) bridges the shared social components into MM2's palette.
- **MM2's lighting is motivated**, which is what `CLAUDE.md` asks for: the crimson glow comes from the active nav item (`inset 3px 0 0 rgba(240,55,77,.8)`), the rail edge (`:4917` `::after`), and panel borders — not from a generic red haze. The `mm2-control-rail` reads as a facility fixture.
- **MM2 avoids the listed anti-patterns**: no diagonal-line overlays, no fake HUD chrome, no particle fields. The `00`–`05` nav codes are the closest thing to "meaningless technical labels", and they are subtle.
- **Adopt Me's calculator is stylistically older** than the rest of the app — it still uses raw Tailwind palette classes (`from-yellow-400`, `via-orange-500`, `border-cyan-300`) and four stacked decorative gradient layers (`TradeCalculator.tsx:396-404`), while the surrounding app has moved to the `--surface-*` token system. Visually it is the least current screen in the product.
- **157 `!important` declarations** in `globals.css`, concentrated in theme overrides such as `[data-theme="light"] .csbt-lounge [class*="text-white/"] { color: … !important }` (`:1272-1273`). These exist to force Tailwind utility colours to obey the theme in shared components — a symptom of mixing hard-coded utilities with a token system, and a specificity trap for future edits.
- **4,953-line `globals.css`** with only two CSS Modules (`MM2HQHome.module.css`, `MM2TradeCalculator.module.css`). `CLAUDE.md` prefers CSS Modules; MM2's newest work follows that, the rest does not.

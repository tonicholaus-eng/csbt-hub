# 00 — MM2 Visual Diagnosis

**Scope:** MM2 mode only. **Branch:** `calculator-redesign-v2`. **Date:** 2026-08-28
**Method:** dev server on `localhost:3000`, driven with Playwright/Chromium. Every MM2 surface
captured full-page at 1920×1080, plus 1366/768/390 for the primary five. Contrast, font size and
touch-target numbers below are **measured in the browser**, not estimated.

> The signed-out onboarding gate (`NichAssistant` → `NichIntroMascot`) covers every route including
> MM2, so all screenshots were taken with that overlay removed in-page. See CRIT-2.

---

## Coverage ledger

| Surface | Route | Captured | Notes |
|---|---|---|---|
| Home | `/mm2` | ✅ 1920/1366/768/390 | |
| Weapon Values | `/mm2/values` | ✅ 1920/1366/768/390 | |
| Weapon Profile | `/mm2/values/[id]` | ✅ 1920/1366/768/390 | `mm2-rainbow-gun-godly` |
| Demand | `/mm2/demand` | ✅ 1920/1366/768/390 | |
| Calculator | `/mm2/calculator` | ✅ 1920/1366/768/390 | empty state only — picker is client-side |
| Exchange | `/mm2/exchange` | ✅ 1920 | signed-out + no DB → error + empty states |
| Trade Opinions | `/mm2/trade-opinions` | ✅ 1920 | signed-out + no DB |
| Lounge | `/mm2/lounge` | ✅ 1920 | signed-out + no DB |
| Middleman | `/mm2/exchange/middleman` | ✅ 1920 | auth-gated |
| Moderation | `/mm2/exchange/moderation` | ✅ 1920 | auth-gated |
| Listing detail | `/mm2/exchange/[id]` | ⚠️ not captured | requires a real listing row |
| Trade room | `/mm2/exchange/rooms/[id]` | ⚠️ not captured | requires a real room row |

**Not verifiable locally:** listing detail, trade rooms, authenticated Exchange/Lounge/Opinions
states, and the signed-in item pickers. No Supabase multi-game migration is applied, so those
surfaces render their migration/auth notices instead of content. Anything claimed about them in this
document is inferred from source, and is labelled as such.

---

# CRITICAL UX

### CRIT-1 · Every MM2 weapon image is broken — VERIFIED

The single largest visual defect in MM2, and it affects almost every surface.

`MM2WeaponCard`, `MM2WeaponDetails`, `MM2RelatedWeapons`, `MM2DemandIntelligence`,
`MM2TradeWeaponCard` and `MM2AddWeaponModal` all build `https://supremevalues.com/media/…` URLs from
the `IMAGE` field. That host is behind Imperva/Incapsula bot protection and answers image requests
with a **212-byte HTML challenge stub under a 200 status**:

```
$ curl -s https://supremevalues.com/media/mm2commons/8Bit.webp
<html><head><META NAME="robots" CONTENT="noindex,nofollow">
<script src="/_Incapsula_Resource?SWJIYLWA=..."></script><body></body></html>
```

Measured in Chromium (`img.complete && img.naturalWidth === 0`):

| Route | Broken | Total `<img>` |
|---|---|---|
| `/mm2/values` | **60** | 62 |
| `/mm2/values/mm2-rainbow-gun-godly` | **7** | 9 |
| `/mm2/demand` | **47** (+9 still pending) | 58 |

The only images that load anywhere in MM2 are `/logo.png` and the four local
`public/themes/mm2/*.png` art files. All 1,099 weapons render as empty boxes — and because the
markup is a bare `<img>` with no `onError`, the profile page renders the browser's broken-image
glyph next to the literal alt text *"Rainbow Gun"*.

**Why it matters:** the brief asks for a weapon showroom. The showroom currently has no weapons in
it. No amount of panel styling fixes a catalog of 1,099 empty rectangles.

**Recommendation:** this is not a "fetch the images" task — re-hosting a third party's art is a
product/licensing decision, not a design one. What design *can* fix is that the failure is currently
undesigned. Give MM2 a real, rarity-aware fallback plate that reads as a display case, and wire
`onError` so a failed fetch lands on it instead of a broken glyph. If the images ever start
resolving, the plate simply stops being seen.

### CRIT-2 · The signed-out gate over MM2 is entirely Adopt-Me-styled — VERIFIED

`GlobalNichAssistant` mounts on every route. It hides the floating Nich launcher on `/mm2/**`, but
the **hard sign-in gate is not hidden** — `NichAssistant.tsx:84-89` (*"No account = hard onboarding
gate. It cannot be skipped."*).

So the first thing any signed-out visitor sees in MM2 is a yellow-and-navy Adopt Me modal on a slate
scrim, with an amber "Sign in" button, over the crimson MM2 command deck. The MM2 identity is lost
before the user ever sees it. `authLoading` also renders a `bg-slate-950/80` veil first.

**Recommendation:** keep the gate and its behaviour exactly as-is — it is a deliberate product rule.
Skin it for MM2 via the existing route context. This is the single highest-leverage identity fix on
the list: it is literally the first frame of MM2.

### CRIT-3 · Sidebar labels fail WCAG AA by 2–3× — VERIFIED (measured)

Measured foreground/background after compositing every ancestor, at 1920 on `/mm2`:

| Text | Size | Colour on | Ratio | Needs |
|---|---|---|---|---|
| `00`–`05` nav codes | 7px | `rgb(39,39,42)` on `rgb(5,7,11)` | **1.35:1** | 4.5:1 |
| `Trading Operations`, `Community Network` | 7px | `rgb(63,63,70)` | **1.93:1** | 4.5:1 |
| `Command Deck`, `Values & Demand`, `Build & Analyze`, `Listings & Offers`, `Community W / F / L`, `Community Room` | 9px | `rgb(63,63,70)` | **1.93:1** | 4.5:1 |
| `Game Network`, `MM2 ACTIVE` | 7px | `rgb(63,63,70)` | **1.93:1** | 4.5:1 |
| `MM2 Trading Headquarters` | 8px | `rgb(82,82,92)` | **2.61:1** | 4.5:1 |
| `ADM` (game switcher) | 10px | `rgb(82,82,92)` | **2.66:1** | 4.5:1 |

49 text nodes on `/mm2`, 32 on `/mm2/values`, 26 on `/mm2/calculator` fall below AA. The audit
flagged this as a POSSIBLE ISSUE; it is confirmed, and the `01`–`05` codes at 1.35:1 are effectively
invisible rather than merely subtle.

Half of every nav row — the sublabel that explains what the destination *is* — is unreadable.

### CRIT-4 · MM2 Calculator is wearing Adopt Me's colours — VERIFIED

`/mm2/calculator` is the strongest MM2 feature and the weakest MM2 *surface*. Your Offer is an
**amber→orange** gradient header with an orange "+ Add Weapon" bar and an amber total; Their Offer is
**cyan→blue** with a cyan total; the divider is a glowing **orange** `VS` disc. There is no graphite,
no gunmetal, no crimson anywhere in the working area.

Placed next to `/mm2` this does not read as the same product. It reads as the Adopt Me calculator
with the word "Weapon" substituted for "Pet".

Compounding it, the toolbar and action buttons use raw emoji as icons (`Supreme Values`,
`Swap Offers`, `Clear Trade`, `Find Trades`, `Ask Trade Opinions`, `Copy Trade Summary`,
`Copy Trade Link`, `Save Trade` all carry an emoji glyph) while every other MM2 surface uses a
consistent stroked SVG set.

**Do not touch:** quantity handling, duplicate merging, `CHECK` semantics, source switching, URL
hydration, share links, recent trades, Balance Finder, verdict logic. This is a skin problem, not a
logic problem.

### CRIT-5 · Calculator empty state has ~700px of dead black — VERIFIED

At 1920 the offer panels end at y≈975 and Balance Finder starts at y≈1640. Two-thirds of the first
screen after the fold is empty. The page is 1,954px tall with nothing in the middle of it.

---

# HIGH-IMPACT VISUAL

### HIV-1 · Seven different content widths across ten MM2 routes — VERIFIED

| Route | Max width |
|---|---|
| `/mm2/values/[id]` | `1260px` |
| `/mm2/calculator` | `1380px` |
| `/mm2/values` | `1450px` |
| `/mm2/demand` | `1500px` |
| `/mm2/trade-opinions`, `middleman`, `moderation` | `1560px` |
| `/mm2/exchange/[id]`, `rooms/[id]` | `1640px` |
| `/mm2/exchange`, `/mm2/lounge` | `1680px` |

Navigating Values → Profile shrinks the measure by 190px and shifts every left edge. Nothing in MM2
shares a column. On a 1920 display the profile page leaves a ~186px black gutter on each side of an
already narrow page while Exchange runs 420px wider.

### HIV-2 · The homepage says the same four numbers four times — VERIFIED

`1,099 weapons`, `910 demand-rated`, `14 categories`, `Supreme Values` appear in:

1. `headerReadout` (top right),
2. `consoleTelemetry` (bottom of the trading console),
3. `stationFactRow` on the Weapon Values station,
4. the entire bottom `systemRail` section.

The bottom rail is a full-width section whose only content is a fourth printing of numbers already
on screen. Repetition is not hierarchy.

### HIV-3 · The "Choose your station" grid has a card-sized hole in it — VERIFIED

The Weapon Values station spans two rows but only has one row of content: its copy ends at y≈1230
and its CTA is pinned at y≈1456, leaving ~220px of empty black inside the card. Its background art
(`neon-karambit-smoke-emblem.png`) is a barely-visible red smudge at the top edge, so the space reads
as an accident rather than as breathing room.

### HIV-4 · Weapon profile leads with an unmotivated red slab — VERIFIED

The hero is a flat `linear-gradient` crimson block roughly 340px tall, the loudest surface in MM2,
and its light comes from nowhere. It is the "giant red haze" `CLAUDE.md` explicitly warns against —
and it is directly adjacent to the broken weapon image it is supposed to be lighting.

### HIV-5 · Weapon profile prints the same two values twice — VERIFIED

`SUPREME VALUE 420` / `GCASH VALUE 530` in the top pair of panels, then **VALUE BREAKDOWN → "Current
weapon values" → `SUPREME 420` / `GCASH 530`** in a near-identical pair directly below. Same numbers,
same order, ~200px apart, no added information.

The `Weapon information` panel beside Demand profile is stretched to match its neighbour's height
with four rows of content, leaving its bottom ~40% empty.

### HIV-6 · Demand leaderboard leaves a ~420px void — VERIFIED

`Strongest demand in the database` holds 8 entries in a 2-column grid; the `Category radar` beside it
lists 11 categories and is far taller. The leaderboard column is padded out with dead space to match.

### HIV-7 · The Lounge is violet — VERIFIED

`.mm2-social-mode` (`globals.css:4826-4870`) remaps surfaces and brand colours but passes
Adopt Me's accents straight through: `--purple: #a78bfa`, `--green: #34d399`, `--cyan: #67e8f9`,
`--rose: #fb7185`. Result: indigo channel avatars, an indigo→violet **"Enter CSBT Lounge"** primary
button, and a green LIVE dot, inside MM2. Channel icons are raw emoji.

### HIV-8 · Off-palette accents leak across MM2 — VERIFIED

- `/mm2/values`: the `Open Demand Intel →` chip is **cyan**; every weapon card's `Demand Intel`
  action is **cyan**.
- `/mm2/exchange`: `Open MM2 Calculator` is a fully saturated red — the only fully saturated element
  in MM2 — and it sits next to a **green** safety strip and an **amber** `CURRENT MARKET` eyebrow.
- `/mm2/values/[id]`: the bottom `+ Add to Calculator` is the same saturated red.

MM2's rule is *restrained* crimson. These are the opposite: maximum-chroma accents used for emphasis
where hierarchy should have come from contrast and placement.

### HIV-9 · Trade Opinions renders its own title twice — VERIFIED

`app/mm2/trade-opinions/page.tsx` renders `<h1>Trade Opinions</h1>` in an MM2 header panel; the
shared `TradeVotingBoard` then renders **COMMUNITY FEED → "Trade Opinions"** again ~550px below.
Three stacked full-width header panels appear before any content does.

### HIV-10 · Mobile nav chips are 32px and the brand block eats three lines — VERIFIED

`MM2Navbar.tsx:196-212` renders all six destinations as `h-8` (32px) chips — below the 44px target
the rest of the app respects — in a horizontally scrolling row with no scroll affordance. Beside
them the brand stack wraps to *"CSBT HUB / MM2 COMMAND / DECK"* on a 390px screen.

### HIV-11 · Weapon Values cards have no rarity hierarchy — VERIFIED

A 1,000,000-value GODLY and an 11-value COMMON are rendered with identical weight, identical border,
identical layout. `rarityTone()` only tints the 76px image frame — which is empty (CRIT-1), so in
practice the rarity signal is invisible. Three micro-actions (`Profile` / `Demand Intel` / `+ Trade`)
sit in an 8px-font footer strip on every card, repeated 60 times per page.

---

# POLISH

- **P-1 · Sub-40px touch targets** (measured): category filter chips 33px; `Open Demand Intel →`
  33px; the five homepage station CTAs 39px; `← All weapon values` 34px; `Browse all →` **16px**;
  `Open Demand Intelligence →` on the homepage console **12px**.
- **P-2 · Decorative technical text.** `DISPLAY CHAMBER 01` and the vault's lower rail
  (`CSBT / MM2 · COLLECTIBLE MARKET FACILITY · SECURE DISPLAY`) carry no information at 6–7px. This
  is the "meaningless technical labels" pattern `CLAUDE.md` lists as an anti-pattern.
- **P-3 · `Type: OTHER`** is surfaced on every weapon profile. `TYPE` is `"OTHER"` for all 1,099
  weapons (the source column is empty — audit finding M-02). It is a field that tells the user
  nothing, presented as if it were data.
- **P-4 · Unformatted number.** `/mm2/exchange` shows `1099 DATABASE ITEMS`; everywhere else in MM2
  formats it `1,099`.
- **P-5 · `.mm2-control-rail` is declared four times** in `globals.css` (`:4884`, `:4899`, `:4909`,
  `:4930`) with three competing `!important` `box-shadow` blocks. Only the last wins; the other two
  are dead weight, and the file is exactly the specificity trap `CLAUDE.md` warns about.
- **P-6 · Emoji as iconography** in the calculator toolbar and Lounge channel list, against a
  consistent stroked-SVG set everywhere else.
- **P-7 · No `loading.tsx` / `error.tsx` under `src/app/mm2/**`** (audit A-9). An MM2 render error
  currently falls through to the root boundary, which paints the **Adopt Me** shell.

---

# DO NOT CHANGE

These are working. Redesigning them would be activity, not improvement.

1. **The Weapon Vault installation on `/mm2`.** `neon-armory-market-showcase.png` inside the framed
   vault architecture is the best thing in MM2 — motivated lighting, real depth, unmistakably MM2.
   Keep the art, keep the frame, keep the contact light.
2. **The control rail's structure and motivated lighting.** `inset 3px 0 0` crimson on the active
   row, the rail-edge `::after` seam, the two-cell ADM|MM2 switcher, the 288px width, the grouping
   into Trading Operations / Community Network. Only the *legibility* is broken, not the design.
3. **Every honesty state.** `CHECK` withholding, `N/A` for unpriced weapons, `Unrated` demand
   badges, *"Historical MM2 value points are not stored in the current dataset, so CSBT does not
   fabricate a trend line"*, the `VALUE HEALTH` provenance block, the cross-game guard copy, and the
   migration notices. These are the product's strongest quality signal.
4. **`Value health` / `2/2 listed values`.** Genuinely useful, genuinely truthful, well laid out.
5. **Demand profile stats** (`category average`, `category rank #20 of 126`, `global rank #65 of
   910`) — real derived data, clearly ranked, correctly sourced.
6. **The empty states' copy** on Exchange, Opinions and Lounge. Specific and actionable.
7. **Route structure and game scoping.** No route changes are proposed anywhere in this document.

---

# Strongest existing areas

MM2 is already avoiding most of the traps: there are no diagonal-line overlays, no fake HUD chrome,
no particle fields, no invented market activity, and no fabricated trend lines. The lighting on the
homepage and control rail is motivated. The problem is not that MM2 is over-decorated — it is that
**the good ideas are undermined by unreadable type, missing imagery, inconsistent measure, and three
surfaces still wearing Adopt Me's palette.**

---

# Priority order for implementation

| Batch | Work | Addresses |
|---|---|---|
| 1 | MM2 design tokens; sidebar legibility; shared-gate skin; MM2 shell + one measure; `loading`/`error` | CRIT-2, CRIT-3, HIV-1, P-5, P-7 |
| 2 | Homepage composition: station grid, redundancy, decorative text | HIV-2, HIV-3, P-1, P-2 |
| 3 | Weapon image fallback; Values card hierarchy; profile hero + duplication; Demand balance | CRIT-1, HIV-4, HIV-5, HIV-6, HIV-11, P-3 |
| 4 | Calculator MM2 skin + empty-state composition | CRIT-4, CRIT-5, P-6 |
| 5 | Exchange / listing / rooms accents | HIV-8, P-4 |
| 6 | Trade Opinions duplication; Lounge palette | HIV-7, HIV-9 |
| 7 | Responsive + accessibility sweep; Adopt Me regression check | HIV-10, P-1 |

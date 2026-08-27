# 02 — MM2 Final Design Review

**Branch:** `calculator-redesign-v2` · local only · **Date:** 2026-08-28

> Nothing was pushed, deployed, merged to `main`, or applied to any database.
> No Cloudflare, Supabase or workflow setting was touched. Adopt Me was not
> redesigned.

---

## 1. MM2 surfaces changed

| Surface | Changed | Batch |
|---|---|---|
| Control rail / mobile nav | ✅ | 1 |
| Signed-out account gate (as seen inside MM2) | ✅ | 1 |
| `/mm2` home | ✅ | 2 |
| `/mm2/values` | ✅ | 3 |
| `/mm2/values/[id]` | ✅ | 3 |
| `/mm2/demand` | ✅ | 3 |
| `/mm2/calculator` (+ side, summary, breakdown, balance finder, weapon card, add-weapon modal) | ✅ | 4 |
| `/mm2/exchange` | ✅ | 5 |
| `/mm2/trade-opinions` | ✅ | 6 |
| `/mm2/lounge` | ✅ | 6 |
| `/mm2/exchange/middleman`, `/moderation` | shell + tokens only | 1, 5 |
| `/mm2/exchange/[id]`, `/rooms/[id]` | shell + tokens only — **not visually verified**, they need a real listing/room row | 1, 5 |

---

## 2. The biggest visual improvements

**1. MM2 has weapons again.** Every MM2 weapon image was broken — the catalog
art host answers image requests with a bot-check HTML stub under a 200 status.
Measured before: 60 of 62 `<img>` on `/mm2/values`, 7 of 9 on a weapon profile,
47+ on `/mm2/demand`. A catalog of 1,099 empty rectangles is not a weapon
showroom, and no amount of panel styling fixes it. There is now a designed
rarity-lit display plate carrying the weapon's own initials, which the real art
covers completely if it ever loads.

**2. The control rail is readable.** Sublabels measured **1.93:1** and the
`00`–`05` codes **1.35:1** against near-black. Half of every nav row — the line
that says what the destination *is* — was invisible.

**3. MM2's first frame is MM2.** The signed-out gate is unskippable by product
design and mounts on every route, so the first thing a new MM2 visitor saw was a
yellow-and-navy Adopt Me modal over the crimson command deck. Same gate, same
rules, MM2 surface.

**4. The calculator belongs to MM2.** It was amber-vs-cyan with a pulsing orange
`VS` disc — the Adopt Me calculator with "Weapon" substituted for "Pet". It now
reads as crimson (what leaves) against steel (what arrives).

**5. The homepage stopped repeating itself.** The same four numbers appeared
four times, and the station grid had a ~220px hole inside its largest card.

---

## 3. Interaction improvements

- Touch targets: mobile nav chips 32→44px; category filter chips 33→44px;
  station CTAs 39→46px; the homepage demand link had a **12px-tall** hit area
  and `Browse all →` a **16px** one — both now 44px.
- Two permanent animations removed (the `VS` disc, the verdict glyph). MM2 now
  runs no infinite animation outside the homepage vault's existing 10s loop.
- The verdict panel no longer requires scrolling to appear. It was
  `whileInView`+`once`, so an `aria-live` result stayed at `opacity: 0` until
  scrolled to.
- Focus, hover and selected states were moved onto one accent instead of five.

---

## 4. Responsive

Ten MM2 routes at 1920 / 1600 / 1440 / 1366 / 768 / 390: **no horizontal
overflow at any width**, zero page errors.

Content measure went from **seven different max-widths across ten routes**
(1260–1680px) to two tiers, so moving Values → Profile no longer shrinks the
column by 190px and shifts every left edge. Values gains a fourth column above
1536px, which is where the previous 3-up grid left the cards wide and empty.

---

## 5. Accessibility

Every signal preserved or increased against baseline `702fd46`: `aria-label`
127→132, `aria-hidden` 172→178, `aria-live` 8→8, `aria-pressed` 7→7,
`useReducedMotion` 54→54, and the combobox trio
(`aria-expanded`/`-controls`/`-activedescendant`) unchanged at 5/3/3 — the
`GameItemPicker` keyboard work was not touched.

WCAG AA text contrast, measured in Chromium at 1920 by compositing each
element's real background:

| Route | Before | After |
|---|---|---|
| `/mm2` | 49 failures | **0** |
| `/mm2/values` | 32 failures | **0** |
| `/mm2/calculator` | 26 failures | **0** |

---

## 6. Performance

No measurement was taken, and none is claimed.

What can be said structurally: no new dependency, no new client bundle, and no
change to the compact-index work that removed 1.86 MB earlier on this branch.
`MM2WeaponPlate` is the only new client component and it is ~70 lines with one
`useState`. Two infinite `framer-motion` loops were removed, and one
`whileInView` observer per calculator render. The plate renders one `<img>`
where the old markup rendered one `<img>`.

The reused local artwork is unchanged; nothing new was added to `public/`.

---

## 7. Remaining visual weaknesses

**Honest list of what is still not right.**

1. **The weapon art is still not loading.** The plate is a designed fallback,
   not a fix. Getting real MM2 weapon imagery needs a first-party source — a
   licensing and pipeline decision, not a design one. Until then MM2 shows
   initials where a showroom wants photographs. This is the single biggest
   remaining gap between MM2 and "premium".
2. **Listing detail and Trade Rooms were never seen.** They need a real listing
   and a real room row, which needs the multi-game Supabase migration applied.
   They inherit the shell, the tokens and the accent containment, but no claim
   is made about their composition.
3. **No authenticated MM2 surface was seen** — listing creation, offer modals,
   the signed-in item pickers, Lounge posting, voting. The modal audit the brief
   asked for covers `MM2AddWeaponModal` (plate + type) but could not exercise
   `GameItemPicker` signed-in.
4. **Ten dead MM2 components** (`MM2Hero`, `MM2HeroSearch`, `MM2FeatureCards`,
   `MM2CommunityHub`, `MM2MarketHighlights`, `MM2Trending`, `MM2ValueCard`,
   `MM2ValueHero`, `MM2ValueSearchPanel`, `MM2HomeBoard`) are imported by
   nothing but each other. They still carry the old broken-image markup and
   off-palette styling, and they account for all 7 remaining lint warnings.
   Deleting them is your call, not a design change — left untouched.
5. **`Safety rules →` (15px) and an inline `Sign in` (18px)** are below 32px but
   live in shared Adopt Me markup; fixing them in place would change Adopt Me.
6. **The homepage vault bay has an empty left third.** It reads as architectural
   space, but it is the weakest remaining composition on `/mm2`.
7. **`/mm2/demand`'s browser grid is still visually uniform** — 1,051 cards of
   equal weight. It got the plate, the balance fix and legible type, but not the
   rarity hierarchy the Values cards got.
8. **`sitemap.ts` still lists no MM2 routes.** Out of scope here, and correct to
   leave while MM2 is unreleased.

---

## 8. Correction to the diagnosis

`00_VISUAL_DIAGNOSIS.md` **CRIT-5** described "~700px of dead black" in the
calculator's empty state. That was partly a **screenshot artefact**: the result
panel used `whileInView` with `once: true`, so a full-page capture that never
scrolls left it at `opacity: 0`. In a real browser it faded in on scroll.

The real defect was narrower and worth fixing anyway — an `aria-live` result
panel should not require scrolling to become visible — and the change closes the
empty-state gap as a side effect. The diagnosis is left as written, with this
correction recorded here and in the implementation log.

---

## 9. Files changed

**New (7)**
```
src/components/mm2/MM2Shell.tsx
src/components/mm2/MM2PageHeader.tsx
src/components/mm2/MM2WeaponPlate.tsx
src/lib/mm2/rarity.ts
src/app/mm2/loading.tsx
src/app/mm2/error.tsx
docs/design/mm2/{00,01,02}_*.md
```

**MM2-owned, modified (16)**
```
src/app/mm2/page.tsx                       src/components/mm2/MM2Navbar.tsx
src/app/mm2/values/page.tsx                src/components/mm2/MM2HQHome.tsx
src/app/mm2/values/[id]/page.tsx           src/components/mm2/MM2HQHome.module.css
src/app/mm2/demand/page.tsx                src/components/mm2/MM2ValuesBrowser.tsx
src/app/mm2/calculator/page.tsx            src/components/mm2/MM2WeaponCard.tsx
src/app/mm2/exchange/page.tsx              src/components/mm2/MM2WeaponDetails.tsx
src/app/mm2/exchange/[id]/page.tsx         src/components/mm2/MM2RelatedWeapons.tsx
src/app/mm2/exchange/rooms/[id]/page.tsx   src/components/mm2/MM2DemandIntelligence.tsx
src/app/mm2/exchange/middleman/page.tsx    src/components/mm2/MM2TradeCalculator.tsx
src/app/mm2/exchange/moderation/page.tsx   src/components/mm2/MM2TradeSide.tsx
src/app/mm2/trade-opinions/page.tsx        src/components/mm2/MM2TradeSummary.tsx
src/app/mm2/lounge/page.tsx                src/components/mm2/MM2TradeBreakdown.tsx
src/lib/mm2/catalog.ts (doc comment)       src/components/mm2/MM2TradeBalanceFinder.tsx
                                           src/components/mm2/MM2TradeWeaponCard.tsx
                                           src/components/mm2/MM2AddWeaponModal.tsx
```

**Shared, modified (6) — all proven Adopt-Me-neutral**
```
src/app/globals.css                         every added rule is .mm2-* scoped
src/components/exchange/ExchangeHub.tsx     MM2 branch only
src/components/community/TradeVotingBoard.tsx  new prop, defaults to old behaviour
src/components/nich/GlobalNichAssistant.tsx    passes gameTone only on /mm2
src/components/nich/assistant/NichAssistant.tsx
src/components/nich/NichIntroMascot.tsx        gameTone undefined -> original literals
```

---

## 10. Validation performed

| # | Command / check | Result |
|---|---|---|
| 1 | `npx tsc --noEmit -p tsconfig.json` | **0 errors** |
| 2 | `npx eslint .` | **0 errors**, 7 warnings (was 14) — all raw `<img>` in the dead components above |
| 3 | `npm test` | **113 pass, 0 fail** |
| 4 | `npm run data:validate` | 3,382 items, 3,382 unique IDs |
| 5 | `npm run data:validate:mm2` | 1,099 items |
| 6 | `npm run build` | **exit 0**; all 12 MM2 routes emit |
| 7 | Browser contrast sweep at 1920 | `/mm2` 49→0, `/mm2/values` 32→0, `/mm2/calculator` 26→0 below AA |
| 8 | Responsive sweep, 10 routes × 6 widths | no horizontal overflow, no page errors |
| 9 | Broken-image re-measure | weapon profile 7→0, `/mm2/demand` 47+→0 |
| 10 | Accessibility signal diff vs `702fd46` | nothing decreased |
| 11 | Adopt Me diff proof (6 shared files) | every Adopt Me path byte-identical |
| 12 | Adopt Me visual spot-check, 7 routes @1600 | unchanged |

### Production-build browser smoke test (`next start`, port 3001)

```
200  /mm2                                Trade with intelligence.
200  /mm2/values                         MM2 Trading Values
200  /mm2/values/mm2-rainbow-gun-godly   Rainbow Gun
200  /mm2/values/mm2-rainbow-gun-rare    Rainbow (Gun)
200  /mm2/values/rainbowgun              Which weapon did you mean?
200  /mm2/demand                         Demand Intelligence
200  /mm2/calculator                     Calculate Your Trade
200  /mm2/exchange                       Find your next trade.
200  /mm2/trade-opinions                 Trade Opinions
200  /mm2/lounge                         CSBT Lounge
200  /mm2/exchange/middleman             (auth-gated)
200  /mm2/exchange/moderation            (auth-gated)
404  /mm2/item/anything                  correct
page errors: none
```

**Correctness fixes re-verified against the production build — none regressed:**

```
✅ B-04 collision   Rainbow Gun and Rainbow (Gun) each render their own profile
✅ B-04b ambiguity  /mm2/values/rainbowgun disambiguates instead of guessing
✅ B-02 dead route  /mm2/item/[name] still 404s
✅ URL hydration    2x Rainbow Gun -> subtotal 840, verdict WIN, difference 999,160
✅ CHECK semantics  unpriced weapon -> verdict CHECK + withholding message shown
✅ real verdict     both sides priced -> WIN, no withholding message
```

---

## 11. Not done, deliberately

- **No deploy, push, merge, migration or production change of any kind.**
- **No route added, removed or redirected.** MM2 community flows still resolve
  inside MM2.
- **No calculator semantics changed** — quantity, duplicate merging, `CHECK`,
  source switching, URL hydration, sharing, recent trades, Balance Finder and
  the verdict rule are untouched.
- **No fabricated data.** Nothing on any MM2 surface shows a number, trend,
  count or recommendation that is not already in the dataset. Where a value is
  absent it still reads `N/A`, `Unrated`, `CHECK`, or `No history available`.
- **No Adopt Me redesign.**
- **The ten dead MM2 components were not deleted** — that is a cleanup decision,
  not a design one.
- **Profile / Notifications were not added to the MM2 rail.** Audit `13` A-1
  calls MM2's lack of account navigation a HIGH issue and the release-readiness
  doc recommends it, but it changes navigation destinations and sends the user
  to Adopt-Me-shaped account surfaces. **That is a product decision and is
  flagged here rather than made quietly.**

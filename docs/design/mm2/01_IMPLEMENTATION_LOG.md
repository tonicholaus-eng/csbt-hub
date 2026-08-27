# 01 — MM2 Implementation Log

Branch `calculator-redesign-v2`, local only. Seven batches, each committed
separately with its own validation. Nothing was pushed, deployed, merged, or
applied to any database.

---

## Batch 1 — Foundations, shell, control rail · `995ff8e`

| Change | File | Why |
|---|---|---|
| One `.mm2-*` foundation block replacing the old MM2 CSS section | `app/globals.css` | `.mm2-control-rail` was declared **four** times with three competing `!important` box-shadows, only the last of which applied (P-5) |
| MM2 material + ink token scale | `app/globals.css` | Every ink step is chosen to clear 4.5:1 on the MM2 panel scale — measured values below |
| `.mm2-social-mode` accent remap | `app/globals.css` | It passed Adopt Me's `--purple/--green/--cyan/--rose` straight through to the shared engines (HIV-7) |
| `MM2Shell` | new `components/mm2/MM2Shell.tsx` | Ten routes each repeated the scaffold and picked their own width — seven different measures (HIV-1) |
| `MM2PageHeader` | new `components/mm2/MM2PageHeader.tsx` | Signage bar instead of a full-width header card, so Opinions/Lounge stop stacking two or three of them |
| Control rail legibility | `components/mm2/MM2Navbar.tsx` | CRIT-3 — measured 1.35:1 and 1.93:1 |
| Mobile nav 32px → 44px, with icons, labels and a scroll fade | `components/mm2/MM2Navbar.tsx` | HIV-10 |
| Account gate MM2 skin via `gameTone` | 3 Nich files + `globals.css` | CRIT-2 — MM2's first frame was an Adopt Me modal |
| `feedHeading` prop | `components/community/TradeVotingBoard.tsx` | HIV-9 — the feed repeated the page title verbatim |
| MM2 `loading.tsx` / `error.tsx` | new | P-7 — an MM2 error painted the Adopt Me shell |

**Measured ink scale** (composited against `--mm2-panel` `#0c0f16`):

| Token | Value | Ratio |
|---|---|---|
| `--mm2-ink` | `#f4f6fa` | 17.4:1 |
| `--mm2-ink-2` | `#c3cad6` | 10.4:1 |
| `--mm2-ink-3` | `#939aa8` | 6.7:1 |
| `--mm2-ink-4` | `#7c8493` | 5.1:1 |
| `--mm2-crimson-text` | `#ee4257` | 5.0:1 |

The decorative `00`–`05` nav codes were **removed** rather than made legible.
They carried no information, and raising them to 4.5:1 would have given
meaningless text real visual weight. One line to restore if you disagree.

**Content measure** reduced from seven values to two tiers:
`standard` 1560px (values, profile, demand, calculator, opinions, middleman,
moderation) and `wide` 1680px (exchange, listing, rooms, lounge), plus
full-bleed for the home page.

---

## Batch 2 — Homepage · `38a0ac8`

- **Station grid rebuilt.** Weapon Values spanned two grid rows with one row of
  content, leaving ~220px of dead black inside the card and squeezing its art
  into an invisible smudge (HIV-3). It is now a full-width primary station over
  a row of four equal stations, and the art has room to read.
- **Redundancy removed** (HIV-2). The same four numbers appeared four times.
  The `systemRail` section and the `stationFactRow` are gone; the header readout
  now carries *provenance* — value network and `mm2Meta.sourceFetchedAt` — which
  is information the page did not previously show.
- **Decorative technical text removed** (P-2): `DISPLAY CHAMBER 01`, the vault's
  `COLLECTIBLE MARKET FACILITY / SECURE DISPLAY` rail, `STATION 01`–`05`, and
  `DATABASE LEADER`.
- **17 CSS rules** moved off 6–8px greys.
- **Touch targets**: station CTAs 39px → 46px; the console's demand link had a
  **12px-tall** hit area and is now 44px.
- The market-intelligence panel stacks its metrics under the weapon name, which
  stopped "Black Luger" wrapping mid-name below 1700px.

**Result: `/mm2` went from 49 text nodes below WCAG AA to 0.**

---

## Batch 3 — Values, Profile, Demand · `263a1ad`

### The weapon-image problem (CRIT-1)

The catalog art is hosted on `supremevalues.com`, which is behind Imperva bot
protection and answers image requests with a ~212-byte HTML challenge stub under
a **200** status. Browsers decode that as a failed image.

New `MM2WeaponPlate` handles it as a designed state:

- a display plate lit by the weapon's own rarity, carrying its own initials —
  no invented data;
- the art is painted only once it has **actually decoded**. Waiting for
  `onError` is not enough: a failing `<img>` paints the browser's broken-image
  glyph in the window before the error fires. This was visible in the first
  attempt and is why the component tracks `idle | loaded | failed` and keeps the
  image at `opacity: 0` until `loaded`;
- an `onLoad` that reports `naturalWidth <= 1` is treated as a failure, because
  a bot-check stub can "load" at zero dimensions;
- if the art ever resolves, the plate is simply never seen.

New `lib/mm2/rarity.ts` is one table for the 14 categories, replacing an ad-hoc
fuchsia / rose / amber / cyan / emerald mix spread across five components, and
carries a `rank` so a 1,000,000 Godly no longer renders identically to an
11-value Common.

### Other work in this batch

| Surface | Change |
|---|---|
| Values | Supreme primary / GCash secondary instead of two equal pills; 44px category chips; 4 columns above 1536px; recessed filter well; real empty state |
| Profile | The hero was a flat crimson slab lit from nowhere — the exact "giant red haze" `CLAUDE.md` warns against. Now a display bay lit from behind the weapon and tinted by its rarity (HIV-4) |
| Profile | Supreme/GCash were printed twice ~200px apart in near-identical panels; the duplicate `Value breakdown` section is gone (HIV-5) |
| Profile | `Type: OTHER` removed — the field is `"OTHER"` for all 1,099 weapons (P-3) |
| Profile | `items-start` on the two-column grid; the profile panel was stretched to match its taller neighbour, leaving ~40% of it empty |
| Demand | Leaderboard 8 → 12 entries plus `items-start`; it was padded with ~420px of dead space to match an 11-row radar (HIV-6) |

Measured after: the weapon profile reports **0** broken images (was 7 of 9);
`/mm2/demand` **0** (was 47+).

---

## Batch 4 — Trade Calculator · `62a45d7`

**No calculation semantics were changed.** Quantity handling, duplicate merging,
the picker workflow, `CHECK`, Supreme/GCash switching, URL hydration, share
links, recent trades, Balance Finder and the verdict rule are all untouched, and
were re-exercised in a browser against a hydrated URL (`2× Rainbow Gun` →
subtotal 840, verdict `WIN`, breakdown and Balance Finder both populated).

- Your Offer was amber→orange, Their Offer cyan→blue, and the divider a glowing
  orange `VS` disc pulsing on a 3s infinite loop. The two sides are now crimson
  (what leaves) against steel (what arrives), each a graphite bay lit from its
  own rail; the divider is machined gunmetal and does not animate.
- Toolbar and trade tools were five buttons in five hues with emoji glyphs.
  One material, one accent, real labels.
- The verdict panel keeps its semantics — green wins, crimson loses, bronze
  cautions — at MM2 depth, and its glyph joined MM2's stroked icon set instead
  of being a 60px bouncing emoji.

### Correction to the diagnosis

`00_VISUAL_DIAGNOSIS.md` CRIT-5 called the calculator's empty state "~700px of
dead black". That was **partly a screenshot artefact**: the result panel used
`whileInView` with `once: true`, so in a full-page capture that never scrolls it
stayed at `opacity: 0`. In a real browser it fades in on scroll.

The underlying problem was real but different from the way it was written up:
an `aria-live` result panel should not require scrolling to become visible. It
now animates on mount, which also closes the gap in the empty state.

**Result: `/mm2/values` 32 → 0 and `/mm2/calculator` 26 → 0 AA failures.**

---

## Batches 5 & 6 — Exchange, Trade Opinions, Lounge · `f095f53`

The shared engines hard-code Adopt Me's brand accents as raw Tailwind utilities
rather than tokens, so the `.mm2-social-mode` token bridge could not reach them.
New containment rules fold them onto MM2's accent, all scoped to
`.mm2-social-mode` — a class only MM2 routes set.

**Emerald was deliberately left alone.** In the Lounge it marks presence and live
status: a state colour, not a brand accent, and it means the same thing in both
games. An earlier attempt to fold it in turned the `LIVE` pill into a solid green
block with unreadable text, which is how that was caught.

`ExchangeHub`'s MM2-only branch (`gameId !== "adopt-me"`) got the restrained
crimson CTA in place of a fully saturated `bg-red-600`, and its catalog stat now
formats `1,099` rather than `1099` (P-4).

---

## Batch 7 — Responsive, accessibility, regression

### Responsive

Ten MM2 routes × six widths (1920 / 1600 / 1440 / 1366 / 768 / 390):
**no horizontal overflow at any width.**

### Touch targets

Standalone controls under 32px were fixed: `Browse all →` (was **16px** tall)
and the weapon card's demand chip (was 25px).

Remaining sub-32px hits are **inline text links inside cards** — the weapon name
in a values card, a weapon name in a demand row — each of which sits in a card
whose footer already offers the same destination at ≥44px. Two more belong to
shared Adopt Me markup and were left alone: `Safety rules →` (15px) and the
inline `Sign in` in a sentence on Trade Opinions.

### Accessibility signals, baseline `702fd46` → now

| Signal | Before | After |
|---|---|---|
| `aria-label` | 127 | 129 |
| `aria-hidden` | 172 | 178 |
| `aria-live` | 8 | 8 |
| `aria-pressed` | 7 | 7 |
| `aria-expanded` / `-controls` / `-activedescendant` | 5 / 3 / 3 | 5 / 3 / 3 |
| `useReducedMotion` | 54 | 54 |

Nothing decreased. The `GameItemPicker` combobox work is byte-identical — it was
not touched.

Two **infinite** animations were removed (the `VS` disc and the verdict glyph)
and one reveal-on-scroll was converted to animate-on-mount, so MM2 now runs no
permanent animation outside the homepage vault's existing 10s breathing loop.

### Three defects found while auditing the modals (item 11)

All three were pre-existing, confirmed against `702fd46`, and all three are now
fixed:

1. **MM2 was drawing Adopt Me's gold focus ring.** `globals.css:477` sets
   `:focus-visible { outline: 3px solid var(--ring) }`. The CSBT token bridge
   was scoped to `.mm2-social-mode` only, so MM2-only routes - home, values,
   the weapon profile, demand and the calculator - inherited Adopt Me's
   `--ring: #ffc92880` and put a gold ring around every focused control. The
   bridge now also applies to `.mm2-mode`; measured after, `--ring` resolves to
   `#e2344a38` on both `<main>` and a rail link.
2. **The weapon picker was clipped behind the control rail.** `MM2Shell`
   inherited `relative z-10` from the old route scaffolding, which creates a
   stacking context; the modal's `z-[100]` was therefore scoped inside a z-10
   layer and lost to the rail's `z-50`. The left 288px of the dialog - its
   title and the start of its search field - rendered underneath the sidebar on
   every desktop viewport. The shell no longer sets a z-index.
3. **Escape did not close the weapon picker.** The dialog announced itself
   correctly (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`) and moved
   focus to the search field, but there was no key handler, so a keyboard user
   could open it and not close it. Escape now closes it, verified in-browser.

### Adopt Me regression

Six shared files were modified. Each was checked mechanically against `702fd46`:

| File | Proof Adopt Me is unchanged |
|---|---|
| `app/globals.css` | Every added rule is `.mm2-*` scoped; no non-`.mm2` selector was added or removed (asserted by diff) |
| `exchange/ExchangeHub.tsx` | All three edits sit inside the `gameId !== "adopt-me"` branch or the MM2 side of a ternary |
| `community/TradeVotingBoard.tsx` | `feedHeading` defaults `true` → identical render |
| `nich/GlobalNichAssistant.tsx`, `nich/assistant/NichAssistant.tsx`, `nich/NichIntroMascot.tsx` | With `gameTone` undefined every ternary falls to its original literal — `gateScope` is `""` and `scrimClass` is `bg-slate-950/78` |

Visually spot-checked at 1600: `/`, `/values`, `/calculator`, `/exchange`,
`/trade-opinions`, `/lounge`, `/demand`. Adopt Me still renders its navy/amber
palette, indigo Lounge channel avatars, its amber-and-cyan calculator, the
violet Nich launcher and the amber account gate. No MM2 crimson anywhere.

---

## Known console error (pre-existing)

`/mm2/exchange`, `/mm2/trade-opinions` and `/mm2/lounge` each log one
`Failed to load resource: 400`. This is the Supabase call failing because the
multi-game migration has not been applied to any database — it was present in
the very first baseline capture, before any change in this pass, and each page
renders its truthful migration notice instead of content.

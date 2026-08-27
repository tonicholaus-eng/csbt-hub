# MM2 Release Readiness

**Branch:** `calculator-redesign-v2` (local only, no upstream) · **Date:** 2026-08-27
**Baseline:** the adversarially-verified findings in `docs/audit/` (reports 19, 21, 23)

> **MM2 HAS NOT BEEN RELEASED.** Nothing was pushed, deployed, merged to `main`, or applied to any
> database. `main` is untouched at `1b44604`. No Cloudflare, Supabase or workflow setting was changed.

---

## Overall status

## ✅ READY FOR USER REVIEW

Every automated gate passes, every route renders, and each headline correctness fix was verified in a
real browser against the **production build** — not just in unit tests. Remaining gaps are documented
below rather than hidden, and none of them is a correctness defect in shipped behaviour.

---

## Completed fixes

### Correctness

| # | Issue | Fix | Verified |
|---|---|---|---|
| B-04 | **MM2 weapon profiles showed the wrong value.** Five name pairs collapsed to the same key once punctuation was stripped, so `.find()` returned the first match: Rainbow Gun showed **41 instead of 420**, Xenoknife **31 instead of 310**, and one weapon of each pair was unreachable. | `resolveMM2Item()` — exact ID, then exact name (both unique across all 1,099), then a loose slug only when it matches one weapon. Profile routing is now ID-based; name URLs permanently redirect to the canonical ID URL. | Unit + **browser**: all four collision weapons render their own `h1` and value |
| B-04b | Ambiguous slugs silently picked a weapon. | Renders a disambiguation list instead of guessing. | **Browser**: `/mm2/values/rainbowgun` → *"Which weapon did you mean?"* |
| B-05 | `registry.buildLookup` was last-write-wins, so `getItem("Rainbow (Gun)")` could return the 420 weapon. | Exact keys protected; a colliding normalized key is dropped so an ambiguous lookup returns `undefined` rather than a wrong item. | Unit: both members of all five pairs resolve to themselves |
| B-14 | **The Adopt Me calculator treated a missing value as 0** and still showed a confident WIN/FAIR/LOSE. | Counts unpriced rows and shows MM2's truthful `CHECK` state, withholding the verdict. | **Browser**: unpriced under GCASH → `CHECK` + withholding message; the same trade under ELVE → real `WIN` |
| B-03 | **"Open in Calculator" was a dead link.** Trade Opinions and Inventory both linked to `/calculator?...`, which the calculator ignored entirely — it opened empty. | Hydrates `source`/`your`/`their` via a lazy `useState` initializer; quantity expands to repeated rows. `selectedItemsToRows` now merges duplicates into a quantity so the round trip is lossless. | **Browser**: items load and verdict renders `LOSE`; empty calculator still `READY` |
| B-02 | `/mm2/item/[name]` used sync `params` under Next 16 and **always** rendered "Not found". | Route deleted with its two placeholder panels; `MM2Navbar` prefix match removed. | **Browser**: now returns `404` |
| B-11 | Every server notification href was hard-coded to the Adopt Me routes, so an MM2 trader acting on "your trade room is ready" was dropped into Adopt Me. | Migration `20260827000100`: one before-insert trigger on `notifications` derives the prefix from the linked entity's `game_id`. | ⚠ **Migration written, NOT applied** |
| R-03 | Cross-game route guards were one-way. | `/exchange/[id]` now passes `expectedGameId`; `TradeRoomExperience` gained `expectedGameId`, wired from both room routes. | Type-checked; all four routes render |
| B-06 | Three tables the client subscribes to were never in `supabase_realtime`, so the trade-room timeline never updated live. | Migration `20260827000200` publishes them. | ⚠ **Migration written, NOT applied** |
| B-10 / D-02 | `game_catalog_items` was seeded once inside a migration; any weapon added later was rejected server-side. | New `scripts/push-mm2-catalog.mjs` (upsert-only, skips without credentials, refuses a short catalog, keeps unpriced weapons `null`), wired into `refresh:mm2`. | Script written; ⚠ **not run against any database** |
| D-01 | Two writers to `src/data/mm2Items.json` — running the scraper alone silently replaced the curated catalog with raw scrape output. | Scraper no longer writes it; `generate-mm2-items.js` is the single writer. | Verified: one writer remains |

### Build health

| Issue | Result |
|---|---|
| **`npm run build` failed** (7 TypeScript errors) | **0 errors.** All fixed at root cause — no `any`, `@ts-ignore` or `@ts-expect-error` added |
| ESLint: 31 errors | **0 errors** (14 warnings, listed below) |
| No CI | `.github/workflows/ci.yml` added — validation only, proven deploy-incapable |

### Architecture & quality

| Change | Detail |
|---|---|
| **One verdict function** | The W/F/L rule was hard-coded in **seven** places across both calculators, the MM2 balance finder and two Nich modules — including a user-facing `"5%"` string that would have silently lied. All now use `getTradeVerdict()` / `FAIR_THRESHOLD_PERCENT`. Thresholds unchanged. |
| **One MM2 catalog type** | The MM2 item shape was redeclared in five places, which is why the weapon-profile page used `any` 20 times. `src/lib/mm2/catalog.ts` is now canonical. |
| **−1,849 KB client JS** | See Performance below. |
| **Keyboard-accessible shared picker** | `GameItemPicker` gained the full ARIA combobox pattern (N-1). |
| Dead code removed | Broken route + 3 unreferenced components. |

---

## Automated validation

Exact commands, run on this branch at `e6d9c16`:

| # | Command | Exit | Result |
|---|---|---|---|
| 1 | `npx tsc --noEmit -p tsconfig.json` | **0** | 0 errors |
| 2 | `npx eslint .` | **0** | 0 errors, 14 warnings |
| 3 | `npm test` | **0** | **113 pass, 0 fail** |
| 4 | `npm run data:validate` | **0** | 3,382 items, 3,382 unique IDs |
| 5 | `npm run data:validate:mm2` | **0** | 1,099 items |
| 6 | `npm run build` | **0** | succeeds; all 12 MM2 routes emit |

**Test growth: 49 → 113.** New coverage:

| Suite | Tests | Covers |
|---|---|---|
| `tests/mm2Catalog.test.ts` | 21 | All 1,099 weapons resolve uniquely by ID **and** by name; both members of all five collision pairs resolve to themselves; ambiguity reported not guessed; registry lookup safety; unpriced = `null` not `0` |
| `tests/tradeVerdict.test.ts` | 17 | FAIR boundary inclusive at exactly 5%; missing-value `CHECK` outranks a decisive total; hostile numbers (negative, NaN, Infinity); **121 cross-game parity combinations** |
| `tests/gameRegistry.test.ts` | 10 | **20,292 value comparisons** (3,382 items × 2 sources × 3 variants) against the full dataset, pinning the bundle optimisation; variant availability; game-scoping helpers |
| `tests/tradeRows.test.ts` | 16 | Both games' URL codecs: round trips, quantity clamping, unknown items dropped, 18-row cap, hostile input, calculator-href decode contract |

---

## Local functional testing

**32 routes** exercised against the dev server, then the key paths re-verified against the
**production build** (`next start`, port 3001) in a **real Chromium browser** via Playwright.

| Area | Result |
|---|---|
| Adopt Me — 20 routes (`/`, values, calculator, demand, exchange, trade-opinions, lounge, inventory, wishlist, profile, notifications, trades, nich, seminar, trading-servers, feedback, about, privacy, terms, guidelines) | **all 200, no runtime errors** |
| MM2 — 9 routes (home, values, calculator, demand, exchange, trade-opinions, lounge, middleman, moderation) | **all 200, no runtime errors** |
| Item profiles (`/values/[id]`, `/mm2/values/[id]`) | **200** |
| Deleted `/mm2/item/[name]` | **404** (correct) |
| Dev server log across 54 requests | **53 × 200, 1 × 404, zero errors or warnings** |
| Production-mode smoke (17 routes) | **all 200, no errors** |
| Browser console/page errors across the whole run | **none** |

### Fixes verified in-browser against the production build

```
✅ B-03 URL hydration + verdict — items loaded, verdict=LOSE
✅ D3 unpriced -> CHECK — verdict=CHECK, withholding message shown
✅ D3 priced -> real verdict — verdict=WIN
✅ empty calculator stays READY — verdict=READY
✅ Rainbow Gun    h1="Rainbow Gun"    value 420 present
✅ Rainbow (Gun)  h1="Rainbow (Gun)"  value 41 present
✅ Xenoknife      h1="Xenoknife"      value 310 present
✅ Xeno (Knife)   h1="Xeno (Knife)"   value 31 present
✅ ambiguous slug disambiguates — h1="Which weapon did you mean?"
```

> **Worth knowing:** in production `/calculator` is statically prerendered, so the hydrated trade is
> **not** in the initial HTML — it appears after client-side hydration. A `curl` check therefore shows
> an empty calculator and is misleading. This was only caught by driving a real browser.

---

## Adopt Me regression results

Adopt Me is the live product; these files are shared or Adopt-Me-owned and were all touched.

| File | Change | Regression result |
|---|---|---|
| `components/trade/TradeCalculator.tsx` | URL hydration, missing-value counting, shared verdict | ✅ empty state `READY`; hydrated trade `LOSE`; unpriced `CHECK`; priced `WIN` |
| `components/trade/TradeSummary.tsx` | Shared verdict + `CHECK` | ✅ renders correct verdict in-browser |
| `components/trade/TradePetCard.tsx` | Image-error state without a reset effect | ✅ `/calculator` and `/values/[id]` render, no console errors |
| `lib/tradeContext.ts` | Duplicates merge into a quantity | ✅ round-trip test; Exchange/Trade Opinions already read quantity |
| `lib/exchange/matching.ts` | Value-source narrowing at the boundary | ✅ additive; `GCASH`/`ELVE` unchanged; `/exchange` renders |
| `games/registry.ts` | Compact index + safe lookup | ✅ **20,292 value comparisons vs the full dataset — zero drift** |
| `nich/.../tradeComparison.ts`, `brain/localIntelligence.ts` | Shared FAIR constant | ✅ 49 original Nich tests still pass; `/nich` renders |
| `hooks/useExchangeData.ts` | Game short-circuit in realtime handlers | ✅ `/exchange` renders; deletes deliberately left unfiltered |
| `components/games/GameItemPicker.tsx` | ARIA + keyboard | ✅ pattern verified in-browser (see limitation below) |
| `app/globals.css` | MM2 block only | ✅ every selector is `.mm2-*`; Adopt Me cannot receive them |

**No Adopt Me regression found.** All 20 Adopt Me routes render, all 49 pre-existing tests still pass.

---

## Known remaining bugs

None that are shipped-behaviour defects. Open items, all documented:

| Item | Severity | Status |
|---|---|---|
| `/mm2/values/<unknown>` returns **200** with an in-app "Weapon not found" rather than a real 404 | Low (SEO) | Deliberate — consistent with the existing page; not changed |
| `TradeVotingBoard` accepts `routeBasePath` but never uses it | Low | Left in place — a public prop removal is an API change; flagged in the log |
| `sitemap.ts` lists `/trade-feed` and `/community` (both redirects) and **no MM2 routes** | Low (SEO) | Not addressed — would make MM2 discoverable, which is premature pre-release |
| Birthday event expired 2026-08-15, `enabled: true` | Low | Correctly gated (never loads); `BirthdayIcons` still ships |
| 14 lint warnings | Low | 13 × raw `<img>` in MM2 components, 1 × unused prop above |

---

## Known limitations

1. **Two effects in `MM2TradeCalculator` keep a scoped `eslint-disable`.** They hydrate from
   `localStorage` and `window.location`, which do not exist during SSR; moving either into a
   `useState` initializer would cause a hydration mismatch. Reasoning and two TODOs are inline. Not a
   blanket suppression.
2. **`GameItemPicker` was not driven signed-in.** It sits behind auth (`TradeVotingBoard.tsx:336`).
   Its implementation matches `ItemSearchPicker` attribute-for-attribute, and that identical pattern
   *was* verified in-browser on the homepage — but the picker itself was not exercised.
3. **No authenticated flows were tested at all** — listing creation, offers, trade rooms, moderation,
   middleman, Lounge posting. All require a signed-in Supabase session.
4. **No database work was verified.** Both new migrations and the catalog-push script are written and
   reviewed but unexecuted.
5. **`package-lock.json` stays modified** — a line-ending-only diff, deliberately not committed.

---

## Security status

No security regressions introduced. Unchanged from the audit:

| Finding | Status |
|---|---|
| SEC-01 spoofable rate-limit identity (`x-forwarded-for` before `cf-connecting-ip`) | **NOT FIXED** — Phase C was skipped at your instruction. Still the top security item. |
| SEC-02 display-name impersonation | **NOT FIXED** — needs a migration |
| SEC-03 `#announcements` bypass via UPDATE | **NOT FIXED** — needs a migration |
| SEC-04 cross-game route leak | **FIXED app-side** (guards on all four routes); server-side href fix written but unapplied |
| No secrets committed | ✅ re-asserted before every commit by an automated grep |
| CI cannot deploy | ✅ asserted: no `run:` line matches `deploy\|wrangler\|opennextjs\|upload\|push`; `permissions: contents: read`; `branches-ignore: [main]` |

---

## Database / migration readiness

### LOCAL / DEV VERIFIED
- Both migrations are syntactically reviewed, guarded, re-runnable, and **non-destructive** (no
  `DELETE`, `DROP TABLE`, `TRUNCATE`, or column removal).
- `push-mm2-catalog.mjs` skips cleanly without credentials and refuses a short catalog.

### PRODUCTION NOT YET VERIFIED
- ❌ Neither new migration has been applied anywhere.
- ❌ `push:mm2-catalog` has never been run against any database.
- ❌ **Unknown whether production has the two `20260826*` multi-game migrations at all** (Phase C
  skipped). MM2 Exchange/Lounge/Trade Opinions cannot work without them.
- ❌ **Unknown whether production `value_history` is populated.** Both `marketplace_create_listing`
  overloads raise for every Adopt Me item when it is empty — this remains a possible live Adopt Me
  Exchange outage, unrelated to MM2.

---

## Performance findings

Measured, not estimated. Baseline and result both built with `npm run build` on this machine and the
emitted chunks measured directly:

| Metric | Before | After | Change |
|---|---|---|---|
| **Total client JS** | 5,747 KB | **3,898 KB** | **−1,849 KB (−32.2%)** |
| **Largest chunk** | 1,654 KB | **615 KB** | **−1,039 KB** |
| Chunk count | 69 | 69 | — |

> Measured at the final commit `e6d9c16`. An earlier draft of this report recorded 3,892 KB / −1,855 KB;
> that figure was taken one commit earlier, before the `GameItemPicker` accessibility work added ~6 KB.
> The numbers above are the ones that match the current tree.

`games/registry.ts` imported the full 1.7 MB `tradingItems.json`; because ten client components import
the registry, that pulled the entire Adopt Me catalog into the chunk serving Exchange, Trade Opinions
and the Lounge for **both** games — alongside a second, compact copy already bundled for
`lib/search.ts`. Before, one chunk contained `ELVE_NORMAL` **3,382 times**; now no chunk does.

Safety was established *before* the swap: across all 3,382 items there are **0** rows where a canonical
value is null while its legacy alias is present, and **0** where `ELVE_NORMAL` and `INGAME_VALUE`
disagree — then pinned permanently by 20,292 test comparisons.

Also reduced: the Exchange realtime channel no longer fires a refetch per write per client for other
games (O(users × writes) → only writes this hub displays).

---

## Accessibility findings

| Check | Result |
|---|---|
| Horizontal overflow at 1920 / 1600 / 1440 / 1280 / 768 / 390 px across 6 routes | ✅ **none at any width** |
| ARIA combobox pattern (roles, `aria-expanded`, `-controls`, `-activedescendant`, `-selected`) | ✅ verified in-browser: expands, 12 options, ArrowDown moves active option, Escape closes |
| `GameItemPicker` parity with `ItemSearchPicker` | ✅ same 8 ARIA attributes, same 4 key handlers |
| Console/page errors during the browser run | ✅ none |

**Not addressed** (pre-existing, from the audit): 13 raw `<img>` in MM2 components; `MM2Navbar`
mobile chips at 32 px vs the 44 px minimum; `aria-disabled` links still in the tab order; no
skip-to-content link.

---

## Production release prerequisites

Everything below must happen **after** you authorise release. None of it has been done.

### Blocking
1. **Answer the Cloudflare Workers Builds question** (Phase 0) before any push.
2. **Verify production has both `20260826*` multi-game migrations.** MM2 cannot work without them.
3. **Apply the two new migrations** — `20260827000100` (notification scoping), `20260827000200`
   (realtime publication).
4. **Run `npm run push:mm2-catalog`** against production so `game_catalog_items` matches the shipped
   catalog, otherwise MM2 listing creation rejects newer weapons.
5. **Verify production `value_history` is populated** — an Adopt Me Exchange blocker independent of MM2.
6. **Test authenticated MM2 flows** on a dev/staging Supabase project: listing creation, offers, trade
   rooms, moderation, middleman, Lounge posting, Trade Opinions voting.

### Strongly recommended
7. Fix **SEC-01** (`cf-connecting-ip` first) — four one-line changes; currently the Gemini spend cap is
   bypassable.
8. Fix **SEC-02** and **SEC-03** — display-name impersonation and the announcements bypass.
9. Add MM2 routes to `sitemap.ts` (only once MM2 should be discoverable).
10. Add Profile and Notifications to `MM2Navbar` — MM2 currently has no path to account surfaces.
11. Schedule the three unused prune functions; telemetry grows unbounded.

### Nice to have
12. Remove the MM2 GCash value-source option, or populate `GCASH_VALUE` (all 1,099 are `null`).
13. Delete the remaining ~4,900 lines of dead code and the expired birthday event.
14. Replace the 13 raw `<img>` with `next/image`.

---

## Final recommendation

**MM2 is technically ready for you to inspect locally.**

Run it with `npm run dev` and open `http://localhost:3000/mm2`. Worth looking at first:

- `/mm2/values/mm2-rainbow-gun-godly` vs `/mm2/values/mm2-rainbow-gun-rare` — the 10× bug, fixed
- `/mm2/values/rainbowgun` — the disambiguation page
- `/calculator?source=GCASH&your=pet-2026-birthday-butterfly~NORMAL~1&their=pet-2d-kitty~NORMAL~1` —
  the new `CHECK` state, then switch the source to ELVE to see a real verdict
- `/mm2/calculator` — quantity, Balance Finder, share link

What I would **not** call ready: anything requiring a database. No migration has been applied, the MM2
server catalog has never been synced, and no authenticated flow has been exercised. Those are the real
gate between "looks right locally" and "safe to release", and they need a dev/staging Supabase project
plus your decision on the two open questions above.

# 23 — Adversarial Verification, Corrections & Final Scoring

Purpose: attempt to **falsify** the major conclusions in reports 01–22, correct what does not survive, and only then score.

Method: re-derive each headline finding by a *different* technique than the one that produced it, plus a coverage sweep of every `src` module against every report.

---

# PART A — CORRECTIONS (findings that did NOT survive as written)

## C-1 · Dead code was UNDERSTATED — 16 files / 4,982 lines → **19 files / 6,268 lines**

**Original method (flawed):** for each module, grep its basename across `src` excluding itself; zero hits ⇒ dead.
**Why it failed:** it only finds files with *no importer at all*. It cannot find **transitively dead** files — modules that have a live-looking importer which is itself dead.

**Corrected method:** a real reachability closure. Parse every `import … from "…"` and `import("…")` in all 226 `src` TS/TSX files, resolve `@/` and relative specifiers against the actual file set, and walk from all 65 Next.js entry files (`page|layout|route|loading|error|not-found|template|default|sitemap|robots` anywhere under `src/app/`).

> **A second flaw, caught and fixed mid-pass:** my first closure run used the regex `^src/app/.*\/(page|layout|…)` which requires a `/` before the filename — silently excluding top-level `src/app/page.tsx`, `layout.tsx`, `error.tsx`, `loading.tsx`, `not-found.tsx`. That run reported 52 unreachable files / 8,920 lines and listed `layout.tsx` itself as dead, which was obviously wrong. The corrected regex allows `(^|\/)`. **Result: 65 entries · 207 reachable · 19 unreachable · 6,268 lines.**

### Three files newly identified as dead

| File | Lines | Why the original method missed it |
|---|---|---|
| `src/components/nich/NichBody.tsx` | 1,088 | Imported by `NichMascot.tsx` — which is itself dead |
| `src/components/nich/NichFace.tsx` | 63 | Same |
| `src/components/mm2/MM2HeroSearch.tsx` | 119 | Imported by `MM2Hero.tsx` — which is itself dead |

**Two dead clusters:**
```
NichMascot.tsx (247)  →  NichBody.tsx (1,088)  +  NichFace.tsx (63)      = 1,398 lines
MM2Hero.tsx    (150)  →  MM2HeroSearch.tsx (119)                         =   269 lines
```

**Verified, not assumed:** `/nich/page.tsx` renders `NichChat` and a static `/nich/nich-face.png` image — it does **not** render `NichBody`. `NichBody`/`NichFace` are referenced only from `NichMascot.tsx:4-5, 112, 121`, and `NichMascot` has zero importers.
**Correctly excluded:** `NichIntroMascot.tsx` (597) is reachable via `dynamic(() => import("../NichIntroMascot"))` in `NichAssistant.tsx:9` — the resolver handles dynamic imports. `NichReactions.ts` is reachable via `useNich.ts`.

**Also caught:** a stricter (non-word-boundary) grep appeared to show `MM2Hero` having one external reference. That was a substring false-positive — the "reference" was the filename `MM2HeroSearch`. `MM2Hero` **is** dead; the original word-boundary scan was correct on that one.

### Full corrected dead list (19 files, 6,268 lines)
| File | Lines |
|---|---|
| `components/home/LiveCommunityFeed.tsx` | 3,044 |
| `components/nich/NichBody.tsx` | 1,088 |
| `components/SearchBar.tsx` | 845 |
| `components/nich/NichMascot.tsx` | 247 |
| `components/mm2/MM2Hero.tsx` | 150 |
| `components/PopularPets.tsx` | 128 |
| `components/mm2/MM2HeroSearch.tsx` | 119 |
| `components/mm2/MM2MarketHighlights.tsx` | 100 |
| `components/trade/SaveTradeButton.tsx` | 88 |
| `components/mm2/MM2FeatureCards.tsx` | 78 |
| `components/mm2/MM2CommunityHub.tsx` | 67 |
| `components/nich/NichFace.tsx` | 63 |
| `components/mm2/MM2HomeBoard.tsx` | 59 |
| `components/home/MM2TradingHQ.tsx` | 47 |
| `components/mm2/MM2ValueCard.tsx` | 46 |
| `components/mm2/MM2Trending.tsx` | 31 |
| `components/AppFooter.tsx` | 29 |
| `components/mm2/MM2ValueHero.tsx` | 24 |
| `components/mm2/MM2ValueSearchPanel.tsx` | 15 |

**Affected reports:** `04_COMPONENT_ARCHITECTURE.md` §10 and `17_TECHNICAL_DEBT.md` §1.1 — both updated.

## C-2 · My own coverage-gap check was flawed
The first sweep compared each source file's **name including extension** (`CreateListingPanel.tsx`) against the reports, which name components **without** extensions. It reported 47 uninspected modules. Re-run on the bare module name: **13**. All 13 have now been inspected (Part C).

---

# PART B — NEW FINDINGS discovered during verification

## N-1 · The multi-game item picker is a significant accessibility regression — MEDIUM
Two pickers exist. The **older, Adopt-Me-only** one is markedly better than the **newer, strategically-central multi-game** one.

| | `items/ItemSearchPicker.tsx` (192 ln) | `games/GameItemPicker.tsx` (64 ln) |
|---|---|---|
| `role="combobox"` / `listbox` / `option` | ✅ | ❌ |
| `aria-expanded` / `-controls` / `-activedescendant` / `-autocomplete` / `-selected` | ✅ all five | ❌ none |
| Arrow-key navigation | ✅ Up/Down with wraparound | ❌ |
| Enter to select · Escape to close | ✅ | ❌ |
| Focus restored after select | ✅ via `requestAnimationFrame` | ❌ |
| Image handling | `next/image` | raw `<img>` (`:52`) |
| **Total ARIA/role attributes** | **6 distinct** | **0** |

`GameItemPicker` is mouse-only and is the picker used by **CSBT Exchange** (`ExchangeItemBuilder.tsx:97`) and **Trade Opinions** (`TradeVotingBoard.tsx:401`) — for **both games**. `ItemSearchPicker` is used by seven Adopt-Me-only surfaces (`WishlistWatchlist`, `FeedbackForm`, `InventoryCalculator`, and all four home heroes).

So a keyboard-only user can add items to their inventory and wishlist but **cannot build an Exchange listing or a Trade Opinions post**. The pattern to copy already exists in the same repository.

## N-2 · `README.md` documents a system that does not exist — MEDIUM (doc integrity)
Verified line by line against the repository:

| README claim | Reality |
|---|---|
| `:86` *"The Values browser reads paginated results from `/api/items` instead of loading the entire catalog into the page."* | **False.** `src/app/values/page.tsx` is `"use client"` and imports `itemList` directly; `/api/items` has **zero** consumers |
| *"Push the cleaned source project to GitHub and connect the repository to **Vercel**."* | **False.** Deployment is Cloudflare Workers — `wrangler.jsonc`, `open-next.config.ts`, `npm run deploy` → `opennextjs-cloudflare deploy` |
| *"See `FOUNDATION_SETUP.md`"* | **Missing** |
| *"See `EXCHANGE_SETUP.md` and `CSBT_EXCHANGE.md`"* | **Both missing** |
| *"See `CSBT_V2_OPTIMIZATION_SUMMARY.md`"* | **Missing** |
| *"See `PROJECT_CLEANUP.md`"* | **Missing** |
| *"Existing projects should run `src/lib/supabase/exchange.sql` once"* | Superseded — that file is a pre-consolidation migration now folded into `20260816000000_legacy_foundation.sql` |
| MM2 | **Never mentioned.** The README describes a single-game Adopt Me site |

Five dangling document references, two factually wrong statements, and no mention of half the product. `CLAUDE.md` requires reporting documentation/implementation disagreement — this is the largest instance.

## N-3 · The last deployable build artifact contains **zero** MM2 routes — HIGH (operational)
`.open-next/server-functions/default/.next/routes-manifest.json` (built **2026-08-21 17:21**) lists 34 static routes and 3 dynamic routes. Searching it for `"/mm2…"` returns **nothing**.

Combined with `git status` (all of MM2 untracked) and the current build failure, the evidence is that **MM2 has never been built for deployment and is therefore almost certainly not live on `csbthub.com`.** This materially strengthens `18_DEPLOYMENT_OPERATIONS.md` OPS-05: MM2 is not merely uncommitted, it is unshipped.

## N-4 · The birthday event expired 12 days ago and is still in the codebase — LOW
`src/config/birthdayEvent.ts`: `enabled: true`, window `2026-08-13T16:00Z → 2026-08-15T16:00Z`. Evaluated against the audit date (2026-08-27): **`isBirthdayEventActive()` → false**.

**Credit where due — the gating is well-engineered.** `BirthdayEventGateway` returns `null` when inactive and loads `BirthdayEventExperience` via `dynamic(ssr:false)`, and `useBirthdayEventActive` uses `useSyncExternalStore` with `getServerSnapshot: () => false` so there is no hydration mismatch. The 8-component experience genuinely does not load.

**But:** `BirthdayIcons.tsx` is *statically* imported by `Navbar.tsx:13`, `NichButton.tsx`, and `NichChat.tsx`, so it ships on every page permanently; ~360 lines across 8 components plus a config and a hook are dormant; and the source contains a hardcoded personal message — `"HAPPY BIRTHDAY, FROM PINAKA POGING NICH CAST 😜"` — and an individual's name. For a codebase presented to technical evaluators, that is worth removing or moving behind a data-driven flag.

## N-5 · Both `marketplace_create_listing` overloads depend on `value_history` — strengthens D-03
`08_DATA_PIPELINES.md` D-03 was derived from the **new** 8-argument overload. Verification found **three** definitions:

| Signature | Defined in |
|---|---|
| `(text,text,text,text,jsonb,boolean,jsonb)` — legacy 7-arg | `20260816000000_legacy_foundation.sql:1471`, redefined `20260816000200_exchange_item_alias_hotfix.sql:5` |
| `(text,text,text,text,text,jsonb,boolean,jsonb)` — 8-arg with `p_game_id` | `20260826000100_multigame_social.sql:1516` |

`CreateListingPanel.tsx:96-104` calls the **8-arg** version first and falls back to the **7-arg** one for Adopt Me on a legacy-schema error. `value_history` is referenced at `legacy_foundation.sql:1524` and `:1639` as well.

**Conclusion: both code paths fail identically when `value_history` is empty.** The legacy fallback is not an escape hatch. D-03 / OPS-01 / B-09 are strengthened, not weakened.

---

# PART C — COVERAGE GAP CLOSED

13 modules were named in no report. All now inspected:

| Module | Lines | Finding |
|---|---|---|
| `items/ItemSearchPicker.tsx` | 192 | Best-implemented picker in the repo — see N-1 |
| `games/…` comparison | — | Produced N-1 |
| `lib/accountTypes.ts` | 22 | Shared types for `NotificationCenter` + `ProfileDashboard`. Clean. |
| `theme/AppearanceSelector.tsx` | 63 | Theme switcher in `Navbar`. Clean. |
| `nich/assistant/NichButton.tsx` | 9 (1 long line) | Floating launcher. Has `aria-label` + `aria-expanded`. Clean. |
| `nich/NichReactions.ts` | 81 | Reaction map consumed by `useNich` + `brain/types`. Live. |
| `nich/assistant/NichTradeReviewCard.tsx` | 221 | Vision trade-review UI, rendered by `NichChat`. Live. |
| `nich/NichFace.tsx` | 63 | **Dead** (C-1 cluster) |
| `mm2/MM2HeroSearch.tsx` | 119 | **Dead** (C-1 cluster) |
| `birthday/BirthdayIcons.tsx` | 23 | Live — statically imported by Navbar/NichButton/NichChat (N-4) |
| `birthday/BirthdayDecorations.tsx` | 30 | Dormant (N-4) |
| `birthday/BirthdayEventModal.tsx` | 96 | Dormant (N-4) |
| `birthday/BirthdayEventNotification.tsx` | 60 | Dormant (N-4) |
| `birthday/NichBirthdayInteraction.tsx` | 60 | Dormant (N-4) |

**Every `src` module is now referenced by at least one audit report.**

---

# PART D — FINDINGS RE-TESTED AND CONFIRMED

Each re-derived by a different method than originally used.

| Finding | Falsification attempt | Result |
|---|---|---|
| **B-01 build fails** | Re-ran `npx tsc --noEmit` (exit 1, 7 errors) and `npm run build` (exit **1**, `Failed to type check`) independently | ✅ **CONFIRMED** |
| **B-03 `/calculator` ignores its URL** | Grepped `useSearchParams\|location.search\|URLSearchParams` across the **entire** `src/components/trade/` directory, not just `TradeCalculator.tsx` — zero hits in the parent *and* every child | ✅ **CONFIRMED** |
| **P-01 both catalogs ship to the client** | Counted marker keys inside the emitted chunk rather than inferring: `3sx7vzsxc-8ti.js` is **1,692,945 bytes** and contains **`ELVE_NORMAL` exactly 3,382 times** (one per Adopt Me item) plus `Black Luger` and `mm2-black-luger-godly` | ✅ **CONFIRMED — definitively** |
| **DB-01 `display_name` mutable after insert** | Enumerated **every** `create trigger` in all 12 migrations. Only `set_updated_at` triggers fire on UPDATE; the two `fill_*_display_name` triggers are `before insert`; `community_posts` has only `community_posts_rate_limit before insert` | ✅ **CONFIRMED** — and the insert-only rate limiter is likewise bypassed by UPDATE |
| **DB-04 three realtime subscriptions never fire** | Re-scanned with newline-stripping across **both** `supabase/migrations/*.sql` **and** the superseded `src/lib/supabase/*.sql`, in case an operator applied the legacy files. Both sets add the same 14 tables; `marketplace_listing_items`, `marketplace_offer_items`, `trade_room_events` appear in neither | ✅ **CONFIRMED** (live DB still unverifiable) |
| **B-04 MM2 profile collisions** | Re-derived from the dataset by executing both normalisers over all 1,099 items | ✅ **CONFIRMED** — 5 name collisions (route-level), 1 (registry-level), IDs collide **zero** times |
| **No-Fake-Data discipline** | Actively hunted for fabricated counts in four un-audited surfaces | ✅ **CONFIRMED POSITIVE** — `Stats.tsx` uses only real `totalItems` plus non-numeric claims; `TradingServersDirectory` shows **no** member counts and instead carries a safety disclaimer; `about/page.tsx` has no hardcoded stats; `seminarContent.ts` "values" are ethical, not prices |
| **community_posts RLS** (earlier false alarm) | Re-confirmed enabled at `20260816000100_community_lounge.sql:70-72` (line-wrapped statement) | ✅ **NOT a bug** — correctly retracted before publication |

## One finding downgraded in confidence

**SEC-01 (spoofable rate-limit identity)** — the *source* behaviour is fully verified: `api/nich/route.ts:416-427` reads `x-forwarded-for` then `x-real-ip` and never `cf-connecting-ip`; the vision route reads `cf-connecting-ip` only second. The *exploitability* depends on Cloudflare appending to a client-supplied `X-Forwarded-For` rather than replacing it, which I could not test against the live edge.

**Reclassified: code defect VERIFIED; exploitability STRONG INFERENCE (not VERIFIED).** The remediation is unchanged and costs four lines — read `cf-connecting-ip` first — so the priority stands.

---

# PART E — FINAL SCORING

| Dimension | Score | Justification |
|---|---|---|
| **Overall project health** | **5.5 / 10** | Genuinely excellent database and validation engineering, undermined by a failing build, an unshipped and uncommitted half of the product, and no CI. *(was 6.0 — lowered by N-3: MM2 appears never to have been deployed.)* |
| **Architecture** | **6.5 / 10** | The expensive half — schema, RLS, server-side revalidation, shared social engine — is platform-grade. The adapter layer is ~60% complete; calculators, navbars, routing and formatting still branch outside it. |
| **Code quality** | **4.5 / 10** | Adopt Me core is clean and well-commented. Against it: 7 type errors, 49 lint problems (every one in MM2 or the calculators), 28 `any`, and **6,268 lines** of dead code. *(was 5.0 — lowered by C-1.)* |
| **Security** | **7.5 / 10** | Strongest dimension. 34 RLS tables, 42 definer functions all with `search_path = ''`, server-side trade revalidation, no secrets in history, no XSS/SQLi/open-redirect. Deductions: one HIGH (rate-limit identity) and three MEDIUMs (impersonation, announcements bypass, cross-game leak). |
| **Scalability** | **6.0 / 10** | Postgres and indexing scale. A 1.65 MB client JSON chunk, client-side filtering of 3,382 items, and O(N×M) unfiltered realtime fan-out do not. |
| **UX / product cohesion** | **5.5 / 10** | Each mode is internally coherent and empty/error states are genuinely honest. Against it: no MM2 path to account surfaces, a dead "Open in Calculator" link, two unequal calculators, and a keyboard-inaccessible picker on both games' core flows. *(was 6.0 — lowered by N-1.)* |
| **Testing & reliability** | **4.5 / 10** | 49 well-designed tests, all passing — but ~40 cover Nich vision. Zero tests for calculators, matching, API routes, or RLS. No CI. |

**Weighted overall: 5.5 / 10** — *"strong foundations, unshipped and unverified."*

---

## TOP 10 STRENGTHS

1. **Server-side trade revalidation.** `marketplace_create_offer` accepts client totals and ignores them, recomputing from a server catalog and stamping `server_validated: true`. Trade values cannot be forged.
2. **No-Fake-Data enforced at four layers** — pipeline (`value <= 0` refused into `value_history`), database (`compatibility_score = NULL`), UI (`"N/A"`, `"Unavailable"`, MM2 `CHECK`), and named regression tests. Re-verified across four additional surfaces during this pass.
3. **RLS design.** 34 tables, 42 `SECURITY DEFINER` functions **all** with `search_path = ''`, zero tables missing RLS, roles that cannot be self-assigned.
4. **Deterministic-first AI.** The model never produces a value, total or verdict; vision output is verified against the catalog before it can become a trade, with tests for real confusion pairs.
5. **A genuinely shared multi-game social engine** — one 836-line Lounge, one Exchange, one Trade Opinions serving both games via props.
6. **Non-destructive migrations.** `20260826000200` contains no `DELETE`/`DROP`/`TRUNCATE` and preserves all legacy Adopt Me social history.
7. **Platform-aware performance engineering** — `staticAssetsIncrementalCache`, `public/_headers`, `searchVisionItems()` written specifically to avoid full-catalog Levenshtein inside a 10 ms Workers budget, with the reasoning in comments.
8. **Honest degradation everywhere** — missing Supabase, missing Gemini key, unapplied migration, dead demand feed, corrupt `localStorage`, malformed trade URL all fail into truthful states.
9. **Data validation as a real gate** — `validate-trading-data.js` enforces 10 invariants and exits 1; verified passing at 3,382 items.
10. **Accessibility fundamentals** — 126 `aria-label`, 171 `aria-hidden`, 54 `useReducedMotion`, `MotionConfig reducedMotion="user"`, a real focus trap, and a textbook anti-FOUC theme bootstrap.

## TOP 10 RISKS

1. **MM2 is uncommitted AND unshipped.** Untracked in git, branch has no remote, and the last build artifact contains zero `/mm2` routes. One `git clean` loses the entire second game and both migrations.
2. **`npm run build` fails** — deployment is blocked, and there is no CI to have caught it.
3. **Adopt Me Exchange may be non-functional in production.** Both `marketplace_create_listing` overloads raise for every item when `value_history` is empty, and CI never runs `snapshot:values`.
4. **RLS is the only authorization boundary and has zero tests.** One bad policy ships silently.
5. **Gemini spend is uncapped in practice** — quotas key off a client-controllable header, both endpoints are unauthenticated, and production has all three `NICH_ALLOW_AI_*` gates open.
6. **The Adopt Me calculator can show a confident WIN on a trade it could not price** — missing values silently become 0.
7. **Wrong values on public valuation pages** — Rainbow Gun renders 41 instead of 420; Xenoknife 31 instead of 310; five weapons unreachable.
8. **MM2 catalog drift.** `game_catalog_items` is seeded once inside a migration and has no refresh path; any newly added weapon is rejected server-side.
9. **Display-name impersonation** is possible in an Exchange full of strangers trading real value.
10. **~2.9 MB of JSON across client chunks**, growing linearly with every catalog and every new game.

## TOP 10 NEXT ACTIONS

| # | Action | Effort |
|---|---|---|
| 1 | `git add` MM2 + both migrations, commit, push the branch | XS |
| 2 | Fix the 7 type errors; add CI (`tsc → eslint → test → data:validate ×2`) | M |
| 3 | Verify production `value_history` is populated; add `snapshot:values` + `alerts:values` to the nightly workflow | S |
| 4 | Read `cf-connecting-ip` first in all four rate-limited routes | XS |
| 5 | Route MM2 profiles by `item.ID`; fix `buildLookup` last-write-wins | S |
| 6 | `BEFORE INSERT OR UPDATE` on both display-name triggers; add `can_post_lounge_channel` to the `community_posts` UPDATE policy | XS |
| 7 | Point `games/registry.ts` at `clientItemList`; construct adapters per game | S |
| 8 | Extract a shared `getTradeVerdict()`; then port MM2's `CHECK` state to Adopt Me | M |
| 9 | Give `GameItemPicker` the ARIA + keyboard support `ItemSearchPicker` already has | S |
| 10 | Rewrite `README.md` to describe the actual system; delete the 19 dead modules | S |

---

# PART F — AUDIT COMPLETENESS ATTESTATION

| Check | Result |
|---|---|
| Every directory in the repo appears in the coverage ledger | ✅ verified against `find . -type d` |
| Every `src` module named in ≥1 report | ✅ 226/226 (13 gaps found and closed) |
| Every route traced | ✅ 63 route files |
| Every migration reviewed | ✅ 11 + 6 legacy SQL files (duplication verified by `diff`) |
| Every script reviewed | ✅ 20 in `scripts/` + 2 in `scripts/lib/` |
| Every test reviewed | ✅ 5 files / 49 tests, executed |
| Both data pipelines traced source → consumer | ✅ incl. the DB hop |
| Deployment/config files reviewed | ✅ 9 files |
| Adversarial verification performed | ✅ this document |
| Findings corrected where falsified | ✅ C-1, C-2, SEC-01 confidence |
| **Excluded by design** | `node_modules/`, `.next/`, `.open-next/` (read as evidence only), `.wrangler/`, `supabase/.temp/`, `supabase/migrations_backup_20260817/` (byte-identical duplicates), `.env.local` / `.dev.vars` (key names read, values never printed) |

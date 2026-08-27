# 21 — Prioritized Roadmap

Effort: **XS** <30 min · **S** <½ day · **M** 1–3 days · **L** 1–2 weeks · **XL** >2 weeks

---

# ⚡ HIGH IMPACT / LOW EFFORT — do these first

| # | Action | Effort | Why it is worth doing now |
|---|---|---|---|
| **H1** | **`git add` the MM2 subsystem + both migrations; commit; push the branch** | XS | The entire MM2 product, the multi-game adapter layer, and both database migrations exist only in one working directory. Everything else in this document is moot if that directory is lost. |
| **H2** | Read `cf-connecting-ip` **first** in the four rate-limited routes | XS | Closes the only HIGH-severity security finding and restores the Gemini spend cap. 4 one-line changes. |
| **H3** | Add `and public.can_post_lounge_channel(channel_slug)` to the `community_posts` UPDATE policy | XS | Closes the announcements-channel bypass. One `create policy`. |
| **H4** | Change both `fill_*_display_name` triggers to `BEFORE INSERT OR UPDATE`; add one to `community_posts` | XS | Closes the impersonation vector in a trading marketplace. |
| **H5** | Delete `/mm2/item/[name]` + `MM2DemandPanel` + `MM2TradePanel` | XS | Removes a permanently broken, indexable route and two placeholder components. |
| **H6** | Point `src/games/registry.ts` at `clientItemList` instead of `tradingItems.json` | S | Removes ~1 MB of JSON from six of the busiest routes. The compact index already contains every field the registry reads. |
| **H7** | Add `snapshot:values` + `alerts:values` to `.github/workflows/update-elve-shark-values.yml` | S | Keeps Adopt Me Exchange working and makes the value-alert feature actually fire. |
| **H8** | Add a CI workflow: `tsc → eslint → test → data:validate ×2` | S | Would have blocked the current broken build. |
| **H9** | Exclude `.dev.vars*`, `.open-next`, `.wrangler`, `supabase/.temp` from `create-safe-export.mjs` | XS | The script's entire purpose is not shipping these. |
| **H10** | Add security headers to `public/_headers` | XS | Most of the site is static and currently carries none. |
| **H11** | Route MM2 profiles by `item.ID`, not `item.NAME` | S | Fixes 5 unreachable weapons and two 10× value errors on user-facing valuation pages. |

---

# P0 — Correctness, security, urgent

### P0-1 · Fix the build
**Why** `npm run build` exits 1. `npm run deploy` cannot run. **Impact** Nothing ships. **Effort** M. **Risk** Low.
**Depends on** H1 (commit first, so the fix is reviewable).
**Files** `scripts/test-nich-local-max.ts:50` · `src/components/nich/assistant/useNichLocalData.ts:172` · `src/components/mm2/MM2AddWeaponModal.tsx:11,45` · `src/lib/exchange/matching.ts:111,118` · `src/app/mm2/values/page.tsx:8` · `tests/nichTradeSession.test.ts:323`
Then wire H8 so it cannot regress.

### P0-2 · Commit and push the untracked half of the product
**Why** `git status` lists `src/app/mm2/`, `src/components/mm2/`, `src/games/`, `src/data/mm2*.json`, `src/lib/supabase/multigameCompat.ts`, both `20260826*` migrations, six scripts, four `source-data/mm2-*` files, and `public/themes/mm2/` as untracked. The branch has no remote.
**Impact** Total loss of MM2 + multi-game architecture on any `git clean`, fresh clone, or disk failure.
**Effort** XS. **Risk** None. **Do not** use `npm run refresh:deploy` — it would `git add . && push origin main` from a tree whose build fails.

### P0-3 · Fix the rate-limit identity
**Why** `10_AUTH_SECURITY_AUDIT.md` SEC-01. Cloudflare appends the real IP to a client-supplied `X-Forwarded-For`; `split(",")[0]` returns the attacker's value. Both Nich endpoints are unauthenticated, and `wrangler.jsonc` has all three `NICH_ALLOW_AI_*` gates **open** in production.
**Impact** Uncapped Gemini billing. **Effort** XS. **Risk** Low.
**Files** `api/nich/route.ts:416-427` · `api/nich/vision/route.ts:100-105` · `api/exchange/event/route.ts:16` · `api/feedback/route.ts:7`

### P0-4 · Guarantee `value_history` is populated
**Why** `18_DEPLOYMENT_OPERATIONS.md` OPS-01. `marketplace_create_listing`/`_offer` raise for every Adopt Me item when `value_history` is empty.
**First action:** verify production `value_history` is non-empty. If it is not, this is a live outage of Adopt Me Exchange presenting as a confusing catalog error.
**Impact** The entire Adopt Me Exchange. **Effort** S. **Risk** Low. **Depends on** a `SUPABASE_SECRET_KEY` repo secret.

### P0-5 · Verify the multi-game migrations are applied to production
**Why** Both `20260826*` migrations are untracked, and migrations are applied by hand (`supabase/README.md`). Nobody can currently tell whether production has them.
**Impact** MM2 Exchange/Lounge/Opinions silently unusable if not. **Effort** XS (a query). **Risk** None.

---

# P1 — High-value architecture

### P1-1 · Close the cross-game route leaks
**Why** `03_ROUTE_MAP.md` R-03/R-04. Violates `CLAUDE.md` non-negotiable #5.
**Impact** MM2 mode isolation on the highest-intent user action (acting on a notification).
**Effort** M. **Risk** Medium — touches 17 SQL literals.
**Work**
1. New migration: derive an `href` prefix from `game_id` in the seven notification-emitting RPCs/triggers.
2. Pass `expectedGameId="adopt-me"` in `app/exchange/[id]/page.tsx`.
3. Add an `expectedGameId` prop to `TradeRoomExperience`; pass it from both room routes.

### P1-2 · Bring the Adopt Me calculator to MM2 parity
**Why** `05_ADOPT_ME_DEEP_DIVE.md` §3. The flagship calculator lacks URL state, quantity, duplicate merging, sharing, persistence and — most importantly — a truthful missing-value state. It can currently show a confident **WIN** on a trade it could not price.
**Impact** Correctness of the product's core promise. **Effort** L. **Risk** Medium — `CLAUDE.md` treats calculator semantics as correctness-critical.
**Sequence**
1. Extract `getTradeVerdict(your, their, {missingCount})` into a shared module; make all four current copies call it; add boundary tests. **(do this first)**
2. Consolidate the codecs into `lib/tradeRows.ts`; wire `/calculator` to hydrate from the URL. **(fixes B-03)**
3. Add quantity + duplicate merging; make `selectedItemsToRows` carry real quantities.
4. Port MM2's `CHECK` state. **(fixes B-14)**
5. Add share link + recent trades if wanted.
**Do not** merge the two calculators into one engine before step 4 — that would lock in the weaker semantics.

### P1-3 · Fix the MM2 profile route collisions
**Why** `19_BUG_EDGE_CASE_REPORT.md` B-04. Rainbow Gun shows 41 instead of 420; Xenoknife shows 31 instead of 310; five weapons are unreachable.
**Impact** Wrong values on user-facing valuation pages — the most consequential bug class in this product.
**Effort** S. **Risk** Low. IDs have zero normalization collisions across all 1,099 items.
**Also fix** `registry.ts:66-73` `buildLookup` last-write-wins (B-05).

### P1-4 · Give `game_catalog_items` a refresh path
**Why** `08_DATA_PIPELINES.md` D-02. MM2 Exchange rejects any weapon added after 2026-08-24.
**Effort** M. **Risk** Low. Write `scripts/push-mm2-catalog.mjs` mirroring `push-value-snapshot.mjs`; add to `refresh:mm2`; strip the ~1,200-line seed out of the migration once the script exists.

### P1-5 · Trim the client bundle
**Why** `14_PERFORMANCE_AUDIT.md` P-01. A 1,653 KB chunk carrying both full catalogs loads on `/exchange`, `/mm2/exchange`, `/trade-opinions`, `/mm2/trade-opinions`, `/lounge`, `/mm2/lounge`.
**Effort** S–M. **Risk** Low. (a) registry → `clientItemList`; (b) construct adapters per game so one game never loads the other's catalog.

### P1-6 · Fix realtime
**Why** `09` DB-04, DB-05. Three subscriptions never fire; six are unfiltered.
**Effort** S. **Risk** Medium — verify nothing depends on cross-game events.
**Work** Add the three tables to the publication (or delete the dead subscriptions); add `filter: "game_id=eq.<gameId>"` to the Exchange channel.

### P1-7 · Add MM2 to the sitemap and give `/mm2` its own boundaries
**Why** Half the product is invisible to search; MM2 render errors fall back to the Adopt Me shell.
**Effort** S. **Risk** Low. Also remove `/trade-feed` and `/community` from the sitemap and repoint `QuickActions`.

---

# P2 — Maintainability & product quality

| # | Action | Effort | Risk | Notes |
|---|---|---|---|---|
| P2-1 | Delete the 19 orphaned components (6,268 ln) as 2 clusters | S | None | Verified by transitive reachability closure (`23` C-1) |
| P2-2 | Move `src/lib/supabase/*.sql` (~4,750 ln) to `docs/sql-history/`; fix `supabase/README.md`'s stale filename | XS | None | Second unversioned schema copy inside `src/` |
| P2-3 | Delete `mm2ItemsIndex.json`, `mm2Categories.json`, `homePopularItems.json`, `api/items/route.ts` — **or** wire `/values` to `/api/items` | S | Low | Pick one implementation |
| P2-4 | Move the 19 root status files (18 `.md` + `MM2_VALUES_UPDATE_NOTES.txt`) to `docs/history/` | XS | None | 9 are versions of one MM2 homepage redesign |
| P2-5 | Fix the 28 `no-explicit-any` (20 in `mm2/values/[id]`) — `MM2Item` already exists | M | Low | |
| P2-6 | Remove the MM2 calculator's GCash option, or populate `GCASH_VALUE` | XS | Low | All 1,099 items are `null` |
| P2-7 | Have the MM2 scraper write only `source-data/mm2-source-values.json` | XS | Low | Removes the second writer to `mm2Items.json` |
| P2-8 | Schedule the three prune functions (`pg_cron` or a nightly workflow) | S | Low | Four telemetry tables grow unbounded |
| P2-9 | Restrict the `marketplace_listings` UPDATE policy to user-editable columns | S | Medium | Closes the `game_id`/`expires_at` flip (DB-03); `marketplace_set_listing_status` already exists |
| P2-10 | Add Profile + Notifications to `MM2Navbar` | XS | None | Both routes are game-agnostic and work as-is |
| P2-11 | Replace 9 raw `<img>` with `next/image` | S | Low | `supremevalues.com/media/**` is already whitelisted |
| P2-12 | Fix `MM2Navbar` mobile chips to 44 px; remove `aria-disabled` links from the tab order; add a skip-to-content link | S | Low | |
| P2-13 | Move `playwright`/`sharp`/`cheerio`/`axios`/`xlsx`/`fs-extra`/`node-fetch` to `devDependencies` | XS | Low | |
| P2-14 | Disclose third-party AI processing in the Nich UI and `/privacy` | S | None | Audience skews young; currently undisclosed |
| P2-15 | `AbortSignal.timeout()` + parallel pages in `/api/demand` | S | Low | |
| P2-16 | Add a Prettier config | XS | Low | `TradeCalculator.tsx` (2 tokens/line) vs `values/page.tsx` (1000+ char lines) |

---

# P3 — Future scale

| # | Action | Effort | Notes |
|---|---|---|---|
| P3-1 | Tier-2 database/RLS test suite | M | Highest security ROI of any remaining work — would have caught DB-01, DB-02, DB-03, DB-04 |
| P3-2 | Playwright E2E on the six user flows (already a dependency) | L | Would have caught B-02, B-03, B-04 |
| P3-3 | Move `valueSources`/`symbol`/`label`/`calculatorHref`/`wflThreshold` onto the adapter | M | Removes every `if (gameId === "mm2")` outside the registry |
| P3-4 | A `GameShell` layout component | M | Removes the duplicated navbar and per-page `lg:pl-[…]` convention |
| P3-5 | Server-side Supabase client (`@supabase/ssr`) | L | Unlocks real route protection + defence in depth. Highest blast radius — do last |
| P3-6 | Rationalise `globals.css` (4,953 ln, 157 `!important`) toward CSS Modules | L | Any new theme work hits this wall |
| P3-7 | Split `api/nich/route.ts` (2,166 ln) and reconcile the two `tradeComparison` implementations | L | |
| P3-8 | Monetization foundations (tier column, per-account quotas, entitlements) | XL | Greenfield, not refactor |
| P3-9 | MM2 personal tools (inventory / wishlist / alerts / matching) | XL | Prerequisite for MM2 Nich |

---

# Suggested sequence

```
Week 0 (½ day)   H1 H2 H3 H4 H5 H9 H10           ← stop the bleeding
Week 1           P0-1 P0-2 P0-3 P0-4 P0-5 H7 H8  ← restore deployability & data integrity
Week 2           P1-1 P1-3 P1-5 P1-6 P1-7 H6 H11 ← close leaks, wrong values, bundle
Week 3–4         P1-2 (the 5-step calculator sequence) P1-4
Week 5           P2 batch — cleanup, types, ops
Week 6+          P3-1 then P3-2 (tests) → P3-3/P3-4 (abstraction) → P3-5
```

**The single highest-value hour in this plan is Week 0.** H1 alone protects several weeks of existing work; H2–H4 close every finding above LOW severity that can be fixed in one line.

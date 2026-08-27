# 01 — Executive Summary

**Repo:** `csbt-price-checker` (CSBT HUB) · **Branch:** `calculator-redesign-v2` · **HEAD:** `2660a50`
**Audited:** 2026-08-27 · Static analysis + executed validation commands. No live Supabase project was queried.

---

## 1. What CSBT HUB actually is (VERIFIED)

A Next.js 16 App Router application deployed to **Cloudflare Workers** via `@opennextjs/cloudflare`, serving Roblox trading intelligence for two games:

| | Adopt Me | MM2 |
|---|---|---|
| Routes | `/`, `/values`, `/calculator`, `/demand`, `/exchange`, `/trade-opinions`, `/lounge`, `/inventory`, `/wishlist`, `/profile`, `/notifications`, `/trades`, `/nich`, `/seminar`, … | `/mm2`, `/mm2/values`, `/mm2/calculator`, `/mm2/demand`, `/mm2/exchange`, `/mm2/trade-opinions`, `/mm2/lounge` |
| Dataset | `src/data/tradingItems.json` — **3,382 items** (verified by `npm run data:validate`) | `src/data/mm2Items.json` — **1,099 items** (verified by `npm run data:validate:mm2`) |
| Value sources | GCash, Elve Shark | Supreme (GCash column exists but is empty in the shipped data) |
| Personal tools | Inventory, Wishlist, Watchlist/alerts, saved trades, Nich AI | **None** |

Persistence is **Supabase only**, accessed **exclusively from the browser** (`src/lib/supabase/client.ts`) plus four server routes that use the service-role key. There is no server-side session client and no Next.js middleware. **Postgres RLS is the entire authorization boundary**, and it is unusually well built (see §4).

---

## 2. The three findings that matter most

### P0-1 — `npm run build` currently FAILS · CONFIRMED
```
✓ Compiled successfully in 5.4s
  Running TypeScript ...
Failed to type check.
./scripts/test-nich-local-max.ts:50:22
Type error: Property 'game_id' is missing … but required in type 'ExchangeListing'.
Next.js build worker exited with code: 1
```
`npx tsc --noEmit` → **exit 1, 7 errors**. `npx eslint .` → **exit 1, 31 errors / 18 warnings**.
`npm run deploy` runs `opennextjs-cloudflare build`, which runs `next build`. **This branch cannot be deployed as-is.**
All 7 type errors and every one of the 49 lint problems are in MM2 code or the two calculator files — the Adopt Me core is clean. Full detail: `16_TESTING_RELIABILITY.md`.

### P0-2 — Adopt Me Exchange depends on a table CI never populates · CONFIRMED
`marketplace_create_listing` and `marketplace_create_offer` re-resolve every Adopt Me item's canonical name/value from `public.value_history`
(`supabase/migrations/20260826000100_multigame_social.sql:1337-1345`, `:1695-1703`) and hard-fail with
`Item % / % is not in the current CSBT % catalog` when no row exists.

`value_history` is written **only** by `scripts/push-value-snapshot.mjs`, which runs only inside `npm run refresh:values`.
The nightly GitHub Action `.github/workflows/update-elve-shark-values.yml` runs `update:elve → generate:data → data:validate` and **never calls `snapshot:values`** — nor `sync:master`. If that snapshot has not been run manually against production, **no Adopt Me listing or offer can be created at all**, and the failure surfaces as a confusing "not in the catalog" error.

### P0-3 — Nich AI rate limits are bypassable by a spoofable header · CONFIRMED
`src/app/api/nich/route.ts:416-427` derives the quota identity from `x-forwarded-for` then `x-real-ip` — **`cf-connecting-ip` is never consulted.**
`src/app/api/nich/vision/route.ts:100-105` reads `x-forwarded-for` **before** `cf-connecting-ip`.
On Cloudflare, the edge *appends* the real IP to any client-supplied `X-Forwarded-For`; `split(",")[0]` therefore returns the **attacker-controlled** entry. Rotating that header defeats `NICH_GEMINI_VISION_RATE_LIMIT` (6/min) and `NICH_GEMINI_VISION_DAILY_LIMIT` (100/day) — the app's only guard on paid Gemini vision spend. Same pattern in `api/exchange/event/route.ts:16` and `api/feedback/route.ts:7`.
Mitigating context: `.env.example:56` already advises a Google billing budget as the real account-level guard.

---

## 3. The structural story: two products at two quality bars

Adopt Me is a mature product. MM2 is a fast, visually ambitious port that reuses the shared social engine well but was not held to the same engineering bar.

| Signal | Adopt Me | MM2 |
|---|---|---|
| TypeScript errors | 0 in `src/app/**` Adopt routes | 3 of 7 (`mm2/values/page.tsx`, `MM2AddWeaponModal.tsx`, `mm2/values/[id]`) |
| ESLint problems | 1 file (`TradePetCard.tsx`) | 18 files |
| `any` usages | ~0 | 28 errors, all MM2 |
| Dead components | 7 (4,436 ln) | 12 (1,832 ln) |
| Committed to git | Yes | **No — the entire MM2 subsystem is untracked** |
| Present in the last deployable build | Yes | **No — zero `/mm2` routes in `.open-next`** |

Ironically the **MM2 calculator is the better calculator**: it has quantity, duplicate merging, URL hydration, share links, saved trades, a Balance Finder, and a truthful `CHECK` state that withholds W/F/L when a value is missing (`MM2TradeSummary.tsx:43-52`). The **Adopt Me calculator has none of that** and silently treats a missing value as `0` (`TradeCalculator.tsx:42-50`).

**The single largest risk in this repository:** `git status` shows `src/app/mm2/`, `src/components/mm2/`, `src/games/`, `src/data/mm2*.json`, both multi-game migrations, and all six MM2 scripts as `??` — **untracked**. The branch has no remote. A `git clean -fd` or a fresh clone loses the entire MM2 product and the multi-game architecture.

The adversarial pass made this worse, not better: `.open-next/server-functions/default/.next/routes-manifest.json` (built **2026-08-21**) contains **zero** `/mm2` routes. Combined with the current build failure, the evidence is that **MM2 has never been built for deployment and is almost certainly not live on `csbthub.com`.** See `18_DEPLOYMENT_OPERATIONS.md` OPS-05 and `23` N-3.

---

## 4. What is genuinely strong

- **Server-side trade validation.** `marketplace_create_offer` accepts `p_sender_total`/`p_recipient_total` from the client and then **ignores them**, recomputing both totals from server-resolved catalog values and writing `server_validated: true` into the explanation (`20260826000100_multigame_social.sql:1722-1748`). Client-supplied trade values cannot be forged.
- **Honest missing-data handling in the RPC layer.** When any offer item has no canonical value, `compatibility_score` is set to `NULL` rather than a fabricated number (`:1729-1731`).
- **RLS design.** 34 tables with RLS enabled; 42 `security definer` functions; every privileged mutation goes through an RPC that re-checks `auth.uid()`. Moderation (`marketplace_moderate_report`) and middleman actions verify staff/assignment membership server-side, not in the UI.
- **Zero-value discipline in the data pipeline.** `push-value-snapshot.mjs:37-40` explicitly refuses to write `value <= 0` into `value_history`, with a comment explaining that an unpriced item must not become a canonical zero-value listing.
- **Non-destructive multi-game backfill.** `20260826000200_preserve_adoptme_social_history.sql` contains no `DELETE`/`DROP`/`TRUNCATE` and states so in a header comment.
- **Test suite quality.** 49 tests, all passing, heavily concentrated on Nich vision/trade-session correctness — including tests that assert the system *refuses* to invent a canonical item.

---

## 5. Scores — final, after adversarial verification

Three scores moved during the adversarial pass; the deltas and their causes are recorded in `23_ADVERSARIAL_VERIFICATION_AND_SCORING.md` Part E.

| Dimension | Score | One-line justification |
|---|---|---|
| Overall project health | **5.5 / 10** *(was 6.0)* | Excellent backend and data discipline undermined by a broken build, no CI, and a half of the product that is neither committed nor shipped. |
| Architecture | **6.5 / 10** | The adapter/registry idea is right and the shared social engine genuinely works across two games; the abstraction is ~60% complete and the value layer is still Adopt-Me-shaped. |
| Code quality | **4.5 / 10** *(was 5.0)* | Adopt Me core is clean and well-commented; against it, 7 type errors, 49 lint problems (all in MM2 or the calculators), 28 `any`, and **6,268** lines of dead code. |
| Security | **7.5 / 10** | RLS + server-side revalidation are strong. Deductions: spoofable rate-limit identity, an announcements-channel bypass, display-name impersonation, and cross-game route leaks. No exposed secrets found. |
| Scalability | **6.0 / 10** | Postgres/RLS scales fine; a 1.65 MB client JSON chunk and unfiltered realtime fan-out do not. |
| UX / product cohesion | **5.5 / 10** *(was 6.0)* | Each mode is internally coherent and empty states are honest; the seam leaks (notification hrefs, no MM2 account surfaces, two unequal calculators) and the shared item picker is keyboard-inaccessible. |
| Testing & reliability | **4.5 / 10** | 49 solid tests, but ~40 of them cover Nich vision. Zero tests for the calculators, Exchange matching, RLS, or any API route. |

**Weighted overall: 5.5 / 10 — "strong foundations, unshipped and unverified."**

---

## 6. Top 10 next actions

| # | Action | Priority | Effort |
|---|---|---|---|
| 1 | **`git add` the MM2 subsystem and both migrations.** Everything else is moot until the work is durable. | P0 | 10 min |
| 2 | Fix the 7 TypeScript errors so `next build` passes; add `tsc --noEmit` to CI. | P0 | 1–2 h |
| 3 | Add `snapshot:values` to the nightly workflow (or document it as a required manual step) so Adopt Me Exchange keeps working. | P0 | 30 min |
| 4 | Read `cf-connecting-ip` **first** in all four rate-limited routes. | P0 | 15 min |
| 5 | Make notification `href`s game-aware in the SQL RPCs; add `expectedGameId` to `/exchange/[id]` and both room routes. | P1 | 3–4 h |
| 6 | Point `src/games/registry.ts` at `clientItemIndex` instead of raw `tradingItems.json` — removes ~1 MB from the client bundle. | P1 | 1 h |
| 7 | Delete `/mm2/item/[name]` (broken under Next 16 async `params`) and the 16 orphaned modules. | P1 | 1 h |
| 8 | Bring the Adopt Me calculator to MM2 parity: URL hydration, quantity, and a `CHECK` state instead of silent zeros. | P1 | 1–2 d |
| 9 | Add `can_post_lounge_channel(channel_slug)` to the `community_posts` UPDATE policy. | P1 | 15 min |
| 10 | Add the three missing tables to the realtime publication, or delete the dead subscriptions. | P2 | 30 min |

Full prioritised plan with impact/effort/risk/dependencies: `21_PRIORITIZED_ROADMAP.md`.

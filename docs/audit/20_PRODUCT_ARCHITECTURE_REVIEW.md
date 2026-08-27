# 20 — Product Architecture Review

Assessing whether the architecture as built can carry where the product wants to go.

Classification: **STRONG** · **ACCEPTABLE FOR NOW** · **LIMITING FUTURE SCALE** · **NEEDS REWORK SOON**

---

## 1. Major architectural decisions

| # | Decision | Verdict | Reasoning |
|---|---|---|---|
| 1 | **Next.js App Router on Cloudflare Workers via OpenNext** | **STRONG** | Correctly matched to the workload: mostly static value pages, a handful of dynamic API routes. `open-next.config.ts` explicitly serves prerendered routes from Workers Static Assets to avoid the NextServer on the Free 10 ms CPU budget, and the code comments show the constraint was designed around, not discovered. |
| 2 | **Supabase as the only backend** | **STRONG** | Postgres + RLS + realtime + storage + auth in one service. For a two-person-scale team shipping a social trading product, this removes an entire backend tier. |
| 3 | **Postgres RLS as the sole authorization boundary** | **ACCEPTABLE FOR NOW** | Executed unusually well — 34 tables, 42 definer functions, every mutation re-derives `auth.uid()`. The risk is that it is a *single* line of defence with **zero automated tests**. One bad `create policy` ships silently. |
| 4 | **Server-side revalidation of all trade values in RPCs** | **STRONG** | The single best decision in the codebase. Client totals are accepted and ignored; every item is re-resolved from a server catalog; `compatibility_score` is `NULL` rather than guessed when data is missing. Trade values cannot be forged. |
| 5 | **Generated JSON as the value catalog** | **ACCEPTABLE FOR NOW** | Fast, cacheable, versionable, diff-reviewable in git. Breaks down at ~10k items or when values need to change without a deploy. |
| 6 | **`game_id` column + shared social engine** | **STRONG** | The hard half of multi-game is genuinely done: one schema, one RPC pair, one Exchange/Opinions/Lounge implementation serving both games. |
| 7 | **Adapter/registry for game differences** | **ACCEPTABLE FOR NOW** | Right idea, ~60% complete. Value types, calculators, navbars, routing and formatting all still branch on `gameId` outside the adapter. |
| 8 | **Browser-only Supabase client, no SSR session** | **LIMITING FUTURE SCALE** | Forces every protected page to be a client shell, prevents server-side route protection, and means SEO/perf work on account surfaces is capped. |
| 9 | **Deterministic-first AI with an optional LLM layer** | **STRONG** | Values, totals and verdicts are never model-generated; vision output is verified against the catalog before it can become a trade. Four independent cost gates. This is the correct architecture for AI in a valuation product. |
| 10 | **Two independent calculators** | **NEEDS REWORK SOON** | Zero shared code, a duplicated verdict rule in four places, and the *flagship* (Adopt Me) is the weaker and less honest of the two. |
| 11 | **Notification hrefs hard-coded in SQL** | **NEEDS REWORK SOON** | The database knows `game_id` and still writes `/exchange/...`. Breaks game isolation on the highest-intent user action. |
| 12 | **Manual deploy + manual migrations, no CI** | **NEEDS REWORK SOON** | Directly responsible for a broken build sitting as the working head, and for uncertainty about whether production has the multi-game migrations. |
| 13 | **Two competing catalog sources per game** (`value_history` / `game_catalog_items` vs generated JSON) | **NEEDS REWORK SOON** | Silent divergence that surfaces as a confusing user-facing error. |
| 14 | **Four themes via CSS custom properties** | **ACCEPTABLE FOR NOW** | Well-executed anti-FOUC + `useSyncExternalStore`. The 157 `!important` declarations are the bill for mixing raw Tailwind utilities with a token system. |

---

## 2. Can the architecture carry each growth axis?

### Additional games — **YES, with a known cost curve**
A second *complete* game does not exist yet; MM2 is a second *partial* game. The DB, RPC layer, and three social systems are genuinely game-generic. A third game needs ~1 day of mechanical work plus ~3 weeks of presentation work (navbar, calculator, codec, pipeline, routes) to reach MM2 parity. Full detail: `07_MULTIGAME_ARCHITECTURE.md` §5.

**The cost is dominated by things that should be shared and are not** — which is exactly the tractable kind of debt.

### Shared community identity — **YES, already true**
`profiles`, `public_profiles`, `marketplace_user_stats`, trust score, reviews, blocks, reports and notifications are all game-agnostic by design. A trader's reputation already spans both games. This is a genuine platform asset.

**Gap:** MM2 mode has no navigation to any account surface (`13_UI_UX_AUDIT.md` A-1).

### Different value systems — **PARTIALLY**
The adapter models `valueSources` per game and the DB enforces per-game source constraints (`(game_id='mm2' and value_source='SUPREME')`). But `lib/valueSystem.ts` still hardcodes `"GCASH" | "ELVE"`, and that mismatch produces two of the seven build-breaking type errors. A game with, say, three sources and two variant axes would need `valueSystem.ts` rewritten.

### Larger databases — **NO, not on the current client strategy**
`src/games/registry.ts` ships **1.65 MB** of raw JSON to the browser on six routes (`14_PERFORMANCE_AUDIT.md` P-01), and `/values` filters 3,382 items client-side per keystroke. At 10k items across three games this becomes untenable on mobile.

The fix is already half-built: `clientItemIndex.ts` (compact tuples) and `/api/items` (server-side filtering) both exist and are both bypassed.

### More users — **YES for Postgres, NO for the realtime pattern**
Indexing matches the query shapes (`09` DB-07), and RLS scales with Postgres. The bottleneck is `useExchangeData.ts:360-383`: six **unfiltered** realtime subscriptions where each listing write triggers a refetch on every connected client — O(N×M). The correct pattern is used two files away in `useTradeRoomData`.

### Moderation — **YES, well-designed**
`exchange_staff` role table with no self-service policy; `marketplace_moderate_report` raises before doing anything unless the caller is staff; staff get explicit read policies on rooms/events/messages but **cannot** send messages or change trade status; upheld reports auto-close the listing and notify both parties; `trust_score` deducts 20 per upheld report. The middleman system is separately scoped with its own assignment checks. This is a mature safety architecture.

### Monetization — **NEEDS FOUNDATIONS**
No payments, subscriptions, entitlements, or feature flags per user. `profiles` has no tier column. Nich quotas are per-IP, not per-account — so a paid "more AI" tier has nothing to attach to. Adding this is greenfield, not refactor, which is the easier position to be in.

### Mobile expansion — **YES for web**
776 `sm:` breakpoint usages, genuinely recomposed layouts (separate mobile nav DOM, a different calculator result surface), 42 components respecting 44 px touch targets, `MotionConfig` shortening transitions on mobile. For a native app, the browser-only Supabase client and the absence of any API layer beyond seven routes would mean building a mobile API from scratch — the RPCs would carry most of it.

### More AI — **YES, architecturally**
The Credit Saver design (intent allowlist → style mode → explicit opt-in → feature flags → daily cap → cache → in-flight dedupe) is a reusable cost-control chassis. **Blocked by** the spoofable rate-limit identity (`10` SEC-01): today's caps do not actually cap anything.

### Community growth — **YES**
Lounge (11 channels, reactions, replies, presence, image upload), Trade Opinions, trade rooms, middleman, reviews, reports, blocks — all shared and all game-scoped. The schema supports more channels and more games without change.

---

## 3. The central architectural tension

> **The backend is built for a platform. The frontend is built for two products.**

- **Database:** one schema, `game_id` everywhere, one RPC pair, game-generic identity and trust. Genuinely a platform.
- **Server logic:** one validation path branching cleanly on game. Genuinely a platform.
- **Social features:** one implementation, prop-configured. Genuinely a platform.
- **Everything the user sees:** two navbars, two calculators, four verdict-rule copies, four wire-codec copies, two item-picker modals, three MM2 image-URL prefixers, Adopt-Me-only personal tools, Adopt-Me-only value history, Adopt-Me-only Nich, and Adopt-Me-only notification links.

This is the *good* version of that tension — the expensive, correctness-critical, hard-to-change half is the platform half. The duplicated half is presentation code that can be consolidated incrementally without risking data integrity.

---

## 4. Trajectory

**If nothing changes:** each new game adds ~3 weeks of duplicated presentation code, the verdict rule drifts across four copies, the client bundle grows by another full catalog, and the two DB catalog sources drift further from the shipped JSON.

**With the P0/P1 work in `21_PRIORITIZED_ROADMAP.md`:** the build becomes reproducible and CI-gated, the value pipeline becomes self-sustaining, cross-game leaks close, ~1.5 MB leaves the client bundle, and the calculator layer gets a single shared verdict function. That is roughly 3–4 weeks of work and it converts the architecture from "two products sharing a database" into "a platform with two front-ends".

**The decision that would most change the ceiling** is #8 — adding a server-side Supabase client. It unlocks real route protection, server-rendered account pages, and a defence-in-depth layer over RLS. It is also the highest-blast-radius change in this document and should come after the P0/P1 work, not before.

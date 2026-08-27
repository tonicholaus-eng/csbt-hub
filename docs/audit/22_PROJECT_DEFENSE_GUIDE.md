# 22 — Project Defense Guide

For explaining CSBT HUB to technical evaluators. Every claim here is backed by repository evidence. Limitations are stated, not hidden — a panel that finds a limitation you concealed will discount everything else you said.

---

## 1. The one-paragraph pitch

> CSBT HUB is a Roblox trading-intelligence platform. Roblox trading games like Adopt Me and Murder Mystery 2 have no in-game pricing — item values live in scattered community spreadsheets and Discord servers, so newer traders get scammed routinely. CSBT HUB gives them a single place to look up current values, compare both sides of a trade before accepting it, ask the community for a Win/Fair/Lose opinion, and negotiate through a structured Exchange with trade rooms, trust scores, middlemen and moderation. It runs on Next.js 16 on Cloudflare Workers with Supabase for persistence, serves **3,382 Adopt Me items and 1,099 MM2 weapons**, and is built as a multi-game platform rather than two separate websites.

## 2. The problem, concretely

| Problem | What CSBT HUB does |
|---|---|
| No official prices; values live in spreadsheets and Discord | Automated pipelines from Elve Shark (Adopt Me) and Supreme Values (MM2), validated before publishing |
| Traders cannot tell a fair trade from a bad one | Trade Calculator with W/F/L verdicts, plus community Win/Fair/Lose voting |
| Scamming is rampant | Structured Exchange: server-validated offers, locked trade rooms, trust scores, an approved middleman roster, reports and moderation |
| Values change constantly | Nightly refresh, `value_history` snapshots, and per-item value alerts |
| Beginners don't know the rules | Safe Trader Academy (`/seminar`) with missions and quizzes |
| Looking things up is slow | Nich — an assistant that reads a trade screenshot and identifies the items |

---

## 3. Architecture in one diagram

```
Browser ─┬─ prerendered pages (Workers Static Assets)
         ├─ anon-key PostgREST + realtime ──────▶ Supabase Postgres (RLS)
         └─ /api/* (7 routes, Node runtime) ────▶ service-role Supabase
                                                └▶ Gemini 3.6 Flash (text + vision)

Build time only: elvebredd.com ─▶ xlsx ─▶ generated JSON ─▶ value_history
                 supremevalues.com ─▶ xlsx ─▶ generated JSON ─▶ game_catalog_items
```

---

## 4. Panel Q&A

### POSSIBLE PANEL QUESTION — "Why Next.js?"
**STRONG ANSWER**
Three properties of this product drove it. First, most of the site is *static content that changes daily* — 3,382 item pages regenerate when values refresh. `generateStaticParams` + `dynamicParams = false` prerenders all of them at build time, so a value page is a static file, not a database query. Second, the parts that must be dynamic — the AI endpoints, the demand proxy, telemetry — are a handful of route handlers in the same codebase. Third, App Router's server/client split lets me keep the 1.7 MB catalog out of pages that don't need it.

The Cloudflare pairing matters too: `open-next.config.ts` installs `staticAssetsIncrementalCache` so prerendered routes are served from Workers Static Assets and never spin up the Next server — that is what makes the site viable on the Workers Free 10 ms CPU budget.

*If pressed on the downside:* 44% of my `src/` files are client components, which is higher than I'd like. That's a consequence of the Supabase-in-the-browser auth model, and it's the main thing I'd change next.

### POSSIBLE PANEL QUESTION — "Why Supabase?"
**STRONG ANSWER**
It gave me Postgres, row-level security, realtime, storage and auth in one service, so a two-game social trading product didn't need a separate backend tier. Concretely: the Lounge's live chat, the Exchange's live listings, and the notification badge are all Postgres `LISTEN/NOTIFY` through Supabase Realtime — I wrote no WebSocket server. Avatars and lounge images are in Supabase Storage with RLS policies tying each file's folder to `auth.uid()`.

The decision I'd defend hardest is putting authorization **in the database**: 34 tables with RLS, 42 `SECURITY DEFINER` functions, and every privileged mutation behind an RPC that re-derives `auth.uid()` server-side. A malicious client holding my public anon key still cannot read another user's inventory or accept someone else's offer.

### POSSIBLE PANEL QUESTION — "How do I know a user can't fake a trade value?"
**STRONG ANSWER — this is the best answer in the project, lead with it**
They can't, and the enforcement is in the database, not the UI.

`marketplace_create_offer` **accepts** `p_sender_total`, `p_recipient_total` and `p_compatibility_score` from the client — and then ignores all three. It re-resolves every item's canonical name, category, image and value server-side (from `value_history` for Adopt Me, `game_catalog_items` for MM2), raises if an item isn't in the catalog, recomputes both totals with `sum(snapshot_value * quantity)`, and overwrites the row — stamping `server_validated: true` into the explanation JSON.

Client-supplied image URLs are whitelist-filtered to `^/images/` or `^https://elvebredd.com/`. Quantities are clamped 1–99. Self-dealing raises. Blocks are checked server-side. External links in titles and notes are rejected by regex — an anti-scam control at the database layer.

And when any item has no value, `compatibility_score` is set to `NULL`, not to a guess.

### POSSIBLE PANEL QUESTION — "What stops you from showing made-up data?"
**STRONG ANSWER**
It's an explicit product rule with enforcement at four layers.

1. **Pipeline:** `push-value-snapshot.mjs` refuses to write `value <= 0` into `value_history`, with a comment explaining that an unpriced item must never become a canonical zero-value listing. It also deletes any legacy zero rows.
2. **Database:** `compatibility_score` is `NULL` when data is missing. `getKnownDemandScore()` returns `null` for an unknown tier so it can't be averaged in as a default.
3. **UI:** `formatTradeValue()` renders `"N/A"`. The homepage market panel renders `"Unavailable"` on error and says so on screen: *"Only real CSBT data is shown. Missing activity stays unavailable instead of being estimated."* When the external demand feed fails, `/demand` shows an empty board, not invented trends.
4. **Tests:** there are named regression tests for it — *"unknown catalog demand is not fabricated by offer building"*, *"vision catalog verification never accepts an invented canonical item"*, *"empty item vision result does not claim successful recognition"*.

*Honest caveat if pressed:* the MM2 calculator does this best — it shows a `CHECK` state and withholds the verdict when any item is unpriced. The Adopt Me calculator currently counts a missing value as 0. I know about it and it's the top item on my calculator roadmap.

### POSSIBLE PANEL QUESTION — "Explain the multi-game architecture. Is it real, or is it two sites in one repo?"
**STRONG ANSWER**
It's real where it's expensive and incomplete where it's cheap — which I'd argue is the right way round.

**Genuinely shared:** one database schema with a `game_id` column and CHECK constraints on six tables; one `marketplace_create_listing`/`marketplace_create_offer` pair that branches on the listing's game to pick a catalog and validate game-specific rules; and one implementation each of Exchange, Trade Opinions and the Lounge, configured by props (`fixedGameId`, `exchangeBasePath`, …). `/lounge` and `/mm2/lounge` are the same 836-line component. Identity, trust score, reviews, blocks and moderation are game-agnostic by design, so a trader's reputation already spans both games.

**Not yet shared:** the calculators, the navbars, and the personal tools. MM2 has no inventory, wishlist, value history or Nich.

I'd score the abstraction **6/10**. A third game would take about a day of mechanical work — extend a union, add an adapter, widen some CHECK constraints — plus roughly three weeks of presentation work for a navbar, a calculator and a data pipeline.

### POSSIBLE PANEL QUESTION — "Walk me through a data pipeline."
**STRONG ANSWER**
`source → snapshot → master workbook → generator → app JSON → validator → database`.

For Adopt Me: a scraper pulls the embedded item payload out of the Elve Shark calculator page and writes a timestamped JSON snapshot alongside a backup. A sync step merges that into the master `.xlsx` — backing it up first and preserving hand-maintained columns. A generator merges workbook and snapshot (Elve wins per-field, workbook is the fallback), resolves duplicates by a completeness score, and emits four files: the full dataset, a compact tuple index for the client, a pet-image index, and metadata.

Then the validator gates it: minimum item count, unique IDs, valid categories, every value field must be `number | null` and never a string, regular-only categories must not carry Neon/Mega values, and every item must have at least one known regular value. It exits 1 on any failure, so bad data can't reach the site. I ran it during this audit: `3382 items, 3382 unique IDs`.

Finally `push-value-snapshot.mjs` writes daily rows into `value_history`, which is what powers the value-history charts, the alert job, and — importantly — the server-side canonical values the Exchange validates against.

### POSSIBLE PANEL QUESTION — "Tell me about the AI. How do you know it isn't hallucinating values?"
**STRONG ANSWER**
Nich is a deterministic engine with an *optional* language layer, not an LLM wrapper. The model never produces a value, a total, or a verdict — those all come from my catalog and my calculation code. That's stated in the system prompt and enforced in the pipeline.

For screenshots, Gemini returns candidate item names and bounding boxes. Every candidate then goes through `verifyVisionItem()`, which resolves it against my catalog; anything that doesn't resolve becomes `UNRESOLVED` and the user is asked, rather than being shown a guess. There are explicit tests for the failure modes I actually hit — Sugar Skull Dog vs Sugar Axolotl, generic Elephant vs Bush Elephant, Cabbit vs Tuxedo — and a captured real-world regression fixture.

There's also cost engineering: 12 intent types never reach a model at all, there's a daily cap, a six-hour response cache, and in-flight deduplication so identical concurrent prompts share one call. Vision sends inline image data rather than the Files API, because Cloudflare egress gets rejected by the Files endpoint.

*Honest caveat:* the per-IP quotas currently key off `x-forwarded-for`, which a client can spoof on Cloudflare. `cf-connecting-ip` is the header I should read first. It's a four-line fix and it's the top security item on my list.

### POSSIBLE PANEL QUESTION — "What's your test coverage?"
**STRONG ANSWER — do not oversell this**
49 tests, all passing. They're behavioural rather than unit-trivial — they assert things the product promises, like *"independent vision disagreement never auto-confirms a wrong pet"*.

But I'll be straight about the distribution: about 40 of the 49 cover Nich vision and trade sessions. **The calculators, the Exchange matching engine, the API routes and the RLS policies have no automated tests.** That's the wrong shape for where the product's risk actually is.

My plan is tiered by risk: first a CI gate running type-check, lint and tests on every push — which I don't have today and which is exactly why a broken build is sitting on my working branch. Then unit tests on the W/F/L rule and the trade URL codecs. Then RLS tests against a throwaway Supabase branch, because RLS is my entire authorization boundary and it is currently unverified. Playwright is already a dependency for end-to-end.

### POSSIBLE PANEL QUESTION — "What are the biggest weaknesses?"
**STRONG ANSWER — name them before they do**
Five, in order:

1. **The build currently fails type-checking** — 7 errors, mostly stale test fixtures and one missing import in an MM2 component. I have no CI, which is why it wasn't caught.
2. **The MM2 half of the product is uncommitted to git.** That's the one I'd fix in the next ten minutes.
3. **RLS is my only authorization layer and it has no tests.** The policies are good; that's not the same as verified.
4. **1.65 MB of JSON ships to the browser** on the social routes, because my game registry imports the full catalog when a compact index already exists for exactly this purpose.
5. **The two calculators diverged**, and the flagship Adopt Me one is the weaker of the two — no quantity, no URL state, and it treats a missing value as zero where MM2 correctly withholds the verdict.

### POSSIBLE PANEL QUESTION — "Is it secure?"
**STRONG ANSWER**
No exposed secrets — I checked git history, and `.env*` and `.dev.vars` were never tracked. No `eval`. Three `dangerouslySetInnerHTML` sites, all developer-controlled JSON-LD or the theme bootstrap script. No open redirects — every `window.location` assignment is built from a prop plus a server-returned UUID. No SQL injection surface: everything is PostgREST or parameterised RPC, and all 42 database functions set `search_path = ''`.

The authorization model is the strong part: RLS on every table, staff and middleman roles that can't be self-assigned, moderation behind a function that raises before doing anything unless you're staff, and staff who can *read* room evidence but cannot send messages or change trade status.

The real findings are one HIGH — the spoofable rate-limit header — and three MEDIUMs: display names can be rewritten after insert, which is an impersonation vector in a trading marketplace; the announcements-channel restriction is enforced on insert but not update; and MM2 users get routed into the Adopt Me shell by notification links. All four are one-to-few-line fixes.

### POSSIBLE PANEL QUESTION — "How does it scale?"
**STRONG ANSWER**
Postgres and RLS scale fine, and my indexes match the actual query shapes — `(game_id, status, created_at desc)` for listings, `(item_id, source, value_type, snapshot_date desc)` for value history, which is exactly the `ORDER BY … LIMIT 1` the offer RPC runs.

Two things don't scale as written. First, the client bundle: I ship both full catalogs to the browser on six routes. The fix exists — a compact index I already generate — I just haven't pointed the registry at it. Second, realtime fan-out: my Exchange channel subscribes to six tables with no filter, so every listing write triggers a refetch on every connected client. I use the correct filtered pattern two files away in the trade-room hook; I just didn't apply it there.

### POSSIBLE PANEL QUESTION — "What would you do differently?"
**STRONG ANSWER**
Three things.

**CI from day one.** Not having a type-check gate is the root cause of the broken build, and it cost nothing to add.

**One calculator engine from the start.** I wrote the Adopt Me calculator first, learned a lot, and then wrote a better one for MM2 instead of going back. Now the W/F/L rule exists in four copies and the wire format in four more. The lesson is that the second implementation is where you find out what the abstraction should have been — and that's the moment to refactor, not to fork.

**Server-side session handling.** Everything is browser-only Supabase, which means no server-side route protection and a signed-out flash on every account page. `@supabase/ssr` would have given me defence in depth over RLS instead of RLS alone.

### POSSIBLE PANEL QUESTION — "What's next?"
**STRONG ANSWER**
Immediate: commit MM2, fix the build, add CI, fix the rate-limit header. That's under a day.

Short term: close the cross-game notification leaks, fix five MM2 weapon pages that currently resolve to the wrong item because I normalise names too aggressively — two of them show a value that's off by 10×, so that one matters — and cut the client bundle.

Medium term: bring the Adopt Me calculator up to MM2's level, starting by extracting the shared verdict function, and build the RLS test suite.

Longer term: MM2 personal tools, then multi-game Nich — in that order, because Nich needs inventory and wishlist data to have anything to reason about.

---

## 5. Numbers worth memorising

| | |
|---|---|
| Adopt Me items / MM2 weapons | **3,382** / **1,099** |
| MM2 items with a Supreme value | 910 of 1,099 (189 unpriced: 171 untradable, 16 EVO variants, 2 pets) |
| App routes / API routes | 63 route files / 7 handlers |
| Database tables with RLS | 34 |
| `SECURITY DEFINER` functions | 42 (all with `search_path = ''`) |
| Migrations | 11 (5,027 lines) |
| Tests | 49, all passing |
| `src/**` TS/TSX files | 226 (100 client components) |
| Prerendered item pages | 3,382 |
| Largest client chunk | 1,653 KB |
| Themes | 4 (Dark, Halloween, Roblox, Snoopy) + the MM2 visual system |
| Lounge channels | 11 |
| Deployment | Cloudflare Workers, custom domain `csbthub.com` |

## 6. Three sentences to close on

> The hard, correctness-critical half of this system — the database schema, row-level security, and server-side trade validation — is built to a standard I'd defend anywhere: a client cannot forge a trade value, cannot read another user's data, and cannot escalate to staff. The presentation half has duplication I introduced by shipping a second game quickly, and the operational half is missing a CI gate that would have caught the build failure I'm reporting to you rather than hiding. I know exactly which items are wrong, why, and in what order I'd fix them — and that list is in the repository.

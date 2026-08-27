# 18 — Deployment & Operations

---

## 1. Source → production

```
 git working tree
        │
        │  npm run deploy
        ▼
 ┌────────────────────────────────────────────────────────────────┐
 │ 1. node scripts/verify-vision-source.mjs   (pre-flight)        │
 │ 2. opennextjs-cloudflare build                                 │
 │      └─ next build (Turbopack)                                 │
 │           ├─ compile                                            │
 │           ├─ TYPE CHECK   ← 🔴 FAILS ON THIS BRANCH             │
 │           └─ prerender 3,382 /values/[id] pages + sitemap       │
 │      └─ emit .open-next/worker.js + .open-next/assets/          │
 │ 3. opennextjs-cloudflare deploy  →  wrangler                    │
 │ 4. node scripts/verify-live-vision.mjs     (post-flight)        │
 └────────────────────────────────────────────────────────────────┘
        ▼
 Cloudflare Workers · csbthub.com (custom domain, workers_dev: false)
   ├─ ASSETS binding → .open-next/assets (static + prerendered)
   ├─ IMAGES binding
   ├─ WORKER_SELF_REFERENCE service binding
   └─ compatibility_flags: nodejs_compat, global_fetch_strictly_public
      compatibility_date: 2026-08-16
```

Alternate scripts: `preview` (build + local preview), `upload` (build + upload without activating), `deploy:raw` (skips both vision verifications).

**Deployment is entirely manual.** No workflow, no branch protection, no environment gating. Whoever runs `npm run deploy` from their machine ships whatever is in their working tree.

---

## 2. Runtime configuration

| Where | What | Secret? |
|---|---|---|
| `wrangler.jsonc:vars` | 13 Nich feature flags (`NICH_AI_PROVIDER: "auto"`, `NICH_ALLOW_AI_*: "true"`, vision model/limits) | No — committed, correctly |
| Worker secrets | `GEMINI_API_KEY`, `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** — must be set via `wrangler secret put`; absent from the repo ✅ |
| `.env.local` | local dev, gitignored | Yes |
| `.dev.vars` | Cloudflare local dev (`NEXTJS_ENV` only today), gitignored | Nominally |
| `.env.example` | documented template with warnings | No |

⚠ Note the drift between `.env.example` and `wrangler.jsonc`:
| Flag | `.env.example` | `wrangler.jsonc` (production) |
|---|---|---|
| `NICH_ALLOW_AI_FALLBACK` | `false` | **`true`** |
| `NICH_ALLOW_AI_TRADE_EXPLANATIONS` | `false` | **`true`** |
| `NICH_ALLOW_AI_ADVICE` | `false` | **`true`** |

Production has all three Credit-Saver gates **open**, while the documented default is closed. That is a deliberate product choice, but it means production spends Gemini credit on paths the docs describe as off — and it multiplies the impact of the spoofable rate limit (`10_AUTH_SECURITY_AUDIT.md` SEC-01).

---

## 3. Caching strategy

`open-next.config.ts` installs `staticAssetsIncrementalCache` with `enableCacheInterception: true`, with a comment explaining the reasoning:

> *"CSBT is predominantly build-time/static content. Serving prerendered routes from Workers Static Assets avoids spinning up the NextServer for every page request, which is important on the Workers Free 10 ms CPU budget. The app does not use ISR/on-demand revalidation."*

`public/_headers` supplies asset caching, because Workers Static Assets bypass Next's `headers()`:
```
/_next/static/*   max-age=31536000, immutable
/logo.png, /apple-touch-icon.png, /favicon.ico, /nich/*, /about/*   max-age=604800, swr=86400
```
⚠ `public/_headers` sets **only** `Cache-Control` — no security headers. So `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` and HSTS apply to dynamic responses but **not** to static/prerendered pages, which is most of the site.

---

## 4. Data-refresh operations

### The two paths do different things (VERIFIED)

| Step | `npm run refresh:values` (local) | `.github/workflows/update-elve-shark-values.yml` (nightly 03:23 UTC) |
|---|---|---|
| `update:elve` | ✅ | ✅ |
| `sync:master` | ✅ | ❌ |
| `generate:data` | ✅ | ✅ |
| `data:validate` | ✅ | ✅ |
| `snapshot:values` | ✅ | ❌ |
| `alerts:values` | ✅ | ❌ |
| commit + push | via `refresh:deploy` | ✅ (as `csbt-value-bot`) |
| deploy | via `refresh:deploy` | ❌ |

### 🔴 OPS-01 · `value_history` is never refreshed automatically — CONFIRMED
`marketplace_create_listing` and `marketplace_create_offer` resolve **every Adopt Me item** from `public.value_history` and raise `Item % / % is not in the current CSBT % catalog` when a row is missing.

`value_history` is written **only** by `scripts/push-value-snapshot.mjs`, which the workflow does not run. Consequences:
1. If `snapshot:values` was never run against production, **no Adopt Me listing or offer can be created at all** — and the error message points the user at "the catalog", not at the real cause.
2. Value alerts require two `value_history` rows for a `(item, source, value_type)`; without daily snapshots the whole watchlist feature is inert.
3. Newly added items are unlistable until the next manual snapshot.

**Fix:** add `snapshot:values` and `alerts:values` to the workflow with `SUPABASE_SECRET_KEY` as a repo secret, or document them as a required manual step in a runbook.

### 🔴 OPS-02 · The MM2 database catalog has no refresh path at all — CONFIRMED
`game_catalog_items` is seeded by a ~1,200-line literal `INSERT` inside `20260826000100_multigame_social.sql`, reflecting `mm2Items.json` as of `2026-08-24T20:26:24Z`. `npm run refresh:mm2` updates the JSON and **nothing** updates the table. There is no `push-mm2-catalog` script and no MM2 workflow. Detail: `08_DATA_PIPELINES.md` D-02.

### 🟠 OPS-03 · Migrations are applied by hand
`supabase/README.md`: *"Deployment remains a manual Supabase action unless your deployment pipeline already applies `supabase/migrations`."* There is no `supabase db push` in any script or workflow. The two newest migrations (`20260826000100`, `20260826000200`) are **untracked in git** — so there is no record of whether they have been applied to production, and no way for a second person to know.

The code compensates well: `isLegacyGameSchemaError()` retries Adopt Me queries without `game_id`, and MM2 shows *"MM2 Lounge needs the included multi-game Supabase migration before posting."* That is good defensive engineering around a fragile process.

### 🟡 OPS-04 · Telemetry is never pruned
`marketplace_prune_short_lived_telemetry()`, `feedback_prune_rate_limits()` and `nich_prune_usage_buckets()` all exist and are **called by nothing** — no script, no workflow, no `pg_cron`. `marketplace_events`, `feedback_rate_limits`, `marketplace_event_rate_limits` and `nich_usage_buckets` grow without bound.

---

## 5. 🔴 OPS-05 · The largest operational risk: MM2 is not in git

`git status` on `calculator-redesign-v2`:

```
 M  26 tracked files (Exchange, Lounge, Voting, hooks, globals.css, next.config.ts, package.json)
 ??  src/app/mm2/                      ??  src/games/
 ??  src/components/mm2/               ??  src/components/games/
 ??  src/components/GameSwitcher.tsx   ??  src/lib/supabase/multigameCompat.ts
 ??  src/data/mm2*.json (4 files)      ??  src/app/lounge/  ??  src/app/trade-opinions/
 ??  supabase/migrations/20260826000100_multigame_social.sql
 ??  supabase/migrations/20260826000200_preserve_adoptme_social_history.sql
 ??  scripts/ (6 MM2 scripts)          ??  source-data/mm2-* (4 files)
 ??  public/themes/mm2/                ??  tsconfig.qa.json
 ??  19 root status files (18 .md + 1 .txt)
```

- The **entire MM2 product**, the **multi-game adapter layer**, and **both database migrations** exist only in one working directory.
- The 26 modified tracked files are the *other half* of the same feature and are equally uncommitted.
- `git branch -a` shows `calculator-redesign-v2` has **no remote counterpart** — only `main`, `calculator-redesign` and `stable-production-2026-08-22` are pushed.
- A `git clean -fd`, a fresh clone, a stash-and-switch, or a disk failure loses all of it.
- `npm run refresh:deploy` runs `git add . && git commit && git push origin main && npm run deploy` — running it from this branch would push MM2 to `main` in a single unreviewed commit, from a tree whose build fails.

**This is the highest-priority action in the entire audit.**

---

## 6. Operational single points of failure

| SPOF | Impact | Mitigation present |
|---|---|---|
| **Uncommitted MM2 work** | Total loss of half the product | ❌ none |
| **Broken build on the working head** | Cannot deploy | ❌ no CI gate |
| **`value_history` unseeded** | Adopt Me Exchange completely unusable | ❌ not in CI |
| **`game_catalog_items` stale** | MM2 Exchange rejects new weapons | ❌ no refresh path |
| **elvebredd.com HTML format change** | Adopt Me values freeze | ✅ `validateSnapshot()` + `.backup.json` + a red workflow |
| **supremevalues.com change** | MM2 values freeze | ⚠ Playwright scrape, manual trigger only, no workflow |
| **amvgg.com down** | `/demand` empty | ✅ 502 + empty state, no fake data |
| **Supabase down** | All social + account features | ✅ every consumer null-guards; static pages keep working |
| **Gemini down / key rotated** | Nich AI degraded | ✅ falls back to the local brain; vision returns 503 |
| **Single deployer's machine** | No one else can ship | ❌ manual `npm run deploy` only |
| **Unbounded telemetry growth** | Slow DB degradation | ⚠ pruners exist, never invoked |

---

## 7. Recommended operational hardening

| # | Action | Effort |
|---|---|---|
| 1 | Commit MM2 + both migrations; push the branch | XS |
| 2 | Add a CI workflow: `tsc → eslint → test → data:validate ×2` on push/PR | S |
| 3 | Add `snapshot:values` + `alerts:values` to the nightly workflow (repo secret `SUPABASE_SECRET_KEY`) | S |
| 4 | Write `scripts/push-mm2-catalog.mjs`; add to `refresh:mm2` | M |
| 5 | Schedule the three prune functions via `pg_cron` or a nightly workflow | S |
| 6 | Add security headers to `public/_headers` | XS |
| 7 | Add a deploy workflow (build + `wrangler deploy` on a tag or on `main`) so shipping is not machine-bound | M |
| 8 | Add an MM2 refresh workflow mirroring the Elve one | M |
| 9 | Write `docs/RUNBOOK.md`: migration order, required post-migration scripts, rollback | S |
| 10 | Fix `create-safe-export.mjs` to exclude `.dev.vars*`, `.open-next`, `.wrangler`, `supabase/.temp` | XS |

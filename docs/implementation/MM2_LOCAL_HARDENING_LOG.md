# MM2 Local Hardening — Implementation Log

**Mode:** CONTROLLED IMPLEMENTATION · **Baseline:** the adversarially-verified findings in `docs/audit/` (reports 19, 21, 23)
**Started:** 2026-08-27

> **STANDING RULE — MM2 IS LOCAL-ONLY.**
> No deploy, no merge to `main`, no `npm run deploy`, no `wrangler deploy`, no production migration, no production flag change — until the user says **"RELEASE MM2 TO PRODUCTION"**.

---

# PHASE 0 — RELEASE SAFETY / ISOLATION

## Release-safety record

| Field | Value |
|---|---|
| **CURRENT BRANCH** | `calculator-redesign-v2` — **no upstream configured** (local-only branch) |
| **PRODUCTION BRANCH** | `main` (evidence: `refresh:deploy` = `… git push origin main && npm run deploy`) |
| **PRODUCTION HOST** | Cloudflare Workers, custom domain `csbthub.com` (`wrangler.jsonc:15-19`) |
| **DEPLOYMENT TRIGGER** | **Manual CLI only** — `npm run deploy` / `deploy:raw` / `upload`. See analysis below. |
| **SAFE BACKUP METHOD** | **Local commit + local archive.** Remote push **BLOCKED pending user confirmation** (see "Unresolved risk"). |
| **MM2 PUBLICLY EXPOSED?** | **NO** |

## What actually triggers a deployment (VERIFIED)

| Action | Consequence | Evidence |
|---|---|---|
| `git commit` (local) | **Nothing.** No git hooks installed. | `ls .git/hooks/` → only `.sample` files |
| `npm install` / any npm script | **Nothing deploys implicitly.** No `pre*`/`post*`/`prepare` lifecycle hooks exist. `preview` is a standalone script name, not a hook. | `package.json.scripts` enumerated |
| Push **any** branch | **No GitHub Action fires.** The repo has exactly one workflow, `update-elve-shark-values.yml`, triggered *only* by `schedule` (cron `23 3 * * *`) and `workflow_dispatch`. **Not `push`, not `pull_request`.** | `.github/workflows/` — 1 file |
| Any GitHub Action | **Cannot deploy.** `grep -rniE "wrangler\|cloudflare\|deploy\|opennext\|pages" .github/` → **zero matches**. The workflow only refreshes Adopt Me values and commits. | grep output |
| Open a PR | No workflow listens for `pull_request`. | same |
| `npm run deploy` | 🔴 **DEPLOYS TO PRODUCTION.** `verify:vision-source && opennextjs-cloudflare build && opennextjs-cloudflare deploy && verify:vision-live` | `package.json` |
| `npm run deploy:raw` / `upload` | 🔴 **DEPLOYS / UPLOADS TO PRODUCTION.** | `package.json` |
| `npm run refresh:deploy` | 🔴 **`git add . && git commit && git push origin main && npm run deploy`** — would push MM2 to `main` **and** deploy it, in one command, from a tree whose build currently fails. **NEVER RUN THIS.** | `package.json` |

Additional guards already in the repo's favour: `wrangler.jsonc` sets `"workers_dev": false` and `"preview_urls": false`, so even an accidental deploy produces **no** `*.workers.dev` or preview alias URL. There is **no `[build]` section** in `wrangler.jsonc` and no Pages/Cloudflare config file in the repo.

## 🟠 Unresolved risk — why I have NOT pushed

**Cloudflare Workers Builds (dashboard-side Git integration) cannot be verified from inside the repository.** If the Cloudflare dashboard has this GitHub repo connected, a push *could* trigger an automatic build+deploy. That configuration lives in the Cloudflare dashboard, not in any tracked file, so no amount of repo inspection settles it.

**Assessment:** most likely **not** configured — `refresh:deploy` explicitly runs `npm run deploy` *after* `git push origin main`, which would be redundant if pushing already deployed. Combined with the absence of a `[build]` section, the evidence points to manual-only deployment.

**But "most likely" is not "verified",** and the standing rule is absolute. Therefore: **local commit + local archive only. No push.** The confirmation needed from the user is recorded in the summary at the end of Phase A.

Mitigating fact: the current HEAD commit `2660a50` is **already on the remote** under `origin/calculator-redesign` and `origin/stable-production-2026-08-22`. Only the *working tree* (MM2 + 27 modified files) is unpushed, so a local commit fully removes the "lost to `git clean`" risk.

## Working-tree preservation

`main` is at `1b44604`; the working branch is at `2660a50` (one commit ahead). No history rewriting, no rebasing, no amending was performed. Unrelated changes: none found — every modified file is part of the MM2/multi-game feature (verified per-file below).

---

# PHASE A — MAKE THE PROJECT DURABLE

## A1 · Working-tree categorization

**118 untracked files + 27 modified tracked files.** Every one was categorized before staging; `git add .` was not used.

### Secrets & build output — confirmed EXCLUDED by `.gitignore`

| Path | Ignored by |
|---|---|
| `.env.local` | `.gitignore:35` `.env*` |
| `.dev.vars` | `.gitignore:53` `.dev.vars*` |
| `.open-next/` | `.gitignore:49` |
| `.next/` | `.gitignore:17` |
| `.wrangler/` | `.gitignore:52` |
| `supabase/.temp/` | `.gitignore:57` |
| `node_modules/` | `.gitignore:4` |
| `tsconfig.tsbuildinfo` | `.gitignore:42` `*.tsbuildinfo` |
| `CSBT_CLAUDE_DEEP_AUDIT.zip` | `.gitignore:46` `*.zip` |
| `supabase/migrations_backup_20260817/` | `.gitignore:60` |

`.env.example` is tracked **intentionally** — it is a placeholder template containing no real values (verified in `10_AUTH_SECURITY_AUDIT.md` SEC-08). `.env` does not exist.

### Modified tracked files — all 27 verified as MM2/multi-game work

| File(s) | Change | Adopt Me production risk |
|---|---|---|
| `next.config.ts` | **only** adds the `supremevalues.com/media/**` image remotePattern | None — additive allowlist entry |
| `package.json` | **only** adds 5 MM2 npm scripts (`generate:mm2`, `sync:mm2-master`, `data:validate:mm2`, `refresh:mm2`, `update:mm2-supreme`) | None — no existing script altered |
| `src/app/globals.css` | **one append at line 4823 (+131 lines).** Every selector is `.mm2-social-mode` or `.mm2-control-rail`. | **None** — Adopt Me pages never receive those classes. Satisfies `CLAUDE.md` "MM2 styling must not alter Adopt Me". |
| 9 × `src/components/exchange/*` | game-aware props (`fixedGameId`, `*BasePath`) | Shared code — **regression pass required in Phase C/D** |
| `src/components/community/{CSBTLounge,TradeVotingBoard}.tsx` | game scoping | Shared — regression required |
| `src/hooks/{useExchangeData,useTradeRoomData}.ts` | `gameId` + legacy fallbacks | Shared — regression required |
| `src/lib/{exchange/types,navigation}.ts` | multi-game types / nav | Shared — regression required |
| `src/app/{community,exchange,trade-feed}/page.tsx` | route aliasing + game props | Shared — regression required |
| `src/components/{Hero,account/ProfileDashboard,nich/GlobalNichAssistant}.tsx`, `src/app/api/exchange/event/route.ts`, `src/components/trade/TradeCalculator.tsx` | game switcher, MM2 Nich suppression, `gameId` telemetry | Shared — regression required |

### 🔴 `package-lock.json` — EXCLUDED from the commit

`git diff -w package-lock.json` is **empty**. The only difference is line endings (`core.autocrlf=true`, no `.gitattributes`). Committing it would record a ~475 KB phantom change with zero semantic content. It is deliberately left unstaged and will continue to show as modified.

### Notable discovery — the project instructions file is NOT in source control

`CLAUDE.md` is untracked. On disk it exists as **`claude.md`** (lowercase) and `core.ignorecase=true`, so git reports it as `?? claude.md`. `git ls-files` contains no `claude.md` at any casing. The system context describes it as "checked into the codebase"; **it is not.** It is being committed now.

### Files committed despite being flagged dead by the audit

Committed to preserve the working tree intact; queued for a later cleanup item rather than silently deleted during a "protect the work" phase:

| File | Status | Rationale for committing now |
|---|---|---|
| `src/data/mm2ItemsIndex.json` | Generated by `generate-mm2-items.js:460`, read by nothing | The generator recreates it on every run; deleting the file without changing the generator produces a permanently dirty tree. Remove both together later. |
| `src/data/mm2Categories.json` | Written by nothing, read by nothing | True orphan, 858 B. Deleting user files is out of scope for Phase A. |
| `src/components/mm2/MM2{Hero,HeroSearch,ValueCard,ValueHero,ValueSearchPanel,Trending,CommunityHub,FeatureCards,HomeBoard,MarketHighlights}.tsx`, `src/components/home/MM2TradingHQ.tsx` | Dead (12 MM2 modules, 1,832 ln) | Tree-shaken, zero runtime cost. Deletion is roadmap item P2-1. |
| `src/app/mm2/MM2_THEME_NOTES.txt` | Notes file inside the route directory | Harmless (Next.js ignores non-route files); misplaced. Flagged for relocation. |
| `source-data/mm2-trading-data{,.pre-source-sync}.backup.xlsx` | Pipeline rollback artifacts, ~865 KB total | **Follows existing precedent** — `source-data/elve-shark-values.backup.json` and `trading-data.pre-elve-sync.backup.xlsx` are already tracked. |

Precedent confirmed for generated data: `src/data/tradingItems.json`, `tradingItemsIndex.json`, `tradingMeta.json`, `petImageIndex.json` are all tracked, so tracking the MM2 equivalents is consistent with project convention.

## A2 · Staging — *(in progress, see next section)*
## A3 · Local commit — *(pending)*
## A4 · Remote backup — **BLOCKED pending user confirmation** (see Phase 0 "Unresolved risk")

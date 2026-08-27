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

## A2 · Staging — ✅ COMPLETE

101 files staged by **explicit path** (`git add .` was never used). Automated safety assertion run before committing:

```
git diff --cached --name-only | grep -iE '\.env|dev\.vars|\.open-next|^\.next/|\.wrangler|supabase/\.temp|node_modules|tsbuildinfo|\.zip$'
  -> ✅ CLEAN — no secrets or build output staged
package-lock.json staged?  -> ✅ correctly excluded
```

## A3 · Local commit — ✅ COMPLETE

| Commit | Files | Contents |
|---|---|---|
| `8937e8e` | 101 | `feat(mm2): add MM2 game mode and multi-game platform architecture` |
| `06a685a` | 44 | `docs: add forensic repository audit, implementation log and project notes` |

No history was rewritten; no existing commit was amended. Branch `calculator-redesign-v2` is now 3 commits ahead of `main`.

**Working tree after commit:** `M package-lock.json` only — the deliberate line-ending-only exclusion. Everything else is committed.

## A4 · Remote backup — ⛔ **NOT PUSHED — awaiting user confirmation**

Per the standing rule, no push was attempted because Cloudflare Workers Builds cannot be ruled out from inside the repo (Phase 0, "Unresolved risk").

**Local backup created instead — verified restorable:**

```
git bundle create <path> --all
git bundle verify <path>
  -> "The bundle records a complete history."
```

| Field | Value |
|---|---|
| Path | `C:\Users\me\Desktop\csbt-hub-backups\csbt-mm2-local-hardening-20260827-1814.bundle` |
| Size | 96 MB |
| Contents | **All refs and full history**, HEAD = `06a685a` |
| Location | **Outside the repository** — cannot be destroyed by `git clean` inside `csbt-price-checker` |
| Restore | `git clone <bundle> restored-repo` |

A `git bundle` was chosen over a zip because it preserves complete, cloneable history rather than a flat snapshot of files.

## ✅ Phase A exit criteria

| Criterion | Status |
|---|---|
| MM2 cannot be lost through working-tree cleanup | ✅ committed locally **and** bundled outside the repo |
| Sensitive files not committed | ✅ asserted by automated grep before commit |
| Production unchanged | ✅ no push, no deploy, no migration applied; `main` untouched at `1b44604` |
| MM2 remains local-only | ✅ **MM2 PUBLICLY EXPOSED: NO** |

---

# ❓ OPEN QUESTION FOR THE USER — remote backup

To push a backup branch safely I need one fact I cannot obtain from the repository:

> **In the Cloudflare dashboard (Workers → `csbt-price-checker` → Settings), is this GitHub repository connected via "Workers Builds" / Git integration?**

| Answer | Consequence |
|---|---|
| **No / not connected** | Pushing a new branch `mm2-local-hardening` is **completely safe** — nothing builds, nothing deploys, GitHub Actions ignores pushes entirely. I will push on your word. |
| **Yes, connected** | I need the configured *production branch* and whether *non-production branch builds* are enabled. If production branch is `main` and non-production builds are off, a new branch is still safe. `preview_urls: false` in `wrangler.jsonc` means no preview alias would be published even if a preview build ran. |
| **Unsure** | Stay as-is. The verified 96 MB bundle already removes the data-loss risk; a remote push is convenience, not safety. |

Until answered: **no push.**

---

# PHASE B — GET THE PROJECT HEALTHY

## B1 · TypeScript — ✅ 7 errors → 0

Errors were **reproduced first** (`npx tsc --noEmit`, exit 2, 7 errors) rather than taken on trust from the audit. All 7 matched. Every one fixed at root cause — **no `any`, no `@ts-ignore`, no `@ts-expect-error` was added anywhere.**

| # | Site | Root cause | Fix |
|---|---|---|---|
| 1 | `scripts/test-nich-local-max.ts:50` | Fixture predates `game_id` becoming required on `ExchangeListing` | Added `game_id: "adopt-me"` |
| 2 | `src/components/nich/assistant/useNichLocalData.ts:172` | `normalizeListing()` never set `game_id` | Added `game_id: value.game_id === "mm2" ? "mm2" : "adopt-me"`, mirroring the legacy fallback already used in `useExchangeData.normalizeListing` |
| 3 | `src/components/mm2/MM2AddWeaponModal.tsx:45` | `MM2SelectedTradeItem` used in the props type but never imported | Added it to the existing `import type` |
| 4–5 | `src/lib/exchange/matching.ts:111,118` | Two competing unions: `ValueSource` (`GCASH`/`ELVE`) vs `CSBTValueSource` (+`SUPREME`) | Added a documented `adoptValueSource()` narrowing helper at the boundary. **Deliberately did not widen `lib/valueSystem.ts`** — that would change Adopt Me value semantics, which `CLAUDE.md` treats as correctness-critical. The module is Adopt-Me-only by contract and both call sites are already game-gated (`ExchangeHub.tsx:154`, `ListingDetail.tsx:111`). |
| 6 | `src/app/mm2/values/page.tsx:8` | `MM2ValuesBrowser` local `Item` typed `SOURCE_VALUE?: number`, but 189 of 1,099 weapons legitimately have `null` | Typed the nullable fields honestly in `MM2ValuesBrowser` **and** `MM2WeaponCard`; this also let the `item={item as any}` cast be removed |
| 7 | `tests/nichTradeSession.test.ts:325` | Indexed access into the recursive `NichTradeSession` type resolved circularly (TS7022) | Annotated `const slot: NichTradeSlot`. My first hypothesis (that `assert.ok` narrowing was at fault) was **wrong** — disproved by finding the same `assert.ok` pattern working at line 129 — so that change was reverted before landing. |

**New file:** `src/lib/mm2/catalog.ts` — one canonical `MM2CatalogItem` type plus `mm2Catalog`, `mm2ImageUrl()`, `mm2SupremeValue()`, `mm2Demand()`. The MM2 item shape was previously redeclared in **five** places, which is precisely why `mm2/values/[id]/page.tsx` reached for `any` 20 times: there was no canonical type to import. That page is now fully typed (0 `any`), and Phase D1 has a natural home for ID-based lookup.

## B2 · Lint — ✅ 31 errors → 0 (exit 0)

`npx eslint .` now **exits 0**: 15 warnings, **0 errors**.

| Action | Errors removed |
|---|---|
| Typed `mm2/values/[id]/page.tsx` via the new catalog module | 20 |
| Removed `item as any` in `MM2ValuesBrowser` | 1 |
| Deleted `/mm2/item/[name]` route + `MM2DemandPanel` + `MM2TradePanel` + `MM2TradingHQ` | 8 |
| Fixed `TradePetCard` reset-effect | 1 |
| Scoped, justified disable on 2 SSR-constrained effects | 2 |

### Deletions — each verified safe before removal
| File | Evidence |
|---|---|
| `src/app/mm2/item/[name]/page.tsx` | **Confirmed bug B-02** — used sync `params` under Next 16, so it *always* rendered "Not found". Referenced by nothing except an active-state prefix match in `MM2Navbar.tsx:76`, which was updated. Roadmap H5. |
| `src/components/mm2/MM2DemandPanel.tsx`, `MM2TradePanel.tsx` | Only importer was that broken route. 1-line placeholders. |
| `src/components/home/MM2TradingHQ.tsx` | Zero importers (reachability closure, audit `23` C-1). Roadmap P2-1. |

Deleting `/mm2/item/[name]` is behaviour-neutral: the route never resolved an item, so users now get a proper 404 instead of a styled "Not found". Nothing links to it.

### `TradePetCard` — shared Adopt Me production component
Replaced `useEffect(() => setFailed(false), [src])` with tracking **which** src failed:

```ts
const [failedSrc, setFailedSrc] = useState<string | null>(null);
const failed = failedSrc !== null && failedSrc === src;
```

Removes the cascading render and is strictly more precise — a new image is never treated as failed because a previous one was. Same visible behaviour. **Flagged for the Adopt Me regression pass.**

### 2 errors NOT fixed — justified, scoped suppression
`MM2TradeCalculator.tsx` hydrates from `window.localStorage` and `window.location.search`. Both are browser-only; moving either into a `useState` initializer would make the server render empty and the client render populated — **a hydration mismatch**. An effect is the correct place; the rule cannot express the SSR constraint.

A scoped `eslint-disable` / `eslint-enable` block wraps only those two effects, with the reasoning and two TODOs inline (Phase D: `useSearchParams()` + `Suspense`; Phase E: `useSyncExternalStore`). This is not a blanket suppression and hides no other rule.

### 15 remaining warnings — non-blocking, recorded honestly
- 13 × `@next/next/no-img-element` — MM2 components using raw `img` for `supremevalues.com`. Roadmap P2-11.
- 2 × `@typescript-eslint/no-unused-vars`:
  - `MM2HomeBoard.tsx:15` — dead component, queued for P2-1 deletion.
  - **`TradeVotingBoard.tsx:119` — `routeBasePath` is accepted, typed and defaulted but never used anywhere in the component.** `loungeBasePath` *is* used (`:452`). Not removed: this is a genuine signal for the Phase D2 game-scoping audit, and dropping a public prop is an API change. **Recorded as a new finding.**

Also removed two genuinely dead computations in `src/app/mm2/values/page.tsx`: `categories` (built a `Set` over all 1,099 items and was never read) and `updated`.

## B3 · Production build — ✅ green locally

```
npm run build   ->   BUILD_EXIT=0
✓ Compiled successfully in 5.5s
  Running TypeScript ...        (no failure)
```

All 12 MM2 routes emit; `/mm2/item/[name]` is correctly gone.

**This build is a local artifact only. Nothing was deployed.**

> **Local-only gotcha worth knowing:** after deleting a route, `tsc` kept failing on `.next/dev/types/validator.ts` still importing the removed page. That is a stale `next dev` artifact, not a source error — `rm -rf .next/dev` cleared it. CI is unaffected: a fresh checkout has no `.next/`, so the `.next/**/types` entries in `tsconfig.json` match nothing.

## B4 · CI — ✅ added, validation-only

`.github/workflows/ci.yml`. Gates, each failing independently: **typecheck → lint → tests → Adopt Me data → MM2 data → build**.

**It cannot deploy, and that is asserted rather than assumed:**

| Guard | Detail |
|---|---|
| Executable steps | Only 9: `checkout`, `setup-node`, `npm ci`, `tsc`, `eslint`, `npm test`, 2 validators, `npm run build`. Verified by grepping every `run:` / `uses:` line. |
| No deploy verb | No `run:` line matches `deploy`, `wrangler`, `opennextjs`, `upload`, `preview`, or `git push`. |
| `permissions: contents: read` | Cannot push commits, tags or releases. |
| `branches-ignore: [main]` | Never runs on the production branch. |
| Header comment | Explicitly lists the forbidden commands for future maintainers. |

The pre-existing `update-elve-shark-values.yml` was **not modified** and still contains no deployment logic.

## ✅ Phase B exit criteria

| Criterion | Command | Result |
|---|---|---|
| TypeScript passes | `npx tsc --noEmit -p tsconfig.json` | **exit 0**, 0 errors |
| Meaningful lint blockers fixed | `npx eslint .` | **exit 0**, 0 errors, 15 warnings |
| Tests pass | `npm test` | **exit 0** — 49 pass, 0 fail |
| Adopt Me data validates | `npm run data:validate` | **exit 0** — 3,382 items, 3,382 unique IDs |
| MM2 data validates | `npm run data:validate:mm2` | **exit 0** — 1,099 items |
| Build succeeds locally | `npm run build` | **exit 0** |
| Validation CI exists | `.github/workflows/ci.yml` | ✅ deploy-incapable (asserted) |
| No deployment occurred | — | ✅ nothing pushed, deployed or migrated |

## Production-impact review for Phase B

| File | Scope | Impact |
|---|---|---|
| `src/components/trade/TradePetCard.tsx` | **Adopt Me production** | Behaviour-preserving image-error handling; **must be covered in the Adopt Me regression pass** |
| `src/lib/exchange/matching.ts` | **Shared** | Additive narrowing helper; `GCASH`/`ELVE` pass through unchanged, so Adopt Me scoring is bit-identical |
| `src/components/nich/assistant/useNichLocalData.ts` | **Adopt Me (Nich)** | Additive `game_id` field on a normalized object; no existing field altered |
| `scripts/test-nich-local-max.ts`, `tests/nichTradeSession.test.ts` | Dev only | Not shipped |
| All `mm2/*`, `lib/mm2/*`, deleted files | **MM2 — local only** | Not deployed |

**MM2 remains local-only. Nothing was pushed, deployed, merged, or applied to any production database.**

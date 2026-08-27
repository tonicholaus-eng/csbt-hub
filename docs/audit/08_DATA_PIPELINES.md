# 08 — Data Pipelines

Two pipelines, both `source → snapshot → master workbook → generator → app JSON → validator`, plus a third (database) hop for Exchange.

---

## 1. Adopt Me pipeline

```
 https://www.elvebredd.com/adopt-me-calculator
        │  scripts/lib/elve-shark.js  (axios + cheerio; extracts the embedded
        │  __NEXT_DATA__-style "initialPets" payload out of the page HTML)
        ▼
 scripts/update-elve-shark-values.js        npm run update:elve
        ├─▶ source-data/elve-shark-values.json          (snapshot, 863 KB)
        ├─▶ source-data/elve-shark-values.backup.json   (previous snapshot)
        └─▶ source-data/elve-fetch-diagnostics.json
        ▼
 scripts/sync-elve-to-master.js             npm run sync:master
        ├─▶ source-data/trading-data.pre-elve-sync.backup.xlsx   (backup first)
        └─▶ source-data/trading-data.xlsx     ← MASTER, edited in place, styles preserved
        ▼
 scripts/generate-trading-items.js          npm run generate:data
        ├─▶ src/data/tradingItems.json       3,382 full records  (1.7 MB)
        ├─▶ src/data/tradingItemsIndex.json  compact 14-tuple rows (629 KB)
        ├─▶ src/data/petImageIndex.json      [name, image] pairs (54 KB)
        ├─▶ src/data/valueSources.json       source metadata + updatedAt
        ├─▶ src/data/tradingMeta.json        totals + categoryCounts + generatedAt
        └─▶ source-data/trading-data-validation.json   warnings report
        ▼
 scripts/validate-trading-data.js           npm run data:validate
        ▼
 scripts/push-value-snapshot.mjs            npm run snapshot:values
        └─▶ Supabase public.value_history    ← CANONICAL for Exchange
        ▼
 scripts/process-value-alerts.mjs           npm run alerts:values
        └─▶ Supabase public.notifications
```

`npm run refresh:values` chains all six.

### Merge semantics (VERIFIED, `generate-trading-items.js`)
- The workbook is the **primary** source; the Elve snapshot is a per-field overlay: `elveRecord?.normal ?? workbookElve.normal` (`:313`, `:319`, `:326`). Elve wins when present; the workbook is the fallback.
- Items present in the Elve snapshot but absent from the workbook are added as **Elve-only items** (`createElveOnlyItem`, `:374-395`) with a source comment explaining they can be given GCash values later.
- Duplicates are resolved by an `itemCompletenessScore()` (`:418`) and merged field-wise (`mergeDuplicateItem`, `:434`) rather than dropped.
- Every unmatched item pushes a warning: `"${name}: no matching Elve Shark snapshot record; workbook fallback used."` (`:333`) — warnings land in `trading-data-validation.json`.
- Images: `createElvebreddImageUrl()` (`:150-160`) uses the spreadsheet path, falling back to `/images/pets/${itemName}.png`. `next.config.ts` whitelists `elvebredd.com/images/pets/**`.

### Validation gate (VERIFIED by execution)
```
$ npm run data:validate
Data validation passed: 3382 items, 3382 unique IDs
(PET 767, PETWEAR 938, EGG 37, VEHICLE 268, FOOD 92, GIFT 67,
 STROLLER 102, TOY 718, STICKER 365, OTHER 28).
```
`validate-trading-data.js` enforces: ≥1,500 items; `GCASH` remains the default source; Elve `updatedAt` present; unique IDs; category enum; **regular-only categories must not carry Neon/Mega values**; every value field is `number | null` (never a string, never 0-as-missing); every item must have at least one known regular value; PET/PETWEAR/EGG/TOY must be non-empty. Exits `1` on any failure — a genuine gate.

### Nullability discipline ✅
`push-value-snapshot.mjs:37-40` refuses to write `value <= 0` into `value_history`, with the comment *"Zero/null values are not market observations… This also prevents Exchange from treating an unpriced item as a canonical zero-value listing."* It also **deletes** any historical `value <= 0` rows left by an older buggy version (`:70-77`).

---

## 2. MM2 pipeline

```
 https://supremevalues.com  (14 category pages)
        │  scripts/update-mm2-supreme-values.js — PLAYWRIGHT (headless chromium)
        ▼
        ├─▶ source-data/mm2-source-values.json     (snapshot, 274 KB)
        └─▶ src/data/mm2Items.json                 ⚠ WRITES THE APP FILE DIRECTLY
        ▼
 scripts/sync-mm2-source-to-master.js       npm run sync:mm2-master
        ├─▶ source-data/mm2-trading-data.backup.xlsx  (backup first)
        └─▶ source-data/mm2-trading-data.xlsx    ← MASTER, "Items" sheet rebuilt
        ▼
 scripts/generate-mm2-items.js              npm run generate:mm2
        ├─▶ src/data/mm2Items.json           1,099 records (497 KB)  ⚠ OVERWRITES the above
        ├─▶ src/data/mm2ItemsIndex.json      248 KB — READ BY NOTHING
        └─▶ src/data/mm2Meta.json
        ▼
 scripts/validate-mm2-data.js               npm run data:validate:mm2
        ▼
 (manual) supabase/migrations/20260826000100_multigame_social.sql
        └─▶ public.game_catalog_items        ← CANONICAL for MM2 Exchange
```

`npm run refresh:mm2` chains the four script steps. `scripts/refresh-mm2-master.js` is a fifth entry point that `execSync`s the same four npm scripts — a duplicate of the npm chain, not wired into `package.json`.

### Manual-edit preservation (good)
`sync-mm2-source-to-master.js:283-328` reads the existing workbook and stashes `CSBT VALUE`, `GCASH VALUE`, and `NOTES` per `name::category` key, then restores them onto the rebuilt rows (`:436-446`). Scraped columns (name, image, type, source value, demand, source name/url, timestamps) are overwritten; human columns survive. This is the right design.

### Validation gate (VERIFIED by execution)
```
$ npm run data:validate:mm2
MM2 data validation passed (1099 items).
```
`validate-mm2-data.js` is much weaker than its Adopt Me counterpart: it checks IDs present/unique, names present, numeric fields non-negative or null, and `DEMAND` in 0–10. It does **not** check item count floors, category membership, or that a meaningful fraction of items are priced.

---

## 3. 🔴 Pipeline findings

### D-01 · Two writers to `src/data/mm2Items.json` · CONFIRMED
| Writer | Line |
|---|---|
| `scripts/update-mm2-supreme-values.js` | `:616` (`ITEMS_OUT` declared `:17-22`) |
| `scripts/generate-mm2-items.js` | `:450` |

In the sanctioned order (`update:mm2-supreme → sync:mm2-master → generate:mm2`) the generator runs last and wins, so the happy path is correct. But running `npm run update:mm2-supreme` **alone** silently replaces the app dataset with raw scrape output that has never been through the workbook — bypassing every manually-curated `CSBT VALUE` / `GCASH VALUE` / `NOTES` column, and bypassing the ID-generation used by the generator. This is exactly the "competing source of truth" `CLAUDE.md` warns about.

**Fix:** have the scraper write only `source-data/mm2-source-values.json`.

### D-02 · MM2 catalog drift between JSON and Postgres · CONFIRMED (mechanism) / STRONG INFERENCE (impact)
`marketplace_create_listing` / `marketplace_create_offer` resolve MM2 items from `public.game_catalog_items` (`20260826000100_multigame_social.sql:1352-1356`, `:1709-1714`). That table is populated by a ~1,200-line literal `INSERT … ON CONFLICT DO UPDATE` embedded in the migration (`:33-1232`), reflecting `mm2Items.json` as of `2026-08-24T20:26:24Z`.

`npm run refresh:mm2` updates the JSON and **does not touch the database**. Nothing in the repo regenerates that seed. So after any MM2 refresh:
- newly-added weapons exist in the browser catalog but not in `game_catalog_items` → creating a listing with them raises *"Item … is not in the current CSBT mm2 catalog"*;
- the `snapshot_value` written onto listing/offer items is the **migration-time** value, not the current one.

**Fix:** a `scripts/push-mm2-catalog.mjs` mirroring `push-value-snapshot.mjs`, added to `refresh:mm2`.

### D-03 · Adopt Me Exchange depends on `value_history`, which CI never writes · CONFIRMED
Same mechanism as D-02 but for Adopt Me, and worse because it affects *all* items, not just new ones.
`marketplace_create_listing:1337-1345` and `marketplace_create_offer:1695-1703` select from `public.value_history` ordered by `snapshot_date desc, captured_at desc`, and raise when nothing is found.
`.github/workflows/update-elve-shark-values.yml` runs `update:elve → generate:data → data:validate` and commits. It never runs `sync:master`, `snapshot:values`, or `alerts:values`.

**Consequences:**
1. If `snapshot:values` has never been run against production, **no Adopt Me listing or offer can be created at all.**
2. Value alerts (`value_watchlist` → notifications) never fire, because `process-value-alerts.mjs` needs two `value_history` rows.
3. The CI path also skips `sync:master`, so the master workbook drifts from the Elve snapshot over time; only `generate:data` (which reads both) papers over it.

### D-04 · Dead generated data · CONFIRMED
| File | Size | Status |
|---|---|---|
| `src/data/mm2ItemsIndex.json` | 248 KB / 10,992 lines | Written by `generate-mm2-items.js:460`, **read by nothing** |
| `src/data/mm2Categories.json` | 858 B | Written by nothing, read by nothing |
| `src/data/homePopularItems.json` | 3 KB | Read only by `PopularPets.tsx`, which has no importer |

`mm2ItemsIndex.json` is the MM2 analogue of `tradingItemsIndex.json` — the compact index the app was *supposed* to use. It was generated and then never wired up; MM2 pages import the full `mm2Items.json` instead.

### D-05 · `elve-shark.js` scrapes an HTML payload, not an API · EDGE CASE / RISK
`scripts/lib/elve-shark.js` fetches `https://www.elvebredd.com/adopt-me-calculator` and extracts the embedded item payload by walking the HTML for a `push(...)` call containing an object with `initialPets` (`findPushCallEnd:211`, `extractInitialPetsPayload:311`). This is a framework-internal structure that can change without notice.

Mitigation that exists: `validateSnapshot()` (`:445`) gates the write, a `.backup.json` is kept, and `elve-fetch-diagnostics.json` records the attempt. The nightly workflow will fail loudly rather than commit garbage. Good — but a source-format change silently freezes Adopt Me values until someone notices the red workflow.

### D-06 · Playwright and sharp are runtime dependencies
`package.json:dependencies` includes `playwright` (used only by `update-mm2-supreme-values.js`), `sharp`, `cheerio`, `axios`, `xlsx`, `fs-extra`, `node-fetch`. Only build-time scripts use them. On Cloudflare Workers they are not bundled into the worker (they are never imported from `src/`), so this is an install-time and CI-time cost rather than a runtime one — but it belongs in `devDependencies`.

---

## 4. Source-of-truth summary

| Dataset | Authoritative source | Written by | Read by |
|---|---|---|---|
| Adopt Me items | `source-data/trading-data.xlsx` (+ Elve snapshot overlay) | `sync-elve-to-master.js` | `generate-trading-items.js` |
| Adopt Me app data | `src/data/tradingItems.json` | `generate-trading-items.js` | `games/registry.ts`, `push-value-snapshot.mjs` |
| Adopt Me client search | `src/data/tradingItemsIndex.json` | same | `lib/clientItemIndex.ts` → `lib/search.ts` |
| **Adopt Me Exchange values** | **`public.value_history`** | `push-value-snapshot.mjs` | `marketplace_create_listing/offer` |
| MM2 items | `source-data/mm2-trading-data.xlsx` | `sync-mm2-source-to-master.js` | `generate-mm2-items.js` |
| MM2 app data | `src/data/mm2Items.json` | `generate-mm2-items.js` **and** `update-mm2-supreme-values.js` ⚠ | 5 MM2 pages + `games/registry.ts` |
| **MM2 Exchange values** | **`public.game_catalog_items`** | a hand-written migration ⚠ | `marketplace_create_listing/offer` |
| Demand trends (Adopt Me) | `amvgg.com` live API | — | `/api/demand` |
| Demand (MM2) | the `DEMAND` column in the workbook | `sync-mm2-source-to-master.js` | `/mm2/demand`, `/mm2/values/[id]` |

**Two competing sources of truth exist for values that reach the database** (D-02, D-03). Both are silent failures that surface as confusing user-facing errors.

# 19 — Bug & Edge-Case Report

Classification: **CONFIRMED BUG** (demonstrated from source/data) · **PROBABLE BUG** (mechanism confirmed, impact inferred) · **EDGE CASE / RISK** (conditional).

---

# CONFIRMED BUGS

## B-01 · `npm run build` fails — deploy is blocked
**Severity: P0** · `03`, `15`, `16`

```
✓ Compiled successfully in 5.4s
  Running TypeScript ...
Failed to type check.
./scripts/test-nich-local-max.ts:50:22
Type error: Property 'game_id' is missing in type '{ … }' but required in type 'ExchangeListing'.
Next.js build worker exited with code: 1
```
`npx tsc --noEmit` → exit 1, **7 errors**. `npx eslint .` → exit 1, **31 errors / 18 warnings**.
`tsconfig.json` `include: ["**/*.ts", …]` sweeps `scripts/` and `tests/` into the production type check, so a broken test fixture blocks the build. `npm run deploy` → `opennextjs-cloudflare build` → `next build`.

**Fix:** add `game_id: "adopt-me"` to the fixtures in `scripts/test-nich-local-max.ts:50` and `src/components/nich/assistant/useNichLocalData.ts:172`; import `MM2SelectedTradeItem` in `MM2AddWeaponModal.tsx:11`; reconcile the `ValueSource` unions for `matching.ts:111,118`; type the `Item` shape in `mm2/values/page.tsx:8`; annotate `tests/nichTradeSession.test.ts:323`.

---

## B-02 · `/mm2/item/[name]` always renders "Not found"
**Severity: P1** · `src/app/mm2/item/[name]/page.tsx:5-7`

```ts
export default function Page({params}:{params:{name:string}}){
 const item:any = mm2Items.find(i => i.NAME === decodeURIComponent(params.name));
 if(!item) return <div className="p-10 text-white">Not found</div>;
```
`params` is a `Promise` in Next 15+/16. `params.name` → `undefined` → `decodeURIComponent(undefined)` → `"undefined"` → no match → **every request returns "Not found"**.

Only this route is affected; the other six dynamic routes correctly `await params`.
It is also a duplicate of `/mm2/values/[id]` and the only consumer of the two 1-line placeholder components `MM2DemandPanel`/`MM2TradePanel`.

**Fix:** delete the route and both panels.

---

## B-03 · "Open in Calculator →" silently discards the trade (Adopt Me)
**Severity: P1** · `TradeVotingBoard.tsx:435-439` → `registry.ts:230-235` → `/calculator`

`buildCalculatorHref("adopt-me", …)` emits `/calculator?source=GCASH&your=<id>~NORMAL~2&their=…`.
`src/components/trade/TradeCalculator.tsx` contains **no** `useSearchParams`, no `window.location`, and no hydration effect. The calculator opens empty.

The decoder that would consume it (`lib/tradeContext.ts:decodeTradeRows`) is fully written — validating ids against the catalog, clamping quantity 1–99, capping at 18 rows — and is consumed by `ExchangeHub` and `TradeVotingBoard`, but never by the calculator it was written for.

The MM2 branch works (`MM2TradeCalculator.tsx:212-244`).

**Also lossy in the other direction:** `tradeContext.ts:25` `selectedItemsToRows()` hardcodes `quantity: 1`, so a multi-copy trade exports as single copies.

---

## B-04 · MM2 weapon profiles collide — 5 weapons are unreachable, 2 show a 10× wrong value
**Severity: P1** · `src/app/mm2/values/[id]/page.tsx:5-17`

```ts
function normalize(value: string = "") {
  return decodeURIComponent(value).toLowerCase().trim()
    .replace(/%20/g," ").replace(/[_-]/g," ").replace(/[^a-z0-9]+/g,"");   // strips ALL punctuation
}
function findItem(id: string) {
  const decoded = normalize(id);
  return (mm2Items as any[]).find(i => normalize(i.NAME) === decoded || normalize(i.ID) === decoded);
}
```
Stripping every non-alphanumeric character collapses five distinct weapon pairs to the same key. `.find()` returns the first array match, so the second item of each pair is **unreachable**, and its URL renders the first item instead:

| URL key | First match (rendered) | Shadowed item (unreachable) |
|---|---|---|
| `chromasunset` | **Chroma Sun Set** — SET, 22,250 | Chroma Sunset — CHROMA, 9,000 |
| `icecream` | **Ice Cream** — UNTRADABLE, no value | Icecream — GODLY, 105 |
| `rainbowgun` | **Rainbow (Gun)** — RARE, **41** | Rainbow Gun — GODLY, **420** |
| `sunset` | **Sun Set** — SET, 1,800 | Sunset — GODLY, 650 |
| `xenoknife` | **Xeno (Knife)** — RARE, **31** | Xenoknife — GODLY, **310** |

Links reaching these URLs come from `registry.ts:165` (`itemProfileHref` uses `item.name`), `MM2WeaponCard.tsx:68` (`encodeURIComponent(item.NAME)`), `MM2RelatedWeapons.tsx:62`, and `MM2DemandIntelligence.tsx:295, 308, 309, 311`.

A trader clicking "Rainbow Gun" (420) in the values browser lands on a page showing **41**. That is a 10× value error on a user-facing valuation page — the most consequential class of bug in this product.

**Fix:** route by `item.ID` (IDs have **zero** normalization collisions — verified across all 1,099 items) and match exactly, falling back to a normalized name lookup only when the id misses.

---

## B-05 · MM2 registry name lookup silently overwrites a colliding weapon
**Severity: P2 (latent)** · `src/games/registry.ts:13-15, 66-73`

```ts
function normalize(v){ return v.toLowerCase().trim().replace(/[^a-z0-9\s-]/g,"").replace(/\s+/g," "); }
function buildLookup(items){ const map=new Map(); for(const item of items){ map.set(normalize(item.id),item); map.set(normalize(item.name),item);} return map; }
```
`"Rainbow (Gun)"` → `"rainbow gun"` and `"Rainbow Gun"` → `"rainbow gun"`. **Last write wins**, so `adapter.getItem("Rainbow (Gun)")` returns **Rainbow Gun (420)** instead of Rainbow (Gun) (41).

Only one pair collides at registry level (verified across all 1,099 items). Current call sites resolve by **ID** (`ExchangeHub.tsx:116`, `TradeVotingBoard.tsx:405`, `MM2TradeWorkflow.rowsToSelected`), and IDs do not collide — so no user-facing impact is demonstrated today. It is a live trap for any future name-based lookup.

**Fix:** make `buildLookup` refuse to overwrite an existing key, or key names with a collision-resistant normalizer.

---

## B-06 · Three realtime subscriptions can never fire
**Severity: P2** · `09_SUPABASE_DATABASE_AUDIT.md` DB-04

Exhaustive multiline-aware scan of all 12 migrations for `add table public.*` → 14 tables. Three subscribed tables are absent:

| Table | Subscriber | Effect |
|---|---|---|
| `trade_room_events` | `useTradeRoomData.ts:59` | **The trade-room timeline never updates live.** Participants must reload to see status changes and middleman events. |
| `marketplace_listing_items` | `useExchangeData.ts:363` | Masked — parent `marketplace_listings.updated_at` changes do fire |
| `marketplace_offer_items` | `useExchangeData.ts:369` | Masked — same |

**Caveat:** the publication could have been altered by hand in the production project; only the live DB can confirm. As a repo-consistency defect it is confirmed.

---

## B-07 · `/api/items` is dead code
**Severity: P3** · `src/app/api/items/route.ts` (43 ln) — zero consumers repo-wide. `/values` reimplements the same filtering/sorting client-side over 3,382 items.

---

## B-08 · 19 orphaned components (6,268 lines)
**Severity: P3** · `17_TECHNICAL_DEBT.md` §1.1. Includes the #1 and #3 largest components in the repo (`LiveCommunityFeed.tsx` 3,044 ln, `SearchBar.tsx` 845 ln) plus a 1,398-line `NichMascot → NichBody + NichFace` cluster. Tree-shaken, so no runtime cost — comprehension cost only.

---

# PROBABLE BUGS

## B-09 · Adopt Me Exchange is unusable when `value_history` is unseeded
**Severity: P0 if it applies** · `08_DATA_PIPELINES.md` D-03, `18_DEPLOYMENT_OPERATIONS.md` OPS-01

`marketplace_create_listing` / `marketplace_create_offer` resolve every Adopt Me item from `value_history` and `raise 'Item % / % is not in the current CSBT % catalog'` on a miss. The nightly workflow never runs `snapshot:values`.

**Strengthened by the adversarial pass (`23` N-5):** there are **three** `marketplace_create_listing` definitions — a legacy 7-arg signature (`legacy_foundation.sql:1471`, redefined in `exchange_item_alias_hotfix.sql:5`) and the 8-arg `p_game_id` version (`multigame_social.sql:1516`). `CreateListingPanel.tsx:96-104` calls the 8-arg one and falls back to the 7-arg one on a legacy-schema error. **Both** read from `value_history` (`legacy_foundation.sql:1524`, `:1639`), so the fallback is *not* an escape hatch — both paths fail identically.

**Confirmed:** the dependency and the CI gap. **Unverifiable statically:** whether production's `value_history` is populated. If it is not, listing creation fails for **every** item with a misleading error.

## B-10 · MM2 Exchange rejects weapons added after 2026-08-24
**Severity: P1** · `08_DATA_PIPELINES.md` D-02

`game_catalog_items` is seeded once inside `20260826000100_multigame_social.sql` from `mm2Items.json` at `2026-08-24T20:26:24Z`. `npm run refresh:mm2` updates the JSON and nothing updates the table. Any weapon added by a later refresh appears in the browser catalog but is rejected server-side, and `snapshot_value` on existing listings is frozen at migration time.

## B-11 · Server notifications route MM2 users into the Adopt Me shell
**Severity: P1** · `03_ROUTE_MAP.md` R-04

17 hard-coded `'/exchange…'` literals across the migrations. An MM2 offer acceptance produces *"A secure trade room is ready"* → `/exchange/rooms/<id>`, which renders `TradeRoomExperience` with the **Adopt Me** navbar (no game guard on either room route). Exactly the failure `CLAUDE.md` non-negotiable #5 names.

## B-12 · MM2 calculator offers a value source with no data
**Severity: P2** · `MM2TradeCalculator.tsx:391`. All 1,099 items have `GCASH_VALUE: null`, so selecting GCash makes the entire trade `CHECK`. It fails truthfully, but the option can never work — and it contradicts `registry.ts:151-153`, which declares Supreme as MM2's only source.

## B-13 · `/exchange/[id]` renders MM2 listings without a scope warning
**Severity: P2** · `src/app/exchange/[id]/page.tsx` omits `expectedGameId`. The MM2 route passes it (`ListingDetail.tsx:59-61`), so the guard is one-way.

---

# EDGE CASES / RISKS

## B-14 · Missing Adopt Me values are silently counted as 0
`TradeCalculator.tsx:42-50` `parseTradeValue(...) ?? 0`. `getStartingValueType()` mitigates at add-time, but falls through to `preferredValueType` when **no** variant is priced (`:60-71`), and `changeValueSource()` can move a fully-priced trade into a source where items are unpriced. The verdict is then shown with full confidence over a partly-zero total.
MM2 solves this exact problem correctly (`CHECK`). This is the clearest `CLAUDE.md` "treat missing data as zero" exposure in the codebase.

## B-15 · W/F/L threshold duplicated four times
`TradeCalculator.tsx:204`, `TradeSummary.tsx:62`, `MM2TradeSummary.tsx:58`, `MM2TradeBalanceFinder.tsx:70`. All currently agree at `≤5%`. No test asserts they continue to.

## B-16 · `display_name` can be rewritten after insert
`09_SUPABASE_DATABASE_AUDIT.md` DB-01 — both fill triggers are `BEFORE INSERT` only; `community_posts` has none. Impersonation vector in a trading marketplace.

## B-17 · `#announcements` gate bypassable via UPDATE
`09_SUPABASE_DATABASE_AUDIT.md` DB-02 — `can_post_lounge_channel()` appears only in the INSERT policy.

## B-18 · A listing's `game_id` can be flipped post-creation
`09_SUPABASE_DATABASE_AUDIT.md` DB-03 — setting `game_id='mm2'` and `value_source='SUPREME'` together satisfies both CHECK constraints and moves an Adopt-Me-item listing into MM2 scope.

## B-19 · Rate-limit identity is client-controllable
`10_AUTH_SECURITY_AUDIT.md` SEC-01 — `x-forwarded-for` read before (or instead of) `cf-connecting-ip` in all four rate-limited routes.

## B-20 · `/api/demand` — 6 serial external fetches, no timeout
`src/app/api/demand/route.ts:194-202, 230-244`. No `AbortSignal`. Fails to 502 + empty list, so the UI degrades honestly, but the worst case is unbounded within the invocation.

## B-21 · Overlapping `reload()` in `useExchangeData`
`:333` re-runs on `authLoading`/`reload` identity change; `reload` depends on `gameId`, `user`, `supabase`. Two rapid changes can overlap two `loadPublic()` calls, and the later `setListings` wins by timing rather than ordering. `mountedRef` prevents post-unmount writes, not out-of-order resolution. Low likelihood on current routes because `fixedGameId` is constant per mount.

## B-22 · Index-influenced keys in an editable list
`ExchangeItemBuilder.tsx:106` uses `key={\`${row.item_id}-${row.value_type}-${index}\`}`. Removing a middle row remounts the rows after it and drops transient input state. `marketplace_listing_items` rows have a real `id` — use it where present.

## B-23 · `sitemap.ts` advertises two redirect aliases and zero MM2 routes
`app/sitemap.ts:6` lists `/trade-feed` and `/community`, both of which `redirect()` elsewhere, and contains no `/mm2*` URL at all.

## B-24 · Three prune functions exist and are never called
`marketplace_prune_short_lived_telemetry`, `feedback_prune_rate_limits`, `nich_prune_usage_buckets` — no script, workflow or `pg_cron` invokes any of them. Four telemetry tables grow without bound.

## B-25 · `export:safe` copies `.dev.vars` and `.wrangler/`
`scripts/create-safe-export.mjs:6-17` excludes `.env*` but not `.dev.vars*`, `.open-next`, `.wrangler`, or `supabase/.temp`. No secret leaks today (`.dev.vars` holds only `NEXTJS_ENV`), but the script's whole purpose is preventing exactly this.

## B-26 · `aria-disabled` links remain keyboard-focusable
`TradeCalculator.tsx:566-567` pairs `aria-disabled` with `pointer-events-none`. Mouse users cannot click; keyboard users can still tab to and activate the "disabled" link.

## B-27 · MM2 mobile nav chips are below the 44 px touch minimum
`MM2Navbar.tsx:196-212` renders six `h-8` (32 px) chips in a scrolling row, while 42 other components respect `min-h-11`.

## B-28 · `GameItemPicker` is mouse-only — Exchange and Trade Opinions are keyboard-inaccessible
**CONFIRMED** · `23` N-1. `games/GameItemPicker.tsx` (64 ln) has **zero** ARIA attributes and no keyboard navigation, while the older `items/ItemSearchPicker.tsx` (192 ln) implements a full ARIA combobox with Arrow/Enter/Escape handling. `GameItemPicker` is the picker used by `ExchangeItemBuilder.tsx:97` and `TradeVotingBoard.tsx:401` — **for both games** — so a keyboard-only user cannot create a listing or post a trade opinion.

## B-29 · `README.md` documents a system that does not exist
**CONFIRMED** · `23` N-2. Five dangling references (`FOUNDATION_SETUP.md`, `EXCHANGE_SETUP.md`, `CSBT_EXCHANGE.md`, `CSBT_V2_OPTIMIZATION_SUMMARY.md`, `PROJECT_CLEANUP.md` — all missing), two false statements (`/values` "reads paginated results from `/api/items`" — it does not; "connect the repository to **Vercel**" — deployment is Cloudflare Workers), and **no mention of MM2 anywhere**. `supabase/README.md` additionally cites the old filename `20260816_000_legacy_foundation.sql`.

## B-30 · The birthday event expired 12 days before the audit and still ships
**CONFIRMED** · `23` N-4. `config/birthdayEvent.ts` has `enabled: true` with a window ending `2026-08-15T16:00Z`. Gating is correct (`BirthdayEventGateway` → `null`, `dynamic(ssr:false)`), so the 8-component experience does not load — but `BirthdayIcons.tsx` is statically imported by `Navbar`, `NichButton` and `NichChat` and ships on every page, and the source carries a hardcoded personal message and an individual's name.

---

# Explicitly checked and found NOT to be bugs

| Suspicion | Verdict |
|---|---|
| `community_posts` missing RLS | ❌ False alarm — enabled at `20260816000100:70-72` (line-wrapped statement) |
| `public_profiles` view bypasses RLS | ❌ Intentional — a deliberate safe projection replacing the dropped public-read policy on `profiles` |
| Mobile vs desktop W/F/L disagreement | ❌ Identical rules; `TradeCalculator.tsx:169-233` matches `TradeSummary.tsx:40-92` |
| MM2 calculator URL format mismatch with `buildCalculatorHref` | ❌ Both use `JSON.stringify([{key, quantity}])`; round-trip verified |
| Secrets committed to git | ❌ `git log --all -- .env .env.local .dev.vars` is empty |
| SQL injection via PostgREST `.or()` templates | ❌ Interpolated value is always a session UUID |
| `marketplace_log_client_event` callable by the public | ❌ `REVOKE`d from `anon`/`authenticated`, granted only to `service_role` |
| Client-supplied offer totals trusted | ❌ Server recomputes and overwrites them |
| MM2 `SOURCE_VALUE === 0` treated as missing | ❌ Zero such rows in the dataset |
| Adopt Me zero-value rows polluting `value_history` | ❌ Explicitly filtered, and legacy rows are deleted on each snapshot |
| `mm2Items.json` written by two scripts causing wrong data | ⚠ Partially — the sanctioned order is correct; running `update:mm2-supreme` alone is the hazard (`08` D-01) |

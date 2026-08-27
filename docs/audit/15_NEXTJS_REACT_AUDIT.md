# 15 — Next.js / React Quality Audit

Next.js `16.2.11` (Turbopack) · React `19.2.4` · TypeScript `5.9.3` with `strict: true`.

---

## 1. 🔴 R15-01 · The project does not type-check — CONFIRMED

```
$ npx tsc --noEmit -p tsconfig.json    → exit 1, 7 errors
$ npm run build                        → exit 1
  ✓ Compiled successfully in 5.4s
    Running TypeScript ...
  Failed to type check.
  ./scripts/test-nich-local-max.ts:50:22
  Type error: Property 'game_id' is missing in type '{ … }' but required in type 'ExchangeListing'.
  Next.js build worker exited with code: 1
```

| # | File:line | Error | Assessment |
|---|---|---|---|
| 1 | `scripts/test-nich-local-max.ts:50` | `TS2741` `game_id` missing on an `ExchangeListing` fixture | Test fixture not updated when `game_id` became required. **This is the error that fails `next build`** because `tsconfig.json` `include` is `**/*.ts`, which sweeps in `scripts/`. |
| 2 | `src/app/mm2/values/page.tsx:8` | `TS2322` raw JSON `SOURCE_VALUE: null` not assignable to `number \| undefined` | Real type hole — `MM2Item.SOURCE_VALUE` is `number \| null` in `MM2TradeTypes.ts` but `MM2ValuesBrowser`'s local `Item` type says `number \| undefined` |
| 3 | `src/components/mm2/MM2AddWeaponModal.tsx:45` | `TS2304` `Cannot find name 'MM2SelectedTradeItem'` | Used in the props type; `:11` imports only `MM2Item, MM2ValueSource`. Type-only, so SWC erases it — **no runtime impact, but it breaks the build.** |
| 4 | `src/components/nich/assistant/useNichLocalData.ts:172` | `TS2741` `game_id` missing | Same cause as #1 |
| 5–6 | `src/lib/exchange/matching.ts:111, 118` | `TS2345` `"SUPREME"` not assignable to `ValueSource` | The two competing `ValueSource` unions (see `07_MULTIGAME_ARCHITECTURE.md` §3.1). Unreachable at runtime — the call site is adopt-me-gated — but a genuine hole |
| 7 | `tests/nichTradeSession.test.ts:323` | `TS7022` implicit `any` via circular initialiser | Test-only |

**`next.config.ts` does not set `typescript.ignoreBuildErrors`**, so this is a hard failure. `npm run deploy` → `opennextjs-cloudflare build` → `next build` → **deploy is blocked on this branch.**

---

## 2. 🔴 R15-02 · Synchronous `params` on a Next 16 dynamic route — CONFIRMED

```ts
// src/app/mm2/item/[name]/page.tsx:5
export default function Page({params}:{params:{name:string}}){
 const item:any = mm2Items.find(i => i.NAME === decodeURIComponent(params.name));
```
In Next 15+/16 `params` is a `Promise`. `params.name` is `undefined` → `decodeURIComponent(undefined)` → `"undefined"` → the page **always** renders `Not found`.

It is the only such route. Every other dynamic route is correct:
`/values/[id]`, `/exchange/[id]`, `/exchange/rooms/[id]`, `/mm2/values/[id]`, `/mm2/exchange/[id]`, `/mm2/exchange/rooms/[id]` all use `{ params }: { params: Promise<{…}> }` + `await params`.

It type-checks only because the file is riddled with `any` and the props type is hand-written. **Recommendation: delete the route.**

---

## 3. 🟠 R15-03 · ESLint fails — 31 errors, 18 warnings

```
$ npx eslint .   → exit 1, 49 problems
  28 × @typescript-eslint/no-explicit-any        (errors)
  14 × @next/next/no-img-element                 (warnings)
   4 × @typescript-eslint/no-unused-vars         (warnings)
   3 × react-hooks/set-state-in-effect           (errors)
```

`react-hooks/set-state-in-effect` sites:
| File:line | Call |
|---|---|
| `mm2/MM2TradeCalculator.tsx:209` | `setRecentTrades(loadRecentTrades())` |
| `mm2/MM2TradeCalculator.tsx:224` | `setValueSource/setYourItems/setTheirItems` in the URL-hydration effect |
| `trade/TradePetCard.tsx:49` | `setFailed(false)` on `src` change |

All three are legitimate "sync from an external source on mount" cases, but they cause a cascading render. `TradePetCard.tsx:48-50` is the cleanest to fix — resetting image-error state on `src` change is textbook `key={src}` territory.

**Every lint-flagged file is MM2 code or one of the two calculator files.** The Adopt Me core lints clean.

---

## 4. 🟡 R15-04 · `queueMicrotask(() => setState(…))` used 100 times

Appearing in 36 files, this is clearly a deliberate house pattern to defer state updates out of an effect body (and, judging by the ESLint output, to sidestep `react-hooks/set-state-in-effect`).

```ts
// useUnreadNotifications.ts:12
if (!supabase || !user) { queueMicrotask(() => setCount(0)); return; }
// useExchangeData.ts:333
useEffect(() => { if (!authLoading) void queueMicrotask(() => reload()); }, [authLoading, reload]);
```

**Assessment:** it works and is not a bug — a microtask still lands before paint. But it:
- defers the update without unmount-safety in several sites (`useExchangeData.ts:333` schedules `reload()` with no cancellation; `reload` itself is guarded by `mountedRef`, so this specific one is safe — many others are not audited);
- is a workaround rather than a fix. The React-idiomatic alternatives are derived state (`useMemo`), `useSyncExternalStore` (which this codebase already uses correctly in `ThemeProvider` and `useBirthdayEventActive`), or a `key` reset.

Flagging as a systemic pattern worth a decision, not as 100 individual defects.

---

## 5. 🟡 R15-05 · Array-index-influenced keys in item lists

`key={`${item.item_id}-${index}`}` appears in `ListingCard.tsx:23`, `ListingDetail.tsx:190`, `TradeRoomExperience.tsx:126`, `ExchangeItemBuilder.tsx:106`, `TradeVotingBoard.tsx:410, :459`, `TradeHistory.tsx:54`.

These lists **do** legitimately contain duplicate `item_id`s (the same item as both HAVE and WANT, or the same weapon at different variants), so a bare `item_id` key would collide — the index disambiguates. The cost is that reordering or removing a row remounts subsequent rows.

For `ExchangeItemBuilder` (an editable list with per-row inputs), this is the one place where it can actually cause a visible glitch: removing row 2 remounts rows 3+ and drops any transient input state. `marketplace_listing_items` rows have a real `id` — using it where present would be strictly better.

Pure-index keys (`key={i}`) appear only in decorative/skeleton lists (`values/loading.tsx`, `BirthdayGiftReveal.tsx`) and one real list (`DemandBoard.tsx:315`) — benign in all three.

---

## 6. 🟡 R15-06 · `tsconfig.json` sweeps `scripts/` and `tests/` into the build

```json
"include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts", ".next/dev/types/**/*.ts", "**/*.mts"]
```
This is why a broken *test fixture* (`scripts/test-nich-local-max.ts`) fails a **production build**. `tsconfig.qa.json` exists and scopes correctly (`"include": [".qa-shims.d.ts", "src/**/*.ts", "src/**/*.tsx"]`) but is not referenced by any npm script.

Either narrow the main `include` to `src/**` and type-check scripts/tests separately, or fix the fixtures. Narrowing alone would hide two of the seven errors rather than fix them, so fixing the fixtures is the better first move.

---

## 7. 🟢 Server/client boundaries are correct

- **No unnecessary `"use client"` found.** Every client component either uses hooks, browser APIs, or Supabase. `ui/CSBTUI.tsx`, `QuickActions.tsx`, `HomeDeferredSections.tsx`, `Footer.tsx` and all `page.tsx` files are correctly server components.
- **No `"use server"` / Server Actions** — consistent with the browser-only auth model.
- **No `middleware.ts`** — an architectural decision, documented in `02_SYSTEM_ARCHITECTURE.md` §3.
- Async `params` handled correctly on 6 of 7 dynamic routes.
- `generateStaticParams` + `dynamicParams = false` on `/values/[id]` — correct for the Workers Static Assets strategy.

## 8. 🟢 Hydration handled correctly

- `<html suppressHydrationWarning>` paired with the blocking theme script — the canonical anti-FOUC pattern (`layout.tsx:99-131`).
- `ThemeProvider` uses `useSyncExternalStore(subscribe, readTheme, () => "dark")` with an explicit **server snapshot** — no `useEffect`-based theme flash.
- `useBirthdayEventActive` likewise supplies `getServerSnapshot: () => false`, so a time-dependent value never differs between server and client render.
- Browser APIs are consistently guarded: `typeof window === "undefined"` in `ThemeProvider.tsx:18`, `useBirthdayEventActive.ts:15`; `try/catch` around every `localStorage` access in `ThemeProvider`, `MM2TradeWorkflow`, `NichChatPersistence`, `InventoryCalculator`.

## 9. 🟢 Async safety is generally good

- `mountedRef` guards in `useExchangeData` before every `setState` after an await.
- `let active = true` + cleanup in `MarketNow`, `MemberPulse`, `useUnreadNotifications`.
- `AbortController` in `ValueHistoryCard`, `DemandBoard`, `NichChat`, and both Nich API routes.
- Every realtime channel is torn down: `return () => { void client.removeChannel(channel); }` in all three hooks and in `CSBTLounge`.
- `useAuthSession` unsubscribes from `onAuthStateChange`.

**Race condition worth noting:** `useExchangeData.ts:333` re-runs `reload()` whenever `authLoading` or the `reload` identity changes, and `reload` depends on `gameId`, `user`, `supabase`. Two rapid game switches can overlap two `loadPublic()` calls; the second `setListings` wins by timing, not by ordering. `mountedRef` prevents post-unmount writes but not out-of-order resolution. **EDGE CASE / RISK**, low likelihood — `fixedGameId` means `gameId` never changes within a mounted `ExchangeHub` on the current routes.

## 10. 🟢 Error and loading boundaries

`error.tsx` at root, `/values`, `/exchange`, `/community`, `/nich` — all delegate to `FeatureError` with a working `reset()`. `loading.tsx` at root, `/values`, `/exchange`, `/community`, `/nich`. `Suspense` fallbacks sized to real content in `/calculator`, `/inventory`, `/trade-opinions`, `/lounge`, `/mm2/exchange`, `/mm2/trade-opinions`, `/mm2/lounge`.

**Gap:** `src/app/mm2/**` has no `error.tsx` or `loading.tsx` of its own — an MM2 render failure falls back to the root boundary, which renders the Adopt Me shell.

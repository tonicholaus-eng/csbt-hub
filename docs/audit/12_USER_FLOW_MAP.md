# 12 — User Flow Map

Each flow traced through actual pages, components, state, APIs and tables. ✅ = works end to end. ⚠ = works with a caveat. 🔴 = broken.

---

## FLOW 1 — Item discovery (Adopt Me) ✅

```
/                          page.tsx → ThemeAwareHomeHero → (theme) Hero|Snoopy|Roblox|Halloween
  │                        data: tradingMeta.json (totalItems, generatedAt)
  ▼ "Browse Values"
/values                    "use client" · itemList (tradingItemsIndex.json, 629 KB)
  │                        state: search(debounced) · category · rarity · demand · sort · visibleCount(60)
  │                        no API — all filtering in the browser
  ▼ click item
/values/[id]               SSG · dynamicParams=false · generateStaticParams() → 3,382 prerendered pages
  │                        → PetDetails: GCash+Elve cards, variant grid, WishlistButton, WatchValueButton
  │                        → ValueHistoryCard → GET /api/value-history → value_history (anon key)
  │                        → getRelatedItems() — labelled "Deterministic · {source}"
  ▼
Empty states: value missing → formatTradeValue() renders "N/A" ✅
              history missing → { configured: false, points: [] } → card renders an empty state ✅
```

## FLOW 2 — Trade decision (Adopt Me) ⚠

```
/calculator                TradeCalculator (Suspense)
  │  add item              AddPetModal → itemList → getStartingValueType() picks a priced variant
  │  totals                useMemo reduce → parseItemValue() ?? 0     ⚠ missing value = silent 0
  │  verdict               TradeSummary (desktop) / mobileResult (mobile aside) — same rule, two copies
  ▼ "🗳 Ask Trade Opinions"
/trade-opinions?game=adopt-me&source=…&your=…&their=…
                           TradeVotingBoard → rowsFromSearch() → decodeTradeRows() ✅ hydrates
  │  post                  INSERT community_trades (RLS: auth.uid() = user_id)
  │                        display_name filled by BEFORE INSERT trigger
  ▼  community votes
                           INSERT community_trade_votes (unique per user+trade)
  ▼ "Open in Calculator →"
/calculator?source=…&your=…&their=…      🔴 CALCULATOR IGNORES ALL PARAMS — opens empty
```
**Break point:** `TradeVotingBoard.tsx:435-439` → `buildCalculatorHref("adopt-me", …)` → `/calculator` has no `useSearchParams`. Round trip is one-way.
Also lossy: `selectedItemsToRows()` hardcodes `quantity: 1`, so a 3× Frost Dragon trade exports as 1×.

## FLOW 2b — Trade decision (MM2) ✅

```
/mm2/calculator            MM2TradeCalculator (quantity, merge-on-duplicate, Balance Finder)
  │  missing value         missingFor() → getMM2TradeResult() → "CHECK", W/F/L withheld  ✅ truthful
  │  share                 buildTradeUrl() → navigator.clipboard
  │  save                  localStorage csbt:mm2:calculator:recent (max 6)
  ▼ "Ask Trade Opinions"
/mm2/trade-opinions?source=SUPREME&your=[{key,quantity}]&their=…
                           decodeMM2Rows() ✅
  ▼ "Open in Calculator →"
/mm2/calculator?…          useEffect :212-244 → decodeTradeRows() → rowsToSelected()  ✅ ROUND TRIP WORKS
```

## FLOW 3 — Trade discovery → offer → room ⚠

```
/values/[id] or /calculator
  ▼ "⇄ Find Trades"
/exchange?game=adopt-me&source=…&your=…&their=…
  ExchangeHub ── useAuthSession ── useExchangeData(gameId)
    ├ loadPublic()   marketplace_listings + items, status=OPEN, game_id, expires_at>now, limit 120
    ├ loadPrivate()  inventory · wishlist · preferences · offers · rooms · blocks  (adopt-me only)
    ├ rankListingMatches()  ← adopt-me only; MM2 gets basicMatches() (all zeros)
    └ realtime channel on 6 tables (unfiltered)
  │  importedHave/Want prefill CreateListingPanel  ✅
  ▼ create listing
  RPC marketplace_create_listing(p_game_id, …)
    → validates game/source/intent/items
    → resolves each item from value_history (adopt-me) | game_catalog_items (mm2)
    → 🔴 RAISES "Item … is not in the current CSBT … catalog" if the table is unseeded
    → trigger notify_marketplace_listing_match → notifications (href '/exchange/…' ⚠ always Adopt Me)
  ▼ another user opens the listing
/exchange/[id]             ListingDetail — ⚠ no expectedGameId on the Adopt Me route
  POST /api/exchange/event  { LISTING_VIEW } → service-role → marketplace_log_client_event
  ▼ "✨ Build & Send Offer"
  OfferComposer → RPC marketplace_create_offer
    → server recomputes BOTH totals; client totals ignored ✅
    → compatibility_score = NULL when any item is unpriced ✅
    → notification to the recipient, href '/exchange?offer=…' ⚠
  ▼ recipient accepts
  RPC marketplace_respond_offer → creates trade_rooms row → returns room id
  window.location.href = `${exchangeBasePath}/rooms/${data}`   ✅ correct in-app
  BUT the emailed/in-app notification href is '/exchange/rooms/<id>' ⚠ Adopt Me even for MM2
  ▼
/exchange/rooms/[id]       TradeRoomExperience — ⚠ no game guard
  useTradeRoomData: room · public_profiles · marketplace_user_stats · trade_messages ·
                    trade_room_events · middleman_roster · middleman_requests · exchange_staff
  realtime: trade_messages ✅ · trade_rooms ✅ · trade_room_events 🔴 (not published) · middleman_requests ✅
  ▼ status steps → RPC marketplace_set_room_status
  ▼ both confirm → RPC marketplace_confirm_completion → status COMPLETED + notifications
  ▼ (adopt-me only) "Update saved inventory" → RPC marketplace_apply_completed_trade_to_inventory
  ▼ "Leave a review" → trade_reviews → feeds marketplace_user_stats.trust_score
```

## FLOW 4 — Community ✅

```
/trade-opinions ──▶ "Discuss in Lounge" ──▶ /lounge?channel=trade-help
/lounge            CSBTLounge fixedGameId="adopt-me"
  channels         11 slugs, grouped Welcome/Trading/Value talk/Media
  post             INSERT community_posts (RLS + can_post_lounge_channel on INSERT)
  image            Storage community-images, path `${user.id}/${uuid}.ext`, 5 MB cap,
                   storage RLS requires foldername[1] = auth.uid()  ✅
                   on failure the uploaded object is removed  ✅
  realtime         community_posts ✅ · community_reactions ✅ · community_replies ✅
  MM2 equivalent   /mm2/lounge — identical component, fixedGameId="mm2", .mm2-social-mode skin
```

## FLOW 5 — Account ⚠

```
AuthCard (email/password) ──▶ Supabase Auth ──▶ localStorage session
  ▼
/profile        ProfileDashboard — profiles, avatars bucket, roblox_username
/inventory      dual persistence: inventory_items when signed in, localStorage when not
/wishlist       wishlist_items + value_watchlist (alert_percent, enabled)
/trades         trade_history
/notifications  notifications + notification_preferences
                useUnreadNotifications: filtered realtime on user_id ✅ correct pattern
  ▼ value alert path
  scripts/process-value-alerts.mjs (manual/unscheduled)
    reads the last two value_history rows per watch → notifications
    ⚠ never runs in CI → the whole alert feature is currently inert
```
⚠ **None of these routes has an MM2 counterpart, and `MM2Navbar` links to none of them.** A user in MM2 mode cannot reach their profile, notifications, inventory or wishlist without manually leaving MM2.

## FLOW 6 — Nich ✅

```
Any non-/mm2 route ──▶ GlobalNichAssistant (dynamic, ssr:false)
  ▼ text
POST /api/nich   rate limit → sanitize → routeNichMessage() (local brain)
                 → shouldUseAI()? → Ollama | Gemini | local fallback → cache
  ▼ screenshot
POST /api/nich/vision  MIME/size/dimension checks → Gemini 3.6 Flash
                 → consolidate → geometry repair → cross-check → verifyVisionItem()
                 → trade session with CONFIRMED/UNCERTAIN/UNRESOLVED slots
                 → user corrects slots conversationally → recalculated locally
  Persistence: localStorage transcript + nich_user_memory (aliases, preferred source, style)
```

---

## Scope transitions — where the seam shows

| Transition | Result |
|---|---|
| `/` → `/mm2` | `GameSwitcher` (in `Hero`) → `router.push("/mm2")` ✅ |
| `/mm2` → `/` | `MM2Navbar` `ADM` cell → `/` ✅ |
| MM2 → own profile | **no path** 🔴 |
| MM2 notification → trade room | lands on `/exchange/rooms/<id>` (Adopt Me shell) 🔴 |
| MM2 listing opened at `/exchange/<id>` | renders in the Adopt Me shell with no warning 🔴 |
| Adopt Me listing opened at `/mm2/exchange/<id>` | blocked with a clear message ✅ |
| `/trade-feed`, `/community` | `redirect()` to the new routes ✅ (but still in `sitemap.ts` ⚠) |

---

## Error paths that behave well

| Condition | Behaviour |
|---|---|
| Supabase env absent | `getSupabaseBrowserClient()` returns `null`; every consumer guards on it; `MarketNow` shows "Unavailable" |
| Value missing | `formatTradeValue()` → `"N/A"`; MM2 calculator → `CHECK` |
| Demand feed down | `/api/demand` → 502 + `items: []` → `DemandBoard` empty state, no fabricated trends |
| `value_history` table absent | `/api/value-history` returns `{ configured: false, points: [] }` (200) instead of an error |
| Pre-migration schema (Adopt Me) | `isLegacyGameSchemaError()` retries without `game_id` |
| Pre-migration schema (MM2) | Deliberately **not** retried; user sees *"MM2 Lounge needs the included multi-game Supabase migration before posting."* ✅ |
| Quota RPC unavailable | `serverQuota.ts` falls back to a per-instance bucket with a one-time console warning |
| Lounge image upload fails mid-post | the orphaned storage object is deleted (`CSBTLounge.tsx:617`) |
| Route render throws | `error.tsx` at root, `/values`, `/exchange`, `/community`, `/nich` → `FeatureError` with retry |

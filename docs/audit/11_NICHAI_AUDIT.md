# 11 — Nich AI Audit

25 files, ~13,000 lines — the largest single subsystem in the repository.

---

## 1. What Nich actually is

Nich is **primarily a deterministic engine with an optional LLM layer**, not an LLM wrapper. The comment at the top of `src/lib/nich/systemPrompt.ts` states the contract:

> *"The deterministic CSBT engine remains authoritative for item names, values, totals, variants, navigation actions, and W/F/L verdicts."*

```
Browser                                Cloudflare Worker
┌──────────────────────┐               ┌─────────────────────────────────────┐
│ GlobalNichAssistant  │               │ POST /api/nich          (2,166 ln)  │
│  └ NichAssistant     │──message──────▶  1 rate limit (nich-text-minute 24) │
│     └ NichChat       │   +context    │  2 sanitize (≤4k msg, ≤10×1.5k hist)│
│        · useNich     │   +history    │  3 routeNichMessage()  ← LOCAL BRAIN │
│        · useNichLocal│               │  4 shouldUseAI()? → provider select │
│        · Persistence │◀──response────│  5 Ollama | Gemini | local fallback │
└──────────────────────┘               │  6 cache + in-flight dedupe          │
        │                              └─────────────────────────────────────┘
        │ image bytes                  ┌─────────────────────────────────────┐
        └──────────────────────────────▶ POST /api/nich/vision     (929 ln)  │
                                       │  Gemini 3.6 Flash → raw detections  │
                                       │  → verifyVisionItem() against the   │
                                       │    CSBT catalog → trade session     │
                                       └─────────────────────────────────────┘
```

The "local brain" (`components/nich/assistant/brain/`, 14 files) is imported **by the server route** (`api/nich/route.ts:3`), so intent routing, item lookup, and trade comparison all execute on the Worker before any model is considered.

---

## 2. The Credit Saver architecture (the strongest design decision here)

`api/nich/route.ts` gates LLM use through four independent layers:

| Layer | Mechanism | Default |
|---|---|---|
| Intent allowlist | `AI_ALWAYS_SKIPPED_INTENTS` — 12 intents (greeting, help, inventory, offerBuilder, wishlist, exchange, valueHistory, counterOffer, tradingProfile, navigation, …) **never** reach a model | — |
| Style mode | `NICH_AI_STYLE_MODE` = `all` \| `advice` \| `off` | `advice` |
| Explicit opt-in | `AI_EXPLICIT_OPT_IN_PHRASES` — "use ai", "ask gemini", "think deeper", … | — |
| Feature flags | `NICH_ALLOW_AI_FALLBACK`, `NICH_ALLOW_AI_TRADE_EXPLANATIONS`, `NICH_ALLOW_AI_ADVICE` | `false` in `.env.example`, **`true` in `wrangler.jsonc`** |
| Daily cap | `nich-gemini-text-daily` quota, default 25 | 25 |
| Response cache | `aiTextCache` Map, TTL `NICH_AI_CACHE_TTL_MS` (6 h default / 21600000 in `.env.example`), max 500 entries | — |
| In-flight dedupe | `geminiInFlight` Map — identical concurrent prompts share one call | — |

Provider selection (`:1956`) is `NICH_AI_PROVIDER=auto`: Ollama when a local URL responds, Gemini on a hosted platform (detected via `VERCEL`/`NETLIFY`/`AWS_LAMBDA_FUNCTION_NAME`/`RENDER`/`RAILWAY_ENVIRONMENT`/`CF_PAGES` env markers at `:878-883`), local rules otherwise.

> ⚠ The platform probe at `:878-883` checks `CF_PAGES` — **Cloudflare *Workers* sets none of those variables.** On the actual production target the "hosted" branch may not trigger, so provider selection likely falls through to whatever `NICH_AI_PROVIDER=auto` resolves to without the hosted hint. `wrangler.jsonc` sets `NICH_AI_PROVIDER: "auto"`, so this is worth verifying at runtime. **POSSIBLE ISSUE** — cannot be confirmed statically.

---

## 3. Vision pipeline (`/api/nich/vision`, 929 ln + `lib/nich/vision.ts`, 810 ln)

Version-stamped: `VISION_PIPELINE_VERSION = "vision-v29-cloudflare-inline-data-20260818"`.

```
image bytes ──▶ MIME allowlist (jpeg/png/webp)
            ──▶ size check: header x-nich-image-bytes AND actual body length
            ──▶ dimensions clamped ≤8192
            ──▶ inline base64 → Gemini 3.6 Flash
                  (inline data chosen over the Files API because Cloudflare
                   egress can be rejected with FAILED_PRECONDITION — comment :58-61)
            ──▶ raw detections
            ──▶ consolidateTradeSlotDetections()   dedupe multiview slots
            ──▶ repairTradeGeometry()              fix left/right from bboxes
            ──▶ mergeVisionCrossCheck()            two-pass agreement
            ──▶ shouldBlockTradeLayout()           refuse low-confidence layouts
            ──▶ verifyVisionItem()                 ← CATALOG VERIFICATION
            ──▶ createTradeSessionFromVision()     slots with CONFIRMED/UNCERTAIN/UNRESOLVED
            ──▶ optional focused re-check of uncertain slots only
```

**`verifyVisionItem()` is the anti-hallucination gate.** The model's raw name is resolved against the CSBT catalog via `searchVisionItems()`; anything that does not resolve becomes `UNRESOLVED`, never a fabricated item. This is directly asserted by tests:

```
✔ vision catalog verification never accepts an invented canonical item
✔ independent vision disagreement never auto-confirms a wrong pet
✔ known visual-confusion families require a targeted audit before auto-confirming
✔ empty item vision result does not claim successful recognition
✔ empty trade recognition never tells the user to correct invisible slots
✔ Sugar Skull Dog stays ambiguous against Sugar Axolotl until audited
✔ generic Elephant icon is held for Bush Elephant disambiguation
```
(49/49 tests pass — see `16_TESTING_RELIABILITY.md`.)

Session outputs carry `promptVersion` and `catalogVersion` (`` `catalog-${totalItems}-${generatedAt}` ``, `tradeSession.ts:138`) so a stale recognition can be identified after a data refresh. That is unusually mature provenance tracking.

---

## 4. What data Nich can access

| Source | Scope | Where |
|---|---|---|
| Adopt Me catalog (3,382 items) | public | `lib/search.ts`, `lib/nich/itemResolver.ts` |
| `marketplace_listings` (open) | public | `useNichLocalData.ts:210` |
| `marketplace_events` | public | `:234` |
| `value_history` | public | `:265`, `:359` (`/api/value-history`) |
| `/api/demand` (amvgg.com) | public | `:240` |
| **`inventory_items`** | own rows (RLS) | `:218` |
| **`wishlist_items`** | own rows (RLS) | `:221` |
| **`marketplace_preferences`** | own rows (RLS) | `:224` |
| **`trade_history`** (last 50) | own rows (RLS) | `:227` |
| **`nich_user_memory`** (aliases, preferred source, style) | own rows (RLS) | `:230`, upsert `:389` |
| Guest inventory | `localStorage` `GUEST_INVENTORY_KEY` | `:111` |
| Chat transcript | `localStorage` `NICH_CHAT_STORAGE_KEY` | `NichChatPersistence.ts:721` |

All personal reads go through the **browser** client and are RLS-scoped to `auth.uid()`. Nich cannot read another user's data.

**Exposure question that matters:** when the AI layer *is* used, personal context assembled from the above can be included in the prompt sent to Google. `sanitizeNichTradeSession()` / `sanitizeNichUserMemory()` (`lib/nich/tradeSession.ts`) bound and shape what crosses that boundary, and 12 personal-data intents (`inventory`, `wishlist`, `tradingProfile`, `offerBuilder`, `exchange`, `valueHistory`) are in `AI_ALWAYS_SKIPPED_INTENTS` and therefore **never** reach a model at all. That is a deliberate and effective privacy boundary.

⚠ There is **no user-facing disclosure** in the Nich UI that a message may be sent to Google, and `/privacy` (33 lines) does not mention Gemini or third-party AI processing. For a product whose audience is largely minors (Roblox trading), that is worth fixing. **MEDIUM, product/legal rather than technical.**

---

## 5. Risk assessment

| Risk | Assessment |
|---|---|
| **Hallucinated values** | **LOW.** The model never produces values. All values, totals and W/F/L come from `lib/valueSystem.ts` + the catalog. The system prompt states this and the vision path enforces it via `verifyVisionItem()`. |
| **Hallucinated items** | **LOW.** Catalog verification + explicit tests. |
| **Stale data** | **MEDIUM.** `NICH_CATALOG_VERSION` is stamped on sessions, but the 6-hour `aiTextCache` can serve an AI explanation composed before a value refresh. The deterministic answers are always current. |
| **User-data exposure to Google** | **LOW-MEDIUM.** Bounded by intent allowlist + sanitizers; undisclosed to users. |
| **Cost / quota abuse** | **HIGH.** See `10_AUTH_SECURITY_AUDIT.md` SEC-01 — the daily and per-minute caps key off a spoofable header, and both endpoints are unauthenticated. This is the single most important Nich issue. |
| **Prompt injection** | **LOW impact.** A user could steer the *prose*, but cannot change a value, total, or verdict because those are computed server-side and inserted deterministically. |
| **Failure handling** | **GOOD.** Missing `GEMINI_API_KEY` → 503 with an actionable message. Gemini 401/403 → an explicit operator-facing string (`vision/route.ts:476`). Quota RPC unavailable → per-instance in-memory fallback with a one-time warning (`serverQuota.ts:63-68`). Timeouts are configurable and clamped. |

---

## 6. Architectural strengths

1. **Deterministic-first.** The expensive, hallucination-prone layer is optional and gated four ways.
2. **Catalog verification as a hard gate**, backed by ~40 regression tests including named visual-confusion families (Cabbit/Tuxedo, Sugar Skull Dog/Sugar Axolotl, Elephant/Bush Elephant).
3. **Provenance stamping** (`promptVersion`, `catalogVersion`) on every vision session.
4. **Durable cross-instance quota** via `nich_consume_quota` on Postgres, with a graceful per-instance fallback for pre-migration deploys.
5. **Cost engineering for the target platform** — inline image data instead of the Files API; `searchVisionItems()` written specifically to avoid full-catalog Levenshtein inside a 10 ms Workers Free budget, with the reasoning in a comment (`lib/search.ts:144-147`).

## 7. Architectural weaknesses

1. **`api/nich/route.ts` is 2,166 lines** doing routing, sanitising, provider selection, caching, dedupe, quota, prompt assembly and two HTTP integrations. Very hard to test — and **zero tests cover it**.
2. **Duplicated trade-comparison logic**: `brain/tradeComparison.ts` (453) and `tools/tradeComparison.ts` (1,631) are two implementations of the same concept.
3. **`tools/petSearch.ts` is 3,008 lines** — the largest single non-generated file.
4. **The hosted-platform probe does not know about Cloudflare Workers** (§2).
5. **Adopt-Me-hardcoded throughout** — see §8.

---

## 8. What genuine multi-game Nich support would require

Nich is Adopt-Me-only **by design**, and correctly so: `GlobalNichAssistant.tsx:12-19` hides the launcher on every `/mm2/*` route with a comment stating the omission is intentional. There is no half-working MM2 Nich to trip over. Good discipline.

Making it multi-game would require:

| Area | Work |
|---|---|
| Item resolution | `lib/nich/itemResolver.ts` and `lib/search.ts` are built on `clientItemList` (Adopt Me). Needs to become adapter-driven. |
| Vision prompt & taxonomy | The prompt teaches Adopt Me pets, `NORMAL/NEON/MEGA` variants and `NO_POTION/RIDE/FLY/FLY_RIDE` potions. MM2 has none of those and has 14 rarity tiers instead. A separate prompt and a separate `NichVisionVariant`/`NichVisionPotion` model per game. |
| Value system | `NichTradeValueSystem = "GCASH" \| "ELVE"` (`tradeSession.ts:14`) — must widen to `CSBTValueSource`. |
| Local data | `useNichLocalData` reads Adopt-Me-only tables; MM2 has no inventory/wishlist/preferences at all. |
| Catalog version | `NICH_CATALOG_VERSION` derives from `tradingMeta.json` alone. |
| System prompt | ~360 lines of Adopt-Me-specific instructions. |
| Tests | ~40 vision tests are Adopt-Me-pet-specific and would need MM2 analogues. |

**Estimate: 3–5 weeks**, and it is only worth doing after MM2 has inventory/wishlist — otherwise MM2 Nich would have almost no personal context to reason over. Deferring it is the correct call today.

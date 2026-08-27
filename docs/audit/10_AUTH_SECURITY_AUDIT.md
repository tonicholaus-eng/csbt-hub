# 10 — Authentication, Authorization & Security Audit

---

## 1. Authentication, end to end

| Stage | Implementation |
|---|---|
| Provider | Supabase Auth (email/password). `AuthCard.tsx` is the only sign-in surface. |
| Client | `src/lib/supabase/client.ts` — a single memoised browser client with `persistSession: true`, `autoRefreshToken: true`, `detectSessionInUrl: true`. Returns `null` when env vars are absent. |
| Session hook | `src/hooks/useAuthSession.ts` — `getSession()` once, then `onAuthStateChange`, with proper `unsubscribe` on unmount. |
| Session storage | Browser `localStorage` (Supabase default). |
| Server-side session | **None.** No cookie handling, no `middleware.ts`, no `@supabase/ssr`. |
| Server-side token check | Exactly one place: `api/feedback/route.ts:41-45` verifies an optional `Authorization: Bearer <access_token>` via `supabase.auth.getUser(token)`. |

**Consequence:** every protected page is a public shell that renders an `AuthCard` client-side. `robots.ts` is what keeps `/profile`, `/inventory`, `/wishlist`, `/notifications`, `/exchange/rooms/`, `/exchange/moderation`, `/exchange/middleman` out of search indexes. **Postgres RLS is the only authorization boundary.**

Given the RLS quality documented in `09_SUPABASE_DATABASE_AUDIT.md`, this is a defensible architecture — but it is a single line of defence, and every authorization decision must therefore be assumed to be reachable by a crafted PostgREST request using the public anon key.

---

## 2. Authorization model

| Role | Determined by | Server-enforced? |
|---|---|---|
| Anonymous | no session | ✅ RLS `to anon` grants |
| Member | `auth.uid()` | ✅ every policy |
| Listing owner | `marketplace_listings.user_id = auth.uid()` | ✅ policies + RPC re-checks |
| Offer participant | `sender_id` / `recipient_id` | ✅ policy + `marketplace_respond_offer` re-check |
| Room participant | `trade_rooms.user_a/user_b` | ✅ policy + RPC re-checks |
| Assigned middleman | `middleman_requests.assigned_middleman = auth.uid()` | ✅ `marketplace_is_assigned_middleman()` + explicit `raise` in each RPC |
| Exchange staff | row in `exchange_staff` | ✅ `marketplace_moderate_report` raises `'Exchange staff access required'` before doing anything |

`exchange_staff` and `middleman_roster` have **no self-service insert policy** — they are admin-managed in the Supabase dashboard, with an explicit code comment saying so (`legacy_foundation.sql:1163`). Privilege escalation into staff/middleman roles is not reachable from the app.

**No IDOR found in the RPC layer.** Every mutating RPC re-derives the actor from `auth.uid()` and never trusts a client-supplied user id. Grep for client-supplied identity: the only `user_id` values sent from the browser are the caller's own (`user.id` from the session), used in `.eq()` filters that RLS would enforce anyway.

---

## 3. Findings

### 🔴 SEC-01 · Rate-limit identity is derived from a spoofable header — HIGH
**Evidence**
```ts
// src/app/api/nich/route.ts:416-427
function getClientIdentifier(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || "unknown";
}
```
```ts
// src/app/api/nich/vision/route.ts:100-105
function getClientIdentifier(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("cf-connecting-ip")?.trim()   // ← checked SECOND
      || request.headers.get("x-real-ip") || "unknown";
}
```
Same `x-forwarded-for`-first pattern in `api/exchange/event/route.ts:16` and `api/feedback/route.ts:7`.

**Why it fails on Cloudflare:** the edge *appends* the connecting IP to any client-supplied `X-Forwarded-For`, producing `<client value>, <real ip>`. `split(",")[0]` therefore returns the value the **client** chose. `CF-Connecting-IP` is set by the edge and cannot be spoofed — and the Nich text route never reads it.

**Attack scenario:** a script sends `POST /api/nich/vision` with a JPEG and a random `X-Forwarded-For` per request. Each request gets a fresh quota bucket, so both `NICH_GEMINI_VISION_RATE_LIMIT` (6/min) and `NICH_GEMINI_VISION_DAILY_LIMIT` (100/day) are defeated. Both endpoints are unauthenticated.

**Impact:** direct, uncapped Gemini billing. Secondary: unbounded rows in `nich_usage_buckets`; the same trick defeats feedback throttling and Exchange telemetry limits.
**Likelihood:** high — trivial to execute, requires no account.
**Mitigation already present:** `.env.example:56` advises setting a Google billing budget as the real account-level guard. That caps the loss; it does not prevent the abuse.
**Fix:** read `cf-connecting-ip` **first** in all four routes; fall back to the *last* XFF entry, never the first.

### 🟠 SEC-02 · Display-name impersonation in Exchange and Trade Opinions — MEDIUM
Full detail in `09_SUPABASE_DATABASE_AUDIT.md` DB-01. Both `fill_*_display_name` triggers are `BEFORE INSERT` only while the UPDATE policy grants all columns; `community_posts.display_name` has no trigger at all and is client-supplied.
**Attack scenario:** a scammer creates a listing, then `PATCH`es `display_name` to a well-known trader's name using the public anon key, and negotiates under that identity.
**Impact:** high for a trading marketplace. **Likelihood:** low-moderate — needs a crafted request, not available in the UI.
**Fix:** `BEFORE INSERT OR UPDATE` on both triggers; add one to `community_posts`; or render names from `public_profiles`.

### 🟠 SEC-03 · `#announcements` write gate is bypassable via UPDATE — MEDIUM
`09_SUPABASE_DATABASE_AUDIT.md` DB-02. `can_post_lounge_channel()` is enforced on INSERT only.
**Attack scenario:** post to `#general`, then `UPDATE community_posts SET channel_slug='announcements'` on your own row. Content appears in the official announcements channel.
**Impact:** community trust / phishing surface. **Likelihood:** low-moderate.
**Fix:** add the check to the UPDATE `WITH CHECK`.

### 🟠 SEC-04 · Cross-game scope leak in Exchange routes — MEDIUM (correctness, not confidentiality)
`03_ROUTE_MAP.md` R-03/R-04. `/exchange/[id]` has no `expectedGameId`; neither room route has any game guard; 17 SQL notification `href`s are hard-coded to `/exchange…`.
No data is exposed that RLS would otherwise protect — a room participant may legitimately read their own room. The failure is product-integrity: MM2 users are routed into the Adopt Me shell, breaking the mode isolation `CLAUDE.md` treats as non-negotiable.

### 🟡 SEC-05 · `npm run export:safe` copies `.dev.vars` and `.wrangler/` — MEDIUM
`scripts/create-safe-export.mjs:6-17`:
```js
const excludedNames = new Set(["node_modules", ".next", ".git", ".vercel", "dist"]);
const excludedFiles = new Set([".env", ".env.local", ".env.development", ".env.production", ".env.test"]);
…
if (entry.name.startsWith(".env") && entry.name !== ".env.example") continue;
```
`.env*` is handled correctly. **`.dev.vars` is not excluded**, and neither are `.open-next/` or `.wrangler/` (which can contain local Worker state). `.dev.vars` is the Cloudflare local-secrets file — currently it holds only `NEXTJS_ENV`, so **no secret leaks today**, but the script is named "safe export" and is the exact mechanism `CLAUDE.md` warns about ("Do not include them in exported project archives").
**Fix:** add `.dev.vars*`, `.open-next`, `.wrangler`, `supabase/.temp` to the exclusion sets.

### 🟡 SEC-06 · `marketplace_events` exposes the public search stream — LOW/MEDIUM
`09_SUPABASE_DATABASE_AUDIT.md` DB-06. `SEARCH` events store `metadata.query` (raw user search text, ≤80 chars) in a table with a `using (true)` read policy. Events carry no user id and the IP/UA fingerprint is used only for rate limiting and never persisted on the row — so this is aggregate behavioural data, not PII. Still, it is the site's entire search log, readable by anyone.
Retention: `marketplace_prune_short_lived_telemetry()` exists and is **called by nothing** in this repo — no script, no workflow, no `pg_cron`. Telemetry grows unbounded.

### 🟡 SEC-07 · CSP is Report-Only with no reporting endpoint — LOW
`next.config.ts:3-16` builds a reasonable policy but ships it as `Content-Security-Policy-Report-Only` with **no `report-uri` / `report-to`**. Violations go to browser consoles and nowhere else. The policy also needs `'unsafe-inline'` + `'unsafe-eval'` in `script-src` (Next.js + the inline theme script), so enforcing it as-is would provide limited XSS protection anyway.
Additionally, `next.config.ts` comments note that Workers Static Assets bypass `headers()`; `public/_headers` sets only `Cache-Control`, so **static responses carry no security headers at all**.

### 🟢 SEC-08 · No exposed secrets — VERIFIED
- `git log --all -- .env .env.local .dev.vars` → **empty**. They were never tracked.
- `.gitignore:35` `.env*` with `!.env.example`; `.gitignore:53` `.dev.vars*`. `git check-ignore -v` confirms both are ignored.
- No JWT / `sk-` / `AIza` literals in `src/`, `scripts/`, or `public/`.
- `SUPABASE_SECRET_KEY` and `GEMINI_API_KEY` are read **only** server-side (4 API routes + `lib/nich/serverQuota.ts` + 2 `.mjs` scripts). Never prefixed `NEXT_PUBLIC_`. `.env.example:22` even warns *"Keep this server-side. Never rename it to NEXT_PUBLIC_GEMINI_API_KEY."*
- `wrangler.jsonc:vars` contains only non-secret feature flags.

### 🟢 SEC-09 · XSS surface is minimal — VERIFIED
Three `dangerouslySetInnerHTML` call sites, all with developer-controlled input:
1. `layout.tsx:130` — the static inline theme script.
2. `layout.tsx:131` — a hard-coded JSON-LD literal.
3. `values/[id]/page.tsx:25` — JSON-LD built from `item.NAME` (curated generated data, not user input). A `</script>` sequence inside an item name would break out; the dataset makes that implausible. **INFORMATIONAL.**

No `eval` / `new Function`. All user-generated content (lounge posts, replies, notes, display names) renders as React text nodes.
All four external `target="_blank"` links carry `rel="noreferrer"` or `rel="noopener noreferrer nofollow"`.

### 🟢 SEC-10 · No open redirects — VERIFIED
Three `window.location.href =` assignments (`ExchangeHub.tsx:194`, `ListingDetail.tsx:141,184`) all build the target from a **prop** (`exchangeBasePath`) plus a server-returned UUID. No user-controlled URL reaches a navigation.

### 🟢 SEC-11 · Server-side input validation is thorough — VERIFIED
| Route | Controls |
|---|---|
| `/api/exchange/event` | event-type allowlist; `SEARCH` requires ≥2 chars and truncates to 80; `value_source` allowlist; RPC additionally requires ≥32-char fingerprint, ≤180-char item id, ≤1200-char metadata, and an existing `listing_id` for listing-scoped events |
| `/api/feedback` | category allowlist; message 5–2000 chars; `pageUrl` ≤500; honeypot `website` field returns a fake success; quota RPC |
| `/api/value-history` | source + type allowlists; `days` clamped 7–90 |
| `/api/items` | `limit` clamped 1–240, `offset` ≥0 |
| `/api/nich` | message ≤4,000 chars; ≤10 history messages of ≤1,500 chars each |
| `/api/nich/vision` | MIME allowlist (jpeg/png/webp); size from header **and** re-checked against the actual body; dimensions clamped ≤8192; client hash must match `/^[a-f0-9]{64}$/` |

`marketplace_log_client_event` is `REVOKE`d from `public, anon, authenticated` and `GRANT`ed **only to `service_role`** (`20260826000100:1478-1479`) — the telemetry RPC cannot be called directly with the anon key.

### 🟢 SEC-12 · SQL injection — not reachable
All database access is PostgREST or parameterised RPC. The one dynamic SQL statement in the schema, `can_post_lounge_channel`, uses `execute … using auth.uid()` — parameterised. All 42 definer functions set `search_path = ''` and fully qualify object names.

PostgREST filter strings are built with template literals in two places (`useExchangeData.ts:192`, `:208`: `` `sender_id.eq.${userId},recipient_id.eq.${userId}` ``), but `userId` is always a UUID taken from the authenticated session, never from user input.

---

## 4. Severity summary

| ID | Severity | Title |
|---|---|---|
| SEC-01 | **HIGH** | Spoofable `x-forwarded-for` defeats all four rate limits, incl. paid Gemini vision |
| SEC-02 | MEDIUM | `display_name` mutable after insert → impersonation |
| SEC-03 | MEDIUM | `#announcements` gate bypassable via UPDATE |
| SEC-04 | MEDIUM | Cross-game route leak (integrity, not confidentiality) |
| SEC-05 | MEDIUM | `export:safe` includes `.dev.vars` / `.wrangler` |
| SEC-06 | LOW–MED | Public search-term telemetry, never pruned |
| SEC-07 | LOW | CSP report-only with no collector; no headers on static assets |
| SEC-08…12 | ✅ | No secrets, no XSS, no open redirect, no SQLi, strong input validation |

**No CRITICAL findings.** The backend authorization model is the strongest part of this codebase.

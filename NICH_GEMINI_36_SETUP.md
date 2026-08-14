# NICH + Gemini 3.6 Flash Setup

This build keeps **NICH Local Max** as the main trading brain and uses **Gemini 3.6 Flash only when it adds real value**.

## What is enabled

- Text AI model: `gemini-3.6-flash`
- Emergency text fallback: `gemini-3.5-flash-lite`
- Screenshot / vision model: `gemini-3.6-flash`
- Thinking level: `minimal` by default to reduce token usage
- Default AI style mode: `advice`
- Local inventory, wishlist, value lookup, W/F/L, offer building, Exchange matching, value history, and other authoritative CSBT tools remain local.

## Screenshot safety flow

1. The browser resizes large screenshots before upload.
2. Gemini identifies visible Adopt Me items, variants, potion badges, quantities, and trade sides.
3. The server matches Gemini's names against the CSBT item database.
4. Unknown or low-confidence items are rejected instead of silently accepted.
5. Only verified items are converted into a local NICH trade/value request.
6. CSBT's own value engine calculates the values and W/F/L result.

Gemini is **not allowed to supply or override CSBT prices**.

## Environment variables

Keep these server-side:

```env
GEMINI_API_KEY=PASTE_YOUR_KEY_HERE
NICH_AI_PROVIDER=auto
NICH_AI_STYLE_MODE=advice

NICH_GEMINI_MODELS=gemini-3.6-flash,gemini-3.5-flash-lite
NICH_GEMINI_MAX_TOKENS=600
NICH_GEMINI_THINKING_LEVEL=minimal
NICH_GEMINI_TIMEOUT_MS=45000

NICH_GEMINI_VISION_ENABLED=true
NICH_GEMINI_VISION_MODEL=gemini-3.6-flash
NICH_GEMINI_VISION_THINKING_LEVEL=minimal
NICH_GEMINI_VISION_MAX_TOKENS=1400
NICH_GEMINI_VISION_TIMEOUT_MS=45000
NICH_GEMINI_VISION_MAX_IMAGE_BYTES=6291456
NICH_GEMINI_VISION_RATE_LIMIT=6
NICH_GEMINI_VISION_DAILY_LIMIT=100
```

Never rename `GEMINI_API_KEY` to `NEXT_PUBLIC_GEMINI_API_KEY`.

## Budget controls in this build

- NICH Local Max answers high-confidence requests without Gemini.
- Ordinary value lookups and most W/F/L calculations remain local.
- Text AI defaults to advice/fallback use instead of rewriting everything.
- Screenshot uploads are compressed/resized in the browser.
- Vision accepts one image per request.
- Vision is rate-limited per client.
- There is a soft daily server-instance screenshot cap (default 100).
- Uncertain recognition does not trigger a second expensive model request.

The server-instance daily cap is a safety layer, not a guaranteed account-level billing ceiling on serverless hosting. Use Google AI Studio billing controls as the real account-level protection.

## Testing

After dependencies are installed:

```bash
npm run test:nich-local
npm run test:nich-vision
npm run build
```

Then run:

```bash
npm run dev
```

Open NICH and use the new camera button beside the message box.

You can also open `/api/nich/vision` in the browser. It reports whether screenshot recognition is configured, which model is selected, and the current soft daily limit. It never returns the API key.

## Vercel

Add `GEMINI_API_KEY` and the NICH Gemini variables in your Vercel project's Environment Variables. Redeploy after saving them.

Do not commit your real Gemini API key to GitHub.

## Local-first credit saver settings

For the lowest Gemini spend, keep these server variables at their defaults:

```env
NICH_ALLOW_AI_FALLBACK=false
NICH_ALLOW_AI_TRADE_EXPLANATIONS=false
NICH_ALLOW_AI_ADVICE=false
NICH_GEMINI_TEXT_DAILY_LIMIT=25
NICH_AI_CACHE_TTL_MS=21600000
NICH_GEMINI_VISION_CACHE_TTL_MS=86400000
```

With these settings, normal typed value/WFL/trading commands stay deterministic and local. Gemini text is not used merely because a user misspells an item or phrases a trade strangely; NICH asks for a local clarification instead. Screenshot recognition still uses Gemini for a new image, while exact repeated optimized screenshots can be served from browser/server caches.

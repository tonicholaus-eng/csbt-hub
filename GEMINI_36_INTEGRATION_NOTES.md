# NICH Gemini 3.6 Flash Integration Notes

## Added in this build

- Gemini 3.6 Flash as NICH's primary paid AI model.
- Cost-saving `advice` routing so high-confidence Local Max requests stay local.
- Gemini 3.6-compatible thinking configuration (`minimal`) for low-cost/low-latency calls.
- Screenshot upload button in NICH for JPEG, PNG, and WebP trade/inventory screenshots.
- Browser-side screenshot resizing/compression before the image reaches the server.
- Server-only `/api/nich/vision` endpoint with per-client rate limiting and a soft daily safety cap.
- Structured Gemini Vision output for item name, trade side, Normal/Neon/Mega, F/R/FR, quantity, and confidence.
- Local CSBT database verification before any detected item becomes authoritative.
- Trade screenshots only calculate W/F/L when all items, trade sides, and important pet variant/potion details are sufficiently clear.
- Gemini never supplies CSBT prices or the final W/F/L result; the existing local NICH engine does that calculation.
- Conversation handoff updated to avoid unsupported legacy Gemini turn formatting and to keep context shorter.
- New `npm run test:nich-vision` regression test.

## Budget defaults

- `NICH_AI_STYLE_MODE=advice`
- `NICH_GEMINI_THINKING_LEVEL=minimal`
- `NICH_GEMINI_VISION_THINKING_LEVEL=minimal`
- `NICH_GEMINI_VISION_RATE_LIMIT=6`
- `NICH_GEMINI_VISION_DAILY_LIMIT=100`

The daily limit is a server-instance safety layer, not a guaranteed account billing ceiling on serverless hosting.

## Validation completed in the supplied project

- Changed TypeScript/TSX files passed syntax transpilation checks.
- Existing `NICH Local Max` smoke tests passed.
- New screenshot verification tests passed.
- Known items are accepted, small name typos are corrected against CSBT data, unknown item names are rejected, and screenshot-generated W/F/L requests route through the existing local trade engine.

A full `next build` could not be executed in the editing environment because the npm registry was unreachable, so run `npm install`, `npm run test:nich-local`, `npm run test:nich-vision`, and `npm run build` on your PC before publishing.

## Security

The downloadable ZIP intentionally does **not** include `.env.local`. Keep your existing `.env.local` and add the Gemini server-side variables when ready. Never expose `GEMINI_API_KEY` through a `NEXT_PUBLIC_` variable.

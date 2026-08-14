# NICH Local Credit Saver Max

This revision makes NICH aggressively local-first so normal trading language, typos, abbreviations, and deterministic CSBT features do not silently spend Gemini credits.

## Core rule

Gemini is no longer the normal fallback for text. NICH first uses local parsing, CSBT data, conversation context, Inventory/Wishlist/Exchange logic, and deterministic trading advice. Paid text AI is reserved for an explicit user request (for example, “use Gemini”) unless an administrator intentionally enables an override.

## Local trader-language upgrades

NICH now handles many common real-world forms without paid AI, including:

- Compact pet names: `batdrag`, `frostdrag`, `shadowdrag`, `arcticrein`, etc.
- Common misspellings and clipped names through aliases + fuzzy recovery.
- Repeated-letter typos such as `froooost`.
- Simple letter/number mistakes such as `0wl`.
- Attached variants/potions: `mfrparrot`, `nfrkanga`, `frbatdrag`, `batdragfr`.
- Attached quantities: `2xfrbatdrag`.
- Dense trades with no plus signs: `mfrparrot vs frbatdrag nfrkanga frcow`.
- Compact ownership: `me:mfrparrot them:frbatdrag+nfrkanga+frcow`.
- Natural English: `I give Frost Dragon get Owl`, `I got offered Owl for my Frost Dragon`.
- Natural Taglish/Tagalog: `bigay ko ... kuha ko ...`, `akin ... kanya ...`.
- Compact W/F/L and lookup syntax: `wflme`, `fdvsowl`, `hmfd`, `frostdragvalue`.
- Common no-space chat phrases such as `shouldiaccept`, `goodtrade`, `highdemand`, `myinv`, and `dontuse`.
- More casual W/F/L language: “is this a W,” “big W,” “take or pass,” “talo ba,” “tabla ba,” and “sakto ba.”

Ambiguous names are still handled conservatively. NICH should ask for clarification instead of confidently choosing a wrong item.

## Trade parser safety

- A parsed two-sided trade now takes priority over broader Inventory/Profile intents.
- Unknown trade chunks are never silently discarded.
- Quantity/variant prefixes are protected from false item matches.
- `Frost Dragon` is not mistaken for an `FR` prefix.
- `NFR` is not accidentally split into `NF R`.
- LEFT/RIGHT screenshot results still flow through CSBT verification and the local W/F/L calculator.

## Zero-cost local advice

Common trading concepts now have deterministic local answers, including:

- demand vs value
- upgrade/downgrade strategy
- negotiation/counteroffers
- scam/safety guidance
- hold vs trade
- profit/flipping/retrade logic
- overpay/underpay concepts
- no-potion/potion-premium cautions

When a question needs live CSBT demand/history data, NICH uses the local account snapshot. General concept questions do not wait for Inventory/Profile loading and do not need Gemini.

## Credit routing safeguards

Default settings:

```env
NICH_ALLOW_AI_FALLBACK=false
NICH_ALLOW_AI_TRADE_EXPLANATIONS=false
NICH_ALLOW_AI_ADVICE=false
NICH_GEMINI_TEXT_DAILY_LIMIT=25
NICH_AI_CACHE_TTL_MS=21600000
```

With those defaults:

- normal values: local
- typed W/F/L: local
- Inventory/Wishlist/Exchange: local
- offer builder/counteroffers: local
- deterministic trading advice: local
- unclear trading text: local clarification
- paid text AI: explicit opt-in only

An exact repeated paid text request is cached on a warm server instance and in-flight duplicate requests share one Gemini call.

## Screenshot credit safeguards

Screenshot recognition still needs Gemini Vision for new images, but duplicate work is reduced:

1. The browser hashes the optimized image and reuses a successful result for the current browser session.
2. The server also SHA-256 caches exact optimized screenshots on warm instances (default 24h).
3. Cache hits do not consume another daily Gemini-call slot.
4. The per-minute upload limiter still applies to prevent abuse.
5. The daily Gemini Vision call cap remains configurable.

Recommended setting:

```env
NICH_GEMINI_VISION_CACHE_TTL_MS=86400000
```

## Tests

Run:

```bash
npm run test:nich-credit-saver
npm run test:nich-local
npm run test:nich-vision
npm run build
```

The dedicated credit-saver test includes the original failing example:

`WFL me mfr parrot him fr batdrag nfr kanga and fr cow`

and compact/natural/Taglish variations.

## Intentionally NOT added

The previously skipped multi-score trade system (Value Score / Demand Score / Liquidity Score / Overall NICH Score out of 100) remains excluded.

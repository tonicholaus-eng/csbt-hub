# NICH Local Max Upgrade

This build pushes NICH's deterministic/local intelligence as far as practical before adding a paid vision/LLM API.

## Cost-first routing

NICH now treats CSBT's own database and account data as authoritative. High-confidence local responses set `aiEligible: false`, so the browser does not call `/api/nich` for work NICH can already solve itself. This includes item lookups, nearby-value searches, W/F/L calculations, inventory intelligence, offer building, wishlist planning, Exchange matching, demand questions, value-history questions, counteroffers, profile/history questions, and navigation.

Ollama/Gemini remain available for genuinely open-ended or low-confidence requests. Screenshot/vision support is intentionally left for the later API phase.

## Local account intelligence

When Ask NICH is open, the browser loads a bounded snapshot of the same CSBT data already used by the site:

- saved Inventory (or guest inventory from local storage)
- Wishlist
- Exchange preferences
- open CSBT Exchange listings
- recent trade history
- relevant value-history snapshots
- recent Exchange WANT/accepted activity
- current `/api/demand` trend signals

The account snapshot stays in the browser for deterministic NICH features and is not sent to the AI API for these local routes.

## Inventory commands

Examples:

- `magkano inventory ko`
- `what's my inventory worth in Elve?`
- `show my top 5 items`
- `what do I own?`
- `do I have Turtle?`
- `how many Cows do I have?`
- `can my inventory afford Owl?`
- `how far am I from Frost Dragon?`

## Optimized offer builder

The old greedy selection path has been replaced by a bounded beam-search optimizer. It explores many combinations while remaining safe to run in the browser.

Examples and supported constraints include:

- `build me an offer for Owl`
- `make it cheaper`
- `competitive version`
- `high demand only`
- `without Turtle`
- `use my Cow`
- `pets only`
- `no pet wear`
- `no vehicles`
- `Normal only`
- `Neon only`
- `Mega only`
- `no Mega items`
- `max 4 items`
- `as few items as possible`
- `more smaller adds`
- `no duplicates` / `one of each`
- `max 2 copies`
- `items under 500`
- `items over 100`
- `protect my top 3`
- `don't use my wishlist`
- `S tier only`, `A tier or better`, etc.
- `no overpay` / `as close as possible`
- `reset constraints` / `use anything`

The target and important constraints persist in structured conversation memory for follow-ups.

## Wishlist planning

NICH can list the Wishlist, rank nearby targets, and test whether a practical optimized offer can actually be formed from the current inventory instead of looking only at total inventory value.

Examples:

- `what's on my wishlist?`
- `what should I get next?`
- `which wishlist target can I afford?`
- `what's my closest target?`

## Exchange intelligence

NICH can rank open Exchange listings against Inventory + Wishlist + saved Exchange preferences and send the user to Exchange to act on a match.

Examples:

- `find Exchange trades I can afford`
- `show my best matches`
- `who has Owl?`
- `find listings for Frost Dragon`

The Exchange match percentage is the site's existing listing-match system. It is not the skipped multi-score trade grading feature.

## Demand and liquidity intelligence

NICH can combine available evidence from:

- item demand tier when CSBT has one
- real Exchange WANT quantities from the last 24 hours
- accepted Exchange item quantities from the last 7 days
- the existing demand/value-update trend feed

It uses these signals qualitatively for demand/liquidity advice and trade explanations. No new 0-100 Value/Demand/Liquidity/Overall trade score was added.

Examples:

- `is Owl high demand?`
- `is Frost easy to retrade?`
- `what's hot right now?`
- `what in my inventory has the strongest demand?`
- `Frost vs Owl + Turtle, should I accept demand-wise?`

## Upgrade / downgrade awareness

Every deterministic W/F/L can identify whether the user is moving from more items into fewer items (upgrade), fewer into more (downgrade), or a similar-count sidegrade. Demand-aware questions can add a qualitative liquidity check and a suggested downgrade cushion.

## Counteroffer intelligence

After a trade, NICH can search combinations of removals from the user's side or build a compact add from the remaining saved inventory.

Examples:

- `fix this trade`
- `make it fair`
- `what should I remove?`
- `what should I add?`
- `what add makes it fair?`
- `paano gawing fair?`

## Value-history intelligence

NICH can use CSBT's value-history snapshots for direct items and saved inventory.

Examples:

- `is Frost rising?`
- `how has Owl changed lately?`
- `biggest gainers in my inventory`
- `which of my pets dropped this month?`

## Trading profile / history

NICH can locally summarize saved Exchange preferences and recent saved trade history.

Examples:

- `show my trading preferences`
- `what kind of trader am I set up as?`
- `show my trade stats`
- `show my recent wins and losses`

## Expanded local language understanding

The deterministic parser now covers substantially more:

- English, shorthand, casual grammar and common abbreviations
- Taglish/Tagalog trading phrasing
- value/price synonyms (`hm`, `val`, `presyo`, `halaga`, etc.)
- comparison/deal phrasing (`worth it`, `sulit ba`, `take or pass`, etc.)
- trade-side wording (`offer ko`, `bigay niya`, `makukuha ko`, etc.)
- follow-ups (`what abt`, `paano kung`, `tapos`, `same lang`, etc.)
- add/remove/swap wording (`dagdag`, `bawas`, `alisin`, `palitan`, etc.)
- inventory, wishlist, Exchange, demand, history, profile and counteroffer synonyms
- persistent offer constraints and target memory
- existing fuzzy item aliases/misspellings remain available through the item matcher

## Explicitly NOT added

Per request, the proposed multi-score trade grading system was not implemented. There is no new output such as:

- Value Score: x/100
- Demand Score: x/100
- Liquidity Score: x/100
- Upgrade Quality: x/100
- Tradeability: x/100
- Overall NICH Score: x/100

NICH still uses the authoritative W/F/L plus qualitative demand/upgrade/downgrade reasoning.

## Validation

A deterministic smoke test is included at `scripts/test-nich-local-max.ts` and can be run after dependencies are installed:

```bash
npm run test:nich-local
```

It covers existing lookup/nearby/WFL behavior plus Inventory, constrained offer building, goal-memory follow-ups, Wishlist, Exchange, demand signals, value history, profile preferences, demand-aware W/F/L and counteroffer correction. It also asserts that the skipped #5 multi-score output is absent.

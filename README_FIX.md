# NICH Smart Vision v34 — recognition recovery patch

This patch fixes the regression where NICH detected trade slots/badges but turned most or all identities into `Unknown pet`.

## Main changes

- Keeps screenshot upload question-first; no automatic W/F/L answer.
- Lets the vision model provide useful *tentative* identity hypotheses instead of forcing description-only output.
- Every model name is still catalog-constrained: invented names never become canonical CSBT items.
- Tolerant Adopt Me catalog matching now handles merged/split words, community shorthand, and small OCR/typing slips.
  - `uni horn` / `unihorn` -> `Unicorn Horn`
  - `raincloud rat` / `raincloudhat` -> `Rain Cloud Hat`
- Medium-confidence real catalog matches remain visible as `Needs confirmation` instead of being erased into `Unknown pet`.
- Gemini and Cloudflare slot responses normalize into one candidate schema; a weak Gemini identity pass can be supplemented by Workers AI.
- Slot crops use tighter padding and high-quality WebP/JPEG so tiny icons occupy more pixels without destroying N/F/R/M badges.
- Whole-image candidate hints are passed into the enlarged-crop pass as low-trust hypotheses.
- Trades with 4–9 unresolved slots can now trigger the zoom/crop rescue instead of being abandoned.
- A non-trivial one-sided trade detection is rechecked so a single small item on the opposite side is less likely to be missed.
- Bounding boxes are required in trade recovery so local geometry can deterministically restore LEFT=YOU / RIGHT=THEM.
- Vision cache/prompt version bumped to v34 so old all-Unknown results are not reused.

## Local checks performed here

- TypeScript syntax/transpile checks passed for all modified `.ts` / `.tsx` files.
- `node --check` passed for both modified `.mjs` verifier scripts.
- `node scripts/verify-vision-source.mjs` passed and reports v34.
- Catalog search was executed against the actual bundled index:
  - `uni horn` -> `Unicorn Horn`
  - `raincloud rat` -> `Rain Cloud Hat`
  - `fro` returns Frost/Frog catalog suggestions including Frost Dragon and Frost Fury.
- Catalog-constrained recognition was executed locally: shorthand resolves to real catalog items in `NEEDS_CONFIRMATION`, not fake names or blank Unknown cards.
- Geometry repair was executed on a mocked 4-left / 1-right trade and restored four `YOU` slots plus one `THEM` slot.

A full Next/OpenNext build could not be run in this sandbox because the uploaded project does not include `node_modules`. Run the commands below in your real repository.

## Apply

Extract this ZIP over the project root and overwrite matching files.

Then run:

```powershell
npm run verify:vision-source
npm test -- --test-name-pattern="vision|uni horn|raincloud|typeahead"
npm run build
```

If those pass:

```powershell
git add .
git commit -m "Fix Nich smart image recognition and tolerant catalog matching"
git push origin main
npm run deploy
```

After deployment, retest with the same screenshots. Old cached v33 results should not be reused because the recognition version was bumped.

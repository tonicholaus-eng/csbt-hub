# Elve Expanded Category Fetch

This build fixes the Elve refresh flow for the extra Adopt Me calculator categories.

## What changed

- `update:elve` still reads the server-rendered `initialPets` payload for Pets, Pet Wear, Eggs and Toys.
- It now also opens the Elve calculator category tabs for Vehicles, Food, Gifts, Strollers and Stickers.
- Fetch/XHR/Next.js responses are inspected for item JSON and merged into `source-data/elve-shark-values.json`.
- The updater prints category counts so missing categories are visible immediately.
- If one of the required expanded categories is not captured, the refresh fails instead of silently publishing an incomplete database.
- `sync:master` copies the newly fetched Elve records into the matching Excel sheets while preserving your GCash cells.
- `refresh:values` now includes `sync:master` before data generation.
- `refresh:deploy` runs the complete refresh, commits, and pushes to `main`.
- `alerts:values` no longer forces an immediate process exit when there are no watches, which avoids the Windows libuv shutdown assertion seen after a successful refresh.

## Commands

Refresh locally:

```bash
npm run refresh:values
```

Refresh and publish:

```bash
npm run refresh:deploy
```

## Expected output

The updater should print an `Elve category counts:` block containing at least:

- PET
- PETWEAR
- EGG
- TOY
- VEHICLE
- FOOD
- GIFT
- STROLLER
- STICKER

`OTHER` is optional because Elve may not expose a separate Other tab.

If expanded capture fails, inspect the local file:

`source-data/elve-fetch-diagnostics.json`

That file is ignored by Git and is only meant for troubleshooting.

## GCash values

The Elve fetch supplies Elve/Shark values only. Existing GCash values in the workbook are preserved. New GCash values need to come from the CSBT GCash market list/source and are not inferred from Elve values.

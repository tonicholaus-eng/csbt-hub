# CSBT HUB — MM2 Phase 1

Phase 1 adds a separate MM2 area without mixing MM2 items into the Adopt Me database.

## Included

- `/mm2` route and MM2 visual theme
- MM2-specific desktop/mobile navigation
- Game switcher now routes between Adopt Me and MM2
- `source-data/mm2-trading-data.xlsx` master database
- `source-data/mm2-source-values.json` source snapshot layer
- MM2 source-to-master sync script
- MM2 JSON generator and validator

## MM2 data flow

Future MM2 website fetcher → `source-data/mm2-source-values.json` → `source-data/mm2-trading-data.xlsx` → `src/data/mm2Items.json`

The **CSBT VALUE** column is a manual override. Automated source sync only updates source fields, so your own CSBT value is not overwritten.

## Commands

- `npm run generate:mm2` — generate site JSON from the MM2 Excel master
- `npm run sync:mm2-master` — sync the current MM2 source snapshot into the master workbook
- `npm run data:validate:mm2` — validate generated MM2 data
- `npm run refresh:mm2` — sync → generate → validate

The live website fetcher is intentionally not connected yet because the MM2 source website URL/structure has not been provided. Once supplied, the fetcher can plug into the snapshot layer without changing the master database or UI architecture.

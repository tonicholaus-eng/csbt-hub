# CSBT Value Systems

CSBT HUB stores two independent Adopt Me value systems. They are never added together, averaged, or converted into each other.

## 1. GCash Value

GCash values are maintained in `source-data/trading-data.xlsx`.

For Pets, the workbook stores:

- GCash Regular Value
- GCash Neon Value
- GCash Mega Value

For Pet Wear, only the Regular value is used.

### Range rule

When a value is written as a range, CSBT records the lowest number:

- `7-9` becomes `7`
- `100–120` becomes `100`
- `5 to 10` becomes `5`
- `1400+` becomes `1400`

Invalid text is stored as unavailable instead of becoming zero. This rule is applied by `scripts/generate-trading-items.js` and is also reflected in the upgraded master workbook.

## 2. Elve Shark Value

Elve Shark values are stored in `source-data/elve-shark-values.json` with separate Regular, Neon, and Mega fields.

The website reads from the local snapshot rather than contacting Elve for every visitor. This keeps CSBT available when Elve is slow, unavailable, or changes its page.

The local snapshot records:

- Source URL
- Value system (`Shark`)
- Source version when available
- Fetch timestamp
- Record count
- Regular, Neon, and Mega values

`source-data/elve-shark-values.backup.json` is the last-known-good backup.

## Data generation

Run:

```bash
npm run generate:data
npm run data:validate
```

The generator combines:

```text
source-data/trading-data.xlsx        GCash master values
source-data/elve-shark-values.json   Elve Shark snapshot
                 ↓
src/data/tradingItems.json           Website database
src/data/valueSources.json           Source metadata
```

Generated records contain explicit fields:

```ts
{
  GCASH_NORMAL,
  GCASH_NEON,
  GCASH_MEGA,
  ELVE_NORMAL,
  ELVE_NEON,
  ELVE_MEGA
}
```

The legacy fields `NORMAL`, `NEON`, and `MEGA` remain as GCash aliases so older components do not silently change meaning. `INGAME_VALUE` remains an Elve Regular alias for backward compatibility.

## Manual Elve refresh

Run:

```bash
npm run update:elve
npm run generate:data
npm run data:validate
```

Or run the complete sequence:

```bash
npm run refresh:values
```

The updater:

1. Fetches the calculator page configured in `scripts/lib/elve-shark.js`.
2. Extracts Shark `rvalue`, `nvalue`, and `mvalue` records.
3. Validates record count and required high-tier pets.
4. Rejects suspiciously incomplete updates.
5. Writes the new snapshot only when values actually changed.
6. Preserves the last-known-good snapshot when an update fails.

This is a page-data extractor, not an official public API. If Elve changes its page structure, the updater may need maintenance. A failed refresh exits with an error and does not erase the existing valid values.

## Automatic daily refresh

The workflow `.github/workflows/update-elve-shark-values.yml` runs every day and can also be started manually from GitHub Actions.

For automation to work:

1. Push this project to GitHub.
2. Enable GitHub Actions for the repository.
3. Allow the workflow to write repository contents.
4. Keep the repository connected to the deployment provider, such as Vercel, if automatic redeployment is desired.

When values change, the workflow commits the new snapshot and regenerated website data. When values are unchanged, it creates no commit.

## Website behavior

The Values details page and Trade Calculator include a value-source selector:

```text
GCash Values | Elve Shark Values
```

The selected source applies to every item on both sides of a trade. Missing variants display as unavailable and are not treated as zero.

NICH follows the same rules:

- GCash is the default.
- “Using Elve,” “Elve Shark values,” or “in-game value” selects Elve Shark.
- The pet named `Shark` does not select the Elve source by itself.
- Follow-ups such as “What about Elve?” reuse the recent pet or trade.
- NICH always identifies the source used.

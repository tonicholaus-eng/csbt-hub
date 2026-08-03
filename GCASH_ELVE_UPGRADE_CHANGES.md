# GCash + Elve Shark Upgrade

## Completed

- Upgraded the master workbook with six distinct value columns.
- Converted value ranges to their lowest valid number.
- Preserved invalid values as unavailable rather than zero.
- Added Elve Shark Regular, Neon, and Mega snapshot data.
- Added a validated Elve page-data updater with last-known-good backup protection.
- Added a daily GitHub Actions workflow.
- Added source-aware data generation and validation.
- Added GCash/Elve selectors to pet details and the trade calculator.
- Updated search results and popular-pet cards to show both Regular values.
- Updated NICH lookups, nearby searches, comparisons, conversation memory, and source detection.
- Standardized calculator and NICH fairness to a 5% difference threshold.
- Preserved backward-compatible data fields to avoid breaking existing pages.

## Master workbook columns

```text
PET NAME
PET IMAGE
GCASH REGULAR VALUE
GCASH NEON VALUE
GCASH MEGA VALUE
ELVE SHARK REGULAR VALUE
ELVE SHARK NEON VALUE
ELVE SHARK MEGA VALUE
```

Pet Wear uses the same structure, but Neon and Mega remain unavailable.

## Safety behavior

- GCash and Elve Shark values are never mixed in one calculation.
- Missing values remain `null`/`N/A`, not zero.
- An Elve refresh with suspiciously missing data is rejected.
- A failed refresh leaves the previous working snapshot untouched.
- No live visitor request depends directly on Elve.

## Verification performed

- Generated database contains 1,703 unique items.
- Data validation passes.
- NICH routing/value-source tests pass.
- TypeScript/TSX syntax transpilation passes for the project source.
- Elve parser was tested against the previous captured Elve page data.

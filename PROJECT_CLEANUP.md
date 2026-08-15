# CSBT HUB Project Cleanup Guide

This separates files that are safe to remove from files that are active inputs or useful setup documentation.

## Safe to delete now

These are historical patch/design notes, duplicate instructions, generated build metadata, or an old nested project archive. No active source/import/package reference depends on them.

- `birthday.zip` — old nested project archive (~7.8 MB); the live birthday feature already exists in the actual source tree.
- `tsconfig.tsbuildinfo` — generated TypeScript build cache; recreated automatically.
- `README.txt`
- `README_FIX.txt`
- `README_HOTFIX.txt`
- `BIRTHDAY_EVENT_AVI_2026.md`
- `CATEGORY_FIX.md`
- `CHANGES.md`
- `CSBT_CLASSIC_HERO_ORANGE_RESTORE.md`
- `CSBT_CONTRAST_SPACING_THEME_REFINEMENT.md`
- `CSBT_EXCHANGE_QA.md`
- `CSBT_SPACIOUS_APP_LAYOUT_REPORT.md`
- `CSBT_THEME_SYSTEM_REPORT.md`
- `CSBT_UIUX_REFINEMENT_REPORT.md`
- `ELVE_EXPANDED_FETCH.md`
- `FEATURE_UPGRADE.md`
- `FINAL_QA.md`
- `FOUNDATION_REVISION_NOTES.md`
- `GAME_TOUR_UPGRADE.md`
- `GEMINI_36_INTEGRATION_NOTES.md`
- `GEMINI_36_VISION_FIX_2.md`
- `HOMEPAGE_UX_REVISION.md`
- `HOTFIX_2026-08-13.md`
- `NICH_DETECTION_ACCURACY_UPGRADE.md`
- `NICH_GEMINI_36_SETUP.md`
- `NICH_GEMINI_36_VISION_FIX.md`
- `NICH_LOCAL_CREDIT_SAVER_UPGRADE.md`
- `NICH_LOCAL_MAX_UPGRADE.md`
- `NICH_MAJOR_LANGUAGE_UNDERSTANDING_UPGRADE.md`
- `NICH_SMART_WORKSPACE_REDESIGN.md`
- `NICH_WFL_SHORT_VISION_SPECIFICITY_FIX.md`
- `REVISION_NOTES.md`
- `SIDEBAR_LOUNGE_UPGRADE.md`

The setup helpers below are also optional once your environment is already configured:

- `SETUP_FREE_AI.bat`
- `setup-free-ai.sh`

## Optional: archive outside the repository

These are generated backups/diagnostics. The refresh scripts can recreate them, so they are not required for the deployed website, but keeping the most recent copy outside Git can be useful for rollback/debugging.

- `source-data/elve-shark-values.backup.json`
- `source-data/trading-data.pre-elve-sync.backup.xlsx`
- `source-data/elve-fetch-diagnostics.json`
- `source-data/trading-data-validation.json`

## Keep

Do not delete these active project/input files:

- `README.md`
- `.env.example`
- `ENV_SETUP.txt`
- `package.json`
- `package-lock.json`
- `next.config.ts`
- `tsconfig.json`
- `eslint.config.mjs`
- `postcss.config.mjs`
- `src/`
- `public/`
- `scripts/`
- `tests/`
- `source-data/trading-data.xlsx` — master value workbook
- `source-data/elve-shark-values.json` — active Elve source snapshot
- `CSBT_EXCHANGE.md` — referenced by `README.md`
- `EXCHANGE_SETUP.md` — referenced by `README.md`
- `FOUNDATION_SETUP.md` — referenced by `README.md`

## Environment file rule

Keep `.env.local` **private and local only**. It should never be included in a ZIP sent to another person, committed to Git, or uploaded as a public project file. This project already ignores `.env*` except `.env.example` in `.gitignore`.

The optimized ZIP prepared from this pass intentionally excludes `.env.local` and generated `tsconfig.tsbuildinfo`.

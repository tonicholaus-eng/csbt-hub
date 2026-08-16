# CSBT HUB Supabase migrations

This folder is the canonical ordered database setup for CSBT HUB going forward.

## Fresh database

Apply migrations in filename order starting with `20260816_000_legacy_foundation.sql`. The `000` file is the idempotent consolidated baseline inherited from the existing project; later files are forward changes.

## Existing production database

**Do not replay the legacy baseline on production just because it appears here.** Existing deployments that already have the foundation/community/exchange schema should apply only the forward migrations that have not yet been deployed.

The migrations added on August 16, 2026 are intentionally non-destructive. They add public-profile projection/privacy boundaries, durable server-side quota state, channel count helpers, feedback throttling, and telemetry cleanup helpers without dropping user-owned data.

Deployment remains a manual Supabase action unless your deployment pipeline already applies `supabase/migrations`.

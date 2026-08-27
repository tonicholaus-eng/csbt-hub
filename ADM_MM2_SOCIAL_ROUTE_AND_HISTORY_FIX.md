# ADM/MM2 Social Route + Legacy History Fix

- `/exchange`, `/trade-opinions`, and `/lounge` are now permanently Adopt Me scoped.
- `/mm2/exchange`, `/mm2/trade-opinions`, and `/mm2/lounge` are permanently MM2 scoped.
- Game selector UI is removed from the fixed routes.
- Existing single-game rows are treated as `adopt-me` when the live Supabase schema does not yet expose `game_id`.
- Adopt Me reads/posts/listing creation have legacy-schema fallbacks so old content does not disappear while the multi-game migration is pending.
- MM2 remains strict: MM2 community writes require the multi-game migration.
- Added `20260826000200_preserve_adoptme_social_history.sql`, a non-destructive backfill that marks pre-multigame rows as Adopt Me.
- The multi-game migrations contain no delete/truncate operation for Lounge posts, Trade Opinions, or Exchange listings.

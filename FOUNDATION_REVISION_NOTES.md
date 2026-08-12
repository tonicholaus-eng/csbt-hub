# CSBT HUB Foundation Revision — August 12, 2026

## Mobile and performance
- Replaced the long mobile accordion navigation with a persistent bottom dock: Home, Values, Calculator, Demand, More.
- Added a compact mobile top bar with Profile and Notifications shortcuts.
- Added a bottom-sheet style More menu for community/tools/account destinations.
- Reduced Framer Motion behavior on phone-sized screens through a shared `MotionConfig`.
- Reduced expensive backdrop blur on mobile.
- Added reduced-motion accessibility CSS.
- Removed the fixed mobile calculator result that competed with navigation and replaced it with an in-flow compact result.
- Moved the floating Nich button above the mobile dock and below the open Nich chat layer.

## Layout / bug fixes
- Fixed desktop sidebar overlap on Values, Calculator, Demand, Nich, and About by reserving sidebar space consistently.
- Fixed the Nich layering issue where the floating assistant button could sit above the open chat controls.

## Homepage
- Removed Popular Pets from the homepage completely.
- Removed the unused Popular Pets component and generated homepage-popular-items output.

## Values
- Added category browsing for Pets, Pet Wear, Eggs, and Toys.
- Added category item counts and database/source update labels.
- Added 7D / 30D value-history display with a real-data-only empty state.
- Added a “watch 10%+ changes” control for signed-in members.
- Added schema support for optional rarity, demand-tier, and explicit No Pot / R / F / FR values when the source workbook eventually supplies them. Existing default values are not falsely re-labelled as potion-specific values.

## Accounts and profiles
- Centralized the browser Supabase client/session hook so account-aware features share the same session.
- Added `/profile`.
- Added display name, avatar, country/market, short bio, and unverified Roblox username fields.
- Added password reset email support and logged-in password change support.
- Added future-safe `roblox_user_id` storage separate from the visible username.

## Notifications
- Added `/notifications` with unread/read state, mark-all-read, and preference controls.
- Added notification preference categories for values, trades, community, and CSBT updates.
- Added realtime unread-count badges in desktop/mobile navigation.
- Browser users cannot insert arbitrary notifications; notification creation is reserved for trusted server/service-role code and database triggers.

## Value history and alerts
- Added `value_history` Supabase table and public read-only history API.
- Added `npm run snapshot:values`.
- Extended `npm run refresh:values` to store a snapshot and process alerts.
- Added `value_watchlist` with a default 10% threshold.
- Added server-side alert processing with dedupe keys so the same snapshot does not notify repeatedly.

## Trade history/status
- Added “Save this trade” to the existing calculator for signed-in users.
- Added `/trades` with Draft, Pending, Completed, and Cancelled states.
- Saved trades retain the selected value source, both sides, variant, saved values, totals, and W/F/L result.
- Trade history is protected by Supabase RLS so members only manage their own records.

## Security foundation
- Added RLS policies for profiles, preferences, notifications, watchlists, value history, and trade history.
- Added avatar storage policies.
- Added a database-level community posting rate limit.
- Added security response headers: nosniff, frame denial, strict referrer policy, and disabled camera/microphone/geolocation permissions.
- Added service-role separation for trusted value snapshot/alert jobs.

## Activation required
Run `src/lib/supabase/foundation.sql` once in the existing Supabase project and add `SUPABASE_SECRET_KEY` privately to local/Vercel environments. See `FOUNDATION_SETUP.md`.

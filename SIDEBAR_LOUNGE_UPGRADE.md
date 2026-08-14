# CSBT Sidebar + Lounge Upgrade

## What changed

### Navigation
- Reorganized desktop sidebar into: Start Here, Trade, Market, Lounge, Help & Safety, My CSBT.
- Renamed `Exchange` in navigation to **Trade Finder** while keeping **CSBT Exchange** as the product/page name.
- Renamed `Community` to **CSBT Lounge**.
- Renamed `Trade Voting` to **Trade Opinions**.
- Added selective SMART/LIVE badges.
- Desktop groups are collapsible and remember their open/closed state in localStorage.
- Mobile More menu uses the same categories and clearer descriptions.
- Guided onboarding copy/targets were updated for Trade Finder and Trade Opinions.

### CSBT Lounge
- New Discord-style three-panel desktop layout.
- Channel system: #general, #announcements, trading rooms, value rooms, and media rooms.
- Existing community posts are preserved and default to #general after migration.
- Compact chat-message presentation instead of oversized post cards.
- Emoji + CSBT reactions: 👍 😂 🔥 😭 🤝 W F L.
- Reply threads in a dedicated thread drawer.
- Supabase Realtime presence for online/channel activity.
- Mobile channel drawer and horizontal quick-channel switcher.
- Sticky bottom composer with image upload and shortcuts to Trade Finder, Calculator, and Values.
- Right activity rail with online stats, trending rooms, quick actions, recent activity, and profile shortcut.
- #announcements is staff-only for posting; everyone can read.

## Required Supabase migration

The UI compiles without changing Supabase, but the new channels/reactions/threads require one database migration.

Open:

`src/lib/supabase/community-lounge.sql`

Then in Supabase:

1. SQL Editor
2. New Query
3. Paste the entire file
4. Run

It is idempotent and preserves existing community posts.

For fresh installations, `src/lib/supabase/community-feed.sql` was also updated to include the Lounge schema.

## Validation performed
- 115 TS/TSX files parsed: 0 syntax errors.
- 295 relative imports checked: 0 broken imports.
- Existing package files were not changed.
- `npm ci --offline` could not complete because `zod-validation-error@4.0.2` was not present in the container npm cache, so a real Next production build must be run on the user's machine.

Run locally:

```powershell
npm run build
```

Then:

```powershell
npm run dev
```

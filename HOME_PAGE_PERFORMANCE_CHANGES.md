# CSBT Home Page Performance Upgrade

## Main improvements

- Converted `src/app/page.tsx` from a client-rendered Framer Motion page into a server component.
- Removed the 656 KB `tradingItems.json` import from the initial home-page client bundle.
- Added `src/data/tradingMeta.json` for the small item-count payload used by the hero and stats.
- Added `src/data/homePopularItems.json` so Popular Values loads only eight records instead of the full database.
- Added `HomeDeferredSections.tsx` to load below-the-fold sections only when the visitor scrolls near them.
- Rebuilt Hero, Quick Actions, Popular Values, Meet Nich, and Stats with lighter CSS transitions and fewer GPU-heavy blur/animation effects.
- Delayed the global Nich assistant until the browser is idle.
- Delayed the large Nich chat component until the chat is opened for the first time.
- Added CSS paint/layout containment and `content-visibility` helpers.
- Updated `generate-trading-items.js` so the lightweight home metadata and popular-item files stay synchronized after value refreshes.

## Preserved features

- GCash and Elve Shark values
- Popular pet cards and value links
- Dark mode
- Responsive layout
- Navbar and theme switcher
- Floating Nich button and intro
- Existing calculator behavior

## Expected effect

The first screen now loads the hero and navigation first. Quick Actions and Popular Values are requested near the viewport, while Meet Nich and Stats wait until the visitor scrolls closer. The full trading database is no longer downloaded merely to display the home-page item count and eight popular cards.

## Validation performed

- All generated JSON files parsed successfully.
- The value generator passed JavaScript syntax validation.
- TypeScript parsing found no syntax errors in the changed TSX files.
- A full Next.js build could not be run in the working environment because the internal package registry did not contain one transitive dependency.

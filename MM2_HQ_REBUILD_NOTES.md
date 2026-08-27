# CSBT HUB MM2 HQ — Proper Rebuild

This revision replaces the failed vertically stacked homepage with a single-screen MM2 headquarters composition.

## Homepage composition

- Persistent MM2 sidebar on desktop
- Weapon Vault spanning the left side
- Collector Inventory terminal in the upper center
- Trading Floor in the lower center
- Market Radar on the upper right
- Nich AI Desk on the lower right
- HQ system monitors across the bottom
- No centered hero and no normal vertical section stack on desktop

## Data and functionality

- Homepage reads the real `mm2Items.json` and `mm2Meta.json` data
- Featured weapon uses Black Luger when available
- Search submits into `/mm2/values`
- Quick-access items and market rows link to the MM2 value browser
- Market Radar uses real demand/value data rather than invented percentage movements
- Trade tools link to existing calculator, exchange, trades, wishlist and inventory routes

## Visual asset integration

The existing generated MM2 artwork is composited into the environment rather than used as a single oversized background:

- `neon-armory-market-showcase.png`
- `crimson-skins-trading-desk.png`
- `neon-karambit-smoke-emblem.png`
- `neon-market-revolver-accent.png`

## Other changes

- Rebuilt `MM2Navbar` to match the HQ sidebar hierarchy
- Aligned `/mm2/values` with the new 230px sidebar
- Disabled the duplicate floating Nich launcher on `/mm2` because the homepage now has a dedicated Nich AI Desk
- Added responsive fallbacks for tablet/mobile and reduced-motion support

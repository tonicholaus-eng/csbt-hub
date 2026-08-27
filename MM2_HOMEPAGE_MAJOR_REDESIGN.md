# MM2 Homepage Major Redesign

## Scope
This pass rebuilds the MM2 homepage around the approved futuristic weapon-vault inspiration while keeping Adopt Me as the structural product reference.

## Homepage direction
- Overview-first landing page rather than a dense market dashboard.
- Cinematic MM2 Trading Headquarters hero.
- Weapon Vault visual built from existing `/public/themes/mm2` PNG assets.
- Four primary feature gateways: Weapon Values, Trade Calculator, CSBT Exchange, Trade Opinions.
- Demand Intelligence is treated as part of the Values flow instead of another top-level sidebar item.
- CSBT Lounge remains a core MM2 community route and is introduced in the overview copy/sidebar.
- Compact real-data platform strip using `mm2Meta.json`.

## Data integrity
The redesign does not fabricate live users, trends, value providers, or weapon counts. It uses the connected MM2 metadata for tracked weapon count, category count, and source name.

## Files changed
- `src/components/mm2/MM2HQHome.tsx`
- `src/components/mm2/MM2HQHome.module.css`
- `src/components/mm2/MM2Navbar.tsx`

## Existing artwork used
- `/public/themes/mm2/neon-armory-market-showcase.png`
- `/public/themes/mm2/neon-karambit-smoke-emblem.png`
- `/public/themes/mm2/neon-market-revolver-accent.png`
- `/public/themes/mm2/crimson-skins-trading-desk.png`

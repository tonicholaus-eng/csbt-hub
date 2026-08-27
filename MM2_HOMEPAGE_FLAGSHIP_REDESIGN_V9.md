# CSBT HUB MM2 — Flagship Homepage Redesign V9

This is a **new visual generation**, not another refinement of the previous hero-left / vault-right / four-equal-cards composition.

## Product preserved
The redesign keeps the existing MM2 product and routes intact:
- `/mm2`
- `/mm2/values`
- `/mm2/demand`
- `/mm2/calculator`
- `/mm2/exchange`
- `/mm2/trade-opinions`
- `/mm2/lounge`
- ADM/MM2 switching
- MM2 data and existing shared systems

## Project/asset scan
Reused the strongest MM2-specific assets already present in `/public/themes/mm2`:
- `neon-armory-market-showcase.png`
- `neon-karambit-smoke-emblem.png`
- `crimson-skins-trading-desk.png`
- `neon-market-revolver-accent.png`

Verified truthful MM2 database facts used by the homepage:
- 1,099 weapons
- 14 categories
- 910 demand-rated weapons
- Supreme Values as the active value source
- Black Luger as the highest recorded Supreme-value item in the current dataset: 1,000,000 with demand 10/10

## New flagship composition

### Facility header
CSBT HUB branding is now treated as integrated command-center signage instead of an oversized landing-page headline.

### Flagship command deck
The old left-copy / right-vault split is replaced with:
- a dominant Weapon Vault installation
- a dedicated trading-console module
- real MM2 market intelligence and real database telemetry

### Weapon Vault
The existing vault artwork remains the primary asset, but is staged inside a larger architectural display chamber with:
- rear wall construction
- upper beam
- side structural frames
- base platform
- contact lighting
- physical floor grounding

### Trading console
The introductory product copy, primary actions, real top-weapon signal, and database facts are consolidated into a purpose-built trading console.

### Asymmetric operations deck
The four-equal-card pattern has been removed.
The five MM2 product pillars now use an asymmetric operational-station layout:
- Weapon Values — flagship station
- Trade Calculator — supporting station
- CSBT Exchange — supporting station
- Trade Opinions — supporting station
- CSBT Lounge — community station

### System telemetry rail
The old stats strip was reworked into a restrained system rail using only real data.

## Sidebar redesign
The MM2 sidebar keeps the same destinations and 288px footprint, but now reads more like a facility command rail:
- integrated CSBT/MM2 identity
- grouped trading/community operations
- clearer active-route illumination
- consistent line iconography
- stronger MM2 mode switcher treatment

ADM styling and routes are not intentionally modified by the homepage redesign.

## Files redesigned
- `src/components/mm2/MM2HQHome.tsx`
- `src/components/mm2/MM2HQHome.module.css`
- `src/components/mm2/MM2Navbar.tsx`

The existing MM2-scoped sidebar environment rules in `src/app/globals.css` remain available from the previous project base.

## QA performed
- 226 TS/TSX files passed TypeScript syntax transpilation
- 226 TS/TSX files passed internal relative-import validation
- `MM2HQHome.module.css` brace validation passed
- `globals.css` brace validation passed
- MM2 data verification passed: 1,099 items / 14 categories / 910 demand-rated / Black Luger 1,000,000 & 10/10

A full `next build` could not run because this exported project does not contain installed `node_modules` (`next: not found`).

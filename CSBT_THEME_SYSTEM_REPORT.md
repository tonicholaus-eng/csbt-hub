# CSBT HUB Three-Theme System Report

## Summary
Implemented a reusable, user-selectable three-theme appearance system on top of the current CSBT HUB project without changing routes, data, Supabase logic, marketplace behavior, inventory logic, Nich logic, or responsive navigation structure.

## Themes
1. **CSBT Dark — Original CSBT Experience**
   - Default theme.
   - Deep navy environment with CSBT gold.
   - Homepage hero intentionally restores the previous bright amber/yellow/orange energy while keeping the newer refined content layout.
2. **CSBT Halloween — Spooky Seasonal Trading**
   - Near-black/dark-violet environment.
   - Pumpkin-orange selected states with purple atmosphere.
   - Nich remains purple; W/F/L semantic colors remain unchanged.
3. **CSBT Light — Roblox-Inspired**
   - Cool white/light-gray environment.
   - Gaming blue interactions, pastel atmosphere and preserved CSBT gold branding.
   - No Roblox logos or copied Roblox UI assets.

## Theme architecture
- Central theme configuration: `src/lib/theme.ts`
- Runtime provider/hook: `src/components/ThemeProvider.tsx`
- Theme key: `csbt-theme`
- Allowed values: `dark`, `halloween`, `light`
- Default: `dark`
- Theme changes update `data-theme` on `<html>` and keep `.dark` active for both Dark and Halloween so existing Tailwind dark-mode styling remains compatible.
- No full page reload or React-tree remount is used.

## Initial-load / flash prevention
- `src/app/layout.tsx` now includes a tiny pre-hydration script that reads `csbt-theme` and applies the matching `data-theme`, `.dark` class, and `color-scheme` before the app body renders.
- The CSS default is Dark, so first-time users also receive the correct default immediately.
- Theme-transition behavior is only enabled after a manual runtime theme application, avoiding a forced animated initial load.

## Appearance selector
- New reusable selector: `src/components/theme/AppearanceSelector.tsx`
- Shows all three themes directly instead of cycling themes.
- Each option includes:
  - icon
  - official theme name
  - subtitle
  - three-swatch preview
  - selected check state
- Desktop entry point: bottom of the main sidebar under **Appearance**.
- Mobile entry point: **More → Appearance**.
- Rows are touch-friendly and the selector is modal/viewport-safe.

## Semantic design tokens
Expanded `src/app/globals.css` with purpose-based variables covering:
- app backgrounds
- layered surfaces
- foreground/muted text
- borders
- brand colors
- navigation states
- inputs/focus
- primary/secondary buttons
- shadows/glows
- scrollbar/selection
- decoration colors
- complete per-theme ambient page backgrounds

Existing semantic colors remain semantically stable:
- Win/success: green
- Loss/error: red/rose
- Fair: neutral
- Nich: purple
- Smart Match: cyan/blue
- CSBT premium: gold

## Homepage hero
`src/components/Hero.tsx` keeps the refined two-column information architecture but now exposes theme-specific presentation hooks.

### Dark
- Restored the lively old-hero energy with a strong amber → yellow → bright orange gradient.
- White/cream headline and copy.
- White primary CTA, translucent dark secondary CTA and purple Nich CTA.
- Dark glass feature cards inside the bright hero preserve readability and premium contrast.

### Halloween
- Dedicated black/violet seasonal hero with orange center lighting and purple edge ambience.
- Not just a recolored Dark hero.

### Light
- Light-blue/white gaming hero with blue accent and soft gold lighting.

## Background sticker system
New component: `src/components/theme/ThemeDecorations.tsx`.

Properties:
- deterministic positions; no `Math.random()`
- inline SVG only; no image network requests
- `pointer-events: none`
- theme-specific motif sets
- contextual page motifs for Values, Inventory, Exchange, Demand, Calculator, Community and Nich
- reduced density on tablet/mobile
- only a few subtle elements animate
- reduced-motion disables sticker animation

Dark motifs include generic trade arrows, diamonds, paw prints, coins, charts and chat shapes.
Halloween adds bats, moon, ghost, pumpkin and spiderweb motifs.
Light adds clouds, hearts, game-controller geometry and brighter trading motifs.

## Navigation
`src/components/Navbar.tsx` now uses the CSBT theme provider rather than `next-themes` runtime switching.
- Sidebar Appearance control shows the currently selected theme.
- Mobile More includes Appearance.
- Mobile active nav state uses semantic theme variables.
- Existing navigation groups, routes, tour targeting and collapsed-group persistence remain intact.

## Community / Lounge
- Removed the page-level forced `#07111f` shell so the Community route can inherit the selected theme.
- Core Lounge shell/header/side rails now use CSBT semantic surfaces instead of fixed navy structural colors.
- Live/presence semantic indicators remain unchanged.

## Guided tour
`src/components/nich/NichIntroMascot.tsx` now uses theme-aware tutorial surface, target ring, pointer, progress and CTA styling.
- Dark: gold target treatment.
- Halloween: orange target treatment through brand variables.
- Light: blue target treatment through brand variables.
- Existing navigation-aware tour sequence and behavior remain unchanged.

## Buttons / forms
Converted several prominent hardcoded amber/orange primary actions to the new theme-aware `csbt-theme-primary` treatment while preserving their original actions and disabled behavior.

## Responsiveness
- Decoration count is reduced at <=1023px and again at <=639px.
- Stickers stay fixed to viewport percentages and cannot create page-level horizontal scrolling.
- Appearance selector works as bottom-sheet-like UI on small screens and centered modal on larger screens.
- Existing mobile dock safe-area architecture is unchanged.

## Accessibility
- Theme menu uses dialog semantics and direct theme buttons.
- Selected options expose `aria-pressed`.
- Existing focus-visible system now uses theme-specific ring tokens.
- Semantic status colors are preserved.
- Reduced-motion rules include theme stickers and existing UI motion.

## Performance
- CSS variables drive most theme changes.
- No page reload, data refetch, canvas, WebGL, background video or particle library.
- Decorative art is inline SVG and deterministic.
- No new state-management dependency.

## Files changed
- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/app/community/page.tsx`
- `src/components/ThemeProvider.tsx`
- `src/components/Navbar.tsx`
- `src/components/Hero.tsx`
- `src/components/nich/NichIntroMascot.tsx`
- `src/components/community/CSBTLounge.tsx`
- `src/components/account/AuthCard.tsx`
- `src/components/account/ProfileDashboard.tsx`
- `src/components/inventory/InventoryCalculator.tsx`
- `src/components/PetDetails.tsx`

## Files created
- `src/lib/theme.ts`
- `src/components/theme/AppearanceSelector.tsx`
- `src/components/theme/ThemeDecorations.tsx`
- `CSBT_THEME_SYSTEM_REPORT.md`

## Functionality intentionally preserved
- Supabase/authentication
- profiles and notifications
- GCash / Elve values
- inventory and wishlist
- value alerts/history
- Exchange listings/offers/counteroffers
- Smart Match and Trade Rooms
- Trade Calculator / W/F/L
- Demand
- Lounge/community logic
- Nich AI / Gemini Vision/local intelligence
- API routes
- mobile navigation and tour state

## Validation performed in this environment
- TypeScript/TSX syntax transpile over the full `src` tree: **PASS (122 files)**.
- CSS brace integrity: **PASS**.
- No remaining source import/use of `next-themes`.

## Build limitation
The uploaded ZIP does not include `node_modules`. An offline `npm install` could not complete because one package was not present in the sandbox npm cache, so a full Next.js production build could not be executed here. Run the normal tests and `npm run build` on the existing local project after replacing files.

## Recommended next visual improvement
After real-device review, fine-tune theme-specific contrast on any legacy component that still intentionally uses local Tailwind semantic colors. The foundation is centralized now, so these can be adjusted without redesigning the theme architecture.

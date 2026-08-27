# MM2 Homepage Major Visual Upgrade

## Scope
MM2-only visual refinement. Adopt Me mode was not redesigned.

## Major changes
- Rebuilt desktop proportions for a much larger, more cinematic headquarters layout.
- Increased MM2 sidebar width from 248px to 288px and updated every MM2 route offset to match.
- Enlarged branding, navigation rows, icons, active state, labels, and ADM/MM2 switcher.
- Reworked the hero title into a metallic crimson CSBT + silver HUB lockup.
- Increased hero CTA sizing and upgraded controls to game-interface styling.
- Rebuilt the introduction panel as a terminal-style module with a red illuminated rail.
- Replaced the detached hero-art treatment with a CSS-integrated Weapon Vault chamber using existing MM2 PNG assets.
- Added central revolver + flanking knife composition using existing public assets.
- Enlarged and strengthened all four overview cards while preserving their routes.
- Improved feature artwork crops, card hierarchy, hover response, and CTA motion.
- Strengthened the bottom platform strip using only truthful MM2 project data.
- Added restrained environmental depth: geometry, wall rails, floor grid, vignette, and controlled red/blue ambient light.
- Added reduced-motion handling for the ambient vault animation.
- Preserved responsive stacking behavior.

## Truthful homepage data
- Weapons tracked: 1,099
- Value source: Supreme Values
- Categories: 14
- Community tools: Exchange, Opinions, Lounge

## QA completed
- 42 MM2 TS/TSX files passed TypeScript syntax transpilation.
- MM2 route sidebar offsets checked for the new 288px sidebar.
- CSS brace balance passed.
- All CSS module classes referenced by MM2HQHome exist.
- Required MM2 public PNG assets verified present.
- `mm2Meta.json` matches `mm2Items.json` total count (1,099).

## Build note
A full `next build` was not run because this exported project does not contain installed `node_modules` in the working package. The source-level checks above passed.

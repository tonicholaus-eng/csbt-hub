# MM2 Homepage Spatial Depth & Environmental Material Pass — V7

Base used: **CSBT_MM2_HOMEPAGE_HEADQUARTERS_INTEGRATION_V6**

This pass preserves the approved homepage structure and changes only the environmental treatment, surface hierarchy, and lighting balance.

## What changed

### 1) Reduced broad crimson haze
- lowered the intensity of the wide red atmospheric wash
- concentrated the strongest red illumination around:
  - the Weapon Vault
  - the hero-to-vault transition zone
- preserved darker edge falloff and black negative space

### 2) Deeper architectural background
- made large wall divisions and recessed planes more visible at very low contrast
- reduced reliance on diagonal/graphic accent language
- strengthened dark structural framing and distant metallic surface cues
- kept the environment almost-black so foreground content stays dominant

### 3) Better spatial grounding
- refined floor/base-plane treatment below the hero, cards, and statistics strip
- softened the feeling that content floats on a flat red gradient
- increased the sense of the UI sitting inside a physical MM2 command room

### 4) Weapon Vault integration
- kept the current vault artwork size and composition unchanged
- deepened side shadow planes and edge continuation around the vault container
- improved the vault back wall, frame, floor, and lower glow so the vault feels embedded in the room
- reduced the feeling of isolated artwork inside a simple rectangle

### 5) MM2 introduction panel refinement
- made the surface richer and more charcoal-driven
- added deeper internal shadow structure and subtler edge illumination
- reduced the obvious flat-card appearance
- preserved the existing text and controls

### 6) Feature cards
- increased decorative artwork visibility slightly
- gave each card a more distinct internal composition through subtle per-card tinting and art placement
- preserved text readability and spacing
- ensured the four cards remain separate modules, not one continuous strip

### 7) Sidebar cohesion
- strengthened the subtle crimson reflection on the sidebar’s inner edge
- kept the sidebar dark while making it feel lit by the same environment as the homepage

### 8) Statistics strip
- improved surface separation and internal depth
- slightly strengthened icon visibility
- added restrained top-edge lighting while keeping the strip secondary to the hero

## Files changed
- `src/components/mm2/MM2HQHome.module.css`
- `src/app/globals.css`

## Structural guarantee
No routes, sections, layouts, component architecture, MM2/ADM switching, or homepage content blocks were added or redesigned in this pass.

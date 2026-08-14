# CSBT Classic Hero + Bright Orange Dark Theme Restore

## Source
Applied on top of the user-provided `neww(1).zip` project.

## What changed

### 1. Restored the actual classic homepage hero structure
`src/components/Hero.tsx` now uses the earlier CSBT hero composition again:
- centered large `CSBT HUB` heading
- database refresh badge
- original homepage description
- Check Values / Compare Trades / Demand Trends / Ask Nich feature chips
- Browse Values / Compare a Trade / Ask Nich CTAs
- four large stat cards

### 2. Restored the original interactive mouse-motion effect
The earlier Framer Motion behavior is restored:
- subtle 3D hero tilt follows mouse position
- spring-smoothed movement
- moving ambient glow
- independent top-right and bottom-left decorative circles for parallax depth
- resets naturally when the pointer leaves
- respects `prefers-reduced-motion`
- mouse-only hero tilt so touch/mobile remains stable

### 3. Dark theme is now orange-first
The Dark theme no longer uses yellow as its main interaction accent.
Main Dark theme accents are now vivid tangerine/orange:
- brand primary
- selected navigation
- primary buttons
- focus rings
- input focus
- scrollbar accents
- selection color
- background decoration accent
- glow accent

### 4. Classic Dark hero is brighter and livelier
The restored hero uses an orange-first gradient rather than the yellow-heavy version:
- bright orange/tangerine base
- warmer highlight near the top
- deeper orange toward the lower/right edge
- white typography
- translucent white chips/stat cards
- white primary CTA
- purple Nich CTA

### 5. Other themes remain distinct
The classic hero composition is shared across themes, while visual personality remains theme-specific:
- Halloween: dark violet/black + pumpkin orange + purple
- Light: bright blue/white gaming treatment

No application workflows, routes, data, Supabase, NICH, Exchange, inventory, W/F/L, or authentication logic were changed.

## Files changed
- `src/components/Hero.tsx`
- `src/app/globals.css`
- `src/lib/theme.ts`
- `CSBT_CLASSIC_HERO_ORANGE_RESTORE.md`

## Build note
The uploaded archive does not contain `node_modules`, so a full local Next.js production build could not be run in this container. The restored Hero is based directly on the earlier working Framer Motion Hero implementation from the user's prior project, with theme-aware class styling layered onto it.

On the user's PC run:

```powershell
npm run build
```

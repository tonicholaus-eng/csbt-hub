# CSBT HUB Game-Style Guided Tour Upgrade

## What changed

- Restored/preserved the original 3D mouse-follow Framer Motion hero.
- Replaced the old floating-character intro with a feature spotlight tour.
- Added a real cut-out dimming layer so the selected feature remains bright.
- Added a pulsing circular spotlight animation over the selected control.
- Added an animated arrow pointer that adapts to the highlighted feature's screen position.
- Restyled the tutorial panel as a game-like CSBT Guide HUD with progress bar and beveled controls.
- Added Back / Next / Start Tour / Start Exploring controls.
- Added keyboard navigation on desktop: left/right arrows and Escape.
- Added separate dismissal behavior:
  - Skip for now: hides the tour for the current browser session only.
  - Don't show again: stores a permanent preference in localStorage.
  - Completing the tour also marks the guide completed.
- The Nich button now remains visible during the tour so its final spotlight step works correctly.
- Helper bubbles and the Nich dismiss control are suppressed while the tour is active.
- Underlying highlighted controls are blocked from accidental clicks during the guide.

## Responsive tour

Desktop highlights:
- Sidebar
- Values
- Calculator
- Inventory
- Community Trade Voting
- Nich

Mobile highlights:
- Bottom navigation
- Values
- Calculator
- Inventory
- More
- Nich

## Testing the tour again

If you already completed or permanently dismissed the tour, run these in the browser console, then refresh:

```js
localStorage.removeItem("csbt-feature-tour-hidden");
sessionStorage.removeItem("csbt-feature-tour-skipped-for-session");
```

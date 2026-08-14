# CSBT HUB — Avi Birthday Event (2026)

## Central config
All reusable birthday identity/timing values live in:

`src/config/birthdayEvent.ts`

Current values:
- Name: Avi
- Birthday: August 15
- Birthday date: 2026-08-15
- Message: `HAPPY BIRTHDAY, FROM PINAKA POGING NICH CAST 😜`
- Event start: `2026-08-14T00:00:00+08:00`
- Event end: `2026-08-15T23:59:59+08:00`

The end timestamp is interpreted as the full final second, so the UI becomes inactive at `2026-08-16T00:00:00+08:00`.

## Added files
- `src/config/birthdayEvent.ts`
- `src/hooks/useBirthdayEventActive.ts`
- `src/components/birthday/BirthdayEventGateway.tsx`
- `src/components/birthday/BirthdayEventExperience.tsx`
- `src/components/birthday/BirthdayEventNotification.tsx`
- `src/components/birthday/BirthdayEventModal.tsx`
- `src/components/birthday/BirthdayGiftReveal.tsx`
- `src/components/birthday/BirthdayDecorations.tsx`
- `src/components/birthday/BirthdayIcons.tsx`
- `src/components/birthday/NichBirthdayInteraction.tsx`

## Modified files
- `src/app/layout.tsx` — mounts the birthday gateway globally.
- `src/app/globals.css` — birthday theme tokens, modal, decorations, responsive/reduced-motion styling.
- `src/components/Navbar.tsx` — temporary logo party hat and mobile Birthday Event access.
- `src/components/nich/assistant/NichButton.tsx` — temporary Nich party hat.
- `src/components/nich/assistant/NichChat.tsx` — temporary Nich party hat and desktop birthday scan shortcut.

## Behavior
- The birthday feature is active only inside the centralized Manila-time event window.
- A first-view event notification appears after roughly 1.45 seconds, but waits if the CSBT onboarding tour is open.
- Opening or dismissing the initial notification records a config-derived localStorage key so it does not auto-show again.
- A temporary Birthday Event button remains available while active.
- The main card shows Avi's One of One / Extremely High / Priceless / NFT stats and the exact personal message.
- Claim Birthday Gift plays a lightweight reveal and shows `My Favorite Person` 1/1.
- Nich has a separate temporary scan flow using the exact Avi/date/value messages.
- All decorations are deterministic SVG/CSS graphics; no random placement or heavy particle library is used.
- Mobile uses fewer background decorations and a bottom-sheet-style modal.
- Reduced-motion users get static/reduced animation behavior.
- No hidden-object scavenger hunt was added.
- No fake Birthday Trade was added.

## Validation in this environment
- 132 TypeScript/TSX source files syntax-transpiled with TypeScript: 0 syntax errors.
- Relative source import resolution check: 0 missing relative imports.
- CSS brace check: balanced.
- Time-window checks: active on Aug 14 late evening PHT and throughout Aug 15; inactive at Aug 16 00:00 PHT.
- Full `npm run build` could not be run in this container because the project dependencies are not installed and the offline npm cache is missing `zod-validation-error@4.0.2`.

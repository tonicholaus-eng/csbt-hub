# NICH Gemini 3.6 Vision Fix — 2026-08-14

This patch updates the screenshot vision route for the current Gemini 3.6 Flash API behavior.

## Changes
- Uses the current Gemini 3.6 structured-output REST shape: `generationConfig.responseFormat.text`.
- Keeps `gemini-3.6-flash` and `thinkingLevel=minimal`.
- Treats the common CSBT/Adopt Me two-grid layout as LEFT = YOU and RIGHT = THEM unless labels explicitly contradict it.
- Allows W/F/L when potion status is not visible by using NICH's existing unspecified-potion baseline instead of blocking the whole screenshot.
- Still blocks W/F/L if item identity, trade side, or Normal/Neon/Mega variant is genuinely uncertain.
- Adds safer, more useful error messages for 400, authorization, missing model, quota, and Gemini service errors.

## Security
No `.env.local` or Gemini API key is included in this archive.

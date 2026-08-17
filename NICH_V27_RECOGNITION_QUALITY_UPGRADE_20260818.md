# NICH v27 Recognition Quality Upgrade

Built on the user's v26 current project.

## Main upgrades
- Adds Bush Elephant <-> Elephant and Sugar Axolotl <-> Sugar Skull Dog visual confusion families.
- Forces a targeted independent audit for these families instead of auto-confirming the generic first guess.
- Expands focused candidate rescue prompts with current-catalog alternatives.
- Automatically tries the browser-generated zoom view when a successful trade still has only 1-3 unresolved slots, and keeps the zoom result only if it objectively improves trade-session quality.
- Adds always-available candidate correction chips, including on otherwise confirmed slots.
- Adds an inline Edit field for any trade slot.
- Stores lightweight local correction analytics in `localStorage` under `nichVisionCorrections:v1` (last 200 entries) to reveal repeated misrecognitions without affecting server CPU.
- Keeps the v26 stable Gemini Files + Interactions baseline path and Cloudflare Free-plan architecture.

Version: `vision-v27-confusion-audit-slot-quality-20260818`

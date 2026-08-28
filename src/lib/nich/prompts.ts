/**
 * System-prompt selection by game.
 *
 * There is no longer a single "the NICH prompt". Each game gets its own, and
 * the caller must say which game it is in — the same rule the data layer
 * follows.
 *
 * The Adopt Me prompt is the existing `NICH_SYSTEM_PROMPT`, unchanged. Adopt Me
 * NICH is mature and heavily tuned, and re-cutting a 360-line prompt to share
 * paragraphs with MM2 would risk a behaviour regression for no functional gain.
 * MM2 is built from an explicit core + MM2 domain instead (see mm2/prompt.ts).
 * The residual duplication between the two cores is deliberate and documented.
 */

import type { NichGameId } from "./game/types";
import { requireNichGameId } from "./game/guard";
import { NICH_MM2_SYSTEM_PROMPT } from "./mm2/prompt";
import { NICH_SYSTEM_PROMPT } from "./systemPrompt";

export { NICH_SYSTEM_PROMPT, NICH_MM2_SYSTEM_PROMPT };

/** The prompt for one game. Throws when the game context is missing. */
export function buildNichSystemPrompt(gameId: unknown): string {
  const game: NichGameId = requireNichGameId(gameId, "buildNichSystemPrompt");
  return game === "mm2" ? NICH_MM2_SYSTEM_PROMPT : NICH_SYSTEM_PROMPT;
}

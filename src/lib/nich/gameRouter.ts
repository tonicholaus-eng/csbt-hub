/**
 * The one entry point that knows both games exist.
 *
 * Everything upstream (API route, chat UI) speaks to this; everything
 * downstream lives on exactly one side of the split. The request type is a
 * discriminated union rather than an object with an optional `gameId`, so
 * "which game is this?" is answered by the type system before it is answered
 * at runtime — and an MM2 request structurally cannot carry Adopt Me
 * `localData` (inventory, wishlist and Exchange rows, all Adopt Me items).
 */

import routeAdoptMeMessage from "../../components/nich/assistant/brain/router";
import type {
  NichConversationContext,
  NichLocalProfileData,
  NichResponse,
} from "../../components/nich/assistant/brain/types";
import { requireNichGameId, isNichGameContextError } from "./game/guard";
import type { NichGameId } from "./game/types";
import { routeMM2NichMessage } from "./mm2/brain";
import { createMM2Context, sanitizeMM2Context, type MM2NichContext } from "./mm2/context";
import { recordNichRoute } from "./telemetry";

export type NichGameRequest =
  | {
      gameId: "adopt-me";
      message: string;
      context: NichConversationContext;
      localData?: NichLocalProfileData;
    }
  | {
      gameId: "mm2";
      message: string;
      context: MM2NichContext;
    };

export type NichGameResult = {
  gameId: NichGameId;
  response: NichResponse;
  /** The updated context **for that game only**. */
  context: NichConversationContext | MM2NichContext;
  /** False when the local brain declined and the AI fallback may answer. */
  handledLocally: boolean;
};

/**
 * A safe answer for a request whose game context is missing or malformed.
 *
 * This is the "fail safely" half of the contract: NICH does not guess Adopt Me,
 * and it does not 500 either. It says it cannot tell which game it is in.
 */
export function nichMissingGameResponse(): NichResponse {
  return {
    text:
      "I couldn't tell which game this question is about, so I'm not answering it — " +
      "an Adopt Me value and an MM2 value are never interchangeable. " +
      "Open Nich from the Adopt Me side or the MM2 side and ask again.",
    intent: "fallback",
    reaction: "searchEmpty",
    localConfidence: 1,
    aiEligible: false,
  };
}

/**
 * Route one message to its game's brain.
 *
 * `handledLocally: false` means the caller may consult the AI fallback — with
 * that game's prompt and that game's tools, never the other's.
 */
export function routeNichForGame(request: NichGameRequest): NichGameResult {
  // Validate first (throws on a missing/unknown game), then narrow on the
  // discriminant itself so TypeScript can prove which context shape is in hand.
  requireNichGameId(request.gameId, "routeNichForGame");

  if (request.gameId === "mm2") {
    const gameId: NichGameId = "mm2";
    const context = sanitizeMM2Context(request.context ?? createMM2Context());
    const result = routeMM2NichMessage({ gameId, message: request.message, context });

    if (result) {
      return { gameId, response: result.response, context: result.context, handledLocally: true };
    }

    // The MM2 local brain declined. Hand back a neutral holding response the
    // caller can replace with an AI answer; it is never an Adopt Me answer.
    recordNichRoute({ gameId, channel: "AI", kind: "FALLBACK" });
    return {
      gameId,
      response: {
        text:
          "I don't have that one as a straight catalog answer. Ask me for a weapon's value, its demand, " +
          "a comparison, or give me both sides of a trade and I'll run the W/F/L.",
        intent: "fallback",
        reaction: "searchEmpty",
        localConfidence: 0.2,
        aiEligible: true,
        // Marked AI up front: if a model does answer, the label is already
        // correct, and if none is configured the user still sees an honest
        // "no local answer" rather than a claimed catalog result.
        meta: { gameId, channel: "AI", sources: ["NICH AI", "MM2 CONTEXT"] },
      },
      context,
      handledLocally: false,
    };
  }

  const response = routeAdoptMeMessage({
    gameId: "adopt-me",
    message: request.message,
    context: request.context,
    localData: request.localData,
  });

  return {
    gameId: "adopt-me",
    response,
    context: request.context,
    handledLocally: response.aiEligible === false,
  };
}

/** Route, converting a guard violation into a safe refusal instead of a crash. */
export function routeNichForGameSafely(request: NichGameRequest): NichGameResult {
  try {
    return routeNichForGame(request);
  } catch (error) {
    if (!isNichGameContextError(error)) throw error;

    // A guard fired. Something tried to answer across the game boundary; the
    // only correct outcome is no answer.
    if (process.env.NODE_ENV !== "production") {
       
      console.error("[nich:isolation]", error);
    }

    return {
      gameId: request.gameId === "mm2" ? "mm2" : "adopt-me",
      response: nichMissingGameResponse(),
      context: request.gameId === "mm2" ? createMM2Context() : request.context,
      handledLocally: true,
    };
  }
}

export type { MM2NichContext };

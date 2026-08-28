/**
 * Routing metadata attached to a NICH answer.
 *
 * The console shows small provenance labels under each response ("LOCAL MM2
 * ENGINE · SUPREME VALUES" vs "NICH AI · MM2 CONTEXT"). Those labels are a
 * factual claim about how the answer was produced, so they are produced by the
 * code that produced the answer — never inferred in the UI from the shape of
 * the text.
 *
 * The union is discriminated by game so an Adopt Me response cannot carry an
 * MM2 structured payload, and vice versa. The MM2 import is type-only and is
 * erased at build time; it creates no runtime path from Adopt Me code to the
 * MM2 catalog.
 */

import type { NichGameId } from "./game/types";
import type { MM2ResponsePayload } from "./mm2/result";

export type NichResponseChannel = "LOCAL" | "AI";

export type NichResponseMeta =
  | ({ gameId: "mm2"; channel: NichResponseChannel } & MM2ResponsePayload)
  | { gameId: "adopt-me"; channel: NichResponseChannel };

export function isMM2ResponseMeta(
  meta: NichResponseMeta | undefined,
): meta is Extract<NichResponseMeta, { gameId: "mm2" }> {
  return meta?.gameId === "mm2";
}

export type { NichGameId };

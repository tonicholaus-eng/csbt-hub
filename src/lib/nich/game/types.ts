/**
 * Game identity for NICH.
 *
 * NICH used to be a single Adopt Me brain. Every catalog read, resolver call,
 * value lookup and W/F/L calculation implicitly meant "Adopt Me", so the only
 * thing standing between an MM2 user and an Adopt Me answer would have been
 * prompt wording. That is not a boundary — it is a suggestion.
 *
 * This module makes the game an explicit, mandatory parameter that travels with
 * every NICH operation. The ids deliberately match `src/games/types.ts`
 * (`CSBTGameId`) so the site registry and the assistant can never disagree
 * about what "mm2" means.
 */

export type NichGameId = "adopt-me" | "mm2";

export const NICH_GAME_IDS = ["adopt-me", "mm2"] as const;

export function isNichGameId(value: unknown): value is NichGameId {
  return value === "adopt-me" || value === "mm2";
}

/**
 * Parse a game id from untrusted input.
 *
 * Returns `null` for anything unrecognised — including `undefined`. There is
 * deliberately **no fallback parameter**: a caller that cannot say which game
 * it is in must be told so, not quietly handed Adopt Me. `"adopt"` is accepted
 * only because `src/games/registry.ts#parseGameId` already accepts it and some
 * existing links use it.
 */
export function parseNichGameId(value: unknown): NichGameId | null {
  if (value === "mm2") return "mm2";
  if (value === "adopt-me" || value === "adopt" || value === "adoptme") return "adopt-me";
  return null;
}

/** Human label, used in clarification copy and telemetry. */
export function nichGameLabel(gameId: NichGameId): string {
  return gameId === "mm2" ? "MM2" : "Adopt Me";
}

/**
 * Value sources, per game. These do not overlap by accident: Adopt Me prices in
 * GCash and Elve Shark, MM2 in Supreme (its source values) and GCash. A single
 * union would let an MM2 code path ask for "ELVE" and get a number.
 */
export type NichAdoptMeValueSource = "GCASH" | "ELVE";
export type NichMM2ValueSource = "SUPREME" | "GCASH";

export type NichValueSourceFor<G extends NichGameId> = G extends "mm2"
  ? NichMM2ValueSource
  : NichAdoptMeValueSource;

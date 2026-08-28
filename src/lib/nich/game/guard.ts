/**
 * Cross-game access guards.
 *
 * These are the enforcement half of the isolation contract. The adapters keep
 * the two catalogs in separate modules; these guards make it *loud* when a code
 * path reaches for the wrong one anyway.
 *
 * Design notes:
 *
 * - A violation throws. Returning a safe-looking default is exactly the failure
 *   mode this whole change exists to remove: an MM2 user must never receive an
 *   Adopt Me number, and a thrown error during development is far cheaper than
 *   a wrong value in production.
 * - In production the throw is still a throw, but callers at the route boundary
 *   catch it and degrade to a clarification message rather than a 500. The
 *   guard's job is to stop the wrong answer, not to crash the page.
 */

import { isNichGameId, nichGameLabel, type NichGameId } from "./types";

export class NichGameContextError extends Error {
  readonly expected: NichGameId | null;
  readonly actual: unknown;
  readonly operation: string;

  constructor(message: string, args: { expected: NichGameId | null; actual: unknown; operation: string }) {
    super(message);
    this.name = "NichGameContextError";
    this.expected = args.expected;
    this.actual = args.actual;
    this.operation = args.operation;
  }
}

/**
 * Require a usable game id.
 *
 * Called at every entry point that accepts a game from outside (API body, UI
 * props, tool arguments). Missing is an error, not Adopt Me.
 */
export function requireNichGameId(value: unknown, operation: string): NichGameId {
  if (isNichGameId(value)) return value;
  throw new NichGameContextError(
    `NICH operation "${operation}" was called without a game context. ` +
      `NICH never assumes a game: pass gameId "adopt-me" or "mm2" explicitly.`,
    { expected: null, actual: value, operation },
  );
}

/**
 * Assert that a game-specific tool is being used by the game it belongs to.
 *
 * Every MM2 tool calls this with `"mm2"`, every Adopt Me tool with `"adopt-me"`.
 * A mismatch means a shared code path handed the wrong catalog to the wrong
 * resolver, which is precisely the bug class this architecture forbids.
 */
export function assertGameContext(
  expected: NichGameId,
  actual: unknown,
  operation: string,
): asserts actual is NichGameId {
  if (actual === expected) return;

  const actualLabel = isNichGameId(actual) ? nichGameLabel(actual) : String(actual);
  throw new NichGameContextError(
    `Cross-game NICH access blocked: "${operation}" belongs to ${nichGameLabel(expected)} ` +
      `but was called with game context "${actualLabel}". ` +
      `${nichGameLabel(expected)} data must never answer a ${actualLabel} question.`,
    { expected, actual, operation },
  );
}

/** True when the error came from a guard rather than from ordinary logic. */
export function isNichGameContextError(error: unknown): error is NichGameContextError {
  return error instanceof NichGameContextError;
}

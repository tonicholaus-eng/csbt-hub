/**
 * Browser transport for MM2 NICH.
 *
 * One implementation, shared by the homepage desk and the full console, so
 * there is exactly one place that decides what gets posted to `/api/nich`. The
 * important invariant is trivial and absolute: `gameId` is the literal `"mm2"`,
 * hard-coded, never derived from a prop, a route param or the message.
 *
 * Persistence is not here: the console owns the whole MM2 session — transcript
 * and structured context together — in `lib/nich/mm2/session.ts`. Splitting
 * them was the bug that lost the visible conversation on refresh while keeping
 * MM2's memory, so there is now exactly one record and one place that writes it.
 */

import type { NichResponse } from "../../../components/nich/assistant/brain/types";
import { sanitizeMM2Context, type MM2NichContext } from "./context";

export type MM2AskResult =
  | { ok: true; response: NichResponse; context: MM2NichContext }
  | { ok: false; error: string };

/** The longest question the console will carry in a URL or send to the API. */
export const MM2_QUERY_MAX_LENGTH = 400;

/**
 * The console URL for an optional forwarded question.
 *
 * Pure and shared so the homepage desk that builds the link and the page that
 * reads it agree on encoding and length. `encodeURIComponent` handles spaces,
 * `&`, `#`, `?` and non-ASCII, so a question can contain anything the user can
 * type without breaking the route.
 */
export function buildMM2NichHref(query?: string | null): string {
  const trimmed = String(query ?? "").trim().slice(0, MM2_QUERY_MAX_LENGTH);
  return trimmed ? `/mm2/nich?q=${encodeURIComponent(trimmed)}` : "/mm2/nich";
}

/**
 * Read a forwarded question off the route.
 *
 * `?q=a&q=b` arrives as an array; the first entry wins rather than throwing.
 * Empty or whitespace-only becomes `undefined` so the console does not fire a
 * blank turn on arrival.
 */
export function readForwardedQuery(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return String(raw ?? "").trim().slice(0, MM2_QUERY_MAX_LENGTH) || undefined;
}

/** Post one MM2 turn. Never throws; failures come back as `ok: false`. */
export async function askMM2Nich(
  message: string,
  context: MM2NichContext,
  signal?: AbortSignal,
): Promise<MM2AskResult> {
  try {
    const response = await fetch("/api/nich", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        // Literal, not a variable. There is no code path that can make this
        // anything else, which is the point.
        gameId: "mm2",
        message,
        context,
      }),
    });

    const payload = (await response.json()) as {
      response?: NichResponse;
      context?: unknown;
      gameId?: unknown;
      error?: string;
    };

    if (!response.ok || !payload.response?.text) {
      return { ok: false, error: payload.error || "Nich couldn't answer that right now." };
    }

    // Defence in depth: if the server ever answered as another game, discard it.
    if (payload.gameId !== undefined && payload.gameId !== "mm2") {
      return { ok: false, error: "That answer came back scoped to the wrong game, so I discarded it." };
    }

    return {
      ok: true,
      response: payload.response,
      context: sanitizeMM2Context(payload.context),
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { ok: false, error: "" };
    }
    return { ok: false, error: "Nich couldn't be reached. Check your connection and try again." };
  }
}

export type { MM2NichContext };

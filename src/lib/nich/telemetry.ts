/**
 * NICH routing telemetry.
 *
 * Development visibility only: which game answered, and whether the answer came
 * from deterministic code or from a paid model. It records a routing *decision*
 * — never the user's message, never an item they asked about, never an id.
 *
 * The point is to be able to answer two questions during development:
 *   1. did an MM2 question ever get answered by Adopt Me code?
 *   2. how many model calls is the local brain actually saving?
 */

import type { NichGameId } from "./game/types";

export type NichRouteChannel = "LOCAL" | "AI";

export type NichRouteEvent = {
  gameId: NichGameId;
  channel: NichRouteChannel;
  /** Coarse label, e.g. "VALUE_LOOKUP", "TRADE_WFL", "FALLBACK". */
  kind: string;
  /** Deterministic confidence, when the local router produced one. */
  confidence?: number;
  at: number;
};

/** `LOCAL_MM2_TRADE_WFL`, `AI_ADOPT_ME_FALLBACK`, … */
export function nichRouteLabel(event: Pick<NichRouteEvent, "gameId" | "channel" | "kind">): string {
  const game = event.gameId === "mm2" ? "MM2" : "ADOPT_ME";
  return `${event.channel}_${game}_${event.kind}`.toUpperCase();
}

const MAX_EVENTS = 200;
const events: NichRouteEvent[] = [];

function debugEnabled(): boolean {
  if (process.env.NICH_ROUTE_DEBUG === "1" || process.env.NEXT_PUBLIC_NICH_ROUTE_DEBUG === "1") return true;
  return process.env.NODE_ENV === "development";
}

export function recordNichRoute(event: Omit<NichRouteEvent, "at">): NichRouteEvent {
  const entry: NichRouteEvent = { ...event, at: Date.now() };

  events.push(entry);
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);

  if (debugEnabled()) {
    const confidence = typeof entry.confidence === "number" ? ` conf=${entry.confidence.toFixed(2)}` : "";
     
    console.info(`[nich:route] ${nichRouteLabel(entry)}${confidence}`);
  }

  return entry;
}

/** In-process history. Used by tests and the debug endpoint, not by the UI. */
export function readNichRouteEvents(): readonly NichRouteEvent[] {
  return events;
}

export function clearNichRouteEvents(): void {
  events.length = 0;
}

/** Local-vs-AI split per game, for a quick read on model spend. */
export function summarizeNichRoutes(): Record<string, number> {
  const summary: Record<string, number> = {};
  for (const event of events) {
    const key = `${event.channel}_${event.gameId === "mm2" ? "MM2" : "ADOPT_ME"}`;
    summary[key] = (summary[key] ?? 0) + 1;
  }
  return summary;
}

/**
 * MM2 conversation state.
 *
 * A separate type from `NichConversationContext` on purpose. The Adopt Me
 * context is built around pets, variants and potion status; storing MM2 turns
 * inside it would mean an MM2 follow-up could read `lastPetName` and an Adopt
 * Me follow-up could read an MM2 weapon. Two types, two stores, no bridge.
 *
 * Everything here is keyed by canonical MM2 **ID**, never by name, so a
 * follow-up cannot re-resolve into the other half of a collision pair.
 */

import type { MM2ValueSource } from "../../../components/mm2/MM2TradeTypes";
import type { MM2Intent } from "./intent";

export type MM2TradeMemory = {
  yourItemIds: Array<{ id: string; quantity: number }>;
  theirItemIds: Array<{ id: string; quantity: number }>;
  valueSource: MM2ValueSource;
};

export type MM2NichContext = {
  /** Present and literal so a stray Adopt Me context object fails a type check. */
  gameId: "mm2";
  /** Most recently discussed weapons, newest first. Canonical IDs. */
  recentItemIds?: string[];
  /** The weapons in the last explicit comparison, so "which has better demand?" works. */
  comparisonItemIds?: string[];
  /** Sticky value source for the conversation. */
  lastValueSource?: MM2ValueSource;
  lastIntent?: MM2Intent;
  lastUserMessage?: string;
  /** The last parsed trade, so "what if I add batwing?" can extend it. */
  lastTrade?: MM2TradeMemory;
  /** Per-user MM2 aliases. Never shared with the Adopt Me alias table. */
  aliases?: Record<string, string>;
  turnCount?: number;
  lastUpdatedAt?: number;
};

export const MAX_RECENT_MM2_ITEMS = 8;

export function createMM2Context(): MM2NichContext {
  return { gameId: "mm2", recentItemIds: [], turnCount: 0 };
}

/**
 * Accept an unknown value as MM2 context.
 *
 * Anything that is not explicitly tagged `gameId: "mm2"` is discarded rather
 * than coerced. That is what stops a persisted Adopt Me context — or a
 * hand-rolled request body — from being read as MM2 state.
 */
export function sanitizeMM2Context(value: unknown): MM2NichContext {
  if (!value || typeof value !== "object") return createMM2Context();
  const raw = value as Partial<MM2NichContext> & { gameId?: unknown };
  if (raw.gameId !== "mm2") return createMM2Context();

  const context = createMM2Context();

  if (Array.isArray(raw.recentItemIds)) {
    context.recentItemIds = raw.recentItemIds
      .filter((id): id is string => typeof id === "string" && id.length > 0 && id.length <= 120)
      .slice(0, MAX_RECENT_MM2_ITEMS);
  }

  if (Array.isArray(raw.comparisonItemIds)) {
    context.comparisonItemIds = raw.comparisonItemIds
      .filter((id): id is string => typeof id === "string" && id.length > 0 && id.length <= 120)
      .slice(0, 6);
  }

  if (raw.lastValueSource === "SUPREME" || raw.lastValueSource === "GCASH") {
    context.lastValueSource = raw.lastValueSource;
  }

  if (typeof raw.lastIntent === "string") context.lastIntent = raw.lastIntent as MM2Intent;
  if (typeof raw.lastUserMessage === "string") context.lastUserMessage = raw.lastUserMessage.slice(0, 500);

  if (raw.lastTrade && typeof raw.lastTrade === "object") {
    const trade = raw.lastTrade as Partial<MM2TradeMemory>;
    const readSide = (side: unknown) =>
      Array.isArray(side)
        ? side
            .flatMap((entry) => {
              if (!entry || typeof entry !== "object") return [];
              const id = (entry as { id?: unknown }).id;
              const quantity = Number((entry as { quantity?: unknown }).quantity);
              if (typeof id !== "string" || !id) return [];
              return [{ id, quantity: Math.max(1, Math.min(99, Number.isFinite(quantity) ? Math.floor(quantity) : 1)) }];
            })
            .slice(0, 24)
        : [];

    const valueSource = trade.valueSource === "GCASH" ? "GCASH" : "SUPREME";
    const yourItemIds = readSide(trade.yourItemIds);
    const theirItemIds = readSide(trade.theirItemIds);
    if (yourItemIds.length || theirItemIds.length) {
      context.lastTrade = { yourItemIds, theirItemIds, valueSource };
    }
  }

  if (raw.aliases && typeof raw.aliases === "object") {
    const aliases: Record<string, string> = {};
    let count = 0;
    for (const [key, target] of Object.entries(raw.aliases as Record<string, unknown>)) {
      if (count >= 50) break;
      if (typeof target !== "string" || !target || key.length > 60 || target.length > 120) continue;
      aliases[key.toLowerCase()] = target;
      count += 1;
    }
    if (count) context.aliases = aliases;
  }

  if (typeof raw.turnCount === "number" && Number.isFinite(raw.turnCount)) {
    context.turnCount = Math.max(0, Math.min(10_000, Math.floor(raw.turnCount)));
  }

  return context;
}

/** Merge a turn's result into the context, newest item first, capped. */
export function updateMM2Context(
  current: MM2NichContext,
  patch: Partial<Omit<MM2NichContext, "gameId">> & { touchedItemIds?: string[] },
): MM2NichContext {
  const merged: MM2NichContext = {
    ...current,
    ...patch,
    gameId: "mm2",
    turnCount: Math.min(10_000, (current.turnCount ?? 0) + 1),
    lastUpdatedAt: Date.now(),
  };

  if (patch.touchedItemIds?.length) {
    const seen = new Set<string>();
    merged.recentItemIds = [...patch.touchedItemIds, ...(current.recentItemIds ?? [])]
      .filter((id) => {
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .slice(0, MAX_RECENT_MM2_ITEMS);
  }

  delete (merged as { touchedItemIds?: string[] }).touchedItemIds;
  return merged;
}

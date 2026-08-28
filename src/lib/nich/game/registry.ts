/**
 * NICH game adapters.
 *
 * One adapter per game, each owning that game's catalog, resolver, aliases,
 * value rules and prompt. The registry is the only place both adapters are
 * mentioned in the same file, and it hands out exactly one of them per request.
 *
 * Every adapter method takes the caller's `gameId` and guards it. That is
 * redundant with `getNichGameAdapter` handing you the right adapter — and it is
 * meant to be. Defence in depth is cheap here, and the failure it prevents
 * (an MM2 user quoted an Adopt Me price) is not.
 */

import { getItem, getItemById, searchItems as searchAdoptMeItems } from "../../search";
import { resolveNichItem } from "../itemResolver";
import { getMM2ItemById, resolveMM2Item, searchMM2Items } from "../mm2/resolver";
import { mm2ItemValue } from "../../mm2/tradeMath";
import { mm2Demand } from "../../mm2/catalog";
import { NICH_MM2_SYSTEM_PROMPT } from "../mm2/prompt";
import { NICH_SYSTEM_PROMPT } from "../systemPrompt";
import { assertGameContext, requireNichGameId } from "./guard";
import { nichGameLabel, type NichGameId } from "./types";

export type NichAdapterItem = {
  /** Canonical, game-scoped id. Never compare ids across games. */
  id: string;
  name: string;
  category: string;
  gameId: NichGameId;
};

export type NichAdapterResolution =
  | { status: "resolved"; item: NichAdapterItem; confidence: number }
  | { status: "ambiguous"; query: string; candidates: NichAdapterItem[] }
  | { status: "notFound"; query: string };

export type NichGameAdapter = {
  gameId: NichGameId;
  label: string;
  /** Value sources this game actually has. Asking for another is an error. */
  valueSources: readonly string[];
  defaultValueSource: string;
  systemPrompt: string;
  homeHref: string;
  calculatorHref: string;
  valuesHref: string;

  resolveItem: (query: string, callerGameId: NichGameId) => NichAdapterResolution;
  searchItems: (query: string, callerGameId: NichGameId, limit?: number) => NichAdapterItem[];
  getValue: (itemId: string, source: string, callerGameId: NichGameId) => number | null;
  getDemand: (itemId: string, callerGameId: NichGameId) => number | null;
  itemProfileHref: (itemId: string) => string;
};

// ---------------------------------------------------------------------------
// Adopt Me
// ---------------------------------------------------------------------------

const ADOPT_ME_SOURCES = ["GCASH", "ELVE"] as const;

function adoptMeItem(item: { ID: string; NAME: string; CATEGORY?: unknown }): NichAdapterItem {
  return {
    id: item.ID,
    name: item.NAME,
    category: String(item.CATEGORY ?? "OTHER"),
    gameId: "adopt-me",
  };
}

/**
 * Wraps the existing, mature Adopt Me resolver. Behaviour is unchanged — this
 * only adds the game guard and a normalized return shape.
 */
const adoptMeAdapter: NichGameAdapter = {
  gameId: "adopt-me",
  label: nichGameLabel("adopt-me"),
  valueSources: ADOPT_ME_SOURCES,
  defaultValueSource: "GCASH",
  systemPrompt: NICH_SYSTEM_PROMPT,
  homeHref: "/",
  calculatorHref: "/calculator",
  valuesHref: "/values",

  resolveItem(query, callerGameId) {
    assertGameContext("adopt-me", callerGameId, "adoptMeAdapter.resolveItem");
    const resolution = resolveNichItem(query);
    if (resolution.status === "resolved" && resolution.item) {
      return { status: "resolved", item: adoptMeItem(resolution.item), confidence: resolution.confidence };
    }
    if (resolution.status === "ambiguous") {
      return { status: "ambiguous", query, candidates: resolution.alternatives.map(adoptMeItem) };
    }
    return { status: "notFound", query };
  },

  searchItems(query, callerGameId, limit = 8) {
    assertGameContext("adopt-me", callerGameId, "adoptMeAdapter.searchItems");
    return searchAdoptMeItems(query, limit).map(adoptMeItem);
  },

  getValue(itemId, source, callerGameId) {
    assertGameContext("adopt-me", callerGameId, "adoptMeAdapter.getValue");
    if (!ADOPT_ME_SOURCES.includes(source as (typeof ADOPT_ME_SOURCES)[number])) {
      throw new Error(`Adopt Me has no value source "${source}". Valid sources: ${ADOPT_ME_SOURCES.join(", ")}.`);
    }
    const item = getItemById(itemId) ?? getItem(itemId);
    if (!item) return null;
    const raw = item[`${source}_NORMAL` as keyof typeof item];
    return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
  },

  getDemand(itemId, callerGameId) {
    assertGameContext("adopt-me", callerGameId, "adoptMeAdapter.getDemand");
    const item = getItemById(itemId) ?? getItem(itemId);
    const tier = item?.DEMAND_TIER;
    if (typeof tier !== "string") return null;
    // Adopt Me publishes lettered demand tiers, not a 0-10 score. Mapping them
    // to a number here would invent precision the catalog does not have.
    return null;
  },

  itemProfileHref: (itemId) => `/values/${encodeURIComponent(itemId)}`,
};

// ---------------------------------------------------------------------------
// MM2
// ---------------------------------------------------------------------------

const MM2_SOURCES = ["SUPREME", "GCASH"] as const;

const mm2Adapter: NichGameAdapter = {
  gameId: "mm2",
  label: nichGameLabel("mm2"),
  valueSources: MM2_SOURCES,
  defaultValueSource: "SUPREME",
  systemPrompt: NICH_MM2_SYSTEM_PROMPT,
  homeHref: "/mm2",
  calculatorHref: "/mm2/calculator",
  valuesHref: "/mm2/values",

  resolveItem(query, callerGameId) {
    assertGameContext("mm2", callerGameId, "mm2Adapter.resolveItem");
    const resolution = resolveMM2Item(query, { gameId: "mm2" });
    if (resolution.status === "resolved") {
      return {
        status: "resolved",
        confidence: resolution.confidence,
        item: { id: resolution.item.ID, name: resolution.item.NAME, category: String(resolution.item.CATEGORY ?? "MM2"), gameId: "mm2" },
      };
    }
    if (resolution.status === "ambiguous") {
      return {
        status: "ambiguous",
        query,
        candidates: resolution.candidates.map((item) => ({
          id: item.ID,
          name: item.NAME,
          category: String(item.CATEGORY ?? "MM2"),
          gameId: "mm2" as const,
        })),
      };
    }
    return { status: "notFound", query };
  },

  searchItems(query, callerGameId, limit = 8) {
    assertGameContext("mm2", callerGameId, "mm2Adapter.searchItems");
    return searchMM2Items(query, { gameId: "mm2", limit }).map((item) => ({
      id: item.ID,
      name: item.NAME,
      category: String(item.CATEGORY ?? "MM2"),
      gameId: "mm2" as const,
    }));
  },

  getValue(itemId, source, callerGameId) {
    assertGameContext("mm2", callerGameId, "mm2Adapter.getValue");
    if (!MM2_SOURCES.includes(source as (typeof MM2_SOURCES)[number])) {
      throw new Error(`MM2 has no value source "${source}". Valid sources: ${MM2_SOURCES.join(", ")}.`);
    }
    const item = getMM2ItemById(itemId);
    return item ? mm2ItemValue(item, source as (typeof MM2_SOURCES)[number]) : null;
  },

  getDemand(itemId, callerGameId) {
    assertGameContext("mm2", callerGameId, "mm2Adapter.getDemand");
    const item = getMM2ItemById(itemId);
    return item ? mm2Demand(item) : null;
  },

  itemProfileHref: (itemId) => `/mm2/values/${encodeURIComponent(itemId)}`,
};

// ---------------------------------------------------------------------------

const ADAPTERS: Record<NichGameId, NichGameAdapter> = {
  "adopt-me": adoptMeAdapter,
  mm2: mm2Adapter,
};

/** The adapter for one game. Missing/unknown game context throws. */
export function getNichGameAdapter(gameId: unknown): NichGameAdapter {
  return ADAPTERS[requireNichGameId(gameId, "getNichGameAdapter")];
}

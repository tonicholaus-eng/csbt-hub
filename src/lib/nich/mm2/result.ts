/**
 * Typed structured results for MM2 NICH.
 *
 * The deterministic engine already knows exactly what it computed — which
 * weapon, which value source, which side of a trade won. Before this module
 * that knowledge was flattened into a text blob and the UI would have had to
 * parse its own answer back out of prose to render a card. Parsing your own
 * output is how a "1,000,000 Supreme" becomes a "1,000,000 GCash" on screen.
 *
 * So every deterministic answer now carries both: the text NICH says, and the
 * structured facts it said it from. The cards render the structure; the text
 * stays for accessibility, copy/paste, and the AI-fallback path where there is
 * no structure.
 *
 * `sources` is the small technical provenance the console shows under each
 * answer (LOCAL MM2 ENGINE / SUPREME VALUES / …). It is derived from what the
 * engine actually read, never guessed by the UI.
 */

import type { MM2ValueSource } from "../../../components/mm2/MM2TradeTypes";
import type { MM2CatalogItem } from "../../mm2/catalog";
import { mm2ItemValue } from "../../mm2/tradeMath";

/** Provenance labels. Deliberately a closed set — the UI never invents one. */
export const MM2_SOURCE_LABELS = {
  LOCAL_ENGINE: "LOCAL MM2 ENGINE",
  CATALOG: "MM2 CATALOG",
  SUPREME: "SUPREME VALUES",
  GCASH: "GCASH DATABASE",
  DEMAND: "DEMAND DATA",
  TRADE_ENGINE: "TRADE ENGINE",
  AI: "NICH AI",
  CONTEXT: "MM2 CONTEXT",
} as const;

export type MM2SourceLabel = (typeof MM2_SOURCE_LABELS)[keyof typeof MM2_SOURCE_LABELS];

/** The value-source label for a given source. */
export function sourceLabelFor(source: MM2ValueSource): MM2SourceLabel {
  return source === "GCASH" ? MM2_SOURCE_LABELS.GCASH : MM2_SOURCE_LABELS.SUPREME;
}

/**
 * A weapon, flattened for the UI.
 *
 * Nullable values stay nullable all the way to the card, so a weapon with no
 * GCash price renders "N/A" rather than a zero that looks like a price.
 */
export type MM2ItemSummary = {
  id: string;
  name: string;
  category: string;
  supreme: number | null;
  gcash: number | null;
  demand: number | null;
  href: string;
};

export function toItemSummary(item: MM2CatalogItem): MM2ItemSummary {
  return {
    id: item.ID,
    name: item.NAME,
    category: String(item.CATEGORY ?? "MM2").toUpperCase(),
    supreme: mm2ItemValue(item, "SUPREME"),
    gcash: mm2ItemValue(item, "GCASH"),
    demand: typeof item.DEMAND === "number" && Number.isFinite(item.DEMAND) ? item.DEMAND : null,
    href: `/mm2/values/${encodeURIComponent(item.ID)}`,
  };
}

export type MM2TradeSideRow = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  /** Unit value in the active source, or null when unpriced. */
  unit: number | null;
  /** unit × quantity, or null when unpriced. */
  line: number | null;
  href: string;
};

/**
 * The structured half of a deterministic answer.
 *
 * Every variant carries only facts the engine actually produced. There is no
 * "estimated", "projected" or "typical" field anywhere in this union, because
 * the engine never produces one.
 */
export type MM2StructuredResult =
  | {
      kind: "item";
      item: MM2ItemSummary;
      /** Which figure the question was about; the card leads with it. */
      focus: "SUPREME" | "GCASH" | "DEMAND" | "ALL";
    }
  | {
      kind: "comparison";
      items: MM2ItemSummary[];
      metric: "value" | "demand";
      source: MM2ValueSource;
      /** null when the engine declined to rank (too few priced/rated weapons). */
      winnerId: string | null;
      /** Gap between first and second, in the compared metric. null when unranked. */
      edge: number | null;
      tied: boolean;
    }
  | {
      kind: "trade";
      verdict: "READY" | "CHECK" | "WIN" | "FAIR" | "LOSE";
      source: MM2ValueSource;
      yours: MM2TradeSideRow[];
      theirs: MM2TradeSideRow[];
      yourTotal: number;
      theirTotal: number;
      difference: number;
      differencePercent: number;
      missingCount: number;
      /** Weapons with no value in the active source. Drives the CHECK copy. */
      missingNames: string[];
      calculatorHref: string;
    }
  | {
      kind: "catalog";
      heading: string;
      source: MM2ValueSource;
      rows: MM2ItemSummary[];
      total: number;
      showDemand: boolean;
    }
  | {
      kind: "clarify";
      query: string;
      candidates: MM2ItemSummary[];
    };

/** What the console shows and how it labels the answer's provenance. */
export type MM2ResponsePayload = {
  sources: MM2SourceLabel[];
  structured?: MM2StructuredResult;
  /** Short activity label the avatar showed while producing this. */
  activity?: MM2Activity;
};

/**
 * NICH's working state, surfaced in the UI.
 *
 * Mapped from what the engine is actually doing, not from a timer. `THINKING`
 * is reserved for the AI fallback so the label never claims a model was
 * involved in a catalog read.
 */
export type MM2Activity =
  | "ONLINE"
  | "QUERYING MM2 DATABASE"
  | "RESOLVING WEAPON"
  | "ANALYZING TRADE"
  | "SEARCHING CATALOG"
  | "THINKING"
  | "READY";

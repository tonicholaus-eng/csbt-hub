/**
 * MM2 item resolution for NICH.
 *
 * Reads `mm2Catalog` and nothing else. It has no import path to
 * `tradingItems.json`, `lib/search.ts` or `lib/nich/itemResolver.ts`, which is
 * the structural half of the isolation contract — an Adopt Me pet is not
 * "unlikely" to resolve here, it is unreachable.
 *
 * Identity is by canonical **ID** (`mm2-<slug>-<category>`), never by name.
 * MM2 has five normalized-name collisions where the two weapons differ by up to
 * 10x in value (Rainbow (Gun) 41 vs Rainbow Gun 420, Xeno (Knife) vs
 * Xenoknife, Sun Set vs Sunset, Ice Cream vs Icecream, Chroma Sun Set vs
 * Chroma Sunset). Name-keyed identity is what made one of each pair render the
 * other's value on the profile pages, and the same trap applies to an assistant
 * quoting a number. When a query collapses onto a collision, this resolver asks
 * rather than picks.
 */

import { mm2Catalog, type MM2CatalogItem } from "../../mm2/catalog";
import { assertGameContext } from "../game/guard";
import type { NichGameId } from "../game/types";
import { MM2_CURATED_ALIASES, MM2_RESERVED_TOKENS } from "./aliases";

export type MM2ResolutionKind =
  | "exact-id"
  | "exact-name"
  | "alias"
  | "context"
  | "normalized"
  | "prefix"
  | "typo";

export type MM2ItemResolution =
  | { status: "resolved"; item: MM2CatalogItem; confidence: number; kind: MM2ResolutionKind; alternatives: MM2CatalogItem[] }
  | { status: "ambiguous"; query: string; candidates: MM2CatalogItem[] }
  | { status: "notFound"; query: string };

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

/** Case, punctuation and spacing folded away; word boundaries preserved. */
export function mm2Normalize(value: string): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Everything folded away including spaces. Used only for collision detection. */
function mm2Squash(value: string): string {
  return mm2Normalize(value).replace(/\s+/g, "");
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
    }
    previous = current;
  }
  return previous[b.length];
}

// ---------------------------------------------------------------------------
// Indexes (built once)
// ---------------------------------------------------------------------------

type MM2Index = {
  byId: Map<string, MM2CatalogItem>;
  byName: Map<string, MM2CatalogItem>;
  byNormalizedName: Map<string, MM2CatalogItem[]>;
  bySquashedName: Map<string, MM2CatalogItem[]>;
  normalizedNames: Array<{ item: MM2CatalogItem; normalized: string }>;
};

function buildIndex(): MM2Index {
  const byId = new Map<string, MM2CatalogItem>();
  const byName = new Map<string, MM2CatalogItem>();
  const byNormalizedName = new Map<string, MM2CatalogItem[]>();
  const bySquashedName = new Map<string, MM2CatalogItem[]>();
  const normalizedNames: Array<{ item: MM2CatalogItem; normalized: string }> = [];

  for (const item of mm2Catalog) {
    byId.set(item.ID.toLowerCase(), item);
    byName.set(item.NAME.toLowerCase().trim(), item);

    const normalized = mm2Normalize(item.NAME);
    normalizedNames.push({ item, normalized });

    const normalizedBucket = byNormalizedName.get(normalized) ?? [];
    normalizedBucket.push(item);
    byNormalizedName.set(normalized, normalizedBucket);

    const squashed = mm2Squash(item.NAME);
    const squashedBucket = bySquashedName.get(squashed) ?? [];
    squashedBucket.push(item);
    bySquashedName.set(squashed, squashedBucket);
  }

  return { byId, byName, byNormalizedName, bySquashedName, normalizedNames };
}

let cachedIndex: MM2Index | null = null;
function index(): MM2Index {
  if (!cachedIndex) cachedIndex = buildIndex();
  return cachedIndex;
}

/** Canonical lookup by ID. The identity every MM2 tool should carry around. */
export function getMM2ItemById(id: string): MM2CatalogItem | undefined {
  return index().byId.get(String(id ?? "").toLowerCase().trim());
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

export type MM2ResolveOptions = {
  /** Caller's game context. Guarded so an Adopt Me path cannot call in here. */
  gameId: NichGameId;
  /** Restrict to one catalog category (used by "top godlies"-style follow-ups). */
  category?: string;
  /** IDs recently discussed. Breaks ties toward what the user is already talking about. */
  contextItemIds?: string[];
  /** Per-user aliases, merged over the curated MM2 table. */
  userAliases?: Record<string, string>;
};

function inCategory(item: MM2CatalogItem, category?: string): boolean {
  if (!category) return true;
  return String(item.CATEGORY ?? "").toUpperCase() === category.toUpperCase();
}

function dedupe(items: MM2CatalogItem[]): MM2CatalogItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.ID)) return false;
    seen.add(item.ID);
    return true;
  });
}

/**
 * Resolve free text to exactly one MM2 weapon.
 *
 * Steps run strictest-first and each is unambiguous before the next is tried:
 *
 *   1. exact canonical ID
 *   2. exact catalog name
 *   3. alias (curated + user), which targets an exact name
 *   4. normalized name — only when it matches exactly one weapon
 *   5. squashed name (spacing removed) — only when it matches exactly one
 *   6. context: a recently discussed weapon whose name contains the query
 *   7. unique prefix / unique containment
 *   8. bounded typo pass (Levenshtein ≤ 2, and decisively better than runner-up)
 *
 * Anything that survives to the end with more than one plausible weapon comes
 * back as `ambiguous` with candidates, so the caller asks instead of guessing.
 */
export function resolveMM2Item(query: string, options: MM2ResolveOptions): MM2ItemResolution {
  assertGameContext("mm2", options.gameId, "resolveMM2Item");

  const raw = String(query ?? "").trim();
  const normalized = mm2Normalize(raw);
  if (!normalized) return { status: "notFound", query: raw };

  // Category words, value words and trade words are never item identities.
  if (MM2_RESERVED_TOKENS.has(normalized)) {
    return { status: "notFound", query: raw };
  }

  const { byId, byName, byNormalizedName, bySquashedName, normalizedNames } = index();
  const { category } = options;

  // 1 — exact canonical ID
  const byIdHit = byId.get(raw.toLowerCase());
  if (byIdHit && inCategory(byIdHit, category)) {
    return { status: "resolved", item: byIdHit, confidence: 1, kind: "exact-id", alternatives: [] };
  }

  // 2 — exact catalog name
  const byNameHit = byName.get(raw.toLowerCase());
  if (byNameHit && inCategory(byNameHit, category)) {
    return { status: "resolved", item: byNameHit, confidence: 1, kind: "exact-name", alternatives: [] };
  }

  // 3 — alias, resolved through the exact-name path
  const aliasTarget = options.userAliases?.[normalized] ?? MM2_CURATED_ALIASES[normalized];
  if (aliasTarget) {
    const aliased = byName.get(aliasTarget.toLowerCase().trim()) ?? byId.get(aliasTarget.toLowerCase());
    if (aliased && inCategory(aliased, category)) {
      return { status: "resolved", item: aliased, confidence: 0.99, kind: "alias", alternatives: [] };
    }
  }

  // 4 — normalized name, unique only
  const normalizedBucket = (byNormalizedName.get(normalized) ?? []).filter((item) => inCategory(item, category));
  if (normalizedBucket.length === 1) {
    return { status: "resolved", item: normalizedBucket[0], confidence: 0.97, kind: "normalized", alternatives: [] };
  }
  if (normalizedBucket.length > 1) {
    return { status: "ambiguous", query: raw, candidates: dedupe(normalizedBucket).slice(0, 6) };
  }

  // 5 — squashed name, unique only. This is where the five collision pairs land.
  const squashedBucket = (bySquashedName.get(mm2Squash(raw)) ?? []).filter((item) => inCategory(item, category));
  if (squashedBucket.length === 1) {
    return { status: "resolved", item: squashedBucket[0], confidence: 0.95, kind: "normalized", alternatives: [] };
  }
  if (squashedBucket.length > 1) {
    return { status: "ambiguous", query: raw, candidates: dedupe(squashedBucket).slice(0, 6) };
  }

  const pool = normalizedNames.filter((entry) => inCategory(entry.item, category));

  // 6 — context: prefer a weapon already under discussion.
  const contextIds = new Set((options.contextItemIds ?? []).map((id) => id.toLowerCase()));
  if (contextIds.size) {
    const contextual = pool.filter(
      (entry) =>
        contextIds.has(entry.item.ID.toLowerCase()) &&
        (entry.normalized === normalized ||
          entry.normalized.startsWith(`${normalized} `) ||
          entry.normalized.includes(normalized)),
    );
    if (contextual.length === 1) {
      return { status: "resolved", item: contextual[0].item, confidence: 0.94, kind: "context", alternatives: [] };
    }
  }

  // 7 — unique prefix, then unique containment. A query short enough to match
  // half the catalog is rejected rather than resolved on the first hit.
  if (normalized.length >= 3) {
    const prefixed = pool.filter(
      (entry) => entry.normalized === normalized || entry.normalized.startsWith(`${normalized} `),
    );
    if (prefixed.length === 1) {
      return { status: "resolved", item: prefixed[0].item, confidence: 0.92, kind: "prefix", alternatives: [] };
    }
    if (prefixed.length > 1 && prefixed.length <= 6) {
      return { status: "ambiguous", query: raw, candidates: prefixed.map((entry) => entry.item) };
    }

    const contained = pool.filter((entry) => {
      const words = entry.normalized.split(" ");
      return words.includes(normalized) || entry.normalized.includes(normalized);
    });
    if (contained.length === 1) {
      return { status: "resolved", item: contained[0].item, confidence: 0.88, kind: "prefix", alternatives: [] };
    }
    if (contained.length > 1 && contained.length <= 6) {
      return { status: "ambiguous", query: raw, candidates: contained.map((entry) => entry.item) };
    }
    if (contained.length > 6) {
      // Too broad to disambiguate by listing. Offer the shortest names, which
      // are the ones a user is most likely to have meant.
      const shortest = [...contained]
        .sort((a, b) => a.normalized.length - b.normalized.length || a.normalized.localeCompare(b.normalized))
        .slice(0, 6)
        .map((entry) => entry.item);
      return { status: "ambiguous", query: raw, candidates: shortest };
    }
  }

  // 8 — bounded typo pass.
  if (normalized.length >= 4) {
    const maxDistance = normalized.length >= 6 ? 2 : 1;
    const scored = pool
      .map((entry) => ({ item: entry.item, distance: levenshtein(normalized, entry.normalized) }))
      .filter((entry) => entry.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance || a.item.NAME.localeCompare(b.item.NAME));

    if (scored.length) {
      const best = scored[0];
      const runnerUp = scored[1];
      const decisive = !runnerUp || runnerUp.distance > best.distance;
      if (decisive) {
        return {
          status: "resolved",
          item: best.item,
          confidence: best.distance === 1 ? 0.9 : 0.82,
          kind: "typo",
          alternatives: dedupe(scored.slice(1, 4).map((entry) => entry.item)),
        };
      }
      return { status: "ambiguous", query: raw, candidates: dedupe(scored.slice(0, 5).map((entry) => entry.item)) };
    }
  }

  return { status: "notFound", query: raw };
}

/**
 * Catalog search for MM2, scored the same way the site search is.
 * Returns canonical rows; callers key off `.ID`.
 */
export function searchMM2Items(
  query: string,
  options: { gameId: NichGameId; limit?: number; category?: string },
): MM2CatalogItem[] {
  assertGameContext("mm2", options.gameId, "searchMM2Items");

  const normalized = mm2Normalize(query);
  if (!normalized) return [];

  const limit = Math.max(1, options.limit ?? 10);
  const words = normalized.split(" ").filter(Boolean);

  const scored = index()
    .normalizedNames.filter((entry) => inCategory(entry.item, options.category))
    .flatMap((entry) => {
      const name = entry.normalized;
      let score = 0;
      if (name === normalized) score = 1000;
      else if (name.startsWith(`${normalized} `)) score = 850;
      else if (name.includes(normalized)) score = 700;
      else if (words.length > 1 && words.every((word) => name.includes(word))) score = 500;
      return score ? [{ item: entry.item, score, name }] : [];
    });

  return scored
    .sort((a, b) => b.score - a.score || a.name.length - b.name.length || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map((entry) => entry.item);
}

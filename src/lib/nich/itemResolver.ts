import type { TradeItem } from "../../components/trade/types";
import { getItem, getItemById, itemList, normalizeSearchText, searchItems } from "../search";
import type { NichTradeCandidate, NichTradeSlot, NichUserMemory } from "./tradeSession";

export type NichItemResolution = {
  status: "resolved" | "ambiguous" | "notFound";
  item?: TradeItem;
  confidence: number;
  matchKind?: "exact" | "user-alias" | "catalog-alias" | "context-candidate" | "prefix" | "fuzzy";
  alternatives: TradeItem[];
};

const CURATED_ALIASES: Record<string, string> = {
  fd: "Frost Dragon",
  frost: "Frost Dragon",
  frostdrag: "Frost Dragon",
  sd: "Shadow Dragon",
  shadow: "Shadow Dragon",
  bd: "Bat Dragon",
  batdrag: "Bat Dragon",
  ssbd: "Strawberry Shortcake Bat Dragon",
  ccbd: "Chocolate Chip Bat Dragon",
  "choc chip bat": "Chocolate Chip Bat Dragon",
  "choco chip bat": "Chocolate Chip Bat Dragon",
  "chocolate chip": "Chocolate Chip Bat Dragon",
  dalm: "Dalmatian",
  dalma: "Dalmatian",
  mk: "Monkey King",
  tux: "Tuxedo Cat",
  "tux cat": "Tuxedo Cat",
  tuxedo: "Tuxedo Cat",
  pp: "Peppermint Penguin",
  "pep peng": "Peppermint Penguin",
  peppermint: "Peppermint Penguin",
  frostbite: "Frostbite Bear",
  "frostbite bear": "Frostbite Bear",
  cupid: "Cupid Dragon",
  "cupid drag": "Cupid Dragon",
  "fairy bat": "Fairy Bat Dragon",
  "balloon uni": "Balloon Unicorn",
  "uni horn": "Unicorn Horn",
  unihorn: "Unicorn Horn",
  "raincloud hat": "Rain Cloud Hat",
  raincloudhat: "Rain Cloud Hat",
  "raincloud rat": "Rain Cloud Hat",
  raincloudrat: "Rain Cloud Hat",
};

const RESERVED_TRADE_METADATA = new Set([
  "f", "r", "fr", "rf", "n", "m", "np",
  "nf", "fn", "nr", "rn", "nfr", "nrf",
  "mf", "fm", "mr", "rm", "mfr", "mrf",
  "fly", "ride", "fly ride", "ride fly",
  "normal", "neon", "mega", "no pot", "no potion", "unpotted",
]);

function levenshtein(a: string, b: string) {
  const rows = b.length + 1;
  const columns = a.length + 1;
  const matrix = Array.from({ length: rows }, () => Array<number>(columns).fill(0));
  for (let column = 0; column < columns; column += 1) matrix[0][column] = column;
  for (let row = 0; row < rows; row += 1) matrix[row][0] = row;
  for (let row = 1; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      const cost = b[row - 1] === a[column - 1] ? 0 : 1;
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + cost,
      );
    }
  }
  return matrix[rows - 1][columns - 1];
}

function similarity(a: string, b: string) {
  const first = normalizeSearchText(a);
  const second = normalizeSearchText(b);
  const longest = Math.max(first.length, second.length);
  return longest ? 1 - levenshtein(first, second) / longest : 1;
}

function dedupe(items: TradeItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.ID)) return false;
    seen.add(item.ID);
    return true;
  });
}

function resolveAlias(query: string, memory?: NichUserMemory) {
  const normalized = normalizeSearchText(query);
  const userTarget = memory?.aliases?.[normalized];
  if (userTarget) {
    const item = getItem(userTarget);
    if (item) return { item, kind: "user-alias" as const };
  }
  const target = CURATED_ALIASES[normalized];
  if (target) {
    const item = getItem(target);
    if (item) return { item, kind: "catalog-alias" as const };
  }
  return null;
}

function contextCandidates(query: string, slots: NichTradeSlot[]) {
  const normalized = normalizeSearchText(query);
  const ranked: Array<{ item: TradeItem; score: number }> = [];
  for (const slot of slots) {
    for (const candidate of slot.alternatives) {
      const item = getItemById(candidate.itemId) ?? getItem(candidate.itemName);
      if (!item) continue;
      const score = Math.max(similarity(normalized, item.NAME), candidate.score * 0.96);
      ranked.push({ item, score });
    }
    if (slot.canonicalItemId) {
      const item = getItemById(slot.canonicalItemId);
      if (item) ranked.push({ item, score: similarity(normalized, item.NAME) });
    }
  }
  return ranked.sort((a, b) => b.score - a.score);
}

export function resolveNichItem(
  query: string,
  options: {
    userMemory?: NichUserMemory;
    contextualSlots?: NichTradeSlot[];
    category?: string;
  } = {},
): NichItemResolution {
  const normalized = normalizeSearchText(query);
  if (!normalized) return { status: "notFound", confidence: 0, alternatives: [] };

  // Variant/potion shorthand is metadata, never an item identity. This guard is
  // especially important after screenshot recognition, where replies like
  // "FR, R, FR, FR, MFR" must not fuzzy-match into Frost Dragon/Red Dragon/etc.
  if (RESERVED_TRADE_METADATA.has(normalized)) {
    return { status: "notFound", confidence: 0, alternatives: [] };
  }

  // Exact canonical truth always wins over fuzzy matching.
  const exact = getItem(query);
  if (exact && (!options.category || String(exact.CATEGORY) === options.category)) {
    return { status: "resolved", item: exact, confidence: 1, matchKind: "exact", alternatives: [] };
  }

  const alias = resolveAlias(query, options.userMemory);
  if (alias && (!options.category || String(alias.item.CATEGORY) === options.category)) {
    return { status: "resolved", item: alias.item, confidence: 0.995, matchKind: alias.kind, alternatives: [] };
  }

  const contextual = contextCandidates(query, options.contextualSlots ?? [])
    .filter((entry) => !options.category || String(entry.item.CATEGORY) === options.category);
  if (contextual[0]?.score >= 0.88 && (!contextual[1] || contextual[0].score - contextual[1].score >= 0.08)) {
    return {
      status: "resolved",
      item: contextual[0].item,
      confidence: Math.min(0.98, contextual[0].score),
      matchKind: "context-candidate",
      alternatives: dedupe(contextual.slice(1, 4).map((entry) => entry.item)),
    };
  }

  let results = searchItems(query, 8).filter((item) => !options.category || String(item.CATEGORY) === options.category);

  // The site search intentionally prioritizes precision and can return nothing for a misspelling.
  // When that happens, perform a bounded catalog typo pass locally instead of involving AI.
  if (!results.length && normalized.length >= 4) {
    const maximumDistance = normalized.length >= 5 ? 2 : 1;
    results = itemList
      .filter((item) => !options.category || String(item.CATEGORY) === options.category)
      .map((item) => ({
        item,
        distance: levenshtein(normalized, normalizeSearchText(item.NAME)),
      }))
      .filter((entry) => entry.distance <= maximumDistance)
      .sort((a, b) => a.distance - b.distance || a.item.NAME.localeCompare(b.item.NAME))
      .slice(0, 8)
      .map((entry) => entry.item);
  }

  if (!results.length) return { status: "notFound", confidence: 0, alternatives: [] };

  const scored = results
    .map((item) => {
      const itemName = normalizeSearchText(item.NAME);
      const distance = levenshtein(normalized, itemName);
      return {
        item,
        score: similarity(normalized, item.NAME),
        distance,
        prefix: itemName.split(" ").some((token) => token.startsWith(normalized)),
      };
    })
    .sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      if (b.score !== a.score) return b.score - a.score;
      return Number(b.prefix) - Number(a.prefix);
    });
  const best = scored[0];
  const second = scored[1];

  // A single-edit typo of a real catalog name is generally safer than a broad fuzzy guess.
  // Keep an ambiguity guard so short/random text does not silently become an unrelated item.
  const uniqueSingleEdit =
    normalized.length >= 4 &&
    best.distance <= 1 &&
    (!second || second.distance > 1 || best.score - second.score >= 0.03);
  const uniqueNearTypo =
    normalized.length >= 5 &&
    best.distance === 2 &&
    (!second || second.distance >= 4 || best.score - second.score >= 0.1);
  const confidence = uniqueSingleEdit
    ? Math.max(0.94, best.score)
    : uniqueNearTypo
      ? Math.max(0.86, best.score)
      : best.prefix
        ? Math.max(0.9, best.score)
        : best.score;
  const decisive =
    uniqueSingleEdit ||
    uniqueNearTypo ||
    (confidence >= 0.82 && (!second || confidence - second.score >= 0.08));

  if (decisive) {
    return {
      status: "resolved",
      item: best.item,
      confidence,
      matchKind: best.prefix ? "prefix" : "fuzzy",
      alternatives: scored.slice(1, 4).map((entry) => entry.item),
    };
  }

  return {
    status: "ambiguous",
    item: best.item,
    confidence,
    matchKind: best.prefix ? "prefix" : "fuzzy",
    alternatives: scored.slice(0, 4).map((entry) => entry.item),
  };
}

export function resolveNichCandidate(candidate: NichTradeCandidate) {
  return getItemById(candidate.itemId) ?? getItem(candidate.itemName);
}

export function getNichAliasMap() {
  return { ...CURATED_ALIASES };
}

export function catalogHasItem(name: string) {
  return Boolean(getItem(name));
}

export function getCatalogItemCount() {
  return itemList.length;
}

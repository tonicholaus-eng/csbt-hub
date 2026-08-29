import { clientItemList } from "./clientItemIndex";
import type { TradeItem } from "../components/trade/types";
import { normalizeItemCategory } from "./itemCategory";

export function normalizeSearchText(value: string): string {
  return value.toLowerCase().trim().replace(/[’']/g, "").replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ");
}

/**
 * Search also needs to survive community shorthand, missing spaces and OCR-like
 * letter slips. The compact form deliberately ignores token boundaries so
 * `raincloud hat`, `rain cloud hat`, and OCR-ish `raincloud rat` can still be
 * compared sensibly without changing the canonical catalog name.
 */
export function compactSearchText(value: string): string {
  return normalizeSearchText(value).replace(/\s+/g, "");
}

const normalizedItems = clientItemList.map((item) => ({ ...item, CATEGORY: normalizeItemCategory(item.CATEGORY) })) as TradeItem[];
export const itemList = Array.from(new Map(normalizedItems.map((item) => [`${item.CATEGORY}:${normalizeSearchText(item.NAME)}`, item])).values());
const itemById = new Map(itemList.map((item) => [item.ID, item]));
const itemByName = new Map(itemList.map((item) => [normalizeSearchText(item.NAME), item]));
const itemByCompactName = new Map(itemList.map((item) => [compactSearchText(item.NAME), item]));

/** Common Adopt Me community spellings / spacing that should resolve locally. */
const COMMUNITY_QUERY_ALIASES: Record<string, string> = {
  "uni horn": "unicorn horn",
  unihorn: "unicorn horn",
  "unicornhorn": "unicorn horn",
  "raincloud hat": "rain cloud hat",
  raincloudhat: "rain cloud hat",
  // Common phone/OCR typo: one letter off after users merge "rain cloud".
  "raincloud rat": "rain cloud hat",
  raincloudrat: "rain cloud hat",
};

export function expandCatalogQueryAlias(value: string): string {
  const normalized = normalizeSearchText(value);
  return COMMUNITY_QUERY_ALIASES[normalized]
    ?? COMMUNITY_QUERY_ALIASES[normalized.replace(/\s+/g, "")]
    ?? normalized;
}

export type ItemSearchIndexRow = {
  id: string;
  normalizedName: string;
  compactName: string;
  aliases: string[];
  tokens: string[];
  joinedTokens: string[];
  category: string;
  rarity: string | null;
};

function buildAutomaticAliases(name: string) {
  const normalized = normalizeSearchText(name);
  const tokens = normalized.split(" ").filter(Boolean);
  const aliases = new Set<string>();
  if (tokens.length >= 2) aliases.add(tokens.map((token) => token[0]).join(""));
  if (tokens.length >= 2) aliases.add(tokens.join(""));
  // Community users frequently shorten the first word but type the rest in full:
  // "uni horn", "pep peng", etc. Keep these as search aliases, never as names.
  if (tokens.length >= 2 && tokens[0].length >= 5) {
    for (const width of [3, 4]) {
      if (tokens[0].length > width) aliases.add([tokens[0].slice(0, width), ...tokens.slice(1)].join(" "));
    }
  }
  return [...aliases].filter((alias) => alias.length >= 2);
}

function joinedTokenForms(tokens: string[]) {
  const forms = new Set<string>(tokens);
  for (let index = 0; index < tokens.length - 1; index += 1) {
    forms.add(tokens[index] + tokens[index + 1]);
  }
  return [...forms];
}

export const itemSearchIndex: ItemSearchIndexRow[] = itemList.map((item) => {
  const normalizedName = normalizeSearchText(item.NAME);
  const tokens = normalizedName.split(" ").filter(Boolean);
  return {
    id: item.ID,
    normalizedName,
    compactName: compactSearchText(item.NAME),
    aliases: buildAutomaticAliases(item.NAME),
    tokens,
    joinedTokens: joinedTokenForms(tokens),
    category: String(item.CATEGORY),
    rarity: item.RARITY ?? null,
  };
});
const searchIndexById = new Map(itemSearchIndex.map((row) => [row.id, row]));

function getLevenshteinDistance(first: string, second: string): number {
  const rows = second.length + 1, columns = first.length + 1;
  const matrix = Array.from({ length: rows }, () => Array<number>(columns).fill(0));
  for (let column = 0; column < columns; column += 1) matrix[0][column] = column;
  for (let row = 0; row < rows; row += 1) matrix[row][0] = row;
  for (let row = 1; row < rows; row += 1) for (let column = 1; column < columns; column += 1) {
    const cost = second[row - 1] === first[column - 1] ? 0 : 1;
    matrix[row][column] = Math.min(matrix[row - 1][column] + 1, matrix[row][column - 1] + 1, matrix[row - 1][column - 1] + cost);
  }
  return matrix[rows - 1][columns - 1];
}

function getSimilarity(first: string, second: string): number {
  const longest = Math.max(first.length, second.length);
  return longest ? 1 - getLevenshteinDistance(first, second) / longest : 1;
}

/** Max of normal spelling and no-space spelling. */
export function getLooseSearchSimilarity(first: string, second: string): number {
  const normalA = normalizeSearchText(first);
  const normalB = normalizeSearchText(second);
  const compactA = compactSearchText(first);
  const compactB = compactSearchText(second);
  return Math.max(getSimilarity(normalA, normalB), getSimilarity(compactA, compactB));
}

function tokenScore(token: string, queryToken: string) {
  if (token === queryToken) return 140;
  if (token.startsWith(queryToken) && queryToken.length >= 2) return 124 - Math.min(25, token.length - queryToken.length);
  if (queryToken.startsWith(token) && token.length >= 3) return 112 - Math.min(22, queryToken.length - token.length);
  const similarity = getSimilarity(token, queryToken);
  const threshold = Math.min(token.length, queryToken.length) <= 3 ? 0.74 : 0.64;
  return similarity >= threshold ? Math.round(similarity * 108) : 0;
}

function bestTokenScore(row: ItemSearchIndexRow, queryToken: string) {
  return Math.max(0, ...row.joinedTokens.map((token) => tokenScore(token, queryToken)));
}

function getSearchScore(row: ItemSearchIndexRow, rawQuery: string): number {
  const aliased = expandCatalogQueryAlias(rawQuery);
  const query = normalizeSearchText(aliased);
  const compactQuery = compactSearchText(aliased);
  if (!query) return 0;
  if (row.normalizedName === query || row.compactName === compactQuery) return 1200;
  if (row.aliases.includes(query) || row.aliases.includes(compactQuery)) return 1160;
  if (row.normalizedName.startsWith(query) || row.compactName.startsWith(compactQuery)) return 1080 - Math.min(80, row.normalizedName.length - query.length);
  if (row.aliases.some((alias) => normalizeSearchText(alias).startsWith(query) || compactSearchText(alias).startsWith(compactQuery))) return 1030;
  const included = row.normalizedName.indexOf(query);
  if (included !== -1) return 900 - Math.min(100, included);
  const compactIncluded = row.compactName.indexOf(compactQuery);
  if (compactIncluded !== -1 && compactQuery.length >= 4) return 875 - Math.min(100, compactIncluded);

  const queryTokens = query.split(" ").filter(Boolean);
  if (queryTokens.length > 1) {
    let total = 0;
    for (const queryToken of queryTokens) {
      const best = bestTokenScore(row, queryToken);
      if (!best) {
        const compactSimilarity = getSimilarity(row.compactName, compactQuery);
        return compactQuery.length >= 7 && compactSimilarity >= 0.82
          ? 700 + Math.round(compactSimilarity * 180)
          : 0;
      }
      total += best;
    }
    return 760 + Math.min(220, total / queryTokens.length);
  }

  const tokenBest = bestTokenScore(row, query);
  if (tokenBest) return 620 + tokenBest;

  const similarity = getLooseSearchSimilarity(row.normalizedName, query);
  const threshold = compactQuery.length >= 8 ? 0.76 : 0.72;
  return similarity >= threshold ? Math.round(similarity * 650) : 0;
}

export function searchItems(query: string, limit = 8): TradeItem[] {
  if (!normalizeSearchText(query)) return [];
  return itemList
    .map((item) => ({ item, score: getSearchScore(searchIndexById.get(item.ID)!, query) }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.item.NAME.localeCompare(b.item.NAME))
    .slice(0, Math.max(1, limit))
    .map((result) => result.item);
}

/**
 * Cheap server-side search used inside the Cloudflare vision path. It is more
 * tolerant than exact lookup, but deliberately avoids a full fuzzy catalog scan
 * unless the cheap token/compact passes found nothing.
 */
export function searchVisionItems(query: string, limit = 8): TradeItem[] {
  const aliased = expandCatalogQueryAlias(query);
  const normalized = normalizeSearchText(aliased);
  const compact = compactSearchText(aliased);
  if (!normalized) return [];

  const exact = itemByName.get(normalized) ?? itemByCompactName.get(compact);
  if (exact) return [exact];

  const queryTokens = normalized.split(" ").filter(Boolean);
  const cheap: Array<{ item: TradeItem; score: number }> = [];

  for (const item of itemList) {
    const row = searchIndexById.get(item.ID)!;
    let score = 0;
    if (row.aliases.includes(normalized) || row.aliases.includes(compact)) score = 1160;
    else if (row.normalizedName.startsWith(normalized) || row.compactName.startsWith(compact)) score = 1080 - Math.min(80, row.normalizedName.length - normalized.length);
    else if (row.aliases.some((alias) => normalizeSearchText(alias).startsWith(normalized) || compactSearchText(alias).startsWith(compact))) score = 1030;
    else {
      const included = row.normalizedName.indexOf(normalized);
      const compactIncluded = row.compactName.indexOf(compact);
      if (included !== -1) score = 900 - Math.min(100, included);
      else if (compact.length >= 4 && compactIncluded !== -1) score = 875 - Math.min(100, compactIncluded);
      else if (queryTokens.length > 1) {
        let matched = true;
        let total = 0;
        for (const queryToken of queryTokens) {
          const best = bestTokenScore(row, queryToken);
          if (!best) { matched = false; break; }
          total += best;
        }
        if (matched) score = 760 + Math.min(200, total / queryTokens.length);
      } else if (queryTokens.length === 1) {
        const best = bestTokenScore(row, queryTokens[0]);
        if (best) score = 620 + best;
      }
    }
    if (score > 0) cheap.push({ item, score });
  }

  if (!cheap.length && compact.length >= 4) {
    // Bound the typo scan by compact length rather than first character. OCR can
    // miss/merge the first token, while names such as "raincloud rat" are still
    // one edit from the real compact catalog spelling "raincloudhat".
    for (const item of itemList) {
      const row = searchIndexById.get(item.ID)!;
      if (Math.abs(row.compactName.length - compact.length) > 5) continue;
      const similarity = getSimilarity(row.compactName, compact);
      const threshold = compact.length >= 9 ? 0.82 : 0.78;
      if (similarity >= threshold) cheap.push({ item, score: Math.round(similarity * 650) });
    }
  }

  return cheap
    .sort((a, b) => b.score - a.score || a.item.NAME.localeCompare(b.item.NAME))
    .slice(0, Math.max(1, limit))
    .map((result) => result.item);
}

/**
 * Correction typeahead for screenshot review. Prefix / compact / token matches
 * come first, then tolerant fuzzy matches. This intentionally understands
 * community spacing such as "uni horn" and small slips such as "raincloud rat".
 */
export function searchCatalogTypeahead(
  query: string,
  options?: { limit?: number; category?: string },
): TradeItem[] {
  const aliased = expandCatalogQueryAlias(query);
  const normalized = normalizeSearchText(aliased);
  const compact = compactSearchText(aliased);
  if (!normalized) return [];
  const limit = Math.max(1, options?.limit ?? 8);
  const category = options?.category?.toUpperCase();

  const exactOrPrefix: Array<{ item: TradeItem; score: number }> = [];
  const aliasMatch: Array<{ item: TradeItem; score: number }> = [];
  const tokenPrefix: Array<{ item: TradeItem; score: number }> = [];
  const substring: Array<{ item: TradeItem; score: number }> = [];
  const fuzzy: Array<{ item: TradeItem; score: number }> = [];

  for (const item of itemList) {
    if (category && String(item.CATEGORY).toUpperCase() !== category) continue;
    const row = searchIndexById.get(item.ID)!;

    if (row.normalizedName === normalized || row.compactName === compact) {
      exactOrPrefix.push({ item, score: 10_000 });
      continue;
    }
    if (row.normalizedName.startsWith(normalized) || row.compactName.startsWith(compact)) {
      exactOrPrefix.push({ item, score: 9_000 - row.normalizedName.length });
      continue;
    }
    if (row.aliases.some((alias) => normalizeSearchText(alias) === normalized || compactSearchText(alias) === compact || normalizeSearchText(alias).startsWith(normalized))) {
      aliasMatch.push({ item, score: 8_000 - row.normalizedName.length });
      continue;
    }
    const queryTokens = normalized.split(" ").filter(Boolean);
    const tokenTotal = queryTokens.reduce((sum, token) => sum + bestTokenScore(row, token), 0);
    if (queryTokens.length && tokenTotal && queryTokens.every((token) => bestTokenScore(row, token) > 0)) {
      tokenPrefix.push({ item, score: 7_000 + Math.round(tokenTotal / queryTokens.length) - row.normalizedName.length });
      continue;
    }
    const included = row.normalizedName.indexOf(normalized);
    const compactIncluded = row.compactName.indexOf(compact);
    if (included !== -1 || (compact.length >= 3 && compactIncluded !== -1)) {
      substring.push({ item, score: 6_000 - Math.max(0, included === -1 ? compactIncluded : included) });
      continue;
    }
    if (compact.length >= 4) {
      const score = getLooseSearchSimilarity(row.normalizedName, normalized);
      const threshold = compact.length >= 8 ? 0.74 : 0.7;
      if (score >= threshold) fuzzy.push({ item, score: Math.round(score * 1_000) });
    }
  }

  const ordered = [exactOrPrefix, aliasMatch, tokenPrefix, substring, fuzzy].flatMap((bucket) =>
    bucket.sort((a, b) => b.score - a.score || a.item.NAME.localeCompare(b.item.NAME)),
  );
  const seen = new Set<string>();
  return ordered
    .filter((entry) => (seen.has(entry.item.ID) ? false : (seen.add(entry.item.ID), true)))
    .slice(0, limit)
    .map((entry) => entry.item);
}

export function getItem(name: string): TradeItem | undefined {
  const normalized = normalizeSearchText(name);
  return itemByName.get(normalized) ?? itemByCompactName.get(normalized.replace(/\s+/g, ""));
}
export function getItemById(id: string): TradeItem | undefined { return itemById.get(id); }
export function searchPets(query: string): TradeItem[] { return searchItems(query); }
export function getPet(name: string): TradeItem | undefined { return getItem(name); }

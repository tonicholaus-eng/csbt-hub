import { clientItemList } from "./clientItemIndex";
import type { TradeItem } from "../components/trade/types";
import { normalizeItemCategory } from "./itemCategory";

export function normalizeSearchText(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ");
}

const normalizedItems = clientItemList.map((item) => ({ ...item, CATEGORY: normalizeItemCategory(item.CATEGORY) })) as TradeItem[];
export const itemList = Array.from(new Map(normalizedItems.map((item) => [`${item.CATEGORY}:${normalizeSearchText(item.NAME)}`, item])).values());
const itemById = new Map(itemList.map((item) => [item.ID, item]));
const itemByName = new Map(itemList.map((item) => [normalizeSearchText(item.NAME), item]));

export type ItemSearchIndexRow = {
  id: string;
  normalizedName: string;
  aliases: string[];
  tokens: string[];
  category: string;
  rarity: string | null;
};

function buildAutomaticAliases(name: string) {
  const tokens = normalizeSearchText(name).split(" ").filter(Boolean);
  const aliases = new Set<string>();
  if (tokens.length >= 2) aliases.add(tokens.map((token) => token[0]).join(""));
  if (tokens.length >= 3) aliases.add(tokens.map((token) => token[0]).join(""));
  return [...aliases].filter((alias) => alias.length >= 2);
}

export const itemSearchIndex: ItemSearchIndexRow[] = itemList.map((item) => {
  const normalizedName = normalizeSearchText(item.NAME);
  return {
    id: item.ID,
    normalizedName,
    aliases: buildAutomaticAliases(item.NAME),
    tokens: normalizedName.split(" ").filter(Boolean),
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

function tokenScore(token: string, queryToken: string) {
  if (token === queryToken) return 140;
  if (token.startsWith(queryToken)) return 120 - Math.min(25, token.length - queryToken.length);
  const similarity = getSimilarity(token, queryToken);
  return similarity >= 0.68 ? Math.round(similarity * 105) : 0;
}

function getSearchScore(row: ItemSearchIndexRow, rawQuery: string): number {
  const query = normalizeSearchText(rawQuery);
  if (!query) return 0;
  if (row.normalizedName === query) return 1200;
  if (row.aliases.includes(query)) return 1160;
  if (row.normalizedName.startsWith(query)) return 1080 - Math.min(80, row.normalizedName.length - query.length);
  if (row.aliases.some((alias) => alias.startsWith(query))) return 1030;
  const included = row.normalizedName.indexOf(query);
  if (included !== -1) return 900 - Math.min(100, included);

  const queryTokens = query.split(" ").filter(Boolean);
  if (queryTokens.length > 1) {
    let total = 0;
    for (const queryToken of queryTokens) {
      const best = Math.max(0, ...row.tokens.map((token) => tokenScore(token, queryToken)));
      if (!best) return 0;
      total += best;
    }
    return 760 + Math.min(200, total / queryTokens.length);
  }

  const tokenBest = Math.max(0, ...row.tokens.map((token) => tokenScore(token, query)));
  if (tokenBest) return 620 + tokenBest;

  const similarity = getSimilarity(row.normalizedName, query);
  return similarity >= 0.72 ? Math.round(similarity * 600) : 0;
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

export function searchVisionItems(query: string, limit = 8): TradeItem[] {
  const normalized = normalizeSearchText(query);
  if (!normalized) return [];

  const exact = itemByName.get(normalized);
  if (exact) return [exact];

  const queryTokens = normalized.split(" ").filter(Boolean);
  const cheap: Array<{ item: TradeItem; score: number }> = [];

  for (const item of itemList) {
    const row = searchIndexById.get(item.ID)!;
    let score = 0;
    if (row.aliases.includes(normalized)) score = 1160;
    else if (row.normalizedName.startsWith(normalized)) score = 1080 - Math.min(80, row.normalizedName.length - normalized.length);
    else if (row.aliases.some((alias) => alias.startsWith(normalized))) score = 1030;
    else {
      const included = row.normalizedName.indexOf(normalized);
      if (included !== -1) score = 900 - Math.min(100, included);
      else if (queryTokens.length > 1) {
        let matched = true;
        let total = 0;
        for (const queryToken of queryTokens) {
          const token = row.tokens.find((candidate) => candidate === queryToken || candidate.startsWith(queryToken) || queryToken.startsWith(candidate));
          if (!token) { matched = false; break; }
          total += token === queryToken ? 140 : 105;
        }
        if (matched) score = 760 + Math.min(180, total / queryTokens.length);
      } else if (queryTokens.length === 1) {
        const queryToken = queryTokens[0];
        const token = row.tokens.find((candidate) => candidate.startsWith(queryToken) || queryToken.startsWith(candidate));
        if (token) score = 650 + Math.min(120, Math.min(token.length, queryToken.length) * 8);
      }
    }
    if (score > 0) cheap.push({ item, score });
  }

  if (!cheap.length && normalized.length >= 4) {
    // Only use Levenshtein as a last resort on a narrow bucket. The normal
    // searchItems() computes it across the entire catalog; that is useful for
    // interactive search, but too expensive inside a 10 ms Cloudflare Free
    // vision invocation.
    const first = normalized[0];
    for (const item of itemList) {
      const row = searchIndexById.get(item.ID)!;
      if (row.normalizedName[0] !== first) continue;
      if (Math.abs(row.normalizedName.length - normalized.length) > 4) continue;
      const similarity = getSimilarity(row.normalizedName, normalized);
      if (similarity >= 0.78) cheap.push({ item, score: Math.round(similarity * 600) });
    }
  }

  return cheap
    .sort((a, b) => b.score - a.score || a.item.NAME.localeCompare(b.item.NAME))
    .slice(0, Math.max(1, limit))
    .map((result) => result.item);
}

export function getItem(name: string): TradeItem | undefined { return itemByName.get(normalizeSearchText(name)); }
export function getItemById(id: string): TradeItem | undefined { return itemById.get(id); }
export function searchPets(query: string): TradeItem[] { return searchItems(query); }
export function getPet(name: string): TradeItem | undefined { return getItem(name); }

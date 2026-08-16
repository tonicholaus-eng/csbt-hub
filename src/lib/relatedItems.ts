import type { TradeItem, ValueSource } from "../components/trade/types";
import { itemList } from "./search";
import { getItemValue, parseTradeValue } from "./valueSystem";

function normalValue(item: TradeItem, source: ValueSource) {
  return parseTradeValue(getItemValue(item, source, "NORMAL")) ?? 0;
}

export function getRelatedItems(item: TradeItem, source: ValueSource, limit = 6): TradeItem[] {
  const target = normalValue(item, source);
  if (target <= 0) return [];
  return itemList
    .filter((candidate) => candidate.ID !== item.ID)
    .map((candidate) => {
      const value = normalValue(candidate, source);
      if (value <= 0) return null;
      const valueDistance = Math.abs(value - target) / Math.max(target, 1);
      const categoryBonus = candidate.CATEGORY === item.CATEGORY ? 0.14 : 0;
      const rarityBonus = candidate.RARITY && candidate.RARITY === item.RARITY ? 0.08 : 0;
      const score = Math.max(0, 1 - valueDistance) + categoryBonus + rarityBonus;
      return { candidate, score, valueDistance };
    })
    .filter(
  (row): row is { candidate: TradeItem; score: number; valueDistance: number } =>
    row !== null && row.valueDistance <= 0.45,
)
    .sort((a, b) => b.score - a.score || a.candidate.NAME.localeCompare(b.candidate.NAME))
    .slice(0, Math.max(1, limit))
    .map((row) => row.candidate);
}

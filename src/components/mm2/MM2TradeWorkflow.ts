import type {
  MM2Item,
  MM2SelectedTradeItem,
  MM2ValueSource,
} from "./MM2TradeTypes";

export type MM2TradeRow = {
  key: string;
  quantity: number;
};

export type MM2SavedTrade = {
  id: string;
  createdAt: number;
  valueSource: MM2ValueSource;
  your: MM2TradeRow[];
  their: MM2TradeRow[];
};

export const MM2_RECENT_TRADES_KEY = "csbt:mm2:calculator:recent";

function normalizedKey(value: string) {
  return decodeURIComponent(value).trim().toLowerCase();
}

export function catalogKey(item: MM2Item) {
  return String(item.ID ?? item.NAME);
}

export function selectedToRows(
  selected: MM2SelectedTradeItem[],
): MM2TradeRow[] {
  return selected.map((entry) => ({
    key: catalogKey(entry.item),
    quantity: Math.max(1, Math.min(99, entry.quantity)),
  }));
}

export function rowsToSelected(
  rows: MM2TradeRow[],
  catalog: MM2Item[],
): MM2SelectedTradeItem[] {
  const lookup = new Map<string, MM2Item>();

  for (const item of catalog) {
    lookup.set(normalizedKey(catalogKey(item)), item);
    lookup.set(normalizedKey(item.NAME), item);
  }

  return rows.flatMap((row, index) => {
    const item = lookup.get(normalizedKey(String(row.key)));
    if (!item) return [];

    return [{
      id: `${catalogKey(item)}-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
      item,
      quantity: Math.max(1, Math.min(99, Number(row.quantity) || 1)),
    }];
  });
}

export function encodeTradeRows(selected: MM2SelectedTradeItem[]) {
  return JSON.stringify(selectedToRows(selected));
}

export function decodeTradeRows(value: string | null): MM2TradeRow[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((row) => {
      if (!row || typeof row !== "object") return [];
      const key = String((row as { key?: unknown }).key ?? "").trim();
      if (!key) return [];

      return [{
        key,
        quantity: Math.max(
          1,
          Math.min(
            99,
            Number((row as { quantity?: unknown }).quantity) || 1,
          ),
        ),
      }];
    });
  } catch {
    return [];
  }
}

export function buildTradeUrl({
  valueSource,
  yourItems,
  theirItems,
}: {
  valueSource: MM2ValueSource;
  yourItems: MM2SelectedTradeItem[];
  theirItems: MM2SelectedTradeItem[];
}) {
  const params = new URLSearchParams();
  params.set("source", valueSource);

  if (yourItems.length) {
    params.set("your", encodeTradeRows(yourItems));
  }

  if (theirItems.length) {
    params.set("their", encodeTradeRows(theirItems));
  }

  return `${window.location.origin}/mm2/calculator?${params.toString()}`;
}

export function makeSavedTrade({
  valueSource,
  yourItems,
  theirItems,
}: {
  valueSource: MM2ValueSource;
  yourItems: MM2SelectedTradeItem[];
  theirItems: MM2SelectedTradeItem[];
}): MM2SavedTrade {
  return {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    valueSource,
    your: selectedToRows(yourItems),
    their: selectedToRows(theirItems),
  };
}

export function loadRecentTrades(): MM2SavedTrade[] {
  try {
    const raw = window.localStorage.getItem(MM2_RECENT_TRADES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, 6);
  } catch {
    return [];
  }
}

export function saveRecentTrades(trades: MM2SavedTrade[]) {
  window.localStorage.setItem(
    MM2_RECENT_TRADES_KEY,
    JSON.stringify(trades.slice(0, 6)),
  );
}

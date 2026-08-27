import type { SelectedTradeItem, ValueSource, ValueType } from "../components/trade/types";
import { getItemById } from "./search";

export type TradeContextRow = { itemId: string; valueType: ValueType; quantity: number };
function isValueType(value: string): value is ValueType { return value === "NORMAL" || value === "NEON" || value === "MEGA"; }

export function encodeTradeRows(rows: Array<Pick<TradeContextRow, "itemId" | "valueType"> & Partial<Pick<TradeContextRow, "quantity">>>): string {
  return rows.map((row) => `${encodeURIComponent(row.itemId)}~${row.valueType}~${Math.max(1, row.quantity ?? 1)}`).join(",");
}
export function decodeTradeRows(value: string | null | undefined, maxRows = 18): TradeContextRow[] {
  if (!value) return [];
  const rows: TradeContextRow[] = [];
  for (const chunk of value.split(",").slice(0, maxRows)) {
    const [encodedId, rawType = "NORMAL", rawQuantity = "1"] = chunk.split("~");
    let itemId = "";
    try { itemId = decodeURIComponent(encodedId ?? ""); } catch { continue; }
    if (!itemId || !getItemById(itemId)) continue;
    const valueType: ValueType = isValueType(rawType) ? rawType : "NORMAL";
    const quantity = Math.max(1, Math.min(99, Number.parseInt(rawQuantity, 10) || 1));
    rows.push({ itemId, valueType, quantity });
  }
  return rows;
}
/**
 * Collapse selected items into rows, merging duplicates into a quantity.
 *
 * The Adopt Me calculator models a x3 trade as three separate rows, so this used
 * to emit `quantity: 1` three times. Grouping keeps the exported trade lossless
 * (Exchange and Trade Opinions both read quantity) and makes the URL shorter,
 * while hydrating back to the same three rows.
 */
export function selectedItemsToRows(items: SelectedTradeItem[]): TradeContextRow[] {
  const rows: TradeContextRow[] = [];
  const index = new Map<string, TradeContextRow>();

  for (const selected of items) {
    const key = `${selected.item.ID}~${selected.valueType}`;
    const existing = index.get(key);
    if (existing) {
      existing.quantity = Math.min(99, existing.quantity + 1);
      continue;
    }
    const row: TradeContextRow = { itemId: selected.item.ID, valueType: selected.valueType, quantity: 1 };
    index.set(key, row);
    rows.push(row);
  }

  return rows;
}
export function buildTradeContextParams(your: TradeContextRow[], their: TradeContextRow[], source: ValueSource) {
  const params = new URLSearchParams();
  params.set("source", source);
  if (your.length) params.set("your", encodeTradeRows(your));
  if (their.length) params.set("their", encodeTradeRows(their));
  return params;
}

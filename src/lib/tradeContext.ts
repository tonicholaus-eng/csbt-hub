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
export function selectedItemsToRows(items: SelectedTradeItem[]): TradeContextRow[] {
  return items.map((selected) => ({ itemId: selected.item.ID, valueType: selected.valueType, quantity: 1 }));
}
export function buildTradeContextParams(your: TradeContextRow[], their: TradeContextRow[], source: ValueSource) {
  const params = new URLSearchParams();
  params.set("source", source);
  if (your.length) params.set("your", encodeTradeRows(your));
  if (their.length) params.set("their", encodeTradeRows(their));
  return params;
}

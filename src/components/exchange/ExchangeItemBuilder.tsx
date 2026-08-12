"use client";

import Image from "next/image";
import ItemSearchPicker from "../items/ItemSearchPicker";
import type { TradeItem, ValueSource, ValueType } from "../trade/types";
import { getItemById } from "../../lib/search";
import { formatTradeValue, getInventoryItemValue, hasItemValue, parseTradeValue } from "../../lib/valueSystem";
import type { ExchangeItem } from "../../lib/exchange/types";

function defaultVariant(item: TradeItem, source: ValueSource): ValueType {
  if (hasItemValue(item, source, "NORMAL")) return "NORMAL";
  if (hasItemValue(item, source, "NEON")) return "NEON";
  if (hasItemValue(item, source, "MEGA")) return "MEGA";
  return "NORMAL";
}

export function exchangeItemFromTradeItem(item: TradeItem, source: ValueSource): ExchangeItem {
  const valueType = defaultVariant(item, source);
  return {
    item_id: item.ID,
    item_name: item.NAME,
    image_url: item.IMAGE || null,
    category: item.CATEGORY,
    value_type: valueType,
    potion_status: "BASE",
    quantity: 1,
    snapshot_value: parseTradeValue(getInventoryItemValue(item, source, valueType, "BASE")),
    demand_tier: item.DEMAND_TIER ?? null,
  };
}

export default function ExchangeItemBuilder({
  title,
  description,
  items,
  source,
  onChange,
  maxItems = 18,
}: {
  title: string;
  description?: string;
  items: ExchangeItem[];
  source: ValueSource;
  onChange: (items: ExchangeItem[]) => void;
  maxItems?: number;
}) {
  function addItem(item: TradeItem) {
    if (items.length >= maxItems) return;
    const next = exchangeItemFromTradeItem(item, source);
    const match = items.findIndex(
      (row) => row.item_id === next.item_id && row.value_type === next.value_type && row.potion_status === next.potion_status,
    );
    if (match >= 0) {
      onChange(items.map((row, index) => index === match ? { ...row, quantity: Math.min(99, row.quantity + 1) } : row));
    } else {
      onChange([...items, next]);
    }
  }

  function patch(index: number, patch: Partial<ExchangeItem>) {
    onChange(items.map((row, rowIndex) => {
      if (rowIndex !== index) return row;
      const next = { ...row, ...patch };
      const tradeItem = getItemById(next.item_id);
      if (tradeItem && (patch.value_type || patch.potion_status)) {
        next.snapshot_value = parseTradeValue(
          getInventoryItemValue(tradeItem, source, next.value_type, next.potion_status),
        );
      }
      return next;
    }));
  }

  const total = items.reduce((sum, item) => sum + (item.snapshot_value ?? 0) * Math.max(1, item.quantity), 0);

  return (
    <section className="rounded-[26px] border border-slate-200/80 bg-white/75 p-4 dark:border-white/10 dark:bg-white/[0.035] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-950 dark:text-white">{title}</h3>
          {description && <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">{description}</p>}
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600 dark:bg-white/5 dark:text-slate-300">
          {source === "GCASH" ? "₱" : "🦈"} {formatTradeValue(total)}
        </span>
      </div>

      <div className="mt-4">
        <ItemSearchPicker onSelect={addItem} valueSource={source} placeholder={`Add an item to ${title.toLowerCase()}…`} disabled={items.length >= maxItems} />
      </div>

      <div className="mt-3 space-y-2">
        {items.map((row, index) => {
          const item = getItemById(row.item_id);
          if (!item) return null;
          const variants = (["NORMAL", "NEON", "MEGA"] as ValueType[]).filter((variant) => hasItemValue(item, source, variant));
          return (
            <div key={`${row.item_id}-${row.value_type}-${index}`} className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2.5 dark:border-white/10 dark:bg-slate-950/45 sm:grid-cols-[minmax(0,1fr)_110px_90px_40px] sm:items-center">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white dark:bg-white/5">
                  {row.image_url ? <Image src={row.image_url} alt="" width={44} height={44} unoptimized className="h-10 w-10 object-contain" /> : "📦"}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-slate-900 dark:text-white">{row.item_name}</span>
                  <span className="block text-[10px] font-bold text-slate-400">
                    {source === "GCASH" ? "₱" : "🦈"} {formatTradeValue(row.snapshot_value)} each
                  </span>
                </span>
              </div>

              <select value={row.value_type} onChange={(event) => patch(index, { value_type: event.target.value as ValueType })} className="min-h-10 rounded-xl border border-slate-200 bg-white px-2 text-xs font-black dark:border-white/10 dark:bg-slate-900">
                {variants.length ? variants.map((variant) => <option key={variant} value={variant}>{variant === "NORMAL" ? "Regular" : variant === "NEON" ? "Neon" : "Mega"}</option>) : <option value="NORMAL">Regular</option>}
              </select>

              <input type="number" min={1} max={99} value={row.quantity} onChange={(event) => patch(index, { quantity: Math.max(1, Math.min(99, Number(event.target.value) || 1)) })} className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-center text-xs font-black dark:border-white/10 dark:bg-slate-900" aria-label={`${row.item_name} quantity`} />

              <button type="button" onClick={() => onChange(items.filter((_, rowIndex) => rowIndex !== index))} className="flex h-10 w-full items-center justify-center rounded-xl bg-rose-50 text-lg font-black text-rose-500 hover:bg-rose-100 dark:bg-rose-400/10 sm:w-10" aria-label={`Remove ${row.item_name}`}>×</button>
            </div>
          );
        })}
        {!items.length && <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-xs font-bold text-slate-400 dark:border-white/10">No items added yet.</p>}
      </div>
    </section>
  );
}

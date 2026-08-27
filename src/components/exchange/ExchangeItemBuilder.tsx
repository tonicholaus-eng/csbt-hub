"use client";

import GameItemPicker from "../games/GameItemPicker";
import { getGameAdapter } from "../../games/registry";
import type { CSBTGameId, CSBTGameItem, CSBTItemVariant, CSBTValueSource } from "../../games/types";
import type { ExchangeItem } from "../../lib/exchange/types";

function formatValue(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("en-US", { maximumFractionDigits: 2 })
    : "N/A";
}

export function exchangeItemFromGameItem(
  gameId: CSBTGameId,
  item: CSBTGameItem,
  source: CSBTValueSource,
  preferredVariant: CSBTItemVariant = "NORMAL",
  quantity = 1,
): ExchangeItem {
  const adapter = getGameAdapter(gameId);
  const variants = adapter.getVariants(item, source);
  const variant = variants.includes(preferredVariant) ? preferredVariant : variants[0] ?? "NORMAL";
  return {
    item_id: item.id,
    item_name: item.name,
    image_url: item.image,
    category: item.category,
    value_type: variant,
    potion_status: "BASE",
    quantity: Math.max(1, Math.min(99, quantity)),
    snapshot_value: adapter.getValue(item, source, variant),
    demand_tier: adapter.getDemandLabel(item),
  };
}

export default function ExchangeItemBuilder({
  title,
  description,
  items,
  gameId,
  source,
  onChange,
  maxItems = 18,
}: {
  title: string;
  description?: string;
  items: ExchangeItem[];
  gameId: CSBTGameId;
  source: CSBTValueSource;
  onChange: (items: ExchangeItem[]) => void;
  maxItems?: number;
}) {
  const adapter = getGameAdapter(gameId);
  const sourceConfig = adapter.valueSources.find((entry) => entry.id === source) ?? adapter.valueSources[0];

  function addItem(item: CSBTGameItem) {
    if (items.length >= maxItems) return;
    const next = exchangeItemFromGameItem(gameId, item, source);
    const match = items.findIndex(
      (row) => row.item_id === next.item_id && row.value_type === next.value_type,
    );
    if (match >= 0) {
      onChange(items.map((row, index) => index === match ? { ...row, quantity: Math.min(99, row.quantity + 1) } : row));
    } else {
      onChange([...items, next]);
    }
  }

  function patch(index: number, patchValue: Partial<ExchangeItem>) {
    onChange(items.map((row, rowIndex) => {
      if (rowIndex !== index) return row;
      const next = { ...row, ...patchValue };
      const item = adapter.getItem(next.item_id);
      if (item && patchValue.value_type) {
        next.snapshot_value = adapter.getValue(item, source, next.value_type);
      }
      return next;
    }));
  }

  const total = items.reduce((sum, item) => sum + (item.snapshot_value ?? 0) * Math.max(1, item.quantity), 0);

  return (
    <section className="rounded-[26px] border border-[var(--border)] bg-[var(--surface-2)] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-[var(--foreground)]">{title}</h3>
          {description && <p className="mt-1 text-xs font-semibold leading-5 text-[var(--foreground-muted)]">{description}</p>}
        </div>
        <span className="rounded-full bg-[var(--surface-3)] px-3 py-1.5 text-xs font-black text-[var(--foreground)]">
          {sourceConfig?.symbol ?? "◈"} {formatValue(total)}
        </span>
      </div>

      <div className="mt-4">
        <GameItemPicker gameId={gameId} onSelect={addItem} placeholder={`Add a ${adapter.shortName} item to ${title.toLowerCase()}…`} disabled={items.length >= maxItems} />
      </div>

      <div className="mt-3 space-y-2">
        {items.map((row, index) => {
          const item = adapter.getItem(row.item_id);
          if (!item) return null;
          const variants = adapter.getVariants(item, source);
          return (
            <div key={`${row.item_id}-${row.value_type}-${index}`} className="grid gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-3)] p-2.5 sm:grid-cols-[minmax(0,1fr)_110px_90px_40px] sm:items-center">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--surface-2)]">
                  {row.image_url ? <img src={row.image_url} alt="" className="h-10 w-10 object-contain" /> : "📦"}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-[var(--foreground)]">{row.item_name}</span>
                  <span className="block text-[10px] font-bold text-[var(--foreground-muted)]">
                    {sourceConfig?.symbol ?? "◈"} {formatValue(row.snapshot_value)} each{row.demand_tier ? ` · Demand ${row.demand_tier}` : ""}
                  </span>
                </span>
              </div>

              <select
                value={row.value_type}
                disabled={variants.length <= 1}
                onChange={(event) => patch(index, { value_type: event.target.value as CSBTItemVariant })}
                className="min-h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-2 text-xs font-black text-[var(--foreground)] disabled:opacity-50"
              >
                {variants.map((variant) => <option key={variant} value={variant}>{variant === "NORMAL" ? "Regular" : variant === "NEON" ? "Neon" : "Mega"}</option>)}
              </select>

              <input type="number" min={1} max={99} value={row.quantity} onChange={(event) => patch(index, { quantity: Math.max(1, Math.min(99, Number(event.target.value) || 1)) })} className="min-h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-center text-xs font-black text-[var(--foreground)]" aria-label={`${row.item_name} quantity`} />

              <button type="button" onClick={() => onChange(items.filter((_, rowIndex) => rowIndex !== index))} className="flex h-10 w-full items-center justify-center rounded-xl bg-rose-500/10 text-lg font-black text-rose-500 hover:bg-rose-500/15 sm:w-10" aria-label={`Remove ${row.item_name}`}>×</button>
            </div>
          );
        })}
        {!items.length && <p className="rounded-2xl border border-dashed border-[var(--border-strong)] px-4 py-6 text-center text-xs font-bold text-[var(--foreground-muted)]">No items added yet.</p>}
      </div>
    </section>
  );
}

"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { TradeItem, ValueSource } from "../trade/types";
import { searchItems } from "../../lib/search";
import { formatTradeValue, getItemValue, hasItemValue } from "../../lib/valueSystem";
import { getItemCategoryDetails } from "../../lib/itemCategory";

export default function ItemSearchPicker({
  onSelect,
  valueSource,
  placeholder = "Search an Adopt Me item…",
  disabled = false,
}: {
  onSelect: (item: TradeItem) => void;
  valueSource?: ValueSource;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return searchItems(query, 12).filter((item) => {
      if (!valueSource) return true;
      return (
        hasItemValue(item, valueSource, "NORMAL") ||
        hasItemValue(item, valueSource, "NEON") ||
        hasItemValue(item, valueSource, "MEGA")
      );
    });
  }, [query, valueSource]);

  return (
    <div className="relative">
      <input
        value={query}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 140)}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
        className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-300/15 disabled:opacity-50 dark:border-white/10 dark:bg-slate-900 dark:text-white"
      />

      {focused && query.trim() && (
        <div className="absolute inset-x-0 top-[calc(100%+8px)] z-[80] max-h-[360px] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-white/10 dark:bg-slate-950">
          {results.length ? (
            results.map((item) => {
              const category = getItemCategoryDetails(item.CATEGORY);
              return (
                <button
                  key={item.ID}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onSelect(item);
                    setQuery("");
                    setFocused(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-amber-50 dark:hover:bg-white/5"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-2xl dark:bg-white/5">
                    {item.IMAGE ? (
                      <Image src={item.IMAGE} alt="" width={44} height={44} unoptimized className="h-10 w-10 object-contain" />
                    ) : category.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black text-slate-900 dark:text-white">{item.NAME}</span>
                    <span className="block truncate text-[10px] font-bold text-slate-400">{category.label}{item.RARITY ? ` • ${item.RARITY}` : ""}</span>
                  </span>
                  <span className="shrink-0 text-right text-[10px] font-black text-slate-500 dark:text-slate-400">
                    <span className="block">₱ {formatTradeValue(getItemValue(item, "GCASH", "NORMAL"))}</span>
                    <span className="block">🦈 {formatTradeValue(getItemValue(item, "ELVE", "NORMAL"))}</span>
                  </span>
                </button>
              );
            })
          ) : (
            <p className="px-4 py-6 text-center text-sm font-bold text-slate-400">No matching items.</p>
          )}
        </div>
      )}
    </div>
  );
}

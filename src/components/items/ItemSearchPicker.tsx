"use client";

import Image from "next/image";
import { useId, useMemo, useRef, useState } from "react";
import type { TradeItem, ValueSource } from "../trade/types";
import { searchItems } from "../../lib/search";
import {
  formatTradeValue,
  getItemValue,
  hasItemValue,
} from "../../lib/valueSystem";
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
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

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

  const open = focused && Boolean(query.trim());

  function selectItem(item: TradeItem) {
    onSelect(item);

    setQuery("");
    setActiveIndex(0);
    setFocused(false);

    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        value={query}
        disabled={disabled}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={
          open && results[activeIndex]
            ? `${listboxId}-${results[activeIndex].ID}`
            : undefined
        }
        onFocus={() => setFocused(true)}
        onBlur={() => {
          window.setTimeout(() => setFocused(false), 140);
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setActiveIndex(0);
        }}
        onKeyDown={(event) => {
          if (!open) return;

          if (event.key === "ArrowDown") {
            event.preventDefault();

            setActiveIndex((current) =>
              results.length ? (current + 1) % results.length : 0,
            );
          } else if (event.key === "ArrowUp") {
            event.preventDefault();

            setActiveIndex((current) =>
              results.length
                ? (current - 1 + results.length) % results.length
                : 0,
            );
          } else if (event.key === "Enter" && results[activeIndex]) {
            event.preventDefault();
            selectItem(results[activeIndex]);
          } else if (event.key === "Escape") {
            event.preventDefault();
            setFocused(false);
          }
        }}
        placeholder={placeholder}
        className="min-h-12 w-full rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-[var(--surface-raised)] px-4 text-sm font-bold text-[var(--foreground)] outline-none transition focus:border-[var(--brand-primary)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--brand-primary)_18%,transparent)] disabled:opacity-50"
      />

      {open && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute inset-x-0 top-[calc(100%+8px)] z-[80] max-h-[360px] overflow-y-auto rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface-elevated)] p-2 shadow-[var(--shadow-float)]"
        >
          {results.length ? (
            results.map((item, index) => {
              const category = getItemCategoryDetails(item.CATEGORY);
              const active = index === activeIndex;

              return (
                <button
                  id={`${listboxId}-${item.ID}`}
                  role="option"
                  aria-selected={active}
                  key={item.ID}
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectItem(item)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                    active
                      ? "bg-[var(--surface-selected)]"
                      : "hover:bg-[var(--surface-interactive)]"
                  }`}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--surface-3)] text-2xl">
                    {item.IMAGE ? (
                      <Image
                        src={item.IMAGE}
                        alt={item.NAME}
                        width={44}
                        height={44}
                        unoptimized
                        className="h-10 w-10 object-contain"
                      />
                    ) : (
                      category.icon
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black text-[var(--foreground)]">
                      {item.NAME}
                    </span>

                    <span className="block truncate text-xs font-bold text-[var(--foreground-muted)]">
                      {category.label}
                      {item.RARITY ? ` • ${item.RARITY}` : ""}
                    </span>
                  </span>

                  <span className="shrink-0 text-right text-xs font-black text-[var(--foreground-muted)]">
                    <span className="block">
                      ₱{" "}
                      {formatTradeValue(
                        getItemValue(item, "GCASH", "NORMAL"),
                      )}
                    </span>

                    <span className="block">
                      🦈{" "}
                      {formatTradeValue(
                        getItemValue(item, "ELVE", "NORMAL"),
                      )}
                    </span>
                  </span>
                </button>
              );
            })
          ) : (
            <p className="px-4 py-6 text-center text-sm font-bold text-[var(--foreground-muted)]">
              No matching items. Try a full name, abbreviation, or a close
              spelling.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
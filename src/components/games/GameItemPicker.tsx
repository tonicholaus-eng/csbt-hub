"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { getGameAdapter } from "../../games/registry";
import type { CSBTGameId, CSBTGameItem } from "../../games/types";

/**
 * The multi-game item picker used by CSBT Exchange and Trade Opinions.
 *
 * This is an ARIA combobox with full keyboard support, matching
 * components/items/ItemSearchPicker.tsx. It previously had neither, which meant
 * a keyboard-only or screen-reader user could browse values but could not build
 * an Exchange listing or post a trade opinion - in either game.
 */
export default function GameItemPicker({
  gameId,
  onSelect,
  placeholder = "Search items…",
  disabled = false,
}: {
  gameId: CSBTGameId;
  onSelect: (item: CSBTGameItem) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const adapter = getGameAdapter(gameId);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const results = useMemo(() => adapter.searchItems(query, 12), [adapter, query]);

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, []);

  const expanded = open && Boolean(query.trim());
  const activeItem = expanded ? results[activeIndex] : undefined;

  function choose(item: CSBTGameItem) {
    onSelect(item);
    setQuery("");
    setActiveIndex(0);
    setOpen(false);
    // Keep focus in the field so several items can be added without reaching
    // for the mouse between each one.
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <div ref={rootRef} className="relative">
      <input
        ref={inputRef}
        value={query}
        disabled={disabled}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={expanded ? listboxId : undefined}
        aria-activedescendant={activeItem ? `${listboxId}-${activeItem.id}` : undefined}
        aria-label={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setActiveIndex(0);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (!expanded) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((current) => (results.length ? (current + 1) % results.length : 0));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((current) =>
              results.length ? (current - 1 + results.length) % results.length : 0,
            );
          } else if (event.key === "Enter" && results[activeIndex]) {
            event.preventDefault();
            choose(results[activeIndex]);
          } else if (event.key === "Escape") {
            event.preventDefault();
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        className="min-h-11 w-full rounded-[12px] border border-[var(--border)] bg-[var(--surface-3)] px-3 text-xs font-bold text-[var(--foreground)] outline-none transition placeholder:text-[var(--foreground-muted)] focus:border-[var(--brand-primary)] disabled:opacity-40"
      />
      {expanded && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={`${adapter.shortName} search results`}
          className="absolute inset-x-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-[16px] border border-[var(--border)] bg-[var(--surface-elevated)] p-1.5 shadow-[var(--shadow-float)]"
        >
          {results.length ? (
            results.map((item, index) => (
              <button
                key={item.id}
                id={`${listboxId}-${item.id}`}
                role="option"
                aria-selected={index === activeIndex}
                type="button"
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(item)}
                className={`flex min-h-14 w-full items-center gap-3 rounded-[12px] px-2.5 py-2 text-left transition ${
                  index === activeIndex
                    ? "bg-[var(--surface-selected)]"
                    : "hover:bg-[var(--surface-interactive)]"
                }`}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--surface-3)]">
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- catalog art is remote and unsized; next/image adds no benefit at 40px here
                    <img src={item.image} alt="" className="h-10 w-10 object-contain" />
                  ) : (
                    <span>📦</span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-xs font-black text-[var(--foreground)]">
                    {item.name}
                  </strong>
                  <span className="mt-0.5 block truncate text-[9px] font-bold uppercase tracking-[.08em] text-[var(--foreground-muted)]">
                    {item.category}
                    {item.demandLabel ? ` · Demand ${item.demandLabel}` : ""}
                  </span>
                </span>
              </button>
            ))
          ) : (
            <p className="px-3 py-6 text-center text-xs font-bold text-[var(--foreground-muted)]">
              No {adapter.shortName} items found.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getGameAdapter } from "../../games/registry";
import type { CSBTGameId, CSBTGameItem } from "../../games/types";

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
  const rootRef = useRef<HTMLDivElement>(null);
  const results = useMemo(() => adapter.searchItems(query, 12), [adapter, query]);

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <input
        value={query}
        disabled={disabled}
        onFocus={() => setOpen(true)}
        onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
        placeholder={placeholder}
        className="min-h-11 w-full rounded-[12px] border border-[var(--border)] bg-[var(--surface-3)] px-3 text-xs font-bold text-[var(--foreground)] outline-none transition placeholder:text-[var(--foreground-muted)] focus:border-[var(--brand-primary)] disabled:opacity-40"
      />
      {open && query.trim() && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-[16px] border border-[var(--border)] bg-[var(--surface-elevated)] p-1.5 shadow-[var(--shadow-float)]">
          {results.length ? results.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => { onSelect(item); setQuery(""); setOpen(false); }}
              className="flex min-h-14 w-full items-center gap-3 rounded-[12px] px-2.5 py-2 text-left transition hover:bg-[var(--surface-interactive)]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--surface-3)]">
                {item.image ? <img src={item.image} alt="" className="h-10 w-10 object-contain" /> : <span>📦</span>}
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-xs font-black text-[var(--foreground)]">{item.name}</strong>
                <span className="mt-0.5 block truncate text-[9px] font-bold uppercase tracking-[.08em] text-[var(--foreground-muted)]">{item.category}{item.demandLabel ? ` · Demand ${item.demandLabel}` : ""}</span>
              </span>
            </button>
          )) : <p className="px-3 py-6 text-center text-xs font-bold text-[var(--foreground-muted)]">No {adapter.shortName} items found.</p>}
        </div>
      )}
    </div>
  );
}

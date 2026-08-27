"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type SearchItem = {
  NAME: string;
  CATEGORY?: string;
  SOURCE_VALUE?: number;
  DEMAND?: number;
};

function formatValue(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return "N/A";
  return value.toLocaleString();
}

export default function MM2HeroSearch({
  items,
  suggestions,
}: {
  items: SearchItem[];
  suggestions: string[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];

    return items
      .filter((item) => {
        const name = item.NAME.toLowerCase();
        return name.includes(normalized);
      })
      .sort((a, b) => (b.SOURCE_VALUE ?? 0) - (a.SOURCE_VALUE ?? 0) || a.NAME.localeCompare(b.NAME))
      .slice(0, 6);
  }, [items, query]);

  function goToValues(value: string) {
    const q = value.trim();
    router.push(q ? `/mm2/values?q=${encodeURIComponent(q)}` : "/mm2/values");
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="flex min-h-[72px] items-center gap-3 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.03))] p-3 shadow-[0_18px_50px_rgba(0,0,0,.28)] backdrop-blur-xl">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-lg text-red-100 ring-1 ring-white/10">
            ⌕
          </div>
          <div className="min-w-0 flex-1">
            <label htmlFor="mm2-home-search" className="sr-only">Search MM2 weapons</label>
            <input
              id="mm2-home-search"
              value={query}
              onFocus={() => setFocused(true)}
              onBlur={() => window.setTimeout(() => setFocused(false), 120)}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  goToValues(query);
                }
              }}
              placeholder="Search Harvester, Chroma Luger, Elderwood, Sakura..."
              className="w-full bg-transparent text-base font-bold text-white outline-none placeholder:text-slate-500 sm:text-lg"
            />
            <p className="mt-1 text-xs font-semibold text-slate-400">Search from the MM2 catalog, then jump into the value board.</p>
          </div>
          <button
            type="button"
            onClick={() => goToValues(query)}
            className="rounded-2xl bg-red-500 px-4 py-3 text-sm font-black text-white shadow-[0_10px_30px_rgba(239,68,68,.35)] transition hover:bg-red-400"
          >
            Open values
          </button>
        </div>

        {focused && results.length > 0 ? (
          <div className="absolute inset-x-0 top-[calc(100%+10px)] z-20 overflow-hidden rounded-[24px] border border-white/10 bg-[#0d1017]/98 p-2 shadow-[0_24px_60px_rgba(0,0,0,.4)]">
            {results.map((item) => (
              <button
                key={item.NAME}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => goToValues(item.NAME)}
                className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-white/[0.05]"
              >
                <div>
                  <p className="text-sm font-black text-white">{item.NAME}</p>
                  <p className="text-xs font-semibold text-slate-400">{item.CATEGORY || "Weapon"} · Demand {item.DEMAND ?? "N/A"}</p>
                </div>
                <span className="text-sm font-black text-red-100">{formatValue(item.SOURCE_VALUE)}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
        <span className="mr-1 text-slate-400">Quick picks</span>
        {suggestions.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => goToValues(item)}
            className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[11px] text-slate-300 transition hover:border-red-300/30 hover:bg-red-500/10 hover:text-white"
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

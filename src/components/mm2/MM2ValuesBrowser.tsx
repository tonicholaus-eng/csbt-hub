"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import MM2WeaponCard from "./MM2WeaponCard";

type Item = {
  ID?: string;
  NAME?: string;
  CATEGORY?: string;
  SOURCE_VALUE?: number;
  GCASH_VALUE?: number | null;
  DEMAND?: number | string;
  IMAGE?: string;
  UPDATED_AT?: string;
};

type SortMode = "AZ" | "VALUE_HIGH" | "DEMAND_HIGH" | "RECENT";

const PAGE_SIZE = 60;
const preferredCategories = ["GODLY", "CHROMA", "ANCIENT", "VINTAGE", "UNIQUE"];

function demandNumber(value: Item["DEMAND"]) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : -1;
}

export default function MM2ValuesBrowser({ items }: { items: Item[] }) {
  const params = useSearchParams();
  const [search, setSearch] = useState(params.get("q") || "");
  const [category, setCategory] = useState("ALL");
  const [demand, setDemand] = useState("ALL");
  const [sort, setSort] = useState<SortMode>("AZ");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      if (!item.CATEGORY) continue;
      counts.set(item.CATEGORY, (counts.get(item.CATEGORY) || 0) + 1);
    }
    return counts;
  }, [items]);

  const categories = useMemo(() => {
    const actual = Array.from(categoryCounts.keys());
    const preferred = preferredCategories.filter((value) => actual.includes(value));
    const remaining = actual
      .filter((value) => !preferredCategories.includes(value))
      .sort((a, b) => a.localeCompare(b));
    return ["ALL", ...preferred, ...remaining];
  }, [categoryCounts]);

  const demandOptions = useMemo(() => {
    return Array.from(
      new Set(
        items
          .map((item) => demandNumber(item.DEMAND))
          .filter((value) => value >= 0),
      ),
    ).sort((a, b) => b - a);
  }, [items]);

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();

    const result = items.filter((item) => {
      if (category !== "ALL" && item.CATEGORY !== category) return false;
      if (demand !== "ALL" && demandNumber(item.DEMAND) !== Number(demand)) return false;
      if (query) {
        const haystack = `${item.NAME || ""} ${item.CATEGORY || ""}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });

    return [...result].sort((a, b) => {
      if (sort === "VALUE_HIGH") {
        return (b.SOURCE_VALUE ?? -1) - (a.SOURCE_VALUE ?? -1) || (a.NAME || "").localeCompare(b.NAME || "");
      }
      if (sort === "DEMAND_HIGH") {
        return demandNumber(b.DEMAND) - demandNumber(a.DEMAND) || (a.NAME || "").localeCompare(b.NAME || "");
      }
      if (sort === "RECENT") {
        return new Date(b.UPDATED_AT ?? 0).getTime() - new Date(a.UPDATED_AT ?? 0).getTime() || (a.NAME || "").localeCompare(b.NAME || "");
      }
      return (a.NAME || "").localeCompare(b.NAME || "", undefined, { numeric: true, sensitivity: "base" });
    });
  }, [items, category, demand, search, sort]);

  const visibleItems = filtered.slice(0, visibleCount);
  const hasFilters = category !== "ALL" || demand !== "ALL" || Boolean(search.trim()) || sort !== "AZ";

  function resetVisible() {
    setVisibleCount(PAGE_SIZE);
  }

  function clearFilters() {
    setSearch("");
    setCategory("ALL");
    setDemand("ALL");
    setSort("AZ");
    setVisibleCount(PAGE_SIZE);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-white/[0.08] pb-6 pt-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-red-300">Weapon Values</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">MM2 Trading Values</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            Search the MM2 database, compare Supreme values and demand, then open any weapon for its full profile.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/mm2/demand"
            className="rounded-full border border-cyan-400/15 bg-cyan-500/[0.05] px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-200 transition hover:bg-cyan-500/[0.08]"
          >
            Open Demand Intel →
          </Link>
          <div className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-400">
            {items.length.toLocaleString()} weapons
          </div>
        </div>
      </header>

      <section className="rounded-[24px] border border-white/[0.08] bg-white/[0.025] p-4 sm:p-5">
        <label className="block">
          <span className="sr-only">Search MM2 weapon values</span>
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              resetVisible();
            }}
            placeholder="Search Harvester, Luger, Icebreaker..."
            className="min-h-12 w-full rounded-[14px] border border-white/[0.09] bg-black/30 px-4 text-sm font-bold text-white outline-none transition placeholder:text-zinc-600 focus:border-red-400/45"
          />
        </label>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="Weapon categories">
          {categories.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={category === value}
              onClick={() => {
                setCategory(value);
                resetVisible();
              }}
              className={`shrink-0 rounded-full border px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.09em] transition ${
                category === value
                  ? "border-red-400/45 bg-red-500/15 text-red-100"
                  : "border-white/[0.08] bg-white/[0.025] text-zinc-400 hover:border-white/[0.14] hover:text-white"
              }`}
            >
              {value === "ALL" ? "All" : value}
              <span className="ml-1.5 opacity-45">
                {value === "ALL" ? items.length : categoryCounts.get(value) || 0}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <select
            value={demand}
            onChange={(event) => {
              setDemand(event.target.value);
              resetVisible();
            }}
            aria-label="Filter by demand"
            className="min-h-11 rounded-[13px] border border-white/[0.08] bg-[#0b0c12] px-3 text-xs font-black text-zinc-200 outline-none"
          >
            <option value="ALL">All demand scores</option>
            {demandOptions.map((value) => (
              <option key={value} value={String(value)}>{value}/10 demand</option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(event) => {
              setSort(event.target.value as SortMode);
              resetVisible();
            }}
            aria-label="Sort weapon values"
            className="min-h-11 rounded-[13px] border border-white/[0.08] bg-[#0b0c12] px-3 text-xs font-black text-zinc-200 outline-none"
          >
            <option value="AZ">A–Z</option>
            <option value="VALUE_HIGH">Highest Supreme value</option>
            <option value="DEMAND_HIGH">Highest demand</option>
            <option value="RECENT">Recently updated</option>
          </select>
        </div>
      </section>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-black text-zinc-300">{filtered.length.toLocaleString()} matching weapons</p>
        {hasFilters ? (
          <button type="button" onClick={clearFilters} className="min-h-10 px-2 text-xs font-black text-red-300 hover:text-red-200">
            Clear filters
          </button>
        ) : null}
      </div>

      {visibleItems.length ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visibleItems.map((item, index) => (
              <MM2WeaponCard key={item.ID || `${item.NAME}-${index}`} item={item as any} />
            ))}
          </section>

          {visibleItems.length < filtered.length ? (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setVisibleCount((current) => Math.min(filtered.length, current + PAGE_SIZE))}
                className="min-h-11 rounded-[14px] border border-white/[0.1] bg-white/[0.04] px-5 text-xs font-black text-zinc-200 transition hover:border-red-400/30 hover:bg-red-500/[0.06]"
              >
                Load more ({(filtered.length - visibleItems.length).toLocaleString()} left)
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <section className="rounded-[24px] border border-dashed border-white/[0.1] bg-white/[0.02] px-6 py-14 text-center">
          <div className="text-3xl text-zinc-600">⌕</div>
          <h2 className="mt-3 text-lg font-black text-white">No weapons match those filters</h2>
          <p className="mt-2 text-sm text-zinc-500">Try another search, category, or demand score.</p>
          <button type="button" onClick={clearFilters} className="mt-5 text-xs font-black text-red-300 hover:text-red-200">Clear filters</button>
        </section>
      )}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import MM2WeaponCard from "./MM2WeaponCard";
import MM2PageHeader from "./MM2PageHeader";

// Mirrors the generated shape of src/data/mm2Items.json. 189 of the 1,099
// weapons legitimately have no Supreme value or demand (untradables, EVO
// variants), so those fields are nullable and must not be typed as required.
type Item = {
  ID?: string;
  NAME: string;
  CATEGORY?: string;
  SOURCE_VALUE?: number | null;
  GCASH_VALUE?: number | null;
  DEMAND?: number | string | null;
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
      <MM2PageHeader
        eyebrow="Weapon Values"
        title="MM2 Trading Values"
        description="Search the MM2 database, compare Supreme values and demand, then open any weapon for its full profile."
        actions={
          <>
            <span className="inline-flex min-h-11 items-center rounded-[11px] border border-[var(--mm2-edge)] bg-white/[0.03] px-3.5 text-[12px] font-black text-[var(--mm2-ink-2)]">
              {items.length.toLocaleString()} weapons
            </span>
            <Link
              href="/mm2/demand"
              className="inline-flex min-h-11 items-center rounded-[11px] border border-[var(--mm2-edge-lit)] bg-[rgba(226,52,74,.07)] px-4 text-[12px] font-black text-[#f0919b] transition hover:bg-[rgba(226,52,74,.12)] hover:text-white"
            >
              Demand Intelligence →
            </Link>
          </>
        }
      />

      <section className="rounded-[20px] border border-[var(--mm2-edge)] bg-[var(--mm2-bay)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.03)] sm:p-5">
        <label className="block">
          <span className="sr-only">Search MM2 weapon values</span>
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              resetVisible();
            }}
            placeholder="Search Harvester, Luger, Icebreaker..."
            className="min-h-[52px] w-full rounded-[13px] border border-[var(--mm2-edge-strong)] bg-black/40 px-4 text-[15px] font-bold text-white outline-none transition placeholder:text-[var(--mm2-ink-4)] focus:border-[var(--mm2-crimson)] focus:ring-2 focus:ring-[rgba(226,52,74,.18)]"
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
              className={`inline-flex min-h-11 shrink-0 items-center rounded-[11px] border px-3.5 text-[12px] font-black uppercase tracking-[0.07em] transition ${
                category === value
                  ? "border-[var(--mm2-edge-lit)] bg-[rgba(226,52,74,.14)] text-[#ffd7dc]"
                  : "border-[var(--mm2-edge)] bg-white/[0.025] text-[var(--mm2-ink-3)] hover:border-[var(--mm2-edge-strong)] hover:text-white"
              }`}
            >
              {value === "ALL" ? "All" : value}
              <span className="ml-1.5 text-[var(--mm2-ink-4)]">
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
            className="min-h-11 rounded-[12px] border border-[var(--mm2-edge-strong)] bg-[#090c12] px-3 text-[13px] font-black text-[var(--mm2-ink-2)] outline-none transition focus:border-[var(--mm2-crimson)]"
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
            className="min-h-11 rounded-[12px] border border-[var(--mm2-edge-strong)] bg-[#090c12] px-3 text-[13px] font-black text-[var(--mm2-ink-2)] outline-none transition focus:border-[var(--mm2-crimson)]"
          >
            <option value="AZ">A–Z</option>
            <option value="VALUE_HIGH">Highest Supreme value</option>
            <option value="DEMAND_HIGH">Highest demand</option>
            <option value="RECENT">Recently updated</option>
          </select>
        </div>
      </section>

      <div className="flex items-center justify-between gap-3">
        <p className="text-[14px] font-black text-[var(--mm2-ink-2)]">
          <span className="tabular-nums text-white">{filtered.length.toLocaleString()}</span> matching weapons
        </p>
        {hasFilters ? (
          <button type="button" onClick={clearFilters} className="min-h-11 rounded-[10px] px-3 text-[13px] font-black text-[#f0919b] transition hover:bg-white/[0.04] hover:text-white">
            Clear filters
          </button>
        ) : null}
      </div>

      {visibleItems.length ? (
        <>
          <section className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {visibleItems.map((item, index) => (
              <MM2WeaponCard key={item.ID || `${item.NAME}-${index}`} item={item} />
            ))}
          </section>

          {visibleItems.length < filtered.length ? (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setVisibleCount((current) => Math.min(filtered.length, current + PAGE_SIZE))}
                className="min-h-12 rounded-[13px] border border-[var(--mm2-edge-strong)] bg-white/[0.04] px-6 text-[13px] font-black text-[var(--mm2-ink-2)] transition hover:border-[var(--mm2-edge-lit)] hover:bg-[rgba(226,52,74,.07)] hover:text-white"
              >
                Load more ({(filtered.length - visibleItems.length).toLocaleString()} left)
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <section className="rounded-[20px] border border-dashed border-[var(--mm2-edge-strong)] bg-[var(--mm2-bay)] px-6 py-16 text-center">
          <h2 className="text-[20px] font-black tracking-[-.02em] text-white">No weapons match those filters</h2>
          <p className="mx-auto mt-2.5 max-w-md text-[14px] leading-relaxed text-[var(--mm2-ink-3)]">
            Nothing in the {items.length.toLocaleString()}-weapon catalog fits that combination. Try another
            search term, category, or demand score.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-6 inline-flex min-h-11 items-center rounded-[12px] border border-[var(--mm2-edge-lit)] bg-[rgba(226,52,74,.07)] px-5 text-[13px] font-black text-[#f0919b] transition hover:bg-[rgba(226,52,74,.12)] hover:text-white"
          >
            Clear filters
          </button>
        </section>
      )}
    </div>
  );
}

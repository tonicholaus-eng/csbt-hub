"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import Navbar from "../../components/Navbar";
import SearchResults from "../../components/SearchResults";
import tradingMeta from "../../data/tradingMeta.json";
import valueSources from "../../data/valueSources.json";
import { ITEM_CATEGORY_ORDER, getItemCategoryDetails } from "../../lib/itemCategory";
import type { DemandTier, ItemCategory, TradeItem } from "../../components/trade/types";
import { EmptyState, PageHeader } from "../../components/ui/CSBTUI";

type SortMode = "AZ" | "GCASH_HIGH" | "ELVE_HIGH" | "DEMAND" | "RECENT";
type ItemsResponse = { items: TradeItem[]; total: number; rarities: string[]; hasDemandData?: boolean };
const PAGE_SIZE = 60;

function formatDate(value?: string) {
  if (!value) return "Unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export default function ValuesPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState<ItemCategory | "ALL">("ALL");
  const [rarity, setRarity] = useState("ALL");
  const [demand, setDemand] = useState<DemandTier | "ALL">("ALL");
  const [sort, setSort] = useState<SortMode>("AZ");
  const [items, setItems] = useState<TradeItem[]>([]);
  const [total, setTotal] = useState(Number(tradingMeta.totalItems));
  const [rarities, setRarities] = useState<string[]>([]);
  const [hasDemandData, setHasDemandData] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 180);
    return () => window.clearTimeout(timer);
  }, [search]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      q: debouncedSearch,
      category,
      rarity,
      demand: hasDemandData ? demand : "ALL",
      sort: sort === "DEMAND" && !hasDemandData ? "AZ" : sort,
      limit: String(PAGE_SIZE),
      offset: "0",
    });
    return params.toString();
  }, [category, debouncedSearch, demand, hasDemandData, rarity, sort]);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => setLoading(true));
    queueMicrotask(() => setError(null));
    void fetch(`/api/items?${queryString}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Values request failed (${response.status}).`);
        return response.json() as Promise<ItemsResponse>;
      })
      .then((payload) => {
        setItems(Array.isArray(payload.items) ? payload.items : []);
        setTotal(Number(payload.total) || 0);
        if (Array.isArray(payload.rarities)) setRarities(payload.rarities);
        setHasDemandData(Boolean(payload.hasDemandData));
      })
      .catch((caught: unknown) => {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setError(caught instanceof Error ? caught.message : "Could not load values.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [queryString]);

  const loadMore = useCallback(async () => {
    if (loadingMore || items.length >= total) return;
    setLoadingMore(true);
    setError(null);
    try {
      const params = new URLSearchParams(queryString);
      params.set("offset", String(items.length));
      const response = await fetch(`/api/items?${params.toString()}`);
      if (!response.ok) throw new Error(`Values request failed (${response.status}).`);
      const payload = await response.json() as ItemsResponse;
      setItems((current) => {
        const seen = new Set(current.map((item) => item.ID));
        return [...current, ...(payload.items ?? []).filter((item) => !seen.has(item.ID))];
      });
      const nextTotal = Number(payload.total);
      if (Number.isFinite(nextTotal)) setTotal(nextTotal);
      if (Array.isArray(payload.rarities)) setRarities(payload.rarities);
      setHasDemandData(Boolean(payload.hasDemandData));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load more values.");
    } finally {
      setLoadingMore(false);
    }
  }, [items, loadingMore, queryString, total]);

  const categoryCounts = (tradingMeta as { categoryCounts?: Record<string, number> }).categoryCounts ?? {};
  const elveUpdatedAt = (valueSources as { sources?: { ELVE?: { updatedAt?: string } } }).sources?.ELVE?.updatedAt;
  const hasFilters = category !== "ALL" || rarity !== "ALL" || (hasDemandData && demand !== "ALL") || Boolean(search.trim()) || sort !== "AZ";

  function clearFilters() {
    setSearch("");
    setDebouncedSearch("");
    setCategory("ALL");
    setRarity("ALL");
    setDemand("ALL");
    setSort("AZ");
  }

  return <main className="csbt-page overflow-x-hidden">
    <Navbar/>
    <div className="relative z-10 min-w-0 lg:pl-[268px]">
      <div className="csbt-app-workspace max-w-[1580px]">
        <PageHeader eyebrow="Start Here" title="Adopt Me Trading Values" description={`Search all ${Number(tradingMeta.totalItems).toLocaleString()} supported items across GCash and Elve Shark values.`} actions={<div className="flex flex-wrap gap-2 text-[10px] font-black text-[var(--foreground-muted)]"><span className="csbt-badge csbt-badge-neutral">Database {formatDate(tradingMeta.generatedAt)}</span><span className="csbt-badge csbt-badge-neutral">Elve {formatDate(elveUpdatedAt)}</span></div>}/>

        <section className="rounded-[var(--radius-section)] bg-[var(--surface-1)] p-4 shadow-[var(--shadow-sm)] ring-1 ring-[var(--border)] sm:p-5">
          <label className="block">
            <span className="sr-only">Search values</span>
            <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search Frost Dragon, Bathtub, sticker, food…" className="min-h-12 w-full rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-[var(--surface-2)] px-4 text-sm font-bold outline-none transition focus:border-[var(--gold)]"/>
          </label>
          <div className="csbt-tabs mt-4" aria-label="Item categories">
            <button type="button" aria-pressed={category==="ALL"} onClick={()=>setCategory("ALL")} className="csbt-tab">All <span className="ml-1 opacity-50">{tradingMeta.totalItems}</span></button>
            {ITEM_CATEGORY_ORDER.map((value)=>{const d=getItemCategoryDetails(value);return <button key={value} type="button" aria-pressed={category===value} onClick={()=>setCategory(value)} className="csbt-tab">{d.icon} {d.pluralLabel} <span className="ml-1 opacity-50">{categoryCounts[value] ?? 0}</span></button>})}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <select value={rarity} onChange={(e)=>setRarity(e.target.value)} aria-label="Filter by rarity" className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-3)] px-3 text-xs font-black"><option value="ALL">All rarities</option>{rarities.map((r)=><option key={r} value={r}>{r}</option>)}</select>
            {hasDemandData ? <select value={demand} onChange={(e)=>setDemand(e.target.value as DemandTier|"ALL")} aria-label="Filter by demand tier" className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-3)] px-3 text-xs font-black"><option value="ALL">All demand tiers</option>{["S","A","B","C","D"].map((d)=><option key={d} value={d}>{d} tier</option>)}</select> : <div className="flex min-h-11 items-center rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-3)] px-3 text-xs font-bold text-[var(--foreground-muted)]">Catalog demand tiers unavailable</div>}
            <select value={sort} onChange={(e)=>setSort(e.target.value as SortMode)} aria-label="Sort values" className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-3)] px-3 text-xs font-black"><option value="AZ">A–Z</option><option value="GCASH_HIGH">Highest GCash</option><option value="ELVE_HIGH">Highest Elve</option>{hasDemandData ? <option value="DEMAND">Highest demand</option> : null}<option value="RECENT">Recently updated</option></select>
          </div>
        </section>

        <div className="mt-5 flex items-center justify-between gap-3"><p className="text-sm font-black text-[var(--foreground)]">{loading && !items.length ? "Loading values…" : `${total.toLocaleString()} matching items`}</p>{hasFilters&&<button type="button" onClick={clearFilters} className="min-h-11 px-2 text-xs font-black text-[var(--gold-dark)] dark:text-[var(--gold-bright)]">Clear filters</button>}</div>
        {error && <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300">{error}</div>}
        {loading && !items.length ? <div className="mt-5 grid animate-pulse grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{Array.from({length:10},(_,i)=><div key={i} className="h-52 rounded-2xl bg-[var(--surface-3)]"/>)}</div> : items.length ? <><SearchResults pets={items}/>{items.length<total&&<div className="mt-6 text-center"><button type="button" disabled={loadingMore} onClick={()=>void loadMore()} className="csbt-btn-secondary disabled:opacity-60">{loadingMore ? "Loading…" : `Load more (${(total-items.length).toLocaleString()} left)`}</button></div>}</> : !loading && <div className="mt-8"><EmptyState icon="⌕" title="No items match those filters" description="Try another search or clear one of the rarity, category, or demand filters." onAction={clearFilters} actionLabel="Clear filters"/></div>}
      </div>
    </div>
  </main>;
}

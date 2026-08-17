"use client";

import { useEffect, useMemo, useState } from "react";

import Navbar from "../../components/Navbar";
import SearchResults from "../../components/SearchResults";
import tradingMeta from "../../data/tradingMeta.json";
import valueSources from "../../data/valueSources.json";
import { ITEM_CATEGORY_ORDER, getItemCategoryDetails } from "../../lib/itemCategory";
import { itemList, searchItems } from "../../lib/search";
import { getItemValue, parseTradeValue } from "../../lib/valueSystem";
import type { DemandTier, ItemCategory, TradeItem } from "../../components/trade/types";
import { EmptyState, PageHeader } from "../../components/ui/CSBTUI";

type SortMode = "AZ" | "GCASH_HIGH" | "ELVE_HIGH" | "DEMAND" | "RECENT";
const PAGE_SIZE = 60;
const demandOrder: Record<string, number> = { S: 0, A: 1, B: 2, C: 3, D: 4 };

function formatDate(value?: string) {
  if (!value) return "Unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function normalValue(item: TradeItem, source: "GCASH" | "ELVE") {
  return parseTradeValue(getItemValue(item, source, "NORMAL")) ?? -1;
}

export default function ValuesPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState<ItemCategory | "ALL">("ALL");
  const [rarity, setRarity] = useState("ALL");
  const [demand, setDemand] = useState<DemandTier | "ALL">("ALL");
  const [sort, setSort] = useState<SortMode>("AZ");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setVisibleCount(PAGE_SIZE);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [search]);

  const rarities = useMemo(
    () => Array.from(new Set(itemList.map((item) => item.RARITY?.trim()).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b)),
    [],
  );
  const hasDemandData = useMemo(() => itemList.some((item) => Boolean(item.DEMAND_TIER)), []);

  const filteredItems = useMemo(() => {
    const base = debouncedSearch ? searchItems(debouncedSearch, itemList.length) : itemList;
    const filtered = base.filter((item) => {
      if (category !== "ALL" && item.CATEGORY !== category) return false;
      if (rarity !== "ALL" && (item.RARITY ?? "").toLowerCase() !== rarity.toLowerCase()) return false;
      if (hasDemandData && demand !== "ALL" && item.DEMAND_TIER !== demand) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sort === "GCASH_HIGH") return normalValue(b, "GCASH") - normalValue(a, "GCASH") || a.NAME.localeCompare(b.NAME);
      if (sort === "ELVE_HIGH") return normalValue(b, "ELVE") - normalValue(a, "ELVE") || a.NAME.localeCompare(b.NAME);
      if (sort === "DEMAND" && hasDemandData) return (demandOrder[a.DEMAND_TIER ?? ""] ?? 99) - (demandOrder[b.DEMAND_TIER ?? ""] ?? 99) || a.NAME.localeCompare(b.NAME);
      if (sort === "RECENT") return new Date(b.UPDATED_AT ?? 0).getTime() - new Date(a.UPDATED_AT ?? 0).getTime() || a.NAME.localeCompare(b.NAME);
      return a.NAME.localeCompare(b.NAME, undefined, { numeric: true, sensitivity: "base" });
    });
  }, [category, debouncedSearch, demand, hasDemandData, rarity, sort]);


  const items = filteredItems.slice(0, visibleCount);
  const total = filteredItems.length;
  const categoryCounts = (tradingMeta as { categoryCounts?: Record<string, number> }).categoryCounts ?? {};
  const elveUpdatedAt = (valueSources as { sources?: { ELVE?: { updatedAt?: string } } }).sources?.ELVE?.updatedAt;
  const hasFilters = category !== "ALL" || rarity !== "ALL" || (hasDemandData && demand !== "ALL") || Boolean(search.trim()) || sort !== "AZ";

  function selectCategory(value: ItemCategory | "ALL") {
    setCategory(value);
    setVisibleCount(PAGE_SIZE);
  }

  function selectRarity(value: string) {
    setRarity(value);
    setVisibleCount(PAGE_SIZE);
  }

  function selectDemand(value: DemandTier | "ALL") {
    setDemand(value);
    setVisibleCount(PAGE_SIZE);
  }

  function selectSort(value: SortMode) {
    setSort(value);
    setVisibleCount(PAGE_SIZE);
  }

  function clearFilters() {
    setSearch("");
    setDebouncedSearch("");
    setCategory("ALL");
    setRarity("ALL");
    setDemand("ALL");
    setSort("AZ");
    setVisibleCount(PAGE_SIZE);
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
            <button type="button" aria-pressed={category==="ALL"} onClick={()=>selectCategory("ALL")} className="csbt-tab">All <span className="ml-1 opacity-50">{tradingMeta.totalItems}</span></button>
            {ITEM_CATEGORY_ORDER.map((value)=>{const d=getItemCategoryDetails(value);return <button key={value} type="button" aria-pressed={category===value} onClick={()=>selectCategory(value)} className="csbt-tab">{d.icon} {d.pluralLabel} <span className="ml-1 opacity-50">{categoryCounts[value] ?? 0}</span></button>})}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <select value={rarity} onChange={(e)=>selectRarity(e.target.value)} aria-label="Filter by rarity" className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-3)] px-3 text-xs font-black"><option value="ALL">All rarities</option>{rarities.map((r)=><option key={r} value={r}>{r}</option>)}</select>
            {hasDemandData ? <select value={demand} onChange={(e)=>selectDemand(e.target.value as DemandTier|"ALL")} aria-label="Filter by demand tier" className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-3)] px-3 text-xs font-black"><option value="ALL">All demand tiers</option>{["S","A","B","C","D"].map((d)=><option key={d} value={d}>{d} tier</option>)}</select> : <div className="flex min-h-11 items-center rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-3)] px-3 text-xs font-bold text-[var(--foreground-muted)]">Catalog demand tiers unavailable</div>}
            <select value={sort} onChange={(e)=>selectSort(e.target.value as SortMode)} aria-label="Sort values" className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-3)] px-3 text-xs font-black"><option value="AZ">A–Z</option><option value="GCASH_HIGH">Highest GCash</option><option value="ELVE_HIGH">Highest Elve</option>{hasDemandData ? <option value="DEMAND">Highest demand</option> : null}<option value="RECENT">Recently updated</option></select>
          </div>
        </section>

        <div className="mt-5 flex items-center justify-between gap-3"><p className="text-sm font-black text-[var(--foreground)]">{`${total.toLocaleString()} matching items`}</p>{hasFilters&&<button type="button" onClick={clearFilters} className="min-h-11 px-2 text-xs font-black text-[var(--gold-dark)] dark:text-[var(--gold-bright)]">Clear filters</button>}</div>
        {items.length ? <><SearchResults pets={items}/>{items.length<total&&<div className="mt-6 text-center"><button type="button" onClick={()=>setVisibleCount((current)=>Math.min(total,current+PAGE_SIZE))} className="csbt-btn-secondary">{`Load more (${(total-items.length).toLocaleString()} left)`}</button></div>}</> : <div className="mt-8"><EmptyState icon="⌕" title="No items match those filters" description="Try another search or clear one of the rarity, category, or demand filters." onAction={clearFilters} actionLabel="Clear filters"/></div>}
      </div>
    </div>
  </main>;
}

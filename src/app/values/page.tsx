"use client";

import { useMemo, useState } from "react";
import Footer from "../../components/Footer";
import Navbar from "../../components/Navbar";
import SearchResults from "../../components/SearchResults";
import tradingMeta from "../../data/tradingMeta.json";
import valueSources from "../../data/valueSources.json";
import { ITEM_CATEGORY_ORDER, getItemCategoryDetails } from "../../lib/itemCategory";
import { itemList, searchItems } from "../../lib/search";
import { getItemValue, parseTradeValue } from "../../lib/valueSystem";
import type { DemandTier, ItemCategory } from "../../components/trade/types";
import { EmptyState, PageHeader } from "../../components/ui/CSBTUI";

type SortMode = "AZ" | "GCASH_HIGH" | "ELVE_HIGH" | "DEMAND" | "RECENT";
const demandOrder: Record<string, number> = { S: 0, A: 1, B: 2, C: 3, D: 4 };

function formatDate(value?: string) {
  if (!value) return "Unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export default function ValuesPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<ItemCategory | "ALL">("ALL");
  const [rarity, setRarity] = useState("ALL");
  const [demand, setDemand] = useState<DemandTier | "ALL">("ALL");
  const [sort, setSort] = useState<SortMode>("AZ");
  const [visibleCount, setVisibleCount] = useState(60);

  const rarities = useMemo(() => Array.from(new Set(itemList.map((item) => item.RARITY?.trim()).filter(Boolean) as string[])).sort((a,b)=>a.localeCompare(b)), []);

  const results = useMemo(() => {
    const base = search.trim() ? searchItems(search, 500) : itemList;
    const filtered = base.filter((item) => {
      if (category !== "ALL" && item.CATEGORY !== category) return false;
      if (rarity !== "ALL" && (item.RARITY ?? "").toLowerCase() !== rarity.toLowerCase()) return false;
      if (demand !== "ALL" && item.DEMAND_TIER !== demand) return false;
      return true;
    });

    return [...filtered].sort((a,b) => {
      if (sort === "GCASH_HIGH") return (parseTradeValue(getItemValue(b,"GCASH","NORMAL")) ?? -1) - (parseTradeValue(getItemValue(a,"GCASH","NORMAL")) ?? -1) || a.NAME.localeCompare(b.NAME);
      if (sort === "ELVE_HIGH") return (parseTradeValue(getItemValue(b,"ELVE","NORMAL")) ?? -1) - (parseTradeValue(getItemValue(a,"ELVE","NORMAL")) ?? -1) || a.NAME.localeCompare(b.NAME);
      if (sort === "DEMAND") return (demandOrder[a.DEMAND_TIER ?? ""] ?? 99) - (demandOrder[b.DEMAND_TIER ?? ""] ?? 99) || a.NAME.localeCompare(b.NAME);
      if (sort === "RECENT") return new Date(b.UPDATED_AT ?? 0).getTime() - new Date(a.UPDATED_AT ?? 0).getTime() || a.NAME.localeCompare(b.NAME);
      return a.NAME.localeCompare(b.NAME, undefined, { numeric: true, sensitivity: "base" });
    });
  }, [category, demand, rarity, search, sort]);

  const categoryCounts = (tradingMeta as { categoryCounts?: Record<string, number> }).categoryCounts ?? {};
  const elveUpdatedAt = (valueSources as { sources?: { ELVE?: { updatedAt?: string } } }).sources?.ELVE?.updatedAt;
  const visible = results.slice(0, visibleCount);

  function resetPaging() { setVisibleCount(60); }

  return <main className="csbt-page overflow-x-hidden">
    <Navbar/>
    <div className="relative z-10 min-w-0 lg:pl-[268px]">
      <div className="csbt-workspace max-w-[1350px] pb-28 sm:pb-32">
        <PageHeader eyebrow="Start Here" title="Adopt Me Trading Values" description={`Search all ${Number(tradingMeta.totalItems).toLocaleString()} supported items across GCash and Elve Shark values.`} actions={<div className="flex flex-wrap gap-2 text-[10px] font-black text-[var(--foreground-muted)]"><span className="csbt-badge csbt-badge-neutral">Database {formatDate(tradingMeta.generatedAt)}</span><span className="csbt-badge csbt-badge-neutral">Elve {formatDate(elveUpdatedAt)}</span></div>}/>

        <section className="rounded-[var(--radius-section)] bg-[var(--surface-1)] p-4 shadow-[var(--shadow-sm)] ring-1 ring-[var(--border)] sm:p-5">
          <label className="block">
            <span className="sr-only">Search values</span>
            <input value={search} onChange={(e)=>{setSearch(e.target.value);resetPaging();}} placeholder="Search Frost Dragon, Bathtub, sticker, food…" className="min-h-12 w-full rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-[var(--surface-2)] px-4 text-sm font-bold outline-none transition focus:border-[var(--gold)]"/>
          </label>
          <div className="csbt-tabs mt-4" aria-label="Item categories">
            <button type="button" aria-selected={category==="ALL"} onClick={()=>{setCategory("ALL");resetPaging();}} className="csbt-tab">All <span className="ml-1 opacity-50">{tradingMeta.totalItems}</span></button>
            {ITEM_CATEGORY_ORDER.map((value)=>{const d=getItemCategoryDetails(value);return <button key={value} type="button" aria-selected={category===value} onClick={()=>{setCategory(value);resetPaging();}} className="csbt-tab">{d.icon} {d.pluralLabel} <span className="ml-1 opacity-50">{categoryCounts[value] ?? 0}</span></button>})}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <select value={rarity} onChange={(e)=>{setRarity(e.target.value);resetPaging();}} aria-label="Filter by rarity" className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-3)] px-3 text-xs font-black"><option value="ALL">All rarities</option>{rarities.map((r)=><option key={r} value={r}>{r}</option>)}</select>
            <select value={demand} onChange={(e)=>{setDemand(e.target.value as DemandTier|"ALL");resetPaging();}} aria-label="Filter by demand tier" className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-3)] px-3 text-xs font-black"><option value="ALL">All demand tiers</option>{["S","A","B","C","D"].map((d)=><option key={d} value={d}>{d} tier</option>)}</select>
            <select value={sort} onChange={(e)=>setSort(e.target.value as SortMode)} aria-label="Sort values" className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-3)] px-3 text-xs font-black"><option value="AZ">A–Z</option><option value="GCASH_HIGH">Highest GCash</option><option value="ELVE_HIGH">Highest Elve</option><option value="DEMAND">Highest demand</option><option value="RECENT">Recently updated</option></select>
          </div>
        </section>

        <div className="mt-5 flex items-center justify-between gap-3"><p className="text-sm font-black text-[var(--foreground)]">{results.length.toLocaleString()} matching items</p>{(category!=="ALL"||rarity!=="ALL"||demand!=="ALL"||search)&&<button type="button" onClick={()=>{setSearch("");setCategory("ALL");setRarity("ALL");setDemand("ALL");setSort("AZ");resetPaging();}} className="min-h-11 px-2 text-xs font-black text-[var(--gold-dark)] dark:text-[var(--gold-bright)]">Clear filters</button>}</div>
        {visible.length ? <><SearchResults pets={visible}/>{visibleCount<results.length&&<div className="mt-6 text-center"><button type="button" onClick={()=>setVisibleCount((v)=>v+60)} className="csbt-btn-secondary">Load more ({(results.length-visibleCount).toLocaleString()} left)</button></div>}</> : <div className="mt-8"><EmptyState icon="⌕" title="No items match those filters" description="Try another search or clear one of the rarity, category, or demand filters." onAction={()=>{setSearch("");setCategory("ALL");setRarity("ALL");setDemand("ALL");setSort("AZ");resetPaging();}} actionLabel="Clear filters"/></div>}
      </div>
      <Footer/>
    </div>
  </main>;
}

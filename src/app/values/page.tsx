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

  return <main className="relative min-h-screen overflow-x-hidden bg-[#fff8e9] text-slate-800 dark:bg-[#07111f] dark:text-slate-100">
    <Navbar/>
    <div className="relative z-10 min-w-0 lg:pl-72"><div className="mx-auto w-full max-w-[1320px] px-3 pb-28 pt-6 sm:px-6 sm:pb-32 sm:pt-9 lg:px-8">
      <header className="mx-auto max-w-3xl text-center"><p className="text-xs font-black uppercase tracking-[.2em] text-cyan-600 dark:text-cyan-300">Master Database</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">Adopt Me Trading Values</h1><p className="mt-3 text-sm leading-7 text-slate-500 sm:text-base">Search all {Number(tradingMeta.totalItems).toLocaleString()} items across GCash and Elve Shark values.</p><div className="mt-4 flex flex-wrap justify-center gap-2 text-[10px] font-black text-slate-400"><span className="rounded-full bg-white/70 px-3 py-1.5 dark:bg-white/5">Database {formatDate(tradingMeta.generatedAt)}</span><span className="rounded-full bg-white/70 px-3 py-1.5 dark:bg-white/5">Elve {formatDate(elveUpdatedAt)}</span></div></header>

      <section className="mt-7 rounded-[26px] border border-white/65 bg-white/75 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/65">
        <input value={search} onChange={(e)=>{setSearch(e.target.value);resetPaging();}} placeholder="Search Frost Dragon, Bathtub, sticker, food…" className="min-h-13 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-300/15 dark:border-white/10 dark:bg-slate-900"/>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">
          <button type="button" onClick={()=>{setCategory("ALL");resetPaging();}} className={`shrink-0 rounded-2xl px-4 py-3 text-xs font-black ${category==="ALL"?"bg-slate-900 text-white dark:bg-white dark:text-slate-950":"bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300"}`}>✨ All <span className="opacity-50">{tradingMeta.totalItems}</span></button>
          {ITEM_CATEGORY_ORDER.map((value)=>{const d=getItemCategoryDetails(value);return <button key={value} type="button" onClick={()=>{setCategory(value);resetPaging();}} className={`shrink-0 rounded-2xl px-4 py-3 text-xs font-black ${category===value?"bg-amber-400 text-slate-950":"bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300"}`}>{d.icon} {d.pluralLabel} <span className="opacity-50">{categoryCounts[value] ?? 0}</span></button>})}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <select value={rarity} onChange={(e)=>{setRarity(e.target.value);resetPaging();}} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black dark:border-white/10 dark:bg-slate-900"><option value="ALL">All rarities</option>{rarities.map((r)=><option key={r} value={r}>{r}</option>)}</select>
          <select value={demand} onChange={(e)=>{setDemand(e.target.value as DemandTier|"ALL");resetPaging();}} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black dark:border-white/10 dark:bg-slate-900"><option value="ALL">All demand tiers</option>{["S","A","B","C","D"].map((d)=><option key={d} value={d}>{d} tier</option>)}</select>
          <select value={sort} onChange={(e)=>setSort(e.target.value as SortMode)} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black dark:border-white/10 dark:bg-slate-900"><option value="AZ">A–Z</option><option value="GCASH_HIGH">Highest GCash</option><option value="ELVE_HIGH">Highest Elve</option><option value="DEMAND">Highest demand</option><option value="RECENT">Recently updated</option></select>
        </div>
      </section>

      <div className="mt-5 flex items-center justify-between gap-3"><p className="text-sm font-black text-slate-700 dark:text-slate-200">{results.length.toLocaleString()} matching items</p>{(category!=="ALL"||rarity!=="ALL"||demand!=="ALL"||search)&&<button type="button" onClick={()=>{setSearch("");setCategory("ALL");setRarity("ALL");setDemand("ALL");setSort("AZ");resetPaging();}} className="text-xs font-black text-amber-600">Clear filters</button>}</div>
      {visible.length ? <><SearchResults pets={visible}/>{visibleCount<results.length&&<div className="mt-6 text-center"><button type="button" onClick={()=>setVisibleCount((v)=>v+60)} className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-black shadow-sm dark:border-white/10 dark:bg-white/5">Load more ({(results.length-visibleCount).toLocaleString()} left)</button></div>}</> : <div className="mt-8 rounded-3xl border border-dashed border-slate-300 p-10 text-center dark:border-white/10"><p className="font-black">No items match those filters.</p><p className="mt-2 text-sm text-slate-400">Try clearing rarity or demand filters.</p></div>}
    </div><Footer/></div>
  </main>;
}

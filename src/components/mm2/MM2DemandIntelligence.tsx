"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

type Item = {
  ID?: string;
  NAME: string;
  CATEGORY?: string;
  TYPE?: string;
  SOURCE_VALUE?: number | null;
  GCASH_VALUE?: number | null;
  DEMAND?: number | string | null;
  IMAGE?: string;
};

type DemandTier = "ALL" | "VERY_HIGH" | "HIGH" | "ACTIVE" | "MODERATE" | "LOW" | "UNRATED";
type SortMode = "DEMAND" | "SUPREME" | "GCASH" | "AZ";

const PAGE_SIZE = 48;

function demandNumber(value: Item["DEMAND"]) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function demandTier(value: Item["DEMAND"]): Exclude<DemandTier, "ALL"> {
  const demand = demandNumber(value);
  if (demand === null) return "UNRATED";
  if (demand >= 8) return "VERY_HIGH";
  if (demand >= 6) return "HIGH";
  if (demand >= 4) return "ACTIVE";
  if (demand >= 2) return "MODERATE";
  return "LOW";
}

function tierLabel(tier: DemandTier) {
  switch (tier) {
    case "VERY_HIGH": return "Very High";
    case "HIGH": return "High";
    case "ACTIVE": return "Active";
    case "MODERATE": return "Moderate";
    case "LOW": return "Low";
    case "UNRATED": return "Unrated";
    default: return "All Demand";
  }
}

function tierDescription(tier: DemandTier) {
  switch (tier) {
    case "VERY_HIGH": return "8–10 demand";
    case "HIGH": return "6–7 demand";
    case "ACTIVE": return "4–5 demand";
    case "MODERATE": return "2–3 demand";
    case "LOW": return "1 demand";
    case "UNRATED": return "No demand score";
    default: return "Every weapon";
  }
}

function tierTone(tier: Exclude<DemandTier, "ALL">) {
  switch (tier) {
    case "VERY_HIGH": return "border-red-400/25 bg-red-500/[0.08] text-red-200";
    case "HIGH": return "border-orange-400/20 bg-orange-500/[0.07] text-orange-200";
    case "ACTIVE": return "border-amber-400/20 bg-amber-500/[0.07] text-amber-200";
    case "MODERATE": return "border-cyan-400/18 bg-cyan-500/[0.055] text-cyan-200";
    case "LOW": return "border-white/[0.09] bg-white/[0.035] text-zinc-300";
    case "UNRATED": return "border-white/[0.07] bg-black/20 text-zinc-500";
  }
}

function formatValue(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("en-US", { maximumFractionDigits: 2 })
    : "N/A";
}

function imageUrl(image?: string) {
  if (!image) return null;
  if (/^https?:\/\//i.test(image)) return image;
  const clean = image.replace(/^\.\.\//, "/").replace(/^\/+/, "/");
  return `https://supremevalues.com${clean}`;
}

function calcHref(item: Item) {
  const key = String(item.ID ?? item.NAME);
  return `/mm2/calculator?add=${encodeURIComponent(key)}&source=SUPREME`;
}

const tierOrder: DemandTier[] = ["ALL", "VERY_HIGH", "HIGH", "ACTIVE", "MODERATE", "LOW", "UNRATED"];

export default function MM2DemandIntelligence({ items }: { items: Item[] }) {
  const params = useSearchParams();
  const initialTier = tierOrder.includes((params.get("tier") ?? "") as DemandTier)
    ? ((params.get("tier") ?? "ALL") as DemandTier)
    : "ALL";
  const initialCategory = params.get("category") || "ALL";

  const [search, setSearch] = useState(params.get("q") || "");
  const [tier, setTier] = useState<DemandTier>(initialTier);
  const [category, setCategory] = useState(initialCategory);
  const [sort, setSort] = useState<SortMode>("DEMAND");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const ratedItems = useMemo(() => items.filter((item) => demandNumber(item.DEMAND) !== null), [items]);

  const tierCounts = useMemo(() => {
    const counts = new Map<Exclude<DemandTier, "ALL">, number>();
    for (const item of items) {
      const itemTier = demandTier(item.DEMAND);
      counts.set(itemTier, (counts.get(itemTier) ?? 0) + 1);
    }
    return counts;
  }, [items]);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      if (!item.CATEGORY) continue;
      counts.set(item.CATEGORY, (counts.get(item.CATEGORY) ?? 0) + 1);
    }
    return ["ALL", ...Array.from(counts.keys()).sort((a, b) => {
      const av = counts.get(a) ?? 0;
      const bv = counts.get(b) ?? 0;
      return bv - av || a.localeCompare(b);
    })];
  }, [items]);

  const categoryOverview = useMemo(() => {
    const groups = new Map<string, { category: string; count: number; rated: number; demandSum: number; highDemand: number }>();
    for (const item of items) {
      const name = item.CATEGORY ?? "OTHER";
      const current = groups.get(name) ?? { category: name, count: 0, rated: 0, demandSum: 0, highDemand: 0 };
      current.count += 1;
      const demand = demandNumber(item.DEMAND);
      if (demand !== null) {
        current.rated += 1;
        current.demandSum += demand;
        if (demand >= 6) current.highDemand += 1;
      }
      groups.set(name, current);
    }
    return Array.from(groups.values())
      .map((group) => ({ ...group, averageDemand: group.rated ? group.demandSum / group.rated : 0 }))
      .filter((group) => group.rated > 0)
      .sort((a, b) => b.averageDemand - a.averageDemand || b.highDemand - a.highDemand || b.rated - a.rated)
      .slice(0, 10);
  }, [items]);

  const topWeapons = useMemo(() => ratedItems.slice().sort((a, b) =>
    (demandNumber(b.DEMAND) ?? -1) - (demandNumber(a.DEMAND) ?? -1) ||
    (b.SOURCE_VALUE ?? -1) - (a.SOURCE_VALUE ?? -1) ||
    a.NAME.localeCompare(b.NAME)
  ).slice(0, 8), [ratedItems]);

  const highestDemand = useMemo(() => ratedItems.reduce((max, item) => Math.max(max, demandNumber(item.DEMAND) ?? 0), 0), [ratedItems]);
  const highDemandCount = useMemo(() => ratedItems.filter((item) => (demandNumber(item.DEMAND) ?? 0) >= 6).length, [ratedItems]);
  const averageDemand = useMemo(() => ratedItems.length ? ratedItems.reduce((sum, item) => sum + (demandNumber(item.DEMAND) ?? 0), 0) / ratedItems.length : 0, [ratedItems]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = items.filter((item) => {
      if (tier !== "ALL" && demandTier(item.DEMAND) !== tier) return false;
      if (category !== "ALL" && item.CATEGORY !== category) return false;
      if (query) {
        const haystack = `${item.NAME} ${item.CATEGORY ?? ""} ${item.TYPE ?? ""}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
    return result.sort((a, b) => {
      if (sort === "SUPREME") return (b.SOURCE_VALUE ?? -1) - (a.SOURCE_VALUE ?? -1) || (demandNumber(b.DEMAND) ?? -1) - (demandNumber(a.DEMAND) ?? -1) || a.NAME.localeCompare(b.NAME);
      if (sort === "GCASH") return (b.GCASH_VALUE ?? -1) - (a.GCASH_VALUE ?? -1) || (demandNumber(b.DEMAND) ?? -1) - (demandNumber(a.DEMAND) ?? -1) || a.NAME.localeCompare(b.NAME);
      if (sort === "AZ") return a.NAME.localeCompare(b.NAME, undefined, { numeric: true, sensitivity: "base" });
      return (demandNumber(b.DEMAND) ?? -1) - (demandNumber(a.DEMAND) ?? -1) || (b.SOURCE_VALUE ?? -1) - (a.SOURCE_VALUE ?? -1) || a.NAME.localeCompare(b.NAME);
    });
  }, [items, search, tier, category, sort]);

  const visibleItems = filtered.slice(0, visibleCount);
  function resetVisible() { setVisibleCount(PAGE_SIZE); }
  function clearFilters() { setSearch(""); setTier("ALL"); setCategory("ALL"); setSort("DEMAND"); setVisibleCount(PAGE_SIZE); }
  const hasFilters = Boolean(search.trim()) || tier !== "ALL" || category !== "ALL" || sort !== "DEMAND";

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#090c13] p-5 shadow-[0_24px_80px_rgba(0,0,0,.28)] sm:p-7">
        <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-red-500/12 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-cyan-500/[0.055] blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.018)_1px,transparent_1px)] bg-[size:38px_38px]" />
        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_470px] xl:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-red-400/18 bg-red-500/[0.07] px-3 py-1.5 text-[9px] font-black uppercase tracking-[.16em] text-red-200">MM2 Market Radar</span>
              <span className="rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1.5 text-[9px] font-black uppercase tracking-[.12em] text-zinc-500">Demand data only · no trend guessing</span>
            </div>
            <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-[-.055em] text-white sm:text-5xl">Demand Intelligence</h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-zinc-500">Find the MM2 weapons with the strongest current demand, compare demand against Supreme value, and move directly into weapon profiles or the Trade Calculator.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2">
            <HeroStat label="Rated weapons" value={ratedItems.length.toLocaleString()} />
            <HeroStat label="Highest demand" value={`${highestDemand}/10`} />
            <HeroStat label="6+ demand" value={highDemandCount.toLocaleString()} />
            <HeroStat label="Avg rated demand" value={`${averageDemand.toFixed(1)}/10`} />
          </div>
        </div>
      </header>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(390px,.65fr)]">
        <div className="overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#090c12]">
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-4 sm:px-5">
            <div><p className="text-[9px] font-black uppercase tracking-[.17em] text-red-300">Demand Leaderboard</p><h2 className="mt-1 text-xl font-black tracking-[-.03em] text-white">Strongest demand in the database</h2></div>
            <span className="rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1.5 text-[9px] font-black text-zinc-600">Demand → Value</span>
          </div>
          <div className="grid gap-2 p-3 sm:grid-cols-2 sm:p-4">
            {topWeapons.map((item, index) => <LeaderboardCard key={item.ID ?? item.NAME} item={item} rank={index + 1} />)}
          </div>
        </div>

        <div className="overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#090c12]">
          <div className="border-b border-white/[0.06] px-4 py-4 sm:px-5">
            <p className="text-[9px] font-black uppercase tracking-[.17em] text-cyan-300">Category Radar</p>
            <h2 className="mt-1 text-xl font-black tracking-[-.03em] text-white">Where demand is concentrated</h2>
            <p className="mt-1 text-[10px] font-semibold leading-5 text-zinc-600">Average demand uses only weapons that have a recorded demand score.</p>
          </div>
          <div className="space-y-2 p-3 sm:p-4">
            {categoryOverview.map((group) => (
              <CategoryDemandRow key={group.category} category={group.category} averageDemand={group.averageDemand} rated={group.rated} highDemand={group.highDemand} onClick={() => {
                setCategory(group.category); setTier("ALL"); resetVisible();
                document.getElementById("demand-browser")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }} />
            ))}
          </div>
        </div>
      </section>

      <section id="demand-browser" className="scroll-mt-6 rounded-[24px] border border-white/[0.08] bg-[#090c12] p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="text-[9px] font-black uppercase tracking-[.17em] text-red-300">Demand Browser</p><h2 className="mt-1 text-2xl font-black tracking-[-.035em] text-white">Scan the full MM2 market</h2></div>
          <div className="rounded-full border border-white/[0.07] bg-black/20 px-3 py-2 text-[9px] font-black uppercase tracking-[.1em] text-zinc-600">{filtered.length.toLocaleString()} matching weapons</div>
        </div>

        <label className="mt-4 block">
          <span className="sr-only">Search demand intelligence</span>
          <input value={search} onChange={(event) => { setSearch(event.target.value); resetVisible(); }} placeholder="Search weapon, category, or type..." className="min-h-[52px] w-full rounded-[15px] border border-white/[0.09] bg-black/30 px-4 text-sm font-bold text-white outline-none transition placeholder:text-zinc-700 focus:border-red-400/35 focus:ring-4 focus:ring-red-500/[0.06]" />
        </label>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_230px]">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {tierOrder.map((value) => (
              <button key={value} type="button" onClick={() => { setTier(value); resetVisible(); }} className={`shrink-0 rounded-full border px-3 py-2 text-[9px] font-black uppercase tracking-[.1em] transition ${tier === value ? value === "ALL" ? "border-red-400/35 bg-red-500/[0.10] text-red-100" : tierTone(value as Exclude<DemandTier, "ALL">) : "border-white/[0.07] bg-white/[0.025] text-zinc-600 hover:border-white/[0.13] hover:text-zinc-300"}`}>
                {tierLabel(value)}<span className="ml-1.5 opacity-50">{value === "ALL" ? items.length : tierCounts.get(value as Exclude<DemandTier, "ALL">) ?? 0}</span><span className="ml-1 hidden opacity-40 sm:inline">· {tierDescription(value)}</span>
              </button>
            ))}
          </div>
          <select value={sort} onChange={(event) => { setSort(event.target.value as SortMode); resetVisible(); }} className="min-h-11 rounded-[13px] border border-white/[0.08] bg-[#0c1017] px-3 text-xs font-black text-zinc-300 outline-none" aria-label="Sort demand intelligence">
            <option value="DEMAND">Highest demand</option><option value="SUPREME">Highest Supreme value</option><option value="GCASH">Highest GCash value</option><option value="AZ">A–Z</option>
          </select>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {categories.map((value) => <button key={value} type="button" onClick={() => { setCategory(value); resetVisible(); }} className={`shrink-0 rounded-full border px-3 py-2 text-[9px] font-black uppercase tracking-[.08em] transition ${category === value ? "border-cyan-400/25 bg-cyan-500/[0.07] text-cyan-200" : "border-white/[0.07] bg-black/20 text-zinc-600 hover:border-white/[0.12] hover:text-zinc-300"}`}>{value === "ALL" ? "All Categories" : value}</button>)}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs font-bold text-zinc-600">Demand tiers are derived only from the recorded 1–10 demand score.</p>
          {hasFilters ? <button type="button" onClick={clearFilters} className="shrink-0 text-[10px] font-black text-red-300 transition hover:text-red-200">Clear filters</button> : null}
        </div>
      </section>

      {visibleItems.length ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{visibleItems.map((item) => <DemandWeaponCard key={item.ID ?? item.NAME} item={item} />)}</section>
          {visibleItems.length < filtered.length ? <div className="text-center"><button type="button" onClick={() => setVisibleCount((count) => Math.min(filtered.length, count + PAGE_SIZE))} className="min-h-11 rounded-[14px] border border-white/[0.09] bg-white/[0.035] px-5 text-xs font-black text-zinc-300 transition hover:border-red-400/20 hover:bg-red-500/[0.05] hover:text-red-200">Load more ({(filtered.length - visibleItems.length).toLocaleString()} left)</button></div> : null}
        </>
      ) : (
        <section className="rounded-[24px] border border-dashed border-white/[0.10] bg-white/[0.02] px-6 py-14 text-center"><div className="text-4xl text-zinc-700">⌁</div><h2 className="mt-3 text-lg font-black text-white">No weapons match this demand scan</h2><p className="mt-2 text-sm text-zinc-600">Try another tier, category, or search.</p><button type="button" onClick={clearFilters} className="mt-5 text-xs font-black text-red-300 hover:text-red-200">Reset market scan</button></section>
      )}

      <section className="rounded-[20px] border border-white/[0.07] bg-black/20 px-4 py-3 text-[10px] font-semibold leading-5 text-zinc-700 sm:px-5">CSBT does not display rising/falling demand arrows on this page because the current MM2 dataset contains point-in-time demand scores, not verified historical demand snapshots. GCash values show N/A where the database has no GCash value.</section>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[18px] border border-white/[0.07] bg-black/20 p-3.5"><span className="block text-[8px] font-black uppercase tracking-[.12em] text-zinc-700">{label}</span><strong className="mt-1.5 block text-xl font-black tracking-[-.04em] text-white">{value}</strong></div>;
}

function LeaderboardCard({ item, rank }: { item: Item; rank: number }) {
  const image = imageUrl(item.IMAGE); const tier = demandTier(item.DEMAND);
  return <div className="group flex min-w-0 items-center gap-3 rounded-[18px] border border-white/[0.07] bg-white/[0.022] p-3 transition hover:border-red-400/18 hover:bg-white/[0.035]">
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-black/25 text-[10px] font-black text-zinc-500">#{rank}</span>
    <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[14px] border border-white/[0.07] bg-[#10151d] p-1.5">{image ? <img src={image} alt="" loading="lazy" className="h-full w-full object-contain drop-shadow-[0_8px_14px_rgba(0,0,0,.50)]" /> : <span className="text-xl text-zinc-700">◆</span>}</span>
    <div className="min-w-0 flex-1"><div className="flex min-w-0 items-center gap-2"><Link href={`/mm2/values/${encodeURIComponent(item.NAME)}`} className="truncate text-sm font-black text-white transition hover:text-red-200">{item.NAME}</Link><span className={`shrink-0 rounded-full border px-2 py-1 text-[7px] font-black uppercase tracking-[.08em] ${tierTone(tier)}`}>{demandNumber(item.DEMAND) ?? "N/A"}/10</span></div><p className="mt-1 truncate text-[9px] font-bold uppercase tracking-[.09em] text-zinc-700">{item.CATEGORY ?? "Weapon"} · Supreme {formatValue(item.SOURCE_VALUE)}</p></div>
    <Link href={calcHref(item)} className="shrink-0 rounded-xl border border-white/[0.07] bg-white/[0.035] px-2.5 py-2 text-[8px] font-black text-zinc-400 transition hover:border-red-400/18 hover:bg-red-500/[0.06] hover:text-red-200">Trade →</Link>
  </div>;
}

function CategoryDemandRow({ category, averageDemand, rated, highDemand, onClick }: { category: string; averageDemand: number; rated: number; highDemand: number; onClick: () => void }) {
  const width = Math.max(4, Math.min(100, (averageDemand / 10) * 100));
  return <button type="button" onClick={onClick} className="group block w-full rounded-[16px] border border-white/[0.06] bg-white/[0.02] p-3 text-left transition hover:border-cyan-400/14 hover:bg-cyan-500/[0.025]"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><strong className="block truncate text-xs font-black text-zinc-300 group-hover:text-white">{category}</strong><span className="mt-0.5 block text-[8px] font-bold text-zinc-700">{rated} rated · {highDemand} at 6+</span></div><strong className="shrink-0 text-xs font-black text-cyan-200">{averageDemand.toFixed(1)}/10</strong></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.05]"><div className="h-full rounded-full bg-gradient-to-r from-cyan-700 via-cyan-500 to-red-500" style={{ width: `${width}%` }} /></div></button>;
}

function DemandWeaponCard({ item }: { item: Item }) {
  const image = imageUrl(item.IMAGE); const itemTier = demandTier(item.DEMAND); const demand = demandNumber(item.DEMAND);
  return <article className="group overflow-hidden rounded-[20px] border border-white/[0.08] bg-[#0a0d13] shadow-[0_12px_34px_rgba(0,0,0,.18)] transition hover:-translate-y-0.5 hover:border-red-400/20">
    <div className="flex gap-3 p-3.5"><Link href={`/mm2/values/${encodeURIComponent(item.NAME)}`} className="flex h-[90px] w-[90px] shrink-0 items-center justify-center overflow-hidden rounded-[17px] border border-white/[0.07] bg-gradient-to-br from-[#171d29] via-[#0d1219] to-[#07090d] p-2">{image ? <img src={image} alt="" loading="lazy" className="h-full w-full object-contain drop-shadow-[0_10px_16px_rgba(0,0,0,.52)] transition duration-200 group-hover:scale-105" /> : <span className="text-3xl text-zinc-700">◆</span>}</Link>
      <div className="min-w-0 flex-1"><div className="flex min-w-0 items-start justify-between gap-2"><div className="min-w-0"><span className="block truncate text-[8px] font-black uppercase tracking-[.12em] text-red-300">{item.CATEGORY ?? "Weapon"}</span><Link href={`/mm2/values/${encodeURIComponent(item.NAME)}`} className="mt-1 block truncate text-base font-black text-white transition hover:text-red-200">{item.NAME}</Link></div><span className={`shrink-0 rounded-full border px-2.5 py-1.5 text-[8px] font-black uppercase tracking-[.08em] ${tierTone(itemTier)}`}>{demand === null ? "Unrated" : `${demand}/10`}</span></div><div className="mt-3 grid grid-cols-2 gap-2"><ValueCell label="Supreme" value={formatValue(item.SOURCE_VALUE)} /><ValueCell label="GCash" value={formatValue(item.GCASH_VALUE)} /></div></div>
    </div>
    <div className="grid grid-cols-2 border-t border-white/[0.06]"><Link href={`/mm2/values/${encodeURIComponent(item.NAME)}`} className="flex min-h-11 items-center justify-center border-r border-white/[0.06] text-[9px] font-black text-zinc-500 transition hover:bg-white/[0.025] hover:text-white">View Profile</Link><Link href={calcHref(item)} className="flex min-h-11 items-center justify-center text-[9px] font-black text-red-300 transition hover:bg-red-500/[0.055] hover:text-red-200">+ Add to Calculator</Link></div>
  </article>;
}

function ValueCell({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 rounded-xl border border-white/[0.055] bg-black/20 px-2.5 py-2"><span className="block text-[7px] font-black uppercase tracking-[.09em] text-zinc-700">{label}</span><strong className="mt-0.5 block truncate text-[10px] font-black text-zinc-300">{value}</strong></div>;
}

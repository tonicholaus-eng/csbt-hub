"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import valueSources from "../data/valueSources.json";
import type { TradeItem, TradeValue, ValueSource, ValueType } from "./trade/types";
import { formatTradeValue, getItemValue, hasItemValue } from "../lib/valueSystem";
import { getItemCategoryDetails } from "../lib/itemCategory";
import ValueHistoryCard from "./values/ValueHistoryCard";
import WatchValueButton from "./values/WatchValueButton";
import WishlistButton from "./values/WishlistButton";
import { getRelatedItems } from "../lib/relatedItems";

type Props = { pet: TradeItem; onBack?: () => void };
const variants: Array<{ key: ValueType; label: string; icon: string }> = [
  { key: "NORMAL", label: "Regular", icon: "🟡" },
  { key: "NEON", label: "Neon", icon: "🔷" },
  { key: "MEGA", label: "Mega", icon: "🌈" },
];

function formatDate(value?: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export default function PetDetails({ pet, onBack }: Props) {
  const category = getItemCategoryDetails(pet.CATEGORY);
  const hasGcash = variants.some((variant) => hasItemValue(pet, "GCASH", variant.key));
  const hasElve = variants.some((variant) => hasItemValue(pet, "ELVE", variant.key));
  const [source, setSource] = useState<ValueSource>(hasGcash ? "GCASH" : "ELVE");
  const [historyType, setHistoryType] = useState<ValueType>("NORMAL");
  const [now] = useState(() => Date.now());

  useEffect(() => { queueMicrotask(() => setSource(hasGcash ? "GCASH" : "ELVE")); queueMicrotask(() => setHistoryType("NORMAL")); }, [pet.ID, hasGcash]);

  const visibleVariants = useMemo(() => category.regularOnly ? variants.slice(0, 1) : variants, [category.regularOnly]);
  const historyVariants = visibleVariants.filter((variant) => hasItemValue(pet, source, variant.key));
  const elveUpdatedAt = (valueSources as { sources?: { ELVE?: { updatedAt?: string } } }).sources?.ELVE?.updatedAt;
  const updatedAt = source === "ELVE" ? (elveUpdatedAt ?? pet.UPDATED_AT) : pet.UPDATED_AT;
  const availableValues = visibleVariants.flatMap((variant) => (["GCASH", "ELVE"] as const).map((valueSource) => hasItemValue(pet, valueSource, variant.key))).filter(Boolean).length;
  const possibleValues = category.regularOnly ? 2 : 6;
  const refreshAgeDays = updatedAt ? Math.max(0, Math.floor((now - new Date(updatedAt).getTime()) / 86400000)) : null;
  const freshnessLabel = refreshAgeDays == null ? "Unknown" : refreshAgeDays <= 2 ? "Fresh" : refreshAgeDays <= 7 ? "Recent" : "Needs review";
  const relatedItems = useMemo(() => getRelatedItems(pet, source, 6), [pet, source]);

  return (
    <section className="overflow-hidden rounded-[30px] border border-white/65 bg-white/80 shadow-[0_24px_80px_rgba(15,23,42,.12)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/72">
      <div className="bg-gradient-to-br from-amber-500 via-yellow-400 to-orange-500 px-5 py-7 text-white sm:px-8 sm:py-10">
        {onBack ? <button type="button" onClick={onBack} className="rounded-full bg-white/20 px-4 py-2 text-xs font-black">← Back</button> : <Link href="/values" className="inline-flex rounded-full bg-white/20 px-4 py-2 text-xs font-black">← All values</Link>}
        <div className="mt-6 flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:text-left">
          <div className="flex h-40 w-40 shrink-0 items-center justify-center rounded-[28px] bg-white/20 p-4 sm:h-48 sm:w-48">
            {pet.IMAGE ? <Image src={pet.IMAGE} alt={pet.NAME} width={190} height={190} priority unoptimized className="h-full w-full object-contain drop-shadow-xl" /> : <span className="text-7xl">{category.icon}</span>}
          </div>
          <div className="min-w-0 text-center sm:text-left">
            <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
              <span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-black uppercase tracking-wider">{category.icon} {category.label}</span>
              <span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-black uppercase tracking-wider">Rarity: {pet.RARITY || "Not set"}</span>
              <span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-black uppercase tracking-wider">Catalog demand: {pet.DEMAND_TIER ? `${pet.DEMAND_TIER} Tier` : "Unavailable"}</span>
            </div>
            <h1 className="mt-4 break-words text-3xl font-black sm:text-5xl">{pet.NAME}</h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/90">Compare both value systems, follow market history, save it to your wishlist, or send it straight to your inventory/calculator.</p>
            <p className="mt-3 text-xs font-bold text-white/75">Last data refresh: {formatDate(updatedAt)}</p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-7">
        <div className="grid gap-3 sm:grid-cols-2">
          <SummaryCard label="GCash Regular" value={getItemValue(pet, "GCASH", "NORMAL")} prefix="₱" />
          <SummaryCard label="Elve Shark Regular" value={getItemValue(pet, "ELVE", "NORMAL")} prefix="🦈 " />
        </div>

        <section className="mt-5 rounded-[24px] border border-cyan-100 bg-cyan-50/60 p-4 dark:border-cyan-400/10 dark:bg-cyan-400/[0.04] sm:p-5" aria-labelledby="value-health-title">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-cyan-700 dark:text-cyan-300">Value Health</p><h2 id="value-health-title" className="mt-1 text-lg font-black text-slate-950 dark:text-white">How trustworthy is this snapshot?</h2></div><span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-black text-cyan-700 shadow-sm dark:bg-white/5 dark:text-cyan-200">{freshnessLabel}</span></div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <HealthMetric label="Last verified" value={formatDate(updatedAt)} />
            <HealthMetric label="Data coverage" value={`${availableValues}/${possibleValues} listed values`} />
            <HealthMetric label="Demand signal" value={pet.DEMAND_TIER ? `${pet.DEMAND_TIER} tier` : "Unavailable"} />
            <HealthMetric label="Source comparison" value="Separate systems" />
          </div>
          <p className="mt-4 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400"><strong className="text-slate-700 dark:text-slate-200">Provenance:</strong> GCash values come from the CSBT-maintained master value sheet. Elve values come from the latest stored Elvebredd Shark snapshot. The two systems are intentionally shown separately and are never auto-converted into each other.</p>
        </section>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link href={`/inventory?add=${encodeURIComponent(pet.ID)}&source=${source}`} className="inline-flex min-h-11 items-center rounded-2xl csbt-theme-primary px-4 text-xs font-black text-slate-950">🎒 Add to Inventory</Link>
          <Link href={`/calculator?add=${encodeURIComponent(pet.ID)}&source=${source}`} className="inline-flex min-h-11 items-center rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 text-xs font-black text-white">🧮 Add to Calculator</Link>
          <Link href={`/exchange?tab=browse&q=${encodeURIComponent(pet.NAME)}`} className="inline-flex min-h-11 items-center rounded-2xl bg-violet-600 px-4 text-xs font-black text-white">🔎 Find Traders</Link>
          <Link href={`/nich?prompt=${encodeURIComponent(`Tell me about ${pet.NAME} using CSBT's verified ${source} values and available market context. Do not invent demand data if CSBT does not have it.`)}`} className="inline-flex min-h-11 items-center rounded-2xl bg-slate-900 px-4 text-xs font-black text-white dark:bg-white dark:text-slate-950">🤖 Ask NICH</Link>
          <WishlistButton item={pet} />
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">Value breakdown</p><h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{source === "GCASH" ? "GCash" : "Elve Shark"} values</h2></div>
          <div className="flex rounded-2xl bg-slate-100 p-1 dark:bg-white/5">
            <button type="button" disabled={!hasGcash} onClick={() => setSource("GCASH")} className={`rounded-xl px-4 py-2 text-xs font-black disabled:opacity-30 ${source === "GCASH" ? "bg-white shadow dark:bg-slate-800" : "text-slate-500"}`}>💸 GCash</button>
            <button type="button" disabled={!hasElve} onClick={() => setSource("ELVE")} className={`rounded-xl px-4 py-2 text-xs font-black disabled:opacity-30 ${source === "ELVE" ? "bg-white shadow dark:bg-slate-800" : "text-slate-500"}`}>🦈 Elve</button>
          </div>
        </div>

        <div className={`mt-4 grid gap-3 ${visibleVariants.length > 1 ? "sm:grid-cols-3" : "max-w-md"}`}>
          {visibleVariants.map((variant) => <div key={variant.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center dark:border-white/10 dark:bg-white/[0.03]"><p className="text-3xl">{variant.icon}</p><p className="mt-2 text-xs font-black uppercase tracking-wide text-slate-400">{variant.label}</p><p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{source === "GCASH" ? "₱" : ""}{formatTradeValue(getItemValue(pet, source, variant.key))}</p></div>)}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-2">
          <span className="text-xs font-black text-slate-500">History variant:</span>
          {historyVariants.map((variant) => <button key={variant.key} type="button" onClick={() => setHistoryType(variant.key)} className={`rounded-xl px-3 py-2 text-xs font-black ${historyType === variant.key ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950" : "bg-slate-100 text-slate-500 dark:bg-white/5"}`}>{variant.label}</button>)}
        </div>
        <ValueHistoryCard itemId={pet.ID} source={source} valueType={historyVariants.some(v => v.key === historyType) ? historyType : "NORMAL"} />
        <WatchValueButton itemId={pet.ID} itemName={pet.NAME} source={source} valueType={historyVariants.some(v => v.key === historyType) ? historyType : "NORMAL"} />

        {relatedItems.length ? <section className="mt-7" aria-labelledby="related-items-title"><div className="flex items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.12em] text-[var(--foreground-muted)]">Discovery</p><h2 id="related-items-title" className="mt-1 text-xl font-black text-[var(--foreground)]">Similar-value items</h2></div><p className="text-xs font-bold text-[var(--foreground-muted)]">Deterministic · {source}</p></div><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{relatedItems.map((item)=><Link key={item.ID} href={`/values/${encodeURIComponent(item.ID)}`} className="flex min-w-0 items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-3 transition hover:-translate-y-0.5 hover:border-[var(--brand-primary)]">{item.IMAGE?<Image src={item.IMAGE} alt="" width={44} height={44} className="h-11 w-11 shrink-0 object-contain"/>:<span className="flex h-11 w-11 items-center justify-center">📦</span>}<span className="min-w-0"><span className="block truncate text-sm font-black text-[var(--foreground)]">{item.NAME}</span><span className="text-xs font-bold text-[var(--foreground-muted)]">{source === "GCASH" ? "₱ " : "🦈 "}{formatTradeValue(getItemValue(item, source, "NORMAL"))}</span></span></Link>)}</div></section> : null}

        <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400"><strong className="text-slate-800 dark:text-white">Reminder:</strong> GCash and Elve Shark are separate value systems. Missing GCash values stay N/A until your CSBT master sheet is updated; they are never estimated from Elve.</div>
      </div>
    </section>
  );
}

function HealthMetric({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-white/80 bg-white/75 p-3 dark:border-white/10 dark:bg-white/[0.035]"><p className="text-[9px] font-black uppercase tracking-[.12em] text-slate-400">{label}</p><p className="mt-1 text-sm font-black text-slate-900 dark:text-white">{value}</p></div>; }

function SummaryCard({ label, value, prefix }: { label: string; value: TradeValue; prefix: string }) {
  const formatted = formatTradeValue(value);
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]"><p className="text-[10px] font-black uppercase tracking-[.14em] text-slate-400">{label}</p><p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{formatted === "N/A" ? "N/A" : `${prefix}${formatted}`}</p></div>;
}

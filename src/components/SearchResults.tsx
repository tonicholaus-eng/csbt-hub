"use client";
import Image from "next/image";
import Link from "next/link";
import type { TradeItem } from "./trade/types";
import { formatTradeValue, getItemValue } from "../lib/valueSystem";
import { getItemCategoryDetails } from "../lib/itemCategory";

export default function SearchResults({ pets }: { pets: TradeItem[]; onSelect?: (item: TradeItem) => void }) {
  if (!pets.length) return null;
  return <section className="mt-6"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{pets.map((item)=>{const d=getItemCategoryDetails(item.CATEGORY);return <Link key={item.ID} href={`/values/${encodeURIComponent(item.ID)}`} className="group content-auto-card flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white/85 p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md dark:border-white/10 dark:bg-slate-950/65"><span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-3xl dark:bg-white/5">{item.IMAGE?<Image src={item.IMAGE} alt="" width={64} height={64} unoptimized loading="lazy" className="h-14 w-14 object-contain"/>:d.icon}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-black text-slate-950 group-hover:text-amber-600 dark:text-white">{item.NAME}</span><span className="mt-0.5 block truncate text-[10px] font-bold text-slate-400">{d.label}{item.RARITY?` • ${item.RARITY}`:""}{item.DEMAND_TIER?` • ${item.DEMAND_TIER} demand`:""}</span><span className="mt-2 grid grid-cols-2 gap-1 text-[10px] font-black"><span className="rounded-lg bg-slate-100 px-2 py-1 dark:bg-white/5">₱ {formatTradeValue(getItemValue(item,"GCASH","NORMAL"))}</span><span className="rounded-lg bg-slate-100 px-2 py-1 dark:bg-white/5">🦈 {formatTradeValue(getItemValue(item,"ELVE","NORMAL"))}</span></span></span><span className="text-slate-300">→</span></Link>})}</div></section>;
}

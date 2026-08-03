"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import popularItemsData from "../data/homePopularItems.json";
import type { TradeItem } from "./trade/types";
import { formatTradeValue, getItemValue } from "../lib/valueSystem";

const popularItems = popularItemsData as TradeItem[];

const gradients = [
  "from-cyan-400 via-sky-400 to-blue-500",
  "from-slate-500 via-slate-700 to-slate-950",
  "from-amber-400 via-orange-400 to-yellow-500",
  "from-purple-500 via-fuchsia-500 to-pink-500",
  "from-green-400 via-emerald-500 to-teal-500",
  "from-yellow-400 via-orange-500 to-red-500",
  "from-pink-400 via-fuchsia-500 to-violet-500",
  "from-red-500 via-pink-500 to-purple-500",
];

function ItemImage({ item }: { item: TradeItem }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [item.IMAGE]);

  if (!item.IMAGE || failed) {
    return (
      <div className="flex h-32 w-32 items-center justify-center text-6xl" aria-label="Image unavailable">
        {item.CATEGORY === "PETWEAR" ? "🎩" : "🐾"}
      </div>
    );
  }

  return (
    <Image
      src={item.IMAGE}
      alt={item.NAME}
      width={150}
      height={150}
      unoptimized
      loading="lazy"
      onError={() => setFailed(true)}
      className="mx-auto h-32 w-32 object-contain drop-shadow-[0_14px_20px_rgba(15,23,42,.2)] transition-transform duration-300 group-hover/card:scale-105 sm:h-36 sm:w-36"
    />
  );
}

export default function PopularPets() {
  return (
    <section id="values" aria-labelledby="popular-values-heading" className="relative">
      <div className="mb-10 text-center sm:mb-14">
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-100/80 px-5 py-2 text-sm font-black text-amber-700 shadow-sm dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300">
          <span aria-hidden="true">⭐</span>
          Community Favorites
        </span>
        <h2 id="popular-values-heading" className="mt-5 text-4xl font-black tracking-tight text-slate-800 dark:text-white sm:text-5xl">
          Popular Values
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm text-slate-500 dark:text-slate-400 sm:text-base">
          The items traders search for the most every day.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {popularItems.map((item, index) => {
          const gradient = gradients[index % gradients.length];
          const params = new URLSearchParams({ pet: item.NAME });

          return (
            <Link
              key={item.ID}
              href={`/values?${params.toString()}`}
              aria-label={`View trading values for ${item.NAME}`}
              className="group/card home-paint-containment relative flex min-h-full flex-col overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/90 p-4 text-left shadow-[0_16px_38px_rgba(15,23,42,.09)] outline-none transition duration-200 hover:-translate-y-1 hover:border-amber-300 hover:shadow-[0_22px_52px_rgba(15,23,42,.14)] focus-visible:ring-4 focus-visible:ring-amber-300/40 dark:border-white/10 dark:bg-slate-900/88 dark:shadow-[0_18px_42px_rgba(0,0,0,.28)] dark:hover:border-white/20 sm:p-5"
            >
              <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${gradient}`} />

              <div className="relative z-10 flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-600 shadow-sm dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-300">
                  <span aria-hidden="true">{item.CATEGORY === "PETWEAR" ? "🎩" : "🐾"}</span>
                  {item.CATEGORY === "PETWEAR" ? "Pet Wear" : "Pet"}
                </span>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300">
                  Popular
                </span>
              </div>

              <div className={`relative z-10 mt-4 rounded-[24px] bg-gradient-to-br ${gradient} p-[2px] shadow-md`}>
                <div className="relative flex h-44 items-center justify-center overflow-hidden rounded-[22px] border border-white/70 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-4 dark:border-white/10 dark:from-slate-800 dark:via-slate-900 dark:to-slate-950">
                  <ItemImage item={item} />
                </div>
              </div>

              <div className="relative z-10 mt-5">
                <h3 className="line-clamp-2 min-h-[56px] text-lg font-black leading-snug text-slate-900 dark:text-white sm:text-xl">{item.NAME}</h3>
                <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400 sm:text-sm">GCash and Elve Shark values</p>
              </div>

              <div className="relative z-10 mt-5 grid grid-cols-2 gap-2.5 text-center">
                <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-yellow-100 px-3 py-3 shadow-sm dark:border-amber-400/20 dark:from-amber-400/10 dark:to-yellow-400/[0.06]">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">GCash Regular</span>
                  <div className="mt-1 truncate text-lg font-black text-amber-900 dark:text-amber-100">{formatTradeValue(getItemValue(item, "GCASH", "NORMAL"))}</div>
                </div>
                <div className="rounded-2xl border border-cyan-200/80 bg-gradient-to-br from-cyan-50 to-sky-100 px-3 py-3 shadow-sm dark:border-cyan-400/20 dark:from-cyan-400/10 dark:to-sky-400/[0.06]">
                  <span className="text-[10px] font-black uppercase tracking-wider text-cyan-700 dark:text-cyan-300">Elve Shark</span>
                  <div className="mt-1 truncate text-lg font-black text-cyan-900 dark:text-cyan-100">{formatTradeValue(getItemValue(item, "ELVE", "NORMAL"))}</div>
                </div>
              </div>

              <div className="relative z-10 mt-auto pt-5">
                <div className={`flex items-center justify-between rounded-2xl bg-gradient-to-r ${gradient} px-4 py-3 text-sm font-black text-white shadow-md`}>
                  <span>View Details</span>
                  <span aria-hidden="true">→</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

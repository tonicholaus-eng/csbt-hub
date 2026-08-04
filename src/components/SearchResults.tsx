"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";

import type { TradeItem } from "./trade/types";
import { formatTradeValue, getItemValue } from "../lib/valueSystem";
import { getItemCategoryDetails } from "../lib/itemCategory";

type Props = {
  pets: TradeItem[];
  onSelect: (item: TradeItem) => void;
};

type ItemImageProps = {
  src?: string;
  name: string;
  category: TradeItem["CATEGORY"];
};

function ItemImage({
  src,
  name,
  category,
}: ItemImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    const categoryDetails = getItemCategoryDetails(category);

    return (
      <div className="flex h-24 w-24 items-center justify-center text-5xl">
        {categoryDetails.icon}
        <span className="sr-only">Image unavailable for {name}</span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={name}
      width={96}
      height={96}
      unoptimized
      onError={() => setFailed(true)}
      className="h-24 w-24 object-contain drop-shadow-xl transition-transform duration-300 group-hover:scale-110"
    />
  );
}

const gradients = [
  "from-amber-400 via-yellow-400 to-orange-500",
  "from-cyan-400 via-sky-400 to-blue-500",
  "from-pink-400 via-fuchsia-400 to-purple-500",
  "from-emerald-400 via-green-400 to-teal-500",
] as const;

const imageGlows = [
  "from-amber-300/35 via-yellow-200/20 to-orange-400/35 dark:from-amber-400/20 dark:via-yellow-300/5 dark:to-orange-500/20",
  "from-cyan-300/35 via-sky-200/20 to-blue-400/35 dark:from-cyan-400/20 dark:via-sky-300/5 dark:to-blue-500/20",
  "from-pink-300/35 via-fuchsia-200/20 to-purple-400/35 dark:from-pink-400/20 dark:via-fuchsia-300/5 dark:to-purple-500/20",
  "from-emerald-300/35 via-green-200/20 to-teal-400/35 dark:from-emerald-400/20 dark:via-green-300/5 dark:to-teal-500/20",
] as const;

export default function SearchResults({
  pets,
  onSelect,
}: Props) {
  const reduceMotion = useReducedMotion();

  if (!pets.length) {
    return null;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 25 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduceMotion ? 0 : 0.45,
      }}
      className="relative mt-10"
      aria-labelledby="search-results-title"
    >
      <div className="mb-7">
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-100/90 px-4 py-2 text-sm font-black text-amber-800 shadow-sm dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300">
          <span aria-hidden="true">✨</span>
          Matches Found
        </span>

        <h2
          id="search-results-title"
          className="mt-4 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl"
        >
          Search Results
        </h2>

        <p className="mt-2 text-slate-600 dark:text-slate-300">
          We found{" "}
          <span className="font-black text-slate-900 dark:text-white">
            {pets.length}{" "}
            {pets.length === 1
              ? "item"
              : "items"}
          </span>{" "}
          matching your search.
        </p>
      </div>

      <div className="relative overflow-hidden rounded-[34px] border border-slate-200/80 bg-white/70 p-3 shadow-[0_24px_70px_rgba(15,23,42,.12)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/72 dark:shadow-[0_28px_80px_rgba(0,0,0,.38)] sm:p-4">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,.10),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,.09),transparent_42%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,.08),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,.08),transparent_42%)]" />

        <AnimatePresence mode="popLayout">
          <div className="relative space-y-4">
            {pets.map((item, index) => {
              const gradient =
                gradients[
                  index % gradients.length
                ];
              const imageGlow =
                imageGlows[
                  index % imageGlows.length
                ];
              const categoryDetails =
                getItemCategoryDetails(item.CATEGORY);

              return (
                <motion.button
                  key={item.ID}
                  type="button"
                  onClick={() => onSelect(item)}
                  initial={{
                    opacity: 0,
                    y: 20,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0.98,
                  }}
                  transition={{
                    duration: reduceMotion
                      ? 0
                      : 0.35,
                    delay: reduceMotion
                      ? 0
                      : Math.min(index * 0.04, 0.2),
                  }}
                  whileHover={
                    reduceMotion
                      ? undefined
                      : {
                          y: -4,
                          scale: 1.006,
                        }
                  }
                  whileTap={
                    reduceMotion
                      ? undefined
                      : {
                          scale: 0.995,
                        }
                  }
                  className="group relative flex w-full flex-col gap-5 overflow-hidden rounded-[28px] border border-slate-200/90 bg-white/95 p-5 text-left shadow-[0_12px_32px_rgba(15,23,42,.08)] outline-none transition duration-300 hover:border-slate-300 hover:shadow-[0_18px_45px_rgba(15,23,42,.13)] focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 dark:border-white/10 dark:bg-slate-900/94 dark:shadow-[0_16px_42px_rgba(0,0,0,.28)] dark:hover:border-white/20 dark:hover:bg-slate-900 dark:hover:shadow-[0_22px_55px_rgba(0,0,0,.42)] dark:focus-visible:ring-offset-slate-950 sm:flex-row sm:items-center"
                >
                  <div
                    aria-hidden="true"
                    className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${gradient}`}
                  />

                  <div
                    aria-hidden="true"
                    className={`pointer-events-none absolute -left-12 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-gradient-to-br blur-3xl ${imageGlow}`}
                  />

                  <div
                    className={`relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-[24px] border border-slate-200/80 bg-gradient-to-br p-[2px] shadow-sm dark:border-white/10 dark:bg-slate-800/75 ${imageGlow}`}
                  >
                    <div className="flex h-full w-full items-center justify-center rounded-[22px] bg-white/80 backdrop-blur dark:bg-slate-900/78">
                      <ItemImage
                        src={item.IMAGE}
                        name={item.NAME}
                        category={item.CATEGORY}
                      />
                    </div>
                  </div>

                  <div className="relative min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="min-w-0 truncate text-2xl font-black text-slate-900 transition-colors group-hover:text-amber-600 dark:text-white dark:group-hover:text-amber-300">
                        {item.NAME}
                      </h3>

                      <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-300">
                        {categoryDetails.uppercaseLabel}
                      </span>
                    </div>

                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {categoryDetails.description}
                    </p>

                    <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                      <ValueCard
                        label="GCash Regular"
                        value={formatTradeValue(getItemValue(item, "GCASH", "NORMAL"))}
                      />
                      <ValueCard
                        label="Elve Shark Regular"
                        value={formatTradeValue(getItemValue(item, "ELVE", "NORMAL"))}
                      />
                    </div>
                  </div>

                  <div
                    className={`relative inline-flex shrink-0 items-center justify-center self-stretch rounded-2xl bg-gradient-to-r px-5 py-3 text-center text-sm font-black text-white shadow-lg transition duration-300 group-hover:shadow-xl sm:self-center ${gradient}`}
                  >
                    View Item
                    <span
                      aria-hidden="true"
                      className="ml-1.5 transition-transform duration-300 group-hover:translate-x-1"
                    >
                      →
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </AnimatePresence>
      </div>
    </motion.section>
  );
}

function ValueCard({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-slate-50/95 px-3 py-3 text-center shadow-sm dark:border-white/10 dark:bg-slate-800/85 dark:shadow-none">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
        {label}
      </p>

      <p className="mt-1 truncate text-lg font-black text-slate-900 dark:text-white">
        {value ?? "N/A"}
      </p>
    </div>
  );
}
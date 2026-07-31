"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  motion,
  useReducedMotion,
} from "framer-motion";

import type { TradeItem } from "./trade/types";
import { getItem } from "../lib/search";

const popularItems = [
  "Frost Dragon",
  "Shadow Dragon",
  "Owl",
  "Crow",
  "Parrot",
  "Giraffe",
  "Balloon Unicorn",
  "Evil Unicorn",
];

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

type Props = {
  onSelect: (item: TradeItem) => void;
};

type ItemImageProps = {
  src?: string;
  name: string;
  category: TradeItem["CATEGORY"];
};

function displayValue(
  value:
    | string
    | number
    | null
    | undefined,
) {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return "—";
  }

  return String(value);
}

function ItemImage({
  src,
  name,
  category,
}: ItemImageProps) {
  const [failed, setFailed] =
    useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div className="flex h-32 w-32 flex-col items-center justify-center text-center sm:h-36 sm:w-36">
        <span
          aria-hidden="true"
          className="text-5xl sm:text-6xl"
        >
          {category === "PETWEAR"
            ? "🎩"
            : "🐾"}
        </span>

        <span className="mt-2 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Image unavailable
        </span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={name}
      width={150}
      height={150}
      unoptimized
      loading="lazy"
      onError={() => setFailed(true)}
      className="mx-auto h-32 w-32 object-contain drop-shadow-[0_18px_24px_rgba(15,23,42,.22)] transition-transform duration-500 group-hover/card:scale-110 group-hover/card:-rotate-2 sm:h-36 sm:w-36"
    />
  );
}

export default function PopularPets({
  onSelect,
}: Props) {
  const shouldReduceMotion =
    useReducedMotion();

  return (
    <section
      id="values"
      aria-labelledby="popular-values-heading"
      className="relative"
    >
      <motion.div
        initial={{
          opacity: 0,
          y: shouldReduceMotion
            ? 0
            : 35,
        }}
        whileInView={{
          opacity: 1,
          y: 0,
        }}
        viewport={{
          once: true,
          margin: "-60px",
        }}
        transition={{
          duration: shouldReduceMotion
            ? 0
            : 0.7,
        }}
        className="mb-10 text-center sm:mb-14"
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-100/80 px-5 py-2 text-sm font-black text-amber-700 shadow-sm backdrop-blur-xl dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300">
          <span aria-hidden="true">
            ⭐
          </span>

          Community Favorites
        </span>

        <h2
          id="popular-values-heading"
          className="mt-5 text-4xl font-black tracking-tight text-slate-800 dark:text-white sm:text-5xl"
        >
          Popular Values
        </h2>

        <p className="mx-auto mt-4 max-w-xl text-sm text-slate-500 dark:text-slate-400 sm:text-base">
          The items traders search for the
          most every day.
        </p>
      </motion.div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {popularItems.map(
          (name, index) => {
            const item =
              getItem(name);

            if (!item) {
              return null;
            }

            const gradient =
              gradients[
                index %
                  gradients.length
              ];

            return (
              <motion.button
                key={name}
                type="button"
                onClick={() =>
                  onSelect(item)
                }
                initial={{
                  opacity: 0,
                  y: shouldReduceMotion
                    ? 0
                    : 35,
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                }}
                viewport={{
                  once: true,
                  amount: 0.15,
                }}
                transition={{
                  duration:
                    shouldReduceMotion
                      ? 0
                      : 0.5,
                  delay:
                    shouldReduceMotion
                      ? 0
                      : index * 0.07,
                }}
                whileHover={
                  shouldReduceMotion
                    ? undefined
                    : {
                        y: -10,
                        scale: 1.025,
                      }
                }
                whileTap={{
                  scale:
                    shouldReduceMotion
                      ? 1
                      : 0.98,
                }}
                aria-label={`View trading values for ${item.NAME}`}
                className="group/card relative flex min-h-full flex-col overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/85 p-4 text-left shadow-[0_18px_45px_rgba(15,23,42,.10)] outline-none backdrop-blur-xl transition-[border-color,background-color,box-shadow] duration-300 hover:border-amber-300 hover:shadow-[0_24px_60px_rgba(15,23,42,.16)] focus-visible:ring-4 focus-visible:ring-amber-300/40 dark:border-white/10 dark:bg-slate-900/85 dark:shadow-[0_20px_50px_rgba(0,0,0,.32)] dark:hover:border-white/20 dark:hover:bg-slate-900 dark:hover:shadow-[0_28px_70px_rgba(0,0,0,.48)] dark:focus-visible:ring-amber-400/30 sm:p-5"
              >
                <div
                  className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${gradient}`}
                />

                <div
                  className={`pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-gradient-to-br ${gradient} opacity-[0.08] blur-3xl transition-opacity duration-500 group-hover/card:opacity-[0.16]`}
                />

                <div
                  className={`pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 rotate-12 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-0 blur-lg transition-all duration-700 group-hover/card:left-[130%] group-hover/card:opacity-100 dark:via-white/10`}
                />

                <div className="relative z-10 flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-600 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-300">
                    <span aria-hidden="true">
                      {item.CATEGORY ===
                      "PETWEAR"
                        ? "🎩"
                        : "🐾"}
                    </span>

                    {item.CATEGORY ===
                    "PETWEAR"
                      ? "Pet Wear"
                      : "Pet"}
                  </span>

                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300">
                    Popular
                  </span>
                </div>

                <div
                  className={`relative z-10 mt-4 rounded-[24px] bg-gradient-to-br ${gradient} p-[2px] shadow-lg`}
                >
                  <div className="relative flex h-44 items-center justify-center overflow-hidden rounded-[22px] border border-white/70 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-4 dark:border-white/10 dark:from-slate-800 dark:via-slate-900 dark:to-slate-950">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,.85),transparent_62%)] opacity-80 dark:opacity-10" />

                    <ItemImage
                      src={item.IMAGE}
                      name={item.NAME}
                      category={
                        item.CATEGORY
                      }
                    />
                  </div>
                </div>

                <div className="relative z-10 mt-5">
                  <h3 className="line-clamp-2 min-h-[56px] text-lg font-black leading-snug text-slate-900 dark:text-white sm:text-xl">
                    {item.NAME}
                  </h3>

                  <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400 sm:text-sm">
                    {item.CATEGORY ===
                    "PETWEAR"
                      ? "Current pet-wear trading value"
                      : "Current normal, neon and mega values"}
                  </p>
                </div>

                <div className="relative z-10 mt-5 grid gap-2.5 text-center">
                  <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-yellow-100 px-3 py-3 shadow-sm dark:border-amber-400/20 dark:from-amber-400/10 dark:to-yellow-400/[0.06]">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">
                      Normal
                    </span>

                    <div className="mt-1 truncate text-lg font-black text-amber-900 dark:text-amber-100">
                      {displayValue(
                        item.NORMAL,
                      )}
                    </div>
                  </div>

                  {item.CATEGORY ===
                    "PET" && (
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="rounded-2xl border border-cyan-200/80 bg-gradient-to-br from-cyan-50 to-sky-100 px-2 py-3 shadow-sm dark:border-cyan-400/20 dark:from-cyan-400/10 dark:to-sky-400/[0.06]">
                        <span className="text-[10px] font-black uppercase tracking-wider text-cyan-700 dark:text-cyan-300">
                          Neon
                        </span>

                        <div className="mt-1 truncate text-base font-black text-cyan-900 dark:text-cyan-100">
                          {displayValue(
                            item.NEON,
                          )}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-pink-200/80 bg-gradient-to-br from-pink-50 to-fuchsia-100 px-2 py-3 shadow-sm dark:border-pink-400/20 dark:from-pink-400/10 dark:to-fuchsia-400/[0.06]">
                        <span className="text-[10px] font-black uppercase tracking-wider text-pink-700 dark:text-pink-300">
                          Mega
                        </span>

                        <div className="mt-1 truncate text-base font-black text-pink-900 dark:text-pink-100">
                          {displayValue(
                            item.MEGA,
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative z-10 mt-auto pt-5">
                  <div
                    className={`flex items-center justify-between rounded-2xl bg-gradient-to-r ${gradient} px-4 py-3 text-sm font-black text-white shadow-lg transition-transform duration-300 group-hover/card:scale-[1.02]`}
                  >
                    <span>
                      View Details
                    </span>

                    <motion.span
                      aria-hidden="true"
                      animate={
                        shouldReduceMotion
                          ? undefined
                          : {
                              x: [
                                0,
                                4,
                                0,
                              ],
                            }
                      }
                      transition={{
                        duration: 1.8,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    >
                      →
                    </motion.span>
                  </div>
                </div>
              </motion.button>
            );
          },
        )}
      </div>
    </section>
  );
}
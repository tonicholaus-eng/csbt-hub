"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

import {
  SelectedTradeItem,
  ValueSource,
  ValueType,
} from "./types";
import {
  VALUE_SOURCE_SHORT_LABELS,
  formatTradeValue,
  getItemValue,
  hasItemValue,
} from "../../lib/valueSystem";
import { getItemCategoryDetails } from "../../lib/itemCategory";

type Props = {
  selectedItem: SelectedTradeItem;
  onRemove: () => void;
  onValueTypeChange: (valueType: ValueType) => void;
  valueSource: ValueSource;
};

type ItemImageProps = {
  src?: string;
  name: string;
  category: SelectedTradeItem["item"]["CATEGORY"];
};

const badgeColors: Record<ValueType, string> = {
  NORMAL:
    "border-yellow-300 bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-700 dark:border-amber-400/20 dark:from-amber-400/10 dark:to-orange-400/10 dark:text-amber-300",
  NEON:
    "border-cyan-300 bg-gradient-to-r from-cyan-100 to-blue-100 text-cyan-700 dark:border-cyan-400/20 dark:from-cyan-400/10 dark:to-blue-400/10 dark:text-cyan-300",
  MEGA:
    "border-pink-300 bg-gradient-to-r from-pink-100 to-purple-100 text-pink-700 dark:border-pink-400/20 dark:from-pink-400/10 dark:to-purple-400/10 dark:text-pink-300",
};

function ItemImage({
  src,
  name,
  category,
}: ItemImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setFailed(false));
  }, [src]);

  if (!src || failed) {
    const categoryDetails = getItemCategoryDetails(category);

    return (
      <div className="flex h-11 w-11 items-center justify-center text-2xl sm:h-[72px] sm:w-[72px] sm:text-4xl">
        {categoryDetails.icon}
        <span className="sr-only">
          Image unavailable for {name}
        </span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={name}
      width={72}
      height={72}
      unoptimized
      onError={() => setFailed(true)}
      className="h-11 w-11 object-contain transition-transform duration-300 group-hover/card:scale-110 sm:h-[72px] sm:w-[72px]"
    />
  );
}

export default function TradePetCard({
  selectedItem,
  onRemove,
  onValueTypeChange,
  valueSource,
}: Props) {
  const shouldReduceMotion = useReducedMotion();
  const { item, valueType } = selectedItem;
  const categoryDetails = getItemCategoryDetails(item.CATEGORY);

  return (
    <motion.article
      layout={!shouldReduceMotion}
      whileHover={
        shouldReduceMotion
          ? undefined
          : { y: -4, scale: 1.01 }
      }
      className="group/card relative overflow-hidden rounded-xl border border-white/70 bg-white/90 p-2 shadow-md backdrop-blur dark:border-white/10 dark:bg-slate-900/85 sm:rounded-3xl sm:p-5"
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400" />

      <motion.button
        type="button"
        onClick={onRemove}
        whileHover={
          shouldReduceMotion
            ? undefined
            : { scale: 1.08, rotate: 5 }
        }
        whileTap={{
          scale: shouldReduceMotion ? 1 : 0.92,
        }}
        aria-label={`Remove ${item.NAME} from trade`}
        className="absolute right-1.5 top-1.5 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white sm:right-3 sm:top-3 sm:h-9 sm:w-9 sm:text-base"
      >
        ✕
      </motion.button>

      <div className="relative flex flex-col items-center gap-2 pt-1 text-center sm:flex-row sm:items-center sm:gap-4 sm:pr-8 sm:pt-0 sm:text-left">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-yellow-100 bg-gradient-to-br from-yellow-50 via-white to-orange-100 shadow-inner dark:border-white/10 dark:from-slate-800 dark:via-slate-900 dark:to-slate-950 sm:h-20 sm:w-20 sm:rounded-3xl">
          <ItemImage
            src={item.IMAGE}
            name={item.NAME}
            category={item.CATEGORY}
          />
        </div>

        <div className="min-w-0 w-full flex-1">
          <h4 className="truncate px-1 text-xs font-black text-slate-800 dark:text-white sm:px-0 sm:text-lg">
            {item.NAME}
          </h4>

          <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:mt-1 sm:text-xs">
            <span className="sm:hidden">
              {categoryDetails.label}
            </span>

            <span className="hidden sm:inline">
              {categoryDetails.label}{" "}
              • {VALUE_SOURCE_SHORT_LABELS[valueSource]} Value
            </span>
          </p>

          <div className="mt-2 flex w-full flex-col items-stretch gap-1.5 sm:mt-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            <select
              value={valueType}
              onChange={(event) =>
                onValueTypeChange(
                  event.target.value as ValueType,
                )
              }
              aria-label={`Value type for ${item.NAME}`}
              className={`w-full min-w-0 cursor-pointer rounded-full border px-2 py-1 text-[10px] font-black outline-none sm:w-auto sm:px-3 sm:py-1.5 sm:text-xs ${badgeColors[valueType]}`}
            >
              <option
                value="NORMAL"
                disabled={
                  !hasItemValue(
                    item,
                    valueSource,
                    "NORMAL",
                  )
                }
              >
                Regular
              </option>

              <option
                value="NEON"
                disabled={
                  !hasItemValue(
                    item,
                    valueSource,
                    "NEON",
                  )
                }
              >
                Neon
              </option>

              <option
                value="MEGA"
                disabled={
                  !hasItemValue(
                    item,
                    valueSource,
                    "MEGA",
                  )
                }
              >
                Mega
              </option>
            </select>

            <motion.span
              key={`${selectedItem.id}-${valueType}`}
              initial={{
                opacity: 0,
                scale: shouldReduceMotion ? 1 : 0.9,
              }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full rounded-full bg-slate-100 px-2 py-1 text-center text-xs font-black tabular-nums text-slate-700 dark:bg-white/10 dark:text-white sm:w-auto sm:px-4 sm:py-1.5 sm:text-sm"
            >
              {formatTradeValue(
                getItemValue(
                  item,
                  valueSource,
                  valueType,
                ),
              )}
            </motion.span>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
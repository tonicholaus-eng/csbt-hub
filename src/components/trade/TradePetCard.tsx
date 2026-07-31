"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

import {
  SelectedTradeItem,
  TradeValue,
  ValueType,
} from "./types";

type Props = {
  selectedItem: SelectedTradeItem;
  onRemove: () => void;
  onValueTypeChange: (valueType: ValueType) => void;
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

function ItemImage({ src, name, category }: ItemImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div className="flex h-[72px] w-[72px] items-center justify-center text-4xl">
        {category === "PETWEAR" ? "🎩" : "🐾"}
        <span className="sr-only">Image unavailable for {name}</span>
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
      className="h-[72px] w-[72px] object-contain transition-transform duration-300 group-hover/card:scale-110"
    />
  );
}

function formatValue(value: TradeValue) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return "—";
  }
  return String(value);
}

function hasValue(value: TradeValue) {
  if (value === null || value === undefined) return false;

  const match = String(value).replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);

  return !!match && Number(match[0]) > 0;
}

export default function TradePetCard({
  selectedItem,
  onRemove,
  onValueTypeChange,
}: Props) {
  const shouldReduceMotion = useReducedMotion();
  const { item, valueType } = selectedItem;

  return (
    <motion.article
      layout={!shouldReduceMotion}
      whileHover={
        shouldReduceMotion ? undefined : { y: -4, scale: 1.01 }
      }
      className="group/card relative overflow-hidden rounded-[22px] border border-white/70 bg-white/90 p-4 shadow-md backdrop-blur dark:border-white/10 dark:bg-slate-900/85 sm:rounded-3xl sm:p-5"
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400" />

      <motion.button
        type="button"
        onClick={onRemove}
        whileHover={shouldReduceMotion ? undefined : { scale: 1.08, rotate: 5 }}
        whileTap={{ scale: shouldReduceMotion ? 1 : 0.92 }}
        aria-label={`Remove ${item.NAME} from trade`}
        className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-red-500 font-black text-white"
      >
        ✕
      </motion.button>

      <div className="relative flex items-center gap-4 pr-8">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl border border-yellow-100 bg-gradient-to-br from-yellow-50 via-white to-orange-100 shadow-inner dark:border-white/10 dark:from-slate-800 dark:via-slate-900 dark:to-slate-950">
          <ItemImage src={item.IMAGE} name={item.NAME} category={item.CATEGORY} />
        </div>

        <div className="min-w-0 flex-1">
          <h4 className="truncate text-lg font-black text-slate-800 dark:text-white">
            {item.NAME}
          </h4>

          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {item.CATEGORY === "PET" ? "Pet" : "Pet Wear"} • Current CSBT Value
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <select
              value={valueType}
              onChange={(e) => onValueTypeChange(e.target.value as ValueType)}
              className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-black ${badgeColors[valueType]}`}
            >
              <option value="NORMAL" disabled={!hasValue(item.NORMAL)}>Normal</option>
              <option value="NEON" disabled={!hasValue(item.NEON)}>Neon</option>
              <option value="MEGA" disabled={!hasValue(item.MEGA)}>Mega</option>
            </select>

            <motion.span
              key={`${selectedItem.id}-${valueType}`}
              initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-full bg-slate-100 px-4 py-1.5 text-sm font-black tabular-nums text-slate-700 dark:bg-white/10 dark:text-white"
            >
              {formatValue(item[valueType])}
            </motion.span>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
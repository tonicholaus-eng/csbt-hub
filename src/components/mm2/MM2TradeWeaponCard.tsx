"use client";

import { motion, useReducedMotion } from "framer-motion";
import MM2WeaponPlate from "./MM2WeaponPlate";
import type {
  MM2SelectedTradeItem,
  MM2ValueSource,
} from "./MM2TradeTypes";

function imageUrl(image?: string) {
  if (!image) return null;
  if (/^https?:\/\//i.test(image)) return image;
  const clean = image.replace(/^\.\.\//, "/").replace(/^\/+/, "/");
  return `https://supremevalues.com${clean}`;
}

function rawValue(
  selectedItem: MM2SelectedTradeItem,
  valueSource: MM2ValueSource,
) {
  const value =
    valueSource === "SUPREME"
      ? selectedItem.item.SOURCE_VALUE
      : selectedItem.item.GCASH_VALUE;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatValue(value: number | null) {
  if (value === null) return "N/A";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

export default function MM2TradeWeaponCard({
  selectedItem,
  valueSource,
  onRemove,
  onQuantityChange,
}: {
  selectedItem: MM2SelectedTradeItem;
  valueSource: MM2ValueSource;
  onRemove: () => void;
  onQuantityChange: (quantity: number) => void;
}) {
  const shouldReduceMotion = useReducedMotion();
  const src = imageUrl(selectedItem.item.IMAGE);
  const value = rawValue(selectedItem, valueSource);
  const subtotal =
    value === null ? null : value * Math.max(1, selectedItem.quantity);

  return (
    <motion.article
      layout={!shouldReduceMotion}
      whileHover={shouldReduceMotion ? undefined : { y: -2 }}
      className="group relative overflow-hidden rounded-[17px] border border-white/[0.09] bg-[#111722] p-2.5 shadow-[0_10px_24px_rgba(0,0,0,.22)] sm:rounded-[20px] sm:p-3"
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-red-400/35 to-transparent" />

      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${selectedItem.item.NAME} from trade`}
        className="csbt-tap absolute right-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-red-300/15 bg-red-500 text-[12px] font-black text-white shadow-lg transition hover:scale-105 hover:bg-red-400 sm:h-8 sm:w-8"
      >
        ✕
      </button>

      <div className="flex min-w-0 gap-2.5 pr-8 sm:gap-3">
        <div className="flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-[15px] border border-white/[0.08] bg-gradient-to-br from-[#1d2533] via-[#10151e] to-[#080a0e] p-1.5 shadow-inner sm:h-[78px] sm:w-[78px] sm:rounded-[18px]">
          <MM2WeaponPlate
            name={selectedItem.item.NAME}
            category={selectedItem.item.CATEGORY}
            src={src}
            size={68}
            radius={15}
            className="transition duration-200 group-hover:scale-[1.03]"
          />
        </div>

        <div className="min-w-0 flex-1">
          <span className="block truncate text-[11px] font-black uppercase tracking-[.12em] text-red-300/80">
            {selectedItem.item.CATEGORY ?? "Weapon"}
          </span>

          <h3 className="mt-0.5 truncate text-sm font-black text-white">
            {selectedItem.item.NAME}
          </h3>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className={`text-[12px] font-black ${
                value === null ? "text-amber-300" : "text-zinc-200"
              }`}
            >
              {valueSource}: {formatValue(value)}
            </span>
            <span className="text-[11.5px] font-bold text-[var(--mm2-ink-3)]">
              Demand {selectedItem.item.DEMAND ?? 0}/10
            </span>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center rounded-xl border border-white/[0.08] bg-black/25 p-0.5">
              <button
                type="button"
                onClick={() =>
                  onQuantityChange(Math.max(1, selectedItem.quantity - 1))
                }
                className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black text-[var(--mm2-ink-2)] transition hover:bg-white/[0.06] hover:text-white"
                aria-label={`Decrease ${selectedItem.item.NAME} quantity`}
              >
                −
              </button>

              <span className="min-w-7 text-center text-[12px] font-black text-zinc-200">
                {selectedItem.quantity}
              </span>

              <button
                type="button"
                onClick={() =>
                  onQuantityChange(Math.min(99, selectedItem.quantity + 1))
                }
                className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black text-[var(--mm2-ink-2)] transition hover:bg-white/[0.06] hover:text-white"
                aria-label={`Increase ${selectedItem.item.NAME} quantity`}
              >
                +
              </button>
            </div>

            <div className="min-w-0 text-right">
              <span className="block text-[11px] font-black uppercase tracking-[.09em] text-[var(--mm2-ink-3)]">
                Subtotal
              </span>
              <strong
                className={`block truncate text-[12px] font-black ${
                  subtotal === null ? "text-amber-300" : "text-zinc-300"
                }`}
              >
                {subtotal === null ? "N/A" : formatValue(subtotal)}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

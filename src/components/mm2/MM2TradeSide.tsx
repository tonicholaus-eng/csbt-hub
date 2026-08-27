"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import MM2TradeWeaponCard from "./MM2TradeWeaponCard";
import type {
  MM2SelectedTradeItem,
  MM2ValueSource,
} from "./MM2TradeTypes";

type SideColor = "amber" | "cyan";

function formatTotal(total: number) {
  if (!Number.isFinite(total)) return "0";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(total);
}

export default function MM2TradeSide({
  title,
  subtitle,
  color,
  items,
  total,
  missingCount,
  onAdd,
  onRemove,
  onQuantityChange,
  valueSource,
}: {
  title: string;
  subtitle: string;
  color: SideColor;
  items: MM2SelectedTradeItem[];
  total: number;
  missingCount: number;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onQuantityChange: (id: string, quantity: number) => void;
  valueSource: MM2ValueSource;
}) {
  const shouldReduceMotion = useReducedMotion();
  const isAmber = color === "amber";
  const totalQuantity = items.reduce(
    (sum, selectedItem) => sum + Math.max(1, selectedItem.quantity),
    0,
  );

  const headerGradient = isAmber
    ? "from-yellow-500 via-amber-500 to-orange-600"
    : "from-cyan-500 via-sky-500 to-blue-600";

  const sideBorder = isAmber ? "border-amber-400/18" : "border-cyan-400/18";
  const totalText = isAmber ? "text-amber-300" : "text-cyan-300";
  const softBackground = isAmber
    ? "from-amber-500/10 via-orange-500/[0.03] to-transparent"
    : "from-cyan-500/10 via-blue-500/[0.03] to-transparent";

  return (
    <motion.section
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.45,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={`relative flex min-w-0 flex-col overflow-hidden rounded-[22px] border ${sideBorder} bg-[#0d1017]/95 shadow-[0_22px_58px_rgba(0,0,0,.28)] sm:rounded-[32px]`}
      aria-label={`${title} trade section`}
    >
      <div className={`relative overflow-hidden bg-gradient-to-r ${headerGradient} px-3 py-3 sm:px-6 sm:py-5`}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,.28),transparent_48%)]" />
        <div className="relative flex items-center justify-between gap-2 sm:gap-4">
          <div className="min-w-0">
            <p className="text-[8px] font-black uppercase tracking-[.16em] text-white/70 sm:text-[10px]">
              {subtitle}
            </p>
            <h2 className="mt-0.5 truncate text-sm font-black tracking-tight text-white sm:text-2xl">
              {title}
            </h2>
          </div>

          <span className="shrink-0 rounded-full border border-white/20 bg-black/15 px-2 py-1 text-[9px] font-black text-white/95 backdrop-blur sm:px-3 sm:py-1.5 sm:text-xs">
            {totalQuantity} {totalQuantity === 1 ? "Item" : "Items"}
          </span>
        </div>
      </div>

      <div className={`relative flex flex-1 flex-col bg-gradient-to-b ${softBackground} p-2.5 sm:p-5`}>
        <motion.button
          type="button"
          onClick={onAdd}
          whileHover={shouldReduceMotion ? undefined : { y: -2, scale: 1.01 }}
          whileTap={{ scale: shouldReduceMotion ? 1 : 0.97 }}
          className={`min-h-11 rounded-xl bg-gradient-to-r ${headerGradient} px-3 text-xs font-black text-white shadow-lg transition sm:min-h-14 sm:rounded-2xl sm:text-sm`}
        >
          + Add Weapon
        </motion.button>

        <div className="mt-3 flex-1 overflow-hidden rounded-[16px] border border-white/[0.075] bg-black/25 shadow-inner sm:mt-4 sm:rounded-[24px]">
          <div className="h-[238px] overflow-y-auto overscroll-contain p-2 sm:h-[275px] sm:p-3 lg:h-[285px] xl:h-[275px]">
            {items.length === 0 ? (
              <button
                type="button"
                onClick={onAdd}
                className="flex h-full w-full flex-col items-center justify-center rounded-[14px] border-2 border-dashed border-white/[0.10] bg-white/[0.012] px-3 text-center transition hover:border-white/20 hover:bg-white/[0.025] sm:rounded-[20px]"
              >
                <motion.div
                  animate={
                    shouldReduceMotion
                      ? undefined
                      : { y: [0, -6, 0], rotate: [-2, 2, -2] }
                  }
                  transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                  className={`text-3xl sm:text-6xl ${isAmber ? "text-amber-300" : "text-cyan-300"}`}
                  aria-hidden="true"
                >
                  ◆
                </motion.div>
                <strong className="mt-3 text-xs font-black text-zinc-200 sm:text-xl">
                  No Weapons Added
                </strong>
                <span className="mt-1 hidden text-xs font-semibold text-zinc-600 sm:block">
                  Add a weapon to start building this offer.
                </span>
              </button>
            ) : (
              <div className="space-y-2.5" aria-live="polite">
                <AnimatePresence initial={false}>
                  {items.map((selectedItem) => (
                    <motion.div
                      key={selectedItem.id}
                      layout={!shouldReduceMotion}
                      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.97 }}
                      transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
                    >
                      <MM2TradeWeaponCard
                        selectedItem={selectedItem}
                        valueSource={valueSource}
                        onRemove={() => onRemove(selectedItem.id)}
                        onQuantityChange={(quantity) =>
                          onQuantityChange(selectedItem.id, quantity)
                        }
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        <div className={`mt-3 rounded-[16px] border border-white/[0.07] bg-black/25 p-3 text-center shadow-inner sm:mt-4 sm:rounded-[22px] sm:p-4`}>
          <p className="text-[8px] font-black uppercase tracking-[0.16em] text-zinc-600 sm:text-[10px]">
            {valueSource} Total
          </p>
          <motion.p
            key={`${total}-${valueSource}`}
            initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`mt-1 break-words text-xl font-black tabular-nums sm:text-4xl ${totalText}`}
          >
            {formatTotal(total)}
          </motion.p>
          <p className="mt-1.5 hidden text-[10px] font-semibold text-zinc-600 sm:block">
            {missingCount > 0
              ? `${missingCount} selected item${missingCount === 1 ? " is" : "s are"} missing this value`
              : "Combined selected weapon values"}
          </p>
        </div>
      </div>
    </motion.section>
  );
}

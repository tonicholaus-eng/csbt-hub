"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import MM2TradeWeaponCard from "./MM2TradeWeaponCard";
import type {
  MM2SelectedTradeItem,
  MM2ValueSource,
} from "./MM2TradeTypes";

/**
 * Which side of the trade this bay is.
 *
 * MM2 reads the two sides as crimson (what leaves) against steel (what
 * arrives) — the same two materials the rest of MM2 is built from. This used
 * to be Adopt Me's amber-vs-cyan, which made the calculator the least
 * MM2-looking screen in the game.
 */
type SideColor = "give" | "receive";

const SIDE_TONE = {
  give: {
    rule: "rgba(226,52,74,.34)",
    wash: "radial-gradient(ellipse 130% 90% at 6% 0%, rgba(226,52,74,.09), transparent 60%)",
    action:
      "border-[rgba(226,52,74,.34)] bg-[linear-gradient(135deg,rgba(143,18,36,.62),rgba(194,37,57,.32))] text-[#ffd7dc]",
    mark: "#e79aa3",
  },
  receive: {
    rule: "rgba(126,158,190,.30)",
    wash: "radial-gradient(ellipse 130% 90% at 6% 0%, rgba(126,158,190,.08), transparent 60%)",
    action:
      "border-[rgba(126,158,190,.32)] bg-[linear-gradient(135deg,rgba(44,66,88,.66),rgba(74,102,128,.34))] text-[#d3e2ef]",
    mark: "#a8c0d4",
  },
} as const;

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
  const tone = SIDE_TONE[color];
  const totalQuantity = items.reduce(
    (sum, selectedItem) => sum + Math.max(1, selectedItem.quantity),
    0,
  );

  return (
    <motion.section
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.4,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="relative flex min-w-0 flex-col overflow-hidden rounded-[20px] border border-[var(--mm2-edge)] bg-[var(--mm2-panel)] shadow-[var(--mm2-shadow-panel)] sm:rounded-[24px]"
      aria-label={`${title} trade section`}
    >
      {/* The bay is lit from its own rail rather than painted a solid colour. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, ${tone.rule}, transparent 70%)` }}
      />

      <div className="relative border-b border-[var(--mm2-edge)] bg-[var(--mm2-riser)] px-3.5 py-3.5 sm:px-5 sm:py-4">
        <div className="relative flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-[var(--mm2-ink-3)] sm:text-[11px]">
              {subtitle}
            </p>
            <h2 className="mt-1 truncate text-[17px] font-black tracking-[-.03em] text-white sm:text-[22px]">
              {title}
            </h2>
          </div>

          <span className="shrink-0 rounded-[10px] border border-[var(--mm2-edge-strong)] bg-black/35 px-2.5 py-1.5 text-[12px] font-black tabular-nums text-[var(--mm2-ink-2)]">
            {totalQuantity} {totalQuantity === 1 ? "Item" : "Items"}
          </span>
        </div>
      </div>

      <div className="relative flex flex-1 flex-col p-2.5 sm:p-4" style={{ background: tone.wash }}>
        <motion.button
          type="button"
          onClick={onAdd}
          whileHover={shouldReduceMotion ? undefined : { y: -1 }}
          whileTap={{ scale: shouldReduceMotion ? 1 : 0.98 }}
          className={`min-h-12 rounded-[12px] border px-3 text-[13px] font-black transition hover:brightness-125 sm:min-h-[52px] sm:text-[14px] ${tone.action}`}
        >
          + Add Weapon
        </motion.button>

        <div className="mt-3 flex-1 overflow-hidden rounded-[14px] border border-[var(--mm2-edge)] bg-black/30 shadow-inner sm:mt-3.5 sm:rounded-[16px]">
          <div className="h-[238px] overflow-y-auto overscroll-contain p-2 sm:h-[275px] sm:p-3 lg:h-[285px] xl:h-[275px]">
            {items.length === 0 ? (
              <button
                type="button"
                onClick={onAdd}
                className="flex h-full w-full flex-col items-center justify-center rounded-[12px] border border-dashed border-[var(--mm2-edge-strong)] bg-white/[0.012] px-3 text-center transition hover:border-[var(--mm2-edge-lit)] hover:bg-white/[0.03]"
              >
                <span
                  aria-hidden="true"
                  className="flex h-12 w-12 items-center justify-center rounded-[13px] border border-[var(--mm2-edge-strong)] bg-black/40 sm:h-14 sm:w-14"
                  style={{ color: tone.mark }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-6 w-6 fill-none stroke-current sm:h-7 sm:w-7"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 6v12M6 12h12" />
                  </svg>
                </span>
                <strong className="mt-3.5 text-[14px] font-black text-[var(--mm2-ink-2)] sm:text-[17px]">
                  No weapons added
                </strong>
                <span className="mt-1 hidden text-[12.5px] font-semibold text-[var(--mm2-ink-3)] sm:block">
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

        <div className="mt-3 rounded-[14px] border border-[var(--mm2-edge)] bg-black/30 p-3 text-center shadow-inner sm:mt-3.5 sm:rounded-[16px] sm:p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--mm2-ink-3)] sm:text-[11px]">
            {valueSource} Total
          </p>
          <motion.p
            key={`${total}-${valueSource}`}
            initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-1 break-words text-[26px] font-black tabular-nums tracking-[-.04em] text-white sm:text-[38px]"
          >
            {formatTotal(total)}
          </motion.p>
          <p className="mt-1.5 hidden text-[12px] font-semibold text-[var(--mm2-ink-3)] sm:block">
            {missingCount > 0
              ? `${missingCount} selected item${missingCount === 1 ? " is" : "s are"} missing this value`
              : "Combined selected weapon values"}
          </p>
        </div>
      </div>
    </motion.section>
  );
}

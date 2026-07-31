"use client";

import {
  motion,
  useReducedMotion,
} from "framer-motion";

import TradePetCard from "./TradePetCard";
import {
  SelectedTradeItem,
  ValueType,
} from "./types";

type Props = {
  title: string;
  color: "yellow" | "cyan";
  items: SelectedTradeItem[];
  total: number;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onValueTypeChange: (
    id: string,
    valueType: ValueType,
  ) => void;
};

function formatTotal(total: number): string {
  if (!Number.isFinite(total)) {
    return "0";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(total);
}

export default function TradeSide({
  title,
  color,
  items,
  total,
  onAdd,
  onRemove,
  onValueTypeChange,
}: Props) {
  const shouldReduceMotion =
    useReducedMotion();

  const isYellow = color === "yellow";

  return (
    <motion.section
      initial={{
        opacity: 0,
        y: shouldReduceMotion ? 0 : 24,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
      }}
      viewport={{
        once: true,
        margin: "-40px",
      }}
      transition={{
        duration: shouldReduceMotion
          ? 0
          : 0.55,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={
        shouldReduceMotion
          ? undefined
          : {
              y: -4,
            }
      }
      className={`group relative flex h-full min-w-0 flex-col overflow-hidden rounded-[28px] border bg-white/75 shadow-xl backdrop-blur-xl transition-[background-color,border-color,box-shadow] duration-300 hover:shadow-[0_25px_70px_rgba(15,23,42,.15)] dark:bg-slate-900/70 dark:shadow-[0_24px_70px_rgba(0,0,0,.3)] sm:rounded-[34px] ${
        isYellow
          ? "border-yellow-200/70 dark:border-amber-400/15"
          : "border-cyan-200/70 dark:border-cyan-400/15"
      }`}
      aria-label={`${title} trade section`}
    >
      {/* Top accent */}
      <div
        className={`absolute inset-x-0 top-0 z-20 h-1.5 bg-gradient-to-r ${
          isYellow
            ? "from-yellow-400 via-orange-400 to-yellow-500"
            : "from-cyan-400 via-sky-400 to-blue-500"
        }`}
      />

      {/* Background glow */}
      <div
        className={`pointer-events-none absolute -right-24 top-20 h-64 w-64 rounded-full blur-3xl ${
          isYellow
            ? "bg-amber-300/10 dark:bg-amber-500/5"
            : "bg-cyan-300/10 dark:bg-cyan-500/5"
        }`}
      />

      {/* Header */}
      <div
        className={`relative overflow-hidden px-5 py-6 sm:px-7 sm:py-7 ${
          isYellow
            ? "bg-gradient-to-r from-yellow-400 via-orange-400 to-orange-500"
            : "bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600"
        }`}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,.28),transparent_45%)]" />

        <div className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 rotate-12 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 blur-lg transition-all duration-700 group-hover:left-[130%] group-hover:opacity-100" />

        <div className="relative flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h3 className="truncate text-2xl font-black tracking-tight text-white sm:text-3xl">
              {title}
            </h3>

            <p className="mt-1 text-sm font-medium text-white/80">
              Build your trade offer
            </p>
          </div>

          <span className="shrink-0 rounded-full border border-white/20 bg-white/20 px-3 py-2 text-xs font-black text-white shadow-sm backdrop-blur-md sm:px-4 sm:text-sm">
            {items.length}{" "}
            {items.length === 1
              ? "Item"
              : "Items"}
          </span>
        </div>
      </div>

      <div className="relative flex flex-1 flex-col p-4 sm:p-6">
        {/* Add button */}
        <motion.button
          type="button"
          onClick={onAdd}
          whileHover={
            shouldReduceMotion
              ? undefined
              : {
                  y: -3,
                  scale: 1.015,
                }
          }
          whileTap={{
            scale: shouldReduceMotion
              ? 1
              : 0.96,
          }}
          className={`group/add min-h-14 rounded-2xl px-5 py-4 text-base font-black text-white shadow-lg outline-none transition-shadow duration-300 hover:shadow-2xl focus-visible:ring-4 sm:text-lg ${
            isYellow
              ? "bg-gradient-to-r from-yellow-500 via-orange-500 to-amber-500 shadow-orange-300/25 focus-visible:ring-amber-300/50 dark:shadow-orange-950/30 dark:focus-visible:ring-amber-400/30"
              : "bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 shadow-cyan-300/25 focus-visible:ring-cyan-300/50 dark:shadow-cyan-950/30 dark:focus-visible:ring-cyan-400/30"
          }`}
        >
          <span className="inline-flex items-center gap-2 transition-all duration-300 group-hover/add:gap-3">
            <span
              aria-hidden="true"
              className="text-xl"
            >
              +
            </span>

            Add Item
          </span>
        </motion.button>

        {/* Item list */}
        <div className="mt-5 flex-1 overflow-hidden rounded-[24px] border border-white/70 bg-white/65 shadow-inner transition-colors duration-300 dark:border-white/10 dark:bg-slate-950/45 sm:mt-6 sm:rounded-3xl">
          <div className="h-[360px] overflow-y-auto overscroll-contain p-3 sm:h-[430px] sm:p-4">
            {items.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center rounded-[20px] border-2 border-dashed border-slate-300 px-5 text-center dark:border-white/10 dark:bg-white/[0.02]">
                <motion.div
                  animate={
                    shouldReduceMotion
                      ? undefined
                      : {
                          y: [0, -8, 0],
                          rotate: [
                            -3,
                            3,
                            -3,
                          ],
                        }
                  }
                  transition={{
                    duration: 2.6,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="text-6xl sm:text-7xl"
                  aria-hidden="true"
                >
                  ✨
                </motion.div>

                <h4 className="mt-5 text-xl font-black text-slate-700 dark:text-white sm:text-2xl">
                  No Items Added
                </h4>

                <p className="mt-3 max-w-xs text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Press the{" "}
                  <span className="font-bold text-slate-700 dark:text-slate-200">
                    Add Item
                  </span>{" "}
                  button to start building your
                  trade.
                </p>
              </div>
            ) : (
              <div
                className="space-y-3 sm:space-y-4"
                aria-live="polite"
              >
                {items.map(
                  (selectedItem) => (
                    <motion.div
                      key={selectedItem.id}
                      layout={
                        !shouldReduceMotion
                      }
                      initial={{
                        opacity: 0,
                        y: shouldReduceMotion
                          ? 0
                          : 12,
                        scale:
                          shouldReduceMotion
                            ? 1
                            : 0.98,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        scale: 1,
                      }}
                      exit={{
                        opacity: 0,
                        scale:
                          shouldReduceMotion
                            ? 1
                            : 0.96,
                      }}
                      transition={{
                        duration:
                          shouldReduceMotion
                            ? 0
                            : 0.25,
                        ease: [
                          0.22,
                          1,
                          0.36,
                          1,
                        ],
                      }}
                    >
                      <TradePetCard
                        selectedItem={
                          selectedItem
                        }
                        onRemove={() =>
                          onRemove(
                            selectedItem.id,
                          )
                        }
                        onValueTypeChange={(
                          valueType,
                        ) =>
                          onValueTypeChange(
                            selectedItem.id,
                            valueType,
                          )
                        }
                      />
                    </motion.div>
                  ),
                )}
              </div>
            )}
          </div>
        </div>

        {/* Total */}
        <div
          className={`relative mt-5 overflow-hidden rounded-[24px] border p-5 text-center shadow-inner transition-colors duration-300 sm:mt-6 sm:rounded-3xl sm:p-6 ${
            isYellow
              ? "border-yellow-200/70 bg-gradient-to-br from-yellow-100 via-yellow-50 to-orange-100 dark:border-amber-400/10 dark:from-amber-500/10 dark:via-orange-500/5 dark:to-yellow-500/10"
              : "border-cyan-200/70 bg-gradient-to-br from-cyan-100 via-cyan-50 to-blue-100 dark:border-cyan-400/10 dark:from-cyan-500/10 dark:via-sky-500/5 dark:to-blue-500/10"
          }`}
        >
          <div
            className={`pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-25 blur-3xl ${
              isYellow
                ? "bg-yellow-400 dark:bg-amber-500/30"
                : "bg-cyan-400 dark:bg-cyan-500/30"
            }`}
          />

          <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent dark:via-white/15" />

          <div className="relative">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400 sm:text-sm sm:tracking-[0.3em]">
              Total Value
            </p>

            <motion.p
              key={total}
              initial={{
                opacity: 0,
                scale: shouldReduceMotion
                  ? 1
                  : 0.94,
              }}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              transition={{
                duration:
                  shouldReduceMotion
                    ? 0
                    : 0.25,
              }}
              className={`mt-3 break-words text-5xl font-black tabular-nums sm:mt-4 sm:text-6xl ${
                isYellow
                  ? "text-yellow-700 dark:text-amber-300"
                  : "text-cyan-700 dark:text-cyan-300"
              }`}
            >
              {formatTotal(total)}
            </motion.p>

            <p className="mt-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
              Combined Selected Variants
            </p>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
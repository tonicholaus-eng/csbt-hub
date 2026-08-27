"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { MM2ValueSource } from "./MM2TradeTypes";

export type MM2TradeResult = "READY" | "CHECK" | "WIN" | "FAIR" | "LOSE";

type ResultConfig = {
  title: MM2TradeResult;
  emoji: string;
  color: string;
  glow: string;
  message: string;
  explanation: string;
};

function formatValue(value: number) {
  if (!Number.isFinite(value)) return "0";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

export function getMM2TradeResult(
  yourTotal: number,
  theirTotal: number,
  valueSource: MM2ValueSource,
  missingCount: number,
): ResultConfig {
  const sourceLabel = valueSource === "SUPREME" ? "Supreme Value" : "GCash Value";

  if (yourTotal === 0 && theirTotal === 0 && missingCount === 0) {
    return {
      title: "READY",
      emoji: "⚖️",
      color: "from-slate-600 via-slate-700 to-slate-900",
      glow: "shadow-black/30",
      message: "Add weapons to both sides to calculate your trade.",
      explanation: `This calculator is currently using ${sourceLabel}.`,
    };
  }

  if (missingCount > 0) {
    return {
      title: "CHECK",
      emoji: "🔎",
      color: "from-orange-500 via-amber-600 to-orange-800",
      glow: "shadow-orange-950/35",
      message: `${missingCount} selected item${missingCount === 1 ? " is" : "s are"} missing the active value source.`,
      explanation: "CSBT withholds W/F/L instead of estimating missing MM2 values.",
    };
  }

  const difference = Math.abs(theirTotal - yourTotal);
  const baseline = Math.max(yourTotal, theirTotal, 1);
  const differencePercent = (difference / baseline) * 100;

  if (differencePercent <= 5) {
    return {
      title: "FAIR",
      emoji: "🤝",
      color: "from-amber-400 via-orange-500 to-amber-700",
      glow: "shadow-orange-950/35",
      message: `The offers are within ${differencePercent.toFixed(1)}% of each other.`,
      explanation: `Fair-range result using ${sourceLabel}. Demand still matters outside raw value.`,
    };
  }

  if (theirTotal > yourTotal) {
    return {
      title: "WIN",
      emoji: "🏆",
      color: "from-emerald-500 via-green-600 to-emerald-800",
      glow: "shadow-emerald-950/35",
      message: `You gain ${formatValue(difference)} in listed value.`,
      explanation: `You're receiving more ${sourceLabel} than you're giving.`,
    };
  }

  return {
    title: "LOSE",
    emoji: "⚠️",
    color: "from-rose-500 via-red-600 to-red-800",
    glow: "shadow-red-950/35",
    message: `You overpay by ${formatValue(difference)} in listed value.`,
    explanation: `You're giving more ${sourceLabel} than you're receiving.`,
  };
}

export default function MM2TradeSummary({
  yourTotal,
  theirTotal,
  valueSource,
  missingCount,
}: {
  yourTotal: number;
  theirTotal: number;
  valueSource: MM2ValueSource;
  missingCount: number;
}) {
  const shouldReduceMotion = useReducedMotion();
  const safeYourTotal = Number.isFinite(yourTotal) ? Math.max(0, yourTotal) : 0;
  const safeTheirTotal = Number.isFinite(theirTotal) ? Math.max(0, theirTotal) : 0;
  const result = getMM2TradeResult(
    safeYourTotal,
    safeTheirTotal,
    valueSource,
    missingCount,
  );

  const difference = Math.abs(safeTheirTotal - safeYourTotal);
  const maximumValue = Math.max(safeYourTotal, safeTheirTotal, 1);
  const yourPercent = Math.min(100, Math.max(0, (safeYourTotal / maximumValue) * 100));
  const theirPercent = Math.min(100, Math.max(0, (safeTheirTotal / maximumValue) * 100));
  const hasTradeValues = safeYourTotal > 0 || safeTheirTotal > 0 || missingCount > 0;

  return (
    <motion.section
      aria-labelledby="mm2-trade-result-heading"
      aria-live="polite"
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`relative mt-7 overflow-hidden rounded-[28px] bg-gradient-to-r ${result.color} p-5 text-white shadow-2xl ${result.glow} sm:mt-9 sm:rounded-[34px] sm:p-7 lg:p-8`}
    >
      <div className="pointer-events-none absolute -left-20 top-0 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,.18),transparent_50%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.045)_1px,transparent_1px)] bg-[size:34px_34px]" />
      <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />

      <div className="relative mx-auto max-w-6xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={result.title}
            initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.96, y: shouldReduceMotion ? 0 : 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.98 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="text-center"
          >
            <motion.div
              animate={
                shouldReduceMotion
                  ? undefined
                  : { y: [0, -8, 0], rotate: [-2, 2, -2] }
              }
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
              className="text-5xl drop-shadow-xl sm:text-6xl"
              aria-hidden="true"
            >
              {result.emoji}
            </motion.div>

            <h2
              id="mm2-trade-result-heading"
              className="mt-3 text-4xl font-black tracking-tight drop-shadow-sm sm:mt-4 sm:text-5xl"
            >
              {result.title}
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-base font-medium text-white/90 sm:mt-4 sm:text-xl">
              {result.message}
            </p>
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 grid gap-4 sm:mt-12 sm:gap-6 md:grid-cols-3">
          <SummaryValue label="Your Offer" value={safeYourTotal} />
          <SummaryValue label="Difference" value={difference} emphasized />
          <SummaryValue label="Their Offer" value={safeTheirTotal} />
        </div>

        {hasTradeValues ? (
          <div className="mt-6 rounded-[24px] border border-white/15 bg-white/15 p-4 shadow-inner backdrop-blur-xl sm:mt-10 sm:rounded-3xl sm:p-7">
            <div className="mb-6 flex items-center justify-between gap-4 text-xs font-black uppercase tracking-wider text-white/80 sm:text-sm">
              <span>Your Offer</span>
              <span>Their Offer</span>
            </div>

            <div className="space-y-6">
              <ComparisonBar label="Your Value" value={safeYourTotal} percent={yourPercent} />
              <ComparisonBar label="Their Value" value={safeTheirTotal} percent={theirPercent} />
            </div>

            <div className="mt-7 rounded-2xl border border-white/10 bg-white/10 p-4 text-center shadow-inner sm:mt-8 sm:p-5">
              <p className="text-sm font-semibold leading-relaxed text-white/95 sm:text-lg">
                {result.explanation}
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-[24px] border border-white/15 bg-white/10 p-5 text-center backdrop-blur-xl sm:mt-10 sm:rounded-3xl">
            <p className="font-semibold leading-relaxed text-white/90">
              Add at least one weapon to either offer to begin the comparison.
            </p>
          </div>
        )}

        <p className="mx-auto mt-6 max-w-3xl text-center text-xs leading-relaxed text-white/70 sm:text-sm">
          W/F/L is based on the selected MM2 value source. Demand, collectibility, and player preference can still affect the real trade.
        </p>
      </div>
    </motion.section>
  );
}

function SummaryValue({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: number;
  emphasized?: boolean;
}) {
  return (
    <div
      className={`rounded-[22px] border border-white/15 p-5 text-center shadow-inner backdrop-blur-xl sm:rounded-3xl sm:p-7 ${
        emphasized ? "bg-white/20" : "bg-white/10"
      }`}
    >
      <p className="text-xs font-black uppercase tracking-[.16em] text-white/70 sm:text-sm">
        {label}
      </p>
      <p className="mt-2 break-words text-2xl font-black tabular-nums sm:mt-4 sm:text-4xl">
        {formatValue(value)}
      </p>
    </div>
  );
}

function ComparisonBar({
  label,
  value,
  percent,
}: {
  label: string;
  value: number;
  percent: number;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4 text-sm font-black">
        <span>{label}</span>
        <span className="tabular-nums">{formatValue(value)}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-black/20 shadow-inner sm:h-4">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(percent > 0 ? 4 : 0, percent)}%` }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="h-full rounded-full bg-white/85 shadow-[0_0_18px_rgba(255,255,255,.25)]"
        />
      </div>
    </div>
  );
}

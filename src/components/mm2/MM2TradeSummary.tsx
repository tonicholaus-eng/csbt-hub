"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { MM2ValueSource } from "./MM2TradeTypes";
import { getTradeVerdict } from "../../lib/trade/verdict";

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

/**
 * The verdict mark. MM2 uses the same stroked icon set everywhere else; the
 * result panel was the one place still rendering an emoji, at 60px, bouncing.
 */
export function VerdictIcon({
  verdict,
  className = "h-7 w-7 sm:h-8 sm:w-8",
}: {
  verdict: MM2TradeResult;
  className?: string;
}) {
  const paths: Record<MM2TradeResult, string> = {
    // balance scale — nothing weighed yet
    READY: "M12 5v14M6 19h12M12 7 5 10l7 3 7-3-7-3ZM5 10v1a2.5 2.5 0 0 0 5 0v-1M14 10v1a2.5 2.5 0 0 0 5 0v-1",
    // magnifier — a value could not be resolved
    CHECK: "M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13ZM15.5 15.5 20 20",
    // two arrows level with each other
    FAIR: "M4 9h13M14 6l3 3-3 3M20 15H7M10 12l-3 3 3 3",
    // upward step
    WIN: "M4 17l5-5 3 3 7-8M15 7h4v4",
    // downward step
    LOSE: "M4 7l5 5 3-3 7 8M15 17h4v-4",
  };

  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-none stroke-current`}
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[verdict]} />
    </svg>
  );
}

export function getMM2TradeResult(
  yourTotal: number,
  theirTotal: number,
  valueSource: MM2ValueSource,
  missingCount: number,
): ResultConfig {
  const sourceLabel = valueSource === "SUPREME" ? "Supreme Value" : "GCash Value";
  // Shared with the Adopt Me calculator so the two games can never disagree
  // about what counts as FAIR. See src/lib/trade/verdict.ts.
  const { verdict, difference, differencePercent } = getTradeVerdict(
    yourTotal,
    theirTotal,
    { missingCount },
  );

  if (verdict === "READY") {
    return {
      title: "READY",
      emoji: "⚖️",
      color: "from-[#141922] via-[#0f141c] to-[#0a0d13]",
      glow: "shadow-black/40",
      message: "Add weapons to both sides to calculate your trade.",
      explanation: `This calculator is currently using ${sourceLabel}.`,
    };
  }

  if (verdict === "CHECK") {
    return {
      title: "CHECK",
      emoji: "🔎",
      color: "from-[#4a3a1c] via-[#33270f] to-[#171308]",
      glow: "shadow-black/45",
      message: `${missingCount} selected item${missingCount === 1 ? " is" : "s are"} missing the active value source.`,
      explanation: "CSBT withholds W/F/L instead of estimating missing MM2 values.",
    };
  }

  if (verdict === "FAIR") {
    return {
      title: "FAIR",
      emoji: "🤝",
      color: "from-[#20303f] via-[#18242f] to-[#0d141b]",
      glow: "shadow-black/45",
      message: `The offers are within ${differencePercent.toFixed(1)}% of each other.`,
      explanation: `Fair-range result using ${sourceLabel}. Demand still matters outside raw value.`,
    };
  }

  if (verdict === "WIN") {
    return {
      title: "WIN",
      emoji: "🏆",
      color: "from-[#123527] via-[#0e2a1f] to-[#081511]",
      glow: "shadow-black/45",
      message: `You gain ${formatValue(difference)} in listed value.`,
      explanation: `You're receiving more ${sourceLabel} than you're giving.`,
    };
  }

  return {
    title: "LOSE",
    emoji: "⚠️",
    color: "from-[#4a1420] via-[#360e18] to-[#19070c]",
    glow: "shadow-black/45",
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
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`relative mt-7 overflow-hidden rounded-[24px] border border-[var(--mm2-edge-strong)] bg-gradient-to-br ${result.color} p-5 text-white shadow-[var(--mm2-shadow-lift)] ${result.glow} sm:mt-9 sm:rounded-[28px] sm:p-7 lg:p-8`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-14%,rgba(255,255,255,.07),transparent_58%)]" />
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
            <span
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-[16px] border border-white/20 bg-black/30 shadow-inner sm:h-16 sm:w-16"
              aria-hidden="true"
            >
              <VerdictIcon verdict={result.title} />
            </span>

            <h2
              id="mm2-trade-result-heading"
              className="mt-3 text-4xl font-black tracking-tight drop-shadow-sm sm:mt-4 sm:text-5xl"
            >
              {result.title}
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-[15px] font-medium leading-[1.6] text-white/85 sm:mt-4 sm:text-[19px]">
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
      <p className="text-[11px] font-black uppercase tracking-[.16em] text-white/75 sm:text-[13px]">
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

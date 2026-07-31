"use client";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";

type Props = {
  yourTotal: number;
  theirTotal: number;
};

type TradeResult =
  | "READY"
  | "WIN"
  | "FAIR"
  | "LOSE";

type ResultConfig = {
  title: TradeResult;
  emoji: string;
  color: string;
  glow: string;
  message: string;
  explanation: string;
};

function formatValue(value: number) {
  if (!Number.isFinite(value)) {
    return "0";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

function getTradeResult(
  yourTotal: number,
  theirTotal: number,
): ResultConfig {
  if (yourTotal === 0 && theirTotal === 0) {
    return {
      title: "READY",
      emoji: "🧮",
      color:
        "from-slate-500 via-slate-600 to-slate-800",
      glow:
        "shadow-slate-400/30 dark:shadow-black/30",
      message:
        "Add items to both sides to calculate your trade.",
      explanation:
        "Start adding items to compare both offers instantly.",
    };
  }

  if (theirTotal > yourTotal) {
    return {
      title: "WIN",
      emoji: "🏆",
      color:
        "from-green-500 via-emerald-500 to-green-700",
      glow:
        "shadow-green-400/40 dark:shadow-green-950/40",
      message: `You're underpaying by ${formatValue(
        theirTotal - yourTotal,
      )}.`,
      explanation:
        "Great trade! You're receiving more value than you're giving.",
    };
  }

  if (yourTotal > theirTotal) {
    return {
      title: "LOSE",
      emoji: "💸",
      color:
        "from-red-500 via-pink-500 to-red-700",
      glow:
        "shadow-red-400/40 dark:shadow-red-950/40",
      message: `You're overpaying by ${formatValue(
        yourTotal - theirTotal,
      )}.`,
      explanation:
        "Be careful! You're giving more value than you're receiving.",
    };
  }

  return {
    title: "FAIR",
    emoji: "🤝",
    color:
      "from-yellow-400 via-orange-400 to-amber-500",
    glow:
      "shadow-yellow-400/40 dark:shadow-orange-950/40",
    message: "Both offers have equal value.",
    explanation:
      "This trade is balanced based on the current CSBT values.",
  };
}

export default function TradeSummary({
  yourTotal,
  theirTotal,
}: Props) {
  const shouldReduceMotion =
    useReducedMotion();

  const safeYourTotal = Number.isFinite(
    yourTotal,
  )
    ? Math.max(0, yourTotal)
    : 0;

  const safeTheirTotal = Number.isFinite(
    theirTotal,
  )
    ? Math.max(0, theirTotal)
    : 0;

  const result = getTradeResult(
    safeYourTotal,
    safeTheirTotal,
  );

  const difference = Math.abs(
    safeTheirTotal - safeYourTotal,
  );

  const maximumValue = Math.max(
    safeYourTotal,
    safeTheirTotal,
    1,
  );

  const yourPercent = Math.min(
    100,
    Math.max(
      0,
      (safeYourTotal / maximumValue) * 100,
    ),
  );

  const theirPercent = Math.min(
    100,
    Math.max(
      0,
      (safeTheirTotal / maximumValue) * 100,
    ),
  );

  const hasTradeValues =
    safeYourTotal > 0 ||
    safeTheirTotal > 0;

  return (
    <motion.section
      aria-labelledby="trade-result-heading"
      aria-live="polite"
      initial={{
        opacity: 0,
        y: shouldReduceMotion ? 0 : 30,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
      }}
      viewport={{
        once: true,
        margin: "-50px",
      }}
      transition={{
        duration: shouldReduceMotion
          ? 0
          : 0.6,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={`relative mt-10 overflow-hidden rounded-[28px] bg-gradient-to-r ${result.color} p-5 text-white shadow-2xl ${result.glow} sm:mt-14 sm:rounded-[40px] sm:p-8 lg:p-10`}
    >
      {/* Background decoration */}
      <div className="pointer-events-none absolute -left-20 top-0 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

      <div className="pointer-events-none absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,.18),transparent_50%)]" />

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.045)_1px,transparent_1px)] bg-[size:34px_34px]" />

      <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />

      <div className="relative mx-auto max-w-6xl">
        {/* Result header */}
        <AnimatePresence mode="wait">
          <motion.div
            key={result.title}
            initial={{
              opacity: 0,
              scale: shouldReduceMotion
                ? 1
                : 0.96,
              y: shouldReduceMotion
                ? 0
                : 12,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              scale: shouldReduceMotion
                ? 1
                : 0.98,
            }}
            transition={{
              duration: shouldReduceMotion
                ? 0
                : 0.3,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="text-center"
          >
            <motion.div
              animate={
                shouldReduceMotion
                  ? undefined
                  : {
                      y: [0, -8, 0],
                      rotate:
                        result.title === "WIN"
                          ? [-3, 3, -3]
                          : [
                              -2,
                              2,
                              -2,
                            ],
                    }
              }
              transition={{
                duration: 2.6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="text-6xl drop-shadow-xl sm:text-8xl"
              aria-hidden="true"
            >
              {result.emoji}
            </motion.div>

            <h2
              id="trade-result-heading"
              className="mt-4 text-5xl font-black tracking-tight drop-shadow-sm sm:mt-5 sm:text-6xl"
            >
              {result.title}
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-base font-medium text-white/90 sm:mt-4 sm:text-xl">
              {result.message}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Totals */}
        <div className="mt-8 grid gap-4 sm:mt-12 sm:gap-6 md:grid-cols-3">
          <SummaryValue
            label="Your Offer"
            value={safeYourTotal}
            shouldReduceMotion={
              shouldReduceMotion
            }
          />

          <SummaryValue
            label="Difference"
            value={difference}
            emphasized
            shouldReduceMotion={
              shouldReduceMotion
            }
          />

          <SummaryValue
            label="Their Offer"
            value={safeTheirTotal}
            shouldReduceMotion={
              shouldReduceMotion
            }
          />
        </div>

        {/* Comparison bars */}
        <AnimatePresence>
          {hasTradeValues && (
            <motion.div
              initial={{
                opacity: 0,
                y: shouldReduceMotion
                  ? 0
                  : 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                y: shouldReduceMotion
                  ? 0
                  : 12,
              }}
              transition={{
                duration: shouldReduceMotion
                  ? 0
                  : 0.35,
              }}
              className="mt-6 rounded-[24px] border border-white/15 bg-white/15 p-4 shadow-inner backdrop-blur-xl sm:mt-10 sm:rounded-3xl sm:p-7"
            >
              <div className="mb-6 flex items-center justify-between gap-4 text-xs font-black uppercase tracking-wider text-white/80 sm:text-sm">
                <span>Your Offer</span>
                <span>Their Offer</span>
              </div>

              <div className="space-y-6">
                <ComparisonBar
                  label="Your Value"
                  value={safeYourTotal}
                  percent={yourPercent}
                  shouldReduceMotion={
                    shouldReduceMotion
                  }
                />

                <ComparisonBar
                  label="Their Value"
                  value={safeTheirTotal}
                  percent={theirPercent}
                  shouldReduceMotion={
                    shouldReduceMotion
                  }
                />
              </div>

              <motion.div
                key={result.title}
                initial={{
                  opacity: 0,
                  scale: shouldReduceMotion
                    ? 1
                    : 0.97,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                }}
                transition={{
                  duration: shouldReduceMotion
                    ? 0
                    : 0.3,
                }}
                className="mt-7 rounded-2xl border border-white/10 bg-white/10 p-4 text-center shadow-inner sm:mt-8 sm:p-5"
              >
                <p className="text-sm font-semibold leading-relaxed text-white/95 sm:text-lg">
                  {result.title === "WIN" && (
                    <span aria-hidden="true">
                      ✅{" "}
                    </span>
                  )}

                  {result.title === "FAIR" && (
                    <span aria-hidden="true">
                      🤝{" "}
                    </span>
                  )}

                  {result.title === "LOSE" && (
                    <span aria-hidden="true">
                      ⚠️{" "}
                    </span>
                  )}

                  {result.explanation}
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {!hasTradeValues && (
          <div className="mt-6 rounded-[24px] border border-white/15 bg-white/10 p-5 text-center backdrop-blur-xl sm:mt-10 sm:rounded-3xl">
            <p className="font-semibold leading-relaxed text-white/90">
              Add at least one item to either
              offer to begin the comparison.
            </p>
          </div>
        )}

        <p className="mx-auto mt-6 max-w-3xl text-center text-xs leading-relaxed text-white/70 sm:text-sm">
          Trade results are estimates based on
          the selected CSBT value category.
          Demand, rarity, and player preference
          may affect the final trade.
        </p>
      </div>
    </motion.section>
  );
}

type SummaryValueProps = {
  label: string;
  value: number;
  emphasized?: boolean;
  shouldReduceMotion: boolean | null;
};

function SummaryValue({
  label,
  value,
  emphasized = false,
  shouldReduceMotion,
}: SummaryValueProps) {
  return (
    <div
      className={`rounded-[22px] border border-white/15 p-5 text-center shadow-inner backdrop-blur-xl sm:rounded-3xl sm:p-7 ${
        emphasized
          ? "bg-white/20"
          : "bg-white/15"
      }`}
    >
      <p className="text-xs font-black uppercase tracking-[0.2em] text-white/70 sm:text-sm sm:tracking-[0.3em]">
        {label}
      </p>

      <motion.p
        key={value}
        initial={{
          opacity: 0,
          scale: shouldReduceMotion
            ? 1
            : 0.9,
        }}
        animate={{
          opacity: 1,
          scale: 1,
        }}
        transition={{
          duration: shouldReduceMotion
            ? 0
            : 0.25,
        }}
        className="mt-3 break-words text-4xl font-black tabular-nums sm:mt-4 sm:text-5xl"
      >
        {formatValue(value)}
      </motion.p>
    </div>
  );
}

type ComparisonBarProps = {
  label: string;
  value: number;
  percent: number;
  shouldReduceMotion: boolean | null;
};

function ComparisonBar({
  label,
  value,
  percent,
  shouldReduceMotion,
}: ComparisonBarProps) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4 text-sm font-semibold">
        <span>{label}</span>

        <span className="font-black tabular-nums">
          {formatValue(value)}
        </span>
      </div>

      <div
        className="h-4 overflow-hidden rounded-full border border-white/10 bg-black/15 shadow-inner"
        role="progressbar"
        aria-label={`${label}: ${formatValue(
          value,
        )}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
      >
        <motion.div
          initial={{
            width: shouldReduceMotion
              ? `${percent}%`
              : "0%",
          }}
          animate={{
            width: `${percent}%`,
          }}
          transition={{
            duration: shouldReduceMotion
              ? 0
              : 0.7,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="h-full rounded-full bg-white shadow-[0_0_16px_rgba(255,255,255,.45)]"
        />
      </div>
    </div>
  );
}
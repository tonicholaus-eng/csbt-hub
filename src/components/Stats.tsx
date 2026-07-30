"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useInView,
  useReducedMotion,
} from "framer-motion";

type Props = {
  totalPets: number;
};

type AnimatedCounterProps = {
  value: number;
  suffix?: string;
  duration?: number;
};

const stats = [
  {
    icon: "🐾",
    type: "counter",
    title: "Pets Listed",
    description: "A growing database of CSBT pet values.",
    detail: "Normal, Neon, and Mega",
    gradient:
      "from-yellow-400 via-amber-400 to-orange-500",
    softGradient:
      "from-yellow-50 via-amber-50 to-orange-100",
    darkSoftGradient:
      "dark:from-amber-500/10 dark:via-orange-500/8 dark:to-yellow-500/5",
    textColor:
      "text-amber-700 dark:text-amber-300",
    glowColor:
      "bg-amber-400/25 dark:bg-amber-400/15",
    shadowColor:
      "group-hover:shadow-amber-300/30 dark:group-hover:shadow-amber-500/10",
  },
  {
    icon: "⚡",
    type: "text",
    value: "24/7",
    title: "Instant Search",
    description: "Find the pet values you need in seconds.",
    detail: "Fast and responsive",
    gradient:
      "from-cyan-400 via-sky-500 to-blue-600",
    softGradient:
      "from-cyan-50 via-sky-50 to-blue-100",
    darkSoftGradient:
      "dark:from-cyan-500/10 dark:via-sky-500/8 dark:to-blue-500/5",
    textColor:
      "text-blue-700 dark:text-sky-300",
    glowColor:
      "bg-cyan-400/25 dark:bg-cyan-400/15",
    shadowColor:
      "group-hover:shadow-blue-300/30 dark:group-hover:shadow-cyan-500/10",
  },
  {
    icon: "📈",
    type: "text",
    value: "Daily",
    title: "Value Updates",
    description: "Stay current with the latest CSBT values.",
    detail: "Fresh market data",
    gradient:
      "from-pink-500 via-fuchsia-500 to-purple-600",
    softGradient:
      "from-pink-50 via-fuchsia-50 to-purple-100",
    darkSoftGradient:
      "dark:from-pink-500/10 dark:via-fuchsia-500/8 dark:to-purple-500/5",
    textColor:
      "text-purple-700 dark:text-fuchsia-300",
    glowColor:
      "bg-fuchsia-400/25 dark:bg-fuchsia-400/15",
    shadowColor:
      "group-hover:shadow-purple-300/30 dark:group-hover:shadow-fuchsia-500/10",
  },
] as const;

function AnimatedCounter({
  value,
  suffix = "",
  duration = 1.6,
}: AnimatedCounterProps) {
  const counterRef = useRef<HTMLSpanElement>(null);

  const isInView = useInView(counterRef, {
    once: true,
    margin: "-60px",
  });

  const shouldReduceMotion = useReducedMotion();

  const [displayValue, setDisplayValue] = useState(
    shouldReduceMotion ? value : 0,
  );

  useEffect(() => {
    if (!isInView) return;

    if (shouldReduceMotion) {
      setDisplayValue(value);
      return;
    }

    let animationFrame = 0;
    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (startTime === null) {
        startTime = timestamp;
      }

      const elapsed = timestamp - startTime;
      const progress = Math.min(
        elapsed / (duration * 1000),
        1,
      );

      const easedProgress =
        1 - Math.pow(1 - progress, 3);

      setDisplayValue(
        Math.round(value * easedProgress),
      );

      if (progress < 1) {
        animationFrame =
          requestAnimationFrame(animate);
      }
    };

    animationFrame =
      requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [
    duration,
    isInView,
    shouldReduceMotion,
    value,
  ]);

  return (
    <span ref={counterRef}>
      {displayValue}
      {suffix}
    </span>
  );
}

export default function Stats({
  totalPets,
}: Props) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.section
      initial={{
        opacity: 0,
        y: 40,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
      }}
      viewport={{
        once: true,
        margin: "-80px",
      }}
      transition={{
        duration: shouldReduceMotion
          ? 0
          : 0.7,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="relative overflow-hidden rounded-[36px] sm:rounded-[40px]"
    >
      {/* Outer glow */}
      <div className="pointer-events-none absolute inset-4 rounded-[40px] bg-gradient-to-r from-yellow-300/30 via-orange-300/20 to-pink-300/30 blur-3xl dark:from-amber-500/10 dark:via-orange-500/5 dark:to-fuchsia-500/10" />

      <div className="relative overflow-hidden rounded-[36px] border border-white/65 bg-white/65 px-4 py-10 shadow-[0_30px_80px_rgba(15,23,42,.12)] backdrop-blur-2xl transition-colors duration-300 dark:border-white/10 dark:bg-slate-950/65 dark:shadow-[0_30px_90px_rgba(0,0,0,.38)] sm:rounded-[40px] sm:px-8 sm:py-14 lg:px-10 lg:py-16">
        {/* Background decoration */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,191,36,.12),transparent_55%)] dark:bg-[radial-gradient(circle_at_top,rgba(245,158,11,.08),transparent_55%)]" />

        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(15,23,42,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,.025)_1px,transparent_1px)] bg-[size:34px_34px] dark:bg-[linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)]" />

        <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-white/20" />

        <motion.div
          className="pointer-events-none absolute -left-28 -top-28 h-80 w-80 rounded-full bg-yellow-300/20 blur-3xl dark:bg-amber-500/10"
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  x: [0, 45, 0],
                  y: [0, 25, 0],
                  scale: [1, 1.12, 1],
                }
          }
          transition={{
            duration: 13,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <motion.div
          className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-pink-300/20 blur-3xl dark:bg-fuchsia-500/10"
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  x: [0, -40, 0],
                  y: [0, -30, 0],
                  scale: [1, 1.15, 1],
                }
          }
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <motion.div
          className="pointer-events-none absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-200/10 blur-3xl dark:bg-cyan-500/5"
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  scale: [1, 1.08, 1],
                  opacity: [0.4, 0.75, 0.4],
                }
          }
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Heading */}
        <motion.div
          initial={{
            opacity: 0,
            y: 25,
          }}
          whileInView={{
            opacity: 1,
            y: 0,
          }}
          viewport={{
            once: true,
          }}
          transition={{
            duration: shouldReduceMotion
              ? 0
              : 0.6,
          }}
          className="relative z-10 text-center"
        >
          <motion.span
            whileHover={
              shouldReduceMotion
                ? undefined
                : {
                    scale: 1.05,
                  }
            }
            className="inline-flex items-center gap-2 rounded-full border border-yellow-200 bg-yellow-100/85 px-5 py-2 text-sm font-black text-yellow-700 shadow-sm backdrop-blur dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300"
          >
            <motion.span
              animate={
                shouldReduceMotion
                  ? undefined
                  : {
                      rotate: [-4, 4, -4],
                      scale: [1, 1.12, 1],
                    }
              }
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              aria-hidden="true"
            >
              📊
            </motion.span>

            Live Statistics
          </motion.span>

          <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-800 dark:text-white sm:text-5xl md:text-6xl">
            Built for Smarter Trades
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-500 dark:text-slate-400 sm:text-lg">
            Everything you need to search values,
            compare pets, and make more confident
            Adopt Me trades.
          </p>
        </motion.div>

        {/* Statistic cards */}
        <div className="relative z-10 mt-10 grid gap-5 sm:mt-12 md:grid-cols-3 lg:gap-8">
          {stats.map((stat, index) => (
            <motion.article
              key={stat.title}
              initial={{
                opacity: 0,
                y: 35,
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
                delay: shouldReduceMotion
                  ? 0
                  : index * 0.1,
                duration: shouldReduceMotion
                  ? 0
                  : 0.55,
                ease: [0.22, 1, 0.36, 1],
              }}
              whileHover={
                shouldReduceMotion
                  ? undefined
                  : {
                      y: -12,
                      scale: 1.025,
                      rotate:
                        index === 0
                          ? -1
                          : index ===
                              stats.length - 1
                            ? 1
                            : 0,
                    }
              }
              className={`group relative overflow-hidden rounded-[28px] border border-white/75 bg-gradient-to-br ${stat.softGradient} ${stat.darkSoftGradient} p-6 shadow-xl transition-[background-color,border-color,box-shadow] duration-300 hover:shadow-2xl ${stat.shadowColor} dark:border-white/10 dark:bg-slate-900/70 sm:rounded-[32px] sm:p-8`}
            >
              {/* Card glow */}
              <div
                className={`pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full ${stat.glowColor} blur-3xl transition-all duration-500 group-hover:scale-125 group-hover:opacity-100`}
              />

              <div
                className={`pointer-events-none absolute -bottom-20 -left-16 h-40 w-40 rounded-full ${stat.glowColor} opacity-0 blur-3xl transition-all duration-500 group-hover:opacity-70`}
              />

              {/* Shine */}
              <div className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 rotate-12 bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-0 blur-lg transition-all duration-700 group-hover:left-[130%] group-hover:opacity-100 dark:via-white/10" />

              {/* Top accent */}
              <div
                className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${stat.gradient}`}
              />

              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <motion.div
                    animate={
                      shouldReduceMotion
                        ? undefined
                        : {
                            y: [0, -5, 0],
                            rotate:
                              index === 0
                                ? [-3, 3, -3]
                                : index === 1
                                  ? [-5, 5, -5]
                                  : [-2, 2, -2],
                          }
                    }
                    transition={{
                      duration: 4 + index,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className={`flex h-16 w-16 items-center justify-center rounded-[20px] bg-gradient-to-br ${stat.gradient} text-3xl shadow-lg ring-4 ring-white/50 dark:ring-white/10 sm:h-20 sm:w-20 sm:rounded-[24px] sm:text-4xl`}
                  >
                    <span aria-hidden="true">
                      {stat.icon}
                    </span>
                  </motion.div>

                  <span className="rounded-full border border-white/80 bg-white/65 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-slate-400 sm:text-xs">
                    0{index + 1}
                  </span>
                </div>

                <h3
                  className={`mt-7 text-4xl font-black tracking-tight tabular-nums sm:mt-8 sm:text-6xl ${stat.textColor}`}
                >
                  {stat.type === "counter" ? (
                    <AnimatedCounter
                      value={totalPets}
                      suffix="+"
                    />
                  ) : (
                    stat.value
                  )}
                </h3>

                <p className="mt-3 text-lg font-black text-slate-800 dark:text-white sm:text-xl">
                  {stat.title}
                </p>

                <p className="mt-2 leading-relaxed text-slate-500 dark:text-slate-400">
                  {stat.description}
                </p>

                <div className="mt-6 flex items-center justify-between gap-4 border-t border-white/70 pt-5 dark:border-white/10">
                  <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
                    {stat.detail}
                  </span>

                  <motion.span
                    animate={
                      shouldReduceMotion
                        ? undefined
                        : {
                            x: [0, 4, 0],
                          }
                    }
                    transition={{
                      duration: 1.8,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: index * 0.25,
                    }}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${stat.gradient} font-black text-white shadow-md`}
                    aria-hidden="true"
                  >
                    →
                  </motion.span>
                </div>
              </div>
            </motion.article>
          ))}
        </div>

        {/* Bottom status bar */}
        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}
          whileInView={{
            opacity: 1,
            y: 0,
          }}
          viewport={{
            once: true,
          }}
          transition={{
            delay: shouldReduceMotion
              ? 0
              : 0.4,
            duration: shouldReduceMotion
              ? 0
              : 0.55,
          }}
          className="relative z-10 mt-7 flex flex-col items-center justify-between gap-5 rounded-[26px] border border-white/70 bg-white/65 px-5 py-5 shadow-lg backdrop-blur-xl transition-colors duration-300 dark:border-white/10 dark:bg-slate-900/65 sm:mt-8 sm:flex-row sm:px-6"
        >
          <div className="flex items-center gap-3 text-center sm:text-left">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-70" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
            </span>

            <div>
              <p className="font-black text-slate-800 dark:text-white">
                CSBT HUB systems are active
              </p>

              <p className="text-sm text-slate-500 dark:text-slate-400">
                Pet values and search tools are
                ready to use.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-2 text-xs font-black">
            <span className="rounded-full bg-green-100 px-3 py-1.5 text-green-700 dark:bg-green-400/10 dark:text-green-300">
              Database Online
            </span>

            <span className="rounded-full bg-blue-100 px-3 py-1.5 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300">
              Fast Search
            </span>

            <span className="rounded-full bg-purple-100 px-3 py-1.5 text-purple-700 dark:bg-purple-400/10 dark:text-purple-300">
              Daily Updates
            </span>
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}
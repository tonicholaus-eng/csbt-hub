"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

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
    gradient: "from-yellow-400 via-amber-400 to-orange-500",
    softGradient: "from-yellow-50 via-amber-50 to-orange-100",
    textColor: "text-amber-700",
    shadowColor: "group-hover:shadow-amber-300/30",
  },
  {
    icon: "⚡",
    type: "text",
    value: "24/7",
    title: "Instant Search",
    description: "Find the pet values you need in seconds.",
    detail: "Fast and responsive",
    gradient: "from-cyan-400 via-sky-500 to-blue-600",
    softGradient: "from-cyan-50 via-sky-50 to-blue-100",
    textColor: "text-blue-700",
    shadowColor: "group-hover:shadow-blue-300/30",
  },
  {
    icon: "📈",
    type: "text",
    value: "Daily",
    title: "Value Updates",
    description: "Stay current with the latest CSBT values.",
    detail: "Fresh market data",
    gradient: "from-pink-500 via-fuchsia-500 to-purple-600",
    softGradient: "from-pink-50 via-fuchsia-50 to-purple-100",
    textColor: "text-purple-700",
    shadowColor: "group-hover:shadow-purple-300/30",
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
      const progress = Math.min(elapsed / (duration * 1000), 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      setDisplayValue(Math.round(value * easedProgress));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [duration, isInView, shouldReduceMotion, value]);

  return (
    <span ref={counterRef}>
      {displayValue}
      {suffix}
    </span>
  );
}

export default function Stats({ totalPets }: Props) {
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
        duration: 0.7,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="relative mt-24 overflow-hidden rounded-[40px]"
    >
      {/* Outer glow */}
      <div className="absolute inset-4 rounded-[40px] bg-gradient-to-r from-yellow-300/30 via-orange-300/20 to-pink-300/30 blur-3xl" />

      <div className="relative overflow-hidden rounded-[40px] border border-white/60 bg-white/60 px-5 py-12 shadow-[0_30px_80px_rgba(15,23,42,.12)] backdrop-blur-2xl sm:px-8 lg:px-10 lg:py-16">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,191,36,.12),transparent_55%)]" />

        <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,.025)_1px,transparent_1px)] bg-[size:34px_34px]" />

        <motion.div
          className="absolute -left-28 -top-28 h-80 w-80 rounded-full bg-yellow-300/20 blur-3xl"
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
          className="absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-pink-300/20 blur-3xl"
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
            duration: 0.6,
          }}
          className="relative z-10 text-center"
        >
          <motion.span
            whileHover={{
              scale: 1.05,
            }}
            className="inline-flex items-center gap-2 rounded-full border border-yellow-200 bg-yellow-100/85 px-5 py-2 text-sm font-black text-yellow-700 shadow-sm backdrop-blur"
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
            >
              📊
            </motion.span>

            Live Statistics
          </motion.span>

          <h2 className="mt-5 text-4xl font-black tracking-tight text-gray-800 sm:text-5xl md:text-6xl">
            Built for Smarter Trades
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-gray-500 sm:text-lg">
            Everything you need to search values, compare pets, and make more
            confident Adopt Me trades.
          </p>
        </motion.div>

        {/* Statistic cards */}
        <div className="relative z-10 mt-12 grid gap-6 md:grid-cols-3 lg:gap-8">
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
                delay: index * 0.1,
                duration: 0.55,
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
                          : index === stats.length - 1
                            ? 1
                            : 0,
                    }
              }
              className={`group relative overflow-hidden rounded-[32px] border border-white/70 bg-gradient-to-br ${stat.softGradient} p-7 shadow-xl transition-shadow duration-300 hover:shadow-2xl ${stat.shadowColor} sm:p-8`}
            >
              {/* Card glow */}
              <div
                className={`absolute -right-16 -top-16 h-44 w-44 rounded-full bg-gradient-to-br ${stat.gradient} opacity-20 blur-3xl transition-all duration-500 group-hover:scale-125 group-hover:opacity-35`}
              />

              <div
                className={`absolute -bottom-20 -left-16 h-40 w-40 rounded-full bg-gradient-to-br ${stat.gradient} opacity-0 blur-3xl transition-all duration-500 group-hover:opacity-15`}
              />

              {/* Shine */}
              <div className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 rotate-12 bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-0 blur-lg transition-all duration-700 group-hover:left-[130%] group-hover:opacity-100" />

              {/* Top accent */}
              <div
                className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${stat.gradient}`}
              />

              <div className="relative">
                <div className="flex items-start justify-between">
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
                    className={`flex h-20 w-20 items-center justify-center rounded-[24px] bg-gradient-to-br ${stat.gradient} text-4xl shadow-lg ring-4 ring-white/50`}
                  >
                    {stat.icon}
                  </motion.div>

                  <span className="rounded-full border border-white/80 bg-white/65 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-gray-500 backdrop-blur">
                    0{index + 1}
                  </span>
                </div>

                <h3
                  className={`mt-8 text-5xl font-black tracking-tight tabular-nums sm:text-6xl ${stat.textColor}`}
                >
                  {stat.type === "counter" ? (
                    <AnimatedCounter value={totalPets} suffix="+" />
                  ) : (
                    stat.value
                  )}
                </h3>

                <p className="mt-3 text-xl font-black text-gray-800">
                  {stat.title}
                </p>

                <p className="mt-2 leading-relaxed text-gray-500">
                  {stat.description}
                </p>

                <div className="mt-6 flex items-center justify-between border-t border-white/70 pt-5">
                  <span className="text-sm font-bold text-gray-500">
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
                    className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${stat.gradient} font-black text-white shadow-md`}
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
            delay: 0.4,
            duration: 0.55,
          }}
          className="relative z-10 mt-8 flex flex-col items-center justify-between gap-4 rounded-3xl border border-white/70 bg-white/65 px-6 py-5 shadow-lg backdrop-blur-xl sm:flex-row"
        >
          <div className="flex items-center gap-3 text-center sm:text-left">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-70" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
            </span>

            <div>
              <p className="font-black text-gray-800">
                CSBT HUB systems are active
              </p>

              <p className="text-sm text-gray-500">
                Pet values and search tools are ready to use.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-2 text-xs font-black text-gray-600">
            <span className="rounded-full bg-green-100 px-3 py-1.5 text-green-700">
              Database Online
            </span>

            <span className="rounded-full bg-blue-100 px-3 py-1.5 text-blue-700">
              Fast Search
            </span>

            <span className="rounded-full bg-purple-100 px-3 py-1.5 text-purple-700">
              Daily Updates
            </span>
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}
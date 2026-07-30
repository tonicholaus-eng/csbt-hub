"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

const actions = [
  {
    href: "/values",
    icon: "🔎",
    eyebrow: "Pet Database",
    title: "Browse Values",
    description:
      "Search the full pet database and quickly check estimated values.",
    buttonLabel: "Open Values",
    gradient:
      "from-cyan-500 via-sky-500 to-blue-600 dark:from-cyan-500 dark:via-sky-600 dark:to-blue-700",
    glow: "bg-cyan-400/25 dark:bg-cyan-500/15",
  },
  {
    href: "/calculator",
    icon: "🧮",
    eyebrow: "Trade Tools",
    title: "Trade Calculator",
    description:
      "Add pets to both sides and compare the estimated value of each offer.",
    buttonLabel: "Compare Trades",
    gradient:
      "from-amber-400 via-orange-500 to-rose-500 dark:from-amber-500 dark:via-orange-600 dark:to-rose-600",
    glow: "bg-orange-400/25 dark:bg-orange-500/15",
  },
  {
    href: "/nich",
    icon: "🤖",
    eyebrow: "Trading Assistant",
    title: "Ask Nich",
    description:
      "Get help with pet values, nearby pets, trade comparisons, and more.",
    buttonLabel: "Meet Nich",
    gradient:
      "from-violet-500 via-purple-500 to-fuchsia-600 dark:from-violet-600 dark:via-purple-600 dark:to-fuchsia-700",
    glow: "bg-violet-400/25 dark:bg-violet-500/15",
  },
];

export default function QuickActions() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section aria-labelledby="quick-actions-title" className="relative min-w-0">
      <div className="mx-auto max-w-3xl text-center">
        <motion.span
          initial={{
            opacity: 0,
            y: shouldReduceMotion ? 0 : 14,
          }}
          whileInView={{
            opacity: 1,
            y: 0,
          }}
          viewport={{
            once: true,
            amount: 0.5,
          }}
          transition={{
            duration: shouldReduceMotion ? 0 : 0.45,
            ease: "easeOut",
          }}
          className="inline-flex rounded-full border border-amber-200/80 bg-white/70 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.2em] text-amber-700 shadow-sm backdrop-blur-xl dark:border-amber-400/15 dark:bg-white/5 dark:text-amber-300"
        >
          Explore CSBT HUB
        </motion.span>

        <motion.h2
          id="quick-actions-title"
          initial={{
            opacity: 0,
            y: shouldReduceMotion ? 0 : 18,
          }}
          whileInView={{
            opacity: 1,
            y: 0,
          }}
          viewport={{
            once: true,
            amount: 0.5,
          }}
          transition={{
            delay: shouldReduceMotion ? 0 : 0.08,
            duration: shouldReduceMotion ? 0 : 0.45,
            ease: "easeOut",
          }}
          className="mt-5 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl md:text-5xl"
        >
          Everything you need to trade smarter
        </motion.h2>

        <motion.p
          initial={{
            opacity: 0,
            y: shouldReduceMotion ? 0 : 18,
          }}
          whileInView={{
            opacity: 1,
            y: 0,
          }}
          viewport={{
            once: true,
            amount: 0.5,
          }}
          transition={{
            delay: shouldReduceMotion ? 0 : 0.14,
            duration: shouldReduceMotion ? 0 : 0.45,
            ease: "easeOut",
          }}
          className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg"
        >
          Jump directly into the pet database, compare a trade, or ask Nich for
          help.
        </motion.p>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-3 md:gap-6">
        {actions.map((action, index) => (
          <motion.article
            key={action.href}
            initial={{
              opacity: 0,
              y: shouldReduceMotion ? 0 : 28,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={{
              once: true,
              amount: 0.2,
            }}
            transition={{
              delay: shouldReduceMotion ? 0 : index * 0.08,
              duration: shouldReduceMotion ? 0 : 0.5,
              ease: "easeOut",
            }}
            whileHover={
              shouldReduceMotion
                ? undefined
                : {
                    y: -8,
                  }
            }
            className="group relative min-w-0"
          >
            <div
              className={`pointer-events-none absolute inset-x-6 -bottom-3 h-16 rounded-full blur-2xl transition-opacity duration-300 group-hover:opacity-100 ${action.glow}`}
            />

            <Link
              href={action.href}
              className="relative flex h-full min-h-[330px] flex-col overflow-hidden rounded-[32px] border border-white/60 bg-white/75 p-6 shadow-[0_20px_60px_rgba(15,23,42,.10)] backdrop-blur-2xl transition duration-300 hover:border-white hover:shadow-[0_28px_80px_rgba(15,23,42,.16)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/40 dark:border-white/10 dark:bg-white/[0.06] dark:shadow-[0_20px_60px_rgba(0,0,0,.28)] dark:hover:border-white/20 dark:hover:bg-white/[0.09] sm:p-7"
            >
              <div
                className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${action.gradient}`}
              />

              <div
                className={`pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br ${action.gradient} opacity-10 blur-2xl transition duration-500 group-hover:scale-125 group-hover:opacity-20`}
              />

              <div
                className={`relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br text-3xl shadow-lg ${action.gradient}`}
                aria-hidden="true"
              >
                <span className="drop-shadow-sm">{action.icon}</span>
              </div>

              <p className="relative mt-7 text-xs font-extrabold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                {action.eyebrow}
              </p>

              <h3 className="relative mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                {action.title}
              </h3>

              <p className="relative mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
                {action.description}
              </p>

              <div className="relative mt-auto pt-8">
                <span className="inline-flex items-center gap-2 font-black text-slate-900 transition-colors group-hover:text-amber-600 dark:text-white dark:group-hover:text-amber-300">
                  {action.buttonLabel}

                  <motion.span
                    aria-hidden="true"
                    className="inline-block"
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
                    }}
                  >
                    →
                  </motion.span>
                </span>
              </div>

              <div className="pointer-events-none absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-slate-300/70 to-transparent dark:via-white/15" />
            </Link>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
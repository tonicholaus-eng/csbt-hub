"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

const capabilities = [
  {
    icon: "💎",
    title: "Pet Values",
    description: "Ask about estimated values for pets in the database.",
  },
  {
    icon: "⚖️",
    title: "Trade Advice",
    description: "Compare offers and understand which side has more value.",
  },
  {
    icon: "🔍",
    title: "Nearby Values",
    description: "Find pets with values close to the amount you provide.",
  },
  {
    icon: "🧮",
    title: "Calculator Help",
    description: "Get guidance while building and reviewing a trade.",
  },
];

export default function MeetNich() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section
      aria-labelledby="meet-nich-title"
      className="relative min-w-0 overflow-hidden rounded-[36px] border border-white/60 bg-white/70 shadow-[0_24px_80px_rgba(15,23,42,.12)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055] dark:shadow-[0_24px_80px_rgba(0,0,0,.3)]"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_45%,rgba(250,204,21,.2),transparent_32%),radial-gradient(circle_at_90%_10%,rgba(168,85,247,.13),transparent_30%)] dark:bg-[radial-gradient(circle_at_18%_45%,rgba(250,204,21,.1),transparent_32%),radial-gradient(circle_at_90%_10%,rgba(168,85,247,.1),transparent_30%)]" />

      <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-amber-400 via-orange-400 to-violet-500" />

      <div className="relative grid items-center gap-10 px-5 py-10 sm:px-8 sm:py-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14 lg:px-14 lg:py-16">
        <motion.div
          initial={{
            opacity: 0,
            x: shouldReduceMotion ? 0 : -30,
          }}
          whileInView={{
            opacity: 1,
            x: 0,
          }}
          viewport={{
            once: true,
            amount: 0.25,
          }}
          transition={{
            duration: shouldReduceMotion ? 0 : 0.55,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="relative mx-auto flex w-full max-w-md items-center justify-center"
        >
          <div className="pointer-events-none absolute h-72 w-72 rounded-full bg-amber-300/30 blur-[70px] dark:bg-amber-400/15 sm:h-80 sm:w-80" />

          <motion.div
            animate={
              shouldReduceMotion
                ? undefined
                : {
                    y: [0, -10, 0],
                    rotate: [-1.5, 1.5, -1.5],
                  }
            }
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="relative"
          >
            <div className="relative h-64 w-64 overflow-hidden rounded-[38px] border-4 border-white/80 bg-gradient-to-br from-yellow-100 via-white to-orange-100 shadow-[0_28px_65px_rgba(245,158,11,.28)] dark:border-white/10 dark:from-amber-200 dark:via-amber-50 dark:to-orange-200 sm:h-80 sm:w-80">
              <Image
                src="/nich/nich-face.png"
                alt="Nich, the CSBT HUB trading assistant"
                fill
                sizes="(max-width: 640px) 256px, 320px"
                className="object-cover object-[38%_8%]"
              />

              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-amber-900/10 via-transparent to-white/20" />
            </div>

            <motion.span
              aria-hidden="true"
              animate={
                shouldReduceMotion
                  ? undefined
                  : {
                      rotate: [-12, 8, -12],
                      y: [0, -5, 0],
                    }
              }
              transition={{
                duration: 2.4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute -right-4 top-6 text-4xl drop-shadow-lg sm:-right-8 sm:text-5xl"
            >
              👋
            </motion.span>

            <motion.span
              aria-hidden="true"
              animate={
                shouldReduceMotion
                  ? undefined
                  : {
                      opacity: [0.35, 1, 0.35],
                      scale: [0.8, 1.2, 0.8],
                      rotate: [0, 180, 360],
                    }
              }
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute -left-3 top-12 text-2xl sm:-left-8 sm:text-3xl"
            >
              ✨
            </motion.span>

            <div className="absolute -bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/80 bg-white/95 px-4 py-2 text-xs font-black text-slate-800 shadow-lg backdrop-blur-xl dark:border-white/15 dark:bg-slate-950/90 dark:text-white">
              <span className="h-2.5 w-2.5 rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,.8)]" />
              Nich is online
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{
            opacity: 0,
            x: shouldReduceMotion ? 0 : 30,
          }}
          whileInView={{
            opacity: 1,
            x: 0,
          }}
          viewport={{
            once: true,
            amount: 0.2,
          }}
          transition={{
            duration: shouldReduceMotion ? 0 : 0.55,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="min-w-0"
        >
          <span className="inline-flex rounded-full border border-violet-200/80 bg-violet-50/80 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-violet-700 shadow-sm backdrop-blur-xl dark:border-violet-400/15 dark:bg-violet-400/10 dark:text-violet-300">
            AI Trading Assistant
          </span>

          <h2
            id="meet-nich-title"
            className="mt-5 text-4xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl"
          >
            Meet Nich
          </h2>

          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
            Nich is your built-in CSBT HUB assistant. Ask questions about pet
            values, compare possible trades, or find pets close to a particular
            value.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {capabilities.map((capability, index) => (
              <motion.div
                key={capability.title}
                initial={{
                  opacity: 0,
                  y: shouldReduceMotion ? 0 : 16,
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                }}
                viewport={{
                  once: true,
                  amount: 0.3,
                }}
                transition={{
                  delay: shouldReduceMotion ? 0 : index * 0.06,
                  duration: shouldReduceMotion ? 0 : 0.4,
                  ease: "easeOut",
                }}
                className="rounded-2xl border border-slate-200/70 bg-white/65 p-4 shadow-sm backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-md dark:border-white/10 dark:bg-white/[0.045] dark:hover:bg-white/[0.075]"
              >
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 text-xl shadow-sm dark:from-amber-400/15 dark:to-orange-400/10"
                  >
                    {capability.icon}
                  </span>

                  <div className="min-w-0">
                    <h3 className="font-black text-slate-900 dark:text-white">
                      {capability.title}
                    </h3>

                    <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-400">
                      {capability.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/nich"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-6 py-3 font-black text-white shadow-[0_12px_30px_rgba(249,115,22,.3)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(249,115,22,.38)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-400/40"
            >
              Start with Nich
              <span aria-hidden="true">→</span>
            </Link>

            <Link
              href="/values"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white/75 px-6 py-3 font-black text-slate-800 shadow-sm backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-amber-300 hover:bg-white hover:text-amber-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/30 dark:border-white/10 dark:bg-white/[0.055] dark:text-white dark:hover:border-amber-300/30 dark:hover:bg-white/[0.09] dark:hover:text-amber-300"
            >
              Browse Values
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
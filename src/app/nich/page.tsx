"use client";

import Image from "next/image";
import Link from "next/link";
import {
  motion,
  useReducedMotion,
} from "framer-motion";

import Footer from "../../components/Footer";
import Navbar from "../../components/Navbar";
import NichChat from "../../components/nich/assistant/NichChat";

const abilities = [
  {
    icon: "💎",
    title: "Check pet values",
    description:
      "Ask Nich for Normal, Neon, or Mega pet values from the CSBT database.",
  },
  {
    icon: "⚖️",
    title: "Compare trades",
    description:
      "Describe a trade and let Nich help you understand whether it looks like a win, fair, or loss.",
  },
  {
    icon: "🔎",
    title: "Find nearby values",
    description:
      "Search for pets close to a specific value when you are planning an offer.",
  },
  {
    icon: "🧮",
    title: "Get calculator help",
    description:
      "Ask how the trade calculator works or open it directly when you are ready.",
  },
] as const;

export default function NichPage() {
  const shouldReduceMotion =
    useReducedMotion();

  function scrollToChat() {
    document
      .getElementById("nich-chat")
      ?.scrollIntoView({
        behavior: shouldReduceMotion
          ? "auto"
          : "smooth",
        block: "start",
      });
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#fff8e9] text-slate-900 transition-colors duration-300 dark:bg-[#07111f] dark:text-white">
      {/* Background */}

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#e5f7ff_0%,#fff9e8_38%,#fff1dd_68%,#f5efff_100%)] dark:bg-[linear-gradient(180deg,#07111f_0%,#0b1829_45%,#11182b_100%)]" />

      <div className="pointer-events-none absolute -left-44 top-28 h-[500px] w-[500px] rounded-full bg-yellow-300/25 blur-[110px] dark:bg-amber-500/10" />

      <div className="pointer-events-none absolute -right-48 top-[700px] h-[600px] w-[600px] rounded-full bg-violet-300/20 blur-[120px] dark:bg-violet-500/10" />

      <div className="pointer-events-none absolute left-1/2 top-[1450px] h-[650px] w-[650px] -translate-x-1/2 rounded-full bg-cyan-300/15 blur-[120px] dark:bg-cyan-500/10" />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,.75)_1px,transparent_1px)] bg-[size:34px_34px] opacity-25 dark:opacity-[0.04]" />

      <div className="relative z-10 min-w-0 lg:pl-72">
        <Navbar />

        <div className="mx-auto w-full max-w-7xl px-4 pb-24 pt-8 sm:px-6 sm:pb-32 sm:pt-14">
          {/* Hero */}

          <section className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
            <motion.div
              initial={{
                opacity: 0,
                x: shouldReduceMotion
                  ? 0
                  : -30,
              }}
              animate={{
                opacity: 1,
                x: 0,
              }}
              transition={{
                duration: shouldReduceMotion
                  ? 0
                  : 0.55,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/70 bg-white/75 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-amber-700 shadow-sm backdrop-blur-xl dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-full bg-green-500"
                />

                CSBT Trading Assistant
              </span>

              <h1 className="mt-6 max-w-3xl text-5xl font-black tracking-tight text-slate-950 dark:text-white sm:text-6xl lg:text-7xl">
                Meet your trading buddy,{" "}
                <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 bg-clip-text text-transparent">
                  Nich.
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300 sm:text-lg">
                Ask about Adopt Me pet values,
                compare possible trades, find pets
                near a certain value, or learn how
                to use CSBT HUB.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={scrollToChat}
                  className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-7 py-4 font-black text-white shadow-[0_16px_40px_rgba(249,115,22,.3)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_48px_rgba(249,115,22,.4)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-400/40"
                >
                  Start chatting
                  <span aria-hidden="true">
                    ↓
                  </span>
                </button>

                <Link
                  href="/calculator"
                  className="inline-flex min-h-[52px] items-center justify-center rounded-2xl border border-white/70 bg-white/75 px-7 py-4 font-black text-slate-800 shadow-sm backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-amber-300 hover:bg-white hover:text-amber-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/30 dark:border-white/10 dark:bg-white/[0.055] dark:text-white dark:hover:border-amber-300/30 dark:hover:bg-white/[0.09] dark:hover:text-amber-300"
                >
                  Open calculator
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{
                opacity: 0,
                x: shouldReduceMotion
                  ? 0
                  : 30,
                scale: shouldReduceMotion
                  ? 1
                  : 0.94,
              }}
              animate={{
                opacity: 1,
                x: 0,
                scale: 1,
              }}
              transition={{
                duration: shouldReduceMotion
                  ? 0
                  : 0.6,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="relative mx-auto flex w-full max-w-lg justify-center"
            >
              <div className="pointer-events-none absolute inset-10 rounded-full bg-amber-300/35 blur-[90px] dark:bg-amber-500/15" />

              <motion.div
                animate={
                  shouldReduceMotion
                    ? undefined
                    : {
                        y: [0, -12, 0],
                        rotate: [
                          -1.5,
                          1.5,
                          -1.5,
                        ],
                      }
                }
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="relative"
              >
                <div className="relative h-72 w-72 overflow-hidden rounded-[44px] border-4 border-white/80 bg-gradient-to-br from-yellow-100 via-white to-orange-100 shadow-[0_35px_90px_rgba(245,158,11,.3)] dark:border-white/10 sm:h-96 sm:w-96">
                  <Image
                    src="/nich/nich-face.png"
                    alt="Nich, the CSBT trading assistant"
                    fill
                    priority
                    sizes="(max-width: 640px) 288px, 384px"
                    className="object-cover object-[50%_35%]"
                  />

                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-amber-950/10 via-transparent to-white/25" />
                </div>

                <motion.span
                  aria-hidden="true"
                  animate={
                    shouldReduceMotion
                      ? undefined
                      : {
                          rotate: [
                            -15,
                            12,
                            -15,
                          ],
                          y: [0, -6, 0],
                        }
                  }
                  transition={{
                    duration: 2.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="absolute -right-5 top-5 text-5xl drop-shadow-lg sm:-right-8 sm:text-6xl"
                >
                  👋
                </motion.span>

                <div className="absolute -bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-white/80 bg-white/95 px-5 py-2.5 text-sm font-black text-slate-800 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/90 dark:text-white">
                  <span className="h-2.5 w-2.5 rounded-full bg-green-400 shadow-[0_0_12px_rgba(74,222,128,.9)]" />

                  Online and ready
                </div>
              </motion.div>
            </motion.div>
          </section>

          {/* Abilities */}

          <section className="mt-28 sm:mt-36">
            <div className="text-center">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-orange-500">
                What Nich can do
              </span>

              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                Your CSBT questions, all in one
                place
              </h2>

              <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-600 dark:text-slate-300">
                Nich uses your existing CSBT pet
                database and trading tools to
                provide fast answers.
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {abilities.map(
                (ability, index) => (
                  <motion.article
                    key={ability.title}
                    initial={{
                      opacity: 0,
                      y: shouldReduceMotion
                        ? 0
                        : 24,
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
                      delay: shouldReduceMotion
                        ? 0
                        : index * 0.07,
                      duration: shouldReduceMotion
                        ? 0
                        : 0.45,
                    }}
                    className="rounded-[26px] border border-white/70 bg-white/70 p-6 shadow-[0_18px_50px_rgba(15,23,42,.08)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-[0_22px_55px_rgba(15,23,42,.13)] dark:border-white/10 dark:bg-white/[0.055] dark:hover:bg-white/[0.08]"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-100 to-orange-100 text-2xl shadow-sm dark:from-amber-400/15 dark:to-orange-400/10">
                      {ability.icon}
                    </div>

                    <h3 className="mt-5 text-lg font-black text-slate-900 dark:text-white">
                      {ability.title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                      {ability.description}
                    </p>
                  </motion.article>
                ),
              )}
            </div>
          </section>

          {/* Embedded chat */}

          <section
            id="nich-chat"
            className="scroll-mt-24 pt-28 sm:pt-36"
          >
            <motion.div
              initial={{
                opacity: 0,
                y: shouldReduceMotion
                  ? 0
                  : 30,
              }}
              whileInView={{
                opacity: 1,
                y: 0,
              }}
              viewport={{
                once: true,
                amount: 0.08,
              }}
              transition={{
                duration: shouldReduceMotion
                  ? 0
                  : 0.55,
              }}
            >
              <div className="mb-8 text-center">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-violet-500">
                  Ask Nich
                </span>

                <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">
                  What can Nich help you with?
                </h2>

                <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-600 dark:text-slate-300">
                  Choose a suggested question or
                  type your own message below.
                </p>
              </div>

              <div className="mx-auto max-w-4xl">
                <NichChat variant="embedded" />
              </div>
            </motion.div>
          </section>

          {/* Quick links */}

          <section className="mt-20 grid gap-4 sm:grid-cols-2">
            <Link
              href="/values"
              className="group rounded-[28px] border border-white/70 bg-white/70 p-6 shadow-[0_18px_50px_rgba(15,23,42,.08)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white dark:border-white/10 dark:bg-white/[0.055] dark:hover:bg-white/[0.08] sm:p-8"
            >
              <span className="text-3xl">
                💎
              </span>

              <h2 className="mt-4 text-2xl font-black text-slate-950 dark:text-white">
                Browse all pet values
              </h2>

              <p className="mt-2 leading-7 text-slate-600 dark:text-slate-400">
                Search the complete CSBT database
                and compare Normal, Neon, and Mega
                values.
              </p>

              <span className="mt-5 inline-flex font-black text-amber-600 transition group-hover:translate-x-1 dark:text-amber-300">
                Open values →
              </span>
            </Link>

            <Link
              href="/calculator"
              className="group rounded-[28px] border border-white/70 bg-white/70 p-6 shadow-[0_18px_50px_rgba(15,23,42,.08)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white dark:border-white/10 dark:bg-white/[0.055] dark:hover:bg-white/[0.08] sm:p-8"
            >
              <span className="text-3xl">
                ⚖️
              </span>

              <h2 className="mt-4 text-2xl font-black text-slate-950 dark:text-white">
                Build a complete trade
              </h2>

              <p className="mt-2 leading-7 text-slate-600 dark:text-slate-400">
                Add pets to both sides and compare
                their combined values instantly.
              </p>

              <span className="mt-5 inline-flex font-black text-orange-600 transition group-hover:translate-x-1 dark:text-orange-300">
                Open calculator →
              </span>
            </Link>
          </section>
        </div>

        <Footer />
      </div>
    </main>
  );
}
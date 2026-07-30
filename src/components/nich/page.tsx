"use client";

import Image from "next/image";
import Link from "next/link";
import {
  motion,
  useReducedMotion,
} from "framer-motion";

import Footer from "../../components/Footer";
import Navbar from "../../components/Navbar";
import NichChat from "../../components/nich/NichAssistant/NichChat";

const capabilities = [
  {
    icon: "💎",
    title: "Check pet values",
    description:
      "Ask Nich about pets contained in the CSBT value database.",
  },
  {
    icon: "⚖️",
    title: "Review a trade",
    description:
      "Get help comparing both sides of a possible trade.",
  },
  {
    icon: "🔍",
    title: "Find nearby values",
    description:
      "Discover pets near a particular value or range.",
  },
  {
    icon: "🧮",
    title: "Use the calculator",
    description:
      "Learn how to build, adjust, and understand a trade.",
  },
];

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
    <main className="relative min-h-screen overflow-x-hidden bg-[#fff8e9] text-slate-900 dark:bg-[#07111f] dark:text-white">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#e6f8ff_0%,#fff9e7_35%,#fff1df_65%,#f4efff_100%)] dark:bg-[linear-gradient(180deg,#07111f_0%,#0c192b_45%,#11172a_100%)]" />

      <div className="pointer-events-none absolute -left-40 top-28 h-[500px] w-[500px] rounded-full bg-yellow-300/25 blur-[100px] dark:bg-amber-500/10" />

      <div className="pointer-events-none absolute -right-44 top-[620px] h-[600px] w-[600px] rounded-full bg-violet-300/20 blur-[120px] dark:bg-violet-500/10" />

      <div className="pointer-events-none absolute left-1/2 top-[1350px] h-[650px] w-[650px] -translate-x-1/2 rounded-full bg-cyan-300/15 blur-[120px] dark:bg-cyan-500/10" />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,.8)_1px,transparent_1px)] bg-[size:34px_34px] opacity-25 dark:opacity-[0.04]" />

      <div className="relative z-10">
        <Navbar />

        <div className="mx-auto w-full max-w-7xl px-4 pb-24 pt-8 sm:px-6 sm:pb-32 sm:pt-12">
          <section className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
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
              <span className="inline-flex rounded-full border border-amber-300/70 bg-white/75 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-amber-700 shadow-sm backdrop-blur-xl dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300">
                CSBT AI Trading Assistant
              </span>

              <h1 className="mt-6 max-w-3xl text-5xl font-black tracking-tight text-slate-950 dark:text-white sm:text-6xl lg:text-7xl">
                Meet your trading buddy,{" "}
                <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 bg-clip-text text-transparent">
                  Nich.
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300 sm:text-lg">
                Ask questions about Adopt Me pet
                values, compare trades, search for
                pets around a particular value, or
                get help using CSBT HUB.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={scrollToChat}
                  className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-7 py-4 font-black text-white shadow-[0_16px_40px_rgba(249,115,22,.3)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_48px_rgba(249,115,22,.4)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-400/40"
                >
                  Start chatting
                  <span aria-hidden="true">
                    ↓
                  </span>
                </button>

                <Link
                  href="/values"
                  className="inline-flex min-h-13 items-center justify-center rounded-2xl border border-white/70 bg-white/75 px-7 py-4 font-black text-slate-800 shadow-sm backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-amber-300 hover:bg-white hover:text-amber-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/30 dark:border-white/10 dark:bg-white/[0.055] dark:text-white dark:hover:border-amber-300/30 dark:hover:bg-white/[0.09] dark:hover:text-amber-300"
                >
                  Browse pet values
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
              <div className="pointer-events-none absolute inset-12 rounded-full bg-amber-300/35 blur-[85px] dark:bg-amber-500/15" />

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
                    className="object-cover object-[38%_8%]"
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

          <section className="mt-24 sm:mt-32">
            <div className="text-center">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-orange-500">
                What Nich can do
              </span>

              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                One assistant for your CSBT
                questions
              </h2>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {capabilities.map(
                (capability, index) => (
                  <motion.article
                    key={capability.title}
                    initial={{
                      opacity: 0,
                      y: shouldReduceMotion
                        ? 0
                        : 22,
                    }}
                    whileInView={{
                      opacity: 1,
                      y: 0,
                    }}
                    viewport={{
                      once: true,
                      amount: 0.25,
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
                      {capability.icon}
                    </div>

                    <h3 className="mt-5 text-lg font-black text-slate-900 dark:text-white">
                      {capability.title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                      {capability.description}
                    </p>
                  </motion.article>
                ),
              )}
            </div>
          </section>

          <section
            id="nich-chat"
            className="scroll-mt-24 pt-24 sm:pt-32"
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

                <p className="mx-auto mt-4 max-w-2xl text-slate-600 dark:text-slate-300">
                  Start with one of the suggested
                  questions or type your own message
                  below.
                </p>
              </div>

              <div className="mx-auto max-w-4xl">
                <NichChat variant="embedded" />
              </div>
            </motion.div>
          </section>
        </div>

        <Footer />
      </div>
    </main>
  );
}
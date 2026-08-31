"use client";

import Image from "next/image";
import Link from "next/link";
import {
  motion,
  useReducedMotion,
} from "framer-motion";

import Navbar from "../../components/Navbar";

const csbtMeaning = [
  {
    letter: "C",
    word: "Cross",
    description:
      "Connecting traders, communities, and opportunities across Roblox.",
  },
  {
    letter: "S",
    word: "Sell",
    description:
      "Helping members sell responsibly with better information and support.",
  },
  {
    letter: "B",
    word: "Buy",
    description:
      "Giving buyers more confidence before making important decisions.",
  },
  {
    letter: "T",
    word: "Trade",
    description:
      "Creating safer, fairer, and more enjoyable trading experiences.",
  },
] as const;

const platformFeatures = [
  { icon: "📊", title: "Value Database", description: "Browse thousands of Adopt Me items with separate GCash and Elve Shark values, rarity, demand, freshness, and value history.", href: "/values", action: "Browse values" },
  { icon: "🔁", title: "CSBT Exchange", description: "Find live listings, inventory-aware Smart Matches, send offers and counteroffers, and finish accepted trades in protected Trade Rooms.", href: "/exchange", action: "Find a trade" },
  { icon: "⚖️", title: "Trade Calculator", description: "Compare both sides of a trade, review totals, and save the result to your trading history.", href: "/calculator", action: "Calculate a trade" },
  { icon: "🎒", title: "Inventory & Wishlist", description: "Track your collection, estimate its value, save target items, and create value alerts from the same CSBT account.", href: "/inventory", action: "Open inventory" },
  { icon: "🤖", title: "NICH Assistant", description: "Ask natural questions about values, trades, your inventory, Exchange matches, nearby values, and where to go next in CSBT HUB.", href: "/nich", action: "Ask NICH" },
  { icon: "📈", title: "Demand & Market Signals", description: "Review demand tiers, value movement, Exchange activity, and CSBT-owned market signals alongside raw values.", href: "/demand", action: "Check demand" },
] as const;

type RoadmapStatus = "Live" | "In progress" | "Planned";

type RoadmapItem = {
  title: string;
  status: RoadmapStatus;
};

const roadmap: RoadmapItem[] = [
  { title: "Expanded multi-category value database", status: "Live" },
  { title: "NICH — ask about any value or trade", status: "Live" },
  { title: "Value history graphs & alerts", status: "Live" },
  { title: "Trade history", status: "Live" },
  { title: "Wishlist & watchlist", status: "Live" },
  { title: "Recently updated value sorting", status: "Live" },
  { title: "Demand trends & Exchange signals", status: "Live" },
  { title: "Personalized Exchange recommendations", status: "Live" },
  { title: "Roblox account verification", status: "In progress" },
  { title: "Deeper CSBT market analytics", status: "In progress" },
];

export default function AboutPage() {
  const shouldReduceMotion =
    useReducedMotion();

  const reveal = {
    initial: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : 28,
    },
    whileInView: {
      opacity: 1,
      y: 0,
    },
    viewport: {
      once: true,
      amount: 0.12,
    },
    transition: {
      duration: shouldReduceMotion
        ? 0
        : 0.55,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  };

  return (
    <main className="csbt-page overflow-x-hidden">

      <div className="relative z-10 min-w-0 lg:pl-[268px]">
        <Navbar />

        <div className="mx-auto w-full max-w-[1320px] px-3 pb-24 pt-6 sm:px-6 sm:pb-32 sm:pt-10 lg:px-8">
          {/* Hero */}

          <section className="grid min-h-[520px] items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
            <motion.div
              initial={{
                opacity: 0,
                x: shouldReduceMotion
                  ? 0
                  : -32,
              }}
              animate={{
                opacity: 1,
                x: 0,
              }}
              transition={{
                duration: shouldReduceMotion
                  ? 0
                  : 0.6,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/70 bg-white/75 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-amber-700 shadow-sm backdrop-blur-xl dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Our Story
              </span>

              <h1 className="mt-6 max-w-4xl text-4xl font-black tracking-[-.045em] text-[var(--foreground)] sm:text-5xl lg:text-6xl">
                Built by traders,
                <span className="block text-[var(--gold-dark)] dark:text-[var(--gold-bright)]">
                  for traders.
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300 sm:text-lg">
                CSBT HUB brings the CSBT community into one platform for values, trade comparison, demand insights, safer trading, and help from Nich.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="https://www.facebook.com/groups/5352107604807631"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-[52px] items-center justify-center rounded-2xl bg-[var(--gold)] px-7 py-4 font-black text-slate-950 shadow-[var(--shadow-gold)] transition duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/30"
                >
                  Join CSBT Community
                </a>

                <Link
                  href="/nich"
                  className="inline-flex min-h-[52px] items-center justify-center rounded-2xl border border-white/70 bg-white/75 px-7 py-4 font-black text-slate-800 shadow-sm backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-amber-300 hover:bg-white hover:text-amber-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/30 dark:border-white/10 dark:bg-white/[0.055] dark:text-white dark:hover:border-amber-300/30 dark:hover:bg-white/[0.09] dark:hover:text-amber-300"
                >
                  Meet Nich
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{
                opacity: 0,
                x: shouldReduceMotion
                  ? 0
                  : 32,
                scale: shouldReduceMotion
                  ? 1
                  : 0.95,
              }}
              animate={{
                opacity: 1,
                x: 0,
                scale: 1,
              }}
              transition={{
                duration: shouldReduceMotion
                  ? 0
                  : 0.65,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="relative mx-auto w-full max-w-lg"
            >
              <div className="pointer-events-none absolute -inset-8 rounded-[50px] bg-[radial-gradient(circle,rgba(217,162,27,.16),transparent_68%)] blur-3xl" />

              <motion.div
                className="relative overflow-hidden rounded-[38px] border-4 border-white/80 bg-white shadow-[0_35px_90px_rgba(15,23,42,.2)] dark:border-white/10 dark:bg-slate-900"
              >
                <div className="relative aspect-[3/4] w-full">
                  <Image
                    src="/about/nich-cast-hero.png"
                    alt="Nich Cast, founder of CSBT"
                    fill
                    priority
                    sizes="(max-width: 1024px) 90vw, 480px"
                    className="object-cover"
                  />
                </div>

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent px-6 pb-6 pt-24 text-white">
                  <p className="text-2xl font-black">
                    Nich Cast
                  </p>

                  <p className="mt-1 text-sm font-semibold text-white/80">
                    Founder of CSBT
                  </p>
                </div>
              </motion.div>

              <motion.div
                className="absolute -bottom-6 -left-4 max-w-[240px] rounded-[24px] border border-white/80 bg-white/95 p-4 text-sm font-bold leading-6 text-slate-700 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/95 dark:text-slate-200 sm:-left-12"
              >
                “Everyone starts somewhere.”
              </motion.div>
            </motion.div>
          </section>

          {/* Founder Story */}

          <motion.section
            {...reveal}
            className="pt-28 sm:pt-36"
          >
            <div className="overflow-hidden rounded-[36px] border border-white/70 bg-white/70 shadow-[0_30px_90px_rgba(15,23,42,.1)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055]">
              <div className="grid lg:grid-cols-[0.78fr_1.22fr]">
                <div className="relative min-h-[420px] overflow-hidden lg:min-h-full">
                  <Image
                    src="/about/nich-cast-story.png"
                    alt="Nich Cast"
                    fill
                    sizes="(max-width: 1024px) 100vw, 40vw"
                    className="object-cover"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-black/10" />
                </div>

                <div className="p-7 sm:p-10 lg:p-14">
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-[var(--gold-dark)] dark:text-[var(--gold-bright)]">
                    A message from the creator
                  </span>

                  <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">
                    It started with a promise.
                  </h2>

                  <div className="mt-7 space-y-5 text-base leading-8 text-slate-600 dark:text-slate-300">
                    <p>
                      Five years ago, I was not one
                      of the richest traders. I was
                      just another player trying to
                      grow, learn, and build
                      something from nothing.
                    </p>

                    <p>
                      During that time, I
                      experienced what many new
                      traders go through. I was
                      ganged up on by players who
                      already had far more than I
                      did. That experience could
                      have made me give up, but
                      instead, it gave me a reason
                      to work harder.
                    </p>

                    <p>
                      I promised myself that if I
                      ever reached a position where
                      I could help others, I would
                      build a healthy community
                      where everyone—whether rich,
                      new, experienced, or still
                      learning—would be treated
                      with respect.
                    </p>

                    <p className="text-lg font-black text-slate-900 dark:text-white">
                      That promise became CSBT.
                    </p>

                    <p>
                      What began with around 500
                      members has now grown into a
                      community of more than
                      30,000 people, supported by
                      hospitable, kind, and
                      humorous staff members who
                      continue to make people feel
                      welcome.
                    </p>

                    <p>
                      I want CSBT HUB to help people
                      with more than pet values. I
                      want it to help them
                      understand trading, protect
                      their decisions, build
                      confidence, and create better
                      financial opportunities for
                      those who buy and sell pets.
                    </p>

                    <p>
                      Most importantly, I want my
                      journey to remind people that
                      your current situation does
                      not decide your future.
                    </p>
                  </div>

                  <div className="mt-8 border-t border-slate-200/80 pt-6 dark:border-white/10">
                    <p className="text-xl font-black text-slate-950 dark:text-white">
                      — Nich Cast
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                      Founder of CSBT
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Meaning */}

          <motion.section
            {...reveal}
            className="pt-28 text-center sm:pt-36"
          >
            <span className="text-xs font-black uppercase tracking-[0.2em] text-amber-600 dark:text-amber-300">
              The name behind the mission
            </span>

            <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">
              CROSS · SELL · BUY · TRADE
            </h2>

            <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-slate-600 dark:text-slate-300">
              CSBT represents the complete journey
              of the community: connecting with
              others, buying and selling
              responsibly, and creating better
              trading experiences together.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {csbtMeaning.map(
                (item, index) => (
                  <motion.article
                    key={item.word}
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
                      duration: shouldReduceMotion
                        ? 0
                        : 0.45,
                      delay: shouldReduceMotion
                        ? 0
                        : index * 0.08,
                    }}
                    className="group rounded-[28px] border border-white/70 bg-white/70 p-6 text-left shadow-[0_18px_50px_rgba(15,23,42,.08)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white dark:border-white/10 dark:bg-white/[0.055] dark:hover:bg-white/[0.08]"
                  >
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--gold)] text-3xl font-black text-slate-950 shadow-lg transition duration-300 group-hover:rotate-3 group-hover:scale-105">
                      {item.letter}
                    </div>

                    <h3 className="mt-5 text-2xl font-black text-slate-950 dark:text-white">
                      {item.word}
                    </h3>

                    <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
                      {item.description}
                    </p>
                  </motion.article>
                ),
              )}
            </div>
          </motion.section>

          {/* Community */}

          <motion.section
            {...reveal}
            className="pt-28 sm:pt-36"
          >
            <div className="relative overflow-hidden rounded-[36px] border border-white/10 bg-[#0a1423] p-7 text-white shadow-[var(--shadow-md)] sm:p-12 lg:p-16">
              <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/15 blur-3xl" />

              <div className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-amber-300/10 blur-3xl" />

              <div className="relative grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
                <div>
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">
                    CSBT OFFICIAL
                  </span>

                  <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
                    A community before everything
                    else.
                  </h2>

                  <div className="mt-6 space-y-4 leading-8 text-white/85">
                    <p>
                      CSBT OFFICIAL is a community
                      of Roblox enthusiasts where
                      members can buy, sell, trade,
                      connect, and participate in
                      lively discussions.
                    </p>

                    <p>
                      Conversations are not limited
                      to trading. Members can share
                      ideas, form friendships, and
                      enjoy the community as long
                      as discussions follow CSBT
                      and Facebook community rules.
                    </p>

                    <p>
                      Trusted staff members are
                      available to serve as
                      middlemen for trades, and
                      this service is completely
                      free for members.
                    </p>

                    <p>
                      Diversity, inclusivity,
                      activity, and respect are at
                      the heart of the community.
                      Every member has something
                      valuable to contribute.
                    </p>
                  </div>

                  <a
                    href="https://www.facebook.com/groups/5352107604807631"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-8 inline-flex min-h-[52px] items-center justify-center rounded-2xl bg-[var(--gold)] px-7 py-4 font-black text-slate-950 shadow-[var(--shadow-gold)] transition duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
                  >
                    Join CSBT OFFICIAL →
                  </a>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                  {[
                    {
                      icon: "🛡️",
                      title: "Free middleman service",
                      text: "Trusted staff members help members complete safer trades.",
                    },
                    {
                      icon: "💬",
                      title: "Active conversations",
                      text: "Members can communicate, bond, share updates, and enjoy the community.",
                    },
                    {
                      icon: "❤️",
                      title: "Welcoming culture",
                      text: "Kindness, humor, diversity, and inclusivity are part of CSBT's identity.",
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="rounded-[24px] border border-white/20 bg-white/10 p-5 backdrop-blur-xl"
                    >
                      <span className="text-3xl">
                        {item.icon}
                      </span>

                      <h3 className="mt-3 text-lg font-black">
                        {item.title}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-white/75">
                        {item.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.section>

          {/* Features */}

          <motion.section
            {...reveal}
            className="pt-28 sm:pt-36"
          >
            <div className="text-center">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">
                What makes CSBT HUB different
              </span>

              <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">
                Everything traders need in one
                place
              </h2>
            </div>

            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              {platformFeatures.map(
                (feature, index) => (
                  <motion.article
                    key={feature.title}
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
                      duration: shouldReduceMotion
                        ? 0
                        : 0.45,
                      delay: shouldReduceMotion
                        ? 0
                        : index * 0.07,
                    }}
                    className="group rounded-[30px] border border-white/70 bg-white/70 p-7 shadow-[0_20px_60px_rgba(15,23,42,.08)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-[0_25px_65px_rgba(15,23,42,.13)] dark:border-white/10 dark:bg-white/[0.055] dark:hover:bg-white/[0.08]"
                  >
                    <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-[var(--surface-selected)] text-3xl shadow-sm ring-1 ring-[var(--border-gold)] transition duration-200 group-hover:scale-[1.03]">
                      {feature.icon}
                    </div>

                    <h3 className="mt-5 text-2xl font-black text-slate-950 dark:text-white">
                      {feature.title}
                    </h3>

                    <p className="mt-3 leading-7 text-slate-600 dark:text-slate-400">
                      {feature.description}
                    </p>

                    <Link
                      href={feature.href}
                      className="mt-6 inline-flex font-black text-[var(--gold-dark)] transition group-hover:translate-x-1 dark:text-[var(--gold-bright)]"
                    >
                      {feature.action} →
                    </Link>
                  </motion.article>
                ),
              )}
            </div>
          </motion.section>

          {/* Meet Nich */}

          <motion.section
            {...reveal}
            className="pt-28 sm:pt-36"
          >
            <div className="grid items-center gap-10 rounded-[36px] border border-white/70 bg-white/70 p-7 shadow-[0_30px_90px_rgba(15,23,42,.1)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055] sm:p-10 lg:grid-cols-[0.8fr_1.2fr] lg:p-14">
              <div className="relative mx-auto w-full max-w-sm">
                <div className="pointer-events-none absolute inset-8 rounded-full bg-yellow-300/35 blur-[80px] dark:bg-amber-500/15" />

                <motion.div
                  className="relative aspect-square overflow-hidden rounded-[34px] border-4 border-white bg-[var(--surface-selected)] shadow-2xl dark:border-white/10"
                >
                  <Image
                    src="/nich/nich-face.png"
                    alt="NICH, the CSBT assistant"
                    fill
                    sizes="384px"
                    className="object-cover object-[50%_35%]"
                  />
                </motion.div>

                <div className="absolute -bottom-5 left-1/2 w-[90%] -translate-x-1/2 rounded-[22px] border border-white/80 bg-white/95 p-4 text-center text-sm font-black text-slate-700 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/95 dark:text-white">
                  “Hi! I’m Nich 👋 Ready to help
                  you trade smarter.”
                </div>
              </div>

              <div className="pt-8 lg:pt-0">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-amber-600 dark:text-amber-300">
                  Meet Nich
                </span>

                <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">
                  A trading companion that is
                  always ready to help.
                </h2>

                <p className="mt-6 leading-8 text-slate-600 dark:text-slate-300">
                  Nich is not just another chatbot.
                  Nich understands the CSBT value
                  system and can help users search
                  values, find pets near a target
                  value, learn how the calculator
                  works, and navigate the platform.
                </p>

                <p className="mt-4 leading-8 text-slate-600 dark:text-slate-300">
                  Nich does not replace the
                  community. Nich makes sure that
                  whenever someone has a question,
                  there is always somewhere to
                  begin.
                </p>

                <Link
                  href="/nich"
                  className="mt-7 inline-flex min-h-[52px] items-center justify-center rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-7 py-4 font-black text-white shadow-[0_16px_40px_rgba(249,115,22,.28)] transition duration-300 hover:-translate-y-1"
                >
                  Start chatting with Nich →
                </Link>
              </div>
            </div>
          </motion.section>

          {/* Roadmap */}

          <motion.section
            {...reveal}
            className="pt-28 sm:pt-36"
          >
            <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
              <div>
                <span className="text-xs font-black uppercase tracking-[0.2em] text-violet-500">
                  The future of CSBT HUB
                </span>

                <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">
                  This is only the beginning.
                </h2>

                <p className="mt-6 leading-8 text-slate-600 dark:text-slate-300">
                  CSBT HUB will continue to evolve
                  alongside its community. New
                  tools, smarter systems, and
                  better information will be added
                  with one goal: helping every
                  trader, regardless of where they
                  start.
                </p>
              </div>

              <div className="grid gap-3">
                {roadmap.map((item) => {
                  const statusClasses =
                    (item.status === "In progress" || item.status === "Live")
                      ? "bg-green-100 text-green-700 dark:bg-green-400/10 dark:text-green-300"
                      : item.status === "Planned"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300"
                        : "bg-violet-100 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300";

                  return (
                    <div
                      key={item.title}
                      className="flex items-center justify-between gap-4 rounded-[22px] border border-white/70 bg-white/70 px-5 py-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.055]"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--gold)] font-black text-slate-950">
                          ✓
                        </span>

                        <p className="font-black text-slate-800 dark:text-white">
                          {item.title}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ${statusClasses}`}
                      >
                        {item.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.section>

          {/* Final Message */}

          <motion.section
            {...reveal}
            className="pt-28 sm:pt-36"
          >
            <div className="grid overflow-hidden rounded-[40px] border border-white/70 bg-white/75 shadow-[0_35px_100px_rgba(15,23,42,.13)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055] lg:grid-cols-[0.8fr_1.2fr]">
              <div className="relative min-h-[420px]">
                <Image
                  src="/about/nich-cast-final.png"
                  alt="Nich Cast"
                  fill
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  className="object-cover"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              </div>

              <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-16">
                <p className="text-3xl font-black leading-tight text-slate-950 dark:text-white sm:text-5xl">
                  “No one starts rich.
                  <span className="block text-[var(--gold-dark)] dark:text-[var(--gold-bright)]">
                    Everyone starts somewhere.”
                  </span>
                </p>

                <div className="mt-7 space-y-4 leading-8 text-slate-600 dark:text-slate-300">
                  <p>
                    CSBT grew from a small trading community into a place where thousands of people can learn, trade, and help each other.
                  </p>

                  <p>
                    Whether you are checking values, comparing a trade, learning safer practices, or meeting other traders, you have a place here.
                  </p>
                </div>

                <p className="mt-8 text-2xl font-black text-slate-950 dark:text-white">
                  Welcome to CSBT.
                </p>

                <p className="mt-1 text-2xl font-black text-[var(--gold-dark)] dark:text-[var(--gold-bright)]">
                  Welcome home.
                </p>

                <p className="mt-7 font-black text-slate-700 dark:text-slate-200">
                  — Nich Cast
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <a
                    href="https://www.facebook.com/groups/5352107604807631"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-[52px] items-center justify-center rounded-2xl bg-[var(--gold)] px-7 py-4 font-black text-slate-950 shadow-[var(--shadow-gold)] transition duration-200 hover:-translate-y-0.5"
                  >
                    Join the community
                  </a>

                  <Link
                    href="/values"
                    className="inline-flex min-h-[52px] items-center justify-center rounded-2xl border border-slate-200 bg-white px-7 py-4 font-black text-slate-800 transition duration-300 hover:-translate-y-1 hover:border-amber-300 hover:text-amber-700 dark:border-white/10 dark:bg-white/[0.055] dark:text-white"
                  >
                    Explore CSBT HUB
                  </Link>
                </div>
              </div>
            </div>
          </motion.section>
        </div>

        
      </div>
    </main>
  );
}
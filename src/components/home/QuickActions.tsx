"use client";

import Link from "next/link";

const actions = [
  {
    href: "/values",
    icon: "🔎",
    eyebrow: "Step 1 · Values",
    title: "Check Values",
    description: "Search the full database and compare GCash and Elve Shark values.",
    buttonLabel: "Browse Values",
    gradient: "from-cyan-500 via-sky-500 to-blue-600",
  },
  {
    href: "/calculator",
    icon: "🧮",
    eyebrow: "Step 2 · Calculator",
    title: "Compare Trades",
    description: "Put both offers side by side and review the estimated value difference.",
    buttonLabel: "Open Calculator",
    gradient: "from-amber-400 via-orange-500 to-rose-500",
  },
  {
    href: "/demand",
    icon: "📈",
    eyebrow: "Step 3 · Market",
    title: "Check Demand",
    description: "Look beyond raw value and review current demand signals before deciding.",
    buttonLabel: "View Demand",
    gradient: "from-emerald-500 via-teal-500 to-cyan-600",
  },
  {
    href: "/nich",
    icon: "🤖",
    eyebrow: "Step 4 · Assistant",
    title: "Ask Nich",
    description: "Ask about values, nearby pets, trade comparisons, and how to use the hub.",
    buttonLabel: "Chat with Nich",
    gradient: "from-violet-500 via-purple-500 to-fuchsia-600",
  },
  {
    href: "/inventory",
    icon: "🎒",
    eyebrow: "My CSBT · Inventory",
    title: "Value Your Inventory",
    description: "Save your items, quantities, variants, and see your total GCash or Elve Shark inventory value.",
    buttonLabel: "Open Inventory",
    gradient: "from-lime-500 via-emerald-500 to-teal-600",
  },
  {
    href: "/trade-feed",
    icon: "🗳️",
    eyebrow: "Community · W/F/L",
    title: "Vote on Trades",
    description: "Browse community trades and vote Win, Fair, or Lose to learn from real trade discussions.",
    buttonLabel: "View Trade Feed",
    gradient: "from-pink-500 via-rose-500 to-orange-500",
  },
];

export default function QuickActions() {
  return (
    <section aria-labelledby="quick-actions-title" className="relative min-w-0">
      <div className="mx-auto max-w-3xl text-center">
        <span className="inline-flex rounded-full border border-amber-200/80 bg-white/75 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.2em] text-amber-700 shadow-sm dark:border-amber-400/15 dark:bg-white/5 dark:text-amber-300">
          Explore CSBT HUB
        </span>
        <h2 id="quick-actions-title" className="mt-5 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl md:text-5xl">
          Everything you need to trade smarter
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
          Check values, compare trades, review demand, track your inventory, ask Nich, and learn from community W/F/L votes.
        </p>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3 md:gap-6">
        {actions.map((action) => (
          <article key={action.href} className="group relative min-w-0">
            <Link
              href={action.href}
              className="home-paint-containment relative flex h-full min-h-[300px] flex-col overflow-hidden rounded-[30px] border border-white/60 bg-white/80 p-6 shadow-[0_18px_50px_rgba(15,23,42,.09)] transition duration-200 hover:-translate-y-1 hover:border-white hover:shadow-[0_24px_62px_rgba(15,23,42,.14)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/40 dark:border-white/10 dark:bg-slate-900/78 dark:shadow-[0_18px_50px_rgba(0,0,0,.25)] dark:hover:border-white/20 sm:p-7"
            >
              <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${action.gradient}`} />
              <div className={`relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br text-3xl shadow-lg ${action.gradient}`} aria-hidden="true">
                {action.icon}
              </div>
              <p className="relative mt-7 text-xs font-extrabold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{action.eyebrow}</p>
              <h3 className="relative mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">{action.title}</h3>
              <p className="relative mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">{action.description}</p>
              <div className="relative mt-auto pt-8 font-black text-slate-900 transition-colors group-hover:text-amber-600 dark:text-white dark:group-hover:text-amber-300">
                {action.buttonLabel} <span aria-hidden="true">→</span>
              </div>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

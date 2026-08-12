import Link from "next/link";

const actions = [
  {
    href: "/exchange",
    icon: "🔄",
    eyebrow: "Smart Marketplace",
    title: "Open CSBT Exchange",
    description: "Find inventory-aware matches, build offers, negotiate safely, and complete trades in locked Trade Rooms.",
    buttonLabel: "Enter Exchange",
    gradient: "from-indigo-500 via-violet-500 to-fuchsia-600",
  },
  {
    href: "/values",
    icon: "🔎",
    eyebrow: "Values",
    title: "Check Values",
    description: "Search the full database and compare GCash and Elve Shark values.",
    buttonLabel: "Browse Values",
    gradient: "from-cyan-500 via-sky-500 to-blue-600",
  },
  {
    href: "/calculator",
    icon: "🧮",
    eyebrow: "Trade Calculator",
    title: "Compare Trades",
    description: "Put both offers side by side and review the estimated value difference.",
    buttonLabel: "Open Calculator",
    gradient: "from-amber-400 via-orange-500 to-rose-500",
  },
  {
    href: "/inventory",
    icon: "🎒",
    eyebrow: "My CSBT",
    title: "Value Your Inventory",
    description: "Save your items, quantities, and variants, then see your total GCash or Elve Shark inventory value.",
    buttonLabel: "Open Inventory",
    gradient: "from-lime-500 via-emerald-500 to-teal-600",
  },
  {
    href: "/demand",
    icon: "📈",
    eyebrow: "Market",
    title: "Check Demand",
    description: "Look beyond raw value and review current demand signals before deciding.",
    buttonLabel: "View Demand",
    gradient: "from-emerald-500 via-teal-500 to-cyan-600",
  },
  {
    href: "/trade-feed",
    icon: "🗳️",
    eyebrow: "Community W/F/L",
    title: "Vote on Trades",
    description: "Browse community trades and vote Win, Fair, or Lose to learn from real trade discussions.",
    buttonLabel: "View Trade Feed",
    gradient: "from-pink-500 via-rose-500 to-orange-500",
  },
  {
    href: "/nich",
    icon: "🤖",
    eyebrow: "Trading Assistant",
    title: "Ask Nich",
    description: "Ask about values, nearby items, trade comparisons, and how to use CSBT HUB.",
    buttonLabel: "Chat with Nich",
    gradient: "from-violet-500 via-purple-500 to-fuchsia-600",
  },
];

export default function QuickActions() {
  return (
    <section aria-labelledby="quick-actions-title" className="relative min-w-0">
      <div className="mx-auto max-w-3xl text-center">
        <span className="inline-flex rounded-full border border-amber-200/80 bg-white/75 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.2em] text-amber-700 shadow-sm dark:border-amber-400/15 dark:bg-white/5 dark:text-amber-300">
          Explore the hub
        </span>
        <h2 id="quick-actions-title" className="mt-5 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl md:text-5xl">
          Pick the tool you need
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
          Start with Exchange, check a value, compare a trade, manage your inventory, follow demand, or ask Nich.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:mt-10 md:grid-cols-2 md:gap-5 xl:grid-cols-3">
        {actions.map((action) => (
          <article key={action.href} className="group relative min-w-0">
            <Link
              href={action.href}
              className="home-paint-containment relative flex h-full min-h-[250px] flex-col overflow-hidden rounded-[26px] border border-white/60 bg-white/80 p-5 shadow-[0_18px_50px_rgba(15,23,42,.09)] transition duration-200 hover:-translate-y-1 hover:border-white hover:shadow-[0_24px_62px_rgba(15,23,42,.14)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/40 dark:border-white/10 dark:bg-slate-900/78 dark:shadow-[0_18px_50px_rgba(0,0,0,.25)] dark:hover:border-white/20 sm:min-h-[285px] sm:rounded-[30px] sm:p-7"
            >
              <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${action.gradient}`} />
              <div className={`relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-3xl shadow-lg sm:h-16 sm:w-16 ${action.gradient}`} aria-hidden="true">
                {action.icon}
              </div>
              <p className="relative mt-5 text-xs font-extrabold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400 sm:mt-7">{action.eyebrow}</p>
              <h3 className="relative mt-2 text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">{action.title}</h3>
              <p className="relative mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">{action.description}</p>
              <div className="relative mt-auto pt-6 font-black text-slate-900 transition-colors group-hover:text-amber-600 dark:text-white dark:group-hover:text-amber-300 sm:pt-8">
                {action.buttonLabel} <span aria-hidden="true">→</span>
              </div>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

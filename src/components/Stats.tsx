type Props = {
  totalItems: number;
};

export default function Stats({ totalItems }: Props) {
  const stats = [
    {
      icon: "🗂️",
      value: `${totalItems.toLocaleString()}+`,
      title: "Items in one database",
      description: "Browse pets, Pet Wear, vehicles, food, gifts, strollers, toys, stickers, eggs, and more.",
      detail: "10 searchable categories",
      gradient: "from-yellow-400 via-amber-400 to-orange-500",
    },
    {
      icon: "💱",
      value: "2 Sources",
      title: "GCash + Elve Shark",
      description: "Switch value systems without mixing them so every comparison stays clear and consistent.",
      detail: "Separate value systems",
      gradient: "from-cyan-400 via-sky-500 to-blue-600",
    },
    {
      icon: "🧰",
      value: "All-in-one",
      title: "Tools beyond values",
      description: "Track inventory, save a wishlist, follow value history and alerts, compare trades, and learn from W/F/L votes.",
      detail: "Built for everyday trading",
      gradient: "from-violet-500 via-purple-500 to-fuchsia-600",
    },
  ];

  return (
    <section aria-labelledby="stats-title" className="home-paint-containment relative overflow-hidden rounded-[30px] border border-white/65 bg-white/76 px-4 py-9 shadow-[0_22px_64px_rgba(15,23,42,.10)] dark:border-white/10 dark:bg-slate-950/68 dark:shadow-[0_22px_64px_rgba(0,0,0,.30)] sm:rounded-[36px] sm:px-8 sm:py-14 lg:px-10 lg:py-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,.12),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,.10),transparent_38%)]" />
      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-yellow-200 bg-yellow-100/85 px-4 py-2 text-xs font-black text-yellow-700 shadow-sm dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300 sm:px-5 sm:text-sm">📊 More than a price list</span>
        <h2 id="stats-title" className="mt-5 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl lg:text-5xl">One hub for the full trading routine</h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
          Use CSBT HUB before, during, and after a trade—from checking value and demand to tracking your inventory and watching the market.
        </p>
      </div>

      <div className="relative z-10 mt-8 grid gap-4 md:mt-10 md:grid-cols-3 md:gap-5">
        {stats.map((stat) => (
          <article key={stat.title} className="relative overflow-hidden rounded-[24px] border border-white/70 bg-white/82 p-5 shadow-[0_16px_38px_rgba(15,23,42,.08)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_48px_rgba(15,23,42,.12)] dark:border-white/10 dark:bg-slate-900/78 dark:shadow-[0_16px_38px_rgba(0,0,0,.25)] sm:rounded-[28px] sm:p-6">
            <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${stat.gradient}`} />
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${stat.gradient} text-xl shadow-md sm:h-14 sm:w-14 sm:text-2xl`} aria-hidden="true">{stat.icon}</div>
            <div className="mt-5 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:mt-7 sm:text-4xl">{stat.value}</div>
            <h3 className="mt-2.5 text-lg font-black text-slate-800 dark:text-white sm:mt-3 sm:text-xl">{stat.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400 sm:text-base">{stat.description}</p>
            <div className="mt-5 border-t border-slate-200/70 pt-4 text-sm font-bold text-slate-500 dark:border-white/10 dark:text-slate-400 sm:mt-6 sm:pt-5">{stat.detail}</div>
          </article>
        ))}
      </div>

      <div className="relative z-10 mt-6 flex flex-col items-center justify-between gap-4 rounded-[22px] border border-white/70 bg-white/72 px-4 py-4 shadow-sm dark:border-white/10 dark:bg-slate-900/65 sm:flex-row sm:px-5 sm:py-5">
        <div className="flex items-center gap-3 text-center sm:text-left">
          <span className="h-3 w-3 shrink-0 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,.75)]" />
          <div>
            <p className="font-black text-slate-800 dark:text-white">Ready when you are</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Start with values, then use the tools that match your trade.</p>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-2 text-xs font-black">
          <span className="rounded-full bg-green-100 px-3 py-1.5 text-green-700 dark:bg-green-400/10 dark:text-green-300">Database online</span>
          <span className="rounded-full bg-blue-100 px-3 py-1.5 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300">Mobile ready</span>
        </div>
      </div>
    </section>
  );
}

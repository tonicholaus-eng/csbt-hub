"use client";

type Props = {
  totalPets: number;
};

export default function Stats({ totalPets }: Props) {
  const stats = [
    {
      icon: "🐾",
      value: `${totalPets}+`,
      title: "Items Listed",
      description: "A growing database of pets and Pet Wear.",
      detail: "GCash and Elve Shark",
      gradient: "from-yellow-400 via-amber-400 to-orange-500",
    },
    {
      icon: "⚡",
      value: "Fast",
      title: "Instant Search",
      description: "Find values without waiting for a page-wide scan.",
      detail: "Optimized lookup",
      gradient: "from-cyan-400 via-sky-500 to-blue-600",
    },
    {
      icon: "🧮",
      value: "2 Sources",
      title: "Trade Comparison",
      description: "Choose GCash or Elve Shark before calculating.",
      detail: "Never mixed",
      gradient: "from-violet-500 via-purple-500 to-fuchsia-600",
    },
  ];

  return (
    <section aria-labelledby="stats-title" className="home-paint-containment relative overflow-hidden rounded-[36px] border border-white/65 bg-white/76 px-4 py-10 shadow-[0_22px_64px_rgba(15,23,42,.10)] dark:border-white/10 dark:bg-slate-950/68 dark:shadow-[0_22px_64px_rgba(0,0,0,.30)] sm:px-8 sm:py-14 lg:px-10 lg:py-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,.12),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,.10),transparent_38%)]" />
      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-yellow-200 bg-yellow-100/85 px-5 py-2 text-sm font-black text-yellow-700 shadow-sm dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300">📊 CSBT at a glance</span>
        <h2 id="stats-title" className="mt-5 text-4xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl">Built for faster value checking</h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">The homepage now loads the essentials first and delays heavier sections until you scroll near them.</p>
      </div>

      <div className="relative z-10 mt-10 grid gap-5 md:grid-cols-3">
        {stats.map((stat) => (
          <article key={stat.title} className="relative overflow-hidden rounded-[28px] border border-white/70 bg-white/82 p-6 shadow-[0_16px_38px_rgba(15,23,42,.08)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_22px_48px_rgba(15,23,42,.12)] dark:border-white/10 dark:bg-slate-900/78 dark:shadow-[0_16px_38px_rgba(0,0,0,.25)]">
            <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${stat.gradient}`} />
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${stat.gradient} text-2xl shadow-md`} aria-hidden="true">{stat.icon}</div>
            <div className="mt-7 text-4xl font-black tracking-tight text-slate-900 dark:text-white">{stat.value}</div>
            <h3 className="mt-3 text-xl font-black text-slate-800 dark:text-white">{stat.title}</h3>
            <p className="mt-2 leading-relaxed text-slate-500 dark:text-slate-400">{stat.description}</p>
            <div className="mt-6 border-t border-slate-200/70 pt-5 text-sm font-bold text-slate-500 dark:border-white/10 dark:text-slate-400">{stat.detail}</div>
          </article>
        ))}
      </div>

      <div className="relative z-10 mt-7 flex flex-col items-center justify-between gap-4 rounded-[24px] border border-white/70 bg-white/72 px-5 py-5 shadow-sm dark:border-white/10 dark:bg-slate-900/65 sm:flex-row">
        <div className="flex items-center gap-3 text-center sm:text-left">
          <span className="h-3 w-3 shrink-0 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,.75)]" />
          <div>
            <p className="font-black text-slate-800 dark:text-white">CSBT HUB systems are active</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Value search and trading tools are ready.</p>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-2 text-xs font-black">
          <span className="rounded-full bg-green-100 px-3 py-1.5 text-green-700 dark:bg-green-400/10 dark:text-green-300">Database Online</span>
          <span className="rounded-full bg-blue-100 px-3 py-1.5 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300">Fast Mode</span>
        </div>
      </div>
    </section>
  );
}

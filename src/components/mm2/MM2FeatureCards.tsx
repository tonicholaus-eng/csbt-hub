import Link from "next/link";

const features = [
  {
    title: "Value Vault",
    eyebrow: "Weapon values",
    description: "Jump into the MM2 catalog, search by name, and check where a weapon currently sits in the market.",
    cta: "Browse values",
    href: "/mm2/values",
    icon: "✦",
    tone: "from-[#162233] to-[#0f172a] border-cyan-400/15",
  },
  {
    title: "Trade Bench",
    eyebrow: "Trade calculator",
    description: "Prepare to compare both sides of a trade with clearer structure once the calculator is unlocked.",
    cta: "Calculator roadmap",
    href: "/mm2#mm2-trading-hq",
    icon: "⚖",
    tone: "from-[#2c1a11] to-[#180d0d] border-amber-400/15",
  },
  {
    title: "Market Radar",
    eyebrow: "Demand tracking",
    description: "Understand movement beyond raw value by following stronger demand and collector behavior.",
    cta: "See market highlights",
    href: "/mm2#mm2-market-highlights",
    icon: "↗",
    tone: "from-[#1a1f11] to-[#11120d] border-lime-400/15",
  },
  {
    title: "CSBT Lounge",
    eyebrow: "Community",
    description: "Discuss MM2 values, trades, and market questions with the wider CSBT community.",
    cta: "Open Lounge",
    href: "/mm2/lounge",
    icon: "✦",
    tone: "from-[#231527] to-[#15121f] border-violet-400/15",
  },
] as const;

export default function MM2FeatureCards() {
  return (
    <section className="mt-10" aria-labelledby="mm2-quick-actions-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-red-200/70">Quick actions</p>
          <h2 id="mm2-quick-actions-title" className="mt-2 text-3xl font-black tracking-[-0.03em] text-white">Choose your route inside the hub</h2>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-slate-400">Each card acts like a station inside the MM2 headquarters: value first, then market context, then trading help.</p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {features.map((feature, index) => (
          <Link
            key={feature.title}
            href={feature.href}
            className={`group relative overflow-hidden rounded-[30px] border bg-gradient-to-br p-5 shadow-[0_16px_45px_rgba(0,0,0,.25)] transition duration-200 hover:-translate-y-1 hover:border-red-300/30 ${feature.tone}`}
          >
            <div className="absolute right-4 top-4 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
              Room 0{index + 1}
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-xl text-white shadow-inner">
              {feature.icon}
            </div>
            <p className="mt-5 text-[10px] font-black uppercase tracking-[0.18em] text-red-100/70">{feature.eyebrow}</p>
            <h3 className="mt-2 text-2xl font-black tracking-[-0.03em] text-white">{feature.title}</h3>
            <p className="mt-3 min-h-[88px] text-sm leading-6 text-slate-300">{feature.description}</p>
            <span className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-white">
              {feature.cta} <span aria-hidden="true">→</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

import Link from "next/link";

type Item = {
  NAME: string;
  CATEGORY?: string;
  SOURCE_VALUE?: number;
  DEMAND?: number;
};

type CategoryCard = {
  name: string;
  count: number;
};

function formatValue(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return "N/A";
  return value.toLocaleString();
}

export default function MM2MarketHighlights({
  highDemand,
  topCategories,
  updatedLabel,
}: {
  highDemand: Item[];
  topCategories: CategoryCard[];
  updatedLabel: string;
}) {
  return (
    <section id="mm2-market-highlights" className="mt-14" aria-labelledby="mm2-market-title">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-red-200/70">Market highlights</p>
          <h2 id="mm2-market-title" className="mt-2 text-3xl font-black tracking-[-0.03em] text-white">Read the board before you trade</h2>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-slate-400">Even before building full tracker logic, the homepage can already feel alive by surfacing the strongest categories and the most competitive collector weapons.</p>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.05fr_.95fr_.9fr]">
        <article className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.025))] p-5 shadow-[0_16px_45px_rgba(0,0,0,.25)]">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-200/75">Demand board</p>
          <h3 className="mt-2 text-2xl font-black text-white">Most active collector pieces</h3>
          <div className="mt-5 space-y-3">
            {highDemand.map((item, index) => (
              <Link key={item.NAME} href={`/mm2/values?q=${encodeURIComponent(item.NAME)}`} className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-black/20 px-4 py-3 transition hover:border-red-300/25 hover:bg-black/30">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">0{index + 1}</p>
                  <p className="mt-1 text-sm font-black text-white">{item.NAME}</p>
                  <p className="text-xs font-semibold text-slate-400">{item.CATEGORY || "Weapon"}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-white">{item.DEMAND ?? "N/A"}</p>
                  <p className="text-xs font-semibold text-red-100">{formatValue(item.SOURCE_VALUE)}</p>
                </div>
              </Link>
            ))}
          </div>
        </article>

        <article className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.025))] p-5 shadow-[0_16px_45px_rgba(0,0,0,.25)]">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-200/75">Collector map</p>
          <h3 className="mt-2 text-2xl font-black text-white">Where most items live</h3>
          <div className="mt-5 space-y-3">
            {topCategories.map((category) => (
              <div key={category.name} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-white">{category.name}</p>
                  <span className="text-lg font-black text-red-100">{category.count}</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full bg-[linear-gradient(90deg,rgba(239,68,68,.8),rgba(248,113,113,.45))]" style={{ width: `${Math.min(100, (category.count / topCategories[0].count) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.025))] p-5 shadow-[0_16px_45px_rgba(0,0,0,.25)]">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-200/75">Station status</p>
          <h3 className="mt-2 text-2xl font-black text-white">What this hub already gives you</h3>
          <div className="mt-5 space-y-3 text-sm leading-6 text-slate-300">
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Live source</p>
              <p className="mt-2 font-black text-white">Supreme Values connected</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Last refresh</p>
              <p className="mt-2 font-black text-white">{updatedLabel}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Next flow</p>
              <p className="mt-2 font-black text-white">Search a weapon → check the board → decide the trade</p>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

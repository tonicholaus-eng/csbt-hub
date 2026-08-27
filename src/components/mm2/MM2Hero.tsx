import Link from "next/link";
import GameSwitcher from "../GameSwitcher";
import MM2HeroSearch from "./MM2HeroSearch";

type MM2Item = {
  NAME: string;
  CATEGORY?: string;
  SUPREME_VALUE?: number;
  DEMAND?: number;
  RARITY?: number;
  STABILITY?: string;
};

function formatValue(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return "N/A";
  return value.toLocaleString();
}

function rarityTone(value?: number) {
  if ((value ?? 0) >= 9) return "text-amber-200 border-amber-300/20 bg-amber-500/10";
  if ((value ?? 0) >= 7) return "text-violet-200 border-violet-300/20 bg-violet-500/10";
  return "text-red-100 border-red-300/20 bg-red-500/10";
}

export default function MM2Hero({
  items,
  featured,
  generatedLabel,
}: {
  items: MM2Item[];
  featured: MM2Item[];
  generatedLabel: string;
}) {
  const centerpiece = featured[0];
  const sideCards = featured.slice(1, 4);
  const suggestions = featured.slice(0, 5).map((item) => item.NAME);

  return (
    <section className="relative overflow-hidden rounded-[36px] border border-red-400/15 bg-[radial-gradient(circle_at_top_left,rgba(185,28,28,.28),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(139,92,246,.18),transparent_30%),linear-gradient(135deg,#171019_0%,#090b10_48%,#1d0e14_100%)] px-5 py-8 shadow-[0_30px_90px_rgba(0,0,0,.42)] sm:px-7 md:py-10 lg:px-10 lg:py-12">
      <div className="pointer-events-none absolute -left-24 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full border border-red-300/10" />
      <div className="pointer-events-none absolute -right-24 top-10 h-80 w-80 rounded-full border border-violet-300/10" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent_15%,rgba(255,255,255,.03)_45%,transparent_70%)]" />

      <div className="relative z-10 grid items-center gap-10 xl:grid-cols-[1.05fr_.95fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-red-300/20 bg-red-500/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-red-100 shadow-sm">
            ◆ MM2 trading headquarters
          </span>

          <GameSwitcher />

          <h1 className="max-w-4xl text-5xl font-black tracking-[-0.05em] text-white sm:text-6xl lg:text-7xl xl:text-[5.3rem] xl:leading-[0.95]">
            Track the weapons.
            <br />
            Read the market.
            <br />
            Make the trade.
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            CSBT turns MM2 from a list of numbers into a trading headquarters. Search weapons, spot premium collector pieces, understand demand, and move through the market with more confidence.
          </p>

          <div className="mt-8 max-w-3xl">
            <MM2HeroSearch items={items} suggestions={suggestions} />
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/mm2/values" className="inline-flex items-center gap-2 rounded-2xl bg-red-500 px-5 py-3 text-sm font-black text-white shadow-[0_12px_34px_rgba(239,68,68,.3)] transition hover:bg-red-400">
              Open weapon values →
            </Link>
            <a href="#mm2-featured-weapons" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black text-white transition hover:border-red-300/25 hover:bg-white/[0.07]">
              See featured weapons ↓
            </a>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -left-5 top-8 hidden h-20 w-20 rounded-full bg-red-500/10 blur-2xl sm:block" />
          <div className="absolute right-6 top-0 hidden h-24 w-24 rounded-full bg-violet-500/10 blur-2xl sm:block" />

          <div className="relative mx-auto max-w-[600px]">
            <div className="rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.02))] p-5 shadow-[0_22px_55px_rgba(0,0,0,.35)] backdrop-blur-xl sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-red-200/75">Collector showcase</p>
                  <h2 className="mt-2 text-2xl font-black text-white">Today&apos;s spotlight board</h2>
                </div>
                <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-slate-300">
                  Updated {generatedLabel}
                </span>
              </div>

              {centerpiece ? (
                <div className="mt-5 rounded-[28px] border border-red-300/15 bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,.18),transparent_42%),linear-gradient(135deg,rgba(15,23,42,.7),rgba(22,10,18,.92))] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-200/80">Top showcase</p>
                      <h3 className="mt-3 text-3xl font-black tracking-[-0.03em] text-white">{centerpiece.NAME}</h3>
                      <p className="mt-1 text-sm font-semibold text-slate-300">{centerpiece.CATEGORY || "Weapon"} · Supreme source</p>
                    </div>
                    <div className="flex h-20 w-20 items-center justify-center rounded-[24px] border border-white/10 bg-white/[0.05] text-4xl shadow-inner">
                      🔪
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Supreme</p>
                      <p className="mt-2 text-2xl font-black text-white">{formatValue(centerpiece.SUPREME_VALUE)}</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Demand</p>
                      <p className="mt-2 text-2xl font-black text-white">{centerpiece.DEMAND ?? "N/A"}</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Stability</p>
                      <p className="mt-2 text-base font-black text-white">{centerpiece.STABILITY || "Stable"}</p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {sideCards.map((item, index) => (
                  <div key={item.NAME} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Featured {index + 1}</p>
                        <h3 className="mt-2 text-lg font-black text-white">{item.NAME}</h3>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${rarityTone(item.RARITY)}`}>
                        Rare pick
                      </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-sm font-semibold text-slate-300">
                      <span>{item.CATEGORY || "Weapon"}</span>
                      <span>{formatValue(item.SUPREME_VALUE)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

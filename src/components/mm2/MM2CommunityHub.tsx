import Link from "next/link";

export default function MM2CommunityHub() {
  const steps = [
    {
      title: "Scout the value",
      copy: "Start from the value board when a trader offers a knife, gun, set, or pet you need to understand quickly.",
    },
    {
      title: "Read the market",
      copy: "Collectors care about more than the number. Demand, category, and rarity change how a trade feels in the room.",
    },
    {
      title: "Move with confidence",
      copy: "Use CSBT as your headquarters so the eventual calculator, demand board, and Nich guidance all feel connected.",
    },
  ] as const;

  return (
    <section id="mm2-trading-hq" className="mt-14 pb-6" aria-labelledby="mm2-trading-hq-title">
      <div className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
        <article className="overflow-hidden rounded-[34px] border border-red-400/15 bg-[radial-gradient(circle_at_top_left,rgba(185,28,28,.22),transparent_36%),linear-gradient(135deg,#171019_0%,#0a0c12_55%,#150d16_100%)] p-6 shadow-[0_20px_60px_rgba(0,0,0,.28)] sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-red-200/75">Trading headquarters</p>
          <h2 id="mm2-trading-hq-title" className="mt-3 text-3xl font-black tracking-[-0.03em] text-white">The MM2 homepage should feel like the place traders start</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">This redesign stops MM2 from looking like a bare database. It gives the homepage a story: discover weapons, understand their value, and prepare for smarter trades.</p>

          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.title} className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                <span className="inline-flex rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-red-100">Step 0{index + 1}</span>
                <h3 className="mt-4 text-lg font-black text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{step.copy}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.02))] p-6 shadow-[0_20px_60px_rgba(0,0,0,.28)] sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-red-200/75">Community pulse</p>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] text-white">Built for trading conversations</h2>
          <p className="mt-4 text-sm leading-7 text-slate-300">Adopt Me feels complete because it does not stop at the catalog. MM2 needs the same product energy: a clear starting point, stronger atmosphere, and a page that makes users want to keep exploring.</p>

          <div className="mt-6 space-y-3">
            <div className="rounded-[26px] border border-white/8 bg-black/20 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Current strength</p>
              <p className="mt-2 font-black text-white">Live MM2 data already exists. The homepage now presents it as a world, not just a widget.</p>
            </div>
            <div className="rounded-[26px] border border-white/8 bg-black/20 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">What this improves</p>
              <p className="mt-2 font-black text-white">Clearer first impression, better weapon discovery, stronger trading personality, and a more premium CSBT experience.</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/mm2/values" className="inline-flex items-center gap-2 rounded-2xl bg-red-500 px-5 py-3 text-sm font-black text-white shadow-[0_12px_34px_rgba(239,68,68,.3)] transition hover:bg-red-400">
              Start browsing weapons →
            </Link>
            <Link href="/mm2/lounge" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-black text-white transition hover:border-red-300/25 hover:bg-white/[0.08]">
              Open CSBT Lounge
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}

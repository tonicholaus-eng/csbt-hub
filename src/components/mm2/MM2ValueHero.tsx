import GameSwitcher from "../GameSwitcher";

type Props = { total: number; updated: string; categories: number };

export default function MM2ValueHero({ total, updated, categories }: Props) {
  return (
    <section className="relative overflow-hidden rounded-[36px] border border-red-400/15 bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,.22),transparent_34%),linear-gradient(135deg,#171019,#090b10)] p-7 shadow-[0_30px_80px_rgba(0,0,0,.35)] sm:p-10">
      <div className="absolute right-8 top-8 text-8xl opacity-[0.06]">🔪</div>
      <span className="inline-flex rounded-full border border-red-300/20 bg-red-500/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-red-100">MM2 Armory</span>
      <GameSwitcher />
      <h1 className="mt-5 max-w-4xl text-5xl font-black tracking-[-0.05em] text-white sm:text-7xl">Find the weapon. Know the value. Trade smarter.</h1>
      <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">The MM2 value board is your collector database. Search weapons, filter collections, and compare the information traders need before making decisions.</p>
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {[['Weapons tracked', total.toLocaleString()], ['Categories', categories.toString()], ['Updated', updated]].map(([a,b]) => (
          <div key={a} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{a}</p>
            <p className="mt-2 text-xl font-black text-white">{b}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

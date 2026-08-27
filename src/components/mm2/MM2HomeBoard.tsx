import Image from "next/image";
import Link from "next/link";
import GameSwitcher from "../GameSwitcher";

 type MM2Item = {
  NAME:string;
  CATEGORY?:string;
  SOURCE_VALUE?:number;
  DEMAND?:number;
  IMAGE?:string;
};

const money=(v?:number)=>typeof v==='number'?v.toLocaleString():"N/A";

export default function MM2HomeBoard({items,featured,totalItems,categoryCount,sourceName}:{items:MM2Item[];featured:MM2Item[];totalItems:number;categoryCount:number;sourceName?:string|null}){
 const weapon=featured[0];
 const recent=featured.slice(1,5);
 return <section className="relative min-h-[900px] overflow-hidden rounded-[36px] border border-red-500/20 bg-[#07080d] shadow-2xl">
  <Image src="/themes/mm2/neon-armory-market-showcase.png" alt="" fill className="object-cover opacity-25" />
  <div className="absolute inset-0 bg-[radial-gradient(circle_at_left,rgba(239,68,68,.25),transparent_35%),linear-gradient(180deg,rgba(0,0,0,.25),#05060b)]"/>

  <div className="relative z-10 grid min-h-[900px] grid-cols-12 gap-5 p-5 lg:p-8">
   <div className="col-span-12 lg:col-span-3 flex flex-col justify-center">
    <div className="rounded-3xl border border-red-500/20 bg-black/60 p-5 backdrop-blur-xl">
      <p className="text-xs tracking-[.3em] text-red-300">WEAPON VAULT</p>
      <h2 className="mt-2 text-3xl font-black">{weapon?.NAME || 'Vault Locked'}</h2>
      <p className="text-red-200">{weapon?.CATEGORY}</p>
      <div className="my-6 flex h-64 items-center justify-center rounded-3xl bg-red-950/30">
       {weapon?.IMAGE && <img src={weapon.IMAGE.startsWith('http')?weapon.IMAGE:`https://supremevalues.com${weapon.IMAGE}`} className="h-full object-contain" alt=""/>}
      </div>
      <div className="grid grid-cols-2 gap-3"><div className="rounded-xl bg-black/40 p-3">Value<br/><b>{money(weapon?.SOURCE_VALUE)}</b></div><div className="rounded-xl bg-black/40 p-3">Demand<br/><b>{weapon?.DEMAND ?? 'N/A'}</b></div></div>
      <Link className="mt-4 block rounded-xl bg-red-600 p-3 text-center font-bold" href="/mm2/values">Open vault</Link>
    </div>
   </div>

   <div className="col-span-12 lg:col-span-6 flex flex-col gap-5">
    <div className="rounded-3xl border border-white/10 bg-black/55 p-6 backdrop-blur-xl">
      <div className="flex justify-between"><div><p className="text-xs tracking-[.25em] text-red-300">CSBT MM2 HQ</p><h1 className="text-4xl font-black">Trading Headquarters</h1></div><GameSwitcher/></div>
      <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">Search weapons, check values, manage trades</div>
      <div className="mt-4 grid grid-cols-4 gap-2">{recent.map(x=><div className="rounded-xl bg-white/5 p-3" key={x.NAME}>{x.NAME}<br/><small>{money(x.SOURCE_VALUE)}</small></div>)}</div>
    </div>
    <div className="rounded-3xl border border-white/10 bg-black/60 p-6 backdrop-blur-xl">
      <p className="text-xs text-red-300">TRADING FLOOR</p>
      <div className="mt-4 grid grid-cols-3 gap-4"><Link href="/calculator" className="rounded-2xl bg-red-950/40 p-5">Trade Calculator</Link><div className="rounded-2xl bg-white/5 p-5">Recent Trades</div><div className="rounded-2xl bg-white/5 p-5">Offer Compare</div></div>
    </div>
   </div>

   <div className="col-span-12 lg:col-span-3 flex flex-col gap-5">
    <div className="rounded-3xl border border-white/10 bg-black/60 p-5 backdrop-blur-xl"><p className="text-red-300">MARKET RADAR</p><h3 className="mt-4 text-xl font-bold">Trending Weapons</h3>{featured.slice(0,4).map(x=><div className="mt-3 rounded-xl bg-white/5 p-3" key={x.NAME}>{x.NAME} · {money(x.SOURCE_VALUE)}</div>)}</div>
    <div className="rounded-3xl border border-red-500/20 bg-black/60 p-5 backdrop-blur-xl"><p className="text-red-300">NICH AI DESK</p><p className="mt-5">Need help checking a trade?</p><div className="mt-4 rounded-xl bg-white/5 p-3">Ask Nich about values, demand, and offers.</div></div>
   </div>

   <div className="col-span-12 grid grid-cols-4 gap-4">
    {[['Weapons',totalItems],['Categories',categoryCount],['Source',sourceName||'Supreme'],['Network','Live']].map(x=><div className="rounded-2xl border border-white/10 bg-black/60 p-5" key={String(x[0])}><small>{x[0]}</small><h3 className="text-2xl font-black">{x[1]}</h3></div>)}
   </div>
  </div>
 </section>
}

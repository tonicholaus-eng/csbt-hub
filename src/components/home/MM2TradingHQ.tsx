import Image from "next/image";
import Link from "next/link";
import mm2Items from "../../data/mm2Items.json";

export default function MM2TradingHQ({ totalItems, categoryCount }: { totalItems:number; categoryCount:number }) {
  const items = mm2Items as any[];
  const featured = items.find((i) => i.CATEGORY === "GODLY") ?? items[0];
  const recent = items.slice(0,5);

  return (
    <section className="relative min-h-screen overflow-hidden bg-[#05070d] text-white">
      <Image src="/themes/mm2/neon-armory-market-showcase.png" fill priority alt="MM2 HQ" className="object-cover" />
      <div className="absolute inset-0 bg-black/70" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,20,50,.18),transparent_45%)]" />

      <div className="relative z-10 grid min-h-screen grid-cols-[230px_1fr] gap-4 p-4">
        <Sidebar />

        <div className="grid min-h-screen grid-rows-[1fr_auto] gap-4">
          <div className="grid grid-cols-[0.9fr_1.6fr_0.8fr] grid-rows-[1fr_auto] gap-4">
            <Vault featured={featured}/>
            <Collection recent={recent}/>
            <Radar />
            <div className="col-span-2"><TradingFloor /></div>
            <Nich />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Monitor title="WEAPONS TRACKED" value={`${totalItems}+`} />
            <Monitor title="SYSTEM STATUS" value="ONLINE" />
            <Monitor title="COLLECTION NETWORK" value={`${categoryCount} CATEGORIES`} />
          </div>
        </div>
      </div>
    </section>
  );
}

function Sidebar(){return <aside className="rounded-3xl border border-white/10 bg-black/65 p-5 backdrop-blur-xl"><b className="text-red-400">CSBT HUB</b><h2 className="mt-2 text-xl font-black">MM2 HQ</h2>{['Home','Weapon Values','Demand Tracker','Trade Calculator','Market Radar','Collector Inventory'].map(x=><div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm" key={x}>{x}</div>)}</aside>}
function Vault({featured}:any){return <section className="rounded-3xl border border-red-500/30 bg-black/70 p-5"><Label text="WEAPON VAULT"/><div className="mt-4 flex h-full min-h-[360px] items-center justify-center rounded-3xl border border-red-500/20 bg-black/50"><Image src="/themes/mm2/neon-market-revolver-accent.png" width={280} height={280} alt="weapon" className="drop-shadow-[0_0_50px_rgba(255,0,50,.8)]"/></div><h2 className="mt-4 text-2xl font-black">{featured?.NAME}</h2><p className="text-red-300">{featured?.CATEGORY}</p><Link href="/mm2/values" className="mt-4 block rounded-xl bg-red-500 p-3 text-center font-bold">Inspect</Link></section>}
function Collection({recent}:any){return <section className="rounded-3xl border border-white/10 bg-black/70 p-5"><Label text="COLLECTION TERMINAL"/><div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-white/50">Search weapons...</div><div className="mt-4 grid grid-cols-5 gap-2">{recent.map((x:any)=><div className="rounded-xl bg-white/5 p-3 text-xs" key={x.ID}>{x.NAME}</div>)}</div></section>}
function TradingFloor(){return <section className="rounded-3xl border border-white/10 bg-black/75 p-5"><Label text="TRADING FLOOR"/><div className="grid grid-cols-3 gap-3 mt-4">{['Calculator','Recent Trades','Offer Compare'].map(x=><div className="rounded-xl bg-white/5 p-5" key={x}>{x}</div>)}</div></section>}
function Radar(){return <section className="rounded-3xl border border-white/10 bg-black/75 p-5"><Label text="MARKET RADAR"/><p className="mt-5">▲ Harvester +12%</p><p>Sakura +8%</p><p>Chroma +6%</p></section>}
function Nich(){return <section className="rounded-3xl border border-white/10 bg-black/75 p-5"><Label text="NICH AI DESK"/><Image src="/nich/nich-face.png" width={80} height={80} alt="Nich"/><p>Trading assistant online</p></section>}
function Monitor({title,value}:any){return <div className="rounded-2xl border border-white/10 bg-black/70 p-5"><small>{title}</small><b className="block text-xl">{value}</b></div>}
function Label({text}:any){return <p className="text-xs font-black tracking-widest text-red-400">{text}</p>}

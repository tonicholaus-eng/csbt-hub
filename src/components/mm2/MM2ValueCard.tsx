import Link from "next/link";

type Item={
 NAME?:string;
 CATEGORY?:string;
 IMAGE?:string;
 GCASH_VALUE?:number|null;
 SOURCE_VALUE?:number|null;
 DEMAND?:number|string|null;
};

function imagePath(item:Item){
 const raw=item.IMAGE || "";
 if(!raw) return null;

 // MM2 images are owned by Supreme Values.
 // Store only the path in the database and resolve it here.
 if(raw.startsWith("http")) return raw;

 return `https://supremevalues.com${raw.startsWith("/") ? raw : `/${raw}`}`;
}

export default function MM2ValueCard({item}:{item:Item}){
 const img=imagePath(item);
 return <Link href={`/mm2/values/${encodeURIComponent((item.NAME || "").toLowerCase().replaceAll(" ", "-"))}`} className="group rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.02))] p-5 transition hover:-translate-y-1 hover:border-red-300/30 block">
  <div className="flex justify-between gap-4">
   <div>
    <p className="text-[10px] font-black uppercase tracking-[.2em] text-red-200/70">Weapon</p>
    <h2 className="mt-2 text-2xl font-black text-white">{item.NAME}</h2>
    <p className="text-sm text-slate-400">{item.CATEGORY}</p>
   </div>
   <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white/[0.05]">
    {img ? <img src={img} alt={item.NAME} className="h-full w-full object-contain"/> : <span className="text-2xl">🔪</span>}
   </div>
  </div>
  <div className="mt-5 grid gap-3 grid-cols-2">
   <div className="rounded-2xl bg-black/20 p-3"><small className="text-slate-500">GCash</small><b className="block text-white">₱{item.GCASH_VALUE ?? 'N/A'}</b></div>
   <div className="rounded-2xl bg-black/20 p-3"><small className="text-slate-500">Supreme</small><b className="block text-white">{item.SOURCE_VALUE ?? 'N/A'}</b></div>
  </div>
  <div className="mt-4 flex gap-2">
   <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-bold text-red-100">Demand {item.DEMAND ?? 'N/A'}</span>
   <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-slate-300">View details →</span>
  </div>
 </Link>
}

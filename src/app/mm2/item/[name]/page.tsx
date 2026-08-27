import mm2Items from "../../../../data/mm2Items.json";
import MM2DemandPanel from "../../../../components/mm2/MM2DemandPanel";
import MM2TradePanel from "../../../../components/mm2/MM2TradePanel";

export default function Page({params}:{params:{name:string}}){
 const item:any=mm2Items.find(i=>i.NAME===decodeURIComponent(params.name));
 if(!item) return <div className="p-10 text-white">Not found</div>;
 return <main className="min-h-screen bg-[#08090D] text-white p-8">
  <div className="mx-auto max-w-6xl">
   <div className="rounded-[36px] border border-white/10 bg-white/[0.03] p-8">
    <div className="flex flex-col gap-8 md:flex-row">
     <div className="flex h-64 w-64 items-center justify-center rounded-3xl bg-black/20">
      {item.IMAGE && <img src={item.IMAGE.startsWith("/")?item.IMAGE:`/${item.IMAGE}`} alt={item.NAME} className="max-h-full object-contain"/>}
     </div>
     <div>
      <p className="text-red-200">{item.CATEGORY}</p>
      <h1 className="text-6xl font-black">{item.NAME}</h1>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
       {[["Supreme",item.SOURCE_VALUE],["GCash",item.GCASH_VALUE ?? "N/A"],["Demand",item.DEMAND ?? "N/A"]].map(x=><div key={x[0]} className="rounded-3xl border border-white/10 bg-white/5 p-5"><p>{x[0]}</p><b className="text-3xl">{x[1]}</b></div>)}
      </div>
     </div>
    </div>
   </div>
   <div className="mt-8 grid gap-4 md:grid-cols-2"><MM2DemandPanel item={item}/><MM2TradePanel/></div>
  </div>
 </main>
}

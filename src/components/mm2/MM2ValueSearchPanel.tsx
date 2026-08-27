"use client";

import { useMemo, useState } from "react";

type Item={NAME?:string;CATEGORY?:string;SUPREME_VALUE?:number;DEMAND?:number|string;RARITY?:number|string;};

export default function MM2ValueSearchPanel({items,onSelect}:{items:Item[];onSelect:(n:string)=>void}){
 const [q,setQ]=useState("");
 const results=useMemo(()=>items.filter(i=>i.NAME?.toLowerCase().includes(q.toLowerCase())).slice(0,8),[items,q]);
 return <div className="relative rounded-[28px] border border-white/10 bg-white/[0.04] p-4">
  <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search weapons instantly..." className="h-14 w-full rounded-2xl bg-black/30 px-5 text-white outline-none placeholder:text-slate-500" />
  {q && <div className="mt-3 grid gap-2">{results.map(i=><button key={i.NAME} onClick={()=>onSelect(i.NAME||"")} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-3 text-left hover:border-red-300/30"><span><b className="block text-white">{i.NAME}</b><small className="text-slate-400">{i.CATEGORY}</small></span><span className="font-black text-red-100">{i.SUPREME_VALUE ?? 'N/A'}</span></button>)}</div>}
 </div>
}

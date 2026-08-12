"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ItemSearchPicker from "../items/ItemSearchPicker";
import type { TradeItem, ValueSource, ValueType } from "../trade/types";
import { useAuthSession } from "../../hooks/useAuthSession";
import { getItemById } from "../../lib/search";
import { formatTradeValue, getItemValue, hasItemValue, parseTradeValue } from "../../lib/valueSystem";
import { getItemCategoryDetails } from "../../lib/itemCategory";

type SideItem = { itemId: string; valueType: ValueType; quantity: number };
type Vote = { vote: "WIN"|"FAIR"|"LOSE"; user_id: string };
type FeedTrade = { id:string; user_id:string; display_name:string; value_source:ValueSource; your_items:SideItem[]; their_items:SideItem[]; note:string|null; created_at:string; community_trade_votes?:Vote[] };

function totalSide(items: SideItem[], source: ValueSource) {
  return items.reduce((sum,row)=>{const item=getItemById(row.itemId); if(!item)return sum; return sum+(parseTradeValue(getItemValue(item,source,row.valueType))??0)*Math.max(1,row.quantity||1)},0);
}

function bestValueType(item: TradeItem, source: ValueSource, preferred: ValueType = "NORMAL"): ValueType {
  if (hasItemValue(item, source, preferred)) return preferred;
  if (hasItemValue(item, source, "NORMAL")) return "NORMAL";
  if (hasItemValue(item, source, "NEON")) return "NEON";
  if (hasItemValue(item, source, "MEGA")) return "MEGA";
  return "NORMAL";
}

export default function TradeVotingBoard(){
  const {supabase,user,loading}=useAuthSession();
  const [source,setSource]=useState<ValueSource>("GCASH");
  const [your,setYour]=useState<SideItem[]>([]); const [their,setTheir]=useState<SideItem[]>([]);
  const [note,setNote]=useState(""); const [trades,setTrades]=useState<FeedTrade[]>([]); const [error,setError]=useState<string|null>(null); const [posting,setPosting]=useState(false);

  async function reload(){if(!supabase)return; const {data,error:loadError}=await supabase.from("community_trades").select("id,user_id,display_name,value_source,your_items,their_items,note,created_at,community_trade_votes(vote,user_id)").order("created_at",{ascending:false}).limit(50); if(loadError)setError(loadError.message); else setTrades((data??[]) as unknown as FeedTrade[]);}
  useEffect(()=>{void reload(); if(!supabase)return; const channel=supabase.channel("trade-voting-feed").on("postgres_changes",{event:"*",schema:"public",table:"community_trades"},()=>void reload()).on("postgres_changes",{event:"*",schema:"public",table:"community_trade_votes"},()=>void reload()).subscribe(); return()=>{void supabase.removeChannel(channel)};},[supabase]);

  useEffect(()=>{
    const normalize=(rows:SideItem[])=>rows.map((row)=>{const item=getItemById(row.itemId);return item?{...row,valueType:bestValueType(item,source,row.valueType)}:row;});
    setYour(normalize);
    setTheir(normalize);
  },[source]);

  function add(side:"your"|"their",item:TradeItem){const row:SideItem={itemId:item.ID,valueType:bestValueType(item,source),quantity:1}; side==="your"?setYour(c=>[...c,row].slice(0,18)):setTheir(c=>[...c,row].slice(0,18));}
  function patch(side:"your"|"their",index:number,patch:Partial<SideItem>){const setter=side==="your"?setYour:setTheir; setter(c=>c.map((row,i)=>i===index?{...row,...patch}:row));}
  function remove(side:"your"|"their",index:number){const setter=side==="your"?setYour:setTheir; setter(c=>c.filter((_,i)=>i!==index));}

  async function submit(){if(!supabase||!user||!your.length||!their.length)return; setPosting(true);setError(null); const {error:postError}=await supabase.from("community_trades").insert({user_id:user.id,value_source:source,your_items:your,their_items:their,note:note.trim().slice(0,300)||null}); if(postError)setError(postError.message); else{setYour([]);setTheir([]);setNote("");void reload();} setPosting(false);}
  async function vote(tradeId:string,voteValue:"WIN"|"FAIR"|"LOSE"){if(!supabase||!user)return; const {error:voteError}=await supabase.from("community_trade_votes").upsert({trade_id:tradeId,user_id:user.id,vote:voteValue},{onConflict:"trade_id,user_id"}); if(voteError)setError(voteError.message); else void reload();}

  if(loading)return <div className="h-64 animate-pulse rounded-3xl bg-white/60 dark:bg-white/5"/>;
  return <div className="space-y-6">
    <section className="rounded-[28px] border border-white/65 bg-white/75 p-4 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/65 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.17em] text-violet-600 dark:text-violet-300">Post a trade</p><h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">Ask the community W/F/L</h2></div><div className="flex rounded-xl bg-slate-100 p-1 dark:bg-white/5">{(["GCASH","ELVE"] as const).map(v=><button key={v} onClick={()=>setSource(v)} className={`rounded-lg px-3 py-2 text-xs font-black ${source===v?"bg-white shadow dark:bg-slate-800":"text-slate-400"}`}>{v==="GCASH"?"💸 GCash":"🦈 Elve"}</button>)}</div></div>
      {!user?<p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">You can browse and learn from trades now. <Link href="/profile" className="underline">Sign in</Link> to post or vote.</p>:<div className="mt-5 grid gap-4 lg:grid-cols-2"><TradeBuilder title="My offer" rows={your} source={source} onAdd={(i)=>add("your",i)} onPatch={(i,p)=>patch("your",i,p)} onRemove={(i)=>remove("your",i)}/><TradeBuilder title="Their offer" rows={their} source={source} onAdd={(i)=>add("their",i)} onPatch={(i,p)=>patch("their",i,p)} onRemove={(i)=>remove("their",i)}/><textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={300} rows={2} placeholder="Optional context: should I accept this?" className="rounded-2xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-amber-400 dark:border-white/10 dark:bg-slate-900 lg:col-span-2"/><div className="flex items-center justify-between gap-3 lg:col-span-2"><p className="text-xs font-bold text-slate-400">Totals: {formatTradeValue(totalSide(your,source))} vs {formatTradeValue(totalSide(their,source))}</p><button disabled={posting||!your.length||!their.length} onClick={()=>void submit()} className="rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-3 text-sm font-black text-white disabled:opacity-40">{posting?"Posting…":"Post for voting"}</button></div></div>}
    </section>
    {error&&<p className="rounded-2xl bg-rose-50 p-4 text-xs font-bold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error.includes("relation")?"Run src/lib/supabase/phase-two.sql in Supabase first.":error}</p>}
    <section><div className="mb-4"><p className="text-xs font-black uppercase tracking-[.17em] text-amber-600 dark:text-amber-300">Community feed</p><h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">Recent W/F/L votes</h2></div><div className="space-y-4">{trades.length?trades.map(trade=><TradeCard key={trade.id} trade={trade} currentUserId={user?.id??null} onVote={vote}/>):<div className="rounded-3xl border border-dashed border-slate-300 p-10 text-center text-sm font-bold text-slate-400 dark:border-white/10">No community trades yet. Be the first one.</div>}</div></section>
  </div>;
}

function TradeBuilder({title,rows,source,onAdd,onPatch,onRemove}:{title:string;rows:SideItem[];source:ValueSource;onAdd:(item:TradeItem)=>void;onPatch:(index:number,patch:Partial<SideItem>)=>void;onRemove:(index:number)=>void}) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
      <h3 className="font-black text-slate-950 dark:text-white">{title}</h3>
      <div className="mt-3"><ItemSearchPicker onSelect={onAdd} valueSource={source} placeholder={`Add to ${title.toLowerCase()}…`}/></div>
      <div className="mt-3 space-y-2">
        {rows.map((row,index)=>{
          const item=getItemById(row.itemId);
          if(!item)return null;
          const details=getItemCategoryDetails(item.CATEGORY);
          const valueTypes=(details.regularOnly ? ["NORMAL"] : ["NORMAL","NEON","MEGA"]).filter((type)=>hasItemValue(item,source,type as ValueType)) as ValueType[];
          const safeTypes=valueTypes.length?valueTypes:["NORMAL" as ValueType];
          return (
            <div key={`${row.itemId}-${index}`} className="grid grid-cols-[minmax(0,1fr)_88px_56px_32px] items-center gap-2 rounded-xl bg-slate-50 p-2 dark:bg-white/5">
              <span className="min-w-0"><span className="block truncate text-xs font-black">{item.NAME}</span><span className="block truncate text-[9px] font-bold text-slate-400">{details.label}</span></span>
              <select value={safeTypes.includes(row.valueType)?row.valueType:safeTypes[0]} onChange={e=>onPatch(index,{valueType:e.target.value as ValueType})} className="rounded-lg border border-slate-200 bg-white px-1 py-1.5 text-[10px] font-black dark:border-white/10 dark:bg-slate-900">
                {safeTypes.map((type)=><option key={type} value={type}>{type==="NORMAL"?"Reg":type==="NEON"?"Neon":"Mega"}</option>)}
              </select>
              <input type="number" min={1} max={99} value={row.quantity} onChange={e=>onPatch(index,{quantity:Math.max(1,Math.min(99,Number(e.target.value)||1))})} className="rounded-lg border border-slate-200 bg-white px-1 py-1.5 text-center text-[10px] font-black dark:border-white/10 dark:bg-slate-900"/>
              <button type="button" onClick={()=>onRemove(index)} aria-label={`Remove ${item.NAME}`} className="h-8 w-8 rounded-lg text-rose-500">×</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}


function TradeCard({trade,currentUserId,onVote}:{trade:FeedTrade;currentUserId:string|null;onVote:(id:string,v:"WIN"|"FAIR"|"LOSE")=>Promise<void>}){const votes=trade.community_trade_votes??[];const counts={WIN:0,FAIR:0,LOSE:0};votes.forEach(v=>counts[v.vote]++);const total=votes.length;const mine=votes.find(v=>v.user_id===currentUserId)?.vote;return <article className="rounded-[26px] border border-white/65 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/65 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-black text-slate-950 dark:text-white">{trade.display_name}</p><p className="text-[10px] font-bold text-slate-400">{new Intl.DateTimeFormat("en-PH",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(new Date(trade.created_at))} • {trade.value_source}</p></div><p className="text-xs font-black text-slate-400">{total} vote{total===1?"":"s"}</p></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><TradeMiniSide title="My offer" rows={trade.your_items}/><TradeMiniSide title="Their offer" rows={trade.their_items}/></div>{trade.note&&<p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500 dark:bg-white/5">{trade.note}</p>}<div className="mt-4 grid grid-cols-3 gap-2">{(["WIN","FAIR","LOSE"] as const).map(v=>{const pct=total?Math.round(counts[v]/total*100):0;return <button key={v} disabled={!currentUserId} onClick={()=>void onVote(trade.id,v)} className={`rounded-xl border px-2 py-3 text-xs font-black disabled:cursor-not-allowed ${mine===v?"border-amber-400 bg-amber-100 text-amber-900 dark:bg-amber-400/10 dark:text-amber-200":"border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"}`}>{v==="WIN"?"🟢 Win":v==="FAIR"?"⚪ Fair":"🔴 Lose"}<span className="mt-1 block text-[10px] opacity-60">{pct}%</span></button>})}</div></article>}
function TradeMiniSide({title,rows}:{title:string;rows:SideItem[]}){return <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5"><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{title}</p><div className="mt-2 flex flex-wrap gap-2">{rows.map((row,i)=>{const item=getItemById(row.itemId);return item?<span key={`${row.itemId}-${i}`} className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1.5 text-[10px] font-black shadow-sm dark:bg-slate-900">{item.IMAGE&&<Image src={item.IMAGE} alt="" width={20} height={20} unoptimized className="h-5 w-5 object-contain"/>}{row.quantity>1?`${row.quantity}× `:""}{item.NAME} {row.valueType!=="NORMAL"?`(${row.valueType})`:""}</span>:null})}</div></div>}

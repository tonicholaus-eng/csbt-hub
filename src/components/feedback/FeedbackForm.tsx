"use client";

import { useState } from "react";
import ItemSearchPicker from "../items/ItemSearchPicker";
import type { TradeItem } from "../trade/types";
import { useAuthSession } from "../../hooks/useAuthSession";

const categories = [
  ["WRONG_VALUE","Wrong Value"],
  ["MISSING_ITEM","Missing Item"],
  ["BUG","Bug / Technical Issue"],
  ["FEATURE","Feature Suggestion"],
  ["OTHER","Other"],
] as const;

export default function FeedbackForm(){
  const {supabase,user}=useAuthSession();
  const [category,setCategory]=useState<(typeof categories)[number][0]>("FEATURE");
  const [item,setItem]=useState<TradeItem|null>(null);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false); const [notice,setNotice]=useState<string|null>(null); const [error,setError]=useState<string|null>(null);
  const itemRelevant=category==="WRONG_VALUE"||category==="MISSING_ITEM";

  async function submit(){if(!supabase||message.trim().length<5)return;setBusy(true);setError(null);setNotice(null);const {error:submitError}=await supabase.from("feedback_submissions").insert({user_id:user?.id??null,category,item_id:item?.ID??null,item_name:item?.NAME??null,message:message.trim().slice(0,2000),page_url:typeof window!=="undefined"?window.location.href:null});if(submitError)setError(submitError.message);else{setMessage("");setItem(null);setNotice("Thanks — your feedback was sent to the CSBT feedback inbox.");}setBusy(false)}

  if(!supabase)return <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm font-bold text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">Supabase must be configured before feedback can be submitted.</div>;
  return <section className="mx-auto max-w-3xl rounded-[30px] border border-white/65 bg-white/80 p-5 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/65 sm:p-7"><div className="grid gap-5"><label><span className="mb-2 block text-xs font-black text-slate-700 dark:text-slate-300">Feedback type</span><select value={category} onChange={e=>{setCategory(e.target.value as typeof category);setItem(null)}} className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black dark:border-white/10 dark:bg-slate-900">{categories.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>{itemRelevant&&<div><span className="mb-2 block text-xs font-black text-slate-700 dark:text-slate-300">Related item {category==="MISSING_ITEM"?"(optional if it isn't in the database yet)":""}</span><ItemSearchPicker onSelect={setItem} placeholder="Search the item this feedback is about…"/>{item&&<p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-black text-amber-800 dark:bg-amber-400/10 dark:text-amber-200">Selected: {item.NAME} <button onClick={()=>setItem(null)} className="ml-2 underline">clear</button></p>}</div>}<label><span className="mb-2 block text-xs font-black text-slate-700 dark:text-slate-300">Tell us what happened or what you'd like added</span><textarea value={message} onChange={e=>setMessage(e.target.value)} maxLength={2000} rows={7} placeholder={category==="WRONG_VALUE"?"Example: Frost Dragon GCash value looks outdated because…":category==="BUG"?"What page were you on, what did you tap, and what happened?":"Describe your suggestion as clearly as possible…"} className="w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-amber-400 dark:border-white/10 dark:bg-slate-900"/><span className="mt-1 block text-right text-[10px] font-bold text-slate-400">{message.length}/2000</span></label>{error&&<p className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error.includes("relation")?"Run src/lib/supabase/phase-two.sql in Supabase to enable feedback.":error}</p>}{notice&&<p className="rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{notice}</p>}<div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-400">{user?"Your signed-in CSBT account will be attached to the submission.":"You can submit without signing in."}</p><button disabled={busy||message.trim().length<5} onClick={()=>void submit()} className="rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-3 text-sm font-black text-slate-950 disabled:opacity-40">{busy?"Sending…":"Send Feedback"}</button></div></div></section>;
}

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
  const [website,setWebsite]=useState("");
  const [busy,setBusy]=useState(false); const [notice,setNotice]=useState<string|null>(null); const [error,setError]=useState<string|null>(null);
  const itemRelevant=category==="WRONG_VALUE"||category==="MISSING_ITEM";

  async function submit(){
    if(!supabase||message.trim().length<5)return;
    setBusy(true);setError(null);setNotice(null);
    const {data:{session}}=await supabase.auth.getSession();
    try{
      const response=await fetch("/api/feedback",{method:"POST",headers:{"content-type":"application/json",...(session?.access_token?{authorization:`Bearer ${session.access_token}`}:{})},body:JSON.stringify({category,itemId:item?.ID??null,itemName:item?.NAME??null,message:message.trim(),pageUrl:typeof window!=="undefined"?window.location.href:null,website})});
      const result=await response.json().catch(()=>({ok:false,message:"Feedback could not be submitted right now."}));
      if(!response.ok||!result.ok)setError(result.message??"Feedback could not be submitted right now. Please try again.");
      else{setMessage("");setItem(null);setWebsite("");setNotice("Thanks — your feedback was sent to the CSBT feedback inbox.");}
    }catch{setError("Feedback could not be submitted right now. Please try again.");}
    setBusy(false);
  }

  if(!supabase)return <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm font-bold text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">Supabase must be configured before feedback can be submitted.</div>;
  return <section className="csbt-feature-panel mx-auto max-w-5xl p-5 sm:p-7 lg:p-10"><div className="mb-6 flex items-start gap-4 border-b border-[var(--border)] pb-6 lg:mb-8 lg:pb-8"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[var(--surface-selected)] text-xl text-[var(--gold-dark)] ring-1 ring-[var(--border-gold)]" aria-hidden="true">✦</span><div><p className="text-sm font-black text-[var(--foreground)]">Help shape the next CSBT update</p><p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--foreground-muted)]">Tell us what feels wrong, what is missing, or what would make the hub more useful. The form stays attached to your current CSBT session when you are signed in.</p></div></div><div className="grid gap-6 lg:gap-7"><label><span className="mb-2 block text-xs font-black text-[var(--foreground)]">Feedback type</span><select value={category} onChange={e=>{setCategory(e.target.value as typeof category);setItem(null)}} className="csbt-input-field min-h-12 w-full rounded-[var(--radius-control)] px-4 text-sm font-black">{categories.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>{itemRelevant&&<div><span className="mb-2 block text-xs font-black text-[var(--foreground)]">Related item {category==="MISSING_ITEM"?"(optional if it isn&apos;t in the database yet)":""}</span><ItemSearchPicker onSelect={setItem} placeholder="Search the item this feedback is about…"/>{item&&<p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-black text-amber-800 dark:bg-amber-400/10 dark:text-amber-200">Selected: {item.NAME} <button onClick={()=>setItem(null)} className="ml-2 underline">clear</button></p>}</div>}<label className="absolute left-[-9999px] h-px w-px overflow-hidden" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" value={website} onChange={e=>setWebsite(e.target.value)}/></label><label><span className="mb-2 block text-xs font-black text-[var(--foreground)]">Tell us what happened or what you&apos;d like added</span><textarea value={message} onChange={e=>setMessage(e.target.value)} maxLength={2000} rows={7} placeholder={category==="WRONG_VALUE"?"Example: Frost Dragon GCash value looks outdated because…":category==="BUG"?"What page were you on, what did you tap, and what happened?":"Describe your suggestion as clearly as possible…"} className="csbt-input-field min-h-[210px] w-full resize-y rounded-[var(--radius-control)] px-4 py-4 text-sm leading-6 lg:min-h-[280px]"/><span className="mt-1.5 block text-right text-xs font-bold text-[var(--foreground-muted)]">{message.length}/2000</span></label>{error&&<p className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}{notice&&<p className="rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{notice}</p>}<div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-[var(--foreground-muted)]">{user?"Your signed-in CSBT account will be attached to the submission.":"You can submit without signing in."}</p><button disabled={busy||message.trim().length<5} onClick={()=>void submit()} className="csbt-btn-primary min-h-12 px-6 disabled:opacity-40">{busy?"Sending…":"Send Feedback"}</button></div></div></section>;
}

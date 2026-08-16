"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuthSession } from "../../hooks/useAuthSession";
import type { ValueSource, ValueType } from "../trade/types";

export default function WatchValueButton({ itemId, itemName, source, valueType }: { itemId: string; itemName: string; source: ValueSource; valueType: ValueType }) {
  const { supabase, user, loading } = useAuthSession();
  const [watchId, setWatchId] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase || !user) { queueMicrotask(() => setWatchId(null)); return; }
    let active = true;
    void supabase.from("value_watchlist").select("id,alert_percent").eq("user_id", user.id).eq("item_id", itemId).eq("source", source).eq("value_type", valueType).maybeSingle().then(({ data }) => {
      if (!active) return;
      setWatchId(typeof data?.id === "string" ? data.id : null);
      if (data?.alert_percent) setThreshold(Number(data.alert_percent));
    });
    return () => { active = false; };
  }, [itemId, source, supabase, user, valueType]);

  if (loading) return <div className="mt-3 h-11 animate-pulse rounded-2xl bg-slate-200/60 dark:bg-white/5" />;
  if (!supabase) return null;
  if (!user) return <Link href="/profile" className="inline-flex min-h-11 items-center rounded-2xl border border-amber-200 bg-amber-50 px-4 text-xs font-black text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">🔔 Sign in for value alerts</Link>;

  async function saveWatch() {
    if (!supabase || !user) return;
    setBusy(true); setError(null);
    const { data, error: upsertError } = await supabase.from("value_watchlist").upsert({ user_id:user.id,item_id:itemId,item_name:itemName,source,value_type:valueType,alert_percent:threshold,enabled:true }, { onConflict:"user_id,item_id,source,value_type" }).select("id").single();
    if (upsertError) setError(upsertError.message); else if (data?.id) setWatchId(String(data.id));
    setBusy(false);
  }
  async function removeWatch() {
    if (!supabase || !user || !watchId) return;
    setBusy(true); const { error: deleteError } = await supabase.from("value_watchlist").delete().eq("id",watchId).eq("user_id",user.id); if (deleteError) setError(deleteError.message); else setWatchId(null); setBusy(false);
  }

  return <div className="mt-3 flex flex-wrap items-center gap-2"><select value={threshold} onChange={(e)=>setThreshold(Number(e.target.value))} className="min-h-11 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-black dark:border-white/10 dark:bg-slate-900">{[5,10,15,20,25].map(n=><option key={n} value={n}>{n}% change</option>)}</select><button type="button" disabled={busy} onClick={()=>void (watchId?saveWatch():saveWatch())} className={`min-h-11 rounded-2xl border px-4 text-xs font-black disabled:opacity-50 ${watchId?"border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300":"border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200"}`}>{busy?"Saving…":watchId?`✓ Watching ${threshold}%+ changes`:`🔔 Watch ${threshold}%+ changes`}</button>{watchId&&<button type="button" disabled={busy} onClick={()=>void removeWatch()} className="min-h-11 rounded-2xl px-3 text-xs font-black text-rose-500">Remove</button>}{error&&<p className="w-full text-xs font-bold text-rose-600 dark:text-rose-300">{error.includes("relation")?"Value alerts are temporarily unavailable. Please try again later.":error}</p>}</div>;
}

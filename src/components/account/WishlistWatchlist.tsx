"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuthSession } from "../../hooks/useAuthSession";
import ItemSearchPicker from "../items/ItemSearchPicker";
import type { TradeItem } from "../trade/types";
import { getItemById } from "../../lib/search";
import { getItemCategoryDetails } from "../../lib/itemCategory";

type Wish = { id: string; item_id: string; item_name: string; image_url: string | null; category: string };
type Watch = { id: string; item_id: string; item_name: string; source: "GCASH"|"ELVE"; value_type: "NORMAL"|"NEON"|"MEGA"; alert_percent: number; enabled: boolean };

export default function WishlistWatchlist() {
  const { supabase, user, loading } = useAuthSession();
  const [wishlist, setWishlist] = useState<Wish[]>([]);
  const [watches, setWatches] = useState<Watch[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    if (!supabase || !user) return;
    const [wishResult, watchResult] = await Promise.all([
      supabase.from("wishlist_items").select("id,item_id,item_name,image_url,category").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("value_watchlist").select("id,item_id,item_name,source,value_type,alert_percent,enabled").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);
    if (wishResult.error) setError(wishResult.error.message); else setWishlist((wishResult.data ?? []) as Wish[]);
    if (watchResult.error) setError(watchResult.error.message); else setWatches((watchResult.data ?? []) as Watch[]);
  }

  useEffect(() => { void reload(); }, [supabase, user]);

  async function addWishlist(item: TradeItem) {
    if (!supabase || !user) return;
    const { error: insertError } = await supabase.from("wishlist_items").upsert({ user_id: user.id, item_id: item.ID, item_name: item.NAME, image_url: item.IMAGE || null, category: item.CATEGORY }, { onConflict: "user_id,item_id" });
    if (insertError) setError(insertError.message); else void reload();
  }

  if (loading) return <div className="h-64 animate-pulse rounded-3xl bg-white/60 dark:bg-white/5" />;
  if (!user || !supabase) return <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-400/20 dark:bg-amber-400/10"><p className="font-black text-amber-900 dark:text-amber-200">Sign in to use your wishlist and value watchlist.</p><Link href="/profile" className="mt-4 inline-flex rounded-2xl bg-amber-400 px-5 py-3 text-sm font-black text-slate-950">Sign in →</Link></div>;

  return <div className="grid gap-6 xl:grid-cols-2">
    <section className="rounded-[28px] border border-white/65 bg-white/75 p-5 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/65">
      <p className="text-xs font-black uppercase tracking-[0.17em] text-violet-600 dark:text-violet-300">Wishlist</p><h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">Items you want</h2>
      <div className="mt-4"><ItemSearchPicker onSelect={addWishlist} placeholder="Add an item to wishlist…" /></div>
      <div className="mt-5 space-y-2">{wishlist.length ? wishlist.map((row) => { const item=getItemById(row.item_id); const d=getItemCategoryDetails(item?.CATEGORY ?? row.category); return <div key={row.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3 dark:border-white/10"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-white/5">{row.image_url ? <Image src={row.image_url} alt="" width={48} height={48} unoptimized className="h-10 w-10 object-contain" /> : d.icon}</span><span className="min-w-0 flex-1"><Link href={`/values/${encodeURIComponent(row.item_id)}`} className="block truncate text-sm font-black text-slate-900 dark:text-white">{row.item_name}</Link><span className="text-[10px] font-bold text-slate-400">{d.label}</span></span><button type="button" onClick={async()=>{await supabase.from("wishlist_items").delete().eq("id",row.id); void reload();}} className="h-9 w-9 rounded-xl bg-rose-50 font-black text-rose-600 dark:bg-rose-500/10">×</button></div>; }) : <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm font-bold text-slate-400 dark:border-white/10">Your wishlist is empty.</p>}</div>
    </section>

    <section className="rounded-[28px] border border-white/65 bg-white/75 p-5 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/65">
      <p className="text-xs font-black uppercase tracking-[0.17em] text-amber-600 dark:text-amber-300">Watchlist</p><h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">Value alerts</h2><p className="mt-2 text-xs text-slate-400">Change the threshold anytime. Alerts are checked when CSBT refreshes values.</p>
      <div className="mt-5 space-y-2">{watches.length ? watches.map((row) => <div key={row.id} className="rounded-2xl border border-slate-200 p-3 dark:border-white/10"><div className="flex items-center justify-between gap-3"><Link href={`/values/${encodeURIComponent(row.item_id)}`} className="truncate text-sm font-black text-slate-900 dark:text-white">{row.item_name}</Link><button type="button" onClick={async()=>{await supabase.from("value_watchlist").delete().eq("id",row.id); void reload();}} className="text-xs font-black text-rose-500">Remove</button></div><div className="mt-3 grid grid-cols-3 gap-2"><span className="rounded-xl bg-slate-100 px-2 py-2 text-center text-[10px] font-black dark:bg-white/5">{row.source === "GCASH" ? "💸 GCash" : "🦈 Elve"}</span><span className="rounded-xl bg-slate-100 px-2 py-2 text-center text-[10px] font-black dark:bg-white/5">{row.value_type}</span><select value={row.alert_percent} onChange={async(e)=>{await supabase.from("value_watchlist").update({alert_percent:Number(e.target.value)}).eq("id",row.id); void reload();}} className="rounded-xl border border-slate-200 bg-white px-2 text-[10px] font-black dark:border-white/10 dark:bg-slate-900">{[5,10,15,20,25].map(n=><option key={n} value={n}>{n}% change</option>)}</select></div></div>) : <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm font-bold text-slate-400 dark:border-white/10">Watch an item from its value page.</p>}</div>
    </section>
    {error && <p className="xl:col-span-2 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error.includes("relation") ? "Run phase-two.sql in Supabase to enable the new account tools." : error}</p>}
  </div>;
}

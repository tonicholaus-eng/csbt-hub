"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuthSession } from "../../hooks/useAuthSession";
import type { TradeItem } from "../trade/types";

export default function WishlistButton({ item }: { item: TradeItem }) {
  const { supabase, user, loading } = useAuthSession();
  const [wishlistId, setWishlistId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabase || !user) { setWishlistId(null); return; }
    let active = true;
    void supabase.from("wishlist_items").select("id").eq("user_id", user.id).eq("item_id", item.ID).maybeSingle().then(({ data }) => {
      if (active) setWishlistId(typeof data?.id === "string" ? data.id : null);
    });
    return () => { active = false; };
  }, [item.ID, supabase, user]);

  if (loading || !supabase) return null;
  if (!user) return <Link href="/profile" className="inline-flex min-h-11 items-center rounded-2xl border border-violet-200 bg-violet-50 px-4 text-xs font-black text-violet-700 dark:border-violet-400/20 dark:bg-violet-400/10 dark:text-violet-300">☆ Sign in for wishlist</Link>;

  async function toggle() {
    if (!supabase || !user) return;
    setBusy(true);
    if (wishlistId) {
      const { error } = await supabase.from("wishlist_items").delete().eq("id", wishlistId).eq("user_id", user.id);
      if (!error) setWishlistId(null);
    } else {
      const { data, error } = await supabase.from("wishlist_items").insert({ user_id: user.id, item_id: item.ID, item_name: item.NAME, image_url: item.IMAGE || null, category: item.CATEGORY }).select("id").single();
      if (!error && data?.id) setWishlistId(String(data.id));
    }
    setBusy(false);
  }

  return <button type="button" disabled={busy} onClick={() => void toggle()} className={`min-h-11 rounded-2xl border px-4 text-xs font-black disabled:opacity-50 ${wishlistId ? "border-violet-300 bg-violet-100 text-violet-800 dark:border-violet-400/20 dark:bg-violet-400/10 dark:text-violet-300" : "border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"}`}>{busy ? "Saving…" : wishlistId ? "★ In wishlist" : "☆ Add to wishlist"}</button>;
}

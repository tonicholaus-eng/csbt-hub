"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuthSession } from "../../hooks/useAuthSession";
import type { SelectedTradeItem, ValueSource } from "./types";
import { getItemValue, parseTradeValue } from "../../lib/valueSystem";

function verdict(yourTotal: number, theirTotal: number) {
  if (yourTotal === 0 && theirTotal === 0) return "READY";
  const difference = Math.abs(theirTotal - yourTotal);
  const baseline = Math.max(yourTotal, theirTotal, 1);
  if ((difference / baseline) * 100 <= 5) return "FAIR";
  return theirTotal > yourTotal ? "WIN" : "LOSE";
}

function serialize(items: SelectedTradeItem[], source: ValueSource) {
  return items.slice(0, 18).map((selected) => ({
    item_id: selected.item.ID,
    name: selected.item.NAME,
    category: selected.item.CATEGORY,
    value_type: selected.valueType,
    value: parseTradeValue(getItemValue(selected.item, source, selected.valueType)) ?? 0,
  }));
}

export default function SaveTradeButton({
  yourItems,
  theirItems,
  yourTotal,
  theirTotal,
  valueSource,
}: {
  yourItems: SelectedTradeItem[];
  theirItems: SelectedTradeItem[];
  yourTotal: number;
  theirTotal: number;
  valueSource: ValueSource;
}) {
  const { supabase, user, loading } = useAuthSession();
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const empty = yourItems.length === 0 && theirItems.length === 0;

  if (empty) return null;
  if (loading) return <div className="mt-5 h-12 animate-pulse rounded-2xl bg-slate-200/50 dark:bg-white/5" />;
  if (!supabase) return null;
  if (!user) {
    return (
      <div className="mt-5 rounded-2xl border border-slate-200 bg-white/70 p-4 text-center dark:border-white/10 dark:bg-white/5">
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Want to keep this comparison?</p>
        <Link href="/profile" className="mt-2 inline-flex text-xs font-black text-amber-700 dark:text-amber-300">Sign in to save trade history →</Link>
      </div>
    );
  }

  async function save() {
    if (!supabase || !user || empty) return;
    setBusy(true);
    setError(null);
    const { error: saveError } = await supabase.from("trade_history").insert({
      user_id: user.id,
      value_source: valueSource,
      your_items: serialize(yourItems, valueSource),
      their_items: serialize(theirItems, valueSource),
      your_total: yourTotal,
      their_total: theirTotal,
      verdict: verdict(yourTotal, theirTotal),
      status: "draft",
    });
    if (saveError) setError(saveError.message);
    else setSaved(true);
    setBusy(false);
  }

  return (
    <div className="mt-5 flex flex-col items-center gap-2 text-center">
      {saved ? (
        <Link href="/trades" className="inline-flex min-h-12 items-center rounded-2xl bg-emerald-100 px-5 text-sm font-black text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">✓ Saved · View trade history →</Link>
      ) : (
        <button type="button" onClick={() => void save()} disabled={busy} className="min-h-12 rounded-2xl border border-amber-200 bg-amber-50 px-5 text-sm font-black text-amber-800 shadow-sm disabled:opacity-50 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">{busy ? "Saving…" : "💾 Save this trade"}</button>
      )}
      {error && <p className="text-xs font-bold text-rose-600 dark:text-rose-300">{error.includes("relation") ? "Apply the foundation SQL first to enable trade history." : error}</p>}
    </div>
  );
}

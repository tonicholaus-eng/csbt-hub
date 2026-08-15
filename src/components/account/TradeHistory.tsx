"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AuthCard from "./AuthCard";
import { useAuthSession } from "../../hooks/useAuthSession";
import { EmptyState, Surface } from "../ui/CSBTUI";

type SavedItem = {
  item_id?: string;
  name?: string;
  category?: string;
  value_type?: string;
  value?: number;
};

type TradeRow = {
  id: string;
  user_id: string;
  value_source: "GCASH" | "ELVE";
  your_items: SavedItem[];
  their_items: SavedItem[];
  your_total: number;
  their_total: number;
  verdict: "WIN" | "FAIR" | "LOSE" | "READY";
  status: "draft" | "pending" | "completed" | "cancelled";
  note: string | null;
  created_at: string;
  updated_at: string;
};

const statuses = ["all", "draft", "pending", "completed", "cancelled"] as const;
const statusStyle = {
  draft: "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300",
  cancelled: "bg-rose-100 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function ItemList({ items }: { items: SavedItem[] }) {
  if (!items?.length) return <span className="text-xs font-bold text-slate-400">No items</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, index) => (
        <span key={`${item.item_id ?? item.name}-${index}`} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black text-slate-600 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300">
          {item.name ?? "Item"}{item.value_type && item.value_type !== "NORMAL" ? ` · ${item.value_type}` : ""}
        </span>
      ))}
    </div>
  );
}

export default function TradeHistory() {
  const { supabase, user, loading } = useAuthSession();
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [filter, setFilter] = useState<(typeof statuses)[number]>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [schemaMissing, setSchemaMissing] = useState(false);

  const load = useCallback(async () => {
    if (!supabase || !user) return;
    const { data, error: loadError } = await supabase
      .from("trade_history")
      .select("id,user_id,value_source,your_items,their_items,your_total,their_total,verdict,status,note,created_at,updated_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (loadError) {
      setError(loadError.message);
      setSchemaMissing(/relation|schema/i.test(loadError.message));
    } else {
      setTrades((data ?? []) as TradeRow[]);
      setError(null);
    }
  }, [supabase, user]);

  useEffect(() => { void queueMicrotask(() => load()); }, [load]);

  const visible = useMemo(() => filter === "all" ? trades : trades.filter((trade) => trade.status === filter), [filter, trades]);

  async function updateStatus(id: string, status: TradeRow["status"]) {
    if (!supabase || !user) return;
    setBusyId(id);
    const { error: updateError } = await supabase.from("trade_history").update({ status }).eq("id", id).eq("user_id", user.id);
    if (updateError) setError(updateError.message);
    else setTrades((current) => current.map((trade) => trade.id === id ? { ...trade, status } : trade));
    setBusyId(null);
  }

  async function remove(id: string) {
    if (!supabase || !user) return;
    if (!window.confirm("Delete this saved trade?")) return;
    setBusyId(id);
    const { error: deleteError } = await supabase.from("trade_history").delete().eq("id", id).eq("user_id", user.id);
    if (deleteError) setError(deleteError.message);
    else setTrades((current) => current.filter((trade) => trade.id !== id));
    setBusyId(null);
  }

  if (loading) return <div className="min-h-64 animate-pulse rounded-[30px] bg-white/50 dark:bg-white/5" />;
  if (!supabase) return <p className="rounded-2xl bg-amber-50 p-5 font-bold text-amber-800 dark:bg-amber-400/10 dark:text-amber-200">Supabase is not configured.</p>;
  if (!user) return <div className="mx-auto max-w-xl"><AuthCard supabase={supabase} /></div>;

  return (
    <Surface as="section" className="p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-600 dark:text-amber-300">Saved comparisons</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">Trade history & status</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Save trades from the calculator, then track whether they are still drafts, pending, completed, or cancelled.</p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-slate-900">
          {statuses.map((status) => (
            <button key={status} type="button" onClick={() => setFilter(status)} className={`min-h-11 rounded-xl px-3 py-2 text-[10px] font-black capitalize ${filter === status ? "bg-white text-slate-900 shadow-sm dark:bg-white/10 dark:text-white" : "text-slate-400"}`}>{status}</button>
          ))}
        </div>
      </div>

      {schemaMissing && <p className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-800 dark:bg-amber-400/10 dark:text-amber-200">Run <code>src/lib/supabase/foundation.sql</code> to activate saved trade history.</p>}
      {error && !schemaMissing && <p className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}

      {!schemaMissing && visible.length === 0 ? (
        <div className="mt-6"><EmptyState icon="↔" title="No saved trades here yet" description="Use the Trade Calculator to compare an offer, then save it here to track its status." href="/calculator" actionLabel="Open calculator" /></div>
      ) : (
        <div className="mt-6 grid gap-4">
          {visible.map((trade) => (
            <article key={trade.id} className="rounded-[24px] border border-slate-200/80 bg-white/85 p-4 dark:border-white/10 dark:bg-white/[0.035] sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${trade.verdict === "WIN" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300" : trade.verdict === "LOSE" ? "bg-rose-100 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300" : "bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300"}`}>{trade.verdict}</span>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-black capitalize ${statusStyle[trade.status]}`}>{trade.status}</span>
                  <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-[10px] font-black text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-300">{trade.value_source}</span>
                </div>
                <time className="text-[10px] font-bold text-slate-400">{formatDate(trade.created_at)}</time>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
                <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900/70">
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Your offer · {Number(trade.your_total).toLocaleString("en-US", { maximumFractionDigits: 2 })}</p>
                  <ItemList items={trade.your_items ?? []} />
                </div>
                <div className="text-center text-xs font-black text-slate-300">VS</div>
                <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900/70">
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Their offer · {Number(trade.their_total).toLocaleString("en-US", { maximumFractionDigits: 2 })}</p>
                  <ItemList items={trade.their_items ?? []} />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <select value={trade.status} disabled={busyId === trade.id} onChange={(event) => void updateStatus(trade.id, event.target.value as TradeRow["status"])} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black dark:border-white/10 dark:bg-slate-900">
                  <option value="draft">Draft</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <button type="button" disabled={busyId === trade.id} onClick={() => void remove(trade.id)} className="min-h-11 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-black text-rose-600 disabled:opacity-50 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300">Delete</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </Surface>
  );
}

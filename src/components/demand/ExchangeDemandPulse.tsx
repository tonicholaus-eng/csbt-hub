"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";
import { getItemById } from "../../lib/search";

type MarketEvent = {
  event_type: string;
  item_id: string | null;
  value_source: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

type DemandRow = {
  itemId: string;
  name: string;
  wants24h: number;
  accepted7d: number;
  score: number;
};

export default function ExchangeDemandPulse() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [events, setEvents] = useState<MarketEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const client = supabase;
    let cancelled = false;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    async function load() {
      const { data } = await client
        .from("marketplace_events")
        .select("event_type,item_id,value_source,metadata,created_at")
        .in("event_type", ["LISTING_ITEM", "ACCEPTED_ITEM"])
        .gte("created_at", sevenDaysAgo)
        .order("created_at", { ascending: false })
        .limit(1500);

      if (!cancelled) {
        setEvents((data ?? []) as MarketEvent[]);
        setLoading(false);
      }
    }

    void load();

    const channel = client
      .channel("exchange-demand-pulse")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "marketplace_events" }, () => void load())
      .subscribe();

    return () => {
      cancelled = true;
      void client.removeChannel(channel);
    };
  }, [supabase]);

  const rows = useMemo(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const map = new Map<string, DemandRow>();

    for (const event of events) {
      if (!event.item_id) continue;
      const item = getItemById(event.item_id);
      const entry = map.get(event.item_id) ?? {
        itemId: event.item_id,
        name: item?.NAME ?? event.item_id,
        wants24h: 0,
        accepted7d: 0,
        score: 0,
      };

      const age = now - new Date(event.created_at).getTime();
      if (
        event.event_type === "LISTING_ITEM" &&
        event.metadata?.side === "WANT" &&
        age <= oneDay
      ) {
        entry.wants24h += Number(event.metadata?.quantity ?? 1) || 1;
      }

      if (event.event_type === "ACCEPTED_ITEM") {
        entry.accepted7d += Number(event.metadata?.quantity ?? 1) || 1;
      }

      entry.score = entry.wants24h * 3 + entry.accepted7d * 2;
      map.set(event.item_id, entry);
    }

    return Array.from(map.values())
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }, [events]);

  return (
    <section className="mx-auto mt-10 max-w-6xl rounded-[30px] border border-cyan-100 bg-white/75 p-4 shadow-[0_18px_50px_rgba(15,23,42,.08)] backdrop-blur-xl dark:border-cyan-400/10 dark:bg-slate-950/65 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">CSBT Exchange · live signal</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">What traders actually want right now</h2>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
            This pulse uses real Exchange WANT listings from the last 24 hours plus accepted-trade activity from the last 7 days. It complements—not replaces—the main demand board.
          </p>
        </div>
        <Link href="/exchange?tab=market" className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-600 px-4 text-xs font-black text-white shadow-sm">
          Open Market Intelligence
        </Link>
      </div>

      {loading ? (
        <div className="mt-5 h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />
      ) : rows.length ? (
        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row, index) => (
            <Link key={row.itemId} href={`/values/${encodeURIComponent(row.itemId)}`} className="rounded-2xl border border-slate-100 bg-white/80 p-4 transition hover:-translate-y-0.5 hover:border-cyan-300 dark:border-white/10 dark:bg-white/[0.035]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.13em] text-cyan-500">#{index + 1} Exchange demand</p>
                  <h3 className="mt-1 truncate text-sm font-black text-slate-950 dark:text-white">{row.name}</h3>
                </div>
                <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-[10px] font-black text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-200">🔥 {row.score}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-xl bg-violet-50 p-2.5 dark:bg-violet-400/[0.05]"><p className="text-lg font-black text-violet-700 dark:text-violet-300">{row.wants24h}</p><p className="text-[9px] font-black uppercase text-slate-400">Wanted · 24h</p></div>
                <div className="rounded-xl bg-emerald-50 p-2.5 dark:bg-emerald-400/[0.05]"><p className="text-lg font-black text-emerald-700 dark:text-emerald-300">{row.accepted7d}</p><p className="text-[9px] font-black uppercase text-slate-400">Accepted · 7d</p></div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-200 p-6 text-center dark:border-white/10">
          <p className="text-sm font-black text-slate-600 dark:text-slate-300">Exchange demand is collecting.</p>
          <p className="mt-1 text-xs font-semibold text-slate-400">This section fills automatically as members create and complete real Exchange trades.</p>
        </div>
      )}
    </section>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuthSession } from "../../hooks/useAuthSession";
import { getItemById } from "../../lib/search";

type MarketSnapshot = {
  listings: number | null;
  completed7d: number | null;
  topWanted: { id: string; name: string; count: number } | null;
};

export default function MarketNow({ generatedAt }: { generatedAt: string }) {
  const { supabase } = useAuthSession();
  const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(null);

  useEffect(() => {
    if (!supabase) { queueMicrotask(() => setSnapshot({ listings: null, completed7d: null, topWanted: null })); return; }
    let active = true;
    void (async () => {
      const now = Date.now();
      const sevenDaysAgo = new Date(now - 7 * 86_400_000).toISOString();
      const dayAgo = new Date(now - 86_400_000).toISOString();
      const [listingResult, completedResult, wantedResult] = await Promise.all([
        supabase.from("marketplace_listings").select("id", { count: "exact", head: true }).eq("status", "OPEN").gt("expires_at", new Date(now).toISOString()),
        supabase.from("marketplace_events").select("id", { count: "exact", head: true }).eq("event_type", "TRADE_COMPLETED").gte("created_at", sevenDaysAgo),
        supabase.from("marketplace_events").select("item_id").eq("event_type", "LISTING_ITEM").gte("created_at", dayAgo).contains("metadata", { side: "WANT" }).not("item_id", "is", null).limit(500),
      ]);
      if (!active) return;
      const wantedCounts = new Map<string, number>();
      if (!wantedResult.error) {
        for (const row of wantedResult.data ?? []) {
          if (typeof row.item_id === "string") wantedCounts.set(row.item_id, (wantedCounts.get(row.item_id) ?? 0) + 1);
        }
      }
      const top = [...wantedCounts.entries()].sort((a, b) => b[1] - a[1])[0];
      const item = top ? getItemById(top[0]) : null;
      setSnapshot({
        listings: listingResult.error ? null : listingResult.count ?? 0,
        completed7d: completedResult.error ? null : completedResult.count ?? 0,
        topWanted: top && item ? { id: item.ID, name: item.NAME, count: top[1] } : null,
      });
    })();
    return () => { active = false; };
  }, [supabase]);

  const refreshed = Number.isNaN(new Date(generatedAt).getTime())
    ? "Latest catalog"
    : new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(generatedAt));

  return (
    <section className="csbt-feature-panel p-5 sm:p-6" aria-labelledby="market-now-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--brand-primary)]">Market now</p>
          <h2 id="market-now-title" className="mt-1 text-2xl font-black text-[var(--foreground)]">What&apos;s happening on CSBT</h2>
        </div>
        <Link href="/exchange?tab=market" className="text-xs font-black text-[var(--brand-primary)] hover:underline">Open market view →</Link>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MarketStat label="Open Exchange listings" value={snapshot?.listings == null ? "Unavailable" : snapshot.listings.toLocaleString()} />
        <MarketStat label="Completed trades · 7d" value={snapshot?.completed7d == null ? "Unavailable" : snapshot.completed7d.toLocaleString()} />
        <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface-1)] p-4">
          <p className="text-xs font-bold text-[var(--foreground-muted)]">Most wanted · 24h</p>
          {snapshot?.topWanted ? <Link href={`/values/${encodeURIComponent(snapshot.topWanted.id)}`} className="mt-1 block truncate text-lg font-black text-[var(--foreground)] hover:text-[var(--brand-primary)]">{snapshot.topWanted.name}</Link> : <p className="mt-1 text-lg font-black text-[var(--foreground)]">Collecting data</p>}
        </div>
        <MarketStat label="Catalog refreshed" value={refreshed} small />
      </div>
      <p className="mt-3 text-xs font-semibold text-[var(--foreground-muted)]">Only real CSBT data is shown. Missing activity stays unavailable instead of being estimated.</p>
    </section>
  );
}

function MarketStat({ label, value, small = false }: { label: string; value: string; small?: boolean }) {
  return <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface-1)] p-4"><p className="text-xs font-bold text-[var(--foreground-muted)]">{label}</p><p className={`mt-1 font-black text-[var(--foreground)] ${small ? "text-sm leading-6" : "text-xl"}`}>{value}</p></div>;
}

"use client";

import { useEffect, useMemo, useState } from "react";
import type { ValueSource, ValueType } from "../trade/types";

type Point = { date: string; value: number };
type ResponseShape = { success: boolean; configured?: boolean; points?: Point[]; error?: string };

function formatValue(value: number, source: ValueSource) {
  if (source === "GCASH") {
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(value);
  }
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

export default function ValueHistoryCard({
  itemId,
  source,
  valueType,
}: {
  itemId: string;
  source: ValueSource;
  valueType: ValueType;
}) {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [points, setPoints] = useState<Point[]>([]);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => setLoading(true));
    queueMicrotask(() => setError(null));

    void fetch(`/api/value-history?itemId=${encodeURIComponent(itemId)}&source=${source}&type=${valueType}&days=${days}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = (await response.json()) as ResponseShape;
        if (!response.ok || !payload.success) throw new Error(payload.error ?? "Unable to load value history.");
        setPoints(payload.points ?? []);
        setConfigured(payload.configured !== false);
      })
      .catch((loadError) => {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(loadError instanceof Error ? loadError.message : "Unable to load value history.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [days, itemId, source, valueType]);

  const metrics = useMemo(() => {
    if (points.length < 2) return null;
    const first = points[0].value;
    const last = points[points.length - 1].value;
    const change = last - first;
    const percent = first === 0 ? 0 : (change / first) * 100;
    return { first, last, change, percent };
  }, [points]);

  const polyline = useMemo(() => {
    if (points.length < 2) return "";
    const values = points.map((point) => point.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    return points
      .map((point, index) => {
        const x = (index / (points.length - 1)) * 100;
        const y = 40 - ((point.value - min) / range) * 34;
        return `${x},${y}`;
      })
      .join(" ");
  }, [points]);

  return (
    <section className="mt-8 rounded-[28px] border border-slate-200/80 bg-slate-50/80 p-5 dark:border-white/10 dark:bg-white/[0.03] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-600 dark:text-amber-300">Market history</p>
          <h3 className="mt-1 text-xl font-black text-slate-950 dark:text-white">{valueType === "NORMAL" ? "Regular" : valueType === "NEON" ? "Neon" : "Mega"} value trend</h3>
          <p className="mt-1 text-xs text-slate-400">CSBT snapshots from the selected value source.</p>
        </div>
        <div className="flex rounded-xl bg-white p-1 shadow-sm dark:bg-slate-900">
          {([7, 30, 90] as const).map((option) => (
            <button key={option} type="button" onClick={() => setDays(option)} className={`rounded-lg px-3 py-2 text-xs font-black ${days === option ? "bg-amber-100 text-amber-800 dark:bg-amber-400/10 dark:text-amber-300" : "text-slate-400"}`}>{option}D</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="mt-5 h-28 animate-pulse rounded-2xl bg-slate-200/60 dark:bg-white/5" />
      ) : error ? (
        <p className="mt-5 rounded-2xl bg-rose-50 p-4 text-xs font-bold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>
      ) : points.length < 2 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-5 text-center dark:border-white/10">
          <p className="font-black text-slate-700 dark:text-slate-200">Collecting history</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            {configured
              ? "At least two daily snapshots are needed before a trend can be shown."
              : "Apply the CSBT foundation SQL and enable value snapshots to start recording history."}
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
          <div className="overflow-hidden rounded-2xl bg-white p-3 dark:bg-slate-950/60">
            <svg viewBox="0 0 100 44" role="img" aria-label={`${days} day value history`} className="h-32 w-full overflow-visible">
              <line x1="0" x2="100" y1="40" y2="40" stroke="currentColor" opacity="0.12" strokeWidth="0.5" />
              <polyline points={polyline} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" className={metrics && metrics.change < 0 ? "text-rose-500" : "text-emerald-500"} />
            </svg>
          </div>
          {metrics && (
            <div className="rounded-2xl bg-white p-4 dark:bg-slate-950/60">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Period change</p>
              <p className={`mt-2 text-3xl font-black ${metrics.change > 0 ? "text-emerald-600 dark:text-emerald-300" : metrics.change < 0 ? "text-rose-600 dark:text-rose-300" : "text-slate-600 dark:text-slate-300"}`}>
                {metrics.change > 0 ? "+" : ""}{metrics.percent.toFixed(1)}%
              </p>
              <p className="mt-2 text-xs font-bold text-slate-400">{formatValue(metrics.first, source)} → {formatValue(metrics.last, source)}</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

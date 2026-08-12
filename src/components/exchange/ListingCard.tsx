"use client";

import Image from "next/image";
import Link from "next/link";
import type { ExchangeItem, ExchangeListing, ListingMatch, TrustStats } from "../../lib/exchange/types";
import { formatTradeValue } from "../../lib/valueSystem";

function MiniItems({ items, emptyLabel }: { items: ExchangeItem[]; emptyLabel: string }) {
  if (!items.length) return <p className="text-xs font-bold text-slate-400">{emptyLabel}</p>;
  return (
    <div className="space-y-1.5">
      {items.slice(0, 3).map((item, index) => (
        <div key={`${item.item_id}-${index}`} className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 dark:bg-white/5">
            {item.image_url ? <Image src={item.image_url} alt="" width={32} height={32} unoptimized className="h-7 w-7 object-contain" /> : "📦"}
          </span>
          <span className="min-w-0 flex-1 truncate text-xs font-black text-slate-700 dark:text-slate-200">
            {item.quantity > 1 ? `${item.quantity}× ` : ""}{item.value_type !== "NORMAL" ? `${item.value_type} ` : ""}{item.item_name}
          </span>
        </div>
      ))}
      {items.length > 3 && <p className="pl-10 text-[10px] font-bold text-slate-400">+{items.length - 3} more</p>}
    </div>
  );
}

export default function ListingCard({
  listing,
  match,
  trust,
  onOffer,
}: {
  listing: ExchangeListing;
  match?: ListingMatch | null;
  trust?: TrustStats | null;
  onOffer?: (listing: ExchangeListing) => void;
}) {
  const have = listing.items.filter((item) => item.side === "HAVE");
  const want = listing.items.filter((item) => item.side === "WANT");
  const total = have.reduce((sum, item) => sum + (item.snapshot_value ?? 0) * item.quantity, 0);
  const matchClass = match && match.score >= 90
    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-300"
    : match && match.score >= 80
      ? "bg-cyan-100 text-cyan-800 dark:bg-cyan-400/10 dark:text-cyan-300"
      : "bg-amber-100 text-amber-800 dark:bg-amber-400/10 dark:text-amber-300";

  return (
    <article className="group rounded-[28px] border border-white/70 bg-white/82 p-4 shadow-[0_16px_45px_rgba(15,23,42,.08)] backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(15,23,42,.13)] dark:border-white/10 dark:bg-slate-950/72 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-black text-slate-950 dark:text-white">{listing.title || `${have[0]?.item_name ?? "Trade"} listing`}</h3>
            {match && <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${matchClass}`}>{match.score}% match</span>}
          </div>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
            {listing.display_name} • {listing.intent.replaceAll("_", " ")} • {listing.value_source}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-black text-slate-700 dark:text-slate-200">{listing.value_source === "GCASH" ? "₱" : "🦈"} {formatTradeValue(total)}</p>
          {trust && <p className="mt-1 text-[10px] font-bold text-slate-400">Trust {trust.trust_score}/100 • {trust.completed_trades} trades</p>}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3 dark:border-emerald-400/10 dark:bg-emerald-400/[0.055]">
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">They have</p>
          <MiniItems items={have} emptyLabel="Open listing" />
        </div>
        <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-3 dark:border-violet-400/10 dark:bg-violet-400/[0.055]">
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-violet-700 dark:text-violet-300">They want</p>
          <MiniItems items={want} emptyLabel={listing.intent === "OPEN_OFFERS" ? "Open to offers" : "Similar-value offers"} />
        </div>
      </div>

      {match && match.reasons.length > 0 && (
        <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-500 dark:bg-white/[0.035] dark:text-slate-400">
          ✨ {match.reasons.slice(0, 2).join(" • ")}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Link href={`/exchange/${listing.id}`} onClick={() => { if (match) void fetch("/api/exchange/event", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ eventType: "MATCH_VIEW", listingId: listing.id, itemId: have[0]?.item_id, valueSource: listing.value_source, value: match.score }) }).catch(() => undefined); }} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:border-amber-300 hover:text-amber-700 dark:border-white/10 dark:bg-white/5 dark:text-white">View Match</Link>
        {onOffer && <button type="button" onClick={() => onOffer(listing)} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-4 text-sm font-black text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg">Make Offer</button>}
      </div>
    </article>
  );
}

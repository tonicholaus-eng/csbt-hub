"use client";

import Image from "next/image";
import Link from "next/link";
import type { ExchangeItem, ExchangeListing, ListingMatch, TrustStats } from "../../lib/exchange/types";
import { formatTradeValue } from "../../lib/valueSystem";
import { Badge } from "../ui/CSBTUI";

function itemLabel(item: ExchangeItem) {
  const variant = item.value_type !== "NORMAL" ? `${item.value_type} ` : "";
  const qty = item.quantity > 1 ? `${item.quantity}× ` : "";
  return `${qty}${variant}${item.item_name}`;
}

function MiniItems({ items, emptyLabel }: { items: ExchangeItem[]; emptyLabel: string }) {
  if (!items.length) {
    return <p className="py-3 text-xs font-bold text-[var(--foreground-muted)]">{emptyLabel}</p>;
  }
  return (
    <div className="grid gap-2">
      {items.slice(0, 4).map((item, index) => (
        <div key={`${item.item_id}-${index}`} className="flex min-w-0 items-center gap-2.5 rounded-[12px] bg-[var(--surface-3)] p-2.5">
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-[var(--surface-2)] shadow-sm">
            {item.image_url ? (
              <Image src={item.image_url} alt={item.item_name} width={44} height={44} unoptimized className="h-10 w-10 object-contain transition-transform duration-200 group-hover:scale-[1.04]" />
            ) : (
              <span aria-hidden="true">📦</span>
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-black text-[var(--foreground)]">{itemLabel(item)}</span>
            <span className="mt-0.5 flex flex-wrap gap-x-2 text-[9px] font-bold uppercase tracking-[.08em] text-[var(--foreground-muted)]">
              {item.potion_status && item.potion_status !== "BASE" && <span>{item.potion_status}</span>}
              {item.demand_tier && <span>Demand {item.demand_tier}</span>}
              {item.snapshot_value != null && <span>{formatTradeValue(item.snapshot_value)}</span>}
            </span>
          </span>
        </div>
      ))}
      {items.length > 4 && <p className="px-1 text-[10px] font-bold text-[var(--foreground-muted)]">+{items.length - 4} more items</p>}
    </div>
  );
}

function isFresh(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime() < 2 * 60 * 60 * 1000;
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
  const totalHave = have.reduce((sum, item) => sum + (item.snapshot_value ?? 0) * item.quantity, 0);
  const totalWant = want.reduce((sum, item) => sum + (item.snapshot_value ?? 0) * item.quantity, 0);
  const symbol = listing.value_source === "GCASH" ? "₱" : "🦈";
  const initial = (listing.display_name || "T").trim().slice(0, 1).toUpperCase();

  return (
    <article className="csbt-card-hover group overflow-hidden rounded-[var(--radius-card)] bg-[var(--surface-2)] shadow-[var(--shadow-sm)] ring-1 ring-[var(--border)]">
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[var(--surface-selected)] text-sm font-black text-[var(--gold-dark)] ring-1 ring-[var(--border-gold)] dark:text-[var(--gold-bright)]" aria-hidden="true">{initial}</span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-black text-[var(--foreground)]">{listing.display_name}</p>
                {isFresh(listing.created_at) && <Badge tone="gold">Fresh</Badge>}
                {match && match.score >= 80 && <Badge tone="smart">{match.score}% match</Badge>}
              </div>
              <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-[.1em] text-[var(--foreground-muted)]">{listing.intent.replaceAll("_", " ")} · {listing.value_source}</p>
            </div>
          </div>
          {trust && (
            <div className="shrink-0 text-right">
              <p className="text-[10px] font-black text-[var(--foreground)]">Trust {trust.trust_score}/100 {trust.roblox_verified ? "✓" : ""}</p>
              <p className="mt-0.5 text-[9px] font-bold text-[var(--foreground-muted)]">{trust.completed_trades} completed{trust.avg_rating ? ` · ${trust.avg_rating}★` : ""}</p>
            </div>
          )}
        </div>

        <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-start">
          <div className="min-w-0 flex-1">
            <p className="mb-2 text-[9px] font-black uppercase tracking-[.16em] text-[var(--green)]">They have</p>
            <MiniItems items={have} emptyLabel="Open listing" />
          </div>
          <span className="mx-auto flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-selected)] px-2 text-sm font-black text-[var(--gold-dark)] dark:text-[var(--gold-bright)] sm:mt-10" aria-hidden="true">↔</span>
          <div className="min-w-0 flex-1">
            <p className="mb-2 text-[9px] font-black uppercase tracking-[.16em] text-[var(--purple)]">They want</p>
            <MiniItems items={want} emptyLabel={listing.intent === "OPEN_OFFERS" ? "Open to offers" : "Similar-value offers"} />
          </div>
        </div>

        {(listing.title || listing.note) && (
          <div className="mt-4 border-t border-[var(--border)] pt-3">
            {listing.title && <h3 className="text-sm font-black text-[var(--foreground)]">{listing.title}</h3>}
            {listing.note && <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-[var(--foreground-muted)]">{listing.note}</p>}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-bold text-[var(--foreground-muted)]">
            <span><b className="text-[var(--foreground)]">Have:</b> {symbol}{formatTradeValue(totalHave)}</span>
            {totalWant > 0 && <span><b className="text-[var(--foreground)]">Want:</b> {symbol}{formatTradeValue(totalWant)}</span>}
          </div>
          {match && match.reasons.length > 0 && <p className="max-w-full text-[10px] font-bold text-[var(--cyan)] sm:max-w-[54%] sm:text-right">✦ {match.reasons.slice(0, 1).join("")}</p>}
        </div>
      </div>

      <div className="flex gap-2 bg-[var(--surface-3)] p-3 sm:px-5">
        <Link
          href={`/exchange/${listing.id}`}
          onClick={() => {
            if (match) void fetch("/api/exchange/event", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ eventType: "MATCH_VIEW", listingId: listing.id, itemId: have[0]?.item_id, valueSource: listing.value_source, value: match.score }) }).catch(() => undefined);
          }}
          className="csbt-btn-secondary min-h-11 flex-1"
        >
          View Trade
        </Link>
        {onOffer && <button type="button" onClick={() => onOffer(listing)} className="csbt-btn-primary min-h-11 flex-1">Make Offer</button>}
      </div>
    </article>
  );
}

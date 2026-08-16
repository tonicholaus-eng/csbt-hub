"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useMemo, useState } from "react";
import ExchangeItemBuilder from "./ExchangeItemBuilder";
import type { ExchangeItem, ExchangeListing, ExchangeOffer, InventoryExchangeRow, OfferSuggestion } from "../../lib/exchange/types";
import { buildOfferSuggestions, getCompatibilityExplanation, sumExchangeItems } from "../../lib/exchange/matching";
import AccessibleDialog from "../ui/AccessibleDialog";

function stripSide(item: ExchangeItem): ExchangeItem {
  const { side, ...rest } = item;
  void side;
  return rest;
}

export default function OfferComposer({
  supabase,
  listing,
  inventory,
  parentOffer,
  onClose,
  onSent,
}: {
  supabase: SupabaseClient;
  listing: ExchangeListing;
  inventory: InventoryExchangeRow[];
  parentOffer?: ExchangeOffer | null;
  onClose: () => void;
  onSent: () => void;
}) {
  const listingHave = listing.items.filter((item) => item.side === "HAVE").map(stripSide);
  const parentSender = parentOffer?.items.filter((item) => item.side === "SENDER").map(stripSide) ?? [];
  const parentRecipient = parentOffer?.items.filter((item) => item.side === "RECIPIENT").map(stripSide) ?? [];
  const isCounter = Boolean(parentOffer);

  const [senderItems, setSenderItems] = useState<ExchangeItem[]>(isCounter ? parentRecipient : []);
  const [recipientItems, setRecipientItems] = useState<ExchangeItem[]>(isCounter ? parentSender : listingHave);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recipientTotal = sumExchangeItems(recipientItems);
  const suggestions = useMemo(
    () => buildOfferSuggestions(inventory, listing.value_source, recipientTotal),
    [inventory, listing.value_source, recipientTotal],
  );
  const senderTotal = sumExchangeItems(senderItems);
  const differencePercent = recipientTotal > 0 ? ((senderTotal - recipientTotal) / recipientTotal) * 100 : 0;
  const valueScore = recipientTotal > 0 ? Math.max(0, Math.round(100 - Math.abs(differencePercent))) : 70;
  const compatibilityScore = Math.max(0, Math.min(100, Math.round(valueScore * 0.75 + 20)));
  const explanation = getCompatibilityExplanation(compatibilityScore, differencePercent, false);

  function applySuggestion(suggestion: OfferSuggestion) {
    setSenderItems(suggestion.items);
  }

  async function sendOffer() {
    if (!senderItems.length || !recipientItems.length) {
      setError("Both sides of the offer need at least one item.");
      return;
    }
    setBusy(true);
    setError(null);

    const items = [
      ...senderItems.map((item) => ({ ...item, side: "SENDER" as const })),
      ...recipientItems.map((item) => ({ ...item, side: "RECIPIENT" as const })),
    ].map(({ id, ...item }) => { void id; return item; });

    const { error: offerError } = await supabase.rpc("marketplace_create_offer", {
      p_listing_id: listing.id,
      p_parent_offer_id: parentOffer?.id ?? null,
      p_value_source: listing.value_source,
      p_sender_total: senderTotal,
      p_recipient_total: recipientTotal,
      p_compatibility_score: compatibilityScore,
      p_explanation: {
        value_difference_percent: Number(differencePercent.toFixed(2)),
        summary: explanation,
      },
      p_note: note.trim().slice(0, 500) || null,
      p_items: items,
    });

    if (offerError) {
      setError(offerError.message);
      setBusy(false);
      return;
    }

    setBusy(false);
    onSent();
  }

  return (
    <AccessibleDialog open onClose={onClose} title={isCounter ? "Counteroffer" : "Make an offer"} className="max-w-6xl">
      <div className="rounded-[var(--radius-section)] border border-white/70 bg-[#fffaf0] p-4 shadow-2xl dark:border-white/10 dark:bg-[#081321] sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-500">{isCounter ? "Counteroffer" : "Make an offer"}</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{listing.title || `${listing.items.find((item) => item.side === "HAVE")?.item_name ?? "Exchange"} listing`}</h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">Trading with {isCounter && parentOffer ? "the original offer sender" : listing.display_name} • {listing.value_source}</p>
          </div>
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-xl font-black shadow-sm dark:bg-white/5">×</button>
        </div>

        {!isCounter && suggestions.length > 0 && (
          <section className="mt-5 rounded-[26px] border border-cyan-100 bg-cyan-50/70 p-4 dark:border-cyan-400/10 dark:bg-cyan-400/[0.045]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-600 dark:text-cyan-300">✨ Smart Offer Builder</p>
                <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Offers built from your saved inventory</h3>
              </div>
              <p className="text-xs font-bold text-slate-400">Target {listing.value_source === "GCASH" ? "₱" : "🦈"} {recipientTotal.toLocaleString()}</p>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {suggestions.map((suggestion) => (
                <button key={suggestion.id} type="button" onClick={() => applySuggestion(suggestion)} className="rounded-2xl border border-white bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 dark:border-white/10 dark:bg-slate-950/55">
                  <span className="text-sm font-black text-slate-950 dark:text-white">{suggestion.label}</span>
                  <span className="mt-1 block text-[10px] font-semibold leading-4 text-slate-400">{suggestion.description}</span>
                  <span className="mt-2 block text-xs font-black text-cyan-700 dark:text-cyan-300">{listing.value_source === "GCASH" ? "₱" : "🦈"} {suggestion.total.toLocaleString()} • {suggestion.differencePercent >= 0 ? "+" : ""}{suggestion.differencePercent.toFixed(1)}%</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <ExchangeItemBuilder title="Your Offer" description="What you will give." items={senderItems} source={listing.value_source} onChange={setSenderItems} />
          <ExchangeItemBuilder title="You Receive" description="What you expect in return. Edit this when negotiating a counteroffer." items={recipientItems} source={listing.value_source} onChange={setRecipientItems} />
        </div>

        <section className="mt-4 grid gap-3 rounded-[24px] border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.035] md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-xs font-black text-slate-950 dark:text-white">Compatibility: {compatibilityScore}/100</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">{explanation}</p>
          </div>
          <div className="text-left md:text-right">
            <p className="text-xs font-black text-slate-700 dark:text-slate-200">Your total: {listing.value_source === "GCASH" ? "₱" : "🦈"} {senderTotal.toLocaleString()}</p>
            <p className="text-[10px] font-bold text-slate-400">Difference {differencePercent >= 0 ? "+" : ""}{differencePercent.toFixed(1)}%</p>
          </div>
        </section>

        <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={2} maxLength={500} placeholder="Optional message: I can add, mainly LF this trade, open to counteroffers…" className="mt-4 w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm font-semibold outline-none focus:border-amber-400 dark:border-white/10 dark:bg-slate-900" />
        {error && <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="min-h-12 rounded-2xl border border-slate-200 px-5 text-sm font-black dark:border-white/10">Cancel</button>
          <button type="button" disabled={busy || !senderItems.length || !recipientItems.length} onClick={() => void sendOffer()} className="min-h-12 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-6 text-sm font-black text-white shadow-lg disabled:opacity-40">{busy ? "Sending…" : isCounter ? "Send Counteroffer" : "Send Offer"}</button>
        </div>
      </div>
    </AccessibleDialog>
  );
}

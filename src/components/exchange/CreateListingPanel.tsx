"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useState } from "react";
import ExchangeItemBuilder from "./ExchangeItemBuilder";
import type { ExchangeItem, ListingIntent } from "../../lib/exchange/types";
import type { ValueSource } from "../trade/types";
import { getItemById } from "../../lib/search";
import { getInventoryItemValue, parseTradeValue } from "../../lib/valueSystem";

const intents: Array<{ value: ListingIntent; label: string; text: string }> = [
  { value: "SPECIFIC", label: "Specific Items", text: "I know exactly what I want." },
  { value: "SIMILAR_VALUE", label: "Similar Value", text: "Offers around the same value." },
  { value: "UPGRADE", label: "Upgrade", text: "Fewer, stronger items." },
  { value: "DOWNGRADE", label: "Downgrade", text: "More good-demand items." },
  { value: "WISHLIST", label: "Wishlist", text: "Prefer items from my wishlist." },
  { value: "OPEN_OFFERS", label: "Open to Offers", text: "Show me interesting offers." },
];

export default function CreateListingPanel({
  supabase,
  onCreated,
  onCancel,
}: {
  supabase: SupabaseClient;
  onCreated: () => void;
  onCancel?: () => void;
}) {
  const [source, setSource] = useState<ValueSource>("GCASH");
  const [intent, setIntent] = useState<ListingIntent>("OPEN_OFFERS");
  const [have, setHave] = useState<ExchangeItem[]>([]);
  const [want, setWant] = useState<ExchangeItem[]>([]);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [highDemandOnly, setHighDemandOnly] = useState(false);
  const [noRandoms, setNoRandoms] = useState(true);
  const [canAdd, setCanAdd] = useState(false);
  const [allowCounteroffers, setAllowCounteroffers] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function changeSource(nextSource: ValueSource) {
    setSource(nextSource);
    const revalue = (items: ExchangeItem[]) => items.map((row) => {
      const item = getItemById(row.item_id);
      return item ? { ...row, snapshot_value: parseTradeValue(getInventoryItemValue(item, nextSource, row.value_type, row.potion_status)) } : row;
    });
    setHave(revalue(have));
    setWant(revalue(want));
  }

  async function submit() {
    if (!have.length) {
      setError("Add at least one item you are trading.");
      return;
    }
    if (intent === "SPECIFIC" && !want.length) {
      setError("Specific listings need at least one wanted item.");
      return;
    }

    setBusy(true);
    setError(null);
    const items = [
      ...have.map((row) => ({ ...row, side: "HAVE" as const })),
      ...want.map((row) => ({ ...row, side: "WANT" as const })),
    ].map(({ id, ...row }) => { void id; return row; });

    const { error: listingError } = await supabase.rpc("marketplace_create_listing", {
      p_value_source: source,
      p_intent: intent,
      p_title: title.trim().slice(0, 90) || null,
      p_note: note.trim().slice(0, 600) || null,
      p_preferences: { highDemandOnly, noRandoms, canAdd },
      p_allow_counteroffers: allowCounteroffers,
      p_items: items,
    });

    if (listingError) {
      setError(listingError.message);
      setBusy(false);
      return;
    }

    setBusy(false);
    onCreated();
  }

  return (
    <div className="rounded-[30px] border border-white/70 bg-white/90 p-5 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/90 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-500">Create listing</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">What are you trading?</h2>
          <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">Tell Exchange what you have, what you want, and how flexible you are.</p>
        </div>
        {onCancel && <button type="button" onClick={onCancel} className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-xl font-black dark:bg-white/5">×</button>}
      </div>

      <div className="mt-5 flex rounded-2xl bg-slate-100 p-1 dark:bg-white/5">
        {(["GCASH", "ELVE"] as ValueSource[]).map((value) => <button key={value} type="button" onClick={() => changeSource(value)} className={`min-h-10 flex-1 rounded-xl px-3 text-xs font-black ${source === value ? "bg-white text-slate-950 shadow-sm dark:bg-slate-800 dark:text-white" : "text-slate-400"}`}>{value === "GCASH" ? "💵 GCash" : "🦈 Elve Shark"}</button>)}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <ExchangeItemBuilder title="I Have" description="Items you are offering in this listing." items={have} source={source} onChange={setHave} />
        <ExchangeItemBuilder title="I Want" description={intent === "OPEN_OFFERS" ? "Optional when you are open to any offer." : "Items or targets you prefer."} items={want} source={source} onChange={setWant} />
      </div>

      <div className="mt-5">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">What kind of offer do you want?</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {intents.map((option) => <button type="button" key={option.value} onClick={() => setIntent(option.value)} className={`rounded-2xl border p-3 text-left transition ${intent === option.value ? "border-amber-400 bg-amber-50 dark:bg-amber-400/10" : "border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.025]"}`}><span className="block text-sm font-black text-slate-900 dark:text-white">{option.label}</span><span className="mt-1 block text-[10px] font-semibold leading-4 text-slate-400">{option.text}</span></button>)}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={90} placeholder="Listing title (optional)" className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-amber-400 dark:border-white/10 dark:bg-slate-900" />
        <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={600} placeholder="Notes: no randoms, can add, LF high demand…" className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-amber-400 dark:border-white/10 dark:bg-slate-900" />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {[
          [highDemandOnly, setHighDemandOnly, "🔥 High-demand only"],
          [noRandoms, setNoRandoms, "🚫 No randoms"],
          [canAdd, setCanAdd, "➕ I can add"],
          [allowCounteroffers, setAllowCounteroffers, "↔️ Allow counteroffers"],
        ].map(([checked, setter, label]) => <button key={String(label)} type="button" onClick={() => (setter as (value: boolean) => void)(!checked)} className={`rounded-full border px-3 py-2 text-xs font-black ${checked ? "border-amber-300 bg-amber-100 text-amber-800 dark:bg-amber-400/10 dark:text-amber-200" : "border-slate-200 bg-white text-slate-500 dark:border-white/10 dark:bg-white/5"}`}>{String(label)}</button>)}
      </div>

      {error && <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">{error}</p>}

      <div className="mt-5 flex justify-end gap-2">
        {onCancel && <button type="button" onClick={onCancel} className="min-h-12 rounded-2xl border border-slate-200 px-5 text-sm font-black dark:border-white/10">Cancel</button>}
        <button type="button" disabled={busy || !have.length} onClick={() => void submit()} className="min-h-12 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-6 text-sm font-black text-white shadow-lg disabled:opacity-40">{busy ? "Publishing…" : "Publish Listing"}</button>
      </div>
    </div>
  );
}

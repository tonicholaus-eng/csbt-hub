"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useMemo, useState } from "react";
import ExchangeItemBuilder from "./ExchangeItemBuilder";
import type { ExchangeItem, ListingIntent } from "../../lib/exchange/types";
import { getGameAdapter } from "../../games/registry";
import type { CSBTGameId, CSBTValueSource } from "../../games/types";
import { isLegacyGameSchemaError } from "../../lib/supabase/multigameCompat";

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
  gameId,
  onCreated,
  onCancel,
  initialSource,
  initialHave = [],
  initialWant = [],
}: {
  supabase: SupabaseClient;
  gameId: CSBTGameId;
  onCreated: () => void;
  onCancel?: () => void;
  initialSource?: CSBTValueSource;
  initialHave?: ExchangeItem[];
  initialWant?: ExchangeItem[];
}) {
  const adapter = getGameAdapter(gameId);
  const startingSource = initialSource && adapter.valueSources.some((entry) => entry.id === initialSource)
    ? initialSource
    : adapter.valueSources[0].id;
  const [source, setSource] = useState<CSBTValueSource>(startingSource);
  const [intent, setIntent] = useState<ListingIntent>(initialWant.length ? "SPECIFIC" : "OPEN_OFFERS");
  const [have, setHave] = useState<ExchangeItem[]>(initialHave);
  const [want, setWant] = useState<ExchangeItem[]>(initialWant);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [highDemandOnly, setHighDemandOnly] = useState(false);
  const [noRandoms, setNoRandoms] = useState(true);
  const [canAdd, setCanAdd] = useState(false);
  const [allowCounteroffers, setAllowCounteroffers] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gameLabel = useMemo(() => `${adapter.icon} ${adapter.shortName}`, [adapter]);

  function changeSource(nextSource: CSBTValueSource) {
    setSource(nextSource);
    const revalue = (items: ExchangeItem[]) => items.map((row) => {
      const item = adapter.getItem(row.item_id);
      if (!item) return row;
      const variants = adapter.getVariants(item, nextSource);
      const variant = variants.includes(row.value_type) ? row.value_type : variants[0] ?? "NORMAL";
      return { ...row, value_type: variant, snapshot_value: adapter.getValue(item, nextSource, variant) };
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

    const listingArgs = {
      p_value_source: source,
      p_intent: intent,
      p_title: title.trim().slice(0, 90) || null,
      p_note: note.trim().slice(0, 600) || null,
      p_preferences: { highDemandOnly, noRandoms, canAdd },
      p_allow_counteroffers: allowCounteroffers,
      p_items: items,
    };

    let { error: listingError } = await supabase.rpc("marketplace_create_listing", {
      p_game_id: gameId,
      ...listingArgs,
    });

    if (listingError && gameId === "adopt-me" && isLegacyGameSchemaError(listingError)) {
      const legacy = await supabase.rpc("marketplace_create_listing", listingArgs);
      listingError = legacy.error;
    }

    if (listingError) {
      setError(
        gameId === "mm2" && isLegacyGameSchemaError(listingError)
          ? "MM2 Exchange needs the included multi-game Supabase migration before MM2 listings can be created."
          : listingError.message,
      );
      setBusy(false);
      return;
    }

    setBusy(false);
    onCreated();
  }

  return (
    <div className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-elevated)] p-5 shadow-[var(--shadow-float)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--brand-primary)]">Create listing</p>
            <span className="rounded-full bg-[var(--surface-3)] px-2.5 py-1 text-[9px] font-black text-[var(--foreground-muted)]">{gameLabel}</span>
          </div>
          <h2 className="mt-1 text-2xl font-black text-[var(--foreground)]">What are you trading?</h2>
          <p className="mt-2 text-sm font-semibold text-[var(--foreground-muted)]">Same CSBT Exchange flow, powered by the {adapter.shortName} database.</p>
        </div>
        {onCancel && <button type="button" onClick={onCancel} className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-3)] text-xl font-black text-[var(--foreground)]">×</button>}
      </div>

      {adapter.valueSources.length > 1 && (
        <div className="mt-5 flex rounded-2xl bg-[var(--surface-3)] p-1">
          {adapter.valueSources.map((value) => (
            <button key={value.id} type="button" onClick={() => changeSource(value.id)} className={`min-h-10 flex-1 rounded-xl px-3 text-xs font-black ${source === value.id ? "bg-[var(--surface-2)] text-[var(--foreground)] shadow-sm" : "text-[var(--foreground-muted)]"}`}>
              {value.symbol} {value.shortLabel}
            </button>
          ))}
        </div>
      )}

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <ExchangeItemBuilder title="I Have" description="Items you are offering in this listing." items={have} gameId={gameId} source={source} onChange={setHave} />
        <ExchangeItemBuilder title="I Want" description={intent === "OPEN_OFFERS" ? "Optional when you are open to any offer." : "Items or targets you prefer."} items={want} gameId={gameId} source={source} onChange={setWant} />
      </div>

      <div className="mt-5">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--foreground-muted)]">What kind of offer do you want?</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {intents.map((option) => <button type="button" key={option.value} onClick={() => setIntent(option.value)} className={`rounded-2xl border p-3 text-left transition ${intent === option.value ? "border-[var(--brand-primary)] bg-[var(--surface-selected)]" : "border-[var(--border)] bg-[var(--surface-3)]"}`}><span className="block text-sm font-black text-[var(--foreground)]">{option.label}</span><span className="mt-1 block text-[10px] font-semibold leading-4 text-[var(--foreground-muted)]">{option.text}</span></button>)}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={90} placeholder="Listing title (optional)" className="min-h-12 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 text-sm font-bold text-[var(--foreground)] outline-none focus:border-[var(--brand-primary)]" />
        <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={600} placeholder="Notes: no randoms, can add, LF high demand…" className="min-h-12 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 text-sm font-bold text-[var(--foreground)] outline-none focus:border-[var(--brand-primary)]" />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {[
          [highDemandOnly, setHighDemandOnly, "🔥 High-demand only"],
          [noRandoms, setNoRandoms, "🚫 No randoms"],
          [canAdd, setCanAdd, "➕ I can add"],
          [allowCounteroffers, setAllowCounteroffers, "↔️ Allow counteroffers"],
        ].map(([checked, setter, label]) => <button key={String(label)} type="button" onClick={() => (setter as (value: boolean) => void)(!checked)} className={`rounded-full border px-3 py-2 text-xs font-black ${checked ? "border-[var(--brand-primary)] bg-[var(--surface-selected)] text-[var(--foreground)]" : "border-[var(--border)] bg-[var(--surface-3)] text-[var(--foreground-muted)]"}`}>{String(label)}</button>)}
      </div>

      {error && <p className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-bold text-rose-500">{error}</p>}

      <div className="mt-5 flex justify-end gap-2">
        {onCancel && <button type="button" onClick={onCancel} className="min-h-12 rounded-2xl border border-[var(--border)] px-5 text-sm font-black text-[var(--foreground)]">Cancel</button>}
        <button type="button" disabled={busy || !have.length} onClick={() => void submit()} className="min-h-12 rounded-2xl bg-[var(--primary-button)] px-6 text-sm font-black text-[var(--primary-button-text)] shadow-[var(--shadow-gold)] disabled:opacity-40">{busy ? "Publishing…" : "Publish Listing"}</button>
      </div>
    </div>
  );
}

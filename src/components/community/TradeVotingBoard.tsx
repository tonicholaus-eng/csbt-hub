"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import ItemSearchPicker from "../items/ItemSearchPicker";
import type { TradeItem, ValueSource, ValueType } from "../trade/types";
import { useAuthSession } from "../../hooks/useAuthSession";
import { getItemById } from "../../lib/search";
import { formatTradeValue, getItemValue, hasItemValue, parseTradeValue } from "../../lib/valueSystem";
import { getItemCategoryDetails } from "../../lib/itemCategory";
import { EmptyState, SectionHeader } from "../ui/CSBTUI";

type SideItem = { itemId: string; valueType: ValueType; quantity: number };
type Vote = { vote: "WIN" | "FAIR" | "LOSE"; user_id: string };
type FeedTrade = {
  id: string;
  user_id: string;
  display_name: string;
  value_source: ValueSource;
  your_items: SideItem[];
  their_items: SideItem[];
  note: string | null;
  created_at: string;
  community_trade_votes?: Vote[];
};

function totalSide(items: SideItem[], source: ValueSource) {
  return items.reduce((sum, row) => {
    const item = getItemById(row.itemId);
    if (!item) return sum;
    return sum + (parseTradeValue(getItemValue(item, source, row.valueType)) ?? 0) * Math.max(1, row.quantity || 1);
  }, 0);
}

function bestValueType(item: TradeItem, source: ValueSource, preferred: ValueType = "NORMAL"): ValueType {
  if (hasItemValue(item, source, preferred)) return preferred;
  if (hasItemValue(item, source, "NORMAL")) return "NORMAL";
  if (hasItemValue(item, source, "NEON")) return "NEON";
  if (hasItemValue(item, source, "MEGA")) return "MEGA";
  return "NORMAL";
}

export default function TradeVotingBoard() {
  const { supabase, user, loading } = useAuthSession();
  const [source, setSource] = useState<ValueSource>("GCASH");
  const [your, setYour] = useState<SideItem[]>([]);
  const [their, setTheir] = useState<SideItem[]>([]);
  const [note, setNote] = useState("");
  const [trades, setTrades] = useState<FeedTrade[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  async function reload() {
    if (!supabase) return;
    const { data, error: loadError } = await supabase
      .from("community_trades")
      .select("id,user_id,display_name,value_source,your_items,their_items,note,created_at,community_trade_votes(vote,user_id)")
      .order("created_at", { ascending: false })
      .limit(50);
    if (loadError) setError(loadError.message);
    else setTrades((data ?? []) as unknown as FeedTrade[]);
  }

  useEffect(() => {
    void reload();
    if (!supabase) return;
    const channel = supabase
      .channel("trade-voting-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "community_trades" }, () => void reload())
      .on("postgres_changes", { event: "*", schema: "public", table: "community_trade_votes" }, () => void reload())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
    // Preserve the existing realtime subscription lifecycle around the Supabase client.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  useEffect(() => {
    const normalize = (rows: SideItem[]) => rows.map((row) => {
      const item = getItemById(row.itemId);
      return item ? { ...row, valueType: bestValueType(item, source, row.valueType) } : row;
    });
    setYour(normalize);
    setTheir(normalize);
  }, [source]);

  function add(side: "your" | "their", item: TradeItem) {
    const row: SideItem = { itemId: item.ID, valueType: bestValueType(item, source), quantity: 1 };
    if (side === "your") setYour((current) => [...current, row].slice(0, 18));
    else setTheir((current) => [...current, row].slice(0, 18));
  }

  function patch(side: "your" | "their", index: number, patchValue: Partial<SideItem>) {
    const setter = side === "your" ? setYour : setTheir;
    setter((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...patchValue } : row));
  }

  function remove(side: "your" | "their", index: number) {
    const setter = side === "your" ? setYour : setTheir;
    setter((current) => current.filter((_, rowIndex) => rowIndex !== index));
  }

  async function submit() {
    if (!supabase || !user || !your.length || !their.length) return;
    setPosting(true);
    setError(null);
    const { error: postError } = await supabase.from("community_trades").insert({
      user_id: user.id,
      value_source: source,
      your_items: your,
      their_items: their,
      note: note.trim().slice(0, 300) || null,
    });
    if (postError) setError(postError.message);
    else {
      setYour([]);
      setTheir([]);
      setNote("");
      void reload();
    }
    setPosting(false);
  }

  async function vote(tradeId: string, voteValue: "WIN" | "FAIR" | "LOSE") {
    if (!supabase || !user) return;
    const { error: voteError } = await supabase.from("community_trade_votes").upsert(
      { trade_id: tradeId, user_id: user.id, vote: voteValue },
      { onConflict: "trade_id,user_id" },
    );
    if (voteError) setError(voteError.message);
    else void reload();
  }

  if (loading) {
    return <div className="h-64 animate-pulse rounded-[var(--radius-section)] bg-[var(--surface-1)]" aria-label="Loading community trades" />;
  }

  const yourTotal = totalSide(your, source);
  const theirTotal = totalSide(their, source);

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[var(--radius-section)] bg-[var(--surface-1)] shadow-[var(--shadow-sm)] ring-1 ring-[var(--border)]">
        <div className="flex flex-col gap-4 border-b border-[var(--border)] p-4 sm:flex-row sm:items-end sm:justify-between sm:p-6">
          <div>
            <p className="csbt-eyebrow">Check your trade with the community</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-[var(--foreground)]">Build both offers, then post for a vote.</h2>
          </div>
          <div className="flex w-fit rounded-[12px] bg-[var(--surface-3)] p-1" aria-label="Value source">
            {(["GCASH", "ELVE"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setSource(value)}
                aria-pressed={source === value}
                className={`min-h-11 rounded-[10px] px-4 text-xs font-black transition ${source === value ? "bg-[var(--surface-2)] text-[var(--foreground)] shadow-sm" : "text-[var(--foreground-muted)]"}`}
              >
                {value === "GCASH" ? "GCash" : "Elve"}
              </button>
            ))}
          </div>
        </div>

        {!user ? (
          <div className="p-4 sm:p-6">
            <p className="rounded-[var(--radius-control)] bg-[var(--surface-selected)] p-4 text-sm font-bold text-[var(--foreground)]">
              You can browse real community trades now. <Link href="/profile" className="font-black text-[var(--gold-dark)] underline underline-offset-4 dark:text-[var(--gold-bright)]">Sign in</Link> to post or vote.
            </p>
          </div>
        ) : (
          <div className="p-4 sm:p-6">
            <div className="relative grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
              <TradeBuilder title="Your offer" rows={your} source={source} onAdd={(item) => add("your", item)} onPatch={(index, value) => patch("your", index, value)} onRemove={(index) => remove("your", index)} />
              <div className="flex items-center justify-center py-1 lg:py-0">
                <span className="flex h-10 min-w-10 items-center justify-center rounded-full bg-[var(--surface-selected)] px-3 text-xs font-black text-[var(--gold-dark)] dark:text-[var(--gold-bright)]">VS</span>
              </div>
              <TradeBuilder title="Their offer" rows={their} source={source} onAdd={(item) => add("their", item)} onPatch={(index, value) => patch("their", index, value)} onRemove={(index) => remove("their", index)} />
            </div>

            <label className="mt-5 block">
              <span className="text-xs font-black text-[var(--foreground)]">Add context <span className="font-bold text-[var(--foreground-muted)]">(optional)</span></span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={300}
                rows={2}
                placeholder="Example: Should I accept this?"
                className="mt-2 min-h-20 w-full rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-[var(--surface-3)] p-3 text-sm outline-none transition focus:border-[var(--gold)]"
              />
            </label>

            <div className="mt-5 flex flex-col gap-3 border-t border-[var(--border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-4 text-xs font-bold text-[var(--foreground-muted)]">
                <span>Your total <strong className="ml-1 text-[var(--foreground)]">{formatTradeValue(yourTotal)}</strong></span>
                <span>Their total <strong className="ml-1 text-[var(--foreground)]">{formatTradeValue(theirTotal)}</strong></span>
                {(yourTotal > 0 || theirTotal > 0) && <span>Difference <strong className="ml-1 text-[var(--foreground)]">{formatTradeValue(Math.abs(yourTotal - theirTotal))}</strong></span>}
              </div>
              <button disabled={posting || !your.length || !their.length} onClick={() => void submit()} className="csbt-btn-primary min-h-12 disabled:opacity-40">
                {posting ? "Posting…" : "Post for Voting"}
              </button>
            </div>
          </div>
        )}
      </section>

      {error && (
        <p role="alert" className="rounded-[var(--radius-control)] bg-rose-500/10 p-4 text-xs font-bold text-[var(--rose)]">
          {error.includes("relation") ? "Run src/lib/supabase/phase-two.sql in Supabase first." : error}
        </p>
      )}

      <section>
        <SectionHeader eyebrow="Community feed" title="Recent W/F/L votes" description="See what other traders are considering and vote using the same value context they posted." />
        <div className="mt-5 space-y-4">
          {trades.length ? trades.map((trade) => (
            <TradeCard key={trade.id} trade={trade} currentUserId={user?.id ?? null} onVote={vote} />
          )) : (
            <EmptyState icon="↔" title="No community trades yet" description="Be the first trader to post an offer and ask the CSBT community for a Win, Fair, or Lose vote." />
          )}
        </div>
      </section>
    </div>
  );
}

function TradeBuilder({
  title,
  rows,
  source,
  onAdd,
  onPatch,
  onRemove,
}: {
  title: string;
  rows: SideItem[];
  source: ValueSource;
  onAdd: (item: TradeItem) => void;
  onPatch: (index: number, patch: Partial<SideItem>) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="min-w-0 rounded-[var(--radius-card)] bg-[var(--surface-3)] p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-black uppercase tracking-[.14em] text-[var(--foreground)]">{title}</h3>
        <span className="text-[10px] font-bold text-[var(--foreground-muted)]">{rows.length}/18</span>
      </div>
      <div className="mt-3"><ItemSearchPicker onSelect={onAdd} valueSource={source} placeholder={`Add to ${title.toLowerCase()}…`} /></div>
      <div className="mt-3 grid gap-2">
        {rows.map((row, index) => {
          const item = getItemById(row.itemId);
          if (!item) return null;
          const details = getItemCategoryDetails(item.CATEGORY);
          const valueTypes = (details.regularOnly ? ["NORMAL"] : ["NORMAL", "NEON", "MEGA"]).filter((type) => hasItemValue(item, source, type as ValueType)) as ValueType[];
          const safeTypes = valueTypes.length ? valueTypes : ["NORMAL" as ValueType];
          const itemValue = (parseTradeValue(getItemValue(item, source, safeTypes.includes(row.valueType) ? row.valueType : safeTypes[0])) ?? 0) * row.quantity;
          return (
            <div key={`${row.itemId}-${index}`} className="grid min-w-0 grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-2 rounded-[12px] bg-[var(--surface-2)] p-2 shadow-sm">
              <span className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-[11px] bg-[var(--surface-3)]">
                {item.IMAGE ? <Image src={item.IMAGE} alt={item.NAME} width={42} height={42} unoptimized className="h-10 w-10 object-contain" /> : <span aria-hidden="true">📦</span>}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-black text-[var(--foreground)]">{item.NAME}</span>
                <span className="mt-0.5 block truncate text-[9px] font-bold text-[var(--foreground-muted)]">{details.label} · {formatTradeValue(itemValue)}</span>
                <span className="mt-2 flex min-w-0 flex-wrap gap-1.5">
                  <select value={safeTypes.includes(row.valueType) ? row.valueType : safeTypes[0]} onChange={(event) => onPatch(index, { valueType: event.target.value as ValueType })} aria-label={`${item.NAME} variant`} className="min-h-9 rounded-[9px] border border-[var(--border)] bg-[var(--surface-3)] px-2 text-[10px] font-black">
                    {safeTypes.map((type) => <option key={type} value={type}>{type === "NORMAL" ? "Regular" : type === "NEON" ? "Neon" : "Mega"}</option>)}
                  </select>
                  <label className="flex min-h-9 items-center rounded-[9px] border border-[var(--border)] bg-[var(--surface-3)] px-2 text-[9px] font-bold text-[var(--foreground-muted)]">
                    Qty
                    <input type="number" min={1} max={99} value={row.quantity} onChange={(event) => onPatch(index, { quantity: Math.max(1, Math.min(99, Number(event.target.value) || 1)) })} aria-label={`${item.NAME} quantity`} className="ml-1 w-9 bg-transparent text-center text-[10px] font-black text-[var(--foreground)] outline-none" />
                  </label>
                </span>
              </span>
              <button type="button" onClick={() => onRemove(index)} aria-label={`Remove ${item.NAME}`} className="flex h-11 w-11 items-center justify-center rounded-[10px] text-lg font-black text-[var(--rose)] transition hover:bg-rose-500/10">×</button>
            </div>
          );
        })}
        {!rows.length && <div className="rounded-[12px] border border-dashed border-[var(--border-strong)] px-3 py-6 text-center text-xs font-bold text-[var(--foreground-muted)]">Add items to this side</div>}
      </div>
    </div>
  );
}

function TradeCard({ trade, currentUserId, onVote }: { trade: FeedTrade; currentUserId: string | null; onVote: (id: string, vote: "WIN" | "FAIR" | "LOSE") => Promise<void> }) {
  const votes = trade.community_trade_votes ?? [];
  const counts = { WIN: 0, FAIR: 0, LOSE: 0 };
  votes.forEach((value) => { counts[value.vote] += 1; });
  const total = votes.length;
  const mine = votes.find((value) => value.user_id === currentUserId)?.vote;
  const percentages = {
    WIN: total ? Math.round(counts.WIN / total * 100) : 0,
    FAIR: total ? Math.round(counts.FAIR / total * 100) : 0,
    LOSE: total ? Math.round(counts.LOSE / total * 100) : 0,
  };
  const initial = (trade.display_name || "T").trim().slice(0, 1).toUpperCase();

  return (
    <article className="rounded-[var(--radius-card)] bg-[var(--surface-2)] p-4 shadow-[var(--shadow-sm)] ring-1 ring-[var(--border)] sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface-selected)] text-sm font-black text-[var(--gold-dark)] dark:text-[var(--gold-bright)]" aria-hidden="true">{initial}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-[var(--foreground)]">{trade.display_name}</p>
            <p className="mt-0.5 text-[10px] font-bold text-[var(--foreground-muted)]">{new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(trade.created_at))} · {trade.value_source}</p>
          </div>
        </div>
        <p className="text-xs font-black text-[var(--foreground-muted)]">{total} vote{total === 1 ? "" : "s"}</p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <TradeMiniSide title="Your offer" rows={trade.your_items} />
        <span className="mx-auto flex h-8 min-w-8 items-center justify-center rounded-full bg-[var(--surface-selected)] px-2 text-[10px] font-black text-[var(--gold-dark)] dark:text-[var(--gold-bright)]">VS</span>
        <TradeMiniSide title="Their offer" rows={trade.their_items} />
      </div>

      {trade.note && <p className="mt-3 border-l-2 border-[var(--gold)] pl-3 text-xs font-medium leading-5 text-[var(--foreground-muted)]">{trade.note}</p>}

      {(mine || total > 0) && (
        <div className="mt-4" aria-label={`Community results: Win ${percentages.WIN}%, Fair ${percentages.FAIR}%, Lose ${percentages.LOSE}%`}>
          <div className="flex h-2 overflow-hidden rounded-full bg-[var(--surface-3)]">
            <span className="bg-[var(--green)] transition-[width] duration-300" style={{ width: `${percentages.WIN}%` }} />
            <span className="bg-slate-400 transition-[width] duration-300" style={{ width: `${percentages.FAIR}%` }} />
            <span className="bg-[var(--rose)] transition-[width] duration-300" style={{ width: `${percentages.LOSE}%` }} />
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2">
        {(["WIN", "FAIR", "LOSE"] as const).map((value) => {
          const label = value === "WIN" ? "Win" : value === "FAIR" ? "Fair" : "Lose";
          const dot = value === "WIN" ? "bg-[var(--green)]" : value === "FAIR" ? "bg-slate-400" : "bg-[var(--rose)]";
          return (
            <button
              key={value}
              type="button"
              disabled={!currentUserId}
              onClick={() => void onVote(trade.id, value)}
              aria-pressed={mine === value}
              className={`min-h-12 rounded-[var(--radius-control)] px-2 py-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${mine === value ? "bg-[var(--surface-selected)] ring-1 ring-[var(--border-gold)]" : "bg-[var(--surface-3)] hover:bg-[var(--surface-hover)]"}`}
            >
              <span className="inline-flex items-center gap-1.5 text-[var(--foreground)]"><span className={`h-2 w-2 rounded-full ${dot}`} />{label}</span>
              <span className="mt-0.5 block text-[9px] font-bold text-[var(--foreground-muted)]">{percentages[value]}%</span>
            </button>
          );
        })}
      </div>
    </article>
  );
}

function TradeMiniSide({ title, rows }: { title: string; rows: SideItem[] }) {
  return (
    <div className="min-w-0 rounded-[12px] bg-[var(--surface-3)] p-3">
      <p className="text-[9px] font-black uppercase tracking-[.14em] text-[var(--foreground-muted)]">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {rows.map((row, index) => {
          const item = getItemById(row.itemId);
          return item ? (
            <span key={`${row.itemId}-${index}`} className="inline-flex max-w-full items-center gap-1.5 rounded-[10px] bg-[var(--surface-2)] px-2 py-1.5 text-[10px] font-black text-[var(--foreground)] shadow-sm">
              {item.IMAGE && <Image src={item.IMAGE} alt="" width={24} height={24} unoptimized className="h-6 w-6 shrink-0 object-contain" />}
              <span className="truncate">{row.quantity > 1 ? `${row.quantity}× ` : ""}{item.NAME}{row.valueType !== "NORMAL" ? ` · ${row.valueType}` : ""}</span>
            </span>
          ) : null;
        })}
      </div>
    </div>
  );
}

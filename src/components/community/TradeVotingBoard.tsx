"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthSession } from "../../hooks/useAuthSession";
import GameItemPicker from "../games/GameItemPicker";
import { EmptyState, SectionHeader } from "../ui/CSBTUI";
import {
  buildCalculatorHref,
  getGameAdapter,
  parseGameId,
  parseGameScope,
  sourceLabel,
  sourceSymbol,
} from "../../games/registry";
import type {
  CSBTGameId,
  CSBTGameItem,
  CSBTGameScope,
  CSBTItemVariant,
  CSBTValueSource,
} from "../../games/types";
import { decodeTradeRows } from "../../lib/tradeContext";
import { isLegacyGameSchemaError } from "../../lib/supabase/multigameCompat";

type SideItem = {
  itemId: string;
  valueType: CSBTItemVariant;
  quantity: number;
};

type Vote = { vote: "WIN" | "FAIR" | "LOSE"; user_id: string };

type FeedTrade = {
  id: string;
  user_id: string;
  display_name: string;
  game_id: CSBTGameId;
  value_source: CSBTValueSource;
  your_items: SideItem[];
  their_items: SideItem[];
  note: string | null;
  created_at: string;
  community_trade_votes?: Vote[];
};

type SortMode = "LATEST" | "MOST_VOTED" | "CLOSEST";

function normalizeFeedTrade(row: FeedTrade | (Omit<FeedTrade, "game_id"> & { game_id?: CSBTGameId })): FeedTrade {
  return { ...row, game_id: row.game_id ?? "adopt-me" } as FeedTrade;
}

function decodeMM2Rows(value: string | null): SideItem[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((row) => {
      if (!row || typeof row !== "object") return [];
      const itemId = String((row as { key?: unknown }).key ?? "").trim();
      if (!itemId) return [];
      return [{
        itemId,
        valueType: "NORMAL" as const,
        quantity: Math.max(1, Math.min(99, Number((row as { quantity?: unknown }).quantity) || 1)),
      }];
    });
  } catch {
    return [];
  }
}

function rowsFromSearch(gameId: CSBTGameId, value: string | null): SideItem[] {
  if (gameId === "mm2") return decodeMM2Rows(value);
  return decodeTradeRows(value).map((row) => ({
    itemId: row.itemId,
    valueType: row.valueType,
    quantity: row.quantity,
  }));
}

function validSource(gameId: CSBTGameId, requested: string | null): CSBTValueSource {
  const adapter = getGameAdapter(gameId);
  return adapter.valueSources.find((source) => source.id === requested)?.id ?? adapter.valueSources[0].id;
}

function normalizeVariant(gameId: CSBTGameId, itemId: string, source: CSBTValueSource, preferred: CSBTItemVariant): CSBTItemVariant {
  const adapter = getGameAdapter(gameId);
  const item = adapter.getItem(itemId);
  if (!item) return "NORMAL";
  const variants = adapter.getVariants(item, source);
  return variants.includes(preferred) ? preferred : variants[0] ?? "NORMAL";
}

function totalSide(gameId: CSBTGameId, rows: SideItem[], source: CSBTValueSource) {
  const adapter = getGameAdapter(gameId);
  return rows.reduce((sum, row) => {
    const item = adapter.getItem(row.itemId);
    if (!item) return sum;
    const value = adapter.getValue(item, source, row.valueType);
    return sum + (value ?? 0) * Math.max(1, row.quantity);
  }, 0);
}

function formatNumber(value: number) {
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function tradeGapPercent(trade: FeedTrade) {
  const your = totalSide(trade.game_id, trade.your_items, trade.value_source);
  const their = totalSide(trade.game_id, trade.their_items, trade.value_source);
  const base = Math.max(your, their, 1);
  return Math.abs(their - your) / base * 100;
}

export default function TradeVotingBoard({
  fixedGameId,
  routeBasePath = "/trade-opinions",
  loungeBasePath = "/lounge",
}: {
  fixedGameId?: CSBTGameId;
  routeBasePath?: string;
  loungeBasePath?: string;
} = {}) {
  const { supabase, user, loading } = useAuthSession();
  const searchParams = useSearchParams();
  const contextApplied = useRef(false);
  const scope: CSBTGameScope = fixedGameId ?? parseGameScope(searchParams.get("game"), "all");
  const initialPostingGame = scope === "all" ? "adopt-me" : scope;
  const [postingGame, setPostingGame] = useState<CSBTGameId>(initialPostingGame);
  const [source, setSource] = useState<CSBTValueSource>(() => getGameAdapter(initialPostingGame).valueSources[0].id);
  const [your, setYour] = useState<SideItem[]>([]);
  const [their, setTheir] = useState<SideItem[]>([]);
  const [note, setNote] = useState("");
  const [trades, setTrades] = useState<FeedTrade[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [sort, setSort] = useState<SortMode>("LATEST");

  const adapter = getGameAdapter(postingGame);

  useEffect(() => {
    const nextGame = scope === "all" ? postingGame : scope;
    if (nextGame !== postingGame) {
      queueMicrotask(() => {
        setPostingGame(nextGame);
        setSource(getGameAdapter(nextGame).valueSources[0].id);
        setYour([]);
        setTheir([]);
      });
    }
  }, [postingGame, scope]);

  async function reload() {
    if (!supabase) return;
    let request = supabase
      .from("community_trades")
      .select("id,user_id,display_name,game_id,value_source,your_items,their_items,note,created_at,community_trade_votes(vote,user_id)")
      .order("created_at", { ascending: false })
      .limit(80);
    if (scope !== "all") request = request.eq("game_id", scope);
    let result = await request;

    if (result.error && (scope === "adopt-me" || scope === "all") && isLegacyGameSchemaError(result.error)) {
      result = await supabase
        .from("community_trades")
        .select("id,user_id,display_name,value_source,your_items,their_items,note,created_at,community_trade_votes(vote,user_id)")
        .order("created_at", { ascending: false })
        .limit(80) as typeof result;
    }

    if (result.error) {
      setError(scope === "mm2" && isLegacyGameSchemaError(result.error)
        ? "MM2 Trade Opinions needs the included multi-game Supabase migration before MM2 community data can load."
        : result.error.message);
    } else {
      setError(null);
      setTrades(((result.data ?? []) as unknown as FeedTrade[]).map(normalizeFeedTrade).filter((trade) => scope === "all" || trade.game_id === scope));
    }
  }

  useEffect(() => {
    void queueMicrotask(() => reload());
    if (!supabase) return;
    const channel = supabase
      .channel(`trade-opinions-${scope}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "community_trades" }, () => void reload())
      .on("postgres_changes", { event: "*", schema: "public", table: "community_trade_votes" }, () => void reload())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, supabase]);

  useEffect(() => {
    if (contextApplied.current) return;
    const contextGame = fixedGameId ?? parseGameId(searchParams.get("game"));
    const importedYour = rowsFromSearch(contextGame, searchParams.get("your"));
    const importedTheir = rowsFromSearch(contextGame, searchParams.get("their"));
    if (!importedYour.length && !importedTheir.length) return;
    contextApplied.current = true;
    const importedSource = validSource(contextGame, searchParams.get("source"));
    queueMicrotask(() => {
      setPostingGame(contextGame);
      setSource(importedSource);
      setYour(importedYour.map((row) => ({ ...row, valueType: normalizeVariant(contextGame, row.itemId, importedSource, row.valueType) })));
      setTheir(importedTheir.map((row) => ({ ...row, valueType: normalizeVariant(contextGame, row.itemId, importedSource, row.valueType) })));
      setNote("Imported from CSBT Trade Calculator.");
    });
  }, [fixedGameId, searchParams]);

  function changePostingGame(nextGame: CSBTGameId) {
    if (nextGame === postingGame) return;
    setPostingGame(nextGame);
    setSource(getGameAdapter(nextGame).valueSources[0].id);
    setYour([]);
    setTheir([]);
  }

  function changeSource(nextSource: CSBTValueSource) {
    setSource(nextSource);
    const normalizeRows = (rows: SideItem[]) => rows.map((row) => ({
      ...row,
      valueType: normalizeVariant(postingGame, row.itemId, nextSource, row.valueType),
    }));
    setYour(normalizeRows(your));
    setTheir(normalizeRows(their));
  }

  function add(side: "your" | "their", item: CSBTGameItem) {
    const variants = adapter.getVariants(item, source);
    const row: SideItem = { itemId: item.id, valueType: variants[0] ?? "NORMAL", quantity: 1 };
    const setter = side === "your" ? setYour : setTheir;
    setter((current) => {
      const existing = current.find((entry) => entry.itemId === row.itemId && entry.valueType === row.valueType);
      if (existing) return current.map((entry) => entry === existing ? { ...entry, quantity: Math.min(99, entry.quantity + 1) } : entry);
      return [...current, row].slice(0, 18);
    });
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
    const payload = {
      user_id: user.id,
      value_source: source,
      your_items: your,
      their_items: their,
      note: note.trim().slice(0, 300) || null,
    };
    let { error: postError } = await supabase.from("community_trades").insert({ ...payload, game_id: postingGame });
    if (postError && postingGame === "adopt-me" && isLegacyGameSchemaError(postError)) {
      const legacy = await supabase.from("community_trades").insert(payload);
      postError = legacy.error;
    }
    if (postError) setError(postingGame === "mm2" && isLegacyGameSchemaError(postError)
      ? "MM2 Trade Opinions needs the included multi-game Supabase migration before posting."
      : postError.message);
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

  const orderedTrades = useMemo(() => {
    const copy = [...trades];
    if (sort === "MOST_VOTED") {
      return copy.sort((a, b) => (b.community_trade_votes?.length ?? 0) - (a.community_trade_votes?.length ?? 0) || b.created_at.localeCompare(a.created_at));
    }
    if (sort === "CLOSEST") {
      return copy.sort((a, b) => tradeGapPercent(a) - tradeGapPercent(b) || b.created_at.localeCompare(a.created_at));
    }
    return copy;
  }, [sort, trades]);

  if (loading) return <div className="h-64 animate-pulse rounded-[var(--radius-section)] bg-[var(--surface-1)]" aria-label="Loading trade opinions" />;

  const yourTotal = totalSide(postingGame, your, source);
  const theirTotal = totalSide(postingGame, their, source);

  return (
    <div className="space-y-8 lg:space-y-12">
      <section className="csbt-feature-panel">
        <div className="relative flex flex-col gap-4 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-2)_72%,transparent)] p-4 sm:flex-row sm:items-end sm:justify-between sm:p-6 lg:px-9 lg:py-8">
          <div>
            <p className="csbt-eyebrow">Ask the community</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-[var(--foreground)]">Build a trade, then ask Win / Fair / Lose.</h2>
            <p className="mt-2 text-sm font-semibold text-[var(--foreground-muted)]">{adapter.shortName} uses the shared CSBT opinion system with its own item database and value source.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {scope === "all" && (
              <div className="flex rounded-[12px] bg-[var(--surface-3)] p-1" aria-label="Posting game">
                {(["adopt-me", "mm2"] as const).map((game) => (
                  <button key={game} type="button" onClick={() => changePostingGame(game)} className={`min-h-10 rounded-[10px] px-3 text-[10px] font-black ${postingGame === game ? "bg-[var(--surface-2)] text-[var(--foreground)] shadow-sm" : "text-[var(--foreground-muted)]"}`}>
                    {getGameAdapter(game).icon} {getGameAdapter(game).shortName}
                  </button>
                ))}
              </div>
            )}
            {adapter.valueSources.length > 1 && (
              <div className="flex rounded-[12px] bg-[var(--surface-3)] p-1" aria-label="Value source">
                {adapter.valueSources.map((value) => (
                  <button key={value.id} type="button" onClick={() => changeSource(value.id)} className={`min-h-10 rounded-[10px] px-3 text-[10px] font-black ${source === value.id ? "bg-[var(--surface-2)] text-[var(--foreground)] shadow-sm" : "text-[var(--foreground-muted)]"}`}>
                    {value.symbol} {value.shortLabel}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {!user ? (
          <div className="p-4 sm:p-6">
            <p className="rounded-[var(--radius-control)] bg-[var(--surface-selected)] p-4 text-sm font-bold text-[var(--foreground)]">
              You can browse community trades now. <Link href="/profile" className="font-black text-[var(--gold-dark)] underline underline-offset-4 dark:text-[var(--gold-bright)]">Sign in</Link> to post or vote.
            </p>
          </div>
        ) : (
          <div className="relative p-4 sm:p-6 lg:p-9">
            <div className="mb-4 flex items-center gap-2 text-[10px] font-black text-[var(--foreground-muted)]">
              <span className="rounded-full border border-[var(--border)] bg-[var(--surface-3)] px-3 py-1.5">{adapter.icon} {adapter.shortName}</span>
              <span className="rounded-full border border-[var(--border)] bg-[var(--surface-3)] px-3 py-1.5">{sourceLabel(source)}</span>
            </div>
            <div className="relative grid gap-5 xl:grid-cols-[1fr_auto_1fr] xl:items-stretch xl:gap-8">
              <TradeBuilder gameId={postingGame} title="Your offer" rows={your} source={source} onAdd={(item) => add("your", item)} onPatch={(index, value) => patch("your", index, value)} onRemove={(index) => remove("your", index)} />
              <div className="flex items-center justify-center py-1 xl:py-0"><span className="flex h-10 min-w-10 items-center justify-center rounded-full bg-[var(--surface-selected)] px-3 text-xs font-black text-[var(--gold-dark)] dark:text-[var(--gold-bright)]">VS</span></div>
              <TradeBuilder gameId={postingGame} title="Their offer" rows={their} source={source} onAdd={(item) => add("their", item)} onPatch={(index, value) => patch("their", index, value)} onRemove={(index) => remove("their", index)} />
            </div>

            <label className="mt-5 block lg:mt-8">
              <span className="text-xs font-black text-[var(--foreground)]">Add context <span className="font-bold text-[var(--foreground-muted)]">(optional)</span></span>
              <textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={300} rows={2} placeholder="Example: Should I accept this?" className="csbt-input-field mt-2 min-h-24 w-full rounded-[var(--radius-control)] p-4 text-sm leading-6" />
            </label>

            <div className="mt-4 flex flex-col gap-3 rounded-[var(--radius-control)] bg-[var(--surface-3)] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs font-bold text-[var(--foreground-muted)]">
                <span className="font-black text-[var(--foreground)]">{sourceSymbol(source)} {formatNumber(yourTotal)}</span> vs <span className="font-black text-[var(--foreground)]">{sourceSymbol(source)} {formatNumber(theirTotal)}</span>
              </div>
              <button type="button" disabled={posting || !your.length || !their.length} onClick={() => void submit()} className="min-h-11 rounded-[var(--radius-control)] bg-[var(--primary-button)] px-5 text-xs font-black text-[var(--primary-button-text)] disabled:opacity-40">{posting ? "Posting…" : "Ask for Opinions"}</button>
            </div>
          </div>
        )}
      </section>

      {error && <p role="alert" className="rounded-[var(--radius-control)] bg-rose-500/10 p-4 text-xs font-bold text-[var(--rose)]">{error.includes("relation") || error.includes("column") ? "Trade Opinions needs the included multi-game database migration before it can load live data." : error}</p>}

      <section>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeader eyebrow="Community feed" title="Trade Opinions" description="Real trades, one shared voting system, filtered by game when you want it." />
          <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-black text-[var(--foreground)]">
            <option value="LATEST">Latest</option>
            <option value="MOST_VOTED">Most Voted</option>
            <option value="CLOSEST">Closest Calls</option>
          </select>
        </div>
        <div className="mt-6 space-y-5 lg:mt-8 lg:space-y-6">
          {orderedTrades.length ? orderedTrades.map((trade) => <TradeCard key={trade.id} trade={trade} currentUserId={user?.id ?? null} onVote={vote} loungeBasePath={loungeBasePath} />) : <EmptyState icon="↔" title="No community trades yet" description="Be the first trader to post an offer and ask the CSBT community for a Win, Fair, or Lose vote." />}
        </div>
      </section>
    </div>
  );
}

function TradeBuilder({ gameId, title, rows, source, onAdd, onPatch, onRemove }: {
  gameId: CSBTGameId;
  title: string;
  rows: SideItem[];
  source: CSBTValueSource;
  onAdd: (item: CSBTGameItem) => void;
  onPatch: (index: number, patch: Partial<SideItem>) => void;
  onRemove: (index: number) => void;
}) {
  const adapter = getGameAdapter(gameId);
  return (
    <div className="csbt-trade-side min-w-0 p-3 sm:p-4 lg:p-6" data-side={title.toLowerCase().startsWith("your") ? "your" : "their"}>
      <div className="flex items-center justify-between gap-3"><h3 className="text-xs font-black uppercase tracking-[.14em] text-[var(--foreground)]">{title}</h3><span className="text-[10px] font-bold text-[var(--foreground-muted)]">{rows.length}/18</span></div>
      <div className="mt-3"><GameItemPicker gameId={gameId} onSelect={onAdd} placeholder={`Add ${adapter.shortName} item…`} /></div>
      <div className="mt-3 grid gap-2">
        {rows.map((row, index) => {
          const item = adapter.getItem(row.itemId);
          if (!item) return null;
          const variants = adapter.getVariants(item, source);
          const safeVariant = variants.includes(row.valueType) ? row.valueType : variants[0] ?? "NORMAL";
          const unit = adapter.getValue(item, source, safeVariant);
          return (
            <div key={`${row.itemId}-${safeVariant}-${index}`} className="csbt-list-row grid min-w-0 grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-2 rounded-[12px] p-2">
              <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-[11px] bg-[var(--surface-3)]">{item.image ? <img src={item.image} alt="" className="h-10 w-10 object-contain" /> : <span>📦</span>}</span>
              <span className="min-w-0"><span className="block truncate text-xs font-black text-[var(--foreground)]">{item.name}</span><span className="mt-0.5 block truncate text-[9px] font-bold text-[var(--foreground-muted)]">{item.category} · {unit === null ? "N/A" : `${sourceSymbol(source)} ${formatNumber(unit * row.quantity)}`}{item.demandLabel ? ` · Demand ${item.demandLabel}` : ""}</span><span className="mt-2 flex flex-wrap gap-1.5">{variants.length > 1 && <select value={safeVariant} onChange={(event) => onPatch(index, { valueType: event.target.value as CSBTItemVariant })} className="min-h-9 rounded-[9px] border border-[var(--border)] bg-[var(--surface-3)] px-2 text-[10px] font-black">{variants.map((variant) => <option key={variant} value={variant}>{variant === "NORMAL" ? "Regular" : variant === "NEON" ? "Neon" : "Mega"}</option>)}</select>}<label className="flex min-h-9 items-center rounded-[9px] border border-[var(--border)] bg-[var(--surface-3)] px-2 text-[9px] font-bold text-[var(--foreground-muted)]">Qty<input type="number" min={1} max={99} value={row.quantity} onChange={(event) => onPatch(index, { quantity: Math.max(1, Math.min(99, Number(event.target.value) || 1)) })} className="ml-1 w-9 bg-transparent text-center text-[10px] font-black text-[var(--foreground)] outline-none" /></label></span></span>
              <button type="button" onClick={() => onRemove(index)} className="flex h-11 w-11 items-center justify-center rounded-[10px] text-lg font-black text-[var(--rose)] transition hover:bg-rose-500/10">×</button>
            </div>
          );
        })}
        {!rows.length && <div className="rounded-[12px] border border-dashed border-[var(--border-strong)] bg-[color-mix(in_srgb,var(--surface-2)_42%,transparent)] px-3 py-7 text-center text-xs font-bold text-[var(--foreground-muted)] lg:py-12">Add items to this side</div>}
      </div>
    </div>
  );
}

function TradeCard({ trade, currentUserId, onVote, loungeBasePath = "/lounge" }: { trade: FeedTrade; currentUserId: string | null; onVote: (id: string, vote: "WIN" | "FAIR" | "LOSE") => Promise<void>; loungeBasePath?: string }) {
  const votes = trade.community_trade_votes ?? [];
  const counts = { WIN: 0, FAIR: 0, LOSE: 0 };
  votes.forEach((value) => { counts[value.vote] += 1; });
  const total = votes.length;
  const mine = votes.find((value) => value.user_id === currentUserId)?.vote;
  const percentages = { WIN: total ? Math.round(counts.WIN / total * 100) : 0, FAIR: total ? Math.round(counts.FAIR / total * 100) : 0, LOSE: total ? Math.round(counts.LOSE / total * 100) : 0 };
  const initial = (trade.display_name || "T").trim().slice(0, 1).toUpperCase();
  const adapter = getGameAdapter(trade.game_id);
  const yourTotal = totalSide(trade.game_id, trade.your_items, trade.value_source);
  const theirTotal = totalSide(trade.game_id, trade.their_items, trade.value_source);
  const gap = Math.abs(theirTotal - yourTotal) / Math.max(yourTotal, theirTotal, 1) * 100;
  const calculatorHref = buildCalculatorHref(trade.game_id, {
    your: trade.your_items.map((row) => ({ itemId: row.itemId, variant: row.valueType, quantity: row.quantity })),
    their: trade.their_items.map((row) => ({ itemId: row.itemId, variant: row.valueType, quantity: row.quantity })),
  }, trade.value_source);

  return (
    <article className="csbt-feed-card rounded-[var(--radius-card)] p-4 sm:p-5 lg:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface-selected)] text-sm font-black text-[var(--gold-dark)] dark:text-[var(--gold-bright)]">{initial}</span><div className="min-w-0"><p className="truncate text-sm font-black text-[var(--foreground)]">{trade.display_name}</p><p className="mt-0.5 text-[10px] font-bold text-[var(--foreground-muted)]">{new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(trade.created_at))} · {sourceLabel(trade.value_source)}</p></div></div>
        <div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-[var(--border)] bg-[var(--surface-3)] px-2.5 py-1 text-[9px] font-black text-[var(--foreground-muted)]">{adapter.icon} {adapter.shortName}</span><span className="text-xs font-black text-[var(--foreground-muted)]">{total} vote{total === 1 ? "" : "s"}</span></div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center"><TradeMiniSide gameId={trade.game_id} title="Your offer" rows={trade.your_items} /><span className="mx-auto flex h-8 min-w-8 items-center justify-center rounded-full bg-[var(--surface-selected)] px-2 text-[10px] font-black text-[var(--gold-dark)] dark:text-[var(--gold-bright)]">VS</span><TradeMiniSide gameId={trade.game_id} title="Their offer" rows={trade.their_items} /></div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[9px] font-black text-[var(--foreground-muted)]"><span>{sourceSymbol(trade.value_source)} {formatNumber(yourTotal)}</span><span>Gap {gap.toFixed(1)}%</span><span>{sourceSymbol(trade.value_source)} {formatNumber(theirTotal)}</span></div>
      {trade.note && <p className="mt-3 border-l-2 border-[var(--gold)] pl-3 text-xs font-medium leading-5 text-[var(--foreground-muted)]">{trade.note}</p>}
      {(mine || total > 0) && <div className="mt-4"><div className="flex h-2 overflow-hidden rounded-full bg-[var(--surface-3)]"><span className="bg-[var(--green)]" style={{ width: `${percentages.WIN}%` }} /><span className="bg-slate-400" style={{ width: `${percentages.FAIR}%` }} /><span className="bg-[var(--rose)]" style={{ width: `${percentages.LOSE}%` }} /></div></div>}
      <div className="mt-4 grid grid-cols-3 gap-2">{(["WIN", "FAIR", "LOSE"] as const).map((value) => { const label = value === "WIN" ? "Win" : value === "FAIR" ? "Fair" : "Lose"; const dot = value === "WIN" ? "bg-[var(--green)]" : value === "FAIR" ? "bg-slate-400" : "bg-[var(--rose)]"; return <button key={value} type="button" disabled={!currentUserId} onClick={() => void onVote(trade.id, value)} aria-pressed={mine === value} className={`min-h-12 rounded-[var(--radius-control)] px-2 py-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${mine === value ? "bg-[var(--surface-selected)] ring-1 ring-[var(--border-gold)]" : "bg-[var(--surface-3)] hover:bg-[var(--surface-hover)]"}`}><span className="inline-flex items-center gap-1.5 text-[var(--foreground)]"><span className={`h-2 w-2 rounded-full ${dot}`} />{label}</span><span className="mt-0.5 block text-[9px] font-bold text-[var(--foreground-muted)]">{percentages[value]}%</span></button>; })}</div>
      <div className="mt-3 flex flex-wrap justify-end gap-2"><Link href={`${loungeBasePath}?channel=trade-help`} className="csbt-btn-quiet min-h-10 px-3 py-2 text-xs font-black">Discuss in Lounge</Link><Link href={calculatorHref} className="csbt-btn-quiet min-h-10 px-3 py-2 text-xs font-black">Open in Calculator →</Link></div>
    </article>
  );
}

function TradeMiniSide({ gameId, title, rows }: { gameId: CSBTGameId; title: string; rows: SideItem[] }) {
  const adapter = getGameAdapter(gameId);
  return <div className="csbt-inset-panel min-w-0 p-3 lg:p-4"><p className="text-[9px] font-black uppercase tracking-[.14em] text-[var(--foreground-muted)]">{title}</p><div className="mt-2 flex flex-wrap gap-2">{rows.map((row, index) => { const item = adapter.getItem(row.itemId); return item ? <span key={`${row.itemId}-${index}`} className="inline-flex max-w-full items-center gap-1.5 rounded-[10px] bg-[var(--surface-2)] px-2 py-1.5 text-[10px] font-black text-[var(--foreground)] shadow-sm">{item.image && <img src={item.image} alt="" className="h-6 w-6 shrink-0 object-contain" />}<span className="truncate">{row.quantity > 1 ? `${row.quantity}× ` : ""}{item.name}{row.valueType !== "NORMAL" ? ` · ${row.valueType}` : ""}</span></span> : null; })}</div></div>;
}

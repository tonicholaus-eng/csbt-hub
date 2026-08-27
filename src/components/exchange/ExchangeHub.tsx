"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useAuthSession } from "../../hooks/useAuthSession";
import AuthCard from "../account/AuthCard";
import CreateListingPanel from "./CreateListingPanel";
import ListingCard from "./ListingCard";
import { EmptyState, SectionHeader } from "../ui/CSBTUI";
import AccessibleDialog from "../ui/AccessibleDialog";
import OfferComposer from "./OfferComposer";
import type {
  ExchangeListing,
  ExchangeOffer,
  MarketplacePreferences,
} from "../../lib/exchange/types";
import { rankListingMatches, sumExchangeItems } from "../../lib/exchange/matching";
import { decodeTradeRows } from "../../lib/tradeContext";
import { exchangeItemFromGameItem } from "./ExchangeItemBuilder";
import { useExchangeData, type ExchangeMarketEvent } from "../../hooks/useExchangeData";
import { getGameAdapter, parseGameId, sourceLabel, sourceSymbol } from "../../games/registry";
import type { CSBTGameId, CSBTItemVariant, CSBTValueSource } from "../../games/types";
import type { ListingMatch } from "../../lib/exchange/types";

const coreTabs = [
  ["for-you", "Find Trades"],
  ["browse", "Browse"],
  ["my-listings", "My Listings"],
  ["offers", "Offers"],
  ["rooms", "Trade Rooms"],
] as const;
const advancedTabs = [
  ["feed", "Live Feed"],
  ["market", "Market"],
  ["settings", "Trading Style"],
] as const;
const tabs = [...coreTabs, ...advancedTabs] as const;
type Tab = typeof tabs[number][0];

function ago(value: string) {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function decodeMM2TradeRows(value: string | null) {
  if (!value) return [] as Array<{ itemId: string; valueType: CSBTItemVariant; quantity: number }>;
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((row) => {
      if (!row || typeof row !== "object") return [];
      const itemId = String((row as { key?: unknown }).key ?? "").trim();
      if (!itemId) return [];
      return [{ itemId, valueType: "NORMAL" as const, quantity: Math.max(1, Math.min(99, Number((row as { quantity?: unknown }).quantity) || 1)) }];
    });
  } catch {
    return [];
  }
}

function basicMatches(listings: ExchangeListing[]): ListingMatch[] {
  return listings.map((listing) => ({
    listing,
    score: 0,
    label: "Normal Listing",
    breakdown: { inventory: 0, value: 0, wishlist: 0, demand: null, preferences: 0, freshness: 0 },
    reasons: [],
    estimatedInventoryValue: 0,
    targetValue: sumExchangeItems(listing.items.filter((item) => item.side === "HAVE")),
  }));
}

export default function ExchangeHub({
  fixedGameId,
  exchangeBasePath = "/exchange",
  tradeOpinionsHref = "/trade-opinions",
  loungeHref = "/lounge",
}: {
  fixedGameId?: CSBTGameId;
  exchangeBasePath?: string;
  tradeOpinionsHref?: string;
  loungeHref?: string;
} = {}) {
  const { supabase, user, loading: authLoading } = useAuthSession();
  const searchParams = useSearchParams();
  const gameId = fixedGameId ?? parseGameId(searchParams.get("game"));
  const adapter = getGameAdapter(gameId);
  const [tab, setTab] = useState<Tab>("for-you");
  const {
    listings, offers, ownedListings, rooms, inventory, wishlistIds, preferences, setPreferences,
    trust, events, blockedIds, loading, error, setError,
    refreshPrivate, refreshListing, refreshOffer,
  } = useExchangeData({ supabase, user, authLoading, gameId, loadMarketEvents: tab === "market" || tab === "feed" });
  const [createOpen, setCreateOpen] = useState(false);
  const [offerListing, setOfferListing] = useState<ExchangeListing | null>(null);
  const [counterOffer, setCounterOffer] = useState<ExchangeOffer | null>(null);
  const [search, setSearch] = useState("");
  const requestedSource = searchParams.get("source") as CSBTValueSource | null;
  const importedSource: CSBTValueSource = adapter.valueSources.some((entry) => entry.id === requestedSource)
    ? requestedSource!
    : adapter.valueSources[0].id;
  const importedYour = useMemo(
    () => gameId === "mm2" ? decodeMM2TradeRows(searchParams.get("your")) : decodeTradeRows(searchParams.get("your")),
    [gameId, searchParams],
  );
  const importedTheir = useMemo(
    () => gameId === "mm2" ? decodeMM2TradeRows(searchParams.get("their")) : decodeTradeRows(searchParams.get("their")),
    [gameId, searchParams],
  );
  const importedHave = useMemo(() => importedYour.flatMap((row) => {
    const item = adapter.getItem(row.itemId);
    return item ? [exchangeItemFromGameItem(gameId, item, importedSource, row.valueType as CSBTItemVariant, row.quantity)] : [];
  }), [adapter, gameId, importedSource, importedYour]);
  const importedWant = useMemo(() => importedTheir.flatMap((row) => {
    const item = adapter.getItem(row.itemId);
    return item ? [exchangeItemFromGameItem(gameId, item, importedSource, row.valueType as CSBTItemVariant, row.quantity)] : [];
  }), [adapter, gameId, importedSource, importedTheir]);
  const hasImportedTrade = importedHave.length > 0 || importedWant.length > 0;

  useEffect(() => {
    if (search.trim().length < 2) return;
    const timer = window.setTimeout(() => {
      void fetch("/api/exchange/event", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eventType: "SEARCH", metadata: { query: search.trim().slice(0, 80), game_id: gameId } }),
      }).catch(() => undefined);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [gameId, search]);

  useEffect(() => {
    const requested = searchParams.get("tab") as Tab | null;
    if (requested && tabs.some(([key]) => key === requested)) queueMicrotask(() => setTab(requested));
    if (searchParams.get("offer")) queueMicrotask(() => setTab("offers"));
    const query = searchParams.get("q");
    if (query) queueMicrotask(() => setSearch(query.slice(0, 80)));
  }, [searchParams]);

  const visibleListings = useMemo(() => listings.filter((listing) => {
    if (user && listing.user_id === user.id && tab !== "my-listings") return false;
    if (blockedIds.has(listing.user_id)) return false;
    if (!search.trim()) return true;
    const needle = search.toLowerCase();
    return listing.display_name.toLowerCase().includes(needle) || listing.items.some((item) => item.item_name.toLowerCase().includes(needle));
  }), [blockedIds, listings, search, tab, user]);

  const matches = useMemo(
    () => gameId === "adopt-me" ? rankListingMatches(visibleListings, inventory, wishlistIds, preferences) : basicMatches(visibleListings),
    [gameId, inventory, preferences, visibleListings, wishlistIds],
  );
  const incomingOffers = offers.filter((offer) => offer.recipient_id === user?.id);
  const outgoingOffers = offers.filter((offer) => offer.sender_id === user?.id);

  const topMarket = useMemo(() => {
    type MarketRow = { itemId: string; name: string; source: CSBTValueSource; available: number; wanted: number; accepted: number; acceptedValue: number; acceptedValueCount: number };
    const map = new Map<string, MarketRow>();
    for (const listing of listings) {
      for (const item of listing.items) {
        const key = `${item.item_id}:${listing.value_source}`;
        const entry = map.get(key) ?? { itemId: item.item_id, name: item.item_name, source: listing.value_source, available: 0, wanted: 0, accepted: 0, acceptedValue: 0, acceptedValueCount: 0 };
        if (item.side === "HAVE") entry.available += item.quantity;
        if (item.side === "WANT") entry.wanted += item.quantity;
        map.set(key, entry);
      }
    }
    for (const event of events) {
      if (event.event_type !== "ACCEPTED_ITEM" || !event.item_id || !event.value_source) continue;
      const key = `${event.item_id}:${event.value_source}`;
      const known = adapter.getItem(event.item_id);
      const entry = map.get(key) ?? { itemId: event.item_id, name: known?.name ?? event.item_id, source: event.value_source as CSBTValueSource, available: 0, wanted: 0, accepted: 0, acceptedValue: 0, acceptedValueCount: 0 };
      entry.accepted += Number(event.metadata?.quantity ?? 1) || 1;
      if (typeof event.value === "number" && Number.isFinite(event.value) && event.value > 0) {
        entry.acceptedValue += event.value;
        entry.acceptedValueCount += 1;
      }
      map.set(key, entry);
    }
    return Array.from(map.values()).sort((a, b) => (b.wanted + b.accepted * 3) - (a.wanted + a.accepted * 3)).slice(0, 16);
  }, [adapter, events, listings]);

  async function respondOffer(offer: ExchangeOffer, action: "ACCEPT" | "DECLINE") {
    const client = supabase;
    if (!client) return;
    const { data, error: rpcError } = await client.rpc("marketplace_respond_offer", { p_offer_id: offer.id, p_action: action });
    if (rpcError) setError(rpcError.message);
    else {
      await Promise.all([refreshOffer(offer.id), offer.listing_id ? refreshListing(offer.listing_id) : Promise.resolve()]);
      if (action === "ACCEPT" && data) window.location.href = `${exchangeBasePath}/rooms/${data}`;
    }
  }

  async function withdrawOffer(offer: ExchangeOffer) {
    const client = supabase;
    if (!client) return;
    const { error: rpcError } = await client.rpc("marketplace_withdraw_offer", { p_offer_id: offer.id });
    if (rpcError) setError(rpcError.message); else await refreshOffer(offer.id);
  }

  async function setListingStatus(listing: ExchangeListing, action: "PAUSE" | "RESUME" | "CLOSE") {
    const client = supabase;
    if (!client || !user) return;
    const { error: updateError } = await client.rpc("marketplace_set_listing_status", { p_listing_id: listing.id, p_action: action });
    if (updateError) setError(updateError.message); else await refreshListing(listing.id);
  }

  async function savePreferences(next: MarketplacePreferences) {
    const client = supabase;
    if (!client || !user) return;
    setPreferences(next);
    const { error: prefError } = await client.from("marketplace_preferences").upsert({ user_id: user.id, ...next }, { onConflict: "user_id" });
    if (prefError) setError(prefError.message);
  }

  const strongMatchCount = gameId === "adopt-me" ? matches.filter((match) => match.score >= 80).length : 0;
  const pendingIncoming = incomingOffers.filter((offer) => offer.status === "PENDING").length;
  const showContextRail = tab === "for-you" || tab === "browse" || tab === "feed";
  const displayedMatches = tab === "for-you" && gameId === "adopt-me" ? matches.filter((match) => match.score >= preferences.min_match_score).slice(0, 30) : matches;

  if (!supabase) return <SetupMessage />;

  return (
    <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_330px] xl:gap-8 2xl:grid-cols-[minmax(0,1fr)_360px]">
      <main className="min-w-0">
        <div className="mb-5 flex flex-col gap-2 lg:mb-8 lg:flex-row lg:items-start">
          <div className="csbt-tabs min-w-0 flex-1 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-1)] p-1 shadow-[var(--shadow-sm)]" role="tablist" aria-label="Main Exchange sections">
            {coreTabs.map(([key, label]) => <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className="csbt-tab">{label}</button>)}
          </div>
          <details className="relative shrink-0">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-1)] px-4 text-xs font-black shadow-[var(--shadow-sm)] marker:hidden">
              {advancedTabs.find(([key]) => key === tab)?.[1] ?? "More Exchange"} <span aria-hidden="true">⌄</span>
            </summary>
            <div className="absolute right-0 z-40 mt-2 min-w-48 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface-elevated)] p-1.5 shadow-[var(--shadow-float)]">
              {advancedTabs.map(([key, label]) => <button key={key} type="button" onClick={(event) => { setTab(key); event.currentTarget.closest("details")?.removeAttribute("open"); }} className={`block min-h-10 w-full rounded-xl px-3 text-left text-xs font-black ${tab === key ? "bg-[var(--surface-selected)] text-[var(--foreground)]" : "text-[var(--foreground-muted)] hover:bg-[var(--surface-interactive)]"}`}>{label}</button>)}
            </div>
          </details>
        </div>

        {hasImportedTrade && (
        <div className="mb-4 rounded-[var(--radius-panel)] border border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/10 p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
          <div>
            <p className="text-sm font-black text-[var(--foreground)]">Trade context imported</p>
            <p className="mt-1 text-xs font-semibold text-[var(--foreground-muted)]">
              {importedHave.length} item{importedHave.length === 1 ? "" : "s"} from your side and {importedWant.length} item{importedWant.length === 1 ? "" : "s"} from their side are ready to review. Nothing is posted automatically.
            </p>
          </div>
          {user ? (
            <button type="button" onClick={() => setCreateOpen(true)} className="mt-3 min-h-11 rounded-[var(--radius-control)] bg-[var(--gold)] px-4 text-sm font-black text-slate-950 sm:mt-0">
              Review as listing
            </button>
          ) : (
            <Link href="/profile" className="mt-3 inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-[var(--border)] px-4 text-sm font-black sm:mt-0">
              Sign in to continue
            </Link>
          )}
        </div>
      )}

      <section className="csbt-exchange-hero relative overflow-hidden rounded-[var(--radius-section)] p-5 sm:p-6 lg:p-9">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-amber-400/[0.07] blur-3xl" /><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--brand-primary)]">CSBT Exchange · {adapter.icon} {adapter.shortName}</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Find your next trade.</h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[var(--foreground-muted)]">{gameId === "adopt-me"
                ? "Discover Adopt Me listings, use inventory-aware matches, build offers and negotiate through the shared CSBT Exchange."
                : "Browse MM2 listings, build weapon offers and negotiate through the same CSBT Exchange used by Adopt Me."}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setTab("browse")} className="csbt-exchange-secondary-action min-h-12 rounded-[var(--radius-control)] px-4 text-sm font-black transition">Browse Market</button>
              {user ? <button onClick={() => setCreateOpen(true)} className="min-h-12 rounded-[var(--radius-control)] bg-[var(--gold)] px-5 text-sm font-black text-slate-950 shadow-[var(--shadow-gold)] transition hover:-translate-y-0.5">＋ Create Listing</button> : <Link href="/profile" className="csbt-btn-secondary min-h-12 px-5 py-3 text-sm font-black">Sign in to trade</Link>}
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 sm:max-w-xl lg:mt-7 lg:gap-3 lg:max-w-2xl">
            <Stat value={String(listings.length)} label="Live Listings" />
            <Stat value={gameId === "adopt-me" ? String(strongMatchCount) : String(adapter.items.length)} label={gameId === "adopt-me" ? "Strong Matches" : "Database Items"} />
            <Stat value={String(pendingIncoming)} label="Offers Waiting" />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-emerald-200/70 bg-emerald-50/70 px-4 py-3 text-[10px] font-black text-emerald-800 dark:border-emerald-400/15 dark:bg-emerald-400/[0.05] dark:text-emerald-200"><span>🛡 Keep the agreed offer inside CSBT</span><span>🔒 Check the locked Trade Room snapshot</span><Link href="/community-guidelines" className="underline underline-offset-2">Safety rules →</Link></div>
        </section>

        {error && <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">{error}</p>}
        {loading && <div className="mt-5 min-h-64 animate-pulse rounded-[28px] bg-white/60 dark:bg-white/5" />}

        {!loading && (tab === "for-you" || tab === "browse") && (
          <section className="csbt-section-panel mt-7 p-5 sm:p-6 lg:mt-10 lg:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-500">{tab === "for-you" ? (gameId === "adopt-me" ? "Personalized" : "Current Market") : "Live Exchange"}</p><h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{tab === "for-you" ? (gameId === "adopt-me" ? "Opportunities for you" : "MM2 trade opportunities") : "Browse active listings"}</h2></div>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={gameId === "mm2" ? "Search weapons, listings, or traders..." : "Search pets, items, listings, or traders..."} className="csbt-input-field min-h-12 w-full rounded-[var(--radius-control)] px-4 text-sm font-bold sm:w-[380px] lg:w-[460px]" />
            </div>
            {!user && tab === "for-you" && gameId === "adopt-me" && <p className="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm font-bold text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200">Sign in and save your inventory + wishlist to unlock personalized match scores and Smart Offer Builder.</p>}
            {!user && tab === "for-you" && gameId === "mm2" && <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200">Sign in to create MM2 listings, send weapon offers, and open secure Trade Rooms.</p>}
            <div className="mt-6 grid gap-6 2xl:grid-cols-2 2xl:gap-7">
              {displayedMatches.map((match) => <ListingCard key={match.listing.id} listing={match.listing} match={user ? match : null} trust={trust.get(match.listing.user_id)} onOffer={user ? (listing) => setOfferListing(listing) : undefined} detailBasePath={exchangeBasePath} />)}
            </div>
            {!displayedMatches.length && <Empty text={tab === "for-you" ? (gameId === "adopt-me" ? "No smart matches yet." : "No MM2 listings match yet.") : "No live listings match this search yet."} />}
          </section>
        )}

        {!loading && tab === "feed" && (
          <section className="csbt-section-panel mt-7 p-5 sm:p-6 lg:mt-10 lg:p-8">
            <SectionHeading eyebrow="Browse to learn" title="Exchange Trade Feed" />
            <p className="mt-2 text-sm font-semibold text-slate-500">A fast, scrollable view of live trades. See match scores, learn what people are asking for, and open any listing to make a similar offer.</p>
            <div className="mt-5 grid gap-5 2xl:grid-cols-2">{matches.slice(0, 40).map((match) => <div key={match.listing.id} className="snap-start"><ListingCard listing={match.listing} match={user ? match : null} trust={trust.get(match.listing.user_id)} onOffer={user ? (listing) => setOfferListing(listing) : undefined} detailBasePath={exchangeBasePath} /></div>)}</div>
          </section>
        )}

        {!loading && tab === "my-listings" && (
          <section className="csbt-section-panel mt-7 p-5 sm:p-6 lg:mt-10 lg:p-8">
            <SectionHeading eyebrow="Your activity" title="My Listings" />
            {!user ? <SignInGate supabase={supabase} /> : <div className="mt-4 grid gap-4 lg:grid-cols-2">{ownedListings.map((listing) => <div key={listing.id} className="rounded-[var(--radius-card)] bg-[var(--surface-1)] p-2 shadow-[var(--shadow-sm)]"><div className="mb-2 flex items-center justify-between gap-2 px-2"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-500 dark:bg-white/5 dark:text-slate-300">{listing.status}</span><span className="text-[10px] font-bold text-slate-400">Created {ago(listing.created_at)}</span></div><ListingCard listing={listing} trust={trust.get(listing.user_id)} detailBasePath={exchangeBasePath} /><div className="mt-2 flex gap-2">{listing.status === "OPEN" && <button onClick={() => void setListingStatus(listing, "PAUSE")} className="min-h-11 flex-1 rounded-2xl border border-amber-200 bg-amber-50 px-3 text-xs font-black text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">Pause</button>}{listing.status === "PAUSED" && <button onClick={() => void setListingStatus(listing, "RESUME")} className="min-h-11 flex-1 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-black text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200">Resume</button>}{(listing.status === "OPEN" || listing.status === "PAUSED") && <button onClick={() => void setListingStatus(listing, "CLOSE")} className="min-h-11 flex-1 rounded-2xl border border-rose-200 bg-rose-50 px-3 text-xs font-black text-rose-600 dark:border-rose-400/20 dark:bg-rose-400/10">Close</button>}</div></div>)}</div>}
            {user && !ownedListings.length && <Empty text="You have not created any Exchange listings yet." />}
          </section>
        )}

        {!loading && tab === "offers" && (
          <section className="csbt-section-panel mt-7 p-5 sm:p-6 lg:mt-10 lg:p-8">
            <SectionHeading eyebrow="Negotiation" title="Offers & Counteroffers" />
            {!user ? <SignInGate supabase={supabase} /> : <div className="mt-4 space-y-5"><OfferSection title="Incoming" offers={incomingOffers} currentUserId={user.id} onAccept={(offer) => void respondOffer(offer, "ACCEPT")} onDecline={(offer) => void respondOffer(offer, "DECLINE")} onCounter={(offer) => { setCounterOffer(offer); setOfferListing(offer.listing ?? null); }} /><OfferSection title="Sent by you" offers={outgoingOffers} currentUserId={user.id} onWithdraw={(offer) => void withdrawOffer(offer)} /></div>}
          </section>
        )}

        {!loading && tab === "rooms" && (
          <section className="csbt-section-panel mt-7 p-5 sm:p-6 lg:mt-10 lg:p-8">
            <SectionHeading eyebrow="Secure completion" title="Trade Rooms" />
            {!user ? <SignInGate supabase={supabase} /> : <div className="mt-4 grid gap-3 sm:grid-cols-2">{rooms.map((room) => <Link key={room.id} href={`${exchangeBasePath}/rooms/${room.id}`} className="rounded-[24px] border border-white/70 bg-white/80 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 dark:border-white/10 dark:bg-slate-950/65"><div className="flex items-center justify-between gap-2"><span className="text-sm font-black text-slate-950 dark:text-white">Trade #{room.id.slice(0, 8)}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black dark:bg-white/5">{room.status.replaceAll("_", " ")}</span></div><p className="mt-2 text-xs font-semibold text-slate-400">Updated {ago(room.updated_at)} • Offer locked for safety</p></Link>)}</div>}
            {user && !rooms.length && <Empty text="Accepted trades will appear here as secure trade rooms." />}
          </section>
        )}

        {!loading && tab === "market" && <MarketIntelligence gameId={gameId} topMarket={topMarket} events={events} listings={listings} />}
        {!loading && tab === "settings" && (user ? (gameId === "adopt-me" ? <PreferencesPanel value={preferences} onChange={(next) => void savePreferences(next)} /> : <GameExchangeSettings gameId={gameId} />) : <SignInGate supabase={supabase} />)}
      </main>

      {showContextRail && <aside className="h-fit space-y-4 xl:sticky xl:top-6">
        {gameId === "adopt-me" ? (
          <>
            <section className="rounded-[var(--radius-card)] border border-cyan-400/20 bg-[var(--surface-smart)] p-4 lg:p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-600 dark:text-cyan-300">Smart Match</p>
              <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Best opportunity now</h3>
              {matches[0] ? <><p className="mt-3 text-3xl font-black text-cyan-700 dark:text-cyan-300">{matches[0].score}%</p><p className="text-xs font-black text-slate-700 dark:text-slate-200">{matches[0].label}</p><p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{matches[0].reasons[0]}</p><Link href={`${exchangeBasePath}/${matches[0].listing.id}`} className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-cyan-600 text-xs font-black text-white">View Smart Match</Link></> : <p className="mt-3 text-xs font-semibold text-slate-400">Add inventory and wait for live listings to unlock matches.</p>}
            </section>
            <section className="rounded-[var(--radius-card)] border border-violet-400/20 bg-[var(--surface-nich)] p-4 lg:p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-600 dark:text-violet-300">Nich Insight</p>
              <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Ask before you offer</h3>
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">Nich remains part of the Adopt Me workflow only for now.</p>
              <Link href="/nich" className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-violet-600 text-xs font-black text-white">Ask Nich</Link>
            </section>
          </>
        ) : (
          <>
            <section className="rounded-[var(--radius-card)] border border-red-400/20 bg-red-500/[0.045] p-4 lg:p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-red-500 dark:text-red-300">MM2 Exchange</p>
              <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Shared engine, MM2 database</h3>
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{adapter.items.length.toLocaleString()} MM2 weapons are available to listing and offer builders. No Adopt Me inventory rules are applied.</p>
              <Link href="/mm2/calculator" className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-red-600 text-xs font-black text-white">Open MM2 Calculator</Link>
            </section>
            <section className="rounded-[var(--radius-card)] border border-white/10 bg-[var(--surface-1)] p-4 lg:p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Community Loop</p>
              <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Get another opinion</h3>
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">Take MM2 trades to Trade Opinions or discuss them in the Lounge.</p>
              <div className="mt-3 grid gap-2"><Link href={tradeOpinionsHref} className="inline-flex min-h-10 items-center justify-center rounded-xl bg-white/5 text-xs font-black">Trade Opinions</Link><Link href={`${loungeHref}?channel=trade-chat`} className="inline-flex min-h-10 items-center justify-center rounded-xl bg-white/5 text-xs font-black">CSBT Lounge</Link></div>
            </section>
          </>
        )}
      </aside>}

      <AccessibleDialog open={Boolean(createOpen && user)} onClose={() => setCreateOpen(false)} title="Create Exchange listing" className="max-w-6xl">
        {user ? <CreateListingPanel supabase={supabase} gameId={gameId} initialSource={hasImportedTrade ? importedSource : adapter.valueSources[0].id} initialHave={hasImportedTrade ? importedHave : []} initialWant={hasImportedTrade ? importedWant : []} onCancel={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); setTab("my-listings"); void refreshPrivate(); }} /> : null}
      </AccessibleDialog>
      {offerListing && user && <OfferComposer supabase={supabase} listing={offerListing} inventory={inventory} parentOffer={counterOffer} onClose={() => { setOfferListing(null); setCounterOffer(null); }} onSent={() => { setOfferListing(null); setCounterOffer(null); setTab("offers"); void refreshPrivate(); }} />}
    </div>
  );
}

function SetupMessage() { return <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-6 text-amber-900"><h2 className="text-xl font-black">Supabase required</h2><p className="mt-2 text-sm">Exchange is temporarily unavailable because its data service is not configured.</p></div>; }
function Empty({ text }: { text: string }) { return <div className="mt-4"><EmptyState icon="↔" title={text} description="Try browsing the live market, changing your search, or adding items to your inventory to improve matching." /></div>; }
function Stat({ value, label }: { value: string; label: string }) { return <div className="csbt-exchange-stat rounded-2xl p-3 text-center lg:p-4"><p className="text-xl font-black">{value}</p><p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-[var(--foreground-muted)]">{label}</p></div>; }
function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) { return <SectionHeader eyebrow={eyebrow} title={title} />; }
function SignInGate({ supabase }: { supabase: SupabaseClient }) { return <div className="mx-auto mt-5 max-w-xl"><AuthCard supabase={supabase} /></div>; }

function OfferSection({ title, offers, currentUserId, onAccept, onDecline, onCounter, onWithdraw }: { title: string; offers: ExchangeOffer[]; currentUserId: string; onAccept?: (offer: ExchangeOffer) => void; onDecline?: (offer: ExchangeOffer) => void; onCounter?: (offer: ExchangeOffer) => void; onWithdraw?: (offer: ExchangeOffer) => void }) {
  return <div><h3 className="text-sm font-black text-slate-700 dark:text-slate-200">{title} ({offers.length})</h3><div className="mt-2 space-y-3">{offers.map((offer) => <article key={offer.id} className="rounded-[24px] border border-white/70 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/65"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-black text-slate-950 dark:text-white">{offer.listing?.title || offer.listing?.items.find((item) => item.side === "HAVE")?.item_name || "Exchange offer"}</p><p className="mt-1 text-[10px] font-bold text-slate-400">{offer.status} • {ago(offer.created_at)} • {offer.compatibility_score ?? "—"}% compatibility</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black dark:bg-white/5">{offer.value_source}</span></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-400/[0.05]"><p className="font-black text-emerald-700">Sender gives</p><p className="mt-1 text-lg font-black">{sourceSymbol(offer.value_source)}{Number(offer.sender_total).toLocaleString()}</p></div><div className="rounded-xl bg-violet-50 p-3 dark:bg-violet-400/[0.05]"><p className="font-black text-violet-700">Recipient gives</p><p className="mt-1 text-lg font-black">{sourceSymbol(offer.value_source)}{Number(offer.recipient_total).toLocaleString()}</p></div></div>{offer.note && <p className="mt-3 text-xs font-semibold text-slate-500">“{offer.note}”</p>}<div className="mt-3 flex flex-wrap gap-2">{offer.recipient_id === currentUserId && offer.status === "PENDING" && <><button onClick={() => onAccept?.(offer)} className="min-h-11 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-black text-white">Accept</button>{offer.listing?.allow_counteroffers !== false && <button onClick={() => onCounter?.(offer)} className="min-h-11 rounded-xl bg-amber-400 px-4 py-2 text-xs font-black text-white">Counter</button>}<button onClick={() => onDecline?.(offer)} className="min-h-11 rounded-xl bg-rose-100 px-4 py-2 text-xs font-black text-rose-600">Decline</button></>}{offer.sender_id === currentUserId && offer.status === "PENDING" && <button onClick={() => onWithdraw?.(offer)} className="min-h-11 rounded-xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-600 dark:bg-white/5">Withdraw</button>}</div></article>)}{!offers.length && <Empty text="No offers in this section yet." />}</div></div>;
}

function PreferencesPanel({ value, onChange }: { value: MarketplacePreferences; onChange: (next: MarketplacePreferences) => void }) {
  const toggles: Array<[keyof MarketplacePreferences, string, string]> = [
    ["prefer_upgrades", "Prefer upgrades", "Fewer stronger items"], ["prefer_downgrades", "Prefer downgrades", "Multiple good items"], ["prefer_high_demand", "High demand", "Prioritize liquid items"], ["prefer_overpays", "Overpays", "Boost overpay matches"], ["avoid_randoms", "Avoid randoms", "Reduce mixed low-value bundles"], ["avoid_hard_to_trade", "Avoid hard-to-trade", "Prefer easier liquidity"], ["accepts_pets", "Accept pets", "Pets in recommendations"], ["accepts_petwear", "Accept pet wear", "Pet wear in recommendations"], ["accepts_vehicles", "Accept vehicles", "Vehicles in recommendations"], ["accepts_food", "Accept food", "Food in recommendations"], ["accepts_gifts", "Accept gifts", "Gifts in recommendations"], ["accepts_strollers", "Accept strollers", "Strollers in recommendations"], ["accepts_toys", "Accept toys", "Toys in recommendations"], ["accepts_stickers", "Accept stickers", "Stickers in recommendations"], ["accepts_other", "Accept other", "Other categories"],
  ];
  return <section className="mt-5"><SectionHeading eyebrow="Personalization" title="My Trading Style" /><p className="mt-2 text-sm font-semibold text-slate-500">These preferences change your Smart Match score instead of hiding the whole market.</p><div className="mt-4 rounded-[24px] border border-cyan-100 bg-cyan-50/70 p-4 dark:border-cyan-400/10 dark:bg-cyan-400/[0.04]"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-600 dark:text-cyan-300">Preferred matching value source</p><div className="mt-3 grid grid-cols-2 gap-2">{(["GCASH","ELVE"] as const).map((source) => <button key={source} onClick={() => onChange({ ...value, value_source: source })} className={`min-h-11 rounded-2xl border px-4 text-xs font-black ${value.value_source === source ? "border-cyan-300 bg-white text-cyan-700 shadow-sm dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200" : "border-white/80 bg-white/45 text-slate-400 dark:border-white/10 dark:bg-white/[0.025]"}`}>{source === "GCASH" ? "💵 GCash" : "🦈 Elve Shark"}</button>)}</div></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{toggles.map(([key, label, text]) => <button key={String(key)} onClick={() => onChange({ ...value, [key]: !value[key] })} className={`rounded-2xl border p-4 text-left ${value[key] ? "border-amber-300 bg-amber-50 dark:bg-amber-400/10" : "border-slate-200 bg-white/70 dark:border-white/10 dark:bg-white/[0.03]"}`}><span className="text-sm font-black text-slate-950 dark:text-white">{value[key] ? "✓ " : ""}{label}</span><span className="mt-1 block text-[10px] font-semibold text-slate-400">{text}</span></button>)}</div><div className="mt-4 rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.03]"><label className="text-xs font-black">Minimum For You score: {value.min_match_score}%</label><input type="range" min={0} max={95} step={5} value={value.min_match_score} onChange={(event) => onChange({ ...value, min_match_score: Number(event.target.value) })} className="mt-3 w-full" /></div></section>;
}

function GameExchangeSettings({ gameId }: { gameId: "adopt-me" | "mm2" }) {
  const adapter = getGameAdapter(gameId);
  return <section className="mt-5"><SectionHeading eyebrow="Game rules" title={`${adapter.shortName} Exchange Settings`} /><div className="mt-4 rounded-[24px] border border-[var(--border)] bg-[var(--surface-1)] p-5"><p className="text-sm font-black text-[var(--foreground)]">{adapter.icon} Shared CSBT Exchange, game-specific catalog</p><p className="mt-2 text-xs font-semibold leading-5 text-[var(--foreground-muted)]">{gameId === "mm2" ? "MM2 uses Supreme values and weapon demand. Adopt Me inventory matching, pet variants and Nich are intentionally not applied to MM2." : adapter.description}</p><div className="mt-4 flex flex-wrap gap-2">{adapter.valueSources.map((source) => <span key={source.id} className="rounded-full border border-[var(--border)] bg-[var(--surface-3)] px-3 py-2 text-[10px] font-black text-[var(--foreground-muted)]">{source.symbol} {source.label}</span>)}</div></div></section>;
}

function MarketIntelligence({ gameId, topMarket, events, listings }: { gameId: "adopt-me" | "mm2"; topMarket: Array<{ itemId: string; name: string; source: CSBTValueSource; available: number; wanted: number; accepted: number; acceptedValue: number; acceptedValueCount: number }>; events: ExchangeMarketEvent[]; listings: ExchangeListing[] }) {
  const marketAdapter = getGameAdapter(gameId);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const accepted = events.filter((event) => event.event_type === "OFFER_ACCEPTED").length;
  const completed = events.filter((event) => event.event_type === "TRADE_COMPLETED").length;
  const since = now - 24 * 60 * 60 * 1000;
  const recent = events.filter((event) => new Date(event.created_at).getTime() >= since);
  const views24h = recent.filter((event) => event.event_type === "LISTING_VIEW").length;
  const searches24h = recent.filter((event) => event.event_type === "SEARCH").length;
  const offers24h = recent.filter((event) => event.event_type === "OFFER_CREATED").length;
  const queryCounts = new Map<string, number>();
  for (const event of recent) {
    if (event.event_type !== "SEARCH") continue;
    const query = typeof event.metadata?.query === "string" ? event.metadata.query.trim().toLowerCase() : "";
    if (query.length < 2) continue;
    queryCounts.set(query, (queryCounts.get(query) ?? 0) + 1);
  }
  const topQueries = Array.from(queryCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);

  return <section className="mt-5"><SectionHeading eyebrow="CSBT-owned market data" title="Market Intelligence" /><p className="mt-2 max-w-3xl text-sm font-semibold text-slate-500">Exchange turns listings, searches, views, offers, and completed trades into CSBT-owned market signals. As activity grows, this becomes a real picture of supply, demand, velocity, and accepted values instead of relying only on external value lists.</p><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6"><Metric value={String(listings.length)} label="Open listings" /><Metric value={String(accepted)} label="Accepted offers" /><Metric value={String(completed)} label="Completed rooms" /><Metric value={String(views24h)} label="Views · 24h" /><Metric value={String(searches24h)} label="Searches · 24h" /><Metric value={String(offers24h)} label="Offers · 24h" /></div>{topQueries.length > 0 && <div className="mt-4 rounded-[24px] border border-violet-100 bg-violet-50/70 p-4 dark:border-violet-400/10 dark:bg-violet-400/[0.04]"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-600 dark:text-violet-300">What traders are searching now</p><div className="mt-3 flex flex-wrap gap-2">{topQueries.map(([query,count]) => <span key={query} className="rounded-full border border-violet-100 bg-white px-3 py-1.5 text-[10px] font-black text-violet-700 dark:border-violet-400/10 dark:bg-white/5 dark:text-violet-200">{query} <span className="opacity-50">×{count}</span></span>)}</div></div>}<div className="mt-5 overflow-x-auto rounded-[26px] border border-white/70 bg-white/80 dark:border-white/10 dark:bg-slate-950/65"><div className="min-w-[650px]"><div className="grid grid-cols-[minmax(160px,1fr)_70px_70px_70px_70px_110px] border-b border-slate-200 px-4 py-3 text-[9px] font-black uppercase tracking-[0.1em] text-slate-400 dark:border-white/10"><span>Item</span><span>Source</span><span>Supply</span><span>Wanted</span><span>Done</span><span>CSBT Market</span></div>{topMarket.map((row) => <Link href={marketAdapter.itemProfileHref(marketAdapter.getItem(row.itemId) ?? marketAdapter.items[0])} key={`${row.itemId}-${row.source}`} className="grid grid-cols-[minmax(160px,1fr)_70px_70px_70px_70px_110px] items-center border-b border-slate-100 px-4 py-3 text-xs last:border-0 dark:border-white/5"><span className="truncate font-black text-slate-800 dark:text-white">{row.name}</span><span className="font-black text-slate-500">{sourceLabel(row.source)}</span><span className="font-bold text-slate-500">{row.available}</span><span className="font-bold text-violet-600">{row.wanted}</span><span className="font-black text-emerald-600">{row.accepted}</span><span className="font-black text-cyan-600">{row.acceptedValueCount ? `${sourceSymbol(row.source)}${(row.acceptedValue / row.acceptedValueCount).toLocaleString(undefined,{maximumFractionDigits:2})}` : "Collecting"}</span></Link>)}</div></div></section>;
}
function Metric({ value, label }: { value: string; label: string }) { return <div className="rounded-2xl border border-white/70 bg-white/80 p-4 text-center dark:border-white/10 dark:bg-white/[0.035]"><p className="text-2xl font-black text-slate-950 dark:text-white">{value}</p><p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</p></div>; }

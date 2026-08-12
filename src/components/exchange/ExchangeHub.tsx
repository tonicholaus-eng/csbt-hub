"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useAuthSession } from "../../hooks/useAuthSession";
import AuthCard from "../account/AuthCard";
import CreateListingPanel from "./CreateListingPanel";
import ListingCard from "./ListingCard";
import OfferComposer from "./OfferComposer";
import type {
  ExchangeListing,
  ExchangeOffer,
  InventoryExchangeRow,
  MarketplacePreferences,
  TrustStats,
} from "../../lib/exchange/types";
import { DEFAULT_MARKETPLACE_PREFERENCES, rankListingMatches } from "../../lib/exchange/matching";
import { getItemById } from "../../lib/search";

const tabs = [
  ["for-you", "✨ For You"],
  ["browse", "🔎 Browse"],
  ["feed", "🔥 Feed"],
  ["my-listings", "📦 My Listings"],
  ["offers", "🤝 Offers"],
  ["rooms", "🔒 Trade Rooms"],
  ["market", "📊 Market"],
  ["settings", "⚙️ Style"],
] as const;
type Tab = typeof tabs[number][0];

type DbListing = Omit<ExchangeListing, "items"> & { marketplace_listing_items?: ExchangeListing["items"] };
type DbOffer = Omit<ExchangeOffer, "items" | "listing"> & {
  marketplace_offer_items?: ExchangeOffer["items"];
  marketplace_listings?: DbListing | null;
};

type RoomRow = {
  id: string;
  listing_id: string | null;
  accepted_offer_id: string | null;
  user_a: string;
  user_b: string;
  status: string;
  lock_snapshot: Record<string, unknown>;
  completed_by_a: boolean;
  completed_by_b: boolean;
  created_at: string;
  updated_at: string;
};

type MarketEvent = {
  id: number;
  event_type: string;
  listing_id: string | null;
  offer_id: string | null;
  room_id: string | null;
  item_id: string | null;
  value_source: string | null;
  value: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

function normalizeListing(row: DbListing): ExchangeListing {
  return {
    ...row,
    items: (row.marketplace_listing_items ?? []).map((item) => ({ ...item })),
  };
}

function normalizeOffer(row: DbOffer): ExchangeOffer {
  return {
    ...row,
    items: (row.marketplace_offer_items ?? []).map((item) => ({ ...item })),
    listing: row.marketplace_listings ? normalizeListing(row.marketplace_listings) : null,
  };
}

function ago(value: string) {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function ExchangeHub() {
  const { supabase, user, loading: authLoading } = useAuthSession();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>("for-you");
  const [listings, setListings] = useState<ExchangeListing[]>([]);
  const [offers, setOffers] = useState<ExchangeOffer[]>([]);
  const [ownedListings, setOwnedListings] = useState<ExchangeListing[]>([]);
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [inventory, setInventory] = useState<InventoryExchangeRow[]>([]);
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [preferences, setPreferences] = useState<MarketplacePreferences>(DEFAULT_MARKETPLACE_PREFERENCES);
  const [trust, setTrust] = useState<Map<string, TrustStats>>(new Map());
  const [events, setEvents] = useState<MarketEvent[]>([]);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [offerListing, setOfferListing] = useState<ExchangeListing | null>(null);
  const [counterOffer, setCounterOffer] = useState<ExchangeOffer | null>(null);
  const [search, setSearch] = useState("");
  const [isMiddleman, setIsMiddleman] = useState(false);
  const [isExchangeStaff, setIsExchangeStaff] = useState(false);

  const loadPublic = useCallback(async (client: SupabaseClient) => {
    const [{ data: listingRows, error: listingError }, { data: marketRows }] = await Promise.all([
      client
        .from("marketplace_listings")
        .select("*,marketplace_listing_items(*)")
        .eq("status", "OPEN")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(120),
      client
        .from("marketplace_events")
        .select("id,event_type,listing_id,offer_id,room_id,item_id,value_source,value,metadata,created_at")
        .order("created_at", { ascending: false })
        .limit(600),
    ]);
    if (listingError) throw listingError;
    const normalized = ((listingRows ?? []) as DbListing[]).map(normalizeListing);
    setListings(normalized);
    setEvents((marketRows ?? []) as MarketEvent[]);

    const owners = Array.from(new Set(normalized.map((row) => row.user_id)));
    if (owners.length) {
      const { data: trustRows } = await client.from("marketplace_user_stats").select("*").in("user_id", owners);
      setTrust(new Map(((trustRows ?? []) as TrustStats[]).map((row) => [row.user_id, row])));
    }
  }, []);

  const loadPrivate = useCallback(async (client: SupabaseClient, userId: string) => {
    const [inventoryResult, wishlistResult, preferencesResult, offerResult, roomResult, blockResult, middlemanResult, staffResult, ownedListingResult] = await Promise.all([
      client.from("inventory_items").select("id,item_id,item_name,image_url,category,value_type,potion_status,quantity").eq("user_id", userId),
      client.from("wishlist_items").select("item_id").eq("user_id", userId),
      client.from("marketplace_preferences").select("*").eq("user_id", userId).maybeSingle(),
      client.from("marketplace_offers").select("*,marketplace_offer_items(*),marketplace_listings(*,marketplace_listing_items(*))").order("created_at", { ascending: false }).limit(100),
      client.from("trade_rooms").select("id,listing_id,accepted_offer_id,user_a,user_b,status,lock_snapshot,completed_by_a,completed_by_b,created_at,updated_at").order("updated_at", { ascending: false }).limit(100),
      client.from("user_blocks").select("blocked_id").eq("blocker_id", userId),
      client.from("middleman_roster").select("user_id").eq("user_id", userId).maybeSingle(),
      client.from("exchange_staff").select("user_id").eq("user_id", userId).maybeSingle(),
      client.from("marketplace_listings").select("*,marketplace_listing_items(*)").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
    ]);

    setInventory((inventoryResult.data ?? []) as InventoryExchangeRow[]);
    setWishlistIds(new Set((wishlistResult.data ?? []).map((row) => String(row.item_id))));
    if (preferencesResult.data) {
      setPreferences({ ...DEFAULT_MARKETPLACE_PREFERENCES, ...(preferencesResult.data as MarketplacePreferences) });
    }
    setOffers(((offerResult.data ?? []) as DbOffer[]).map(normalizeOffer));
    setOwnedListings(((ownedListingResult.data ?? []) as DbListing[]).map(normalizeListing));
    setRooms((roomResult.data ?? []) as RoomRow[]);
    setBlockedIds(new Set((blockResult.data ?? []).map((row) => String(row.blocked_id))));
    setIsMiddleman(Boolean(middlemanResult.data));
    setIsExchangeStaff(Boolean(staffResult.data));
  }, []);

  const reload = useCallback(async () => {
    const client = supabase;
    if (!client) return;
    setLoading(true);
    setError(null);
    try {
      await loadPublic(client);
      if (user) await loadPrivate(client, user.id);
      else {
        setInventory([]); setWishlistIds(new Set()); setOffers([]); setOwnedListings([]); setRooms([]); setBlockedIds(new Set()); setIsMiddleman(false); setIsExchangeStaff(false);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load CSBT Exchange.");
    } finally {
      setLoading(false);
    }
  }, [loadPrivate, loadPublic, supabase, user]);

  useEffect(() => { if (!authLoading) void reload(); }, [authLoading, reload]);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const channel = client
      .channel("csbt-exchange-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "marketplace_listings" }, () => void reload())
      .on("postgres_changes", { event: "*", schema: "public", table: "marketplace_offers" }, () => void reload())
      .on("postgres_changes", { event: "*", schema: "public", table: "trade_rooms" }, () => void reload())
      .subscribe();
    return () => { void client.removeChannel(channel); };
  }, [reload, supabase]);

  useEffect(() => {
    if (search.trim().length < 2) return;
    const timer = window.setTimeout(() => {
      void fetch("/api/exchange/event", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eventType: "SEARCH", metadata: { query: search.trim().slice(0, 80) } }),
      }).catch(() => undefined);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const requested = searchParams.get("tab") as Tab | null;
    if (requested && tabs.some(([key]) => key === requested)) setTab(requested);
    if (searchParams.get("offer")) setTab("offers");
  }, [searchParams]);

  const visibleListings = useMemo(() => listings.filter((listing) => {
    if (user && listing.user_id === user.id && tab !== "my-listings") return false;
    if (blockedIds.has(listing.user_id)) return false;
    if (!search.trim()) return true;
    const needle = search.toLowerCase();
    return listing.display_name.toLowerCase().includes(needle) || listing.items.some((item) => item.item_name.toLowerCase().includes(needle));
  }), [blockedIds, listings, search, tab, user]);

  const matches = useMemo(() => rankListingMatches(visibleListings, inventory, wishlistIds, preferences), [inventory, preferences, visibleListings, wishlistIds]);
  const incomingOffers = offers.filter((offer) => offer.recipient_id === user?.id);
  const outgoingOffers = offers.filter((offer) => offer.sender_id === user?.id);

  const topMarket = useMemo(() => {
    type MarketRow = { itemId: string; name: string; source: "GCASH" | "ELVE"; available: number; wanted: number; accepted: number; acceptedValue: number; acceptedValueCount: number };
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
      if (event.event_type !== "ACCEPTED_ITEM" || !event.item_id || (event.value_source !== "GCASH" && event.value_source !== "ELVE")) continue;
      const key = `${event.item_id}:${event.value_source}`;
      const known = getItemById(event.item_id);
      const entry = map.get(key) ?? { itemId: event.item_id, name: known?.NAME ?? event.item_id, source: event.value_source, available: 0, wanted: 0, accepted: 0, acceptedValue: 0, acceptedValueCount: 0 };
      entry.accepted += Number(event.metadata?.quantity ?? 1) || 1;
      if (typeof event.value === "number" && Number.isFinite(event.value) && event.value > 0) {
        entry.acceptedValue += event.value;
        entry.acceptedValueCount += 1;
      }
      map.set(key, entry);
    }
    return Array.from(map.values()).sort((a, b) => (b.wanted + b.accepted * 3) - (a.wanted + a.accepted * 3)).slice(0, 16);
  }, [events, listings]);

  async function respondOffer(offer: ExchangeOffer, action: "ACCEPT" | "DECLINE") {
    const client = supabase;
    if (!client) return;
    const { data, error: rpcError } = await client.rpc("marketplace_respond_offer", { p_offer_id: offer.id, p_action: action });
    if (rpcError) setError(rpcError.message);
    else {
      await reload();
      if (action === "ACCEPT" && data) window.location.href = `/exchange/rooms/${data}`;
    }
  }

  async function withdrawOffer(offer: ExchangeOffer) {
    const client = supabase;
    if (!client) return;
    const { error: rpcError } = await client.rpc("marketplace_withdraw_offer", { p_offer_id: offer.id });
    if (rpcError) setError(rpcError.message); else await reload();
  }

  async function setListingStatus(listing: ExchangeListing, action: "PAUSE" | "RESUME" | "CLOSE") {
    const client = supabase;
    if (!client || !user) return;
    const { error: updateError } = await client.rpc("marketplace_set_listing_status", { p_listing_id: listing.id, p_action: action });
    if (updateError) setError(updateError.message); else await reload();
  }

  async function savePreferences(next: MarketplacePreferences) {
    const client = supabase;
    if (!client || !user) return;
    setPreferences(next);
    const { error: prefError } = await client.from("marketplace_preferences").upsert({ user_id: user.id, ...next }, { onConflict: "user_id" });
    if (prefError) setError(prefError.message);
  }

  if (!supabase) return <SetupMessage />;

  return (
    <div className="grid gap-5 xl:grid-cols-[190px_minmax(0,1fr)_300px]">
      <aside className="hidden h-fit rounded-[26px] border border-white/70 bg-white/75 p-3 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/65 xl:block">
        <p className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-amber-500">CSBT Exchange</p>
        <div className="space-y-1">{tabs.map(([key, label]) => <button key={key} onClick={() => setTab(key)} className={`w-full rounded-2xl px-3 py-2.5 text-left text-xs font-black transition ${tab === key ? "bg-amber-100 text-amber-900 dark:bg-amber-400/10 dark:text-amber-200" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"}`}>{label}</button>)}</div>
        {user && <button onClick={() => setCreateOpen(true)} className="mt-3 w-full rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-3 text-xs font-black text-white shadow-md">＋ Create Listing</button>}
        {isMiddleman && <Link href="/exchange/middleman" className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 px-3 text-xs font-black text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">🛡 Middleman Desk</Link>}
        {isExchangeStaff && <Link href="/exchange/moderation" className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-3 text-xs font-black text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">🚨 Moderation Desk</Link>}
      </aside>

      <main className="min-w-0">
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 xl:hidden">{tabs.map(([key, label]) => <button key={key} onClick={() => setTab(key)} className={`shrink-0 rounded-full px-3 py-2 text-xs font-black ${tab === key ? "bg-amber-400 text-white" : "bg-white text-slate-500 dark:bg-white/5"}`}>{label}</button>)}</div>

        <section className="rounded-[30px] border border-white/70 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-5 text-white shadow-[0_20px_60px_rgba(15,23,42,.22)] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">Smarter than a listing board</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">CSBT Exchange</h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/65">Inventory-aware matching, offer building, counteroffers, trust, locked trade rooms, realtime activity, market depth, and Nich-powered decisions.</p>
            </div>
            <div className="flex gap-2">
              {user ? <button onClick={() => setCreateOpen(true)} className="min-h-12 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-5 text-sm font-black text-white shadow-lg">Create Listing</button> : <Link href="/profile" className="min-h-12 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950">Sign in to trade</Link>}
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 sm:max-w-xl">
            <Stat value={String(listings.length)} label="Live listings" />
            <Stat value={String(matches.filter((match) => match.score >= 80).length)} label="Strong matches" />
            <Stat value={String(events.filter((event) => event.event_type === "OFFER_ACCEPTED").length)} label="Accepted signals" />
          </div>
        </section>

        {error && <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">{error}</p>}
        {loading && <div className="mt-5 min-h-64 animate-pulse rounded-[28px] bg-white/60 dark:bg-white/5" />}

        {!loading && (tab === "for-you" || tab === "browse") && (
          <section className="mt-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-500">{tab === "for-you" ? "Personalized" : "Live Exchange"}</p><h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{tab === "for-you" ? "Opportunities for you" : "Browse active listings"}</h2></div>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search item or trader…" className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-amber-400 dark:border-white/10 dark:bg-slate-900" />
            </div>
            {!user && tab === "for-you" && <p className="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm font-bold text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200">Sign in and save your inventory + wishlist to unlock personalized match scores and Smart Offer Builder.</p>}
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {(tab === "for-you" ? matches.filter((match) => match.score >= preferences.min_match_score).slice(0, 30) : matches).map((match) => <ListingCard key={match.listing.id} listing={match.listing} match={user ? match : null} trust={trust.get(match.listing.user_id)} onOffer={user ? (listing) => setOfferListing(listing) : undefined} />)}
            </div>
            {!visibleListings.length && <Empty text="No live listings match this search yet." />}
          </section>
        )}

        {!loading && tab === "feed" && (
          <section className="mt-5">
            <SectionHeading eyebrow="Browse to learn" title="Exchange Trade Feed" />
            <p className="mt-2 text-sm font-semibold text-slate-500">A fast, scrollable view of live trades. See match scores, learn what people are asking for, and open any listing to make a similar offer.</p>
            <div className="mx-auto mt-4 max-w-2xl space-y-5">{matches.slice(0, 40).map((match) => <div key={match.listing.id} className="snap-start"><ListingCard listing={match.listing} match={user ? match : null} trust={trust.get(match.listing.user_id)} onOffer={user ? (listing) => setOfferListing(listing) : undefined} /></div>)}</div>
          </section>
        )}

        {!loading && tab === "my-listings" && (
          <section className="mt-5">
            <SectionHeading eyebrow="Your activity" title="My Listings" />
            {!user ? <SignInGate supabase={supabase} /> : <div className="mt-4 grid gap-4 lg:grid-cols-2">{ownedListings.map((listing) => <div key={listing.id} className="rounded-[30px] border border-white/60 bg-white/35 p-2 dark:border-white/5 dark:bg-white/[0.015]"><div className="mb-2 flex items-center justify-between gap-2 px-2"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-500 dark:bg-white/5 dark:text-slate-300">{listing.status}</span><span className="text-[10px] font-bold text-slate-400">Created {ago(listing.created_at)}</span></div><ListingCard listing={listing} trust={trust.get(listing.user_id)} /><div className="mt-2 flex gap-2">{listing.status === "OPEN" && <button onClick={() => void setListingStatus(listing, "PAUSE")} className="min-h-10 flex-1 rounded-2xl border border-amber-200 bg-amber-50 px-3 text-xs font-black text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">Pause</button>}{listing.status === "PAUSED" && <button onClick={() => void setListingStatus(listing, "RESUME")} className="min-h-10 flex-1 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-black text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200">Resume</button>}{(listing.status === "OPEN" || listing.status === "PAUSED") && <button onClick={() => void setListingStatus(listing, "CLOSE")} className="min-h-10 flex-1 rounded-2xl border border-rose-200 bg-rose-50 px-3 text-xs font-black text-rose-600 dark:border-rose-400/20 dark:bg-rose-400/10">Close</button>}</div></div>)}</div>}
            {user && !ownedListings.length && <Empty text="You have not created any Exchange listings yet." />}
          </section>
        )}

        {!loading && tab === "offers" && (
          <section className="mt-5">
            <SectionHeading eyebrow="Negotiation" title="Offers & Counteroffers" />
            {!user ? <SignInGate supabase={supabase} /> : <div className="mt-4 space-y-5"><OfferSection title="Incoming" offers={incomingOffers} currentUserId={user.id} onAccept={(offer) => void respondOffer(offer, "ACCEPT")} onDecline={(offer) => void respondOffer(offer, "DECLINE")} onCounter={(offer) => { setCounterOffer(offer); setOfferListing(offer.listing ?? null); }} /><OfferSection title="Sent by you" offers={outgoingOffers} currentUserId={user.id} onWithdraw={(offer) => void withdrawOffer(offer)} /></div>}
          </section>
        )}

        {!loading && tab === "rooms" && (
          <section className="mt-5">
            <SectionHeading eyebrow="Secure completion" title="Trade Rooms" />
            {!user ? <SignInGate supabase={supabase} /> : <div className="mt-4 grid gap-3 sm:grid-cols-2">{rooms.map((room) => <Link key={room.id} href={`/exchange/rooms/${room.id}`} className="rounded-[24px] border border-white/70 bg-white/80 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 dark:border-white/10 dark:bg-slate-950/65"><div className="flex items-center justify-between gap-2"><span className="text-sm font-black text-slate-950 dark:text-white">Trade #{room.id.slice(0, 8)}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black dark:bg-white/5">{room.status.replaceAll("_", " ")}</span></div><p className="mt-2 text-xs font-semibold text-slate-400">Updated {ago(room.updated_at)} • Offer locked for safety</p></Link>)}</div>}
            {user && !rooms.length && <Empty text="Accepted trades will appear here as secure trade rooms." />}
          </section>
        )}

        {!loading && tab === "market" && <MarketIntelligence topMarket={topMarket} events={events} listings={listings} />}
        {!loading && tab === "settings" && (user ? <PreferencesPanel value={preferences} onChange={(next) => void savePreferences(next)} /> : <SignInGate supabase={supabase} />)}
      </main>

      <aside className="hidden h-fit space-y-4 xl:block">
        <section className="rounded-[26px] border border-cyan-100 bg-cyan-50/80 p-4 dark:border-cyan-400/10 dark:bg-cyan-400/[0.045]">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-600 dark:text-cyan-300">Smart Match</p>
          <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Best opportunity now</h3>
          {matches[0] ? <><p className="mt-3 text-3xl font-black text-cyan-700 dark:text-cyan-300">{matches[0].score}%</p><p className="text-xs font-black text-slate-700 dark:text-slate-200">{matches[0].label}</p><p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{matches[0].reasons[0]}</p><Link href={`/exchange/${matches[0].listing.id}`} className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-2xl bg-cyan-600 text-xs font-black text-white">View Smart Match</Link></> : <p className="mt-3 text-xs font-semibold text-slate-400">Add inventory and wait for live listings to unlock matches.</p>}
        </section>
        <section className="rounded-[26px] border border-violet-100 bg-violet-50/80 p-4 dark:border-violet-400/10 dark:bg-violet-400/[0.045]">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-600 dark:text-violet-300">Nich Copilot</p>
          <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Ask before you offer</h3>
          <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">Open any listing to get a match explanation, Smart Offer Builder, and a ready-made prompt for Nich.</p>
          <Link href="/nich" className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-2xl bg-violet-600 text-xs font-black text-white">Ask Nich</Link>
        </section>
      </aside>

      {createOpen && user && <div className="fixed inset-0 z-[105] overflow-y-auto bg-slate-950/65 p-3 backdrop-blur-sm sm:p-6"><div className="mx-auto max-w-6xl"><CreateListingPanel supabase={supabase} user={user} onCancel={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); setTab("my-listings"); void reload(); }} /></div></div>}
      {offerListing && user && <OfferComposer supabase={supabase} user={user} listing={offerListing} inventory={inventory} parentOffer={counterOffer} onClose={() => { setOfferListing(null); setCounterOffer(null); }} onSent={() => { setOfferListing(null); setCounterOffer(null); setTab("offers"); void reload(); }} />}
    </div>
  );
}

function SetupMessage() { return <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-6 text-amber-900"><h2 className="text-xl font-black">Supabase required</h2><p className="mt-2 text-sm">Configure Supabase, then run <code>src/lib/supabase/exchange.sql</code>.</p></div>; }
function Empty({ text }: { text: string }) { return <p className="mt-4 rounded-[24px] border border-dashed border-slate-200 p-8 text-center text-sm font-bold text-slate-400 dark:border-white/10">{text}</p>; }
function Stat({ value, label }: { value: string; label: string }) { return <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center"><p className="text-xl font-black">{value}</p><p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/45">{label}</p></div>; }
function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) { return <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-500">{eyebrow}</p><h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{title}</h2></div>; }
function SignInGate({ supabase }: { supabase: SupabaseClient }) { return <div className="mx-auto mt-5 max-w-xl"><AuthCard supabase={supabase} /></div>; }

function OfferSection({ title, offers, currentUserId, onAccept, onDecline, onCounter, onWithdraw }: { title: string; offers: ExchangeOffer[]; currentUserId: string; onAccept?: (offer: ExchangeOffer) => void; onDecline?: (offer: ExchangeOffer) => void; onCounter?: (offer: ExchangeOffer) => void; onWithdraw?: (offer: ExchangeOffer) => void }) {
  return <div><h3 className="text-sm font-black text-slate-700 dark:text-slate-200">{title} ({offers.length})</h3><div className="mt-2 space-y-3">{offers.map((offer) => <article key={offer.id} className="rounded-[24px] border border-white/70 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/65"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-black text-slate-950 dark:text-white">{offer.listing?.title || offer.listing?.items.find((item) => item.side === "HAVE")?.item_name || "Exchange offer"}</p><p className="mt-1 text-[10px] font-bold text-slate-400">{offer.status} • {ago(offer.created_at)} • {offer.compatibility_score ?? "—"}% compatibility</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black dark:bg-white/5">{offer.value_source}</span></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-400/[0.05]"><p className="font-black text-emerald-700">Sender gives</p><p className="mt-1 text-lg font-black">{offer.value_source === "GCASH" ? "₱" : "🦈"}{Number(offer.sender_total).toLocaleString()}</p></div><div className="rounded-xl bg-violet-50 p-3 dark:bg-violet-400/[0.05]"><p className="font-black text-violet-700">Recipient gives</p><p className="mt-1 text-lg font-black">{offer.value_source === "GCASH" ? "₱" : "🦈"}{Number(offer.recipient_total).toLocaleString()}</p></div></div>{offer.note && <p className="mt-3 text-xs font-semibold text-slate-500">“{offer.note}”</p>}<div className="mt-3 flex flex-wrap gap-2">{offer.recipient_id === currentUserId && offer.status === "PENDING" && <><button onClick={() => onAccept?.(offer)} className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-black text-white">Accept</button>{offer.listing?.allow_counteroffers !== false && <button onClick={() => onCounter?.(offer)} className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-black text-white">Counter</button>}<button onClick={() => onDecline?.(offer)} className="rounded-xl bg-rose-100 px-4 py-2 text-xs font-black text-rose-600">Decline</button></>}{offer.sender_id === currentUserId && offer.status === "PENDING" && <button onClick={() => onWithdraw?.(offer)} className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-600 dark:bg-white/5">Withdraw</button>}</div></article>)}{!offers.length && <Empty text="No offers in this section yet." />}</div></div>;
}

function PreferencesPanel({ value, onChange }: { value: MarketplacePreferences; onChange: (next: MarketplacePreferences) => void }) {
  const toggles: Array<[keyof MarketplacePreferences, string, string]> = [
    ["prefer_upgrades", "Prefer upgrades", "Fewer stronger items"], ["prefer_downgrades", "Prefer downgrades", "Multiple good items"], ["prefer_high_demand", "High demand", "Prioritize liquid items"], ["prefer_overpays", "Overpays", "Boost overpay matches"], ["avoid_randoms", "Avoid randoms", "Reduce mixed low-value bundles"], ["avoid_hard_to_trade", "Avoid hard-to-trade", "Prefer easier liquidity"], ["accepts_pets", "Accept pets", "Pets in recommendations"], ["accepts_petwear", "Accept pet wear", "Pet wear in recommendations"], ["accepts_vehicles", "Accept vehicles", "Vehicles in recommendations"], ["accepts_food", "Accept food", "Food in recommendations"], ["accepts_gifts", "Accept gifts", "Gifts in recommendations"], ["accepts_strollers", "Accept strollers", "Strollers in recommendations"], ["accepts_toys", "Accept toys", "Toys in recommendations"], ["accepts_stickers", "Accept stickers", "Stickers in recommendations"], ["accepts_other", "Accept other", "Other categories"],
  ];
  return <section className="mt-5"><SectionHeading eyebrow="Personalization" title="My Trading Style" /><p className="mt-2 text-sm font-semibold text-slate-500">These preferences change your Smart Match score instead of hiding the whole market.</p><div className="mt-4 rounded-[24px] border border-cyan-100 bg-cyan-50/70 p-4 dark:border-cyan-400/10 dark:bg-cyan-400/[0.04]"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-600 dark:text-cyan-300">Preferred matching value source</p><div className="mt-3 grid grid-cols-2 gap-2">{(["GCASH","ELVE"] as const).map((source) => <button key={source} onClick={() => onChange({ ...value, value_source: source })} className={`min-h-11 rounded-2xl border px-4 text-xs font-black ${value.value_source === source ? "border-cyan-300 bg-white text-cyan-700 shadow-sm dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200" : "border-white/80 bg-white/45 text-slate-400 dark:border-white/10 dark:bg-white/[0.025]"}`}>{source === "GCASH" ? "💵 GCash" : "🦈 Elve Shark"}</button>)}</div></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{toggles.map(([key, label, text]) => <button key={String(key)} onClick={() => onChange({ ...value, [key]: !value[key] })} className={`rounded-2xl border p-4 text-left ${value[key] ? "border-amber-300 bg-amber-50 dark:bg-amber-400/10" : "border-slate-200 bg-white/70 dark:border-white/10 dark:bg-white/[0.03]"}`}><span className="text-sm font-black text-slate-950 dark:text-white">{value[key] ? "✓ " : ""}{label}</span><span className="mt-1 block text-[10px] font-semibold text-slate-400">{text}</span></button>)}</div><div className="mt-4 rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.03]"><label className="text-xs font-black">Minimum For You score: {value.min_match_score}%</label><input type="range" min={0} max={95} step={5} value={value.min_match_score} onChange={(event) => onChange({ ...value, min_match_score: Number(event.target.value) })} className="mt-3 w-full" /></div></section>;
}

function MarketIntelligence({ topMarket, events, listings }: { topMarket: Array<{ itemId: string; name: string; source: "GCASH" | "ELVE"; available: number; wanted: number; accepted: number; acceptedValue: number; acceptedValueCount: number }>; events: MarketEvent[]; listings: ExchangeListing[] }) {
  const accepted = events.filter((event) => event.event_type === "OFFER_ACCEPTED").length;
  const completed = events.filter((event) => event.event_type === "TRADE_COMPLETED").length;
  const since = Date.now() - 24 * 60 * 60 * 1000;
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

  return <section className="mt-5"><SectionHeading eyebrow="CSBT-owned market data" title="Market Intelligence" /><p className="mt-2 max-w-3xl text-sm font-semibold text-slate-500">Exchange turns listings, searches, views, offers, and completed trades into CSBT-owned market signals. As activity grows, this becomes a real picture of supply, demand, velocity, and accepted values instead of relying only on external value lists.</p><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6"><Metric value={String(listings.length)} label="Open listings" /><Metric value={String(accepted)} label="Accepted offers" /><Metric value={String(completed)} label="Completed rooms" /><Metric value={String(views24h)} label="Views · 24h" /><Metric value={String(searches24h)} label="Searches · 24h" /><Metric value={String(offers24h)} label="Offers · 24h" /></div>{topQueries.length > 0 && <div className="mt-4 rounded-[24px] border border-violet-100 bg-violet-50/70 p-4 dark:border-violet-400/10 dark:bg-violet-400/[0.04]"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-600 dark:text-violet-300">What traders are searching now</p><div className="mt-3 flex flex-wrap gap-2">{topQueries.map(([query,count]) => <span key={query} className="rounded-full border border-violet-100 bg-white px-3 py-1.5 text-[10px] font-black text-violet-700 dark:border-violet-400/10 dark:bg-white/5 dark:text-violet-200">{query} <span className="opacity-50">×{count}</span></span>)}</div></div>}<div className="mt-5 overflow-x-auto rounded-[26px] border border-white/70 bg-white/80 dark:border-white/10 dark:bg-slate-950/65"><div className="min-w-[650px]"><div className="grid grid-cols-[minmax(160px,1fr)_70px_70px_70px_70px_110px] border-b border-slate-200 px-4 py-3 text-[9px] font-black uppercase tracking-[0.1em] text-slate-400 dark:border-white/10"><span>Item</span><span>Source</span><span>Supply</span><span>Wanted</span><span>Done</span><span>CSBT Market</span></div>{topMarket.map((row) => <Link href={`/values/${encodeURIComponent(row.itemId)}`} key={`${row.itemId}-${row.source}`} className="grid grid-cols-[minmax(160px,1fr)_70px_70px_70px_70px_110px] items-center border-b border-slate-100 px-4 py-3 text-xs last:border-0 dark:border-white/5"><span className="truncate font-black text-slate-800 dark:text-white">{row.name}</span><span className="font-black text-slate-500">{row.source === "GCASH" ? "💵 GCash" : "🦈 Elve"}</span><span className="font-bold text-slate-500">{row.available}</span><span className="font-bold text-violet-600">{row.wanted}</span><span className="font-black text-emerald-600">{row.accepted}</span><span className="font-black text-cyan-600">{row.acceptedValueCount ? `${row.source === "GCASH" ? "₱" : "🦈"}${(row.acceptedValue / row.acceptedValueCount).toLocaleString(undefined,{maximumFractionDigits:2})}` : "Collecting"}</span></Link>)}</div></div></section>;
}
function Metric({ value, label }: { value: string; label: string }) { return <div className="rounded-2xl border border-white/70 bg-white/80 p-4 text-center dark:border-white/10 dark:bg-white/[0.035]"><p className="text-2xl font-black text-slate-950 dark:text-white">{value}</p><p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</p></div>; }

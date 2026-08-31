"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuthSession } from "../../hooks/useAuthSession";
import AuthCard from "../account/AuthCard";
import OfferComposer from "./OfferComposer";
import type { ExchangeListing, InventoryExchangeRow, MarketplacePreferences, TrustStats } from "../../lib/exchange/types";
import { DEFAULT_MARKETPLACE_PREFERENCES, scoreListingMatch, sumExchangeItems } from "../../lib/exchange/matching";
import { formatTradeValue } from "../../lib/valueSystem";
import AccessibleDialog from "../ui/AccessibleDialog";
import { getGameAdapter, sourceLabel, sourceSymbol } from "../../games/registry";
import type { CSBTGameId, CSBTValueSource } from "../../games/types";

export default function ListingDetail({
  listingId,
  expectedGameId,
  exchangeBasePath = "/exchange",
  tradeOpinionsHref = "/trade-opinions",
  loungeHref = "/lounge",
}: {
  listingId: string;
  expectedGameId?: CSBTGameId;
  exchangeBasePath?: string;
  tradeOpinionsHref?: string;
  loungeHref?: string;
}) {
  const { supabase, user, loading: authLoading } = useAuthSession();
  const [listing, setListing] = useState<ExchangeListing | null>(null);
  const [inventory, setInventory] = useState<InventoryExchangeRow[]>([]);
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [preferences, setPreferences] = useState<MarketplacePreferences>(DEFAULT_MARKETPLACE_PREFERENCES);
  const [trust, setTrust] = useState<TrustStats | null>(null);
  const [categoryStats, setCategoryStats] = useState<Array<{ category: string; completed_trades: number }>>([]);
  const [offerOpen, setOfferOpen] = useState(false);
  const [marketCounts, setMarketCounts] = useState({ supply: 0, wanted: 0, accepted: 0 });
  const [error, setError] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportCategory, setReportCategory] = useState("SCAM_RISK");

  useEffect(() => {
    const client = supabase;
    if (!client || authLoading) return;
    let active = true;
    void (async () => {
      const { data, error: loadError } = await client
        .from("marketplace_listings")
        .select("*,marketplace_listing_items(*)")
        .eq("id", listingId)
        .maybeSingle();
      if (!active) return;
      if (loadError || !data) {
        setError(loadError?.message ?? "Listing not found.");
        return;
      }
      const normalized = { ...data, items: data.marketplace_listing_items ?? [] } as unknown as ExchangeListing;
      if (expectedGameId && normalized.game_id !== expectedGameId) {
        setError(`This listing belongs to ${getGameAdapter(normalized.game_id).shortName}, not the current ${getGameAdapter(expectedGameId).shortName} mode.`);
        return;
      }
      setListing(normalized);

      const haveIds = normalized.items.filter((item) => item.side === "HAVE").map((item) => item.item_id);
      const [{ data: trustRows }, { data: categoryRows }, { data: itemRows }, { data: eventRows }] = await Promise.all([
        client.from("marketplace_user_stats").select("*").eq("user_id", normalized.user_id).maybeSingle(),
        client.from("marketplace_user_category_stats").select("category,completed_trades").eq("user_id", normalized.user_id).order("completed_trades", { ascending: false }).limit(5),
        haveIds.length ? client.from("marketplace_listing_items").select("item_id,side,listing_id").in("item_id", haveIds) : Promise.resolve({ data: [] }),
        client.from("marketplace_events").select("event_type,listing_id,item_id").eq("game_id", normalized.game_id).in("item_id", haveIds.length ? haveIds : ["__none__"]).limit(500),
      ]);
      if (!active) return;
      if (trustRows) setTrust(trustRows as TrustStats);
      setCategoryStats((categoryRows ?? []) as Array<{ category: string; completed_trades: number }>);
      const rows = (itemRows ?? []) as Array<{ item_id: string; side: string; listing_id: string }>;
      setMarketCounts({
        supply: rows.filter((row) => row.side === "HAVE").length,
        wanted: rows.filter((row) => row.side === "WANT").length,
        accepted: ((eventRows ?? []) as Array<{ event_type: string }>).filter((row) => row.event_type === "ACCEPTED_ITEM").length,
      });

      if (user && normalized.game_id === "adopt-me") {
        const [inv, wish, pref] = await Promise.all([
          client.from("inventory_items").select("id,item_id,item_name,image_url,category,value_type,potion_status,quantity").eq("user_id", user.id),
          client.from("wishlist_items").select("item_id").eq("user_id", user.id),
          client.from("marketplace_preferences").select("*").eq("user_id", user.id).maybeSingle(),
        ]);
        if (!active) return;
        setInventory((inv.data ?? []) as InventoryExchangeRow[]);
        setWishlistIds(new Set((wish.data ?? []).map((row) => String(row.item_id))));
        if (pref.data) setPreferences({ ...DEFAULT_MARKETPLACE_PREFERENCES, ...(pref.data as MarketplacePreferences) });
      } else {
        setInventory([]);
        setWishlistIds(new Set());
        setPreferences(DEFAULT_MARKETPLACE_PREFERENCES);
      }
    })();
    return () => { active = false; };
  }, [authLoading, expectedGameId, listingId, supabase, user]);

  useEffect(() => {
    if (!listing) return;
    void fetch("/api/exchange/event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ eventType: "LISTING_VIEW", listingId: listing.id, itemId: listing.items.find((item) => item.side === "HAVE")?.item_id, valueSource: listing.value_source, gameId: listing.game_id }),
    }).catch(() => undefined);
  }, [listing]);

  const match = useMemo(
    () => listing && listing.game_id === "adopt-me" ? scoreListingMatch(listing, inventory, wishlistIds, preferences) : null,
    [inventory, listing, preferences, wishlistIds],
  );
  const safetyFlags = useMemo(() => {
    if (!listing) return [] as Array<{ level: "info" | "caution"; title: string; text: string }>;
    const flags: Array<{ level: "info" | "caution"; title: string; text: string }> = [];
    const note = `${listing.title ?? ""} ${listing.note ?? ""}`.toLowerCase();
    if (!trust?.roblox_verified) flags.push({ level: "caution", title: "Roblox account not verified", text: "Use the profile and locked Trade Room as your source of truth until this trader verifies their Roblox account." });
    if ((trust?.completed_trades ?? 0) < 3) flags.push({ level: "info", title: "Limited Exchange history", text: "This trader has fewer than 3 completed CSBT Exchange trades. That is not automatically unsafe, but use normal caution." });
    if (/\b(discord|telegram|whatsapp|messenger|dm me|message me elsewhere|outside csbt|give first|trust trade|youtube|tiktok)\b/i.test(note)) flags.push({ level: "caution", title: "Off-platform wording detected", text: "Keep negotiation and the agreed item snapshot inside CSBT Exchange. Do not follow external verification or payment instructions." });
    if (listing.items.some((item) => item.snapshot_value == null)) flags.push({ level: "info", title: "Some values are unavailable", text: "Compatibility is less precise when an item has no value in the selected source. Review the actual items and demand before accepting." });
    if (!flags.length) flags.push({ level: "info", title: "No obvious listing risk signals", text: "Still verify the in-game offer against the locked CSBT Trade Room before confirming completion." });
    return flags;
  }, [listing, trust]);
  const client = supabase;
  if (!client) return <p className="rounded-2xl bg-amber-50 p-5 font-bold text-amber-800">Supabase is required for Exchange.</p>;
  if (error) return <p className="rounded-2xl bg-rose-50 p-5 font-bold text-rose-700">{error}</p>;
  if (!listing) return <div className="min-h-80 animate-pulse rounded-[30px] bg-white/60 dark:bg-white/5" />;

  const currentListing = listing;
  const gameAdapter = getGameAdapter(currentListing.game_id);
  const have = currentListing.items.filter((item) => item.side === "HAVE");
  const want = currentListing.items.filter((item) => item.side === "WANT");
  const targetValue = sumExchangeItems(have);
  const prompt = `I'm looking at an Adopt Me CSBT Exchange listing from ${listing.display_name}. They have ${have.map((item) => `${item.quantity}x ${item.value_type} ${item.item_name}`).join(", ")} and want ${want.length ? want.map((item) => `${item.quantity}x ${item.value_type} ${item.item_name}`).join(", ") : "offers"}. The listing uses ${listing.value_source} values and is worth about ${targetValue}. My CSBT match score is ${match?.score ?? "unknown"}%. Help me decide what to offer and whether this looks worth pursuing.`;

  async function blockTrader() {
    const actionClient = supabase;
    if (!user || !actionClient) return;
    const { error: blockError } = await actionClient.from("user_blocks").upsert({ blocker_id: user.id, blocked_id: currentListing.user_id }, { onConflict: "blocker_id,blocked_id" });
    if (blockError) setError(blockError.message); else window.location.href = `${exchangeBasePath}`;
  }

  async function reportListing() {
    const actionClient = supabase;
    if (!user || !actionClient || reportText.trim().length < 5) return;
    const { error: reportError } = await actionClient.from("marketplace_reports").insert({ reporter_id: user.id, target_user_id: currentListing.user_id, listing_id: currentListing.id, category: reportCategory, details: reportText.trim().slice(0, 1500) });
    if (reportError) setError(reportError.message); else { setReportOpen(false); setReportText(""); }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-5">
        <section className="rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-[0_20px_60px_rgba(15,23,42,.1)] dark:border-white/10 dark:bg-slate-950/70 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><div className="flex flex-wrap items-center gap-2"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-500">CSBT Exchange listing</p><span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-black text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">{gameAdapter.icon} {gameAdapter.shortName}</span></div><h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{listing.title || `${have[0]?.item_name ?? "Trade"} offer`}</h1><p className="mt-2 text-sm font-semibold text-slate-500">{listing.display_name} • {listing.intent.replaceAll("_", " ")} • {sourceLabel(listing.value_source)}</p></div>
            {match && <div className="rounded-2xl bg-cyan-50 px-4 py-3 text-center dark:bg-cyan-400/10"><p className="text-3xl font-black text-cyan-700 dark:text-cyan-300">{match.score}%</p><p className="text-[10px] font-black uppercase tracking-[0.1em] text-cyan-600">{match.label}</p></div>}
          </div>
          {listing.note && <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-600 dark:bg-white/[0.035] dark:text-slate-300">“{listing.note}”</p>}
          <div className="mt-5 grid gap-4 md:grid-cols-2"><ItemSide title="They have" items={have} source={listing.value_source} /><ItemSide title="They want" items={want} source={listing.value_source} empty="Open to offers" /></div>
        </section>

        {match && <section className="rounded-[28px] border border-cyan-100 bg-cyan-50/75 p-5 dark:border-cyan-400/10 dark:bg-cyan-400/[0.045]"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-600 dark:text-cyan-300">Why this match?</p><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(match.breakdown).map(([label, value]) => <div key={label} className="rounded-2xl bg-white/80 p-3 dark:bg-slate-950/50"><div className="flex justify-between gap-2 text-xs font-black"><span className="capitalize">{label}</span><span>{value === null ? "N/A" : `${value}%`}</span></div>{value === null ? <p className="mt-2 text-[11px] font-bold text-slate-400">Not used in this match score</p> : <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" style={{ width: `${value}%` }} /></div>}</div>)}</div><div className="mt-3 flex flex-wrap gap-2">{match.reasons.map((reason) => <span key={reason} className="rounded-full bg-white/80 px-3 py-1.5 text-[10px] font-black text-slate-600 dark:bg-white/5 dark:text-slate-300">✓ {reason}</span>)}</div></section>}

        {listing.game_id === "adopt-me" ? (
          <section className="rounded-[28px] border border-violet-100 bg-violet-50/75 p-5 dark:border-violet-400/10 dark:bg-violet-400/[0.045]"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-600 dark:text-violet-300">🤖 NICH Trading Copilot</p><h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">Ask NICH about this exact listing</h2><p className="mt-2 text-sm font-semibold leading-6 text-slate-500">Nich remains connected to the Adopt Me Exchange workflow.</p><Link href={`/nich?prompt=${encodeURIComponent(prompt)}`} className="mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl bg-violet-600 px-5 text-sm font-black text-white">Ask NICH about this listing</Link></section>
        ) : (
          <section className="rounded-[28px] border border-red-100 bg-red-50/75 p-5 dark:border-red-400/10 dark:bg-red-400/[0.045]"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-red-600 dark:text-red-300">MM2 Community</p><h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">Need another opinion?</h2><p className="mt-2 text-sm font-semibold leading-6 text-slate-500">MM2 stays non-AI for now. Take the trade to Trade Opinions or discuss the listing in the CSBT Lounge.</p><div className="mt-4 flex flex-wrap gap-2"><Link href={tradeOpinionsHref} className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-red-600 px-5 text-sm font-black text-white">Trade Opinions</Link><Link href={`${loungeHref}?channel=trade-chat`} className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-red-200 px-5 text-sm font-black text-red-700 dark:border-red-400/20 dark:text-red-200">Discuss in Lounge</Link></div></section>
        )}
      </div>

      <aside className="space-y-4">
        <section className="rounded-[28px] border border-white/70 bg-white/82 p-5 dark:border-white/10 dark:bg-slate-950/65"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-500">Trader trust</p><div className="mt-3 flex items-end justify-between gap-3"><div><p className="text-4xl font-black text-slate-950 dark:text-white">{trust?.trust_score ?? 45}<span className="text-base text-slate-400">/100</span></p><p className="mt-1 text-xs font-black text-slate-600 dark:text-slate-300">{trust?.display_name ?? listing.display_name}</p></div><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">{trust?.roblox_verified ? "✓ Roblox verified" : "Unverified Roblox"}</span></div><div className="mt-4 grid grid-cols-2 gap-2 text-center"><MiniMetric value={String(trust?.completed_trades ?? 0)} label="Completed" /><MiniMetric value={trust?.completion_rate != null ? `${trust.completion_rate}%` : "—"} label="Completion" /><MiniMetric value={trust?.avg_rating ? `${trust.avg_rating}★` : "—"} label={`${trust?.review_count ?? 0} reviews`} /><MiniMetric value={String(trust?.middleman_trades ?? 0)} label="MM trades" /></div>{(trust?.upheld_reports ?? 0) > 0 && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-[10px] font-black text-rose-600 dark:bg-rose-400/10 dark:text-rose-300">⚠️ {trust?.upheld_reports} upheld CSBT report{trust?.upheld_reports === 1 ? "" : "s"} affects this trust score.</p>}{categoryStats.length > 0 && <div className="mt-3 border-t border-slate-100 pt-3 dark:border-white/5"><p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">Category experience</p><div className="mt-2 flex flex-wrap gap-1.5">{categoryStats.map((row) => <span key={row.category} className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black text-slate-600 dark:bg-white/5 dark:text-slate-300">{row.category}: {row.completed_trades}</span>)}</div></div>}</section>

        <section className="rounded-[28px] border border-white/70 bg-white/82 p-5 dark:border-white/10 dark:bg-slate-950/65"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-500">Live market depth</p><div className="mt-3 grid grid-cols-3 gap-2"><MiniMetric value={String(marketCounts.supply)} label="Supply" /><MiniMetric value={String(marketCounts.wanted)} label="Wanted" /><MiniMetric value={String(marketCounts.accepted)} label="Accepted" /></div><p className="mt-3 text-xs font-semibold leading-5 text-slate-400">Exchange activity gradually creates CSBT-owned demand and trading data for this item.</p></section>

        <section className="rounded-[28px] border border-rose-100 bg-rose-50/75 p-5 dark:border-rose-400/10 dark:bg-rose-400/[0.045]"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-rose-600 dark:text-rose-300">🛡 Safety Scan</p><h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Before you make an offer</h3><div className="mt-3 space-y-2">{safetyFlags.map((flag) => <div key={`${flag.title}-${flag.text}`} className={`rounded-2xl border p-3 ${flag.level === "caution" ? "border-amber-200 bg-amber-50 dark:border-amber-400/20 dark:bg-amber-400/10" : "border-white/80 bg-white/75 dark:border-white/10 dark:bg-white/[0.035]"}`}><p className="text-xs font-black text-slate-800 dark:text-slate-100">{flag.level === "caution" ? "⚠️ " : "✓ "}{flag.title}</p><p className="mt-1 text-[10px] font-semibold leading-5 text-slate-500 dark:text-slate-400">{flag.text}</p></div>)}</div><Link href="/seminar" className="mt-3 inline-flex text-[10px] font-black text-rose-600 dark:text-rose-300">Open Safe Trader Academy →</Link></section>

        {user && user.id !== listing.user_id ? <button onClick={() => { setOfferOpen(true); void fetch("/api/exchange/event", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ eventType: "OFFER_BUILDER_OPEN", listingId: listing.id, itemId: have[0]?.item_id, valueSource: listing.value_source, gameId: listing.game_id }) }).catch(() => undefined); }} className="min-h-14 w-full rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-5 text-sm font-black text-white shadow-lg">✨ Build & Send Offer</button> : user?.id === listing.user_id ? <Link href={`${exchangeBasePath}?tab=my-listings`} className="inline-flex min-h-14 w-full items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-black text-white">Manage My Listing</Link> : <div className="rounded-[24px] bg-white/80 p-4 dark:bg-white/5"><AuthCard supabase={client} /></div>}

        {user && user.id !== listing.user_id && <div className="grid grid-cols-2 gap-2"><button onClick={() => setReportOpen(true)} className="rounded-2xl border border-rose-200 bg-rose-50 py-3 text-xs font-black text-rose-600 dark:border-rose-400/20 dark:bg-rose-400/10">Report</button><button onClick={() => void blockTrader()} className="rounded-2xl border border-slate-200 bg-white py-3 text-xs font-black text-slate-500 dark:border-white/10 dark:bg-white/5">Block trader</button></div>}
      </aside>

      {offerOpen && user && <OfferComposer supabase={client} listing={listing} inventory={inventory} onClose={() => setOfferOpen(false)} onSent={() => { setOfferOpen(false); window.location.href = `${exchangeBasePath}?tab=offers`; }} />}
      <AccessibleDialog open={reportOpen} onClose={() => setReportOpen(false)} title="Report listing or trader" className="max-w-lg"><div className="rounded-[var(--radius-section)] bg-white p-5 dark:bg-slate-950"><h2 className="text-xl font-black">Report listing/trader</h2><select value={reportCategory} onChange={(event) => setReportCategory(event.target.value)} className="mt-4 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black dark:border-white/10 dark:bg-slate-900"><option value="SCAM_RISK">Scam risk</option><option value="FAKE_LISTING">Fake listing</option><option value="SWITCH_ATTEMPT">Switch attempt</option><option value="OFF_PLATFORM_LINK">Off-platform link/contact</option><option value="SPAM">Spam</option><option value="HARASSMENT">Harassment</option><option value="OTHER">Other</option></select><textarea value={reportText} onChange={(event) => setReportText(event.target.value)} rows={5} placeholder="Tell CSBT staff what happened…" className="mt-4 w-full rounded-2xl border border-slate-200 p-3 text-sm dark:border-white/10 dark:bg-slate-900"/><div className="mt-3 flex justify-end gap-2"><button onClick={() => setReportOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black">Cancel</button><button onClick={() => void reportListing()} className="rounded-xl bg-rose-500 px-4 py-2 text-xs font-black text-white">Submit report</button></div></div></AccessibleDialog>
    </div>
  );
}

function ItemSide({ title, items, source, empty }: { title: string; items: ExchangeListing["items"]; source: CSBTValueSource; empty?: string }) { return <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.025]"><div className="flex items-center justify-between"><h3 className="text-sm font-black">{title}</h3><span className="text-xs font-black text-slate-400">{source}</span></div><div className="mt-3 space-y-2">{items.map((item,index) => <div key={`${item.item_id}-${index}`} className="flex items-center gap-3 rounded-2xl bg-white p-2.5 dark:bg-slate-950/55"><span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 dark:bg-white/5">{item.image_url ? <Image src={item.image_url} alt="" width={48} height={48} unoptimized className="h-11 w-11 object-contain"/> : "📦"}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-black">{item.quantity > 1 ? `${item.quantity}× ` : ""}{item.value_type !== "NORMAL" ? `${item.value_type} ` : ""}{item.item_name}</span><span className="text-[10px] font-bold text-slate-400">{sourceSymbol(source)} {formatTradeValue(item.snapshot_value)} each</span></span></div>)}{!items.length && <p className="py-5 text-center text-xs font-bold text-slate-400">{empty ?? "No items specified"}</p>}</div></div>; }
function MiniMetric({ value, label }: { value: string; label: string }) { return <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-white/[0.035]"><p className="text-lg font-black text-slate-950 dark:text-white">{value}</p><p className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-400">{label}</p></div>; }

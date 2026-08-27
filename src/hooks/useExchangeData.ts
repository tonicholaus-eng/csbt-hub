"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type {
  ExchangeListing,
  ExchangeOffer,
  InventoryExchangeRow,
  MarketplacePreferences,
  TrustStats,
} from "../lib/exchange/types";
import { DEFAULT_MARKETPLACE_PREFERENCES } from "../lib/exchange/matching";
import type { CSBTGameId } from "../games/types";
import { isLegacyGameSchemaError } from "../lib/supabase/multigameCompat";

type DbListing = Omit<ExchangeListing, "items" | "game_id"> & { game_id?: CSBTGameId; marketplace_listing_items?: ExchangeListing["items"] };
type DbOffer = Omit<ExchangeOffer, "items" | "listing" | "game_id"> & {
  game_id?: CSBTGameId;
  marketplace_offer_items?: ExchangeOffer["items"];
  marketplace_listings?: DbListing | null;
};

export type ExchangeRoomRow = {
  id: string;
  game_id: CSBTGameId;
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

export type ExchangeMarketEvent = {
  id: number;
  game_id: CSBTGameId;
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
  return { ...row, game_id: row.game_id ?? "adopt-me", items: (row.marketplace_listing_items ?? []).map((item) => ({ ...item })) } as ExchangeListing;
}

function normalizeOffer(row: DbOffer): ExchangeOffer {
  return {
    ...row,
    game_id: row.game_id ?? row.marketplace_listings?.game_id ?? "adopt-me",
    items: (row.marketplace_offer_items ?? []).map((item) => ({ ...item })),
    listing: row.marketplace_listings ? normalizeListing(row.marketplace_listings) : null,
  } as ExchangeOffer;
}

function upsertById<T extends { id: string }>(rows: T[], next: T, limit = 120): T[] {
  const found = rows.some((row) => row.id === next.id);
  const updated = found ? rows.map((row) => (row.id === next.id ? next : row)) : [next, ...rows];
  return updated
    .sort((a, b) => {
      const aTime = "updated_at" in a ? String((a as T & { updated_at?: string }).updated_at ?? "") : "";
      const bTime = "updated_at" in b ? String((b as T & { updated_at?: string }).updated_at ?? "") : "";
      return bTime.localeCompare(aTime);
    })
    .slice(0, limit);
}

type RealtimePayload = { eventType: string; old?: Record<string, unknown> | null; new?: Record<string, unknown> | null };

function payloadId(payload: RealtimePayload): string | null {
  const source = payload.eventType === "DELETE" ? payload.old : payload.new;
  const value = source && "id" in source ? source.id : null;
  return typeof value === "string" ? value : value != null ? String(value) : null;
}

export function useExchangeData({
  supabase,
  user,
  authLoading,
  loadMarketEvents = false,
  gameId,
}: {
  supabase: SupabaseClient | null;
  user: User | null;
  authLoading: boolean;
  loadMarketEvents?: boolean;
  gameId: CSBTGameId;
}) {
  const [listings, setListings] = useState<ExchangeListing[]>([]);
  const [offers, setOffers] = useState<ExchangeOffer[]>([]);
  const [ownedListings, setOwnedListings] = useState<ExchangeListing[]>([]);
  const [rooms, setRooms] = useState<ExchangeRoomRow[]>([]);
  const [inventory, setInventory] = useState<InventoryExchangeRow[]>([]);
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [preferences, setPreferences] = useState<MarketplacePreferences>(DEFAULT_MARKETPLACE_PREFERENCES);
  const [trust, setTrust] = useState<Map<string, TrustStats>>(new Map());
  const [events, setEvents] = useState<ExchangeMarketEvent[]>([]);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const loadTrustForUsers = useCallback(async (client: SupabaseClient, userIds: string[]) => {
    const ids = Array.from(new Set(userIds.filter(Boolean)));
    if (!ids.length) return;
    const { data } = await client.from("marketplace_user_stats").select("*").in("user_id", ids);
    if (!mountedRef.current || !data) return;
    setTrust((current) => {
      const next = new Map(current);
      for (const row of data as TrustStats[]) next.set(row.user_id, row);
      return next;
    });
  }, []);

  const loadPublic = useCallback(async (client: SupabaseClient) => {
    let listingResult = await client
      .from("marketplace_listings")
      .select("*,marketplace_listing_items(*)")
      .eq("status", "OPEN")
      .eq("game_id", gameId)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(120);

    if (listingResult.error && gameId === "adopt-me" && isLegacyGameSchemaError(listingResult.error)) {
      listingResult = await client
        .from("marketplace_listings")
        .select("*,marketplace_listing_items(*)")
        .eq("status", "OPEN")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(120);
    }

    if (listingResult.error) throw listingResult.error;

    let marketRows: ExchangeMarketEvent[] = [];
    if (loadMarketEvents) {
      let marketResult = await client
        .from("marketplace_events")
        .select("id,game_id,event_type,listing_id,offer_id,room_id,item_id,value_source,value,metadata,created_at")
        .eq("game_id", gameId)
        .order("created_at", { ascending: false })
        .limit(600);

      if (marketResult.error && gameId === "adopt-me" && isLegacyGameSchemaError(marketResult.error)) {
        marketResult = await client
          .from("marketplace_events")
          .select("id,event_type,listing_id,offer_id,room_id,item_id,value_source,value,metadata,created_at")
          .order("created_at", { ascending: false })
          .limit(600) as typeof marketResult;
      }

      if (!marketResult.error) {
        marketRows = ((marketResult.data ?? []) as Array<ExchangeMarketEvent & { game_id?: CSBTGameId }>).map((row) => ({
          ...row,
          game_id: row.game_id ?? "adopt-me",
        }));
      }
    }

    if (!mountedRef.current) return;
    const normalized = ((listingResult.data ?? []) as DbListing[]).map(normalizeListing);
    setListings(normalized.filter((row) => row.game_id === gameId));
    setEvents(marketRows.filter((row) => row.game_id === gameId));
    await loadTrustForUsers(client, normalized.map((row) => row.user_id));
  }, [gameId, loadMarketEvents, loadTrustForUsers]);

  const loadPrivate = useCallback(async (client: SupabaseClient, userId: string) => {
    const [inventoryResult, wishlistResult, preferencesResult, blockResult] = await Promise.all([
      client.from("inventory_items").select("id,item_id,item_name,image_url,category,value_type,potion_status,quantity").eq("user_id", userId),
      client.from("wishlist_items").select("item_id").eq("user_id", userId),
      client.from("marketplace_preferences").select("*").eq("user_id", userId).maybeSingle(),
      client.from("user_blocks").select("blocked_id").eq("blocker_id", userId),
    ]);

    let offerResult = await client
      .from("marketplace_offers")
      .select("*,marketplace_offer_items(*),marketplace_listings(*,marketplace_listing_items(*))")
      .eq("game_id", gameId)
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(100);
    if (offerResult.error && gameId === "adopt-me" && isLegacyGameSchemaError(offerResult.error)) {
      offerResult = await client
        .from("marketplace_offers")
        .select("*,marketplace_offer_items(*),marketplace_listings(*,marketplace_listing_items(*))")
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(100);
    }

    let roomResult = await client
      .from("trade_rooms")
      .select("id,game_id,listing_id,accepted_offer_id,user_a,user_b,status,lock_snapshot,completed_by_a,completed_by_b,created_at,updated_at")
      .eq("game_id", gameId)
      .or(`user_a.eq.${userId},user_b.eq.${userId}`)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (roomResult.error && gameId === "adopt-me" && isLegacyGameSchemaError(roomResult.error)) {
      roomResult = await client
        .from("trade_rooms")
        .select("id,listing_id,accepted_offer_id,user_a,user_b,status,lock_snapshot,completed_by_a,completed_by_b,created_at,updated_at")
        .or(`user_a.eq.${userId},user_b.eq.${userId}`)
        .order("updated_at", { ascending: false })
        .limit(100) as typeof roomResult;
    }

    let ownedListingResult = await client
      .from("marketplace_listings")
      .select("*,marketplace_listing_items(*)")
      .eq("user_id", userId)
      .eq("game_id", gameId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (ownedListingResult.error && gameId === "adopt-me" && isLegacyGameSchemaError(ownedListingResult.error)) {
      ownedListingResult = await client
        .from("marketplace_listings")
        .select("*,marketplace_listing_items(*)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100);
    }

    if (!mountedRef.current) return;
    setInventory(gameId === "adopt-me" ? (inventoryResult.data ?? []) as InventoryExchangeRow[] : []);
    setWishlistIds(gameId === "adopt-me" ? new Set((wishlistResult.data ?? []).map((row) => String(row.item_id))) : new Set());
    setPreferences(gameId === "adopt-me" && preferencesResult.data ? { ...DEFAULT_MARKETPLACE_PREFERENCES, ...(preferencesResult.data as MarketplacePreferences) } : DEFAULT_MARKETPLACE_PREFERENCES);
    setOffers(((offerResult.data ?? []) as DbOffer[]).map(normalizeOffer).filter((row) => row.game_id === gameId));
    setOwnedListings(((ownedListingResult.data ?? []) as DbListing[]).map(normalizeListing).filter((row) => row.game_id === gameId));
    setRooms(((roomResult.data ?? []) as Array<ExchangeRoomRow & { game_id?: CSBTGameId }>).map((row) => ({ ...row, game_id: row.game_id ?? "adopt-me" })).filter((row) => row.game_id === gameId));
    setBlockedIds(new Set((blockResult.data ?? []).map((row) => String(row.blocked_id))));
  }, [gameId]);

  const clearPrivate = useCallback(() => {
    setInventory([]);
    setWishlistIds(new Set());
    setOffers([]);
    setOwnedListings([]);
    setRooms([]);
    setBlockedIds(new Set());
    setPreferences(DEFAULT_MARKETPLACE_PREFERENCES);
  }, []);

  const reload = useCallback(async () => {
    const client = supabase;
    if (!client) return;
    setLoading(true);
    setError(null);
    try {
      await loadPublic(client);
      if (user) await loadPrivate(client, user.id);
      else clearPrivate();
    } catch (caught) {
      if (mountedRef.current) setError(caught instanceof Error ? caught.message : "Could not load CSBT Exchange.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [clearPrivate, loadPrivate, loadPublic, supabase, user]);

  const refreshListing = useCallback(async (id: string) => {
    const client = supabase;
    if (!client || !id) return;
    const { data, error: listingError } = await client.from("marketplace_listings").select("*,marketplace_listing_items(*)").eq("id", id).maybeSingle();
    if (listingError) { setError(listingError.message); return; }
    if (!mountedRef.current) return;
    if (!data) {
      setListings((current) => current.filter((row) => row.id !== id));
      setOwnedListings((current) => current.filter((row) => row.id !== id));
      return;
    }
    const listing = normalizeListing(data as DbListing);
    if (listing.game_id !== gameId) {
      setListings((current) => current.filter((row) => row.id !== id));
      setOwnedListings((current) => current.filter((row) => row.id !== id));
      return;
    }
    const isOpen = listing.status === "OPEN" && new Date(listing.expires_at).getTime() > Date.now();
    setListings((current) => isOpen ? upsertById(current, listing) : current.filter((row) => row.id !== id));
    if (user?.id === listing.user_id) setOwnedListings((current) => upsertById(current, listing, 100));
    await loadTrustForUsers(client, [listing.user_id]);
  }, [gameId, loadTrustForUsers, supabase, user?.id]);

  const refreshOffer = useCallback(async (id: string) => {
    const client = supabase;
    if (!client || !user || !id) return;
    let result = await client.from("marketplace_offers").select("*,marketplace_offer_items(*),marketplace_listings(*,marketplace_listing_items(*))").eq("id", id).eq("game_id", gameId).maybeSingle();
    if (result.error && gameId === "adopt-me" && isLegacyGameSchemaError(result.error)) {
      result = await client.from("marketplace_offers").select("*,marketplace_offer_items(*),marketplace_listings(*,marketplace_listing_items(*))").eq("id", id).maybeSingle();
    }
    if (result.error) { setError(result.error.message); return; }
    if (!mountedRef.current) return;
    if (!result.data) { setOffers((current) => current.filter((row) => row.id !== id)); return; }
    const offer = normalizeOffer(result.data as DbOffer);
    if (offer.game_id !== gameId) return;
    if (offer.sender_id !== user.id && offer.recipient_id !== user.id) return;
    setOffers((current) => upsertById(current, offer, 100));
  }, [gameId, supabase, user]);

  const refreshRoom = useCallback(async (id: string) => {
    const client = supabase;
    if (!client || !user || !id) return;
    let result = await client.from("trade_rooms").select("id,game_id,listing_id,accepted_offer_id,user_a,user_b,status,lock_snapshot,completed_by_a,completed_by_b,created_at,updated_at").eq("id", id).eq("game_id", gameId).maybeSingle();
    if (result.error && gameId === "adopt-me" && isLegacyGameSchemaError(result.error)) {
      result = await client.from("trade_rooms").select("id,listing_id,accepted_offer_id,user_a,user_b,status,lock_snapshot,completed_by_a,completed_by_b,created_at,updated_at").eq("id", id).maybeSingle() as typeof result;
    }
    if (result.error) { setError(result.error.message); return; }
    if (!mountedRef.current) return;
    if (!result.data) { setRooms((current) => current.filter((row) => row.id !== id)); return; }
    const room = { ...(result.data as ExchangeRoomRow & { game_id?: CSBTGameId }), game_id: (result.data as ExchangeRoomRow & { game_id?: CSBTGameId }).game_id ?? "adopt-me" } as ExchangeRoomRow;
    if (room.game_id !== gameId) return;
    if (room.user_a !== user.id && room.user_b !== user.id) return;
    setRooms((current) => upsertById(current, room, 100));
  }, [gameId, supabase, user]);

  const refreshPrivate = useCallback(async () => {
    if (!supabase || !user) return;
    try { await loadPrivate(supabase, user.id); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not refresh your Exchange activity."); }
  }, [loadPrivate, supabase, user]);

  useEffect(() => { if (!authLoading) void queueMicrotask(() => reload()); }, [authLoading, reload]);

  useEffect(() => {
    const client = supabase;
    if (!client) return;

    const listingChange = (payload: RealtimePayload) => {
      const id = payloadId(payload);
      if (!id) return;
      if (payload.eventType === "DELETE") {
        setListings((current) => current.filter((row) => row.id !== id));
        setOwnedListings((current) => current.filter((row) => row.id !== id));
      } else void refreshListing(id);
    };
    const offerChange = (payload: RealtimePayload) => {
      const id = payloadId(payload);
      if (!id || !user) return;
      if (payload.eventType === "DELETE") setOffers((current) => current.filter((row) => row.id !== id));
      else void refreshOffer(id);
    };
    const roomChange = (payload: RealtimePayload) => {
      const id = payloadId(payload);
      if (!id || !user) return;
      if (payload.eventType === "DELETE") setRooms((current) => current.filter((row) => row.id !== id));
      else void refreshRoom(id);
    };

    const channel = client
      .channel(`csbt-exchange-live-${gameId}-${user?.id ?? "public"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "marketplace_listings" }, listingChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "marketplace_listing_items" }, (payload) => {
        const record = payload.eventType === "DELETE" ? payload.old : payload.new;
        const listingId = record && "listing_id" in record ? String(record.listing_id ?? "") : "";
        if (listingId) void refreshListing(listingId);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "marketplace_offers" }, offerChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "marketplace_offer_items" }, (payload) => {
        const record = payload.eventType === "DELETE" ? payload.old : payload.new;
        const offerId = record && "offer_id" in record ? String(record.offer_id ?? "") : "";
        if (offerId && user) void refreshOffer(offerId);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "trade_rooms" }, roomChange)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "marketplace_events" }, (payload) => {
        if (!loadMarketEvents) return;
        const raw = payload.new as ExchangeMarketEvent & { game_id?: CSBTGameId };
        if (!raw?.id) return;
        const event: ExchangeMarketEvent = { ...raw, game_id: raw.game_id ?? "adopt-me" };
        if (event.game_id !== gameId) return;
        setEvents((current) => [event, ...current.filter((row) => row.id !== event.id)].slice(0, 600));
      })
      .subscribe();

    return () => { void client.removeChannel(channel); };
  }, [gameId, loadMarketEvents, refreshListing, refreshOffer, refreshRoom, supabase, user]);

  return {
    listings,
    offers,
    ownedListings,
    rooms,
    inventory,
    wishlistIds,
    preferences,
    setPreferences,
    trust,
    events,
    blockedIds,
    loading,
    error,
    setError,
    reload,
    refreshPrivate,
    refreshListing,
    refreshOffer,
    refreshRoom,
  };
}

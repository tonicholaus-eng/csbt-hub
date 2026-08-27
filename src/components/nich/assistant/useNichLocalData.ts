"use client";

import { useEffect, useState } from "react";

import { useAuthSession } from "../../../hooks/useAuthSession";
import { getSupabaseBrowserClient } from "../../../lib/supabase/client";
import { sanitizeNichUserMemory, type NichUserMemory } from "../../../lib/nich/tradeSession";
import { DEFAULT_MARKETPLACE_PREFERENCES } from "../../../lib/exchange/matching";
import type {
  ExchangeItem,
  ExchangeListing,
  InventoryExchangeRow,
  MarketplacePreferences,
} from "../../../lib/exchange/types";
import { getItem, getItemById } from "../../../lib/search";
import { detectValueSource } from "../../../lib/valueSystem";
import { findPetsInMessage } from "./tools/petSearch";
import type {
  NichConversationContext,
  NichDemandSignal,
  NichLocalProfileData,
  NichTradeHistoryRow,
  NichValueHistoryRow,
} from "./brain/types";

const GUEST_INVENTORY_KEY = "csbt_inventory_guest_v1";

const EMPTY_DATA: NichLocalProfileData = {
  loaded: false,
  authenticated: false,
  inventory: [],
  wishlistItemIds: [],
  preferences: null,
  exchangeListings: [],
  valueHistory: [],
  recentTrades: [],
  demandSignals: [],
};

type GuestInventoryEntry = {
  itemId?: string;
  valueType?: "NORMAL" | "NEON" | "MEGA";
  potionStatus?: InventoryExchangeRow["potion_status"];
  quantity?: number;
};

type RawListing = Record<string, unknown> & {
  marketplace_listing_items?: unknown;
};


type RawMarketEvent = {
  event_type?: unknown;
  item_id?: unknown;
  metadata?: unknown;
  created_at?: unknown;
};

type DemandApiItem = {
  name?: unknown;
  trend?: unknown;
  updatedAt?: unknown;
};

function buildDemandSignals(events: RawMarketEvent[], trendItems: DemandApiItem[]): NichDemandSignal[] {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const byId = new Map<string, NichDemandSignal>();

  for (const raw of events) {
    const itemId = String(raw.item_id ?? "");
    if (!itemId || !getItemById(itemId)) continue;
    const metadata = raw.metadata && typeof raw.metadata === "object" ? raw.metadata as Record<string, unknown> : {};
    const createdAt = typeof raw.created_at === "string" ? raw.created_at : "";
    const age = createdAt ? now - new Date(createdAt).getTime() : Number.POSITIVE_INFINITY;
    const quantity = Math.max(1, Number(metadata.quantity) || 1);
    const entry = byId.get(itemId) ?? { item_id: itemId, wants24h: 0, accepted7d: 0, activity: "quiet" as const };

    if (raw.event_type === "LISTING_ITEM" && metadata.side === "WANT" && age <= oneDay) entry.wants24h += quantity;
    if (raw.event_type === "ACCEPTED_ITEM") entry.accepted7d += quantity;
    byId.set(itemId, entry);
  }

  for (const raw of trendItems) {
    if (typeof raw.name !== "string") continue;
    const item = getItem(raw.name);
    if (!item) continue;
    const trend = raw.trend === "rising" || raw.trend === "dropping" || raw.trend === "mixed" || raw.trend === "stable" ? raw.trend : undefined;
    const entry = byId.get(item.ID) ?? { item_id: item.ID, wants24h: 0, accepted7d: 0, activity: "quiet" as const };
    if (trend) entry.externalTrend = trend;
    if (typeof raw.updatedAt === "string") entry.externalUpdatedAt = raw.updatedAt;
    byId.set(item.ID, entry);
  }

  for (const entry of byId.values()) {
    const weight = entry.wants24h * 3 + entry.accepted7d * 2;
    entry.activity = weight >= 18 ? "hot" : weight >= 8 ? "active" : weight >= 2 ? "normal" : "quiet";
  }

  return Array.from(byId.values());
}

function normalizeInventoryQuantity(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 1;
  return Math.max(1, Math.min(999, Math.round(numeric)));
}

function readGuestInventory(): InventoryExchangeRow[] {
  try {
    const saved = window.localStorage.getItem(GUEST_INVENTORY_KEY);
    const parsed = saved ? (JSON.parse(saved) as GuestInventoryEntry[]) : [];
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((entry) => {
      const itemId = String(entry.itemId ?? "");
      const item = getItemById(itemId);
      if (!item) return [];
      return [{
        item_id: item.ID,
        item_name: item.NAME,
        image_url: item.IMAGE || null,
        category: item.CATEGORY,
        value_type: entry.valueType === "NEON" || entry.valueType === "MEGA" ? entry.valueType : "NORMAL",
        potion_status: entry.potionStatus ?? "BASE",
        quantity: normalizeInventoryQuantity(entry.quantity),
      } satisfies InventoryExchangeRow];
    });
  } catch {
    return [];
  }
}

function normalizeExchangeItem(value: unknown): ExchangeItem | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const itemId = String(row.item_id ?? "");
  const canonical = getItemById(itemId);
  if (!itemId || !canonical) return null;
  const valueType = row.value_type === "NEON" || row.value_type === "MEGA" ? row.value_type : "NORMAL";
  const side = row.side === "WANT" ? "WANT" : "HAVE";
  const snapshot = Number(row.snapshot_value);

  return {
    item_id: itemId,
    item_name: String(row.item_name ?? canonical.NAME),
    image_url: typeof row.image_url === "string" ? row.image_url : canonical.IMAGE || null,
    category: canonical.CATEGORY,
    value_type: valueType,
    potion_status:
      row.potion_status === "NO_POTION" || row.potion_status === "RIDE" || row.potion_status === "FLY" || row.potion_status === "FLY_RIDE"
        ? row.potion_status
        : "BASE",
    quantity: normalizeInventoryQuantity(row.quantity),
    snapshot_value: Number.isFinite(snapshot) ? snapshot : null,
    demand_tier: typeof row.demand_tier === "string" ? row.demand_tier : canonical.DEMAND_TIER ?? null,
    side,
  };
}

function normalizeListing(value: RawListing): ExchangeListing | null {
  const id = String(value.id ?? "");
  const userId = String(value.user_id ?? "");
  if (!id || !userId) return null;
  const rawItems = Array.isArray(value.marketplace_listing_items)
    ? value.marketplace_listing_items
    : Array.isArray(value.items)
      ? value.items
      : [];
  const items = rawItems.map(normalizeExchangeItem).filter((item): item is ExchangeItem => item !== null);

  return {
    id,
    // Legacy Adopt Me rows predate multi-game scoping and have no game_id.
    // Mirrors the fallback used by useExchangeData.normalizeListing.
    game_id: value.game_id === "mm2" ? "mm2" : "adopt-me",
    user_id: userId,
    display_name: String(value.display_name ?? "CSBT Member"),
    value_source: value.value_source === "ELVE" ? "ELVE" : "GCASH",
    intent:
      value.intent === "SPECIFIC" || value.intent === "SIMILAR_VALUE" || value.intent === "UPGRADE" || value.intent === "DOWNGRADE" || value.intent === "WISHLIST"
        ? value.intent
        : "OPEN_OFFERS",
    status: "OPEN",
    title: typeof value.title === "string" ? value.title : null,
    note: typeof value.note === "string" ? value.note : null,
    preferences: value.preferences && typeof value.preferences === "object" ? value.preferences as Record<string, unknown> : {},
    allow_counteroffers: value.allow_counteroffers !== false,
    expires_at: String(value.expires_at ?? ""),
    created_at: String(value.created_at ?? ""),
    updated_at: String(value.updated_at ?? value.created_at ?? ""),
    items,
  };
}

export default function useNichLocalData(enabled: boolean) {
  const { supabase, user, loading: authLoading } = useAuthSession();
  const [data, setData] = useState<NichLocalProfileData>(EMPTY_DATA);

  useEffect(() => {
    if (!enabled || authLoading) return;
    let active = true;

    void (async () => {
      const guestInventory = !user ? readGuestInventory() : [];
      if (!supabase) {
        if (active) setData({ ...EMPTY_DATA, loaded: true, inventory: guestInventory });
        return;
      }

      try {
        const listingPromise = supabase
          .from("marketplace_listings")
          .select("*,marketplace_listing_items(*)")
          .eq("status", "OPEN")
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(100);

        const inventoryPromise = user
          ? supabase.from("inventory_items").select("id,item_id,item_name,image_url,category,value_type,potion_status,quantity").eq("user_id", user.id)
          : Promise.resolve({ data: guestInventory, error: null });
        const wishlistPromise = user
          ? supabase.from("wishlist_items").select("item_id").eq("user_id", user.id)
          : Promise.resolve({ data: [], error: null });
        const preferencesPromise = user
          ? supabase.from("marketplace_preferences").select("*").eq("user_id", user.id).maybeSingle()
          : Promise.resolve({ data: null, error: null });
        const tradesPromise = user
          ? supabase.from("trade_history").select("id,value_source,your_items,their_items,your_total,their_total,verdict,status,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50)
          : Promise.resolve({ data: [], error: null });
        const nichMemoryPromise = user
          ? supabase.from("nich_user_memory").select("aliases,preferred_value_source,response_style,updated_at").eq("user_id", user.id).maybeSingle()
          : Promise.resolve({ data: null, error: null });
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const marketEventsPromise = supabase
          .from("marketplace_events")
          .select("event_type,item_id,metadata,created_at")
          .in("event_type", ["LISTING_ITEM", "ACCEPTED_ITEM"])
          .gte("created_at", sevenDaysAgo)
          .order("created_at", { ascending: false })
          .limit(1500);
        const demandTrendPromise = fetch("/api/demand")
          .then(async (response) => response.ok ? await response.json() as { items?: DemandApiItem[] } : { items: [] as DemandApiItem[] })
          .catch(() => ({ items: [] as DemandApiItem[] }));

        const [listingResult, inventoryResult, wishlistResult, preferencesResult, tradesResult, nichMemoryResult, marketEventsResult, demandTrendResult] = await Promise.all([
          listingPromise,
          inventoryPromise,
          wishlistPromise,
          preferencesPromise,
          tradesPromise,
          nichMemoryPromise,
          marketEventsPromise,
          demandTrendPromise,
        ]);
        if (!active) return;

        const inventory = ((inventoryResult.data ?? []) as InventoryExchangeRow[]).filter((row) => Boolean(getItemById(String(row.item_id))));
        const wishlistItemIds = (wishlistResult.data ?? []).map((row) => String((row as { item_id: unknown }).item_id)).filter(Boolean);
        const relevantIds = Array.from(new Set([...inventory.map((row) => row.item_id), ...wishlistItemIds])).slice(0, 160);

        let valueHistory: NichValueHistoryRow[] = [];
        if (relevantIds.length) {
          const start = new Date();
          start.setDate(start.getDate() - 45);
          const { data: historyRows } = await supabase
            .from("value_history")
            .select("item_id,item_name,source,value_type,value,snapshot_date")
            .in("item_id", relevantIds)
            .gte("snapshot_date", start.toISOString().slice(0, 10))
            .order("snapshot_date", { ascending: true })
            .limit(3500);
          valueHistory = (historyRows ?? []).flatMap((raw) => {
            const row = raw as Record<string, unknown>;
            const value = row.value == null ? null : Number(row.value);
            if (value !== null && !Number.isFinite(value)) return [];
            return [{
              item_id: String(row.item_id ?? ""),
              item_name: String(row.item_name ?? ""),
              source: row.source === "ELVE" ? "ELVE" : "GCASH",
              value_type: row.value_type === "NEON" || row.value_type === "MEGA" ? row.value_type : "NORMAL",
              value,
              snapshot_date: String(row.snapshot_date ?? ""),
            } satisfies NichValueHistoryRow];
          });
        }

        const exchangeListings = ((listingResult.data ?? []) as RawListing[])
          .map(normalizeListing)
          .filter((listing): listing is ExchangeListing => listing !== null);
        const demandSignals = buildDemandSignals(
          (marketEventsResult.data ?? []) as RawMarketEvent[],
          demandTrendResult.items ?? [],
        );

        const remoteNichMemory = nichMemoryResult.data
          ? sanitizeNichUserMemory({
              aliases: (nichMemoryResult.data as Record<string, unknown>).aliases,
              preferredValueSource: (nichMemoryResult.data as Record<string, unknown>).preferred_value_source,
              responseStyle: (nichMemoryResult.data as Record<string, unknown>).response_style,
              updatedAt: new Date(String((nichMemoryResult.data as Record<string, unknown>).updated_at ?? Date.now())).getTime(),
            })
          : undefined;

        setData({
          loaded: true,
          authenticated: Boolean(user),
          ...(user ? { userId: user.id } : {}),
          ...(remoteNichMemory ? { nichMemory: remoteNichMemory } : {}),
          inventory,
          wishlistItemIds,
          preferences: preferencesResult.data
            ? { ...DEFAULT_MARKETPLACE_PREFERENCES, ...(preferencesResult.data as MarketplacePreferences) }
            : DEFAULT_MARKETPLACE_PREFERENCES,
          exchangeListings,
          valueHistory,
          recentTrades: (tradesResult.data ?? []) as NichTradeHistoryRow[],
          demandSignals,
        });
      } catch {
        if (active) {
          setData({ ...EMPTY_DATA, loaded: true, authenticated: Boolean(user), inventory: guestInventory });
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [authLoading, enabled, supabase, user]);

  return data;
}

/** Fetch a specific value-history series only when the current message needs
 * it. This keeps the initial NICH snapshot light while still allowing direct
 * questions such as "is Frost rising?" without an AI call. */
export async function enrichNichLocalDataForMessage(
  data: NichLocalProfileData,
  message: string,
  context: NichConversationContext,
): Promise<NichLocalProfileData> {
  const normalized = message.toLowerCase();
  if (!/(?:rising|falling|going up|going down|trend|trending|went up|went down|increased|decreased|tumaas|tumataas|bumaba|bumababa|umaakyat|pababa)/i.test(normalized)) {
    return data;
  }

  const direct = findPetsInMessage(message)[0]?.pet;
  const contextual = context.lastPetName ? getItem(context.lastPetName) : undefined;
  const item = direct ?? contextual;
  if (!item) return data;

  const source = detectValueSource(message, context.lastValueSource ?? data.preferences?.value_source ?? "GCASH");
  const valueType = /\b(?:mega|mfr)\b/i.test(message) ? "MEGA" : /\b(?:neon|nfr)\b/i.test(message) ? "NEON" : "NORMAL";
  if (data.valueHistory.some((row) => row.item_id === item.ID && row.source === source && row.value_type === valueType)) {
    return data;
  }

  try {
    const params = new URLSearchParams({ itemId: item.ID, source, type: valueType, days: "45" });
    const response = await fetch(`/api/value-history?${params.toString()}`);
    if (!response.ok) return data;
    const payload = await response.json() as { points?: Array<{ date?: unknown; value?: unknown }> };
    const rows: NichValueHistoryRow[] = (payload.points ?? []).flatMap((point) => {
      const value = Number(point.value);
      const date = typeof point.date === "string" ? point.date : "";
      if (!date || !Number.isFinite(value)) return [];
      return [{
        item_id: item.ID,
        item_name: item.NAME,
        source,
        value_type: valueType,
        value,
        snapshot_date: date,
      }];
    });
    return rows.length ? { ...data, valueHistory: [...data.valueHistory, ...rows] } : data;
  } catch {
    return data;
  }
}


/** Persist only explicit, privacy-limited NICH preferences. Active trades, chat
 * messages and screenshots are deliberately not written to this table. */
export async function persistNichUserMemoryToSupabase(userId: string | undefined, memory: NichUserMemory | undefined) {
  if (!userId || !memory) return false;
  const supabase = getSupabaseBrowserClient();
  const sanitized = sanitizeNichUserMemory(memory);
  if (!supabase || !sanitized) return false;
  const { error } = await supabase.from("nich_user_memory").upsert({
    user_id: userId,
    aliases: sanitized.aliases ?? {},
    preferred_value_source: sanitized.preferredValueSource ?? null,
    response_style: sanitized.responseStyle ?? null,
    updated_at: new Date(sanitized.updatedAt ?? Date.now()).toISOString(),
  }, { onConflict: "user_id" });
  return !error;
}

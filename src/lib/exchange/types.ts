import type { ItemCategory, ValueSource, ValueType, PotionValueStatus } from "../../components/trade/types";

export type ExchangePotionStatus = "BASE" | PotionValueStatus;
export type ListingIntent = "SPECIFIC" | "SIMILAR_VALUE" | "UPGRADE" | "DOWNGRADE" | "WISHLIST" | "OPEN_OFFERS";
export type ListingStatus = "OPEN" | "PAUSED" | "MATCHED" | "CLOSED" | "EXPIRED";
export type OfferStatus = "PENDING" | "COUNTERED" | "ACCEPTED" | "DECLINED" | "WITHDRAWN" | "SUPERSEDED";
export type RoomStatus = "OFFER_LOCKED" | "CONNECTING" | "JOINED" | "COMPLETED" | "DISPUTED" | "CANCELLED";

export type ExchangeItem = {
  id?: string;
  item_id: string;
  item_name: string;
  image_url: string | null;
  category: ItemCategory | string;
  value_type: ValueType;
  potion_status: ExchangePotionStatus;
  quantity: number;
  snapshot_value: number | null;
  demand_tier?: string | null;
  side?: "HAVE" | "WANT" | "SENDER" | "RECIPIENT";
};

export type ExchangeListing = {
  id: string;
  user_id: string;
  display_name: string;
  value_source: ValueSource;
  intent: ListingIntent;
  status: ListingStatus;
  title: string | null;
  note: string | null;
  preferences: Record<string, unknown>;
  allow_counteroffers: boolean;
  expires_at: string;
  created_at: string;
  updated_at: string;
  items: ExchangeItem[];
};

export type ExchangeOffer = {
  id: string;
  listing_id: string;
  sender_id: string;
  recipient_id: string;
  parent_offer_id: string | null;
  status: OfferStatus;
  value_source: ValueSource;
  sender_total: number;
  recipient_total: number;
  compatibility_score: number | null;
  explanation: Record<string, unknown>;
  note: string | null;
  created_at: string;
  updated_at: string;
  items: Array<ExchangeItem & { side: "SENDER" | "RECIPIENT" }>;
  listing?: ExchangeListing | null;
};

export type InventoryExchangeRow = {
  id?: string;
  item_id: string;
  item_name?: string;
  image_url?: string | null;
  category?: string;
  value_type: ValueType;
  potion_status: ExchangePotionStatus;
  quantity: number;
};

export type MarketplacePreferences = {
  value_source: ValueSource;
  prefer_upgrades: boolean;
  prefer_downgrades: boolean;
  prefer_high_demand: boolean;
  prefer_overpays: boolean;
  avoid_randoms: boolean;
  avoid_hard_to_trade: boolean;
  accepts_pets: boolean;
  accepts_petwear: boolean;
  accepts_vehicles: boolean;
  accepts_food: boolean;
  accepts_gifts: boolean;
  accepts_strollers: boolean;
  accepts_toys: boolean;
  accepts_stickers: boolean;
  accepts_other: boolean;
  min_match_score: number;
};

export type MatchBreakdown = {
  inventory: number;
  value: number;
  wishlist: number;
  demand: number;
  preferences: number;
  freshness: number;
};

export type ListingMatch = {
  listing: ExchangeListing;
  score: number;
  label: "Excellent Match" | "Strong Match" | "Possible Match" | "Normal Listing";
  breakdown: MatchBreakdown;
  reasons: string[];
  estimatedInventoryValue: number;
  targetValue: number;
};

export type OfferSuggestion = {
  id: "fair" | "demand" | "lowball" | "competitive";
  label: string;
  description: string;
  items: ExchangeItem[];
  total: number;
  target: number;
  differencePercent: number;
};

export type TrustStats = {
  user_id: string;
  display_name: string;
  avatar_path: string | null;
  roblox_username: string | null;
  roblox_verified: boolean;
  account_age_days?: number;
  completed_trades: number;
  total_rooms?: number;
  completion_rate?: number | null;
  review_count: number;
  avg_rating: number | null;
  middleman_trades?: number;
  upheld_reports?: number;
  trust_score: number;
};

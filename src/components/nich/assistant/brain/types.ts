import type { NichReactionKey } from "../../NichReactions";
import type { ValueType } from "../../../trade/types";
import type {
  ExchangeListing,
  InventoryExchangeRow,
  MarketplacePreferences,
} from "../../../../lib/exchange/types";

export type PetVariant = "normal" | "neon" | "mega";

export type NichValueSource = "GCASH" | "ELVE";

export type NichPotionStatus =
  | "flyRide"
  | "flyOnly"
  | "rideOnly"
  | "unspecified";

export type NichSuggestion = {
  id: string;
  label: string;
  message: string;
};

export type NichNavigationPath =
  | "/"
  | "/values"
  | "/calculator"
  | "/nich"
  | "/about"
  | "/community"
  | "/seminar"
  | "/trading-servers"
  | "/inventory"
  | "/wishlist"
  | "/exchange"
  | "/demand"
  | "/profile"
  | "/trades"
  | "/trade-feed";

export type NichNavigationAction = {
  href: string;
  label: string;
  delay?: number;
};

export type NichTradeItem = {
  petName: string;
  variant: PetVariant;

  /** FR, NFR, MFR, F, R, NF, NR, MF, MR, or a normal variant code. */
  petCode: string;
  potionStatus: NichPotionStatus;

  /** Original database value before potion adjustments. */
  baseValue: number;
  baseDisplayValue: string;

  /** Missing Fly = -20, missing Ride = -10. */
  potionAdjustment: number;

  /** Final value used by the W/F/L calculator. */
  value: number;
  displayValue: string;

  /** True when no Fly/Ride letters were supplied. */
  hasNoPotionWarning: boolean;
};

export type NichTradeComparison = {
  offeredItems: NichTradeItem[];
  requestedItems: NichTradeItem[];

  /** Backward-compatible first items. */
  offered: NichTradeItem;
  requested: NichTradeItem;

  offeredValue: number;
  requestedValue: number;
  difference: number;
  differencePercent: number;
  verdict: "win" | "fair" | "lose";
  valueSource?: NichValueSource;
};

export type NichContextPet = {
  petName: string;
  variant?: PetVariant;
  value?: number;
  displayValue?: string;
};

export type NichConversationContext = {
  /** Most recently focused individual item. */
  lastPetName?: string;
  lastVariant?: PetVariant;

  /** Ordered items from the latest lookup, ranking, nearby search, or trade. */
  recentPets?: NichContextPet[];

  /** Last value used by nearby-search follow-ups. */
  lastNumericValue?: number;

  /** Last explicitly selected value system. GCash remains the default. */
  lastValueSource?: NichValueSource;

  /** Last completed deterministic W/F/L result. */
  lastTradeComparison?: NichTradeComparison;

  lastIntent?: NichIntent;
  lastUserMessage?: string;
  lastResolvedMessage?: string;
  /** Persistent local trading goal used by deterministic follow-ups. */
  tradingGoal?: NichTradingGoal;
  turnCount?: number;
  lastUpdatedAt?: number;
};

export type NichTradingGoal = {
  targetItemId?: string;
  targetItemName?: string;
  valueSource?: NichValueSource;
  objective?:
    | "FAIR"
    | "LOWBALL"
    | "COMPETITIVE"
    | "HIGH_DEMAND"
    | "UPGRADE"
    | "DOWNGRADE";
  excludedItemIds?: string[];
  preferredItemIds?: string[];
  allowedCategories?: string[];
  excludedCategories?: string[];
  allowedValueTypes?: ValueType[];
  minUnitValue?: number;
  maxUnitValue?: number;
  maxCopiesPerItem?: number;
  preferFewItems?: boolean;
  preferManyItems?: boolean;
  maxItems?: number;
  highDemandOnly?: boolean;
  minimumDemandTier?: "S" | "A" | "B" | "C" | "D";
  avoidOverpay?: boolean;
};

export type NichValueHistoryRow = {
  item_id: string;
  item_name: string;
  source: NichValueSource;
  value_type: ValueType;
  value: number | null;
  snapshot_date: string;
};

export type NichDemandSignal = {
  item_id: string;
  wants24h: number;
  accepted7d: number;
  activity: "hot" | "active" | "normal" | "quiet";
  externalTrend?: "rising" | "dropping" | "mixed" | "stable";
  externalUpdatedAt?: string;
};

export type NichTradeHistoryRow = {
  id: string;
  value_source: NichValueSource;
  your_items: unknown[];
  their_items: unknown[];
  your_total: number;
  their_total: number;
  verdict: string;
  status: string;
  created_at: string;
};

/**
 * User-specific data that NICH can reason over locally. It is loaded by the
 * browser from the same CSBT account data already used by Inventory/Exchange.
 * No paid AI provider is required for these capabilities.
 */
export type NichLocalProfileData = {
  loaded: boolean;
  authenticated: boolean;
  inventory: InventoryExchangeRow[];
  wishlistItemIds: string[];
  preferences: MarketplacePreferences | null;
  exchangeListings: ExchangeListing[];
  valueHistory: NichValueHistoryRow[];
  recentTrades: NichTradeHistoryRow[];
  demandSignals: NichDemandSignal[];
};

export type NichIntent =
  | "greeting"
  | "goodbye"
  | "thanks"
  | "help"
  | "petLookup"
  | "nearbyValue"
  | "calculatorHelp"
  | "tradeAdvice"
  | "tradeComparison"
  | "inventory"
  | "offerBuilder"
  | "wishlist"
  | "exchange"
  | "valueHistory"
  | "counterOffer"
  | "tradingProfile"
  | "navigation"
  | "fallback";

export type NichResponse = {
  text: string;
  intent: NichIntent;
  reaction: NichReactionKey;
  /** Deterministic confidence used to avoid unnecessary paid-AI calls. */
  localConfidence?: number;
  /** Explicit opt-out for AI rewriting when local CSBT logic is authoritative. */
  aiEligible?: boolean;
  typingDuration?: number;
  suggestions?: NichSuggestion[];
  context?: Partial<NichConversationContext>;
  tradeComparison?: NichTradeComparison;
  navigation?: NichNavigationAction;
};

export type NichBrainInput = {
  message: string;
  context: NichConversationContext;
  localData?: NichLocalProfileData;
};

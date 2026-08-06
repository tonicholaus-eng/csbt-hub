import type { NichReactionKey } from "../../NichReactions";

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
  | "/trading-servers";

export type NichNavigationAction = {
  href: NichNavigationPath;
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
  turnCount?: number;
  lastUpdatedAt?: number;
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
  | "navigation"
  | "fallback";

export type NichResponse = {
  text: string;
  intent: NichIntent;
  reaction: NichReactionKey;
  typingDuration?: number;
  suggestions?: NichSuggestion[];
  context?: Partial<NichConversationContext>;
  tradeComparison?: NichTradeComparison;
  navigation?: NichNavigationAction;
};

export type NichBrainInput = {
  message: string;
  context: NichConversationContext;
};

import type { NichReactionKey } from "../../NichReactions";

export type PetVariant =
  | "normal"
  | "neon"
  | "mega";

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

export type NichTradeItem = {
  petName: string;
  variant: PetVariant;

  /**
   * Short trade code such as:
   * FR, NFR, MFR, F, R, NF, NR, MF, or MR.
   */
  petCode: string;

  /**
   * Potion information detected from the trade message.
   */
  potionStatus: NichPotionStatus;

  /**
   * Original database value before potion adjustments.
   */
  baseValue: number;
  baseDisplayValue: string;

  /**
   * Adjustment caused by a missing potion.
   *
   * Missing Fly: -20
   * Missing Ride: -10
   */
  potionAdjustment: number;

  /**
   * Final value used by the W/F/L calculation.
   */
  value: number;
  displayValue: string;

  /**
   * True when no potion letters were provided.
   *
   * The original value is used, but Nich displays a warning.
   */
  hasNoPotionWarning: boolean;
};

export type NichTradeComparison = {
  offered: NichTradeItem;
  requested: NichTradeItem;
  offeredValue: number;
  requestedValue: number;
  difference: number;
  differencePercent: number;
  verdict: "win" | "fair" | "lose";
};

export type NichContextPet = {
  petName: string;
  variant?: PetVariant;
  value?: number;
  displayValue?: string;
};

export type NichConversationContext = {
  /**
   * The most recently referenced individual pet.
   */
  lastPetName?: string;

  /**
   * The most recently referenced pet variant.
   */
  lastVariant?: PetVariant;

  /**
   * Ordered pets from the latest lookup or comparison.
   *
   * This allows follow-ups such as:
   * - "the first one"
   * - "the second pet"
   * - "compare those"
   */
  recentPets?: NichContextPet[];

  /**
   * Most recently relevant numeric pet value.
   *
   * Used for follow-ups such as:
   * - "show pets around that value"
   */
  lastNumericValue?: number;

  /**
   * The most recent completed trade comparison.
   */
  lastTradeComparison?: NichTradeComparison;

  /**
   * The intent that answered the previous message.
   */
  lastIntent?: NichIntent;

  /**
   * The user's previous original message.
   */
  lastUserMessage?: string;

  /**
   * The message after contextual references were resolved.
   */
  lastResolvedMessage?: string;

  /**
   * Number of completed user-assistant turns.
   */
  turnCount?: number;

  /**
   * Timestamp of the most recent context update.
   */
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
};

export type NichBrainInput = {
  message: string;
  context: NichConversationContext;
};
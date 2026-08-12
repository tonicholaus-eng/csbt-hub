export type ValueType = "NORMAL" | "NEON" | "MEGA";

export type ValueSource = "GCASH" | "ELVE";

export type PotionValueStatus = "NO_POTION" | "RIDE" | "FLY" | "FLY_RIDE";

export type TradeValue = string | number | null | undefined;

export type ItemCategory =
  | "PET"
  | "PETWEAR"
  | "EGG"
  | "VEHICLE"
  | "FOOD"
  | "GIFT"
  | "STROLLER"
  | "TOY"
  | "STICKER"
  | "OTHER";

export type DemandTier = "S" | "A" | "B" | "C" | "D";

export type TradeItem = {
  ID: string;
  NAME: string;
  IMAGE: string;
  CATEGORY: ItemCategory;

  GCASH_NORMAL?: TradeValue;
  GCASH_NEON?: TradeValue;
  GCASH_MEGA?: TradeValue;

  ELVE_NORMAL?: TradeValue;
  ELVE_NEON?: TradeValue;
  ELVE_MEGA?: TradeValue;

  /** Backward-compatible GCash aliases. */
  NORMAL: TradeValue;
  NEON?: TradeValue;
  MEGA?: TradeValue;

  RARITY?: string | null;
  DEMAND_TIER?: DemandTier | null;
  UPDATED_AT?: string | null;

  /** Explicit potion-specific values, only when the source actually supplies them. */
  POTION_VALUES?: Partial<
    Record<
      ValueSource,
      Partial<Record<ValueType, Partial<Record<PotionValueStatus, TradeValue>>>>
    >
  >;

  /** Backward-compatible Elve regular alias. */
  INGAME_VALUE?: TradeValue;
};

export type SelectedTradeItem = {
  id: string;
  item: TradeItem;
  valueType: ValueType;
};

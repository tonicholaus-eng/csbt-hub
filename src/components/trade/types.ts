export type ValueType =
  | "NORMAL"
  | "NEON"
  | "MEGA";

export type ValueSource =
  | "GCASH"
  | "ELVE";

export type TradeValue =
  | string
  | number
  | null
  | undefined;

export type ItemCategory =
  | "PET"
  | "PETWEAR"
  | "EGG"
  | "TOY";

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

  /** Backward-compatible Elve regular alias. */
  INGAME_VALUE?: TradeValue;
};

export type SelectedTradeItem = {
  id: string;
  item: TradeItem;
  valueType: ValueType;
};

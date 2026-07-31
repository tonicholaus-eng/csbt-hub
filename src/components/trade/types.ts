export type ValueType =
  | "NORMAL"
  | "NEON"
  | "MEGA";


export type TradeValue =
  | string
  | number
  | null
  | undefined;


export type ItemCategory =
  | "PET"
  | "PETWEAR";


export type TradeItem = {
  ID: string;

  NAME: string;

  IMAGE: string;

  CATEGORY: ItemCategory;

  NORMAL: TradeValue;

  NEON?: TradeValue;

  MEGA?: TradeValue;
};


export type SelectedTradeItem = {
  id: string;

  item: TradeItem;

  valueType: ValueType;
};
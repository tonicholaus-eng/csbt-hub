export type ValueType =
  | "NORMAL"
  | "NEON"
  | "MEGA";

export type TradeValue =
  | string
  | number
  | null
  | undefined;

export type TradePet = {
  PETS: string;
  IMAGE: string;
  NORMAL: TradeValue;
  NEON: TradeValue;
  MEGA: TradeValue;
};

export type SelectedTradePet = {
  id: string;
  pet: TradePet;
  valueType: ValueType;
};
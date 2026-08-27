export type MM2ValueSource = "SUPREME" | "GCASH";

export type MM2Item = {
  ID?: string;
  NAME: string;
  IMAGE?: string;
  TYPE?: string;
  CATEGORY?: string;
  SOURCE_VALUE?: number | null;
  GCASH_VALUE?: number | null;
  DEMAND?: number | null;
};

export type MM2SelectedTradeItem = {
  id: string;
  item: MM2Item;
  quantity: number;
};

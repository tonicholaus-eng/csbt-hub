export type CSBTGameId = "adopt-me" | "mm2";
export type CSBTGameScope = CSBTGameId | "all";
export type CSBTValueSource = "GCASH" | "ELVE" | "SUPREME";
export type CSBTItemVariant = "NORMAL" | "NEON" | "MEGA";

export type CSBTGameItem = {
  id: string;
  name: string;
  image: string | null;
  category: string;
  rarity?: string | null;
  demandLabel?: string | null;
  demandScore?: number | null;
  raw: unknown;
};

export type CSBTGameAdapter = {
  id: CSBTGameId;
  shortName: string;
  name: string;
  icon: string;
  description: string;
  homeHref: string;
  valuesHref: string;
  calculatorHref: string;
  demandHref: string;
  valueSources: Array<{ id: CSBTValueSource; label: string; shortLabel: string; symbol: string }>;
  items: CSBTGameItem[];
  getItem: (idOrName: string) => CSBTGameItem | undefined;
  searchItems: (query: string, limit?: number) => CSBTGameItem[];
  getVariants: (item: CSBTGameItem, source: CSBTValueSource) => CSBTItemVariant[];
  getValue: (item: CSBTGameItem, source: CSBTValueSource, variant?: CSBTItemVariant) => number | null;
  getDemandLabel: (item: CSBTGameItem) => string | null;
  itemProfileHref: (item: CSBTGameItem) => string;
};

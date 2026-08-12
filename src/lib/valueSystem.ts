import type {
  TradeItem,
  TradeValue,
  ValueSource,
  ValueType,
  PotionValueStatus,
} from "../components/trade/types";

export const VALUE_SOURCE_LABELS: Record<ValueSource, string> = {
  GCASH: "GCash Value",
  ELVE: "Elve Shark Value",
};

export const VALUE_SOURCE_SHORT_LABELS: Record<ValueSource, string> = {
  GCASH: "GCash",
  ELVE: "Elve Shark",
};

export function getItemValue(
  item: TradeItem,
  source: ValueSource,
  valueType: ValueType,
): TradeValue {
  if (source === "ELVE") {
    if (valueType === "NORMAL") return item.ELVE_NORMAL ?? item.INGAME_VALUE;
    if (valueType === "NEON") return item.ELVE_NEON;
    return item.ELVE_MEGA;
  }

  if (valueType === "NORMAL") return item.GCASH_NORMAL ?? item.NORMAL;
  if (valueType === "NEON") return item.GCASH_NEON ?? item.NEON;
  return item.GCASH_MEGA ?? item.MEGA;
}


export function getPotionSpecificValue(
  item: TradeItem,
  source: ValueSource,
  valueType: ValueType,
  potionStatus: PotionValueStatus,
): TradeValue {
  return item.POTION_VALUES?.[source]?.[valueType]?.[potionStatus];
}

export function getInventoryItemValue(
  item: TradeItem,
  source: ValueSource,
  valueType: ValueType,
  potionStatus?: PotionValueStatus | "BASE" | null,
): TradeValue {
  if (potionStatus && potionStatus !== "BASE") {
    const potionValue = getPotionSpecificValue(item, source, valueType, potionStatus);
    if (parseTradeValue(potionValue) !== null) return potionValue;
  }
  return getItemValue(item, source, valueType);
}

export function getAvailablePotionStatuses(
  item: TradeItem,
  source: ValueSource,
  valueType: ValueType,
): PotionValueStatus[] {
  const statuses: PotionValueStatus[] = ["NO_POTION", "RIDE", "FLY", "FLY_RIDE"];
  return statuses.filter((status) => parseTradeValue(getPotionSpecificValue(item, source, valueType, status)) !== null);
}

/** Values are generated as numbers, but this remains defensive for old data. */
export function parseTradeValue(value: TradeValue): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value === null || value === undefined) return null;

  const cleaned = String(value).trim().replace(/,/g, "");
  if (!cleaned) return null;

  const range = cleaned.match(
    /^(-?(?:\d+\.?\d*|\.\d+))\s*(?:-|–|—|to)\s*(-?(?:\d+\.?\d*|\.\d+))/i,
  );
  if (range) {
    const first = Number(range[1]);
    const second = Number(range[2]);
    return Number.isFinite(first) && Number.isFinite(second)
      ? Math.min(first, second)
      : null;
  }

  const single = cleaned.match(/-?(?:\d+\.?\d*|\.\d+)/);
  if (!single) return null;
  const numeric = Number(single[0]);
  return Number.isFinite(numeric) ? numeric : null;
}

export function hasItemValue(
  item: TradeItem,
  source: ValueSource,
  valueType: ValueType,
) {
  const value = parseTradeValue(getItemValue(item, source, valueType));
  return value !== null && value > 0;
}

export function formatTradeValue(value: TradeValue) {
  const numeric = parseTradeValue(value);
  if (numeric === null) return "N/A";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(numeric);
}

export function detectValueSource(
  message: string,
  fallback: ValueSource = "GCASH",
): ValueSource {
  const normalized = message.toLowerCase();
  if (
    /\b(?:elve|elvebredd|in[ -]?game)\b/.test(normalized) ||
    /\bshark\s+(?:value|values|system|mode)\b/.test(normalized)
  ) {
    return "ELVE";
  }
  if (/\b(gcash|cash|php|peso|pesos)\b/.test(normalized)) return "GCASH";
  return fallback;
}

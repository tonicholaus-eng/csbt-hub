import compactData from "../data/tradingItemsIndex.json";
import type { TradeItem } from "../components/trade/types";

type CompactItem = [string,string,TradeItem["CATEGORY"],string,number|null,number|null,number|null,number|null,number|null,number|null,string|null,TradeItem["DEMAND_TIER"]|null,string|null,TradeItem["POTION_VALUES"]|null];

export const clientItemList: TradeItem[] = (compactData as unknown as CompactItem[]).map(([ID,NAME,CATEGORY,IMAGE,GCASH_NORMAL,GCASH_NEON,GCASH_MEGA,ELVE_NORMAL,ELVE_NEON,ELVE_MEGA,RARITY,DEMAND_TIER,UPDATED_AT,POTION_VALUES]) => ({
  ID, NAME, CATEGORY, IMAGE, GCASH_NORMAL, GCASH_NEON, GCASH_MEGA, ELVE_NORMAL, ELVE_NEON, ELVE_MEGA, RARITY, DEMAND_TIER, UPDATED_AT, POTION_VALUES: POTION_VALUES ?? undefined,
}));

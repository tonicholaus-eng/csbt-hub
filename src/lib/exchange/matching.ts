import type { TradeItem, ValueSource, ValueType } from "../../components/trade/types";
import { getItemById } from "../search";
import { getInventoryItemValue, parseTradeValue } from "../valueSystem";
import type {
  ExchangeItem,
  ExchangeListing,
  InventoryExchangeRow,
  ListingMatch,
  MarketplacePreferences,
  OfferSuggestion,
} from "./types";

const DEMAND_SCORE: Record<string, number> = { S: 100, A: 86, B: 72, C: 58, D: 42 };

export function getDemandScore(tier: string | null | undefined) {
  return DEMAND_SCORE[String(tier ?? "").toUpperCase()] ?? 60;
}

export const DEFAULT_MARKETPLACE_PREFERENCES: MarketplacePreferences = {
  value_source: "GCASH",
  prefer_upgrades: true,
  prefer_downgrades: false,
  prefer_high_demand: true,
  prefer_overpays: false,
  avoid_randoms: true,
  avoid_hard_to_trade: false,
  accepts_pets: true,
  accepts_petwear: true,
  accepts_vehicles: true,
  accepts_food: false,
  accepts_gifts: false,
  accepts_strollers: false,
  accepts_toys: false,
  accepts_stickers: false,
  accepts_other: false,
  min_match_score: 65,
};

export function sumExchangeItems(items: ExchangeItem[]) {
  return items.reduce((sum, item) => sum + (item.snapshot_value ?? 0) * Math.max(1, item.quantity), 0);
}

function inventoryValue(row: InventoryExchangeRow, source: ValueSource) {
  const item = getItemById(row.item_id);
  if (!item) return 0;
  return (
    parseTradeValue(
      getInventoryItemValue(item, source, row.value_type, row.potion_status),
    ) ?? 0
  ) * Math.max(1, row.quantity);
}

function categoryAccepted(category: string, preferences: MarketplacePreferences) {
  switch (category) {
    case "PET": return preferences.accepts_pets;
    case "PETWEAR": return preferences.accepts_petwear;
    case "VEHICLE": return preferences.accepts_vehicles;
    case "FOOD": return preferences.accepts_food;
    case "GIFT": return preferences.accepts_gifts;
    case "STROLLER": return preferences.accepts_strollers;
    case "TOY": return preferences.accepts_toys;
    case "STICKER": return preferences.accepts_stickers;
    default: return preferences.accepts_other;
  }
}

function matchLabel(score: number): ListingMatch["label"] {
  if (score >= 90) return "Excellent Match";
  if (score >= 80) return "Strong Match";
  if (score >= 65) return "Possible Match";
  return "Normal Listing";
}

export function scoreListingMatch(
  listing: ExchangeListing,
  inventory: InventoryExchangeRow[],
  wishlistIds: Set<string>,
  preferences: MarketplacePreferences,
): ListingMatch {
  const listingHave = listing.items.filter((item) => item.side === "HAVE");
  const listingWant = listing.items.filter((item) => item.side === "WANT");
  // Database loaders normalize listing item side by attaching it dynamically. If an older
  // loader does not, treat all items as HAVE so the card remains usable rather than crashing.
  const effectiveHave = listingHave.length || listingWant.length ? listingHave : listing.items;
  const effectiveWant = listingHave.length || listingWant.length ? listingWant : [];

  const inventoryQuantity = new Map<string, number>();
  for (const row of inventory) {
    if (row.quantity <= 0) continue;
    inventoryQuantity.set(row.item_id, (inventoryQuantity.get(row.item_id) ?? 0) + row.quantity);
  }

  const requestedUnits = effectiveWant.reduce((sum, item) => sum + Math.max(1, item.quantity), 0);
  const matchedRequestedUnits = effectiveWant.reduce(
    (sum, item) => sum + Math.min(Math.max(1, item.quantity), inventoryQuantity.get(item.item_id) ?? 0),
    0,
  );
  const wantedMatches = effectiveWant.filter((item) => (inventoryQuantity.get(item.item_id) ?? 0) > 0);
  const inventoryCompatibility = requestedUnits > 0
    ? Math.round((matchedRequestedUnits / requestedUnits) * 100)
    : 72;

  const targetValue = sumExchangeItems(effectiveHave);
  const estimatedInventoryValue = inventory.reduce(
    (sum, row) => sum + inventoryValue(row, listing.value_source),
    0,
  );

  // A member should not be penalized simply because their whole inventory is much larger than
  // the listing. Estimate whether Exchange can actually assemble a close offer from what they own.
  const builtForTarget = targetValue > 0
    ? buildOptimizedOffer(inventory, listing.value_source, targetValue, {
        highDemandOnly: preferences.prefer_high_demand && preferences.avoid_hard_to_trade,
        maxItems: preferences.avoid_randoms ? 7 : 10,
        maxOverpayPercent: preferences.prefer_overpays ? 0.12 : 0.07,
        minTargetPercent: 0.88,
        demandBias: preferences.prefer_high_demand ? 0.12 : 0.035,
        itemCountBias: preferences.avoid_randoms ? 0.01 : 0.004,
      })
    : { items: [] as ExchangeItem[], total: 0, differencePercent: -100, averageDemand: 0 };
  const valueDifferencePercent = targetValue > 0
    ? Math.abs(builtForTarget.total - targetValue) / targetValue * 100
    : 0;
  const valueCompatibility = targetValue > 0
    ? Math.max(0, Math.round(100 - valueDifferencePercent))
    : 70;

  const wishlistMatches = effectiveHave.filter((item) => wishlistIds.has(item.item_id)).length;
  const wishlistCompatibility = effectiveHave.length
    ? Math.min(100, wishlistMatches * 100 / Math.max(1, effectiveHave.length))
    : 0;

  const canonicalHave = effectiveHave.map((item) => getItemById(item.item_id));
  const tiers = canonicalHave.map((item, index) =>
    DEMAND_SCORE[String(item?.DEMAND_TIER ?? effectiveHave[index]?.demand_tier ?? "").toUpperCase()] ?? 60,
  );
  const demandCompatibility = tiers.length
    ? Math.round(tiers.reduce((a, b) => a + b, 0) / tiers.length)
    : 60;

  let preferenceCompatibility = 70;
  preferenceCompatibility += listing.value_source === preferences.value_source ? 8 : -4;
  if (listing.intent === "UPGRADE" && preferences.prefer_upgrades) preferenceCompatibility += 12;
  if (listing.intent === "DOWNGRADE" && preferences.prefer_downgrades) preferenceCompatibility += 12;
  if (preferences.prefer_high_demand && demandCompatibility >= 80) preferenceCompatibility += 8;
  if (preferences.prefer_overpays && builtForTarget.total >= targetValue * 1.02) preferenceCompatibility += 5;

  const rejectedCategories = effectiveHave.filter((item) => {
    const category = getItemById(item.item_id)?.CATEGORY ?? String(item.category);
    return !categoryAccepted(String(category), preferences);
  }).length;
  preferenceCompatibility -= rejectedCategories * 24;

  // Respect the listing owner's explicit style instead of matching on value alone.
  const ownerHighDemandOnly = listing.preferences?.highDemandOnly === true;
  const ownerNoRandoms = listing.preferences?.noRandoms === true;
  if (ownerHighDemandOnly) {
    const builtDemand = builtForTarget.items.map((row) => {
      const source = getItemById(row.item_id);
      return DEMAND_SCORE[String(source?.DEMAND_TIER ?? row.demand_tier ?? "").toUpperCase()] ?? 60;
    });
    const averageBuiltDemand = builtDemand.length
      ? builtDemand.reduce((sum, value) => sum + value, 0) / builtDemand.length
      : 0;
    preferenceCompatibility += averageBuiltDemand >= 80 ? 10 : -12;
  }
  if (ownerNoRandoms) {
    preferenceCompatibility += builtForTarget.items.length > 0 && builtForTarget.items.length <= 5 ? 8 : -8;
  }
  if (listing.intent === "UPGRADE" && builtForTarget.items.length > 0) {
    preferenceCompatibility += builtForTarget.items.length < Math.max(2, effectiveHave.length) ? 8 : -5;
  }
  if (listing.intent === "DOWNGRADE" && builtForTarget.items.length > effectiveHave.length) {
    preferenceCompatibility += 8;
  }
  preferenceCompatibility = Math.max(0, Math.min(100, preferenceCompatibility));

  const ageHours = Math.max(0, (Date.now() - new Date(listing.created_at).getTime()) / 3_600_000);
  const freshness = Math.max(15, Math.round(100 - ageHours / 3.36)); // fades across ~14 days

  const breakdown = {
    inventory: inventoryCompatibility,
    value: valueCompatibility,
    wishlist: Math.round(wishlistCompatibility),
    demand: demandCompatibility,
    preferences: preferenceCompatibility,
    freshness,
  };

  const score = Math.round(
    breakdown.inventory * 0.35 +
      breakdown.value * 0.25 +
      breakdown.wishlist * 0.15 +
      breakdown.demand * 0.10 +
      breakdown.preferences * 0.10 +
      breakdown.freshness * 0.05,
  );

  const reasons: string[] = [];
  if (matchedRequestedUnits > 0) reasons.push(`${matchedRequestedUnits}/${requestedUnits} requested item unit${requestedUnits === 1 ? "" : "s"} already in your inventory`);
  if (wishlistMatches > 0) reasons.push(`${wishlistMatches} item${wishlistMatches === 1 ? "" : "s"} from your wishlist`);
  if (valueCompatibility >= 90) reasons.push("Smart Offer Builder can assemble a close-value offer");
  if (demandCompatibility >= 82) reasons.push("Strong demand profile");
  if (preferenceCompatibility >= 85) reasons.push("Fits both traders' stated preferences");
  if (freshness >= 90) reasons.push("Fresh listing");
  if (!reasons.length) reasons.push("Open listing that may fit your trading preferences");

  return {
    listing,
    score,
    label: matchLabel(score),
    breakdown,
    reasons,
    estimatedInventoryValue,
    targetValue,
  };
}

export function rankListingMatches(
  listings: ExchangeListing[],
  inventory: InventoryExchangeRow[],
  wishlistIds: Set<string>,
  preferences: MarketplacePreferences,
) {
  return listings
    .map((listing) => scoreListingMatch(listing, inventory, wishlistIds, preferences))
    .sort((a, b) => b.score - a.score || new Date(b.listing.created_at).getTime() - new Date(a.listing.created_at).getTime());
}

type Candidate = {
  row: InventoryExchangeRow;
  item: TradeItem;
  unitValue: number;
  demand: number;
};

export type OfferBuildConstraints = {
  excludedItemIds?: Set<string>;
  preferredItemIds?: Set<string>;
  highDemandOnly?: boolean;
  minimumDemandScore?: number;
  demandScoreOverrides?: Map<string, number>;
  allowedCategories?: Set<string>;
  excludedCategories?: Set<string>;
  allowedValueTypes?: Set<ValueType>;
  minUnitValue?: number;
  maxUnitValue?: number;
  maxCopiesPerItem?: number;
  maxItems?: number;
  maxOverpayPercent?: number;
  minTargetPercent?: number;
  demandBias?: number;
  itemCountBias?: number;
};

export type OptimizedOffer = {
  items: ExchangeItem[];
  total: number;
  differencePercent: number;
  averageDemand: number;
};

function expandInventory(inventory: InventoryExchangeRow[], source: ValueSource): Candidate[] {
  const candidates: Candidate[] = [];
  for (const row of inventory) {
    const item = getItemById(row.item_id);
    if (!item) continue;
    const unitValue = parseTradeValue(getInventoryItemValue(item, source, row.value_type, row.potion_status)) ?? 0;
    if (unitValue <= 0) continue;
    const demand = DEMAND_SCORE[String(item.DEMAND_TIER ?? "").toUpperCase()] ?? 60;
    for (let index = 0; index < Math.min(row.quantity, 20); index += 1) {
      candidates.push({ row, item, unitValue, demand });
    }
  }
  return candidates;
}

function groupCandidates(selected: Candidate[]): ExchangeItem[] {
  const grouped = new Map<string, ExchangeItem>();
  for (const candidate of selected) {
    const key = `${candidate.item.ID}:${candidate.row.value_type}:${candidate.row.potion_status}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.quantity += 1;
      continue;
    }
    grouped.set(key, {
      item_id: candidate.item.ID,
      item_name: candidate.item.NAME,
      image_url: candidate.item.IMAGE || null,
      category: candidate.item.CATEGORY,
      value_type: candidate.row.value_type as ValueType,
      potion_status: candidate.row.potion_status,
      quantity: 1,
      snapshot_value: candidate.unitValue,
      demand_tier: candidate.item.DEMAND_TIER ?? null,
    });
  }
  return Array.from(grouped.values());
}

/**
 * Beam-search offer builder. Unlike the original greedy builder, this explores
 * multiple combinations and can honor exclusions, item-count caps and demand
 * preferences. It stays deterministic and intentionally bounded for browsers.
 */
export function buildOptimizedOffer(
  inventory: InventoryExchangeRow[],
  source: ValueSource,
  targetValue: number,
  constraints: OfferBuildConstraints = {},
): OptimizedOffer {
  if (targetValue <= 0 || !inventory.length) {
    return { items: [], total: 0, differencePercent: -100, averageDemand: 0 };
  }

  const excluded = constraints.excludedItemIds ?? new Set<string>();
  const preferred = constraints.preferredItemIds ?? new Set<string>();
  const maxItems = Math.max(1, Math.min(18, constraints.maxItems ?? 10));
  const minTargetPercent = Math.max(0.5, Math.min(1.15, constraints.minTargetPercent ?? 0.84));
  const maxOverpayPercent = Math.max(0, Math.min(0.5, constraints.maxOverpayPercent ?? 0.12));
  const demandBias = constraints.demandBias ?? 0.035;
  const upperBound = targetValue * (1 + maxOverpayPercent);

  const allowedCategories = constraints.allowedCategories;
  const excludedCategories = constraints.excludedCategories ?? new Set<string>();
  const allowedValueTypes = constraints.allowedValueTypes;
  const minimumDemand = Math.max(0, constraints.minimumDemandScore ?? (constraints.highDemandOnly ? DEMAND_SCORE.A : 0));
  const minUnitValue = Math.max(0, constraints.minUnitValue ?? 0);
  const maxUnitValue = Math.max(minUnitValue, constraints.maxUnitValue ?? Number.POSITIVE_INFINITY);
  const maxCopiesPerItem = Math.max(1, Math.min(20, constraints.maxCopiesPerItem ?? 20));

  let pool = expandInventory(inventory, source)
    .map((candidate) => ({
      ...candidate,
      demand: constraints.demandScoreOverrides?.get(candidate.item.ID) ?? candidate.demand,
    }))
    .filter((candidate) => !excluded.has(candidate.item.ID))
    .filter((candidate) => candidate.demand >= minimumDemand)
    .filter((candidate) => !allowedCategories?.size || allowedCategories.has(String(candidate.item.CATEGORY).toUpperCase()))
    .filter((candidate) => !excludedCategories.has(String(candidate.item.CATEGORY).toUpperCase()))
    .filter((candidate) => !allowedValueTypes?.size || allowedValueTypes.has(candidate.row.value_type as ValueType))
    .filter((candidate) => candidate.unitValue >= minUnitValue && candidate.unitValue <= maxUnitValue)
    .sort((a, b) => {
      const aPreferred = preferred.has(a.item.ID) ? 1 : 0;
      const bPreferred = preferred.has(b.item.ID) ? 1 : 0;
      return bPreferred - aPreferred || b.demand - a.demand || b.unitValue - a.unitValue;
    });

  // Keep the search bounded while preserving a useful mix of high-value and
  // high-demand candidates. Quantities remain represented as separate units.
  if (pool.length > 72) pool = pool.slice(0, 72);

  type State = {
    selected: Candidate[];
    total: number;
    demandTotal: number;
    preferredCount: number;
  };

  let beam: State[] = [{ selected: [], total: 0, demandTotal: 0, preferredCount: 0 }];
  let best: State | null = null;
  const beamWidth = 360;

  const scoreState = (state: State) => {
    const diff = Math.abs(state.total - targetValue) / targetValue;
    const avgDemand = state.selected.length ? state.demandTotal / state.selected.length : 0;
    const underPenalty = state.total < targetValue * minTargetPercent ? 0.5 : 0;
    const overPenalty = state.total > upperBound ? 0.8 : 0;
    const itemPenalty = state.selected.length * (constraints.itemCountBias ?? 0.004);
    const preferredBonus = state.preferredCount * 0.018;
    return diff + underPenalty + overPenalty + itemPenalty - (avgDemand / 100) * demandBias - preferredBonus;
  };

  for (const candidate of pool) {
    const nextStates = [...beam];
    for (const state of beam) {
      if (state.selected.length >= maxItems) continue;
      if (state.selected.filter((selected) => selected.item.ID === candidate.item.ID).length >= maxCopiesPerItem) continue;
      // Allow modest overpay exploration but discard combinations far beyond
      // anything a practical offer should contain.
      if (state.total + candidate.unitValue > targetValue * 1.35) continue;
      nextStates.push({
        selected: [...state.selected, candidate],
        total: state.total + candidate.unitValue,
        demandTotal: state.demandTotal + candidate.demand,
        preferredCount: state.preferredCount + (preferred.has(candidate.item.ID) ? 1 : 0),
      });
    }

    nextStates.sort((a, b) => scoreState(a) - scoreState(b));

    // Deduplicate very similar totals/item counts so the beam explores a wider
    // variety of combinations instead of quantity permutations of one result.
    const deduped: State[] = [];
    const seen = new Set<string>();
    for (const state of nextStates) {
      const bucketSize = Math.max(1, targetValue * 0.0025);
      const key = `${Math.round(state.total / bucketSize)}:${state.selected.length}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(state);
      if (deduped.length >= beamWidth) break;
    }
    beam = deduped;

    const candidateBest = beam[0];
    if (candidateBest && (!best || scoreState(candidateBest) < scoreState(best))) best = candidateBest;
  }

  const selected = best?.selected ?? [];
  const total = best?.total ?? 0;
  const averageDemand = selected.length
    ? selected.reduce((sum, candidate) => sum + candidate.demand, 0) / selected.length
    : 0;

  return {
    items: groupCandidates(selected),
    total,
    differencePercent: ((total - targetValue) / targetValue) * 100,
    averageDemand,
  };
}

export function buildOfferSuggestions(
  inventory: InventoryExchangeRow[],
  source: ValueSource,
  targetValue: number,
): OfferSuggestion[] {
  if (targetValue <= 0 || !inventory.length) return [];

  const configs = [
    { id: "fair" as const, label: "Fair Offer", description: "Closest practical value match from your saved inventory.", multiplier: 1, demandBias: 0.02 },
    { id: "demand" as const, label: "Demand-Friendly", description: "Prioritizes stronger-demand items while staying near the target.", multiplier: 1, demandBias: 0.18 },
    { id: "lowball" as const, label: "Lowball Attempt", description: "A lighter offer around 92% of the target for negotiation.", multiplier: 0.92, demandBias: 0.03 },
    { id: "competitive" as const, label: "Competitive Offer", description: "A small overpay designed to stand out without going extreme.", multiplier: 1.03, demandBias: 0.09 },
  ];

  return configs.map((config) => {
    const target = targetValue * config.multiplier;
    const built = buildOptimizedOffer(inventory, source, target, {
      demandBias: config.demandBias,
      maxOverpayPercent: config.id === "lowball" ? 0.04 : config.id === "competitive" ? 0.1 : 0.07,
      minTargetPercent: config.id === "lowball" ? 0.84 : 0.9,
    });
    return {
      id: config.id,
      label: config.label,
      description: config.description,
      items: built.items,
      total: built.total,
      target,
      differencePercent: targetValue > 0 ? ((built.total - targetValue) / targetValue) * 100 : 0,
    };
  });
}

export function getCompatibilityExplanation(score: number, valueDifferencePercent: number, wishlistMatch: boolean) {
  if (score >= 90) return "Excellent match: the offer is close in value and aligns strongly with the listing preferences.";
  if (score >= 80) return "Strong match: only small adjustments may be needed before sending this offer.";
  if (wishlistMatch) return "This match stands out because the listing includes something on your wishlist.";
  if (Math.abs(valueDifferencePercent) <= 5) return "The values are close. Demand and personal preference should decide the final trade.";
  if (valueDifferencePercent < -8) return "Your current offer is under the target. Consider adding one strong-demand item.";
  if (valueDifferencePercent > 8) return "Your current offer is an overpay. You may be able to remove an item or ask for an add.";
  return "Possible match. Compare demand and the other trader's preferences before sending.";
}

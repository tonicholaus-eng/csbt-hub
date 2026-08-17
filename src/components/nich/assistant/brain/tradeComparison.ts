import type {
  NichBrainInput,
  NichPotionStatus,
  NichResponse,
  NichTradeComparison,
  NichTradeItem,
  NichValueSource,
} from "./types";
import {
  VALUE_SOURCE_LABELS,
  detectValueSource,
} from "../../../../lib/valueSystem";
import {
  analyzeNichMessage,
  type NichMessageAnalysis,
} from "./messageAnalysis";
import {
  comparePreparedTradeItems,
  compareTrade,
  createCanonicalTradeItem,
  parseTradeMessageLenient,
  type ParsedTradeItem,
} from "../tools/tradeComparison";
import { getItemById } from "../../../../lib/search";
import type { NichTradeSession, NichTradeSlot } from "../../../../lib/nich/tradeSession";
import { formatNumber, uniqueBy } from "./language";

const verdictEmoji = {
  win: "🟢",
  fair: "🟡",
  lose: "🔴",
} as const;

const verdictText = {
  win: "Win",
  fair: "Fair",
  lose: "Lose",
} as const;

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getPotionLabel(status: NichPotionStatus): string {
  switch (status) {
    case "flyRide":
      return "Fly + Ride";
    case "flyOnly":
      return "Fly only";
    case "rideOnly":
      return "Ride only";
    default:
      return "Not specified";
  }
}

function getAdjustmentText(item: NichTradeItem): string | null {
  if (item.potionAdjustment === 0) return null;

  const missingPotion =
    item.potionStatus === "flyOnly" ? "missing Ride potion" : "missing Fly potion";
  return `${formatNumber(item.potionAdjustment)} (${missingPotion})`;
}

type GroupedTradeItem = {
  item: NichTradeItem;
  quantity: number;
};

function groupTradeItems(items: NichTradeItem[]): GroupedTradeItem[] {
  const groups = new Map<string, GroupedTradeItem>();

  for (const item of items) {
    const key = [
      item.petName,
      item.petCode,
      item.variant,
      item.potionStatus,
      item.value,
    ].join(":");
    const existing = groups.get(key);

    if (existing) {
      existing.quantity += 1;
    } else {
      groups.set(key, { item, quantity: 1 });
    }
  }

  return Array.from(groups.values());
}

function createTradeItemLines(group: GroupedTradeItem, index: number): string[] {
  const { item, quantity } = group;
  const adjustment = getAdjustmentText(item);
  const quantityPrefix = quantity > 1 ? `${quantity} × ` : "";
  const combinedValue = item.value * quantity;
  const lines = [
    `${index + 1}. ${quantityPrefix}${item.petCode} ${item.petName}`,
    `   Variant: ${capitalize(item.variant)}`,
    `   Potions: ${getPotionLabel(item.potionStatus)}`,
  ];

  if (item.potionAdjustment !== 0) {
    lines.push(`   Original value each: ${item.baseDisplayValue}`);
    if (adjustment) lines.push(`   Adjustment each: ${adjustment}`);
  }

  lines.push(
    quantity > 1
      ? `   Value used: ${item.displayValue} each · ${formatNumber(combinedValue)} combined`
      : `   Value used: ${item.displayValue}`,
  );

  return lines;
}

function createTradeSideBlock(
  heading: string,
  items: NichTradeItem[],
  total: number,
): string[] {
  const groups = groupTradeItems(items);
  return [
    `${heading} (${items.length} ${items.length === 1 ? "item" : "items"})`,
    ...groups.flatMap(createTradeItemLines),
    `Total: ${formatNumber(total)}`,
  ];
}

function createNoPotionWarning(
  offeredItems: NichTradeItem[],
  requestedItems: NichTradeItem[],
  source: NichValueSource,
): string[] {
  const warningItems = uniqueBy(
    [...offeredItems, ...requestedItems].filter((item) => item.hasNoPotionWarning),
    (item) => `${item.petCode}:${item.petName}`,
  );

  if (warningItems.length === 0) return [];

  if (source === "ELVE") {
    return [
      "",
      "⚠️ Elve potion note:",
      "This comparison uses Elve Shark Regular/Neon/Mega values. Potion-specific premiums are not added separately.",
    ];
  }

  return [
    "",
    `⚠️ Potion warning: ${warningItems
      .map((item) => `${item.petCode} ${item.petName}`)
      .join(", ")}`,
    "No Fly/Ride letters were supplied, so the original database value was used with no deduction.",
    "Some no-potion high-tier pets can trade above a basic listed value.",
  ];
}

function formatTradeSideForMessage(items: NichTradeItem[]): string {
  return groupTradeItems(items)
    .map(({ item, quantity }) =>
      `${quantity > 1 ? `${quantity} ` : ""}${item.petCode} ${item.petName}`.trim(),
    )
    .join(" + ");
}

function buildVerdictExplanation(
  verdict: "win" | "fair" | "lose",
  difference: number,
  differencePercent: number,
): string[] {
  const amount = formatNumber(Math.abs(difference));
  const percent = formatNumber(Math.abs(differencePercent), 1);

  if (verdict === "win") {
    return [
      `You gain about ${amount} listed value (${percent}% relative difference).`,
      "Before accepting, check whether the items you receive are similarly easy to trade.",
    ];
  }

  if (verdict === "lose") {
    return [
      `You overpay by about ${amount} listed value (${percent}% relative difference).`,
      "A counteroffer should normally reduce your side or add value to their side.",
    ];
  }

  return [
    difference === 0
      ? "Both sides have the same calculated listed value."
      : `The sides are close, with about ${amount} listed value between them (${percent}%).`,
    "Fair by numbers does not always mean equally tradeable—demand and item quality still matter.",
  ];
}

function userAskedForTradeAdviceOrDetails(message: string): boolean {
  const text = message.toLowerCase();
  return /\b(?:why|explain|details?|advice|advise|should i|should we|accept|decline|take|pass|recommend|recommendation|what do you think|is this good|is this bad|worth it|worth doing|demand|liquid|liquidity|tradeable|tradable|easy to trade|hard to trade|upgrade|downgrade|counteroffer|counter offer|fix this trade|panalo ba|lugi ba|sulit ba|goods ba|dapat ba|tatanggapin|kunin ko|i accept)\b/.test(text);
}

function createRecentPets(items: NichTradeItem[]) {
  return uniqueBy(items, (item) => `${item.petName}:${item.variant}`).map((item) => ({
    petName: item.petName,
    variant: item.variant,
    value: item.value,
    displayValue: item.displayValue,
  }));
}

function formatPartialItem(item: ParsedTradeItem) {
  return `${item.code === "Normal" ? "" : `${item.code} `}${item.petName}`.trim();
}

function formatPartialSide(
  items: ParsedTradeItem[],
  unresolvedTexts: string[],
) {
  return [
    ...items.map(formatPartialItem),
    ...unresolvedTexts.map((text) => `[${text}]`),
  ].join(" + ");
}

function createIncompleteTradeClarification(
  input: NichBrainInput,
  source: NichValueSource,
): NichResponse | null {
  const partial = parseTradeMessageLenient(input.message);
  if (!partial) return null;

  const unresolved = [
    ...partial.unresolvedOfferTexts,
    ...partial.unresolvedRequestTexts,
  ];
  if (unresolved.length === 0) return null;

  const yourSide = formatPartialSide(
    partial.offerItems,
    partial.unresolvedOfferTexts,
  );
  const theirSide = formatPartialSide(
    partial.requestItems,
    partial.unresolvedRequestTexts,
  );

  return {
    text: [
      "I understood the trade, but I need the missing item name(s) before I can give a reliable W/F/L.",
      "",
      ...(yourSide ? [`Your Offer: ${yourSide}`] : []),
      ...(theirSide ? [`Their Offer: ${theirSide}`] : []),
      "",
      `Please replace ${unresolved.map((text) => `“${text}”`).join(", ")} with the actual pet/item name${unresolved.length === 1 ? "" : "s"}.`,
    ].join("\n"),
    intent: "tradeComparison",
    reaction: "searchEmpty",
    localConfidence: 0.99,
    aiEligible: false,
    typingDuration: 450,
    context: {
      lastIntent: "tradeComparison",
      lastValueSource: source,
    },
  };
}

function slotPotionStatus(slot: NichTradeSlot): NichPotionStatus {
  if (slot.fly && slot.ride) return "flyRide";
  if (slot.fly) return "flyOnly";
  if (slot.ride) return "rideOnly";
  return "unspecified";
}

function slotVariant(slot: NichTradeSlot): "normal" | "neon" | "mega" {
  return slot.mega ? "mega" : slot.neon ? "neon" : "normal";
}

function slotCode(slot: NichTradeSlot) {
  const prefix = slot.mega ? "M" : slot.neon ? "N" : "";
  const potion = slot.fly && slot.ride ? "FR" : slot.fly ? "F" : slot.ride ? "R" : "";
  return `${prefix}${potion}` || (slot.category === "PET" ? "NP" : "Item");
}

function prepareSessionSide(slots: NichTradeSlot[], source: NichValueSource) {
  const prepared: NichTradeItem[] = [];
  for (const slot of slots) {
    if (slot.status !== "CONFIRMED" || !slot.canonicalItemId) return null;
    const item = getItemById(slot.canonicalItemId);
    if (!item) return null;
    const tradeItem = createCanonicalTradeItem(
      item,
      {
        variant: slotVariant(slot),
        potionStatus: slotPotionStatus(slot),
        code: slotCode(slot),
        hasNoPotionWarning: slot.category === "PET" && !slot.fly && !slot.ride,
      },
      source,
    );
    if (!tradeItem) return null;
    const quantity = Math.max(1, Math.min(9, slot.quantity || 1));
    for (let count = 0; count < quantity; count += 1) prepared.push({ ...tradeItem });
  }
  return prepared;
}

function createComparisonResponseFromPrepared(
  input: NichBrainInput,
  comparison: NichTradeComparison,
): NichResponse {
  const source = comparison.valueSource as NichValueSource;
  const difference = Math.abs(comparison.difference);
  const wantsDetails = userAskedForTradeAdviceOrDetails(input.message);
  const explanation = wantsDetails
    ? buildVerdictExplanation(
        comparison.verdict,
        comparison.difference,
        comparison.differencePercent,
      )
    : [];
  const allItems = [...comparison.offeredItems, ...comparison.requestedItems];
  const lastItem = comparison.requestedItems.at(-1)!;
  const yourOfferMessage = formatTradeSideForMessage(comparison.offeredItems);
  const theirOfferMessage = formatTradeSideForMessage(comparison.requestedItems);
  const suggestions = [
    {
      id: "trade-swap-sides",
      label: "Swap the sides",
      message: `WFL me ${theirOfferMessage} them ${yourOfferMessage} using ${source === "ELVE" ? "Elve Shark" : "GCash"}`,
    },
    {
      id: "trade-check-all-values",
      label: "Check all values",
      message: `${allItems.map((item) => `${item.petCode} ${item.petName}`).join(", ")} using ${source === "ELVE" ? "Elve Shark" : "GCash"}`,
    },
  ];

  if (difference > 0) {
    suggestions.splice(1, 0, {
      id: "trade-find-adds",
      label: "Find possible adds",
      message: `Find pets around ${formatNumber(difference)} value using ${source === "ELVE" ? "Elve Shark" : "GCash"}`,
    });
  }

  return {
    text: [
      `${verdictEmoji[comparison.verdict]} ${verdictText[comparison.verdict]}`,
      "",
      ...createTradeSideBlock("Your Offer", comparison.offeredItems, comparison.offeredValue),
      "",
      ...createTradeSideBlock("Their Offer", comparison.requestedItems, comparison.requestedValue),
      ...(wantsDetails
        ? [
            "",
            ...explanation,
            ...createNoPotionWarning(comparison.offeredItems, comparison.requestedItems, source),
            "",
            `Source: ${VALUE_SOURCE_LABELS[source]}.`,
          ]
        : []),
    ].join("\n"),
    intent: "tradeComparison",
    localConfidence: 0.99,
    aiEligible: false,
    reaction:
      comparison.verdict === "win"
        ? "celebrate"
        : comparison.verdict === "fair"
          ? "calculator"
          : "searchEmpty",
    typingDuration: Math.min(700 + allItems.length * 80, 1_400),
    tradeComparison: comparison,
    context: {
      lastIntent: "tradeComparison",
      lastTradeComparison: comparison,
      lastPetName: lastItem.petName,
      lastVariant: lastItem.variant,
      lastNumericValue: lastItem.value,
      recentPets: createRecentPets(allItems),
      lastValueSource: source,
    },
    suggestions: wantsDetails ? suggestions.slice(0, 3) : [],
  };
}

export function createTradeSessionComparisonResponse(
  input: NichBrainInput,
  session: NichTradeSession,
): NichResponse | null {
  if (session.unresolvedSlots.length || !session.userSide.length || !session.theirSide.length) return null;
  const source = session.valueSystem;
  const offeredItems = prepareSessionSide(session.userSide, source);
  const requestedItems = prepareSessionSide(session.theirSide, source);
  if (!offeredItems?.length || !requestedItems?.length) return null;
  const comparison = comparePreparedTradeItems(offeredItems, requestedItems, source);
  return comparison ? createComparisonResponseFromPrepared(input, comparison) : null;
}

export function createTradeComparisonResponse(
  input: NichBrainInput,
  providedAnalysis?: NichMessageAnalysis,
): NichResponse | null {
  const analysis = providedAnalysis ?? analyzeNichMessage(input.message);
  const source = detectValueSource(
    input.message,
    input.context.lastValueSource ?? "GCASH",
  ) as NichValueSource;
  const parsed = analysis.tradeQuery;

  if (!parsed) {
    return createIncompleteTradeClarification(input, source);
  }

  const comparison = compareTrade(parsed.offerText, parsed.requestText, source);
  if (!comparison) {
    return {
      text: [
        "I couldn’t compare that trade.",
        "",
        "Make sure each side contains at least one valid database item. Separate multiple items with +, commas, or ‘and’.",
      ].join("\n"),
      intent: "tradeComparison",
      reaction: "searchEmpty",
      localConfidence: 0.98,
      aiEligible: false,
      typingDuration: 500,
      suggestions: [
        {
          id: "trade-multiple-example",
          label: "Try multiple pets",
          message: "Me: FR Frost Dragon + Turtle Them: FR Owl + Kangaroo",
        },
        {
          id: "trade-single-example",
          label: "Try one each",
          message: "WFL me FR Frost Dragon him FR Owl",
        },
      ],
      context: {
        lastIntent: "tradeComparison",
        lastValueSource: source,
      },
    };
  }

  return createComparisonResponseFromPrepared(input, comparison);
}

export default createTradeComparisonResponse;

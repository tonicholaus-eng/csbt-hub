import { FAIR_THRESHOLD_PERCENT } from "@/lib/trade/verdict";
import {
  buildOptimizedOffer,
  getDemandScore,
  rankListingMatches,
  type OfferBuildConstraints,
} from "../../../../lib/exchange/matching";
import type { InventoryExchangeRow, MarketplacePreferences } from "../../../../lib/exchange/types";
import { getItem, getItemById } from "../../../../lib/search";
import {
  detectValueSource,
  getInventoryItemValue,
  getItemValue,
  parseTradeValue,
  VALUE_SOURCE_SHORT_LABELS,
} from "../../../../lib/valueSystem";
import type { TradeItem, ValueSource, ValueType } from "../../../trade/types";
import { findPetsInMessage } from "../tools/petSearch";
import type {
  NichBrainInput,
  NichConversationContext,
  NichLocalProfileData,
  NichResponse,
  NichTradeComparison,
  NichTradingGoal,
  NichValueHistoryRow,
} from "./types";

const DEMAND_LABEL: Record<string, string> = {
  S: "very high",
  A: "high",
  B: "good",
  C: "average",
  D: "low",
};


function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9%+\-\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

function formatSignedPercent(value: number) {
  const rounded = Math.abs(value) < 0.05 ? 0 : value;
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(1)}%`;
}

function variantLabel(valueType: ValueType) {
  if (valueType === "NEON") return "Neon";
  if (valueType === "MEGA") return "Mega";
  return "Normal";
}

function potionLabel(status: InventoryExchangeRow["potion_status"]) {
  switch (status) {
    case "NO_POTION": return "No Potion";
    case "RIDE": return "R";
    case "FLY": return "F";
    case "FLY_RIDE": return "FR";
    default: return "";
  }
}

function contextualToolAction(input: NichBrainInput): NichResponse | null {
  const message = normalize(input.message);
  const itemMatch = findPetsInMessage(input.message)[0];
  const item = itemMatch?.pet;
  if (!item) return null;
  const source = detectValueSource(input.message, (input.context.lastValueSource as ValueSource | undefined) ?? "GCASH");
  const encodedId = encodeURIComponent(item.ID);

  if (/\b(?:add|put|send|place|open).*(?:calculator|calc)\b|\b(?:calculator|calc).*(?:add|put|with)\b/.test(message)) {
    return { text: `Opening the Trade Calculator with ${item.NAME} ready to add.`, intent: "navigation", reaction: "calculator", localConfidence: 0.99, aiEligible: false, navigation: { href: `/calculator?add=${encodedId}&source=${source}`, label: "Open Calculator", delay: 450 } };
  }
  if (/\b(?:add|put|save).*(?:inventory|inv|bag|backpack)\b|\b(?:inventory|inv).*(?:add|put|save)\b/.test(message)) {
    return { text: `Opening your Inventory with ${item.NAME} ready to add.`, intent: "inventory", reaction: "calculator", localConfidence: 0.99, aiEligible: false, navigation: { href: `/inventory?add=${encodedId}&source=${source}`, label: "Open Inventory", delay: 450 } };
  }
  if (/\b(?:add|put|save).*(?:wishlist|wish list|target)\b|\b(?:wishlist|wish list).*(?:add|put|save)\b/.test(message)) {
    return { text: `Opening your Wishlist and adding ${item.NAME}.`, intent: "wishlist", reaction: "searchFound", localConfidence: 0.99, aiEligible: false, navigation: { href: `/wishlist?add=${encodedId}`, label: "Open Wishlist", delay: 450 } };
  }
  if (/\b(?:show|find|open|search).*(?:exchange|listing|listings|trades?).*\b|\b(?:exchange|listing|listings).*(?:for|of|with)\b/.test(message)) {
    return { text: `Opening CSBT Exchange filtered for ${item.NAME}.`, intent: "exchange", reaction: "searchFound", localConfidence: 0.99, aiEligible: false, navigation: { href: `/exchange?tab=browse&q=${encodeURIComponent(item.NAME)}`, label: "Find listings", delay: 450 } };
  }
  return null;
}

function inventoryRowLabel(row: InventoryExchangeRow) {
  const item = getItemById(row.item_id);
  const name = item?.NAME ?? row.item_name ?? row.item_id;
  const variant = row.value_type === "NORMAL" ? "" : `${variantLabel(row.value_type)} `;
  const potion = potionLabel(row.potion_status);
  return `${row.quantity > 1 ? `${row.quantity}× ` : ""}${variant}${potion ? `${potion} ` : ""}${name}`.trim();
}

function getRowUnitValue(row: InventoryExchangeRow, source: ValueSource) {
  const item = getItemById(row.item_id);
  if (!item) return 0;
  return parseTradeValue(getInventoryItemValue(item, source, row.value_type, row.potion_status)) ?? 0;
}

function getInventoryStats(inventory: InventoryExchangeRow[], source: ValueSource) {
  const valued = inventory.map((row) => {
    const unit = getRowUnitValue(row, source);
    return { row, unit, total: unit * Math.max(1, row.quantity), item: getItemById(row.item_id) };
  }).filter((entry) => entry.item);
  const total = valued.reduce((sum, entry) => sum + entry.total, 0);
  const units = valued.reduce((sum, entry) => sum + Math.max(1, entry.row.quantity), 0);
  const top = [...valued].sort((a, b) => b.total - a.total);
  return { total, units, entries: valued, top };
}

function getSource(input: NichBrainInput): ValueSource {
  const fallback = input.context.lastValueSource ?? input.localData?.preferences?.value_source ?? "GCASH";
  return detectValueSource(input.message, fallback);
}

function needsProfileData(data: NichLocalProfileData | undefined): NichResponse | null {
  if (!data?.loaded) {
    return {
      text: "I’m still loading your local CSBT trading data. Try that command again in a moment.",
      intent: "inventory",
      reaction: "search",
      localConfidence: 1,
      aiEligible: false,
    };
  }
  return null;
}

function emptyInventoryResponse(data: NichLocalProfileData): NichResponse {
  return {
    text: data.authenticated
      ? "Your saved inventory is empty right now. Add items on the Inventory page first, then I can value it, build offers, and check what you can afford."
      : "Your guest inventory is empty right now. Add items on the Inventory page first, then I can use them locally for offers and affordability checks.",
    intent: "inventory",
    reaction: "searchEmpty",
    navigation: { href: "/inventory", label: "Open Inventory", delay: 850 },
    localConfidence: 1,
    aiEligible: false,
  };
}

function inventorySummary(input: NichBrainInput): NichResponse | null {
  const message = normalize(input.message);
  const data = input.localData;
  const inventoryIntent = /\b(?:my\s+)?(?:inv|inventory|bag|backpack|stash|collection|items i own|stuff i own|pets i own|owned items|owned pets)\b/.test(message)
    || /\b(?:what do i own|show my collection|show what i own|inventory ko|inv ko|bag ko|backpack ko|collection ko|mga item ko|mga pets ko|ano mga meron ko|ano meron ako)\b/.test(message);
  const ownershipIntent = /\b(?:do i have|do i own|have i got|did i save|got any|how many .* do i have|how many .* do i own|how many .* are in my|may .* ba ako|meron ba akong|meron akong|meron ba ko|mayroon ba akong|ilan .* ko|ilan .* meron ako)\b/.test(message);
  const affordabilityIntent = /\b(?:can i afford|can my (?:inv|inventory|collection) (?:afford|get|reach)|is my (?:inv|inventory) enough for|do i have enough for|am i close to|how close am i to|how far am i from|can i get|what can i afford|afford ko ba|kaya ba ng (?:inv|inventory) ko|abot ba ng (?:inv|inventory) ko|sapat ba (?:inv|inventory) ko|pwede ko ba makuha|kaya ko ba makuha|gaano pa ko kalayo)\b/.test(message);
  if (!inventoryIntent && !ownershipIntent && !affordabilityIntent) return null;

  const pending = needsProfileData(data);
  if (pending) return pending;
  if (!data) return null;
  if (!data.inventory.length) return emptyInventoryResponse(data);

  const source = getSource(input);
  const stats = getInventoryStats(data.inventory, source);
  const detectedItems = findPetsInMessage(input.message);
  const target = detectedItems.at(-1)?.pet;

  if (ownershipIntent && target) {
    const owned = data.inventory.filter((row) => row.item_id === target.ID);
    if (!owned.length) {
      return {
        text: `You don’t currently have ${target.NAME} in your saved inventory.`,
        intent: "inventory",
        reaction: "searchEmpty",
        localConfidence: 0.99,
        aiEligible: false,
      };
    }
    const lines = owned.map((row) => `- ${inventoryRowLabel(row)}`);
    const totalUnits = owned.reduce((sum, row) => sum + row.quantity, 0);
    return {
      text: [`Yes. You have ${totalUnits} ${target.NAME}${totalUnits === 1 ? "" : " units"}:`, "", ...lines].join("\n"),
      intent: "inventory",
      reaction: "celebrate",
      localConfidence: 0.99,
      aiEligible: false,
      context: { lastPetName: target.NAME, lastValueSource: source },
    };
  }

  if (affordabilityIntent && target) {
    const targetValue = parseTradeValue(getItemValue(target, source, "NORMAL"));
    if (!targetValue || targetValue <= 0) {
      return {
        text: `${target.NAME} doesn’t have a usable ${VALUE_SOURCE_SHORT_LABELS[source]} Normal value in the database, so I can’t compare it to your inventory total.`,
        intent: "inventory",
        reaction: "searchEmpty",
        localConfidence: 0.98,
        aiEligible: false,
      };
    }
    const difference = stats.total - targetValue;
    const percent = targetValue ? (difference / targetValue) * 100 : 0;
    return {
      text: difference >= 0
        ? [
            `Yes — your inventory can cover ${target.NAME} by raw ${VALUE_SOURCE_SHORT_LABELS[source]} value.`,
            `Inventory: ${formatNumber(stats.total)}`,
            `${target.NAME}: ${formatNumber(targetValue)}`,
            `Headroom: ${formatNumber(difference)} (${formatSignedPercent(percent)})`,
            "",
            "That doesn’t mean every combination is a good offer. Ask me to build one and I’ll optimize from what you own.",
          ].join("\n")
        : [
            `Not yet by raw ${VALUE_SOURCE_SHORT_LABELS[source]} value.`,
            `Inventory: ${formatNumber(stats.total)}`,
            `${target.NAME}: ${formatNumber(targetValue)}`,
            `Short by: ${formatNumber(Math.abs(difference))} (${Math.abs(percent).toFixed(1)}%)`,
          ].join("\n"),
      intent: "inventory",
      reaction: difference >= 0 ? "celebrate" : "searchEmpty",
      localConfidence: 0.99,
      aiEligible: false,
      context: {
        lastPetName: target.NAME,
        lastValueSource: source,
        tradingGoal: { ...input.context.tradingGoal, targetItemId: target.ID, targetItemName: target.NAME, valueSource: source },
      },
      suggestions: difference >= 0 ? [{ id: "inv-build-target", label: "Build an offer", message: `Build me an offer for ${target.NAME}` }] : undefined,
    };
  }

  if (/\b(?:highest|most valuable|top|best items?|biggest)\b/.test(message)) {
    const limitMatch = message.match(/\btop\s+(\d{1,2})\b/);
    const limit = Math.max(1, Math.min(10, Number(limitMatch?.[1] ?? 5)));
    const lines = stats.top.slice(0, limit).map((entry, index) =>
      `${index + 1}. ${inventoryRowLabel(entry.row)} — ${formatNumber(entry.total)}`,
    );
    return {
      text: [`Your top ${Math.min(limit, lines.length)} inventory entries by ${VALUE_SOURCE_SHORT_LABELS[source]} value:`, "", ...lines].join("\n"),
      intent: "inventory",
      reaction: "calculator",
      localConfidence: 0.99,
      aiEligible: false,
      context: {
        lastValueSource: source,
        recentPets: stats.top.slice(0, limit).map((entry) => ({ petName: entry.item!.NAME, value: entry.total, displayValue: formatNumber(entry.total) })),
      },
    };
  }

  if (/\b(?:list|show|whats in|what is in|everything in|all my)\b/.test(message) && !/worth|value|total/.test(message)) {
    const lines = stats.top.slice(0, 20).map((entry) => `- ${inventoryRowLabel(entry.row)}`);
    return {
      text: [
        `You have ${stats.units} total item${stats.units === 1 ? "" : "s"} across ${data.inventory.length} saved entr${data.inventory.length === 1 ? "y" : "ies"}.`,
        "",
        ...lines,
        ...(stats.top.length > 20 ? [`...and ${stats.top.length - 20} more entries.`] : []),
      ].join("\n"),
      intent: "inventory",
      reaction: "calculator",
      localConfidence: 0.98,
      aiEligible: false,
    };
  }

  if (/\b(?:worth|value|total|how much)\b/.test(message) || inventoryIntent) {
    const topLines = stats.top.slice(0, 5).map((entry, index) => `${index + 1}. ${inventoryRowLabel(entry.row)} — ${formatNumber(entry.total)}`);
    return {
      text: [
        `Your inventory is worth about ${formatNumber(stats.total)} in ${VALUE_SOURCE_SHORT_LABELS[source]} value.`,
        `${stats.units} total items · ${data.inventory.length} saved entries`,
        "",
        "Highest-value entries:",
        ...topLines,
      ].join("\n"),
      intent: "inventory",
      reaction: "calculator",
      localConfidence: 0.99,
      aiEligible: false,
      context: { lastNumericValue: stats.total, lastValueSource: source },
    };
  }

  return null;
}

function extractConstraintItems(message: string, kind: "exclude" | "prefer") {
  const normalized = normalize(message);
  const triggers = kind === "exclude"
    ? ["without", "dont use", "do not use", "keep my", "save my", "exclude", "avoid using", "leave out", "not using", "wag gamitin", "huwag gamitin", "wag isama", "huwag isama", "itabi", "keep ko"]
    : ["use my", "include my", "prefer", "prioritize", "with my", "gamitin", "isama", "unahin", "priority"];
  const trigger = triggers.find((phrase) => normalized.includes(phrase));
  if (!trigger) return new Set<string>();
  const index = normalized.indexOf(trigger);
  const slice = message.slice(Math.max(0, index + trigger.length));
  return new Set(findPetsInMessage(slice).map((match) => match.pet.ID));
}

function inferOfferObjective(message: string, context: NichConversationContext): NichTradingGoal["objective"] {
  const normalized = normalize(message);
  if (/\b(?:lowball|lowest|cheapest|lighter|lower offer|less overpay|underpay|mas mura|mas mababa|tipid|konti lang)\b/.test(normalized)) return "LOWBALL";
  if (/\b(?:competitive|stronger|better offer|stand out|small overpay|mas malakas|mas magandang offer|pang compete)\b/.test(normalized)) return "COMPETITIVE";
  if (/\b(?:high demand|demand friendly|liquid|easy to trade|malakas demand|madaling itrade)\b/.test(normalized)) return "HIGH_DEMAND";
  if (/\bupgrade\b/.test(normalized)) return "UPGRADE";
  if (/\bdowngrade\b/.test(normalized)) return "DOWNGRADE";
  return context.tradingGoal?.objective ?? "FAIR";
}

function targetFromGoalOrMessage(input: NichBrainInput): TradeItem | null {
  const targetClause = input.message.match(/\b(?:for|to get|trying to get|want|target(?:ing)?|after|looking for|lf)\b([\s\S]*)/i)?.[1];
  const clauseMatches = targetClause ? findPetsInMessage(targetClause) : [];
  if (clauseMatches.length) return clauseMatches[0].pet;
  const matches = findPetsInMessage(input.message);
  if (matches.length) {
    // The target normally appears after "for/get/want". For exclusion-heavy
    // commands, use the first detected item because exclusions tend to follow.
    return matches[0].pet;
  }
  const goalId = input.context.tradingGoal?.targetItemId;
  if (goalId) return getItemById(goalId) ?? null;
  const goalName = input.context.tradingGoal?.targetItemName;
  return goalName ? getItem(goalName) ?? null : null;
}

function buildLiveDemandOverrides(data: NichLocalProfileData | undefined) {
  const overrides = new Map<string, number>();
  for (const signal of data?.demandSignals ?? []) {
    let score = signal.activity === "hot" ? 94 : signal.activity === "active" ? 86 : signal.activity === "normal" ? 72 : 60;
    if (signal.externalTrend === "rising") score += 4;
    if (signal.externalTrend === "dropping") score -= 4;
    overrides.set(signal.item_id, Math.max(42, Math.min(100, score)));
  }
  return overrides;
}

function parseCompactNumberToken(value: string | undefined) {
  if (!value) return null;
  const match = value.toLowerCase().replace(/,/g, "").match(/^(\d+(?:\.\d+)?)([km])?$/);
  if (!match) return null;
  const base = Number(match[1]);
  if (!Number.isFinite(base)) return null;
  return base * (match[2] === "m" ? 1_000_000 : match[2] === "k" ? 1_000 : 1);
}

const OFFER_CATEGORY_PHRASES: Array<[string, string[]]> = [
  ["PETWEAR", ["pet wear", "petwear", "wearables"]],
  ["VEHICLE", ["vehicles", "vehicle", "cars", "car"]],
  ["STROLLER", ["strollers", "stroller"]],
  ["STICKER", ["stickers", "sticker"]],
  ["FOOD", ["food", "foods"]],
  ["GIFT", ["gifts", "gift"]],
  ["TOY", ["toys", "toy"]],
  ["EGG", ["eggs", "egg"]],
  ["PET", ["pets", "pet"]],
];

function parseCategoryConstraints(message: string, prior?: NichTradingGoal) {
  const normalized = normalize(message);
  let allowed = prior?.allowedCategories?.length ? new Set(prior.allowedCategories) : undefined;
  const excluded = new Set(prior?.excludedCategories ?? []);

  for (const [category, phrases] of OFFER_CATEGORY_PHRASES) {
    for (const phrase of phrases) {
      const escaped = phrase.replace(/\s+/g, "\\s+");
      if (new RegExp(`\\b(?:only|just)\\s+(?:use\\s+)?${escaped}\\b|\\b${escaped}\\s+(?:only|lang)\\b`).test(normalized)) {
        allowed = new Set([category]);
      }
      if (new RegExp(`\\b(?:no|without|exclude|avoid|dont use|do not use|wag gamitin|huwag gamitin|wag isama|huwag isama)\\s+(?:any\\s+)?${escaped}\\b`).test(normalized)) {
        excluded.add(category);
      }
      if (new RegExp(`\\b(?:allow|include|pwede|isama)\\s+(?:the\\s+)?${escaped}\\b`).test(normalized)) {
        excluded.delete(category);
      }
    }
  }

  if (/\b(?:pets and pet wear only|pets pet wear only|pet and petwear only)\b/.test(normalized)) allowed = new Set(["PET", "PETWEAR"]);
  return { allowed, excluded };
}

function parseValueTypeConstraints(message: string, prior?: NichTradingGoal) {
  const normalized = normalize(message);
  let allowed = prior?.allowedValueTypes?.length ? new Set<ValueType>(prior.allowedValueTypes) : undefined;
  if (/\b(?:normal|regular|base|non neon)\s+(?:items?\s+)?(?:only|lang)\b|\b(?:only|just)\s+(?:use\s+)?(?:normal|regular|base)\b/.test(normalized)) allowed = new Set(["NORMAL"]);
  if (/\b(?:neon|nfr)\s+(?:items?\s+)?(?:only|lang)\b|\b(?:only|just)\s+(?:use\s+)?(?:neon|nfr)\b/.test(normalized)) allowed = new Set(["NEON"]);
  if (/\b(?:mega|mfr)\s+(?:items?\s+)?(?:only|lang)\b|\b(?:only|just)\s+(?:use\s+)?(?:mega|mfr)\b/.test(normalized)) allowed = new Set(["MEGA"]);
  if (/\b(?:no|without|dont use|do not use)\s+(?:any\s+)?mega(?:s)?\b/.test(normalized)) allowed = new Set(["NORMAL", "NEON"]);
  if (/\b(?:no|without|dont use|do not use)\s+(?:any\s+)?neon(?:s)?\b/.test(normalized)) allowed = new Set(["NORMAL", "MEGA"]);
  if (/\b(?:any variant|all variants|normal neon mega|use any variant)\b/.test(normalized)) allowed = undefined;
  return allowed;
}

function detectTargetValueType(message: string, targetName: string, prior?: NichTradingGoal): ValueType {
  const normalized = normalize(message);
  const escaped = normalize(targetName).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  if (new RegExp(`\\b(?:mega|mfr)\\s+${escaped}\\b`).test(normalized)) return "MEGA";
  if (new RegExp(`\\b(?:neon|nfr)\\s+${escaped}\\b`).test(normalized)) return "NEON";
  // An existing target keeps its original value source but the current local
  // goal does not store a target variant yet; Normal remains the safe default.
  void prior;
  return "NORMAL";
}

function offerBuilder(input: NichBrainInput): NichResponse | null {
  const message = normalize(input.message);
  const hasGoal = Boolean(input.context.tradingGoal?.targetItemId || input.context.tradingGoal?.targetItemName);
  const isOfferCommand = /\b(?:build|make|create|generate|craft|form|construct|suggest|give me|find me|assemble|optimize)\b.*\b(?:offer|trade)\b/.test(message)
    || /\b(?:offer for|offer to get|what can i offer|what should i offer|how can i get|best offer|cheapest offer|smallest offer|strongest offer)\b/.test(message)
    || /\b(?:gawan mo (?:ako|ko)|gawa ka|buo ka|bumuo|ano (?:pwede|dapat) ko ioffer|pwede ko ioffer|anong offer|offer ko para|kuha(?:in)? ko|paano ko makukuha)\b/.test(message)
    || (/\b(?:cheaper|lower|stronger|better|another|different|smaller|cleaner)\s+offer\b/.test(message) && hasGoal)
    || (hasGoal && /\b(?:without|dont use|do not use|wag gamitin|huwag gamitin|high demand|demand only|max \d+|no overpay|dont overpay|use my|include my|pets only|pet wear only|vehicles only|normal only|neon only|mega only|no vehicles|no pet wear|few items|fewer items|more items|no duplicates|one of each|reset constraints|use anything)\b/.test(message));
  if (!isOfferCommand) return null;

  const data = input.localData;
  const pending = needsProfileData(data);
  if (pending) return pending;
  if (!data) return null;
  if (!data.inventory.length) return emptyInventoryResponse(data);

  const target = targetFromGoalOrMessage(input);
  if (!target) {
    return {
      text: "Tell me the item you want, for example: “Build me an offer for Owl without using my Turtle.”",
      intent: "offerBuilder",
      reaction: "searchEmpty",
      localConfidence: 0.96,
      aiEligible: false,
    };
  }

  const source = getSource(input);
  const resetConstraints = /\b(?:reset (?:the )?(?:offer )?constraints|clear (?:the )?(?:offer )?constraints|no restrictions|use anything|anything is fine|kahit ano|reset restrictions)\b/.test(message);
  const priorGoal = resetConstraints ? undefined : input.context.tradingGoal;
  const targetVariant = detectTargetValueType(input.message, target.NAME, priorGoal);
  const targetValue = parseTradeValue(getItemValue(target, source, targetVariant));
  if (!targetValue || targetValue <= 0) {
    return {
      text: `${variantLabel(targetVariant)} ${target.NAME} doesn’t have a usable ${VALUE_SOURCE_SHORT_LABELS[source]} value, so I can’t build a reliable offer for it.`,
      intent: "offerBuilder",
      reaction: "searchEmpty",
      localConfidence: 0.99,
      aiEligible: false,
    };
  }

  const excludedIds = new Set(priorGoal?.excludedItemIds ?? []);
  extractConstraintItems(input.message, "exclude").forEach((id) => excludedIds.add(id));
  // Never spend the target itself when building an offer for that target.
  excludedIds.add(target.ID);

  const preferredIds = new Set(priorGoal?.preferredItemIds ?? []);
  extractConstraintItems(input.message, "prefer").forEach((id) => preferredIds.add(id));

  if (/\b(?:dont use|do not use|exclude|protect|keep|save)\s+(?:my\s+)?wishlist(?: items?)?\b|\b(?:wag|huwag) gamitin (?:ang )?wishlist\b/.test(message)) {
    data.wishlistItemIds.forEach((id) => excludedIds.add(id));
  }

  const topProtect = message.match(/\b(?:protect|keep|save|dont use|do not use|exclude|wag gamitin|huwag gamitin)\s+(?:my\s+)?(?:top|best|highest(?: value)?)\s*(\d{1,2})?\b/);
  if (topProtect) {
    const count = Math.max(1, Math.min(10, Number(topProtect[1] ?? 3)));
    const seen = new Set<string>();
    for (const entry of getInventoryStats(data.inventory, source).top) {
      if (!entry.item || seen.has(entry.item.ID)) continue;
      excludedIds.add(entry.item.ID);
      seen.add(entry.item.ID);
      if (seen.size >= count) break;
    }
  }

  const maxItemsMatch = message.match(/\b(?:max|maximum|only|up to|no more than|hanggang)\s+(\d{1,2})\s+(?:items?|pets?|pieces?|adds?)\b/);
  const preferFewItems = /\b(?:as few items as possible|fewest items|fewer items|less items|small(?:er)? offer|clean offer|min(?:imum)? items|konting items|kaunting items|konti lang)\b/.test(message) || priorGoal?.preferFewItems === true;
  const preferManyItems = /\b(?:more items|more smaller adds|many small adds|spread (?:it|the value)|lots of adds|downgrade style|maraming items|maraming adds)\b/.test(message) || priorGoal?.preferManyItems === true;
  const defaultMax = preferManyItems ? 16 : preferFewItems ? 6 : 10;
  const maxItems = maxItemsMatch ? Math.max(1, Math.min(18, Number(maxItemsMatch[1]))) : priorGoal?.maxItems ?? defaultMax;

  const copiesMatch = message.match(/\b(?:max|maximum|up to|no more than)\s+(\d{1,2})\s+(?:copies|copy|same item|of each)\b/);
  const noDuplicates = /\b(?:no duplicates|no dupes|one of each|one each|dont repeat items|do not repeat items|walang duplicate|tig isa lang)\b/.test(message);
  const maxCopiesPerItem = noDuplicates ? 1 : copiesMatch ? Math.max(1, Math.min(20, Number(copiesMatch[1]))) : priorGoal?.maxCopiesPerItem;

  const categories = parseCategoryConstraints(input.message, priorGoal);
  const allowedValueTypes = parseValueTypeConstraints(input.message, priorGoal);

  const maxUnitMatch = message.match(/\b(?:nothing|no item|no items|items?|pets?|adds?)\s+(?:worth\s+)?(?:over|above|more than)\s+([\d,.]+\s*[km]?)/)
    ?? message.match(/\b(?:max(?:imum)? item value|item cap|each under|each below)\s+([\d,.]+\s*[km]?)/);
  const minUnitMatch = message.match(/\b(?:items?|pets?|adds?)\s+(?:worth\s+)?(?:over|above|at least|minimum)\s+([\d,.]+\s*[km]?)/)
    ?? message.match(/\b(?:min(?:imum)? item value|each over|each above)\s+([\d,.]+\s*[km]?)/);
  const maxUnitValue = parseCompactNumberToken(maxUnitMatch?.[1]?.replace(/\s+/g, "")) ?? priorGoal?.maxUnitValue;
  const minUnitValue = parseCompactNumberToken(minUnitMatch?.[1]?.replace(/\s+/g, "")) ?? priorGoal?.minUnitValue;

  const tierMatch = message.match(/\b([sabcd])\s*(?:tier|demand)?\s+(?:or better|and above|plus|only|lang)\b/);
  const highDemandOnly = /\b(?:only|just)\s+(?:use\s+)?(?:high|strong)\s+demand\b/.test(message)
    || /\b(?:high demand lang|malakas demand lang|demand lang)\b/.test(message)
    || priorGoal?.highDemandOnly === true;
  const minimumDemandTier = (tierMatch?.[1]?.toUpperCase() as NichTradingGoal["minimumDemandTier"] | undefined)
    ?? (highDemandOnly ? "A" : priorGoal?.minimumDemandTier);

  const avoidOverpay = /\b(?:no overpay|dont overpay|do not overpay|avoid overpay|exact value|as close as possible|wag overpay|huwag overpay|sakto lang|exact lang)\b/.test(message) || priorGoal?.avoidOverpay === true;
  const objective = inferOfferObjective(input.message, input.context);

  let multiplier = 1;
  if (objective === "LOWBALL") multiplier = 0.92;
  if (objective === "COMPETITIVE") multiplier = 1.03;
  const buildTarget = targetValue * multiplier;
  const constraints: OfferBuildConstraints = {
    excludedItemIds: excludedIds,
    preferredItemIds: preferredIds,
    highDemandOnly,
    minimumDemandScore: minimumDemandTier ? getDemandScore(minimumDemandTier) : undefined,
    demandScoreOverrides: buildLiveDemandOverrides(data),
    allowedCategories: categories.allowed,
    excludedCategories: categories.excluded,
    allowedValueTypes,
    minUnitValue,
    maxUnitValue,
    maxCopiesPerItem,
    maxItems,
    minTargetPercent: objective === "LOWBALL" ? 0.83 : 0.9,
    maxOverpayPercent: avoidOverpay ? 0.015 : objective === "COMPETITIVE" ? 0.08 : 0.06,
    demandBias: objective === "HIGH_DEMAND" ? 0.22 : objective === "UPGRADE" ? 0.12 : 0.045,
    itemCountBias: preferFewItems ? 0.016 : preferManyItems ? -0.0015 : 0.004,
  };
  const built = buildOptimizedOffer(data.inventory, source, buildTarget, constraints);

  const savedGoal: NichTradingGoal = {
    targetItemId: target.ID,
    targetItemName: target.NAME,
    valueSource: source,
    objective,
    excludedItemIds: Array.from(excludedIds),
    preferredItemIds: Array.from(preferredIds),
    allowedCategories: categories.allowed ? Array.from(categories.allowed) : undefined,
    excludedCategories: categories.excluded.size ? Array.from(categories.excluded) : undefined,
    allowedValueTypes: allowedValueTypes ? Array.from(allowedValueTypes) : undefined,
    minUnitValue,
    maxUnitValue,
    maxCopiesPerItem,
    preferFewItems,
    preferManyItems,
    maxItems,
    highDemandOnly,
    minimumDemandTier,
    avoidOverpay,
  };

  if (!built.items.length) {
    return {
      text: `I couldn’t build a usable ${VALUE_SOURCE_SHORT_LABELS[source]} offer for ${target.NAME} with those constraints. Try allowing more items, more categories/variants, or removing an exclusion.`,
      intent: "offerBuilder",
      reaction: "searchEmpty",
      localConfidence: 0.99,
      aiEligible: false,
      context: { tradingGoal: savedGoal },
    };
  }

  const actualDiff = ((built.total - targetValue) / targetValue) * 100;
  const itemLines = built.items.map((item) => {
    const itemValue = (item.snapshot_value ?? 0) * Math.max(1, item.quantity);
    const variant = item.value_type === "NORMAL" ? "" : `${variantLabel(item.value_type)} `;
    const potion = potionLabel(item.potion_status);
    return `- ${item.quantity > 1 ? `${item.quantity}× ` : ""}${variant}${potion ? `${potion} ` : ""}${item.item_name} — ${formatNumber(itemValue)}`;
  });
  const descriptor = objective === "LOWBALL" ? "Lowball attempt" : objective === "COMPETITIVE" ? "Competitive offer" : objective === "HIGH_DEMAND" ? "Demand-friendly offer" : "Optimized offer";
  const demandText = built.averageDemand === null ? "unavailable" : built.averageDemand >= 90 ? "very strong" : built.averageDemand >= 82 ? "strong" : built.averageDemand >= 70 ? "good" : "mixed";
  const activeConstraintLines = [
    categories.allowed?.size ? `Categories: ${Array.from(categories.allowed).join(", ")} only` : "",
    categories.excluded.size ? `Excluded categories: ${Array.from(categories.excluded).join(", ")}` : "",
    allowedValueTypes?.size ? `Variants: ${Array.from(allowedValueTypes).join(", ")} only` : "",
    minimumDemandTier ? `Demand floor: ${minimumDemandTier} tier` : "",
    maxCopiesPerItem === 1 ? "No duplicate item names" : maxCopiesPerItem ? `Max ${maxCopiesPerItem} copies per item` : "",
    maxUnitValue ? `Per-item cap: ${formatNumber(maxUnitValue)}` : "",
    minUnitValue ? `Per-item minimum: ${formatNumber(minUnitValue)}` : "",
  ].filter(Boolean);

  return {
    text: [
      `${descriptor} for ${variantLabel(targetVariant)} ${target.NAME}:`,
      "",
      ...itemLines,
      "",
      `Your offer: ${formatNumber(built.total)}`,
      `Target: ${formatNumber(targetValue)}`,
      `Difference: ${formatSignedPercent(actualDiff)}`,
      `Demand mix: ${demandText}`,
      ...(excludedIds.size > 1 ? ["Protected/excluded items were not used."] : []),
      ...(activeConstraintLines.length ? ["", "Applied constraints:", ...activeConstraintLines.map((line) => `- ${line}`)] : []),
    ].join("\n"),
    intent: "offerBuilder",
    reaction: Math.abs(actualDiff) <= FAIR_THRESHOLD_PERCENT ? "celebrate" : "calculator",
    localConfidence: 0.99,
    aiEligible: false,
    context: {
      lastPetName: target.NAME,
      lastNumericValue: targetValue,
      lastValueSource: source,
      recentPets: built.items.map((item) => ({ petName: item.item_name, value: (item.snapshot_value ?? 0) * item.quantity, displayValue: formatNumber((item.snapshot_value ?? 0) * item.quantity) })),
      tradingGoal: savedGoal,
    },
    suggestions: [
      { id: "offer-cheaper", label: "Make it cheaper", message: "Make me a cheaper offer" },
      { id: "offer-demand", label: "Prioritize demand", message: "Make it high demand only" },
      { id: "offer-clean", label: "Use fewer items", message: "Use as few items as possible" },
    ],
  };
}

function wishlistIntelligence(input: NichBrainInput): NichResponse | null {
  const message = normalize(input.message);
  const isWishlist = /\b(?:wishlist|wish list|watchlist|dream pets?|goal pets?|target list|targets? i want|things i want|pets i want|items i want)\b/.test(message)
    || /\b(?:what should i get next|what can i get next|what should i aim for|what should i target|next target|next goal|next upgrade|closest target|closest wishlist|which wishlist can i afford|which target can i afford|ano next target|ano next goal|alin pinaka malapit|ano pinakamalapit|ano nasa wishlist|wishlist ko|target ko|goal ko)\b/.test(message);
  if (!isWishlist) return null;
  const data = input.localData;
  const pending = needsProfileData(data);
  if (pending) return pending;
  if (!data) return null;
  if (!data.wishlistItemIds.length) {
    return {
      text: "Your wishlist is empty. Add a few targets first, then I can rank which ones you’re closest to and build offers from your inventory.",
      intent: "wishlist",
      reaction: "searchEmpty",
      navigation: { href: "/wishlist", label: "Open Wishlist", delay: 850 },
      localConfidence: 1,
      aiEligible: false,
    };
  }

  const source = getSource(input);
  const stats = getInventoryStats(data.inventory, source);
  const rawTargets = data.wishlistItemIds.flatMap((id) => {
    const item = getItemById(id);
    if (!item) return [];
    const value = parseTradeValue(getItemValue(item, source, "NORMAL"));
    return value && value > 0 ? [{ item, value, gap: value - stats.total }] : [];
  }).sort((a, b) => Math.abs(a.gap) - Math.abs(b.gap));
  const targets = rawTargets.slice(0, 12).map((target) => {
    const built = buildOptimizedOffer(data.inventory, source, target.value, {
      excludedItemIds: new Set([target.item.ID]),
      maxItems: 10,
      minTargetPercent: 0.88,
      maxOverpayPercent: 0.07,
      demandBias: data.preferences?.prefer_high_demand ? 0.09 : 0.035,
      demandScoreOverrides: buildLiveDemandOverrides(data),
      itemCountBias: data.preferences?.avoid_randoms ? 0.009 : 0.004,
    });
    const offerDifference = target.value > 0 ? ((built.total - target.value) / target.value) * 100 : -100;
    const offerReady = built.items.length > 0 && built.total >= target.value * 0.88 && built.total <= target.value * 1.07;
    return { ...target, built, offerDifference, offerReady };
  }).sort((a, b) => Number(b.offerReady) - Number(a.offerReady) || Math.abs(a.offerDifference) - Math.abs(b.offerDifference) || Math.abs(a.gap) - Math.abs(b.gap));

  if (/\b(?:closest|next|should i get|can i get)\b/.test(message)) {
    const lines = targets.slice(0, 5).map((target, index) => {
      const status = target.offerReady
        ? `offer-ready at ${formatSignedPercent(target.offerDifference)}`
        : target.gap <= 0
          ? "raw value is enough, but I couldn’t form a clean offer under the current optimizer limits"
          : `${formatNumber(target.gap)} short by total inventory value`;
      return `${index + 1}. ${target.item.NAME} — ${formatNumber(target.value)} (${status})`;
    });
    const best = targets[0];
    return {
      text: [
        `Closest wishlist targets using ${VALUE_SOURCE_SHORT_LABELS[source]}:`,
        "",
        ...lines,
        ...(best ? ["", best.offerReady ? `Best next target: ${best.item.NAME}. I can already form a practical local offer near its value.` : best.gap <= 0 ? `Closest target: ${best.item.NAME}. Your total inventory value is enough, but the current item mix doesn’t form a clean offer yet.` : `Closest target: ${best.item.NAME}. You’re ${formatNumber(best.gap)} short by raw inventory value.`] : []),
      ].join("\n"),
      intent: "wishlist",
      reaction: "calculator",
      localConfidence: 0.99,
      aiEligible: false,
      context: best ? { lastPetName: best.item.NAME, lastValueSource: source, tradingGoal: { targetItemId: best.item.ID, targetItemName: best.item.NAME, valueSource: source } } : undefined,
      suggestions: best && best.offerReady ? [{ id: "wishlist-build", label: `Offer for ${best.item.NAME}`, message: `Build me an offer for ${best.item.NAME}` }] : undefined,
    };
  }

  const names = data.wishlistItemIds.slice(0, 20).map((id) => getItemById(id)?.NAME).filter((name): name is string => Boolean(name));
  return {
    text: [`You have ${data.wishlistItemIds.length} item${data.wishlistItemIds.length === 1 ? "" : "s"} on your wishlist:`, "", ...names.map((name) => `- ${name}`), ...(data.wishlistItemIds.length > 20 ? [`...and ${data.wishlistItemIds.length - 20} more.`] : [])].join("\n"),
    intent: "wishlist",
    reaction: "calculator",
    localConfidence: 0.99,
    aiEligible: false,
  };
}

function exchangeIntelligence(input: NichBrainInput): NichResponse | null {
  const message = normalize(input.message);
  const isExchange = /\b(?:exchange|listing|listings|marketplace|market offers?|available trades?|open trades?|trades i can afford|trades i can do|trades i can make|find me trades|find trades for me|find matches|best matches|my matches|who has|who is trading|anyone trading|listings for|offers for|hanap trade|hanap listing|hanapan mo ko|hanapan mo ako|mga trade na kaya ko|mga listing na kaya ko|sino may|sino nagtrade|match ko)\b/.test(message);
  if (!isExchange) return null;
  const data = input.localData;
  const pending = needsProfileData(data);
  if (pending) return pending;
  if (!data) return null;
  if (!data.exchangeListings.length) {
    return {
      text: "There aren’t any open CSBT Exchange listings in my current local snapshot.",
      intent: "exchange",
      reaction: "searchEmpty",
      localConfidence: 0.99,
      aiEligible: false,
    };
  }
  if (!data.inventory.length) return emptyInventoryResponse(data);

  const preferences = data.preferences as MarketplacePreferences;
  const ranked = rankListingMatches(data.exchangeListings, data.inventory, new Set(data.wishlistItemIds), preferences)
    .filter((match) => match.score >= Math.min(preferences.min_match_score, 75));
  const target = findPetsInMessage(input.message)[0]?.pet;
  const filtered = target
    ? ranked.filter((match) => match.listing.items.some((item) => item.side === "HAVE" && item.item_id === target.ID))
    : ranked;
  const best = filtered.slice(0, 5);

  if (!best.length) {
    return {
      text: target
        ? `I couldn’t find a strong open Exchange match for ${target.NAME} using your current inventory and preferences.`
        : "I couldn’t find a strong open Exchange match using your current inventory and preferences.",
      intent: "exchange",
      reaction: "searchEmpty",
      navigation: { href: "/exchange", label: "Browse Exchange", delay: 950 },
      localConfidence: 0.99,
      aiEligible: false,
    };
  }

  const lines = best.map((match, index) => {
    const have = match.listing.items.filter((item) => item.side === "HAVE").map((item) => `${item.quantity > 1 ? `${item.quantity}× ` : ""}${item.item_name}`).join(" + ") || "Open offer";
    return `${index + 1}. ${have} — ${match.label} (${match.score}% match)${match.reasons[0] ? ` · ${match.reasons[0]}` : ""}`;
  });
  return {
    text: ["Best CSBT Exchange matches from your current inventory:", "", ...lines, "", "Open Exchange to inspect the listing or send an offer."].join("\n"),
    intent: "exchange",
    reaction: "celebrate",
    navigation: { href: "/exchange", label: "Open Exchange", delay: 1400 },
    localConfidence: 0.99,
    aiEligible: false,
  };
}

function getTrend(rows: NichValueHistoryRow[]) {
  const valid = rows.filter((row) => typeof row.value === "number" && Number.isFinite(row.value));
  if (valid.length < 2) return null;
  const first = valid[0];
  const last = valid[valid.length - 1];
  if (!first.value || !last.value) return null;
  const change = last.value - first.value;
  return { first: first.value, last: last.value, change, percent: (change / first.value) * 100, days: Math.max(1, Math.round((new Date(last.snapshot_date).getTime() - new Date(first.snapshot_date).getTime()) / 86_400_000)) };
}

function valueHistoryIntelligence(input: NichBrainInput): NichResponse | null {
  const message = normalize(input.message);
  const isTrend = /\b(?:rising|falling|going up|going down|uptrend|downtrend|trend|trending|trend lately|performance|gainer|loser|gained value|lost value|went up|went down|changed|change this week|change this month|change lately|last week|last month|increased|decreased|momentum|moving up|moving down|tumaas|tumataas|bumaba|bumababa|umaakyat|pababa|galaw ng value|nag mahal|nagmahal|nag mura|nagmura)\b/.test(message);
  if (!isTrend) return null;
  const data = input.localData;
  const pending = needsProfileData(data);
  if (pending) return pending;
  if (!data) return null;
  if (!data.valueHistory.length) {
    return {
      text: "I don’t have enough recent value-history snapshots loaded to calculate that trend locally yet.",
      intent: "valueHistory",
      reaction: "searchEmpty",
      localConfidence: 0.98,
      aiEligible: false,
    };
  }

  const source = getSource(input);
  const target = findPetsInMessage(input.message)[0]?.pet;
  if (target) {
    const type: ValueType = /\bmega\b|\bmfr\b/.test(message) ? "MEGA" : /\bneon\b|\bnfr\b/.test(message) ? "NEON" : "NORMAL";
    const rows = data.valueHistory.filter((row) => row.item_id === target.ID && row.source === source && row.value_type === type);
    const trend = getTrend(rows);
    if (!trend) {
      return {
        text: `I don’t have enough recent ${VALUE_SOURCE_SHORT_LABELS[source]} history for ${variantLabel(type)} ${target.NAME} to call a trend yet.`,
        intent: "valueHistory",
        reaction: "searchEmpty",
        localConfidence: 0.99,
        aiEligible: false,
      };
    }
    const direction = trend.change > 0 ? "Rising" : trend.change < 0 ? "Falling" : "Flat";
    return {
      text: [
        `${variantLabel(type)} ${target.NAME} — ${direction}`,
        `Recent change: ${formatSignedPercent(trend.percent)} over about ${trend.days} day${trend.days === 1 ? "" : "s"}`,
        `${formatNumber(trend.first)} → ${formatNumber(trend.last)} (${VALUE_SOURCE_SHORT_LABELS[source]})`,
        `Demand tier: ${target.DEMAND_TIER ?? "N/A"}${target.DEMAND_TIER ? ` (${DEMAND_LABEL[target.DEMAND_TIER] ?? "mixed"} demand)` : ""}`,
      ].join("\n"),
      intent: "valueHistory",
      reaction: trend.change >= 0 ? "celebrate" : "calculator",
      localConfidence: 0.99,
      aiEligible: false,
      context: { lastPetName: target.NAME, lastValueSource: source },
    };
  }

  const inventoryIds = new Set(data.inventory.map((row) => row.item_id));
  const grouped = new Map<string, NichValueHistoryRow[]>();
  for (const row of data.valueHistory) {
    if (!inventoryIds.has(row.item_id) || row.source !== source || row.value_type !== "NORMAL") continue;
    const current = grouped.get(row.item_id) ?? [];
    current.push(row);
    grouped.set(row.item_id, current);
  }
  const ranked = Array.from(grouped.entries()).flatMap(([id, rows]) => {
    const trend = getTrend(rows);
    const item = getItemById(id);
    return trend && item ? [{ item, trend }] : [];
  }).sort((a, b) => b.trend.percent - a.trend.percent);
  const losers = /\b(?:loser|falling|went down|decreased|biggest drop)\b/.test(message);
  const selected = (losers ? [...ranked].reverse() : ranked).slice(0, 5);
  if (!selected.length) return null;
  return {
    text: [
      losers ? `Biggest recent decliners in your inventory (${VALUE_SOURCE_SHORT_LABELS[source]}):` : `Biggest recent gainers in your inventory (${VALUE_SOURCE_SHORT_LABELS[source]}):`,
      "",
      ...selected.map((entry, index) => `${index + 1}. ${entry.item.NAME} — ${formatSignedPercent(entry.trend.percent)} (${formatNumber(entry.trend.first)} → ${formatNumber(entry.trend.last)})`),
    ].join("\n"),
    intent: "valueHistory",
    reaction: "calculator",
    localConfidence: 0.99,
    aiEligible: false,
  };
}


function getDemandSignal(data: NichLocalProfileData | undefined, itemId: string) {
  return data?.demandSignals.find((signal) => signal.item_id === itemId);
}

function externalTrendLabel(trend: "rising" | "dropping" | "mixed" | "stable" | undefined) {
  if (trend === "rising") return "rising";
  if (trend === "dropping") return "dropping";
  if (trend === "mixed") return "mixed";
  if (trend === "stable") return "stable";
  return null;
}

function demandStrength(item: TradeItem, data?: NichLocalProfileData): number | null {
  const signal = getDemandSignal(data, item.ID);
  const liveOverride = buildLiveDemandOverrides(data).get(item.ID);
  if (liveOverride !== undefined) return liveOverride;
  if (!item.DEMAND_TIER) return null;

  let strength = getDemandScore(item.DEMAND_TIER);
  if (signal) {
    strength += Math.min(14, signal.wants24h * 1.6 + signal.accepted7d * 0.9);
    if (signal.externalTrend === "rising") strength += 4;
    if (signal.externalTrend === "dropping") strength -= 4;
  }
  return Math.max(0, Math.min(100, strength));
}

function demandIntelligence(input: NichBrainInput): NichResponse | null {
  const message = normalize(input.message);
  const demandQuestion = /\b(?:demand|liquid|liquidity|tradeable|tradable|easy to trade|hard to trade|retrade|hot right now|whats hot|what is hot|most wanted|popular right now|market activity|malakas demand|mahina demand|madaling itrade|mahirap itrade|mabenta|patok)\b/.test(message);
  if (!demandQuestion) return null;

  const matches = findPetsInMessage(input.message);
  // Concept questions such as “what does high demand mean?” do not need
  // account/profile data. Let the deterministic advice brain answer them
  // instead of returning a misleading “loading inventory” response.
  const asksDemandRanking = /\b(?:whats hot|what is hot|most wanted|popular right now|market activity|top demand|highest demand|best demand)\b/.test(message);
  const asksAboutOwnDemand = /\b(?:my|inventory|inv|owned|i own|ko|akin)\b/.test(message);
  // With no concrete item, only the “what is hot?” and user-inventory ranking
  // forms need live profile data. General demand/liquidity questions should be
  // answered by the zero-cost deterministic advice brain.
  if (matches.length === 0 && !asksDemandRanking && !asksAboutOwnDemand) return null;

  // Leave trade-shaped messages to the normal W/F/L parser so this demand
  // route never swallows a comparison just because only one item was found
  // during fuzzy pre-detection.
  const hasTwoTradeSides = /\b(?:me|mine|my side|my offer|i offer|i give)\b/.test(message)
    && /\b(?:them|theirs|their side|their offer|they offer|they give)\b/.test(message);
  const hasVersusStructure = /\b(?:vs|versus|against|wfl|w f l)\b/.test(message);
  if (hasTwoTradeSides || hasVersusStructure || (matches.length > 1 && /\b(?:for|trade|offer|compare|win|fair|lose)\b/.test(message))) return null;

  const data = input.localData;
  const pending = needsProfileData(data);
  if (pending) return pending;
  if (!data) return null;

  const target = matches[0]?.pet ?? (input.context.lastPetName ? getItem(input.context.lastPetName) ?? undefined : undefined);
  if (target) {
    const signal = getDemandSignal(data, target.ID);
    const tier = String(target.DEMAND_TIER ?? "").toUpperCase();
    const tierText = tier ? `${tier} (${DEMAND_LABEL[tier] ?? "mixed"})` : "not rated";
    const lines = [
      `${target.NAME} demand: ${tierText}.`,
      signal ? `CSBT Exchange activity: ${signal.activity}${signal.wants24h || signal.accepted7d ? ` · ${signal.wants24h} wanted in the last 24h · ${signal.accepted7d} accepted in the last 7d` : ""}` : "CSBT Exchange activity: not enough recent activity yet.",
    ];
    const trend = externalTrendLabel(signal?.externalTrend);
    if (trend) lines.push(`External market-update signal: ${trend}${signal?.externalUpdatedAt ? ` (latest update ${signal.externalUpdatedAt.slice(0, 10)})` : ""}.`);
    const strength = demandStrength(target, data);
    if (strength === null) {
      lines.push("Local read: not enough catalog or Exchange evidence to classify liquidity yet.");
    } else {
      lines.push(strength >= 96 ? "Local read: very easy to move compared with most items." : strength >= 84 ? "Local read: strong demand and generally good liquidity." : strength >= 70 ? "Local read: healthy/usable demand, but not top-tier liquidity." : strength >= 56 ? "Local read: average liquidity; value alone may not guarantee a quick retrade." : "Local read: weaker liquidity, so I’d be more careful accepting it as a large part of an offer.");
    }
    return {
      text: lines.join("\n"),
      intent: "tradeAdvice",
      reaction: strength !== null && strength >= 84 ? "celebrate" : "calculator",
      localConfidence: 0.99,
      aiEligible: false,
      context: { lastPetName: target.NAME },
    };
  }

  const inventoryOnly = /\b(?:my|inventory|inv|owned|i own|ko|akin)\b/.test(message);
  const inventoryIds = new Set(data.inventory.map((row) => row.item_id));
  const candidateIds = inventoryOnly
    ? Array.from(inventoryIds)
    : Array.from(new Set(data.demandSignals.map((signal) => signal.item_id)));
  const ranked = candidateIds.flatMap((id) => {
    const item = getItemById(id);
    if (!item) return [];
    const signal = getDemandSignal(data, id);
    const strength = demandStrength(item, data);
    return strength === null ? [] : [{ item, signal, strength }];
  }).sort((a, b) => b.strength - a.strength || (b.signal?.wants24h ?? 0) - (a.signal?.wants24h ?? 0));

  if (!ranked.length) {
    return {
      text: inventoryOnly
        ? "I don’t have enough demand data for the items in your inventory yet."
        : "CSBT Exchange is still collecting enough recent demand activity to rank what is hot right now.",
      intent: "tradeAdvice",
      reaction: "searchEmpty",
      localConfidence: 0.98,
      aiEligible: false,
      navigation: { href: "/demand", label: "Open Demand", delay: 900 },
    };
  }

  return {
    text: [
      inventoryOnly ? "Strongest demand/liquidity in your inventory:" : "Strongest current demand signals I can see:",
      "",
      ...ranked.slice(0, 6).map((entry, index) => {
        const tier = String(entry.item.DEMAND_TIER ?? "N/A");
        const live = entry.signal ? ` · ${entry.signal.activity}${entry.signal.wants24h ? ` · ${entry.signal.wants24h} wanted/24h` : ""}${entry.signal.accepted7d ? ` · ${entry.signal.accepted7d} accepted/7d` : ""}` : "";
        const trend = entry.signal?.externalTrend ? ` · ${entry.signal.externalTrend}` : "";
        return `${index + 1}. ${entry.item.NAME} — ${tier} demand${live}${trend}`;
      }),
    ].join("\n"),
    intent: "tradeAdvice",
    reaction: "calculator",
    localConfidence: 0.99,
    aiEligible: false,
    navigation: inventoryOnly ? undefined : { href: "/demand", label: "Open Demand", delay: 1400 },
  };
}

function tradingProfile(input: NichBrainInput): NichResponse | null {
  const message = normalize(input.message);
  const isProfile = /\b(?:my trading style|my preferences|trading preferences|exchange preferences|my settings|trade settings|how do i trade|what kind of trader|what do i prefer|my trade history|recent trades|trade stats|my trade stats|my record|my win rate|my losses|my wins|completed trades|trading style ko|preferences ko|settings ko|trade history ko|trade stats ko|record ko|mga trades ko)\b/.test(message);
  if (!isProfile) return null;
  const data = input.localData;
  const pending = needsProfileData(data);
  if (pending) return pending;
  if (!data) return null;
  const prefs = data.preferences;

  if (/\b(?:history|recent trades|win rate|my losses|my wins)\b/.test(message)) {
    const trades = data.recentTrades;
    if (!trades.length) {
      return {
        text: "You don’t have saved trade-history entries yet, so I can’t summarize your results locally.",
        intent: "tradingProfile",
        reaction: "searchEmpty",
        navigation: { href: "/trades", label: "Open Trade History", delay: 850 },
        localConfidence: 1,
        aiEligible: false,
      };
    }
    const wins = trades.filter((trade) => String(trade.verdict).toUpperCase() === "WIN").length;
    const fairs = trades.filter((trade) => String(trade.verdict).toUpperCase() === "FAIR").length;
    const losses = trades.filter((trade) => String(trade.verdict).toUpperCase() === "LOSE").length;
    const completed = trades.filter((trade) => trade.status === "completed").length;
    return {
      text: [
        `Recent saved trade history (${trades.length} entries):`,
        `Wins: ${wins}`,
        `Fair: ${fairs}`,
        `Losses: ${losses}`,
        `Completed: ${completed}`,
        "",
        "These are your saved CSBT results, not AI guesses.",
      ].join("\n"),
      intent: "tradingProfile",
      reaction: "calculator",
      localConfidence: 1,
      aiEligible: false,
    };
  }

  if (!prefs) return null;
  const likes = [
    prefs.prefer_upgrades && "upgrades",
    prefs.prefer_downgrades && "downgrades",
    prefs.prefer_high_demand && "high-demand items",
    prefs.prefer_overpays && "overpay-friendly matches",
  ].filter(Boolean);
  const avoids = [
    prefs.avoid_randoms && "random adds",
    prefs.avoid_hard_to_trade && "hard-to-trade items",
  ].filter(Boolean);
  return {
    text: [
      "Your current CSBT trading preferences:",
      `Value system: ${VALUE_SOURCE_SHORT_LABELS[prefs.value_source]}`,
      `Prefer: ${likes.length ? likes.join(", ") : "no special bias"}`,
      `Avoid: ${avoids.length ? avoids.join(", ") : "nothing specific"}`,
      `Minimum Exchange match: ${prefs.min_match_score}%`,
      "",
      "I use these preferences when ranking Exchange matches and building local offers.",
    ].join("\n"),
    intent: "tradingProfile",
    reaction: "calculator",
    localConfidence: 1,
    aiEligible: false,
  };
}

function counterOffer(input: NichBrainInput): NichResponse | null {
  const message = normalize(input.message);
  const isCounter = /\b(?:fix (?:this|the) trade|fix my offer|make (?:it|this|the trade) fair|make this closer|counteroffer|counter offer|counter this|what should i add|what should i remove|what add makes it fair|what removal makes it fair|what do they need to add|what should they add|how do i fix|how can i balance|balance (?:this|the) trade|smallest fix|closest fair offer|ayusin (?:mo )?(?:to|ito|trade)|ayusin offer ko|pa fair|pafair|ano idagdag|ano idadagdag|ano tatanggalin|ano alisin|ano ipapaadd ko|ano ipa add ko|paano gawing fair|paano ibalance|gawing sakto)\b/.test(message);
  if (!isCounter) return null;
  const comparison = input.context.lastTradeComparison;
  if (!comparison) {
    return {
      text: "Send me the trade first, then say “fix this trade” or “make it fair.”",
      intent: "counterOffer",
      reaction: "searchEmpty",
      localConfidence: 1,
      aiEligible: false,
    };
  }
  const source = comparison.valueSource ?? getSource(input);
  const difference = comparison.difference;
  const threshold = Math.max(comparison.offeredValue, comparison.requestedValue) * 0.05;
  if (Math.abs(difference) <= threshold) {
    return {
      text: "That trade is already inside NICH’s Fair range (within 5%), so it doesn’t need a value correction. Demand can still decide whether you personally want it.",
      intent: "counterOffer",
      reaction: "celebrate",
      localConfidence: 1,
      aiEligible: false,
    };
  }

  // Negative difference means the user is overpaying. Search combinations
  // of removals (bounded to 12 trade entries) instead of only trying one item.
  if (difference < 0) {
    const offered = comparison.offeredItems.slice(0, 12);
    type RemovalCandidate = { removed: typeof offered; newOffered: number; pct: number; rank: number };
    let best: RemovalCandidate | null = null;
    const states = 1 << offered.length;
    for (let mask = 1; mask < states; mask += 1) {
      const removed = offered.filter((_, index) => (mask & (1 << index)) !== 0);
      const removedValue = removed.reduce((sum, item) => sum + item.value, 0);
      const newOffered = Math.max(0, comparison.offeredValue - removedValue);
      const pct = ((comparison.requestedValue - newOffered) / Math.max(newOffered, comparison.requestedValue, 1)) * 100;
      // Prefer closest-to-fair first, then fewer removals when similarly close.
      const rank = Math.abs(pct) + removed.length * 0.12;
      if (!best || rank < best.rank) best = { removed, newOffered, pct, rank };
    }
    if (best?.removed.length) {
      const grouped = new Map<string, { label: string; quantity: number }>();
      for (const item of best.removed) {
        const key = `${item.petCode}:${item.petName}`;
        const current = grouped.get(key);
        if (current) current.quantity += 1;
        else grouped.set(key, { label: `${item.petCode} ${item.petName}`.trim(), quantity: 1 });
      }
      const removalLabel = Array.from(grouped.values()).map((entry) => `${entry.quantity > 1 ? `${entry.quantity}× ` : ""}${entry.label}`).join(" + ");
      return {
        text: [
          `Best local correction: remove ${removalLabel} from your side.`,
          `New your total: ${formatNumber(best.newOffered)}`,
          `Their total: ${formatNumber(comparison.requestedValue)}`,
          `New difference: ${formatSignedPercent(best.pct)}`,
          Math.abs(best.pct) <= FAIR_THRESHOLD_PERCENT ? "That moves the trade into NICH’s Fair range." : `That’s the closest removal combination I found, but it is still outside the ${FAIR_THRESHOLD_PERCENT}% Fair range.`,
        ].join("\n"),
        intent: "counterOffer",
        reaction: Math.abs(best.pct) <= FAIR_THRESHOLD_PERCENT ? "celebrate" : "calculator",
        localConfidence: 0.99,
        aiEligible: false,
      };
    }
  }

  // Positive difference means the user is receiving more. Build a small
  // multi-item add from inventory after approximately subtracting items that
  // are already committed to the current trade.
  const data = input.localData;
  if (difference > 0 && data?.inventory.length) {
    const remaining = data.inventory.map((row) => ({ ...row }));
    for (const offeredItem of comparison.offeredItems) {
      const canonical = getItem(offeredItem.petName);
      if (!canonical) continue;
      const valueType: ValueType = offeredItem.variant === "mega" ? "MEGA" : offeredItem.variant === "neon" ? "NEON" : "NORMAL";
      const row = remaining.find((entry) => entry.item_id === canonical.ID && entry.value_type === valueType && entry.quantity > 0);
      if (row) row.quantity -= 1;
    }
    const usable = remaining.filter((row) => row.quantity > 0);
    const built = buildOptimizedOffer(usable, source, difference, {
      maxItems: 4,
      minTargetPercent: 0.55,
      maxOverpayPercent: 0.25,
      demandBias: 0.05,
      itemCountBias: 0.012,
    });
    if (built.items.length) {
      const addValue = built.total;
      const newOffered = comparison.offeredValue + addValue;
      const pct = ((comparison.requestedValue - newOffered) / Math.max(newOffered, comparison.requestedValue, 1)) * 100;
      const addText = built.items.map((item) => `${item.quantity > 1 ? `${item.quantity}× ` : ""}${item.value_type === "NORMAL" ? "" : `${variantLabel(item.value_type)} `}${item.item_name}`).join(" + ");
      return {
        text: [
          `Best small add from your remaining inventory: ${addText}.`,
          `Added value: ${formatNumber(addValue)}`,
          `New your total: ${formatNumber(newOffered)}`,
          `Their total: ${formatNumber(comparison.requestedValue)}`,
          `New difference: ${formatSignedPercent(pct)}`,
          Math.abs(pct) <= FAIR_THRESHOLD_PERCENT ? "That lands inside NICH’s Fair range." : "That’s the closest compact add combination I found locally.",
        ].join("\n"),
        intent: "counterOffer",
        reaction: Math.abs(pct) <= FAIR_THRESHOLD_PERCENT ? "celebrate" : "calculator",
        localConfidence: 0.99,
        aiEligible: false,
      };
    }
  }

  return {
    text: difference > 0
      ? `You’re already receiving about ${formatNumber(difference)} more value. If the other trader wants a fairer balance, ask me again after adding your inventory so I can pick the closest local add.`
      : `You’re overpaying by about ${formatNumber(Math.abs(difference))}. Removing one item didn’t produce a clean correction, so I’d ask the other side to add around that value.`,
    intent: "counterOffer",
    reaction: "calculator",
    localConfidence: 0.98,
    aiEligible: false,
  };
}

export function getTradeDemandAnalysis(comparison: NichTradeComparison, data?: NichLocalProfileData) {
  const sourceItems = comparison.offeredItems.map((entry) => getItem(entry.petName)).filter((item): item is TradeItem => Boolean(item));
  const targetItems = comparison.requestedItems.map((entry) => getItem(entry.petName)).filter((item): item is TradeItem => Boolean(item));
  if (!sourceItems.length || !targetItems.length) return null;

  const aggregate = (items: TradeItem[]) => {
    const catalogScores = items.flatMap((item) => item.DEMAND_TIER ? [getDemandScore(item.DEMAND_TIER)] : []);
    const knownStrengths = items.flatMap((item) => {
      const strength = demandStrength(item, data);
      return strength === null ? [] : [strength];
    });
    const baseDemand = catalogScores.length ? catalogScores.reduce((sum, score) => sum + score, 0) / catalogScores.length : null;
    const liveStrength = knownStrengths.length ? knownStrengths.reduce((sum, score) => sum + score, 0) / knownStrengths.length : null;
    let wants24h = 0;
    let accepted7d = 0;
    let rising = 0;
    let dropping = 0;
    for (const item of items) {
      const signal = getDemandSignal(data, item.ID);
      if (!signal) continue;
      wants24h += signal.wants24h;
      accepted7d += signal.accepted7d;
      if (signal.externalTrend === "rising") rising += 1;
      if (signal.externalTrend === "dropping") dropping += 1;
    }
    return { baseDemand, liveStrength, wants24h, accepted7d, rising, dropping };
  };

  const yours = aggregate(sourceItems);
  const theirs = aggregate(targetItems);
  if (yours.liveStrength === null && theirs.liveStrength === null) return null;
  const demandGap = yours.liveStrength !== null && theirs.liveStrength !== null
    ? theirs.liveStrength - yours.liveStrength
    : null;
  const shape = targetItems.length < sourceItems.length ? "upgrade" : targetItems.length > sourceItems.length ? "downgrade" : "sidegrade";
  const downgradePremium = shape === "downgrade" && demandGap !== null
    ? Math.min(8, 2 + Math.max(0, targetItems.length - sourceItems.length) * 0.8 + Math.max(0, -demandGap) * 0.04)
    : 0;
  const liquidity = demandGap === null
    ? "There isn’t enough comparable demand evidence to rank both sides confidently."
    : demandGap >= 12
      ? "Their side has the stronger current demand/liquidity profile."
      : demandGap <= -12
        ? "Your current side has the stronger demand/liquidity profile."
        : "Current demand/liquidity evidence looks fairly balanced between the two sides.";
  return { yours, theirs, demandGap, shape, downgradePremium, liquidity };
}

export function enhanceTradeResponseLocally(response: NichResponse, input: NichBrainInput): NichResponse {
  const comparison = response.tradeComparison;
  if (!comparison) return response;
  const demand = getTradeDemandAnalysis(comparison, input.localData);
  if (!demand) return { ...response, localConfidence: 0.99, aiEligible: false };
  const message = normalize(input.message);
  const userAskedDemand = /\b(?:demand|liquid|liquidity|tradeable|tradable|easy to trade|hard to trade|upgrade|downgrade|mabenta|marketability|marketable)\b/.test(message);
  if (!userAskedDemand) return { ...response, localConfidence: 0.99, aiEligible: false };
  const shapeLabel = demand.shape === "upgrade" ? "Upgrade" : demand.shape === "downgrade" ? "Downgrade" : "Sidegrade";
  const demandBand = (value: number) => value >= 93 ? "Very High" : value >= 82 ? "High" : value >= 70 ? "Good" : value >= 56 ? "Average" : "Low";
  const shapeLine = `Trade shape: ${shapeLabel}.`;
  const sideDemandLabel = (side: typeof demand.yours) => {
    const catalog = side.baseDemand === null ? "catalog tier unavailable" : `${demandBand(side.baseDemand)} catalog demand`;
    const current = side.liveStrength === null ? "no current comparable demand score" : `${demandBand(side.liveStrength)} current evidence`;
    return `${catalog} · ${current}`;
  };
  const liveLine = (side: typeof demand.yours) => side.wants24h || side.accepted7d
    ? `${side.wants24h} wanted on Exchange in 24h · ${side.accepted7d} accepted in 7d`
    : "no strong recent Exchange activity signal";
  const trendLine = (side: typeof demand.yours) => side.rising || side.dropping
    ? `${side.rising} rising · ${side.dropping} dropping market-update signal${side.rising + side.dropping === 1 ? "" : "s"}`
    : "no clear recent external trend signal";
  const extra = userAskedDemand ? [
    "",
    "Demand check:",
    `Your side: ${sideDemandLabel(demand.yours)} · ${liveLine(demand.yours)} · ${trendLine(demand.yours)}`,
    `Their side: ${sideDemandLabel(demand.theirs)} · ${liveLine(demand.theirs)} · ${trendLine(demand.theirs)}`,
    demand.liquidity,
    ...(demand.shape === "downgrade" && demand.downgradePremium > 0 ? [`For this downgrade, I’d want roughly ${demand.downgradePremium.toFixed(1)}% extra value/demand cushion before calling it attractive.`] : []),
  ] : [];
  return {
    ...response,
    text: [response.text, "", shapeLine, ...extra].join("\n"),
    localConfidence: 0.99,
    aiEligible: false,
  };
}

/**
 * Deterministic "Local Max" routes. This intentionally recognizes many
 * natural phrasings and converts them into CSBT operations instead of sending
 * them to a paid model.
 */
export function createLocalIntelligenceResponse(input: NichBrainInput): NichResponse | null {
  // Priority matters: a command like "build an offer from my inventory" is an
  // offer-builder request, not a generic inventory summary.
  return contextualToolAction(input)
    ?? counterOffer(input)
    ?? offerBuilder(input)
    ?? wishlistIntelligence(input)
    ?? exchangeIntelligence(input)
    ?? demandIntelligence(input)
    ?? valueHistoryIntelligence(input)
    ?? tradingProfile(input)
    ?? inventorySummary(input);
}

export default createLocalIntelligenceResponse;

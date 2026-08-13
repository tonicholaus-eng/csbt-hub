import { routeNichMessage } from "../src/components/nich/assistant/brain/router";
import type { NichConversationContext, NichLocalProfileData } from "../src/components/nich/assistant/brain/types";
import { DEFAULT_MARKETPLACE_PREFERENCES } from "../src/lib/exchange/matching";
import type { InventoryExchangeRow } from "../src/lib/exchange/types";
import { getItem } from "../src/lib/search";

function item(name: string) {
  const found = getItem(name);
  if (!found) throw new Error(`Fixture item missing: ${name}`);
  return found;
}

function row(name: string, quantity: number): InventoryExchangeRow {
  const found = item(name);
  return {
    item_id: found.ID,
    item_name: found.NAME,
    image_url: found.IMAGE || null,
    category: found.CATEGORY,
    value_type: "NORMAL",
    potion_status: "BASE",
    quantity,
  };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const owl = item("Owl");
const frost = item("Frost Dragon");
const turtle = item("Turtle");
const cow = item("Cow");
const evil = item("Evil Unicorn");
const arctic = item("Arctic Reindeer");

const localData: NichLocalProfileData = {
  loaded: true,
  authenticated: true,
  inventory: [
    row("Evil Unicorn", 1),
    row("Arctic Reindeer", 1),
    row("Cow", 2),
    row("Turtle", 2),
    row("Kangaroo", 4),
    row("Strawberry Shortcake Bat Dragon", 2),
  ],
  wishlistItemIds: [owl.ID, frost.ID],
  preferences: { ...DEFAULT_MARKETPLACE_PREFERENCES, value_source: "GCASH" },
  exchangeListings: [{
    id: "listing-owl",
    user_id: "other-user",
    display_name: "Trader",
    value_source: "GCASH",
    intent: "SPECIFIC",
    status: "OPEN",
    title: "Trading Owl",
    note: null,
    preferences: {},
    allow_counteroffers: true,
    expires_at: "2099-01-01T00:00:00.000Z",
    created_at: "2026-08-13T00:00:00.000Z",
    updated_at: "2026-08-13T00:00:00.000Z",
    items: [
      { item_id: owl.ID, item_name: owl.NAME, image_url: owl.IMAGE || null, category: owl.CATEGORY, value_type: "NORMAL", potion_status: "BASE", quantity: 1, snapshot_value: 2900, side: "HAVE" },
      { item_id: cow.ID, item_name: cow.NAME, image_url: cow.IMAGE || null, category: cow.CATEGORY, value_type: "NORMAL", potion_status: "BASE", quantity: 1, snapshot_value: 425, side: "WANT" },
    ],
  }],
  valueHistory: [
    { item_id: frost.ID, item_name: frost.NAME, source: "GCASH", value_type: "NORMAL", value: 3300, snapshot_date: "2026-07-15" },
    { item_id: frost.ID, item_name: frost.NAME, source: "GCASH", value_type: "NORMAL", value: 3600, snapshot_date: "2026-08-12" },
  ],
  recentTrades: [
    { id: "t1", value_source: "GCASH", your_items: [], their_items: [], your_total: 100, their_total: 120, verdict: "WIN", status: "completed", created_at: "2026-08-12T00:00:00Z" },
    { id: "t2", value_source: "GCASH", your_items: [], their_items: [], your_total: 100, their_total: 100, verdict: "FAIR", status: "completed", created_at: "2026-08-11T00:00:00Z" },
  ],
  demandSignals: [
    { item_id: owl.ID, wants24h: 12, accepted7d: 8, activity: "hot", externalTrend: "rising", externalUpdatedAt: "2026-08-12T00:00:00Z" },
    { item_id: evil.ID, wants24h: 8, accepted7d: 5, activity: "hot", externalTrend: "rising" },
    { item_id: arctic.ID, wants24h: 4, accepted7d: 4, activity: "active", externalTrend: "stable" },
    { item_id: cow.ID, wants24h: 5, accepted7d: 3, activity: "active", externalTrend: "stable" },
    { item_id: turtle.ID, wants24h: 3, accepted7d: 2, activity: "active", externalTrend: "stable" },
    { item_id: frost.ID, wants24h: 9, accepted7d: 7, activity: "hot", externalTrend: "rising" },
  ],
};

function ask(message: string, context: NichConversationContext = {}) {
  return routeNichMessage({ message, context, localData });
}

const lookup = ask("fd value");
assert(lookup.intent === "petLookup", "Existing shorthand value lookup must still work");

const basicTrade = ask("frost dragon vs owl");
assert(basicTrade.intent === "tradeComparison", "Existing direct WFL comparison must still work");

const nearby = ask("pets around 500");
assert(nearby.intent === "nearbyValue", "Existing nearby-value search must still work");

const inventory = ask("magkano inventory ko");
assert(inventory.intent === "inventory", "Taglish inventory value should stay local");
assert(inventory.aiEligible === false, "Inventory response should skip paid AI");
assert(/inventory is worth/i.test(inventory.text), "Inventory response should include worth");

const ownership = ask("do i have turtle in my inv");
assert(ownership.intent === "inventory", "Ownership query should use inventory intelligence");
assert(/Turtle/.test(ownership.text), "Ownership answer should identify Turtle");

const offer = ask("build me an offer for owl without turtle, pets only, no duplicates, use as few items as possible");
assert(offer.intent === "offerBuilder", "Constrained offer should use local offer builder");
assert(offer.aiEligible === false, "Offer builder should skip paid AI");
assert(!/^.*Turtle —/m.test(offer.text), "Excluded Turtle must not be used in offer lines");
assert(/Categories: PET only/.test(offer.text), "Pets-only constraint should be applied");
assert(/No duplicate item names/.test(offer.text), "No-duplicates constraint should be applied");
assert(offer.context?.tradingGoal?.targetItemName === "Owl", "Offer target should persist in structured goal memory");

const followContext: NichConversationContext = { ...offer.context, tradingGoal: offer.context?.tradingGoal };
const follow = ask("make it cheaper, normal only, max 4 items", followContext);
assert(follow.intent === "offerBuilder", "Offer constraint follow-up should keep target from memory");
assert(/Variants: NORMAL only/.test(follow.text), "Variant constraint should be understood locally");

const demandOffer = ask("gawan mo ko offer para owl high demand lang max 6 items");
assert(demandOffer.intent === "offerBuilder", "Taglish high-demand offer should be local");
assert(demandOffer.aiEligible === false, "High-demand offer should not call paid AI");

const wishlist = ask("what should i get next from my wishlist");
assert(wishlist.intent === "wishlist", "Wishlist planning should be local");
assert(/wishlist/i.test(wishlist.text), "Wishlist response should explain target readiness");

const exchange = ask("find exchange trades i can afford");
assert(exchange.intent === "exchange", "Exchange discovery should be local");
assert(/Exchange/i.test(exchange.text), "Exchange response should contain Exchange results");

const demand = ask("is owl high demand and easy to trade");
assert(demand.intent === "tradeAdvice", "Demand question should use local demand intelligence");
assert(/12 wanted in the last 24h/.test(demand.text), "Demand should include live Exchange activity");
assert(/rising/.test(demand.text), "Demand should include external trend signal");
assert(!/Overall NICH Score|Value Score|Demand Score:/i.test(demand.text), "Forbidden #5 multi-score system must not be present");

const trend = ask("is frost dragon rising");
assert(trend.intent === "valueHistory", "Value trend should use local value history");
assert(/Rising/.test(trend.text), "Frost history should be identified as rising");

const profile = ask("show my trading preferences");
assert(profile.intent === "tradingProfile", "Trading profile should be local");
assert(profile.aiEligible === false, "Trading profile should skip paid AI");

const trade = ask("me frost dragon them owl + turtle should i accept demand wise");
assert(trade.intent === "tradeComparison", "Messy natural trade should still parse as WFL");
assert(trade.tradeComparison, "Trade comparison should be retained");
assert(/Trade shape:/.test(trade.text), "Trade should include upgrade/downgrade shape");
assert(/Demand check:/.test(trade.text), "Demand-aware trade should include qualitative demand evidence");
assert(!/Overall NICH Score|Value Score|Demand Score:/i.test(trade.text), "Trade must not contain the skipped #5 score system");

const tradeContext: NichConversationContext = { ...trade.context, lastTradeComparison: trade.tradeComparison };
const fixed = ask("fix this trade", tradeContext);
assert(fixed.intent === "counterOffer", "Counteroffer correction should be local");
assert(/correction|add|Fair range|fair/i.test(fixed.text), "Counteroffer should propose a deterministic correction");

console.log("NICH Local Max smoke tests passed.");
console.log(`Inventory intent: ${inventory.intent}`);
console.log(`Offer intent: ${offer.intent}`);
console.log(`Demand intent: ${demand.intent}`);
console.log(`Trade verdict: ${trade.tradeComparison?.verdict}`);
console.log(`Counter intent: ${fixed.intent}`);

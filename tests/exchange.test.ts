import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_MARKETPLACE_PREFERENCES, getDemandScore, sumExchangeItems } from "../src/lib/exchange/matching";

test("exchange item totals respect quantity", () => {
  const total = sumExchangeItems([
    { item_id: "a", item_name: "A", image_url: null, value_type: "NORMAL", potion_status: "BASE", quantity: 2, snapshot_value: 100, category: "PET", demand_tier: "A", side: "HAVE" },
    { item_id: "b", item_name: "B", image_url: null, value_type: "NORMAL", potion_status: "BASE", quantity: 1, snapshot_value: 25, category: "PET", demand_tier: "B", side: "HAVE" },
  ]);
  assert.equal(total, 225);
});

test("marketplace defaults keep a meaningful match threshold", () => {
  assert.equal(DEFAULT_MARKETPLACE_PREFERENCES.min_match_score, 65);
  assert.ok(getDemandScore("S") > getDemandScore("C"));
});

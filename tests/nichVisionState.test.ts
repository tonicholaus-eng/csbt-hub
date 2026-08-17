import test from "node:test";
import assert from "node:assert/strict";

import { createTradeSessionFromVision } from "../src/lib/nich/tradeSession";
import { verifyVisionItem } from "../src/lib/nich/vision";
import { getItem } from "../src/lib/search";

test("vision state keeps item, variant and side confidence separate", () => {
  const frost = getItem("Frost Dragon");
  assert.ok(frost);
  const session = createTradeSessionFromVision({
    recognitionVersion: "test",
    layoutConfidence: 0.99,
    items: [{
      rawName: "Frost Dragon",
      side: "YOU",
      slot: 1,
      variant: "NORMAL",
      potion: "FR",
      quantity: 1,
      confidence: 0.94,
      itemConfidence: 0.99,
      variantConfidence: 0.61,
      sideConfidence: 0.99,
      itemId: frost.ID,
      itemName: frost.NAME,
      category: "PET",
      databaseConfidence: 1,
      verified: true,
      alternatives: [],
    }],
  });
  assert.ok(session);
  const slot = session.userSide[0];
  assert.equal(slot.confidence.item, 0.99);
  assert.equal(slot.confidence.variant, 0.61);
  assert.equal(slot.confidence.side, 0.99);
  assert.equal(slot.status, "UNCERTAIN");
});

test("vision catalog verification never accepts an invented canonical item", () => {
  const verified = verifyVisionItem({
    rawName: "Purple Space Hamster Dragon Cat",
    side: "YOU",
    variant: "NORMAL",
    potion: "NONE",
    quantity: 1,
    confidence: 0.95,
    itemConfidence: 0.95,
    variantConfidence: 0.95,
    sideConfidence: 0.99,
    categoryHint: "PET",
    candidateNames: [],
    candidateScores: [],
  });
  assert.equal(verified.verified, false);
  assert.equal(verified.itemId, undefined);
});

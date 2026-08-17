import test from "node:test";
import assert from "node:assert/strict";

import { createTradeSessionFromVision } from "../src/lib/nich/tradeSession";
import { consolidateTradeSlotDetections, mergeVisionCrossCheck, repairTradeGeometry, shouldBlockTradeLayout, summarizeVisionItems, verifyVisionItem } from "../src/lib/nich/vision";
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


test("high-confidence exact icon is not rejected merely because unscored alternatives were supplied", () => {
  const verified = verifyVisionItem({
    rawName: "Balloon Unicorn",
    side: "YOU",
    slot: 1,
    variant: "NORMAL",
    potion: "FR",
    quantity: 1,
    confidence: 0.92,
    itemConfidence: 0.92,
    variantConfidence: 0.9,
    sideConfidence: 0.95,
    categoryHint: "PET",
    candidateNames: ["Balloon Unicorn", "Unicorn"],
  });
  assert.equal(verified.itemName, "Balloon Unicorn");
  assert.equal(verified.verified, true);
});

test("competitive scored visual alternatives stay unresolved", () => {
  const verified = verifyVisionItem({
    rawName: "Balloon Unicorn",
    side: "YOU",
    slot: 1,
    variant: "NORMAL",
    potion: "FR",
    quantity: 1,
    confidence: 0.9,
    itemConfidence: 0.9,
    variantConfidence: 0.9,
    sideConfidence: 0.95,
    categoryHint: "PET",
    candidateNames: ["Balloon Unicorn", "Unicorn"],
    candidateScores: [
      { itemName: "Balloon Unicorn", score: 0.82 },
      { itemName: "Unicorn", score: 0.72 },
    ],
  });
  assert.equal(verified.verified, false);
  assert.equal(verified.verificationReason, "model-reported-alternatives");
});

test("trade geometry repairs clear left/right assignments from bounding boxes", () => {
  const repaired = repairTradeGeometry([
    {
      rawName: "Balloon Unicorn", side: "NONE", variant: "NORMAL", potion: "FR", quantity: 1,
      confidence: 0.8, itemConfidence: 0.8, variantConfidence: 0.8, sideConfidence: 0.2,
      categoryHint: "PET", box: { x: 0.08, y: 0.2, width: 0.1, height: 0.1 },
    },
    {
      rawName: "Cabbit", side: "NONE", variant: "MEGA", potion: "FR", quantity: 1,
      confidence: 0.8, itemConfidence: 0.8, variantConfidence: 0.8, sideConfidence: 0.2,
      categoryHint: "PET", box: { x: 0.67, y: 0.2, width: 0.1, height: 0.1 },
    },
  ], "TRADE");
  assert.equal(repaired[0].side, "YOU");
  assert.equal(repaired[1].side, "THEM");
  assert.equal(repaired[0].slot, 1);
  assert.equal(repaired[1].slot, 1);
});

test("a structurally consistent trade is not blocked only by conservative global layout confidence", () => {
  assert.equal(shouldBlockTradeLayout({
    imageType: "TRADE",
    layoutConfidence: 0.31,
    incompleteTradeGrid: false,
    structurallyConsistentTrade: true,
  }), false);
  assert.equal(shouldBlockTradeLayout({
    imageType: "TRADE",
    layoutConfidence: 0.31,
    incompleteTradeGrid: true,
    structurallyConsistentTrade: false,
  }), true);
});

test("uncertain trade slots are still shown by side instead of a generic unreadable message", () => {
  const uncertain = verifyVisionItem({
    rawName: "Balloon Unicorn",
    side: "YOU",
    slot: 1,
    variant: "NORMAL",
    potion: "FR",
    quantity: 1,
    confidence: 0.7,
    itemConfidence: 0.7,
    variantConfidence: 0.9,
    sideConfidence: 0.95,
    categoryHint: "PET",
    candidateNames: ["Balloon Unicorn", "Unicorn"],
  });
  const text = summarizeVisionItems("TRADE", [uncertain]);
  assert.match(text, /YOUR SIDE/);
  assert.match(text, /Balloon Unicorn/);
  assert.match(text, /\?/);
});


test("independent vision disagreement never auto-confirms a wrong pet", () => {
  const first = verifyVisionItem({
    rawName: "Glormy Dolphin", side: "YOU", slot: 2, variant: "NORMAL", potion: "R", quantity: 1,
    confidence: 0.94, itemConfidence: 0.94, variantConfidence: 0.94, sideConfidence: 0.98,
    categoryHint: "PET", candidateNames: ["Glormy Dolphin"], candidateScores: [{ itemName: "Glormy Dolphin", score: 0.94 }],
  }, { allowConfusionFamilyConfirmation: true });
  const audit = verifyVisionItem({
    rawName: "Frostbite Bear", side: "YOU", slot: 2, variant: "NORMAL", potion: "R", quantity: 1,
    confidence: 0.93, itemConfidence: 0.93, variantConfidence: 0.94, sideConfidence: 0.98,
    categoryHint: "PET", candidateNames: ["Frostbite Bear"], candidateScores: [{ itemName: "Frostbite Bear", score: 0.93 }],
  }, { allowConfusionFamilyConfirmation: true });
  assert.equal(first.verified, true);
  assert.equal(audit.verified, true);
  const [merged] = mergeVisionCrossCheck([first], [audit]);
  assert.equal(merged.verified, false);
  assert.equal(merged.verificationReason, "cross-pass-disagreement");
  assert.ok(merged.alternatives.includes("Frostbite Bear"));
});

test("independent vision agreement strengthens the same canonical identity", () => {
  const first = verifyVisionItem({
    rawName: "Cabbit", side: "THEM", slot: 1, variant: "MEGA", potion: "FR", quantity: 1,
    confidence: 0.88, itemConfidence: 0.88, variantConfidence: 0.82, sideConfidence: 0.98,
    categoryHint: "PET", candidateNames: ["Cabbit"], candidateScores: [{ itemName: "Cabbit", score: 0.88 }],
  }, { allowConfusionFamilyConfirmation: true });
  const audit = verifyVisionItem({
    rawName: "Cabbit", side: "THEM", slot: 1, variant: "MEGA", potion: "FR", quantity: 1,
    confidence: 0.94, itemConfidence: 0.94, variantConfidence: 0.94, sideConfidence: 0.98,
    categoryHint: "PET", candidateNames: ["Cabbit"], candidateScores: [{ itemName: "Cabbit", score: 0.94 }],
  }, { allowConfusionFamilyConfirmation: true });
  const [merged] = mergeVisionCrossCheck([first], [audit]);
  assert.equal(merged.verified, true);
  assert.equal(merged.itemName, "Cabbit");
  assert.equal(merged.verificationReason, "cross-pass-agreement");
  assert.equal(merged.variant, "MEGA");
  assert.equal(merged.potion, "FR");
});

test("known visual-confusion families require a targeted audit before auto-confirming", () => {
  const first = verifyVisionItem({
    rawName: "Glormy Dolphin", side: "YOU", slot: 2, variant: "NORMAL", potion: "R", quantity: 1,
    confidence: 0.98, itemConfidence: 0.98, variantConfidence: 0.95, sideConfidence: 0.98,
    categoryHint: "PET", candidateNames: ["Glormy Dolphin"], candidateScores: [{ itemName: "Glormy Dolphin", score: 0.98 }],
  });
  assert.equal(first.verified, false);
  assert.equal(first.verificationReason, "visual-confusion-family");
  assert.ok(first.alternatives.includes("Frostbite Bear"));

  const audited = verifyVisionItem({
    rawName: "Frostbite Bear", side: "YOU", slot: 2, variant: "NORMAL", potion: "R", quantity: 1,
    confidence: 0.94, itemConfidence: 0.94, variantConfidence: 0.95, sideConfidence: 0.98,
    categoryHint: "PET",
    candidateNames: ["Frostbite Bear", "Glormy Dolphin"],
    candidateScores: [
      { itemName: "Frostbite Bear", score: 0.94 },
      { itemName: "Glormy Dolphin", score: 0.52 },
    ],
  }, { allowConfusionFamilyConfirmation: true });
  assert.equal(audited.verified, true);
  assert.equal(audited.itemName, "Frostbite Bear");
});

test("geometry can recover left and right sides when the trade is off-center", () => {
  const repaired = repairTradeGeometry([
    {
      rawName: "Balloon Unicorn", side: "NONE", variant: "NORMAL", potion: "FR", quantity: 1,
      confidence: 0.8, itemConfidence: 0.8, variantConfidence: 0.8, sideConfidence: 0.2,
      categoryHint: "PET", box: { x: 0.17, y: 0.2, width: 0.08, height: 0.1 },
    },
    {
      rawName: "Frostbite Bear", side: "NONE", variant: "NORMAL", potion: "R", quantity: 1,
      confidence: 0.8, itemConfidence: 0.8, variantConfidence: 0.8, sideConfidence: 0.2,
      categoryHint: "PET", box: { x: 0.28, y: 0.2, width: 0.08, height: 0.1 },
    },
    {
      rawName: "Cabbit", side: "NONE", variant: "MEGA", potion: "FR", quantity: 1,
      confidence: 0.8, itemConfidence: 0.8, variantConfidence: 0.8, sideConfidence: 0.2,
      categoryHint: "PET", box: { x: 0.72, y: 0.2, width: 0.08, height: 0.1 },
    },
  ], "TRADE");
  assert.equal(repaired[0].side, "YOU");
  assert.equal(repaired[1].side, "YOU");
  assert.equal(repaired[2].side, "THEM");
});

test("cross-pass badge disagreement keeps identity but asks for the variant instead of guessing", () => {
  const first = verifyVisionItem({
    rawName: "Balloon Unicorn", side: "YOU", slot: 1, variant: "NORMAL", potion: "FR", quantity: 1,
    confidence: 0.93, itemConfidence: 0.93, variantConfidence: 0.88, sideConfidence: 0.98,
    categoryHint: "PET", candidateNames: ["Balloon Unicorn"], candidateScores: [{ itemName: "Balloon Unicorn", score: 0.93 }],
  });
  const audit = verifyVisionItem({
    rawName: "Balloon Unicorn", side: "YOU", slot: 1, variant: "NEON", potion: "R", quantity: 1,
    confidence: 0.92, itemConfidence: 0.92, variantConfidence: 0.86, sideConfidence: 0.98,
    categoryHint: "PET", candidateNames: ["Balloon Unicorn"], candidateScores: [{ itemName: "Balloon Unicorn", score: 0.92 }],
  });
  const [merged] = mergeVisionCrossCheck([first], [audit]);
  assert.equal(merged.verified, true);
  assert.equal(merged.itemName, "Balloon Unicorn");
  assert.equal(merged.variant, "UNKNOWN");
  assert.equal(merged.potion, "UNKNOWN");
  assert.ok((merged.variantConfidence ?? 1) < 0.72);
});

test("clear bounding-box geometry overrides a confidently wrong side label", () => {
  const repaired = repairTradeGeometry([
    {
      rawName: "Cabbit", side: "YOU", variant: "MEGA", potion: "FR", quantity: 1,
      confidence: 0.95, itemConfidence: 0.95, variantConfidence: 0.95, sideConfidence: 0.97,
      categoryHint: "PET", box: { x: 0.75, y: 0.18, width: 0.08, height: 0.1 },
    },
    {
      rawName: "Balloon Unicorn", side: "YOU", variant: "NORMAL", potion: "FR", quantity: 1,
      confidence: 0.95, itemConfidence: 0.95, variantConfidence: 0.95, sideConfidence: 0.97,
      categoryHint: "PET", box: { x: 0.12, y: 0.18, width: 0.08, height: 0.1 },
    },
  ], "TRADE");
  assert.equal(repaired[0].side, "THEM");
  assert.equal(repaired[1].side, "YOU");
});

test("decisive ranked candidate can correct an incorrect raw visual name", () => {
  const verified = verifyVisionItem({
    rawName: "Unicorn", side: "YOU", slot: 1, variant: "NORMAL", potion: "FR", quantity: 1,
    confidence: 0.9, itemConfidence: 0.9, variantConfidence: 0.92, sideConfidence: 0.98,
    categoryHint: "PET",
    candidateNames: ["Unicorn", "Balloon Unicorn"],
    candidateScores: [
      { itemName: "Balloon Unicorn", score: 0.94 },
      { itemName: "Unicorn", score: 0.56 },
    ],
  });
  assert.equal(verified.itemName, "Balloon Unicorn");
  assert.equal(verified.verified, true);
  assert.equal(verified.verificationReason, "ranked-candidate-high-confidence");
});


test("duplicate detections of the same multiview slot are consolidated instead of double-counted", () => {
  const consolidated = consolidateTradeSlotDetections([
    {
      rawName: "Cabbit", side: "THEM", slot: 1, variant: "MEGA", potion: "FR", quantity: 1,
      confidence: 0.91, itemConfidence: 0.91, variantConfidence: 0.88, sideConfidence: 0.98,
      categoryHint: "PET", candidateNames: ["Cabbit"], candidateScores: [{ itemName: "Cabbit", score: 0.91 }],
    },
    {
      rawName: "Cabbit", side: "THEM", slot: 1, variant: "MEGA", potion: "FR", quantity: 1,
      confidence: 0.87, itemConfidence: 0.87, variantConfidence: 0.91, sideConfidence: 0.97,
      categoryHint: "PET", candidateNames: ["Cabbit"], candidateScores: [{ itemName: "Cabbit", score: 0.87 }],
    },
  ], "TRADE");
  assert.equal(consolidated.length, 1);
  assert.equal(consolidated[0].rawName, "Cabbit");
  assert.equal(consolidated[0].slot, 1);
  assert.equal(consolidated[0].quantity, 1);
});


test("empty trade recognition never tells the user to correct invisible slots", () => {
  const text = summarizeVisionItems("TRADE", []);
  assert.match(text, /could not identify any occupied item slots/i);
  assert.doesNotMatch(text, /Correct only the unclear slot/i);
});

test("uncertain trade summary names the exact side, slot, candidate and uncertainty", () => {
  const uncertain = verifyVisionItem({
    rawName: "blue round pet",
    side: "YOU",
    slot: 2,
    variant: "UNKNOWN",
    potion: "UNKNOWN",
    quantity: 1,
    confidence: 0.45,
    itemConfidence: 0.45,
    variantConfidence: 0.35,
    sideConfidence: 0.96,
    categoryHint: "PET",
    candidateNames: ["Frostbite Bear", "Glormy Dolphin"],
  });
  const text = summarizeVisionItems("TRADE", [uncertain]);
  assert.match(text, /YOUR SIDE/);
  assert.match(text, /Slot 2/);
  assert.match(text, /NEEDS CONFIRMATION/);
  assert.match(text, /possible:/);
  assert.match(text, /my slot 2 is Frostbite Bear/i);
});

test("trade detections with unclear side are still shown instead of hidden", () => {
  const uncertain = verifyVisionItem({
    rawName: "Cabbit",
    side: "NONE",
    slot: 1,
    variant: "MEGA",
    potion: "FR",
    quantity: 1,
    confidence: 0.8,
    itemConfidence: 0.8,
    variantConfidence: 0.9,
    sideConfidence: 0.2,
    categoryHint: "PET",
    candidateNames: ["Cabbit"],
  });
  const text = summarizeVisionItems("TRADE", [uncertain]);
  assert.match(text, /SIDE UNCLEAR/);
  assert.match(text, /Cabbit/);
});

test("empty item vision result does not claim successful recognition", () => {
  const text = summarizeVisionItems("ITEM", []);
  assert.match(text, /Screenshot received/);
  assert.doesNotMatch(text, /screenshot recognized/i);
});


test("generic Elephant icon is held for Bush Elephant disambiguation", () => {
  const first = verifyVisionItem({
    rawName: "Elephant", side: "YOU", slot: 1, variant: "NEON", potion: "FR", quantity: 1,
    confidence: 0.97, itemConfidence: 0.97, variantConfidence: 0.95, sideConfidence: 0.99,
    categoryHint: "PET", candidateNames: ["Elephant"], candidateScores: [{ itemName: "Elephant", score: 0.97 }],
  });
  assert.equal(first.verified, false);
  assert.equal(first.verificationReason, "visual-confusion-family");
  assert.ok(first.alternatives.includes("Bush Elephant"));
});

test("targeted Elephant audit can decisively select Bush Elephant", () => {
  const audited = verifyVisionItem({
    rawName: "Bush Elephant", side: "YOU", slot: 1, variant: "NEON", potion: "FR", quantity: 1,
    confidence: 0.94, itemConfidence: 0.94, variantConfidence: 0.95, sideConfidence: 0.99,
    categoryHint: "PET",
    candidateNames: ["Bush Elephant", "Elephant"],
    candidateScores: [
      { itemName: "Bush Elephant", score: 0.95 },
      { itemName: "Elephant", score: 0.54 },
    ],
  }, { allowConfusionFamilyConfirmation: true });
  assert.equal(audited.verified, true);
  assert.equal(audited.itemName, "Bush Elephant");
});

test("Sugar Skull Dog stays ambiguous against Sugar Axolotl until audited", () => {
  const first = verifyVisionItem({
    rawName: "Sugar Skull Dog", side: "THEM", slot: 3, variant: "NORMAL", potion: "FR", quantity: 1,
    confidence: 0.93, itemConfidence: 0.93, variantConfidence: 0.9, sideConfidence: 0.99,
    categoryHint: "PET", candidateNames: ["Sugar Skull Dog"], candidateScores: [{ itemName: "Sugar Skull Dog", score: 0.93 }],
  });
  assert.equal(first.verified, false);
  assert.ok(first.alternatives.includes("Sugar Axolotl"));
});

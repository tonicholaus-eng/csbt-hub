import test from "node:test";
import assert from "node:assert/strict";

import routeNichMessage from "../src/components/nich/assistant/brain/router";
import {
  consolidateTradeSlotDetections,
  verifyVisionItem,
  verifyVisionItemFromEvidence,
  type NichVisionRawItem,
} from "../src/lib/nich/vision";
import {
  decideSlotIdentity,
  retrieveCatalogCandidates,
  VISION_ACCEPT_THRESHOLD,
  VISION_CONFIRM_THRESHOLD,
  type NichVisualEvidence,
} from "../src/lib/nich/visionRecognition";
import {
  buildSlotManifest,
  decodeSlotManifest,
  encodeSlotManifest,
  padSlotBox,
  planSlotSheet,
  slotTileLabel,
} from "../src/lib/nich/visionSlots";
import {
  inferScreenshotIntent,
  screenshotRouteMessage,
} from "../src/lib/nich/screenshotIntent";
import {
  createTradeSessionFromVision,
  findTradeSlot,
  formatTradeSessionForCalculation,
  type NichTradeSession,
  type VisionTradeItemLike,
} from "../src/lib/nich/tradeSession";
import { getItem, searchCatalogTypeahead } from "../src/lib/search";

function slotEvidence(overrides: Partial<NichVisionRawItem> = {}): NichVisionRawItem {
  return {
    rawName: "",
    side: "YOU",
    slot: 1,
    variant: "UNKNOWN",
    potion: "UNKNOWN",
    quantity: 1,
    confidence: 0.6,
    itemConfidence: 0.6,
    variantConfidence: 0.6,
    sideConfidence: 0.95,
    categoryHint: "PET",
    bodyColors: [],
    features: [],
    candidateNames: [],
    ...overrides,
  };
}

/* ------------------------------------------------------------------ *
 * A. an invented pet name must never become a real catalog identity
 * ------------------------------------------------------------------ */

test("a confident name that contradicts the artwork is not accepted", () => {
  // The reported failure: the model confidently named a dark, skeletal, winged
  // icon "Undead Jousting Horse" (a real catalog pet, but the wrong one). The
  // name is now only a low-trust signal, and the visual evidence — dragon, not
  // horse — decides what reaches the catalog.
  const decided = verifyVisionItemFromEvidence(slotEvidence({
    rawName: "Undead Jousting Horse",
    animalType: "dragon",
    bodyColors: ["black", "gray"],
    features: ["skeletal ribcage", "long wings", "horned head"],
    confidence: 0.95,
    itemConfidence: 0.95,
  }));

  assert.equal(decided.verified, false);
  assert.notEqual(decided.recognitionStatus, "ACCEPTED");
  assert.notEqual(decided.itemName, "Undead Jousting Horse");
  // Every offered candidate must be a real catalog entry.
  for (const candidate of decided.topCandidates ?? []) {
    assert.ok(getItem(candidate.itemName), `${candidate.itemName} is not in the catalog`);
  }
});

test("text similarity alone can never carry an identity", () => {
  const evidence: NichVisualEvidence = {
    animalType: "dog",
    bodyColors: ["white"],
    features: ["skeletal body"],
    freeFormName: "Throne Skeleton Dog",
    possibleCatalogNames: [],
    visualConfidence: 0.95,
  };
  const candidates = retrieveCatalogCandidates(evidence, { category: "PET", limit: 6 });
  const decision = decideSlotIdentity({ evidence, candidates });
  assert.notEqual(decision.status, "ACCEPTED");
  // Any weak-name-similarity contribution must stay far below acceptance.
  for (const candidate of candidates) {
    if (candidate.signals.includes("weak-name-similarity")) {
      assert.ok(candidate.score < VISION_ACCEPT_THRESHOLD);
    }
  }
});

test("the layout verifier no longer accepts a name that only fuzzy-matches the catalog", () => {
  // Each of these is a plausible-sounding name that is NOT in the catalog but
  // sits within ~0.9 string similarity of a real pet. The old verifier accepted
  // them via `databaseConfidence >= 0.82`; text similarity may no longer confirm
  // an identity at all.
  for (const rawName of ["Shadow Dragoon", "Frost Dragone", "Bat Draggon", "Undead Jousting Horsey"]) {
    const verified = verifyVisionItem({
      rawName,
      side: "YOU",
      slot: 1,
      variant: "NORMAL",
      potion: "NONE",
      quantity: 1,
      confidence: 0.99,
      itemConfidence: 0.99,
      variantConfidence: 0.99,
      sideConfidence: 0.99,
      categoryHint: "PET",
    }, { allowConfusionFamilyConfirmation: true });
    assert.equal(verified.verified, false, `${rawName} was accepted`);
    assert.equal(verified.verificationReason, "fuzzy-name-not-in-catalog");
    assert.ok(verified.databaseConfidence >= 0.82, "the old accept condition would still have been met");
  }
});

test("one naming opinion is only counted once, however it is repeated", () => {
  const base = {
    animalType: "dragon",
    bodyColors: ["white", "blue"],
    features: ["icy spikes"],
    visualConfidence: 0.9,
  };
  const namedOnce = retrieveCatalogCandidates(
    { ...base, possibleCatalogNames: ["Frost Dragon"] },
    { category: "PET", limit: 3 },
  );
  const namedTwice = retrieveCatalogCandidates(
    { ...base, freeFormName: "Frost Dragon", possibleCatalogNames: ["Frost Dragon"] },
    { category: "PET", limit: 3 },
  );
  const scoreOf = (list: typeof namedOnce) => list.find((c) => c.itemName === "Frost Dragon")?.score ?? 0;
  // Repeating the same guess in both naming fields must not stack bonuses.
  assert.ok(scoreOf(namedTwice) - scoreOf(namedOnce) <= 0.26 + 1e-9);
});

/* ------------------------------------------------------------------ *
 * B. low visual confidence abstains instead of guessing
 * ------------------------------------------------------------------ */

test("weak visual evidence returns UNKNOWN instead of a pet name", () => {
  const decided = verifyVisionItemFromEvidence(slotEvidence({
    rawName: "",
    animalType: "dog",
    bodyColors: [],
    features: [],
    confidence: 0.2,
    itemConfidence: 0.2,
  }));
  assert.equal(decided.recognitionStatus, "UNKNOWN");
  assert.equal(decided.verified, false);
  assert.equal(decided.itemId, undefined);
});

test("a catalog-image verifier answering NONE blocks acceptance", () => {
  const evidence: NichVisualEvidence = {
    animalType: "dragon",
    bodyColors: ["white", "blue"],
    features: ["icy spikes", "wings", "horns"],
    freeFormName: "Frost Dragon",
    possibleCatalogNames: ["Frost Dragon"],
    visualConfidence: 0.92,
  };
  const candidates = retrieveCatalogCandidates(evidence, { category: "PET", limit: 5 });
  assert.equal(decideSlotIdentity({ evidence, candidates }).status, "ACCEPTED");

  const rejected = decideSlotIdentity({
    evidence,
    candidates,
    verification: { chosenItemId: null, confidence: 0.9 },
  });
  assert.notEqual(rejected.status, "ACCEPTED");
  assert.equal(rejected.reason, "catalog-image-match-rejected-all");
});

test("a medium-confidence identity asks for confirmation rather than auto-recognizing", () => {
  const evidence: NichVisualEvidence = {
    animalType: "dragon",
    bodyColors: ["white", "blue"],
    features: ["icy spikes"],
    freeFormName: "Frost Dragon",
    possibleCatalogNames: ["Frost Dragon"],
    visualConfidence: 0.5,
  };
  const candidates = retrieveCatalogCandidates(evidence, { category: "PET", limit: 5 });
  const decision = decideSlotIdentity({ evidence, candidates });
  assert.notEqual(decision.status, "ACCEPTED");
  assert.ok(decision.topCandidates.length > 0);
  assert.ok(candidates[0].score >= VISION_CONFIRM_THRESHOLD || decision.status === "UNKNOWN");
});

/* ------------------------------------------------------------------ *
 * C/D. duplicates and modifiers
 * ------------------------------------------------------------------ */

test("two slots showing the same pet stay the same species", () => {
  const shared = {
    animalType: "dragon",
    bodyColors: ["white", "blue"],
    features: ["icy spikes", "wings", "horns"],
    rawName: "Frost Dragon",
    candidateNames: ["Frost Dragon"],
    confidence: 0.9,
    itemConfidence: 0.9,
  };
  const first = verifyVisionItemFromEvidence(slotEvidence({ ...shared, slot: 2, variant: "NEON", potion: "R", variantConfidence: 0.9 }));
  const second = verifyVisionItemFromEvidence(slotEvidence({ ...shared, slot: 3, variant: "NORMAL", potion: "FR", variantConfidence: 0.9 }));

  assert.equal(first.itemName, second.itemName);
  assert.equal(first.itemName, "Frost Dragon");
  // Identity is shared; only the badge metadata differs.
  assert.equal(first.variant, "NEON");
  assert.equal(second.variant, "NORMAL");
  assert.equal(first.potion, "R");
  assert.equal(second.potion, "FR");
});

test("consolidation never merges two distinct occupied slots into one", () => {
  const first = verifyVisionItemFromEvidence(slotEvidence({ slot: 2, animalType: "dragon", rawName: "Frost Dragon", candidateNames: ["Frost Dragon"] }));
  const second = verifyVisionItemFromEvidence(slotEvidence({ slot: 3, animalType: "dragon", rawName: "Frost Dragon", candidateNames: ["Frost Dragon"] }));
  const consolidated = consolidateTradeSlotDetections([first, second], "TRADE");
  assert.equal(consolidated.length, 2);
  assert.deepEqual(consolidated.map((item) => item.slot).sort(), [2, 3]);
});

test("an unreadable badge stays UNKNOWN instead of being guessed", () => {
  const decided = verifyVisionItemFromEvidence(slotEvidence({
    animalType: "dragon",
    rawName: "Frost Dragon",
    candidateNames: ["Frost Dragon"],
    variant: "UNKNOWN",
    potion: "UNKNOWN",
    variantConfidence: 0.3,
  }));
  assert.equal(decided.variant, "UNKNOWN");
  assert.equal(decided.potion, "UNKNOWN");
});

/* ------------------------------------------------------------------ *
 * E. correction typeahead
 * ------------------------------------------------------------------ */

test("typing 'fro' prioritizes Frost… catalog matches", () => {
  const names = searchCatalogTypeahead("fro", { limit: 8, category: "PET" }).map((item) => item.NAME);
  assert.ok(names.includes("Frost Dragon"), names.join(", "));
  assert.ok(names.includes("Frost Fury"), names.join(", "));
  // Every suggestion must start with the typed prefix before any fuzzy result.
  assert.ok(names.slice(0, 4).every((name) => name.toLowerCase().startsWith("fro")), names.join(", "));
});

test("typeahead suggestions are always real catalog entries", () => {
  for (const query of ["fro", "sha", "bat dr", "cab"]) {
    for (const item of searchCatalogTypeahead(query, { limit: 6 })) {
      assert.ok(getItem(item.NAME), `${item.NAME} is not a catalog entry`);
    }
  }
});


test("community spacing 'uni horn' resolves to the real Unicorn Horn catalog item", () => {
  const names = searchCatalogTypeahead("uni horn", { limit: 6 }).map((item) => item.NAME);
  assert.equal(names[0], "Unicorn Horn", names.join(", "));
});

test("one-letter/spacing slip 'raincloud rat' still finds Rain Cloud Hat", () => {
  const names = searchCatalogTypeahead("raincloud rat", { limit: 6 }).map((item) => item.NAME);
  assert.ok(names.includes("Rain Cloud Hat"), names.join(", "));
});

test("loose real-catalog name evidence becomes tentative instead of disappearing", () => {
  const decided = verifyVisionItemFromEvidence(slotEvidence({
    rawName: "uni horn",
    candidateNames: ["uni horn"],
    categoryHint: "PET", // intentionally wrong layout hint; this item is PETWEAR
    confidence: 0.72,
    itemConfidence: 0.72,
  }));
  assert.equal(decided.itemName, "Unicorn Horn");
  assert.equal(decided.recognitionStatus, "NEEDS_CONFIRMATION");
  assert.equal(decided.verified, false);
});

/* ------------------------------------------------------------------ *
 * F/G/H. corrections, intent preservation and calculation gating
 * ------------------------------------------------------------------ */

function visionItem(overrides: Partial<VisionTradeItemLike> & Pick<VisionTradeItemLike, "side" | "slot">): VisionTradeItemLike {
  return {
    rawName: "",
    variant: "NORMAL",
    potion: "NONE",
    quantity: 1,
    confidence: 0.4,
    itemConfidence: 0.4,
    variantConfidence: 0.98,
    sideConfidence: 0.99,
    category: "PET",
    databaseConfidence: 0,
    verified: false,
    alternatives: [],
    ...overrides,
  } as VisionTradeItemLike;
}

function confirmed(name: string, side: "YOU" | "THEM", slot: number): VisionTradeItemLike {
  const item = getItem(name);
  assert.ok(item, `Missing test item ${name}`);
  return visionItem({
    side,
    slot,
    rawName: name,
    itemId: item.ID,
    itemName: item.NAME,
    category: String(item.CATEGORY),
    confidence: 0.97,
    itemConfidence: 0.97,
    databaseConfidence: 1,
    verified: true,
  });
}

function sessionWithOneUnknownSlot(): NichTradeSession {
  const session = createTradeSessionFromVision({
    layoutConfidence: 0.97,
    recognitionVersion: "test-v34",
    valueSystem: "GCASH",
    items: [
      confirmed("Frost Dragon", "YOU", 1),
      visionItem({
        side: "THEM",
        slot: 1,
        rawName: "dark dragon-like pet",
        recognitionStatus: "UNKNOWN",
        alternatives: ["Shadow Dragon", "Bat Dragon"],
      }),
    ],
  });
  assert.ok(session);
  return session;
}

test("an unresolved slot blocks the W/F/L calculation", () => {
  const session = sessionWithOneUnknownSlot();
  assert.equal(session.unresolvedSlots.length, 1);
  assert.equal(formatTradeSessionForCalculation(session), null);
});

test("a corrected slot is what downstream value/WFL actually uses", () => {
  const session = sessionWithOneUnknownSlot();
  const response = routeNichMessage({
    gameId: "adopt-me",
    message: "their slot 1 is Shadow Dragon",
    context: {
      recentPets: [],
      turnCount: 1,
      lastValueSource: session.valueSystem,
      activeTrade: session,
    },
  });
  const after = response.context?.activeTrade;
  assert.ok(after);
  assert.equal(findTradeSlot(after, "them-1")?.canonicalName, "Shadow Dragon");
  assert.equal(after.unresolvedSlots.length, 0);

  const calculation = formatTradeSessionForCalculation(after);
  assert.ok(calculation);
  assert.match(calculation, /Shadow Dragon/);
  assert.doesNotMatch(calculation, /dark dragon-like pet/);
});

test("a correction propagates to a visually identical unresolved slot as a candidate", () => {
  const session = createTradeSessionFromVision({
    layoutConfidence: 0.97,
    recognitionVersion: "test-v34",
    items: [
      confirmed("Frost Dragon", "YOU", 1),
      visionItem({ side: "THEM", slot: 1, rawName: "dark dragon-like pet", alternatives: ["Shadow Dragon"] }),
      visionItem({ side: "THEM", slot: 2, rawName: "dark dragon-like pet", alternatives: [] }),
    ],
  });
  assert.ok(session);
  const response = routeNichMessage({
    gameId: "adopt-me",
    message: "their slot 1 is Shadow Dragon",
    context: { recentPets: [], turnCount: 1, lastValueSource: session.valueSystem, activeTrade: session },
  });
  const after = response.context?.activeTrade;
  assert.ok(after);
  const sibling = findTradeSlot(after, "them-2");
  assert.ok(sibling);
  assert.ok(
    sibling.alternatives.some((candidate) => candidate.itemName === "Shadow Dragon"),
    "the duplicate-looking slot should gain the corrected pet as a candidate",
  );
  // It is a candidate, not an automatic answer.
  assert.notEqual(sibling.status, "CONFIRMED");
});

test("choosing 'How much are these?' keeps a VALUE intent through correction", () => {
  const intent = inferScreenshotIntent("How much are these?");
  assert.equal(intent, "VALUES");
  const rerun = screenshotRouteMessage(intent, "How much are these?", ["Frost Dragon", "Shadow Dragon"]);
  assert.match(rerun, /how much/i);
  assert.match(rerun, /Frost Dragon/);
  assert.doesNotMatch(rerun, /w\/?f\/?l/i);
});

test("choosing W/F/L keeps a trade intent and never becomes a value question", () => {
  const intent = inferScreenshotIntent("W/F/L this trade");
  assert.equal(intent, "WFL");
  assert.equal(screenshotRouteMessage(intent, "W/F/L this trade", ["Frost Dragon"]), "W/F/L this trade");
});

test("an uploaded screenshot is not assumed to be a W/F/L question", () => {
  assert.equal(inferScreenshotIntent("What pets are these?"), "IDENTIFY");
  assert.equal(inferScreenshotIntent("What is the demand for these?"), "DEMAND");
  assert.equal(inferScreenshotIntent("hey nich"), "GENERAL");
});

/* ------------------------------------------------------------------ *
 * Slot-crop geometry
 * ------------------------------------------------------------------ */

test("slot boxes are padded so the badge corner survives the crop", () => {
  const padded = padSlotBox({ x: 0.4, y: 0.4, width: 0.1, height: 0.1 }, 0.2);
  assert.ok(padded.x < 0.4);
  assert.ok(padded.y < 0.4);
  assert.ok(padded.width > 0.1);
  assert.ok(padded.height > 0.1);
});

test("slot box padding stays inside the image", () => {
  const padded = padSlotBox({ x: 0, y: 0.95, width: 0.08, height: 0.05 }, 0.5);
  assert.ok(padded.x >= 0);
  assert.ok(padded.y >= 0);
  assert.ok(padded.x + padded.width <= 1.0001);
  assert.ok(padded.y + padded.height <= 1.0001);
});

test("the crop sheet enlarges every slot well beyond its screenshot size", () => {
  const slots = Array.from({ length: 6 }, (_, index) => ({
    side: (index < 3 ? "YOU" : "THEM") as "YOU" | "THEM",
    slot: (index % 3) + 1,
    box: { x: 0.1 + (index % 3) * 0.1, y: 0.2, width: 0.06, height: 0.06 },
  }));
  const plan = planSlotSheet(slots);
  assert.ok(plan);
  assert.equal(plan.tiles.length, 6);
  // A 0.06-wide slot in a 1600px screenshot is ~96px; every tile is far larger.
  assert.ok(plan.tileSize >= 200);
  assert.deepEqual(plan.tiles.map((tile) => tile.tile), ["Y1", "Y2", "Y3", "T1", "T2", "T3"]);
  // Tiles must not overlap.
  for (let i = 1; i < plan.tiles.length; i += 1) {
    const previous = plan.tiles[i - 1];
    const current = plan.tiles[i];
    const disjoint = current.destX >= previous.destX + previous.destWidth
      || current.destY >= previous.destY + previous.destHeight;
    assert.ok(disjoint, `tiles ${previous.tile} and ${current.tile} overlap`);
  }
});

test("the slot manifest survives the header round trip", () => {
  const slots = [
    { side: "YOU" as const, slot: 1, box: { x: 0.1, y: 0.2, width: 0.08, height: 0.08 }, variantHint: "NEON", potionHint: "FR" },
    { side: "THEM" as const, slot: 2, box: { x: 0.7, y: 0.2, width: 0.08, height: 0.08 } },
  ];
  const plan = planSlotSheet(slots);
  assert.ok(plan);
  const manifest = buildSlotManifest(plan, slots, { imageType: "TRADE", layoutConfidence: 0.93 });
  const decoded = decodeSlotManifest(encodeSlotManifest(manifest));
  assert.ok(decoded);
  assert.equal(decoded.imageType, "TRADE");
  assert.equal(decoded.layoutConfidence, 0.93);
  assert.deepEqual(decoded.tiles.map((tile) => tile.tile), ["Y1", "T2"]);
  assert.equal(decoded.tiles[0].side, "YOU");
  assert.equal(decoded.tiles[1].side, "THEM");
  assert.equal(decoded.tiles[0].variantHint, "NEON");
});

test("a malformed manifest header is rejected instead of trusted", () => {
  assert.equal(decodeSlotManifest(null), null);
  assert.equal(decodeSlotManifest("not-base64!!"), null);
  assert.equal(decodeSlotManifest(encodeSlotManifest({ imageType: "TRADE", layoutConfidence: 1, tiles: [] })), null);
});

test("tile labels round-trip through the side/slot encoding", () => {
  assert.equal(slotTileLabel("YOU", 3), "Y3");
  assert.equal(slotTileLabel("THEM", 1), "T1");
});

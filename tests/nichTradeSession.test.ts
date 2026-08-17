import test from "node:test";
import assert from "node:assert/strict";

import routeNichMessage from "../src/components/nich/assistant/brain/router";
import { resolveNichItem } from "../src/lib/nich/itemResolver";
import {
  createTradeSessionFromVision,
  findTradeSlot,
  getTradeSlots,
  refreshTradeSession,
  type NichTradeSession,
  type VisionTradeItemLike,
} from "../src/lib/nich/tradeSession";
import { getItem } from "../src/lib/search";

function confirmedItem(
  name: string,
  side: "YOU" | "THEM",
  slot: number,
  potion: VisionTradeItemLike["potion"] = "NONE",
  variant: VisionTradeItemLike["variant"] = "NORMAL",
): VisionTradeItemLike {
  const item = getItem(name);
  assert.ok(item, `Missing test item ${name}`);
  return {
    rawName: name,
    side,
    slot,
    variant,
    potion,
    quantity: 1,
    confidence: 0.98,
    itemConfidence: 0.98,
    variantConfidence: 0.98,
    sideConfidence: 0.99,
    itemId: item.ID,
    itemName: item.NAME,
    category: String(item.CATEGORY),
    databaseConfidence: 1,
    verified: true,
    alternatives: [],
  };
}

function buildRegressionSession(): NichTradeSession {
  const tuxedo = getItem("Tuxedo Cat");
  assert.ok(tuxedo);
  const session = createTradeSessionFromVision({
    valueSystem: "ELVE",
    layoutConfidence: 0.99,
    recognitionVersion: "test-regression-v1",
    items: [
      confirmedItem("Frost Dragon", "YOU", 1, "FR"),
      confirmedItem("Chocolate Chip Bat Dragon", "THEM", 1, "FR"),
      confirmedItem("Monkey King", "THEM", 2, "FR"),
      confirmedItem("Dalmatian", "THEM", 3, "FR"),
      confirmedItem("Peppermint Penguin", "THEM", 5, "R"),
      confirmedItem("Puffin", "THEM", 6, "NONE"),
      {
        rawName: "Cobra",
        side: "THEM",
        slot: 7,
        variant: "NORMAL",
        potion: "R",
        quantity: 1,
        confidence: 0.45,
        itemConfidence: 0.45,
        variantConfidence: 0.96,
        sideConfidence: 0.99,
        category: "PET",
        databaseConfidence: 0,
        verified: false,
        alternatives: ["Cabbit", "Sandfish"],
        candidateScores: [
          { itemName: "Cabbit", score: 0.46 },
          { itemName: "Sandfish", score: 0.39 },
        ],
      },
      {
        rawName: "Tuxedo Cat",
        side: "THEM",
        slot: 8,
        variant: "NORMAL",
        potion: "NONE",
        quantity: 1,
        confidence: 0.6,
        itemConfidence: 0.6,
        variantConfidence: 0.96,
        sideConfidence: 0.99,
        itemId: tuxedo.ID,
        itemName: tuxedo.NAME,
        category: "PET",
        databaseConfidence: 1,
        verified: true,
        alternatives: ["Tuxedo Cat", "Border Collie"],
        candidateScores: [
          { itemName: "Tuxedo Cat", score: 0.6 },
          { itemName: "Border Collie", score: 0.31 },
        ],
      },
    ],
  });
  assert.ok(session);
  assert.deepEqual(session.unresolvedSlots, ["them-7", "them-8"]);
  return session;
}

function run(message: string, activeTrade: NichTradeSession) {
  return routeNichMessage({
    message,
    context: {
      recentPets: [],
      turnCount: 1,
      lastValueSource: activeTrade.valueSystem,
      activeTrade,
    },
  });
}

test("real Cabbit/Tuxedo correction resolves both slots and immediately recalculates", () => {
  const before = buildRegressionSession();
  const preservedIds = before.confirmedSlots.slice();
  const response = run("that's a cabbit and yes a tuxedo cat", before);
  const after = response.context?.activeTrade;
  assert.ok(after);
  assert.equal(findTradeSlot(after, "them-7")?.canonicalName, "Cabbit");
  assert.equal(findTradeSlot(after, "them-8")?.canonicalName, "Tuxedo Cat");
  assert.equal(after.unresolvedSlots.length, 0);
  assert.ok(response.tradeComparison, "correction should continue to deterministic W/F/L");
  for (const slotId of preservedIds) {
    assert.ok(after.confirmedSlots.includes(slotId), `lost already-confirmed slot ${slotId}`);
  }
  assert.match(response.text, /Cabbit.*first one.*Tuxedo Cat.*second/i);
});

test("ordinal correction resolves first and second unresolved slots", () => {
  const response = run("first is cabbit second is tux", buildRegressionSession());
  assert.equal(response.context?.activeTrade?.unresolvedSlots.length, 0);
  assert.equal(findTradeSlot(response.context!.activeTrade!, "them-7")?.canonicalName, "Cabbit");
  assert.equal(findTradeSlot(response.context!.activeTrade!, "them-8")?.canonicalName, "Tuxedo Cat");
});

test("conversational ordering resolves 'cabbit and yes tuxedo'", () => {
  const response = run("cabbit and yes tuxedo", buildRegressionSession());
  assert.equal(response.context?.activeTrade?.unresolvedSlots.length, 0);
});

test("single ordinal correction updates only the referenced unresolved slot", () => {
  const response = run("first one is wrong, it's cabbit", buildRegressionSession());
  const session = response.context?.activeTrade;
  assert.ok(session);
  assert.equal(findTradeSlot(session, "them-7")?.canonicalName, "Cabbit");
  assert.ok(session.unresolvedSlots.includes("them-8"));
  assert.equal(session.unresolvedSlots.length, 1);
  assert.equal(response.tradeComparison, undefined);
});

test("variant correction preserves trade and recalculates", () => {
  const first = run("that's a cabbit and yes a tuxedo cat", buildRegressionSession()).context?.activeTrade;
  assert.ok(first);
  const response = run("everything is correct except frost is NFR", first);
  const frost = response.context?.activeTrade?.userSide.find((slot) => slot.canonicalName === "Frost Dragon");
  assert.ok(frost);
  assert.equal(frost.neon, true);
  assert.equal(frost.mega, false);
  assert.equal(frost.fly, true);
  assert.equal(frost.ride, true);
  assert.ok(response.tradeComparison);
});

test("move command changes side without duplicating the item", () => {
  const ready = run("that's a cabbit and yes a tuxedo cat", buildRegressionSession()).context?.activeTrade;
  assert.ok(ready);
  const response = run("move cabbit to my side", ready);
  const session = response.context?.activeTrade;
  assert.ok(session);
  const cabbits = getTradeSlots(session).filter((slot) => slot.canonicalName === "Cabbit");
  assert.equal(cabbits.length, 1);
  assert.equal(cabbits[0].side, "YOU");
});

test("undo restores the previous trade mutation", () => {
  const ready = run("that's a cabbit and yes a tuxedo cat", buildRegressionSession()).context?.activeTrade;
  assert.ok(ready);
  const moved = run("move cabbit to my side", ready).context?.activeTrade;
  assert.ok(moved);
  const undone = run("undo", moved).context?.activeTrade;
  assert.ok(undone);
  const cabbit = getTradeSlots(undone).find((slot) => slot.canonicalName === "Cabbit");
  assert.equal(cabbit?.side, "THEM");
});

test("what-if branch calculates without mutating the active trade", () => {
  const ready = run("that's a cabbit and yes a tuxedo cat", buildRegressionSession()).context?.activeTrade;
  assert.ok(ready);
  const beforeCount = ready.theirSide.length;
  const response = run("what if they add turtle", ready);
  assert.ok(response.tradeComparison);
  assert.equal(response.context?.activeTrade?.theirSide.length, beforeCount);
  assert.ok(response.tradeComparison.requestedItems.some((item) => item.petName === "Turtle"));
});

test("exact canonical correction overrides an uncertain vision prediction", () => {
  const response = run("their slot 7 is Cabbit", buildRegressionSession());
  const corrected = findTradeSlot(response.context!.activeTrade!, "them-7");
  assert.equal(corrected?.canonicalName, "Cabbit");
  assert.equal(corrected?.source, "CONFIRMED_BY_USER");
  assert.equal(corrected?.confidence.item, 1);
});

test("item resolver prefers canonical/alias matches and tolerates realistic typo", () => {
  assert.equal(resolveNichItem("cabbit").item?.NAME, "Cabbit");
  assert.equal(resolveNichItem("tux").item?.NAME, "Tuxedo Cat");
  assert.equal(resolveNichItem("cabitt").item?.NAME, "Cabbit");
});


test("short variant reply resolves the only uncertain variant and recalculates", () => {
  const ready = run("that's a cabbit and yes a tuxedo cat", buildRegressionSession()).context?.activeTrade;
  assert.ok(ready);
  const tux = findTradeSlot(ready, "them-8");
  assert.ok(tux);
  const uncertain = refreshTradeSession({
    ...ready,
    theirSide: ready.theirSide.map((slot) => slot.slotId === tux.slotId
      ? {
          ...slot,
          fly: null,
          ride: null,
          status: "UNCERTAIN" as const,
          confidence: { ...slot.confidence, variant: 0.4, overall: 0.4, level: "LOW" as const },
        }
      : slot),
  });
  const response = run("np", uncertain);
  const updated = findTradeSlot(response.context!.activeTrade!, "them-8");
  assert.equal(updated?.fly, false);
  assert.equal(updated?.ride, false);
  assert.equal(updated?.status, "CONFIRMED");
  assert.ok(response.tradeComparison);
});

test("latest explicit contradiction replaces the latest correction", () => {
  const first = run("their slot 7 is Cabbit", buildRegressionSession()).context?.activeTrade;
  assert.ok(first);
  const response = run("wait no it's Siamese Cat", first);
  assert.equal(findTradeSlot(response.context!.activeTrade!, "them-7")?.canonicalName, "Siamese Cat");
});

test("natural quantity command updates the existing slot instead of duplicating it", () => {
  const ready = run("that's a cabbit and yes a tuxedo cat", buildRegressionSession()).context?.activeTrade;
  assert.ok(ready);
  const response = run("I have two frosts", ready);
  const frosts = getTradeSlots(response.context!.activeTrade!).filter((slot) => slot.canonicalName === "Frost Dragon");
  assert.equal(frosts.length, 1);
  assert.equal(frosts[0].quantity, 2);
  assert.ok(response.tradeComparison);
});

test("explicit shorthand memory remains separate from trade correction state", () => {
  const response = run("whenever I say cb I mean Cabbit", buildRegressionSession());
  assert.equal(response.context?.userMemory?.aliases?.cb, "Cabbit");
  assert.equal(response.context?.activeTrade?.unresolvedSlots.length, 2);
});


function knownIdentityUnknownVariant(name: string, side: "YOU" | "THEM", slot: number): VisionTradeItemLike {
  const item = getItem(name);
  assert.ok(item, `Missing test item ${name}`);
  return {
    rawName: name,
    side,
    slot,
    variant: "UNKNOWN",
    potion: "UNKNOWN",
    quantity: 1,
    confidence: 0.94,
    itemConfidence: 0.97,
    variantConfidence: 0.25,
    sideConfidence: 0.99,
    itemId: item.ID,
    itemName: item.NAME,
    category: String(item.CATEGORY),
    databaseConfidence: 1,
    verified: true,
    alternatives: [],
  };
}

function buildScreenshotVariantRegressionSession(): NichTradeSession {
  const session = createTradeSessionFromVision({
    valueSystem: "GCASH",
    layoutConfidence: 0.96,
    recognitionVersion: "screenshot-variant-regression",
    items: [
      knownIdentityUnknownVariant("Balloon Unicorn", "YOU", 1),
      knownIdentityUnknownVariant("Frostbite Bear", "YOU", 2),
      knownIdentityUnknownVariant("Fairy Bat Dragon", "YOU", 3),
      knownIdentityUnknownVariant("Cupid Dragon", "YOU", 4),
      knownIdentityUnknownVariant("Cabbit", "THEM", 1),
    ],
  });
  assert.ok(session);
  assert.equal(session.unresolvedSlots.length, 5);
  return session;
}

test("screenshot shorthand applies FR/R/FR/FR to left slots and MFR to the right without renaming pets", () => {
  const before = buildScreenshotVariantRegressionSession();
  const response = run("fr, r, fr, fr then on the other side it's mfr", before);
  const after = response.context?.activeTrade;
  assert.ok(after);
  assert.equal(after.unresolvedSlots.length, 0);

  const expected = [
    ["Balloon Unicorn", false, false, true, true],
    ["Frostbite Bear", false, false, false, true],
    ["Fairy Bat Dragon", false, false, true, true],
    ["Cupid Dragon", false, false, true, true],
  ] as const;

  for (let index = 0; index < expected.length; index += 1) {
    const slot = after.userSide[index];
    const [name, neon, mega, fly, ride] = expected[index];
    assert.equal(slot.canonicalName, name);
    assert.equal(slot.neon, neon);
    assert.equal(slot.mega, mega);
    assert.equal(slot.fly, fly);
    assert.equal(slot.ride, ride);
  }

  const cabbit = after.theirSide[0];
  assert.equal(cabbit.canonicalName, "Cabbit");
  assert.equal(cabbit.mega, true);
  assert.equal(cabbit.neon, false);
  assert.equal(cabbit.fly, true);
  assert.equal(cabbit.ride, true);
  assert.ok(response.tradeComparison, "fully corrected screenshot trade should immediately calculate");
  assert.doesNotMatch(response.text, /4x Frost|Red Dragon/i);
});

test("single-letter screenshot potion replies are metadata and never item identities", () => {
  assert.equal(resolveNichItem("r", { category: "PET" }).status, "notFound");
  assert.equal(resolveNichItem("fr", { category: "PET" }).status, "notFound");
  assert.equal(resolveNichItem("mfr", { category: "PET" }).status, "notFound");
});

test("short visual names resolve to the intended current CSBT pets", () => {
  assert.equal(resolveNichItem("frostbite", { category: "PET" }).item?.NAME, "Frostbite Bear");
  assert.equal(resolveNichItem("cupid", { category: "PET" }).item?.NAME, "Cupid Dragon");
  assert.equal(resolveNichItem("fairy bat", { category: "PET" }).item?.NAME, "Fairy Bat Dragon");
});

test("what do you mean keeps the active screenshot state and explains what was detected", () => {
  const session = buildScreenshotVariantRegressionSession();
  const response = run("what do you mean", session);
  assert.equal(response.context?.activeTrade?.id, session.id);
  assert.match(response.text, /Balloon Unicorn/);
  assert.match(response.text, /Frostbite Bear/);
  assert.match(response.text, /Fairy Bat Dragon/);
  assert.match(response.text, /Cupid Dragon/);
  assert.match(response.text, /Cabbit/);
  assert.doesNotMatch(response.text, /can't see which pets/i);
});

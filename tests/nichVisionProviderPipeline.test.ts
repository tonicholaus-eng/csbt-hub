import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import routeNichMessage from "../src/components/nich/assistant/brain/router";
import {
  normalizeProviderSlotEvidence,
  toConfidence,
  toStringList,
  toTriState,
  type VisionSlotEvidence,
} from "../src/lib/nich/visionProviderSchema";
import { runSlotRecognitionPipeline } from "../src/lib/nich/visionSlotPipeline";
import {
  createTradeSessionFromVision,
  describeRecognitionCounts,
  findTradeSlot,
  type NichTradeSession,
} from "../src/lib/nich/tradeSession";
import type { VisionSlotManifestEntry } from "../src/lib/nich/visionSlots";
import { getItem } from "../src/lib/search";

const TILES: VisionSlotManifestEntry[] = [
  { tile: "Y1", side: "YOU", slot: 1, categoryHint: "PET" },
  { tile: "Y2", side: "YOU", slot: 2, categoryHint: "PET" },
  { tile: "T1", side: "THEM", slot: 1, categoryHint: "PET" },
  { tile: "T2", side: "THEM", slot: 2, categoryHint: "PET" },
];
const ALLOWED = new Set(TILES.map((tile) => tile.tile));

function fixture(name: string) {
  return JSON.parse(
    readFileSync(path.join(process.cwd(), "tests", "vision", "fixtures", "providers", name), "utf8"),
  ) as unknown;
}

async function runProvider(name: string, provider: "gemini" | "cloudflare") {
  const evidence = normalizeProviderSlotEvidence(fixture(name), ALLOWED, provider);
  const result = await runSlotRecognitionPipeline({ evidence, tiles: TILES, layoutConfidence: 0.95 });
  return { evidence, ...result };
}

/* ================================================================== *
 * CASE D — provider schema normalization
 * ================================================================== */

test("CASE D: both providers normalize into the same canonical evidence", async () => {
  const gemini = normalizeProviderSlotEvidence(fixture("gemini-slot-evidence.json"), ALLOWED, "gemini");
  const cloudflare = normalizeProviderSlotEvidence(fixture("cloudflare-slot-evidence.json"), ALLOWED, "cloudflare");

  assert.equal(gemini.length, 4);
  assert.equal(cloudflare.length, 4, "Workers AI field names must not produce an empty slot list");

  const byTile = (list: VisionSlotEvidence[]) => new Map(list.map((entry) => [entry.tile, entry]));
  const g = byTile(gemini);
  const c = byTile(cloudflare);

  for (const tile of ["Y1", "Y2", "T1"]) {
    assert.equal(c.get(tile)!.animalType, g.get(tile)!.animalType, `${tile} animalType`);
    assert.deepEqual(c.get(tile)!.bodyColors, g.get(tile)!.bodyColors, `${tile} bodyColors`);
    // Confidence arrives as 0.72 / 72 / "0.61" / "64%" and must land on 0..1.
    assert.ok(Math.abs(c.get(tile)!.visualConfidence - g.get(tile)!.visualConfidence) < 0.02, `${tile} confidence`);
    assert.deepEqual(c.get(tile)!.modifiers, g.get(tile)!.modifiers, `${tile} modifiers`);
  }

  // The candidate list is the field that used to silently come back empty.
  assert.ok(c.get("Y1")!.candidateNames.includes("Frost Dragon"));
  assert.ok(c.get("Y2")!.candidateNames.includes("Hydra"), "a lone `name` field must still become candidate evidence");
});

test("CASE D: confidence scales are normalized, not clamped", () => {
  assert.equal(toConfidence(0.76), 0.76);
  assert.equal(toConfidence(76), 0.76);
  assert.equal(toConfidence("76"), 0.76);
  assert.equal(toConfidence("76%"), 0.76);
  assert.equal(toConfidence("0.76"), 0.76);
  assert.equal(toConfidence("nonsense"), 0);
  assert.equal(toConfidence(undefined), 0);
});

test("CASE D: tri-state badges accept string booleans and keep 'unknown' as null", () => {
  assert.equal(toTriState(true), true);
  assert.equal(toTriState("yes"), true);
  assert.equal(toTriState("false"), false);
  assert.equal(toTriState("unknown"), null);
  assert.equal(toTriState(undefined), null);
});

test("CASE D: candidate lists accept arrays, objects and delimited strings", () => {
  assert.deepEqual(toStringList(["Frost Dragon", "Frost Fury"], 5, 60), ["Frost Dragon", "Frost Fury"]);
  assert.deepEqual(toStringList([{ name: "Frost Dragon" }, { itemName: "Hydra" }], 5, 60), ["Frost Dragon", "Hydra"]);
  assert.deepEqual(toStringList("Frost Dragon, Hydra", 5, 60), ["Frost Dragon", "Hydra"]);
  assert.deepEqual(toStringList(undefined, 5, 60), []);
});

/* ================================================================== *
 * CASE A — a real catalog name at medium confidence is TENTATIVE
 * ================================================================== */

for (const [label, file, provider] of [
  ["gemini", "gemini-slot-evidence.json", "gemini"],
  ["cloudflare", "cloudflare-slot-evidence.json", "cloudflare"],
] as const) {
  test(`CASE A (${label}): a real catalog name at medium confidence becomes tentative, not Unknown`, async () => {
    const { items } = await runProvider(file, provider);
    const named = items.filter((item) => item.itemName);
    assert.ok(named.length >= 3, `expected tentative identities, got ${JSON.stringify(items.map((i) => i.itemName))}`);

    const frost = items.find((item) => item.side === "YOU" && item.slot === 1);
    assert.equal(frost?.itemName, "Frost Dragon");
    assert.equal(frost?.recognitionStatus, "NEEDS_CONFIRMATION");
    assert.equal(frost?.verified, false, "tentative must not auto-confirm");

    // Pets whose names carry no colour or feature word must not be penalised.
    assert.equal(items.find((item) => item.side === "YOU" && item.slot === 2)?.itemName, "Hydra");
    assert.equal(items.find((item) => item.side === "THEM" && item.slot === 1)?.itemName, "Pomeranian");
  });

  test(`CASE C (${label}): uncertain slots still carry ranked real catalog candidates`, async () => {
    const { items } = await runProvider(file, provider);
    for (const item of items) {
      if (item.recognitionStatus === "ACCEPTED") continue;
      for (const candidate of item.topCandidates ?? []) {
        assert.ok(getItem(candidate.itemName), `${candidate.itemName} is not a catalog entry`);
      }
    }
    const frost = items.find((item) => item.side === "YOU" && item.slot === 1);
    assert.ok((frost?.topCandidates?.length ?? 0) >= 2, "a tentative slot should offer alternatives");
  });
}

test("CASE B: a provider hallucination is never surfaced as an identity", async () => {
  const evidence = normalizeProviderSlotEvidence(
    {
      slots: [{
        tile: "Y1",
        animalType: "dragon",
        bodyColors: ["black"],
        features: ["skeletal", "wings"],
        name: "Glacial Jousting Wyrm",
        visualConfidence: 0.95,
        neon: false, mega: false, fly: true, ride: true,
      }],
    },
    ALLOWED,
    "gemini",
  );
  const { items } = await runSlotRecognitionPipeline({ evidence, tiles: TILES, layoutConfidence: 0.95 });
  const slot = items[0];
  assert.notEqual(slot.itemName, "Glacial Jousting Wyrm");
  assert.equal(slot.verified, false);
  for (const candidate of slot.topCandidates ?? []) {
    assert.ok(getItem(candidate.itemName), `${candidate.itemName} is not a catalog entry`);
  }
  // The invented string must not leak into the displayed alternatives either.
  assert.ok(!slot.alternatives.includes("Glacial Jousting Wyrm"));
});

/* ================================================================== *
 * CASE E / F — UI state and modifier preservation
 * ================================================================== */

async function sevenSlotSession(): Promise<NichTradeSession> {
  const tiles: VisionSlotManifestEntry[] = Array.from({ length: 7 }, (_, index) => ({
    tile: `T${index + 1}`,
    side: "THEM" as const,
    slot: index + 1,
    categoryHint: "PET",
  }));
  const evidence = normalizeProviderSlotEvidence(
    {
      slots: tiles.map((tile, index) => ({
        tile: tile.tile,
        animalType: "dragon",
        bodyColors: ["black"],
        features: ["wings"],
        name: index % 2 === 0 ? "Shadow Dragon" : "Bat Dragon",
        visualConfidence: 0.6,
        neon: false, mega: false, fly: true, ride: true,
      })),
    },
    new Set(tiles.map((tile) => tile.tile)),
    "gemini",
  );
  const { items } = await runSlotRecognitionPipeline({ evidence, tiles, layoutConfidence: 0.95 });
  const session = createTradeSessionFromVision({ items, layoutConfidence: 0.95, recognitionVersion: "test" });
  assert.ok(session);
  return session;
}

test("CASE E: a session with detected slots never reports 'No items detected'", async () => {
  const session = await sevenSlotSession();
  const counts = describeRecognitionCounts(session);
  assert.equal(counts.detected, 7);
  assert.ok(counts.hasDetections);
  assert.match(counts.headline, /7 items detected/);
  assert.doesNotMatch(counts.headline, /No items detected/);
  // The empty YOU column must not claim the whole screenshot was empty.
  assert.equal(session.userSide.length, 0);
  assert.equal(counts.emptySideLabel, "No items on this side.");
});

test("CASE E: a genuinely empty session still says 'No items detected'", () => {
  const empty = createTradeSessionFromVision({ items: [], layoutConfidence: 0.9, recognitionVersion: "test" });
  assert.equal(empty, undefined, "no sides means no session at all");
});

test("CASE F: a tentative species keeps its FR badges", async () => {
  const session = await sevenSlotSession();
  const slot = session.theirSide[0];
  assert.notEqual(slot.status, "CONFIRMED");
  assert.ok(slot.canonicalName, "identity should be tentative, not discarded");
  assert.equal(slot.fly, true);
  assert.equal(slot.ride, true);
  assert.equal(slot.neon, false);
  assert.equal(slot.mega, false);
});

test("CASE F: an unreadable badge stays null rather than being guessed", async () => {
  const { items } = await runProvider("cloudflare-slot-evidence.json", "cloudflare");
  const unreadable = items.find((item) => item.side === "THEM" && item.slot === 2);
  assert.equal(unreadable?.variant, "UNKNOWN");
  assert.equal(unreadable?.potion, "UNKNOWN");
});

/* ================================================================== *
 * CASE G — correction preserves modifiers
 * ================================================================== */

test("CASE G: correcting a slot keeps its detected modifiers", async () => {
  const session = await sevenSlotSession();
  const before = session.theirSide[0];
  assert.equal(before.fly, true);
  assert.equal(before.ride, true);

  const response = routeNichMessage({
    gameId: "adopt-me",
    message: "their slot 1 is Frost Dragon",
    context: { recentPets: [], turnCount: 1, lastValueSource: session.valueSystem, activeTrade: session },
  });
  const after = response.context?.activeTrade;
  assert.ok(after);
  const corrected = findTradeSlot(after, "them-1");
  assert.ok(corrected);
  assert.equal(corrected.canonicalName, "Frost Dragon");
  assert.equal(corrected.correctedByUser, true);
  // The badge read survives an identity correction.
  assert.equal(corrected.fly, true);
  assert.equal(corrected.ride, true);
  assert.equal(corrected.neon, false);
  assert.equal(corrected.mega, false);
});

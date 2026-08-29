/**
 * The slot-recognition pipeline, isolated from HTTP so tests can run the exact
 * production path from a raw provider payload.
 *
 * normalized provider evidence -> raw slot items -> catalog candidates
 * -> (optional) catalog-image verification -> decision -> verified items
 *
 * The route owns transport and the model calls; everything else lives here.
 */

import {
  verifyVisionItemFromEvidence,
  buildVisualEvidence,
  type NichVisionCategory,
  type NichVisionPotion,
  type NichVisionRawItem,
  type NichVisionVariant,
  type NichVisionVerifiedItem,
} from "./vision";
import type { VisionSlotEvidence, VisionSlotModifiers } from "./visionProviderSchema";
import {
  evidenceLooksIdentical,
  VISION_SUGGEST_THRESHOLD,
  type NichCatalogMatchVote,
  type NichVisualEvidence,
} from "./visionRecognition";
import type { VisionSlotManifestEntry } from "./visionSlots";

const VALID_CATEGORIES = new Set<NichVisionCategory>([
  "PET", "PETWEAR", "EGG", "VEHICLE", "FOOD", "GIFT", "STROLLER", "TOY", "STICKER", "OTHER", "UNKNOWN",
]);

/**
 * Badge booleans -> the variant/potion vocabulary the trade session uses.
 * Identity and modifiers stay strictly separate: an unreadable badge becomes
 * UNKNOWN and never influences the species read.
 */
export function variantFromModifiers(modifiers: VisionSlotModifiers) {
  const variant: NichVisionVariant = modifiers.mega === true
    ? "MEGA"
    : modifiers.neon === true
      ? "NEON"
      : modifiers.mega === false && modifiers.neon === false
        ? "NORMAL"
        : "UNKNOWN";
  const potion: NichVisionPotion = modifiers.fly === null || modifiers.ride === null
    ? "UNKNOWN"
    : modifiers.fly && modifiers.ride
      ? "FR"
      : modifiers.fly
        ? "F"
        : modifiers.ride
          ? "R"
          : "NONE";
  return { variant, potion };
}

/** Canonical evidence + manifest geometry -> the raw item the resolver consumes. */
export function toRawSlotItem(
  evidence: VisionSlotEvidence,
  tile: VisionSlotManifestEntry,
  layoutConfidence: number,
): NichVisionRawItem {
  const badges = variantFromModifiers(evidence.modifiers);
  const categoryHint = VALID_CATEGORIES.has(tile.categoryHint as NichVisionCategory)
    ? (tile.categoryHint as NichVisionCategory)
    : "PET";

  return {
    // rawName carries the provider's own best guess when it has one. It is
    // candidate EVIDENCE for catalog resolution, never a displayed identity —
    // dropping it entirely was what left correctly-named pets with no
    // candidates at all.
    rawName: evidence.rawSuggestedName
      || evidence.description
      || [evidence.bodyColors.join(" "), evidence.animalType].filter(Boolean).join(" ").trim()
      || "unidentified item",
    side: tile.side,
    slot: tile.slot,
    variant: badges.variant,
    potion: badges.potion,
    quantity: 1,
    confidence: evidence.visualConfidence,
    itemConfidence: evidence.visualConfidence,
    variantConfidence: evidence.badgeConfidence,
    sideConfidence: layoutConfidence,
    categoryHint,
    ...(evidence.animalType ? { animalType: evidence.animalType } : {}),
    bodyColors: evidence.bodyColors,
    features: evidence.features,
    ...(evidence.orientation ? { orientation: evidence.orientation } : {}),
    ...(evidence.visibleText ? { visibleText: evidence.visibleText } : {}),
    candidateNames: evidence.candidateNames,
    visualEvidence: evidence.description.slice(0, 300),
  };
}

export type SlotDiagnostic = {
  slot: string;
  provider: string;
  rawSuggestedName: string | null;
  description: string;
  providerCandidates: string[];
  resolvedCatalogCandidates: Array<{ name: string; id: string; score: number }>;
  top1: string | null;
  top2: string | null;
  margin: number;
  visualConfidence: number;
  finalState: string;
  reason: string;
  modifiers: { variant: string; potion: string };
};

export type SlotPipelineResult = {
  items: NichVisionVerifiedItem[];
  diagnostics: SlotDiagnostic[];
  catalogImageMatchUsed: boolean;
};

/**
 * Decide every slot.
 *
 * `verifySlot` performs the catalog-image comparison for an ambiguous slot. It
 * is injected so the pipeline is testable without network access; returning
 * null simply means "no verification available", which downgrades to a
 * confirmation prompt rather than to a guess.
 */
export async function runSlotRecognitionPipeline(args: {
  evidence: VisionSlotEvidence[];
  tiles: VisionSlotManifestEntry[];
  layoutConfidence: number;
  maxVerifiedSlots?: number;
  verifySlot?: (item: NichVisionVerifiedItem) => Promise<NichCatalogMatchVote | null>;
}): Promise<SlotPipelineResult> {
  const tileByLabel = new Map(args.tiles.map((tile) => [tile.tile, tile]));
  const rawItems: NichVisionRawItem[] = args.evidence.flatMap((entry) => {
    const tile = tileByLabel.get(entry.tile);
    return tile ? [toRawSlotItem(entry, tile, args.layoutConfidence)] : [];
  });

  const evidenceByKey = new Map<string, NichVisualEvidence>(
    rawItems.map((item) => [`${item.side}:${item.slot}`, buildVisualEvidence(item)]),
  );

  let decided = rawItems.map((item) => verifyVisionItemFromEvidence(item));
  let catalogImageMatchUsed = false;

  // Verify only the genuinely ambiguous slots that have something to compare.
  if (args.verifySlot) {
    const ambiguous = decided
      .map((item, index) => ({ item, index }))
      .filter(({ item }) =>
        item.recognitionStatus !== "ACCEPTED"
        && (item.topCandidates?.length ?? 0) >= 2
        && (item.topCandidates?.[0]?.score ?? 0) >= VISION_SUGGEST_THRESHOLD)
      .slice(0, args.maxVerifiedSlots ?? 3);

    for (const { item, index } of ambiguous) {
      const vote = await args.verifySlot(item);
      if (!vote) continue;
      catalogImageMatchUsed = true;
      decided[index] = verifyVisionItemFromEvidence(rawItems[index], { verification: vote });
    }
  }

  // Duplicate handling: a confidently identified slot lends its identity as a
  // STRONGER CANDIDATE to visually identical slots in the same screenshot. It
  // never forces neighbouring slots to be different pets.
  const accepted = decided
    .filter((item) => item.recognitionStatus === "ACCEPTED" && item.itemId)
    .map((item) => ({ itemId: item.itemId!, key: `${item.side}:${item.slot}` }));
  if (accepted.length) {
    decided = decided.map((item, index) => {
      if (item.recognitionStatus === "ACCEPTED") return item;
      const own = evidenceByKey.get(`${item.side}:${item.slot}`);
      if (!own) return item;
      const siblings = accepted
        .filter((entry) => {
          const other = evidenceByKey.get(entry.key);
          return other ? evidenceLooksIdentical(own, other) : false;
        })
        .map((entry) => entry.itemId);
      if (!siblings.length) return item;
      return verifyVisionItemFromEvidence(rawItems[index], { sessionCorrectedItemIds: siblings });
    });
  }

  const diagnostics: SlotDiagnostic[] = decided.map((item, index) => {
    const source = args.evidence[index];
    const candidates = item.topCandidates ?? [];
    return {
      slot: `${item.side}:${item.slot}`,
      provider: source?.provider ?? "unknown",
      rawSuggestedName: source?.rawSuggestedName ?? null,
      description: source?.description ?? "",
      providerCandidates: source?.candidateNames ?? [],
      resolvedCatalogCandidates: candidates.map((candidate) => ({
        name: candidate.itemName,
        id: candidate.itemId,
        score: Number(candidate.score.toFixed(3)),
      })),
      top1: candidates[0]?.itemName ?? null,
      top2: candidates[1]?.itemName ?? null,
      margin: Number(((candidates[0]?.score ?? 0) - (candidates[1]?.score ?? 0)).toFixed(3)),
      visualConfidence: Number((source?.visualConfidence ?? 0).toFixed(3)),
      finalState: item.recognitionStatus ?? "UNKNOWN",
      reason: item.verificationReason ?? "unknown",
      modifiers: { variant: item.variant, potion: item.potion },
    };
  });

  return { items: decided, diagnostics, catalogImageMatchUsed };
}

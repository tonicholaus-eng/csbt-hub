import { getItem, searchVisionItems } from "../search";
import type { NichTradeSession } from "./tradeSession";

export type NichVisionImageType =
  | "TRADE"
  | "INVENTORY"
  | "ITEM"
  | "OTHER";

export type NichVisionSide = "YOU" | "THEM" | "NONE";
export type NichVisionVariant = "NORMAL" | "NEON" | "MEGA" | "UNKNOWN";
export type NichVisionPotion = "NONE" | "F" | "R" | "FR" | "UNKNOWN";
export type NichVisionCategory =
  | "PET"
  | "PETWEAR"
  | "EGG"
  | "VEHICLE"
  | "FOOD"
  | "GIFT"
  | "STROLLER"
  | "TOY"
  | "STICKER"
  | "OTHER"
  | "UNKNOWN";

export type NichVisionRawItem = {
  rawName: string;
  side: NichVisionSide;
  variant: NichVisionVariant;
  potion: NichVisionPotion;
  quantity: number;
  /** Legacy overall visual identity confidence. */
  confidence: number;
  itemConfidence?: number;
  variantConfidence?: number;
  sideConfidence?: number;
  categoryHint?: NichVisionCategory;
  candidateNames?: string[];
  candidateScores?: Array<{ itemName: string; score: number }>;
  visualEvidence?: string;
  visibleText?: string;
  /** Normalized 0..1 bounding box when the model can localize the slot. */
  box?: { x: number; y: number; width: number; height: number };
  slot?: number;
};

export type NichVisionModelResult = {
  imageType: NichVisionImageType;
  layoutConfidence: number;
  items: NichVisionRawItem[];
  youOccupiedSlots?: number;
  themOccupiedSlots?: number;
  note?: string;
};

export type NichVisionVerifiedItem = NichVisionRawItem & {
  itemId?: string;
  itemName?: string;
  category?: string;
  databaseConfidence: number;
  verified: boolean;
  alternatives: string[];
  verificationReason?: string;
};

export type NichVisionApiResponse = {
  ok: boolean;
  model?: string;
  imageType?: NichVisionImageType;
  items?: NichVisionVerifiedItem[];
  localPrompt?: string;
  tradeSession?: NichTradeSession;
  message: string;
  runId?: string;
  recognitionVersion?: string;
  promptVersion?: string;
  catalogVersion?: string;
  cacheStatus?: "HIT" | "MISS" | "SESSION_HIT";
  image?: { width: number; height: number; bytes: number; mimeType: string; detailIncluded?: boolean; recoveryZoomsIncluded?: boolean };
  debug?: {
    model: string;
    layoutConfidence: number;
    uncertainSlots: string[];
    focusedRecheckUsed: boolean;
    fastRecoveryUsed?: boolean;
    emptyTradeRecoveryUsed?: boolean;
    identityAuditSucceeded?: boolean;
    multiViewUsed?: boolean;
  };
  usage?: {
    promptTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
};

function inferTradeSideSplit(items: NichVisionRawItem[]) {
  const centers = items
    .filter((item) => item.box)
    .map((item) => (item.box!.x + item.box!.width / 2))
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);

  if (centers.length < 2) return 0.5;

  let largestGap = 0;
  let split = 0.5;
  for (let index = 1; index < centers.length; index += 1) {
    const gap = centers[index] - centers[index - 1];
    const candidate = (centers[index] + centers[index - 1]) / 2;
    // The center separator in Adopt Me/value-calculator trades is normally the
    // largest horizontal gap. Ignore gaps too near the outside edges so sparse
    // rows do not accidentally become two "sides".
    if (gap > largestGap && gap >= 0.12 && candidate >= 0.34 && candidate <= 0.66) {
      largestGap = gap;
      split = candidate;
    }
  }
  return split;
}

export function repairTradeGeometry(items: NichVisionRawItem[], imageType: NichVisionImageType) {
  if (imageType !== "TRADE") return items;

  const split = inferTradeSideSplit(items);
  const deadZone = 0.035;
  const repaired = items.map((item) => {
    if (!item.box) return { ...item };
    const centerX = item.box.x + item.box.width / 2;
    const geometricSide: NichVisionSide = centerX <= split - deadZone
      ? "YOU"
      : centerX >= split + deadZone
        ? "THEM"
        : "NONE";
    if (geometricSide === "NONE") return { ...item };

    if (item.side === "NONE") {
      return { ...item, side: geometricSide, sideConfidence: Math.max(item.sideConfidence ?? 0, 0.9) };
    }

    if (item.side === geometricSide) {
      return { ...item, sideConfidence: Math.max(item.sideConfidence ?? 0, 0.92) };
    }

    const distanceFromSplit = Math.abs(centerX - split);
    if (distanceFromSplit >= 0.1) {
      // Bounding-box geometry is deterministic when the slot is clearly inside one
      // grid. Do not preserve a confidently hallucinated model side in that case.
      return { ...item, side: geometricSide, sideConfidence: 0.91 };
    }

    if ((item.sideConfidence ?? item.confidence) >= 0.85) {
      return { ...item, sideConfidence: Math.min(item.sideConfidence ?? item.confidence, 0.55) };
    }

    return { ...item, side: geometricSide, sideConfidence: 0.86 };
  });

  for (const side of ["YOU", "THEM"] as const) {
    const sideItems = repaired
      .filter((item) => item.side === side && !item.slot && item.box)
      .sort((a, b) => {
        const ay = (a.box?.y ?? 0) + (a.box?.height ?? 0) / 2;
        const by = (b.box?.y ?? 0) + (b.box?.height ?? 0) / 2;
        const averageHeight = ((a.box?.height ?? 0.1) + (b.box?.height ?? 0.1)) / 2;
        if (Math.abs(ay - by) > Math.max(0.045, averageHeight * 0.55)) return ay - by;
        const ax = (a.box?.x ?? 0) + (a.box?.width ?? 0) / 2;
        const bx = (b.box?.x ?? 0) + (b.box?.width ?? 0) / 2;
        return ax - bx;
      });
    sideItems.forEach((item, index) => { item.slot = index + 1; });
  }

  return repaired;
}

export function consolidateTradeSlotDetections(items: NichVisionRawItem[], imageType: NichVisionImageType) {
  if (imageType !== "TRADE") return items;

  const grouped = new Map<string, NichVisionRawItem[]>();
  const passthrough: NichVisionRawItem[] = [];
  for (const item of items) {
    if (item.side === "NONE" || !item.slot) {
      passthrough.push(item);
      continue;
    }
    const key = `${item.side}:${item.slot}`;
    const bucket = grouped.get(key) ?? [];
    bucket.push(item);
    grouped.set(key, bucket);
  }

  const consolidated: NichVisionRawItem[] = [];
  for (const bucket of grouped.values()) {
    if (bucket.length === 1) {
      consolidated.push(bucket[0]);
      continue;
    }

    const ranked = bucket.slice().sort((a, b) =>
      (b.itemConfidence ?? b.confidence) - (a.itemConfidence ?? a.confidence),
    );
    const primary = ranked[0];
    const identityNames = [...new Set(ranked.flatMap((item) => [item.rawName, ...(item.candidateNames ?? [])]).filter(Boolean))];
    const normalizedIdentities = new Set(ranked.map((item) => normalizeName(item.rawName)).filter(Boolean));
    const variants = new Set(ranked.map((item) => item.variant));
    const potions = new Set(ranked.map((item) => item.potion));
    const candidateScoreMap = new Map<string, number>();
    for (const item of ranked) {
      for (const entry of item.candidateScores ?? []) {
        const key = normalizeName(entry.itemName);
        candidateScoreMap.set(key, Math.max(candidateScoreMap.get(key) ?? 0, clampConfidence(entry.score)));
      }
    }

    consolidated.push({
      ...primary,
      candidateNames: identityNames.slice(0, 6),
      candidateScores: [...candidateScoreMap.entries()]
        .map(([name, score]) => ({ itemName: identityNames.find((candidate) => normalizeName(candidate) === name) ?? name, score }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 6),
      itemConfidence: normalizedIdentities.size > 1
        ? Math.min(primary.itemConfidence ?? primary.confidence, 0.69)
        : Math.max(...ranked.map((item) => item.itemConfidence ?? item.confidence)),
      confidence: normalizedIdentities.size > 1
        ? Math.min(primary.confidence, 0.69)
        : Math.max(...ranked.map((item) => item.confidence)),
      variant: variants.size === 1 ? primary.variant : "UNKNOWN",
      potion: potions.size === 1 ? primary.potion : "UNKNOWN",
      variantConfidence: variants.size === 1 && potions.size === 1
        ? Math.max(...ranked.map((item) => item.variantConfidence ?? item.confidence))
        : Math.min(...ranked.map((item) => item.variantConfidence ?? item.confidence), 0.65),
      sideConfidence: Math.max(...ranked.map((item) => item.sideConfidence ?? item.confidence)),
      visualEvidence: ranked.map((item) => item.visualEvidence).filter(Boolean).join(" | ").slice(0, 500) || primary.visualEvidence,
    });
  }

  return [...consolidated, ...passthrough];
}

export function shouldBlockTradeLayout(args: {
  imageType: NichVisionImageType;
  layoutConfidence: number;
  incompleteTradeGrid: boolean;
  structurallyConsistentTrade: boolean;
}) {
  if (args.imageType !== "TRADE") return false;
  return args.incompleteTradeGrid || (args.layoutConfidence < 0.55 && !args.structurallyConsistentTrade);
}

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(first: string, second: string) {
  if (first === second) return 0;
  if (!first.length) return second.length;
  if (!second.length) return first.length;

  const previous = Array.from({ length: second.length + 1 }, (_, index) => index);
  const current = new Array<number>(second.length + 1).fill(0);

  for (let row = 1; row <= first.length; row += 1) {
    current[0] = row;
    for (let column = 1; column <= second.length; column += 1) {
      const substitution = previous[column - 1] + (first[row - 1] === second[column - 1] ? 0 : 1);
      current[column] = Math.min(
        previous[column] + 1,
        current[column - 1] + 1,
        substitution,
      );
    }
    for (let column = 0; column <= second.length; column += 1) {
      previous[column] = current[column];
    }
  }

  return previous[second.length];
}

function similarity(first: string, second: string) {
  const a = normalizeName(first);
  const b = normalizeName(second);
  if (!a && !b) return 1;
  const longest = Math.max(a.length, b.length);
  if (!longest) return 1;
  return Math.max(0, 1 - levenshtein(a, b) / longest);
}

function clampConfidence(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(1, number));
}

function categoryMatches(item: { CATEGORY?: unknown }, hint?: NichVisionCategory) {
  if (!hint || hint === "UNKNOWN") return true;
  return String(item.CATEGORY ?? "OTHER") === hint;
}

function uniqueItems<T extends { ID: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.ID)) return false;
    seen.add(item.ID);
    return true;
  });
}

export const VISION_CONFUSION_GROUPS = [
  ["Glormy Dolphin", "Glormy Hound", "Glormy Leo", "Glormy Crab", "Frostbite Bear", "Frostbite Cub"],
  ["Cabbit", "Strawberry Shortcake Bat Dragon", "Strawberry Penguin"],
  ["Tuxedo Cat", "Siamese Cat"],
  // Gemini often collapses the newer/specific artwork to the generic species.
  // Keep both canonical names in the candidate family so icon-only screenshots
  // receive an independent visual audit instead of silently accepting Elephant.
  ["Bush Elephant", "Elephant"],
  ["Sugar Axolotl", "Sugar Skull Dog"],
] as const;

export function getVisionConfusionCandidates(itemName?: string) {
  const normalized = normalizeName(itemName ?? "");
  if (!normalized) return [];
  const group = VISION_CONFUSION_GROUPS.find((names) => names.some((name) => normalizeName(name) === normalized));
  return group ? [...group] : [];
}

export function requiresVisionDisambiguation(item: NichVisionVerifiedItem) {
  const name = item.itemName ?? item.rawName;
  return getVisionConfusionCandidates(name).length > 1 || item.verificationReason === "cross-pass-disagreement";
}

const VISION_EXACT_NAME_COLLISION_GUARDS: Record<string, string[]> = {
  // Known cases where the shorter label has already caused wrong-value output.
  // These are intentionally strict for icon-only screenshots.
  panda: [
    "Giant Panda",
    "Red Panda",
    "Red Panda Ducky",
    "Sea Skeleton Panda",
    "Toasty Red Panda",
  ],
};

function visibleTextConfirmsExactName(raw: NichVisionRawItem, rawName: string) {
  const visible = normalizeName(raw.visibleText ?? "");
  const target = normalizeName(rawName);
  if (!visible || !target) return false;
  return visible === target || visible.includes(target);
}

function exactCandidateItems(raw: NichVisionRawItem) {
  return (raw.candidateNames ?? [])
    .map((name) => getItem(name.trim()))
    .filter((item): item is NonNullable<ReturnType<typeof getItem>> => Boolean(item))
    .filter((item) => categoryMatches(item, raw.categoryHint));
}

export function verifyVisionItem(raw: NichVisionRawItem, options?: { allowConfusionFamilyConfirmation?: boolean }): NichVisionVerifiedItem {
  const rawName = raw.rawName.trim();
  const rawExact = rawName ? getItem(rawName) : undefined;
  const exact = rawExact && categoryMatches(rawExact, raw.categoryHint) ? rawExact : undefined;
  const modelCandidateItems = exactCandidateItems(raw);
  // Cloudflare Free only gives an HTTP invocation 10 ms of CPU. The old vision
  // verifier ran a full fuzzy Levenshtein scan across the entire ~3.4k-item
  // catalog even when Gemini returned an exact canonical name. Exact Map lookups
  // and exact candidateNames are enough in that common path; only pay for fuzzy
  // search when neither produced a catalog candidate.
  const searched = rawName && !exact && modelCandidateItems.length === 0
    ? searchVisionItems(rawName, 12).filter((item) => categoryMatches(item, raw.categoryHint))
    : [];
  const scoredCandidates = (raw.candidateScores ?? [])
    .map((entry) => ({ itemName: entry.itemName, name: normalizeName(entry.itemName), score: clampConfidence(entry.score) }))
    .sort((a, b) => b.score - a.score);
  const scoredCandidateItems = scoredCandidates
    .map((entry) => ({ entry, item: getItem(entry.itemName) }))
    .filter((row): row is { entry: { itemName: string; name: string; score: number }; item: NonNullable<ReturnType<typeof getItem>> } => Boolean(row.item))
    .filter((row) => categoryMatches(row.item, raw.categoryHint));

  const candidates = uniqueItems([
    ...(exact ? [exact] : []),
    ...scoredCandidateItems.map((row) => row.item),
    ...modelCandidateItems,
    ...searched,
  ]);

  const aiConfidence = clampConfidence(raw.itemConfidence ?? raw.confidence);
  const rawTextConfirmed = exact ? visibleTextConfirmsExactName(raw, exact.NAME) : false;
  const topScore = scoredCandidates[0]?.score ?? aiConfidence;
  const secondScore = scoredCandidates[1]?.score ?? 0;
  const scoreMargin = Math.max(0, topScore - secondScore);
  const decisiveScoredRow = scoredCandidateItems[0]
    && scoredCandidateItems[0].entry.score >= 0.78
    && (scoredCandidateItems.length === 1 || scoreMargin >= 0.12)
    ? scoredCandidateItems[0]
    : undefined;

  // A decisive model candidate score is stronger than an unlabelled rawName.
  // This matters when the model initially names the icon incorrectly but its own
  // ranked alternatives actually favor another current CSBT pet. Visible exact
  // item-name text remains the strongest signal and cannot be overridden here.
  const best = rawTextConfirmed
    ? exact
    : decisiveScoredRow?.item ?? candidates[0];
  const databaseConfidence = best
    ? exact?.ID === best.ID
      ? 1
      : Math.max(similarity(rawName, best.NAME), decisiveScoredRow?.item.ID === best.ID ? decisiveScoredRow.entry.score : 0)
    : 0;
  const textConfirmed = best ? visibleTextConfirmsExactName(raw, best.NAME) : false;

  // Build confusion families from BOTH the model's raw identity and the local
  // best candidate. This matters when Gemini returns a plausible name that is
  // not itself in the CSBT catalog (for example "Sugar Skull Dog") but the
  // known lookalike rescue ("Sugar Axolotl") is. Using only best.NAME caused
  // the rescue candidate to disappear before the focused audit/UI could show it.
  const confusionCandidates = [...new Set([
    ...getVisionConfusionCandidates(rawName),
    ...(best ? getVisionConfusionCandidates(best.NAME) : []),
  ])];
  const confusionNeedsAudit = Boolean(
    confusionCandidates.length > 1 && !textConfirmed && !options?.allowConfusionFamilyConfirmation,
  );

  const collisionGuardNames = VISION_EXACT_NAME_COLLISION_GUARDS[normalizeName(best?.NAME ?? rawName)] ?? [];
  const specificityAlternatives = best
    ? candidates.filter(
        (item) =>
          item.ID !== best.ID &&
          item.CATEGORY === best.CATEGORY &&
          collisionGuardNames.some((name) => normalizeName(name) === normalizeName(item.NAME)),
      )
    : [];
  const specificityAmbiguous = Boolean(
    best &&
      collisionGuardNames.length > 0 &&
      specificityAlternatives.length > 0 &&
      !textConfirmed,
  );

  const scoredAlternativeItems = scoredCandidateItems.map((row) => row.item).filter((item) => item.ID !== best?.ID);
  const modelAlternatives = uniqueItems([
    ...scoredAlternativeItems,
    ...modelCandidateItems.filter((item) => item.ID !== best?.ID),
  ]);

  // candidateNames is a hypothesis list, not an automatic failure signal. Only
  // treat alternatives as blocking ambiguity when scores are genuinely close or
  // the model is not confident enough to choose among unscored alternatives.
  const scoredAmbiguity = scoredCandidates.length >= 2 && (
    topScore < 0.78 || (secondScore >= 0.55 && scoreMargin < 0.18)
  );
  const unscoredAmbiguity = scoredCandidates.length < 2 && modelAlternatives.length > 0 && aiConfidence < 0.88;
  const modelExpressedAmbiguity = modelAlternatives.length > 0 && (scoredAmbiguity || unscoredAmbiguity);
  const categoryMismatch = Boolean(rawExact && !exact);

  let verified = false;
  let verificationReason = "unverified";

  if (!best) {
    verificationReason = "not-in-csbt-catalog";
  } else if (categoryMismatch) {
    verificationReason = "category-mismatch";
  } else if (confusionNeedsAudit) {
    verificationReason = "visual-confusion-family";
  } else if (specificityAmbiguous) {
    verificationReason = "specificity-ambiguous";
  } else if (modelExpressedAmbiguity) {
    verificationReason = "model-reported-alternatives";
  } else if (best) {
    const decisiveScoredCandidate = Boolean(
      decisiveScoredRow?.item.ID === best.ID
      && topScore >= 0.82
      && (scoredCandidates.length === 1 || scoreMargin >= 0.2),
    );
    const threshold = textConfirmed ? 0.64 : decisiveScoredCandidate ? 0.76 : exact?.ID === best.ID ? 0.84 : 0.88;
    const identitySignal = decisiveScoredRow?.item.ID === best.ID
      ? Math.max(aiConfidence, decisiveScoredRow.entry.score)
      : aiConfidence;
    verified = identitySignal >= threshold && (exact?.ID === best.ID || decisiveScoredCandidate || databaseConfidence >= 0.82);
    verificationReason = verified
      ? textConfirmed
        ? "exact-visible-text"
        : decisiveScoredCandidate && exact?.ID !== best.ID
          ? "ranked-candidate-high-confidence"
          : exact?.ID === best.ID
            ? "exact-high-confidence"
            : "fuzzy-high-confidence"
      : exact?.ID === best.ID
        ? "exact-low-confidence"
        : "fuzzy-low-confidence";
  }

  const confusionItems = confusionCandidates
    .map((name) => getItem(name))
    .filter((item): item is NonNullable<ReturnType<typeof getItem>> => Boolean(item))
    .filter((item) => item.ID !== best?.ID);

  const alternatives = uniqueItems([
    ...confusionItems,
    ...specificityAlternatives,
    ...modelAlternatives,
    ...candidates.filter((item) => item.ID !== best?.ID),
  ])
    .slice(0, 4)
    .map((item) => item.NAME);

  return {
    ...raw,
    rawName,
    confidence: aiConfidence,
    itemConfidence: aiConfidence,
    variantConfidence: clampConfidence(raw.variantConfidence ?? raw.confidence),
    sideConfidence: clampConfidence(raw.sideConfidence ?? raw.confidence),
    quantity: Math.max(1, Math.min(18, Math.floor(Number(raw.quantity) || 1))),
    ...(best
      ? {
          itemId: best.ID,
          itemName: best.NAME,
          category: String(best.CATEGORY ?? "OTHER"),
        }
      : {}),
    databaseConfidence,
    verified,
    alternatives,
    verificationReason,
  };
}

export function mergeVisionCrossCheck(original: NichVisionVerifiedItem[], focused: NichVisionVerifiedItem[]) {
  const focusedBySlot = new Map<string, NichVisionVerifiedItem>();
  for (const item of focused) {
    if (item.side === "NONE" || !item.slot) continue;
    focusedBySlot.set(`${item.side}:${item.slot}`, item);
  }

  return original.map((item) => {
    if (item.side === "NONE" || !item.slot) return item;
    const rechecked = focusedBySlot.get(`${item.side}:${item.slot}`);
    if (!rechecked) return item;

    const originalIdentity = item.itemConfidence ?? item.confidence;
    const recheckedIdentity = rechecked.itemConfidence ?? rechecked.confidence;
    const originalVariant = item.variantConfidence ?? item.confidence;
    const recheckedVariant = rechecked.variantConfidence ?? rechecked.confidence;
    const sameCanonical = Boolean(item.itemId && rechecked.itemId && item.itemId === rechecked.itemId);

    if (sameCanonical) {
      const strongerVariant = recheckedVariant >= originalVariant + 0.08;
      const variantDisagrees = item.variant !== rechecked.variant;
      const potionDisagrees = item.potion !== rechecked.potion;
      const closeVariantConfidence = Math.abs(originalVariant - recheckedVariant) < 0.12;
      const ambiguousVariant = (variantDisagrees || potionDisagrees)
        && originalVariant >= 0.68
        && recheckedVariant >= 0.68
        && closeVariantConfidence;

      return {
        ...item,
        confidence: Math.max(item.confidence, rechecked.confidence),
        itemConfidence: Math.max(originalIdentity, recheckedIdentity),
        verified: item.verified || rechecked.verified,
        verificationReason: item.verified || rechecked.verified ? "cross-pass-agreement" : item.verificationReason,
        ...(ambiguousVariant
          ? {
              variant: variantDisagrees ? "UNKNOWN" as const : item.variant,
              potion: potionDisagrees ? "UNKNOWN" as const : item.potion,
              variantConfidence: Math.min(originalVariant, recheckedVariant, 0.66),
            }
          : strongerVariant
            ? {
                variant: rechecked.variant,
                potion: rechecked.potion,
                variantConfidence: recheckedVariant,
              }
            : {}),
        visualEvidence: rechecked.visualEvidence || item.visualEvidence,
        candidateNames: [...new Set([...(item.candidateNames ?? []), ...(rechecked.candidateNames ?? [])])].slice(0, 6),
        candidateScores: rechecked.candidateScores?.length ? rechecked.candidateScores : item.candidateScores,
      };
    }

    if (!item.verified && rechecked.verified) return rechecked;
    if (item.verified && !rechecked.verified) return item;

    if (item.verified && rechecked.verified && item.itemId && rechecked.itemId && item.itemId !== rechecked.itemId) {
      const alternatives = [...new Set([
        rechecked.itemName,
        ...(item.alternatives ?? []),
        ...(rechecked.alternatives ?? []),
      ].filter((name): name is string => Boolean(name)))].slice(0, 5);
      return {
        ...item,
        verified: false,
        confidence: Math.min(item.confidence, 0.69),
        itemConfidence: Math.min(Math.max(originalIdentity, recheckedIdentity), 0.69),
        alternatives,
        candidateNames: alternatives,
        verificationReason: "cross-pass-disagreement",
      };
    }

    const strongerIdentity = rechecked.verified && recheckedIdentity >= originalIdentity + 0.03;
    if (strongerIdentity) return rechecked;
    return item;
  });
}

export function mergeVisionDisambiguation(
  original: NichVisionVerifiedItem[],
  discriminated: NichVisionVerifiedItem[],
) {
  const bySlot = new Map<string, NichVisionVerifiedItem>();
  for (const item of discriminated) {
    if (item.side === "NONE" || !item.slot) continue;
    bySlot.set(`${item.side}:${item.slot}`, item);
  }

  return original.map((item) => {
    if (item.side === "NONE" || !item.slot) return item;
    const decision = bySlot.get(`${item.side}:${item.slot}`);
    if (!decision?.itemId || !decision.itemName) return item;

    const allowedNames = new Set([
      item.itemName,
      item.rawName,
      ...(item.alternatives ?? []),
      ...getVisionConfusionCandidates(item.itemName ?? item.rawName),
    ].filter((name): name is string => Boolean(name)).map(normalizeName));

    // The discriminator is not allowed to invent a completely new answer. It may
    // only decide among the candidates produced by local catalog verification and
    // the curated confusion family for this slot.
    if (!allowedNames.has(normalizeName(decision.itemName))) return item;

    const scores = (decision.candidateScores ?? []).slice().sort((a, b) => b.score - a.score);
    const margin = scores.length >= 2 ? scores[0].score - scores[1].score : 1;
    const identityConfidence = clampConfidence(decision.itemConfidence ?? decision.confidence);
    const decisive = decision.verified && identityConfidence >= 0.86 && margin >= 0.12;
    if (!decisive) {
      return {
        ...item,
        alternatives: [...new Set([decision.itemName, ...item.alternatives])].slice(0, 5),
        verificationReason: item.verificationReason === "cross-pass-disagreement"
          ? item.verificationReason
          : "disambiguation-inconclusive",
      };
    }

    return {
      ...item,
      rawName: decision.rawName,
      itemId: decision.itemId,
      itemName: decision.itemName,
      category: decision.category,
      databaseConfidence: decision.databaseConfidence,
      verified: true,
      confidence: Math.max(item.confidence, decision.confidence),
      itemConfidence: identityConfidence,
      alternatives: [...new Set([...(decision.alternatives ?? []), ...item.alternatives])]
        .filter((name) => normalizeName(name) !== normalizeName(decision.itemName!))
        .slice(0, 4),
      verificationReason: "targeted-visual-disambiguation",
      visualEvidence: decision.visualEvidence || item.visualEvidence,
      candidateNames: decision.candidateNames,
      candidateScores: decision.candidateScores,
      // Variant/potion are separate from identity. Use the targeted read only when
      // it is at least as confident as the existing badge read.
      ...((decision.variantConfidence ?? 0) >= (item.variantConfidence ?? 0)
        ? {
            variant: decision.variant,
            potion: decision.potion,
            variantConfidence: decision.variantConfidence,
          }
        : {}),
    };
  });
}

function formatVisionTradeToken(item: NichVisionVerifiedItem) {
  const name = item.itemName ?? item.rawName;
  const quantity = item.quantity > 1 ? `${item.quantity}x ` : "";
  let prefix = "";

  if (item.variant === "NEON") {
    prefix = item.potion === "FR" ? "NFR " : item.potion === "F" ? "NF " : item.potion === "R" ? "NR " : item.potion === "NONE" ? "no potion neon " : "Neon ";
  } else if (item.variant === "MEGA") {
    prefix = item.potion === "FR" ? "MFR " : item.potion === "F" ? "MF " : item.potion === "R" ? "MR " : item.potion === "NONE" ? "no potion mega " : "Mega ";
  } else {
    prefix = item.potion === "FR" ? "FR " : item.potion === "F" ? "F " : item.potion === "R" ? "R " : item.potion === "NONE" ? "NP " : "";
  }

  return `${quantity}${prefix}${name}`.trim();
}

export function buildVisionLocalPrompt(
  imageType: NichVisionImageType,
  items: NichVisionVerifiedItem[],
) {
  const verified = items.filter((item) => item.verified && item.itemName);
  if (!verified.length) return undefined;

  if (imageType === "TRADE") {
    const yours = verified.filter((item) => item.side === "YOU");
    const theirs = verified.filter((item) => item.side === "THEM");
    if (!yours.length || !theirs.length) return undefined;

    return `WFL me ${yours.map(formatVisionTradeToken).join(" + ")} them ${theirs.map(formatVisionTradeToken).join(" + ")}`;
  }

  const tokens = verified.slice(0, 18).map(formatVisionTradeToken);
  if (tokens.length === 1) return `what is ${tokens[0]} worth`;
  return `how much are ${tokens.join(", ")}`;
}

export function summarizeVisionItems(
  imageType: NichVisionImageType,
  items: NichVisionVerifiedItem[],
) {
  const verified = items.filter((item) => item.verified && item.itemName);
  const uncertain = items.filter((item) => !item.verified);

  const lines: string[] = [];

  const variantPrefix = (item: NichVisionVerifiedItem) => item.variant === "MEGA"
    ? item.potion === "FR" ? "MFR " : item.potion === "R" ? "MR " : item.potion === "F" ? "MF " : "Mega "
    : item.variant === "NEON"
      ? item.potion === "FR" ? "NFR " : item.potion === "R" ? "NR " : item.potion === "F" ? "NF " : "Neon "
      : item.potion === "FR" ? "FR " : item.potion === "R" ? "R " : item.potion === "F" ? "F " : "";

  const uncertaintyReason = (item: NichVisionVerifiedItem) => {
    const reasons: string[] = [];
    if (!item.verified) reasons.push("identity");
    if (item.variant === "UNKNOWN") reasons.push("variant");
    if (item.category === "PET" && item.potion === "UNKNOWN") reasons.push("potion");
    if (item.side === "NONE") reasons.push("side");
    return reasons.length ? reasons.join("/") : "recognition";
  };

  const display = (item: NichVisionVerifiedItem) => {
    const primary = (item.itemName ?? item.rawName) || "Unknown item";
    const token = item.verified ? formatVisionTradeToken(item) : `${variantPrefix(item)}${primary}`.trim();
    const slot = item.slot ? `Slot ${item.slot}: ` : "";
    return `${item.verified ? "✓" : "?"} ${slot}${token}`;
  };

  if (imageType === "TRADE") {
    const byGrid = (a: NichVisionVerifiedItem, b: NichVisionVerifiedItem) => (a.slot ?? 99) - (b.slot ?? 99);
    const yours = items.filter((item) => item.side === "YOU").slice().sort(byGrid);
    const theirs = items.filter((item) => item.side === "THEM").slice().sort(byGrid);
    const noSide = items.filter((item) => item.side === "NONE").slice().sort(byGrid);

    lines.push(items.length ? "📸 Screenshot recognized" : "📸 Screenshot received");

    if (yours.length) {
      lines.push("");
      lines.push("YOUR SIDE");
      for (const item of yours) lines.push(`• ${display(item)}`);
    }
    if (theirs.length) {
      lines.push("");
      lines.push("THEIR SIDE");
      for (const item of theirs) lines.push(`• ${display(item)}`);
    }
    if (noSide.length) {
      lines.push("");
      lines.push("DETECTED — SIDE UNCLEAR");
      for (const item of noSide) lines.push(`• ${display(item)}`);
    }

    if (!items.length) {
      lines.push("");
      lines.push("⚠️ I can see this is a trade screenshot, but I could not identify any occupied item slots reliably.");
      lines.push("I am not going to guess. Try a tighter crop around the two trade grids, or upload the original screenshot instead of a compressed copy.");
      return lines.join("\n");
    }
  } else {
    lines.push(
      items.length
        ? imageType === "INVENTORY" ? "📦 Inventory screenshot recognized" : "📸 Item screenshot recognized"
        : "📸 Screenshot received",
    );
    if (verified.length) lines.push(`Detected: ${verified.map(formatVisionTradeToken).join(", ")}`);
    if (!items.length) {
      lines.push("");
      lines.push("⚠️ I could not identify an Adopt Me item reliably from this image.");
    }
  }

  if (uncertain.length) {
    lines.push("");
    lines.push("⚠️ NEEDS CONFIRMATION");
    for (const item of uncertain.slice(0, 8)) {
      const side = item.side === "YOU" ? "Your" : item.side === "THEM" ? "Their" : "Detected";
      const slot = item.slot ? ` slot ${item.slot}` : " item";
      const primary = (item.itemName ?? item.rawName) || "Unknown item";
      const alternatives = item.alternatives.length ? ` | possible: ${item.alternatives.slice(0, 4).join(" / ")}` : "";
      lines.push(`• ${side}${slot}: ${variantPrefix(item)}${primary} [unclear: ${uncertaintyReason(item)}]${alternatives}`.trim());
    }
    lines.push("Reply with only the correction, e.g. “my slot 2 is Frostbite Bear” or “their slot 1 is MFR Cabbit”.");
  }

  return lines.join("\n");
}

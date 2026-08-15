import { getItem, searchItems } from "../search";

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
  confidence: number;
  categoryHint?: NichVisionCategory;
  candidateNames?: string[];
  visualEvidence?: string;
  visibleText?: string;
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
  message: string;
  usage?: {
    promptTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
};

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

export function verifyVisionItem(raw: NichVisionRawItem): NichVisionVerifiedItem {
  const rawName = raw.rawName.trim();
  const rawExact = rawName ? getItem(rawName) : undefined;
  const exact = rawExact && categoryMatches(rawExact, raw.categoryHint) ? rawExact : undefined;
  const searched = rawName
    ? searchItems(rawName, 12).filter((item) => categoryMatches(item, raw.categoryHint))
    : [];
  const modelCandidateItems = exactCandidateItems(raw);
  const candidates = uniqueItems([
    ...(exact ? [exact] : []),
    ...modelCandidateItems,
    ...searched,
  ]);
  const best = candidates[0];
  const databaseConfidence = best
    ? exact
      ? 1
      : similarity(rawName, best.NAME)
    : 0;
  const aiConfidence = clampConfidence(raw.confidence);
  const textConfirmed = exact ? visibleTextConfirmsExactName(raw, exact.NAME) : false;

  const collisionGuardNames = VISION_EXACT_NAME_COLLISION_GUARDS[normalizeName(rawName)] ?? [];
  const specificityAlternatives = best
    ? candidates.filter(
        (item) =>
          item.ID !== best.ID &&
          item.CATEGORY === best.CATEGORY &&
          collisionGuardNames.some((name) => normalizeName(name) === normalizeName(item.NAME)),
      )
    : [];
  const specificityAmbiguous = Boolean(
    exact &&
      specificityAlternatives.length > 0 &&
      !textConfirmed,
  );

  const modelAlternatives = modelCandidateItems.filter((item) => item.ID !== best?.ID);
  const modelExpressedAmbiguity = modelAlternatives.length > 0;
  const categoryMismatch = Boolean(rawExact && !exact);

  // Screenshot recognition is deliberately conservative. A wrong exact pet name
  // is far more damaging than asking for a clearer screenshot, because a wrong
  // identification immediately produces a wrong CSBT value/WFL. Visible item-name
  // text can lower the threshold; icon-only recognition must be substantially
  // more confident. Fuzzy name correction is stricter again.
  let verified = false;
  let verificationReason = "unverified";

  if (!best) {
    verificationReason = "not-in-csbt-catalog";
  } else if (categoryMismatch) {
    verificationReason = "category-mismatch";
  } else if (specificityAmbiguous) {
    verificationReason = "specificity-ambiguous";
  } else if (modelExpressedAmbiguity) {
    // candidateNames is specifically defined as the set of genuinely plausible
    // visual identities. If Gemini gives more than one, NICH should ask rather
    // than turn that uncertainty into a real CSBT value.
    verificationReason = "model-reported-alternatives";
  } else if (exact) {
    const threshold = textConfirmed ? 0.64 : 0.84;
    verified = aiConfidence >= threshold;
    verificationReason = verified
      ? textConfirmed
        ? "exact-visible-text"
        : "exact-high-confidence"
      : "exact-low-confidence";
  } else {
    verified = aiConfidence >= 0.88 && databaseConfidence >= 0.82;
    verificationReason = verified ? "fuzzy-high-confidence" : "fuzzy-low-confidence";
  }

  const alternatives = uniqueItems([
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

  if (imageType === "TRADE") {
    const yours = verified.filter((item) => item.side === "YOU");
    const theirs = verified.filter((item) => item.side === "THEM");
    lines.push("📸 Screenshot recognized");
    if (yours.length) lines.push(`You: ${yours.map(formatVisionTradeToken).join(" + ")}`);
    if (theirs.length) lines.push(`Them: ${theirs.map(formatVisionTradeToken).join(" + ")}`);
  } else {
    lines.push(imageType === "INVENTORY" ? "📦 Inventory screenshot recognized" : "📸 Item screenshot recognized");
    if (verified.length) lines.push(`Detected: ${verified.map(formatVisionTradeToken).join(", ")}`);
  }

  if (uncertain.length) {
    lines.push("");
    lines.push("⚠️ I’m not confident about every item yet:");
    for (const item of uncertain.slice(0, 5)) {
      const alternatives = item.alternatives.length ? ` — possible: ${item.alternatives.join(" / ")}` : "";
      lines.push(`• ${item.rawName || "Unknown item"}${alternatives}`);
    }
  }

  return lines.join("\n");
}

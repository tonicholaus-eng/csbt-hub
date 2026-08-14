import { getItem, searchItems } from "../search";

export type NichVisionImageType =
  | "TRADE"
  | "INVENTORY"
  | "ITEM"
  | "OTHER";

export type NichVisionSide = "YOU" | "THEM" | "NONE";
export type NichVisionVariant = "NORMAL" | "NEON" | "MEGA" | "UNKNOWN";
export type NichVisionPotion = "NONE" | "F" | "R" | "FR" | "UNKNOWN";

export type NichVisionRawItem = {
  rawName: string;
  side: NichVisionSide;
  variant: NichVisionVariant;
  potion: NichVisionPotion;
  quantity: number;
  confidence: number;
  visibleText?: string;
};

export type NichVisionModelResult = {
  imageType: NichVisionImageType;
  layoutConfidence: number;
  items: NichVisionRawItem[];
  note?: string;
};

export type NichVisionVerifiedItem = NichVisionRawItem & {
  itemId?: string;
  itemName?: string;
  category?: string;
  databaseConfidence: number;
  verified: boolean;
  alternatives: string[];
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

const VISION_EXACT_NAME_COLLISION_GUARDS: Record<string, string[]> = {
  // These are separate Adopt Me pets. If Gemini collapses a specific pet into
  // the generic Panda label, refusing the trade is safer than using a wrong value.
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

export function verifyVisionItem(raw: NichVisionRawItem): NichVisionVerifiedItem {
  const rawName = raw.rawName.trim();
  const exact = rawName ? getItem(rawName) : undefined;
  const searched = rawName ? searchItems(rawName, 8) : [];
  const candidates = exact
    ? [exact, ...searched.filter((item) => item.ID !== exact.ID)]
    : searched;
  const best = candidates[0];
  const databaseConfidence = best
    ? exact
      ? 1
      : similarity(rawName, best.NAME)
    : 0;
  const aiConfidence = clampConfidence(raw.confidence);
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
      !visibleTextConfirmsExactName(raw, rawName),
  );

  // Exact canonical names can normally be accepted at a slightly lower visual confidence.
  // Fuzzy matches need both stronger visual confidence and a strong database name match.
  // Known generic/specific collisions are intentionally NOT auto-accepted from icon-only
  // screenshots: a wrong value is worse than asking the user to clarify the pet.
  const verified = Boolean(
    best &&
      !specificityAmbiguous &&
      (exact
        ? aiConfidence >= 0.68
        : aiConfidence >= 0.78 && databaseConfidence >= 0.76),
  );

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
    alternatives: (specificityAmbiguous ? specificityAlternatives : candidates)
      .slice(0, 3)
      .map((item) => item.NAME),
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

/**
 * Catalog-constrained recognition for NICH Adopt Me screenshots.
 *
 * PRIMARY RULE: the vision model is never the final authority on a pet's name.
 * It supplies structured visual evidence (species, colours, features) plus, at
 * most, a low-trust name guess. The CSBT catalog is the only source of valid
 * identities, and an identity is only accepted when independent signals agree.
 *
 * Pipeline position:
 *   slot detection -> visual evidence -> retrieveCatalogCandidates()
 *   -> catalog-image verification -> decideSlotIdentity() -> UI
 */

import type { TradeItem } from "../../components/trade/types";
import {
  itemList,
  getItem,
  normalizeSearchText,
  searchVisionItems,
  getLooseSearchSimilarity,
  expandCatalogQueryAlias,
} from "../search";
import {
  colorsForToken,
  normalizeAnimalType,
  normalizeColors,
  speciesForToken,
  tokensForFeatures,
} from "./visionLexicon";

export type NichVisualEvidence = {
  /** Free-text species read from the artwork, e.g. "dragon", "small dog". */
  animalType?: string;
  /** Dominant body colours, e.g. ["black", "gray"]. */
  bodyColors: string[];
  /** Short visual feature phrases, e.g. ["skeletal body", "long wings"]. */
  features: string[];
  orientation?: string;
  /** Item-name text actually legible in the screenshot (strongest signal). */
  visibleText?: string;
  /**
   * The model's own name guess. LOW TRUST — it is one candidate signal and can
   * never, on its own, produce an accepted identity.
   */
  freeFormName?: string;
  /** Names the model believes are plausible. Only exact catalog hits count. */
  possibleCatalogNames: string[];
  /** Description of the artwork, kept for development diagnostics. */
  description?: string;
  /** The model's self-reported confidence in its visual reading, 0..1. */
  visualConfidence: number;
};

export type NichCatalogCandidate = {
  itemId: string;
  itemName: string;
  category: string;
  rarity: string | null;
  image: string;
  /** Retrieval score 0..1: earned evidence / available evidence. Ranking signal. */
  score: number;
  /**
   * Fraction of the total evidence budget that was even applicable to this
   * candidate. A match on species alone has low coverage however cleanly it
   * matched, which keeps `confidence` honest about how much was actually seen.
   */
  coverage: number;
  /** Human-readable reasons, surfaced in development diagnostics only. */
  signals: string[];
};

/** Result of the image-to-catalog comparison pass. */
export type NichCatalogMatchVote = {
  /** Catalog ID the verifier picked, or null when it answered "none". */
  chosenItemId: string | null;
  /** Verifier confidence in that choice, 0..1. */
  confidence: number;
  reason?: string;
};

export type NichRecognitionStatus = "ACCEPTED" | "NEEDS_CONFIRMATION" | "UNKNOWN";

export type NichSlotDecision = {
  status: NichRecognitionStatus;
  itemId?: string;
  itemName?: string;
  category?: string;
  /** Final identity confidence, 0..1. Only meaningful alongside `status`. */
  confidence: number;
  /** Ranked catalog candidates to offer the user. Always real catalog entries. */
  topCandidates: NichCatalogCandidate[];
  reason: string;
};

/**
 * Thresholds are deliberately precision-first: a false positive is much worse
 * than a confirmation prompt. They are applied to the blended retrieval +
 * verification score below, not to a raw model self-report.
 */
export const VISION_ACCEPT_THRESHOLD = 0.88;
export const VISION_CONFIRM_THRESHOLD = 0.56;
export const VISION_SUGGEST_THRESHOLD = 0.3;
export const VISION_ACCEPT_MARGIN = 0.12;
export const VISION_CONFIRM_MARGIN = 0.055;
/** Hard ceiling on how much pure text similarity may ever contribute. */
export const MAX_WEAK_NAME_SIMILARITY_BONUS = 0.07;
/**
 * Auto-acceptance without catalog-image verification additionally requires this
 * many independent evidence channels. Species + one model name is enough to
 * SUGGEST a pet, never enough to confirm one on its own.
 */
export const MIN_ACCEPT_EVIDENCE_CHANNELS = 3;

/** Relative weight of each evidence channel; used as earned/available. */
const WEIGHT_SPECIES = 0.4;
const WEIGHT_COLOR = 0.2;
const WEIGHT_FEATURE = 0.16;
const WEIGHT_NAME = 0.24;

type CatalogVisualRow = {
  item: TradeItem;
  normalizedName: string;
  tokens: string[];
  species: Set<string>;
  colors: Set<string>;
};

let catalogVisualIndex: CatalogVisualRow[] | null = null;

function buildCatalogVisualIndex(): CatalogVisualRow[] {
  return itemList.map((item) => {
    const normalizedName = normalizeSearchText(item.NAME);
    const tokens = normalizedName.split(" ").filter(Boolean);
    const species = new Set<string>();
    const colors = new Set<string>();
    for (const token of tokens) {
      for (const key of speciesForToken(token)) species.add(key);
      for (const key of colorsForToken(token)) colors.add(key);
    }
    return { item, normalizedName, tokens, species, colors };
  });
}

function getCatalogVisualIndex() {
  if (!catalogVisualIndex) catalogVisualIndex = buildCatalogVisualIndex();
  return catalogVisualIndex;
}

function clamp01(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(1, number));
}

function levenshtein(first: string, second: string) {
  if (first === second) return 0;
  if (!first.length) return second.length;
  if (!second.length) return first.length;
  const previous = Array.from({ length: second.length + 1 }, (_, index) => index);
  for (let row = 1; row <= first.length; row += 1) {
    let diagonal = previous[0];
    previous[0] = row;
    for (let column = 1; column <= second.length; column += 1) {
      const next = Math.min(
        previous[column] + 1,
        previous[column - 1] + 1,
        diagonal + (first[row - 1] === second[column - 1] ? 0 : 1),
      );
      diagonal = previous[column];
      previous[column] = next;
    }
  }
  return previous[second.length];
}

function similarity(first: string, second: string) {
  const a = normalizeSearchText(first);
  const b = normalizeSearchText(second);
  const longest = Math.max(a.length, b.length);
  if (!longest) return 0;
  return Math.max(0, 1 - levenshtein(a, b) / longest);
}

const TOTAL_EVIDENCE_WEIGHT = WEIGHT_SPECIES + WEIGHT_COLOR + WEIGHT_FEATURE + WEIGHT_NAME;

function toCandidate(row: CatalogVisualRow, score: number, coverage: number, signals: string[]): NichCatalogCandidate {
  return {
    itemId: row.item.ID,
    itemName: row.item.NAME,
    category: String(row.item.CATEGORY ?? "OTHER"),
    rarity: row.item.RARITY ?? null,
    image: row.item.IMAGE,
    score: clamp01(score),
    coverage: clamp01(coverage),
    signals,
  };
}

/**
 * How confident we are allowed to sound. A perfect ratio earned from one channel
 * is not the same as a perfect ratio earned from four.
 */
export function candidateConfidence(candidate: NichCatalogCandidate) {
  return clamp01(candidate.score * candidate.coverage);
}

/**
 * True when the model's free-form name is not an entry in the CSBT catalog.
 * Such a name is treated as LOW TRUST: only its descriptive content is used,
 * never its string shape. This is what stops "Undead Jousting Horse" from being
 * fuzzy-matched onto a real but different pet.
 */
export function isHallucinatedName(name: string | undefined) {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return false;
  return !getItem(trimmed);
}

type CatalogHypothesis = {
  item: TradeItem;
  strength: number;
  rank: number;
  exact: boolean;
  source: "raw" | "candidate";
};

/**
 * Resolve a model hypothesis to REAL catalog entries without requiring perfect
 * spelling or spacing. The result is still only candidate evidence — a loose
 * name can never auto-confirm an identity by itself.
 *
 * This deliberately understands community/OCR forms such as `uni horn` ->
 * `Unicorn Horn` and one-letter slips such as `raincloud rat` -> `Rain Cloud
 * Hat`, while retaining the visual confidence/verification gates downstream.
 */
function resolveCatalogHypothesis(
  name: string,
  source: CatalogHypothesis["source"],
  rank: number,
): CatalogHypothesis[] {
  const trimmed = name.trim();
  if (!trimmed) return [];

  const exact = getItem(trimmed);
  if (exact) return [{ item: exact, strength: 1, rank, exact: true, source }];

  const expandedAlias = expandCatalogQueryAlias(trimmed);
  const aliasExact = expandedAlias !== normalizeSearchText(trimmed) ? getItem(expandedAlias) : undefined;
  if (aliasExact) {
    return [{ item: aliasExact, strength: 0.97, rank, exact: false, source }];
  }

  return searchVisionItems(trimmed, 5)
    .map((item, index) => ({
      item,
      // searchVisionItems already ranks token/spacing/community aliases. The
      // string score is used only to grade that hypothesis, not to decide the
      // identity. Rank decay prevents one loose phrase from flooding the list.
      strength: Math.max(0.55, getLooseSearchSimilarity(trimmed, item.NAME)) * (1 - index * 0.08),
      rank: rank + index,
      exact: false,
      source,
    }))
    .filter((entry) => entry.strength >= 0.5);
}

/**
 * Rank real catalog entries against structured visual evidence.
 *
 * Species agreement is the dominant signal. Colour and feature overlap refine
 * it. Name signals only count when they resolve to an exact catalog entry;
 * anything else is capped at MAX_WEAK_NAME_SIMILARITY_BONUS so text similarity
 * can never substitute for visual evidence.
 */
export function retrieveCatalogCandidates(
  evidence: NichVisualEvidence,
  options?: { category?: string; limit?: number },
): NichCatalogCandidate[] {
  const limit = Math.max(1, Math.min(12, options?.limit ?? 6));
  const wantedCategory = options?.category && options.category !== "UNKNOWN"
    ? options.category.toUpperCase()
    : undefined;

  const speciesKeys = new Set(normalizeAnimalType(evidence.animalType));
  const colorKeys = new Set(normalizeColors(evidence.bodyColors));
  const featureTokens = new Set(tokensForFeatures(evidence.features));

  const visibleTextItem = evidence.visibleText ? getItem(evidence.visibleText.trim()) : undefined;

  // Resolve every model hypothesis through the REAL catalog with tolerant
  // spelling/spacing. This keeps the model from being the authority while also
  // avoiding the v33 failure where `Uni Horn`, merged words, or a one-letter OCR
  // slip were discarded before catalog verification could even begin.
  const hypothesisRows = [
    ...(evidence.freeFormName ? resolveCatalogHypothesis(evidence.freeFormName, "raw", 0) : []),
    ...evidence.possibleCatalogNames.flatMap((name, index) => resolveCatalogHypothesis(name, "candidate", index)),
  ];
  const hypothesisById = new Map<string, CatalogHypothesis>();
  for (const hypothesis of hypothesisRows) {
    const previous = hypothesisById.get(hypothesis.item.ID);
    const weighted = hypothesis.strength * Math.max(0.45, 1 - hypothesis.rank * 0.13);
    const previousWeighted = previous
      ? previous.strength * Math.max(0.45, 1 - previous.rank * 0.13)
      : -1;
    if (!previous || weighted > previousWeighted || (weighted === previousWeighted && hypothesis.exact && !previous.exact)) {
      hypothesisById.set(hypothesis.item.ID, hypothesis);
    }
  }

  const normalizedModelName = evidence.freeFormName ? normalizeSearchText(evidence.freeFormName) : "";
  const exactModelName = evidence.freeFormName ? getItem(evidence.freeFormName.trim()) : undefined;
  const modelNameIsCatalogEntry = Boolean(exactModelName);
  const anyNameHypothesis = hypothesisById.size > 0;

  const scored: NichCatalogCandidate[] = [];
  for (const row of getCatalogVisualIndex()) {
    const rowCategory = String(row.item.CATEGORY).toUpperCase();
    const categoryAgrees = !wantedCategory || rowCategory === wantedCategory;
    const hypothesis = hypothesisById.get(row.item.ID);
    // Category from the layout pass is a useful hint, not a prison. Trade slots
    // can contain pet wear/toys/etc., and the first pass can call them PET. A
    // strong real-catalog name hypothesis is allowed to rescue that mistake, but
    // pure visual retrieval remains scoped to the hinted category.
    if (!categoryAgrees && (!hypothesis || hypothesis.strength < 0.78)) continue;

    const signals: string[] = [];
    let speciesAgrees = true;
    // The score is EARNED evidence divided by AVAILABLE evidence, not a raw sum.
    //
    // A plain sum silently punished pets whose names carry no colour or feature
    // word: "Hydra" and "Pomeranian" could never exceed species + name = 0.58,
    // while "Frost Dragon" reached 0.86 only because "frost" happens to be a
    // colour token. That made the score a measure of how descriptive a NAME is
    // rather than how good the evidence is, and it is why correctly-named pets
    // were falling under every threshold at once.
    let earned = 0;
    let available = 0;

    if (speciesKeys.size) {
      available += WEIGHT_SPECIES;
      const overlap = [...row.species].filter((key) => speciesKeys.has(key));
      if (overlap.length) {
        earned += WEIGHT_SPECIES;
        signals.push(`species:${overlap.slice(0, 3).join("+")}`);
      } else {
        speciesAgrees = false;
      }
    }

    // Colour only counts when this catalog entry's name can express a colour at
    // all; otherwise the channel is simply unavailable for this candidate.
    if (colorKeys.size && row.colors.size) {
      available += WEIGHT_COLOR;
      const overlap = [...row.colors].filter((key) => colorKeys.has(key));
      if (overlap.length) {
        earned += WEIGHT_COLOR * Math.min(1, overlap.length / colorKeys.size);
        signals.push(`colour:${overlap.slice(0, 3).join("+")}`);
      }
    }

    if (featureTokens.size) {
      const overlap = row.tokens.filter((token) => featureTokens.has(token));
      if (overlap.length) {
        available += WEIGHT_FEATURE;
        earned += WEIGHT_FEATURE * Math.min(1, overlap.length / 2);
        signals.push(`feature:${overlap.slice(0, 3).join("+")}`);
      }
    }

    // The naming channel contributes ONCE. A model that repeats its guess as
    // both `rawName` and `possibleCatalogNames[0]` must not be counted twice —
    // that is one opinion, not two independent signals.
    if (anyNameHypothesis) {
      available += WEIGHT_NAME;
      if (hypothesis) {
        const rankWeight = Math.max(0.45, 1 - hypothesis.rank * 0.13);
        const nameShare = clamp01(hypothesis.strength * rankWeight);
        earned += WEIGHT_NAME * nameShare;
        if (hypothesis.source === "raw") {
          signals.push(hypothesis.exact ? "model-name-is-catalog-entry" : "model-name-loose-catalog-match");
        } else {
          signals.push(hypothesis.exact
            ? `model-candidate-rank-${hypothesis.rank + 1}`
            : `model-candidate-loose-rank-${hypothesis.rank + 1}`);
        }
      }
    }

    // Weak text similarity is allowed only as a tie-breaker, only when the
    // species already agrees, and only up to a hard cap. A plausible-sounding
    // invented name can therefore never carry a slot on its own.
    let weakNameBonus = 0;
    if (!modelNameIsCatalogEntry && normalizedModelName && speciesAgrees && speciesKeys.size) {
      const textual = similarity(normalizedModelName, row.normalizedName);
      if (textual >= 0.72) {
        weakNameBonus = Math.min(MAX_WEAK_NAME_SIMILARITY_BONUS, (textual - 0.72) * 0.25 + 0.02);
        signals.push("weak-name-similarity");
      }
    }

    if (visibleTextItem && visibleTextItem.ID === row.item.ID) {
      signals.push("visible-item-name-text");
    }
    if (!categoryAgrees && hypothesis) {
      signals.push("category-hint-overridden-by-name");
    }

    if (!available) continue;
    let score = earned / available + weakNameBonus;

    if (!speciesAgrees) {
      // Keep contradicting species reachable (the species read can be wrong) but
      // far below any acceptance threshold.
      score *= 0.35;
      signals.push("species-mismatch");
    }

    if (score <= 0) continue;
    scored.push(toCandidate(row, score, available / TOTAL_EVIDENCE_WEIGHT, signals));
  }

  return scored
    .sort((a, b) => b.score - a.score || a.itemName.localeCompare(b.itemName))
    .slice(0, limit);
}

/** How many independent evidence channels actually contributed to a candidate. */
export function evidenceChannelCount(candidate: NichCatalogCandidate) {
  const channels = new Set<string>();
  for (const signal of candidate.signals) {
    if (signal.startsWith("species:")) channels.add("species");
    else if (signal.startsWith("colour:")) channels.add("colour");
    else if (signal.startsWith("feature:")) channels.add("feature");
    else if (signal.startsWith("model-name") || signal.startsWith("model-candidate")) channels.add("name");
    else if (signal === "visible-item-name-text") channels.add("text");
  }
  return channels.size;
}

/** True when the model named this exact catalog entry without typo repair. */
export function strongNameChannelAgrees(candidate: NichCatalogCandidate | undefined) {
  if (!candidate) return false;
  return candidate.signals.includes("model-name-is-catalog-entry")
    || candidate.signals.includes("model-candidate-rank-1");
}

/**
 * True when a model hypothesis maps decisively to this REAL catalog entry,
 * including spacing/community/OCR repair. Loose agreement is enough to show a
 * tentative name, never enough by itself to auto-confirm one.
 */
export function nameChannelAgrees(candidate: NichCatalogCandidate | undefined) {
  if (!candidate) return false;
  return strongNameChannelAgrees(candidate)
    || candidate.signals.includes("model-name-loose-catalog-match")
    || candidate.signals.some((signal) => signal.startsWith("model-candidate-loose-rank-1"));
}

/**
 * Blend retrieval and (optional) catalog-image verification into a final
 * decision. Abstention is a first-class outcome: when nothing crosses the
 * acceptance bar the slot stays UNKNOWN / NEEDS_CONFIRMATION rather than being
 * assigned a plausible pet.
 */
export function decideSlotIdentity(args: {
  evidence: NichVisualEvidence;
  candidates: NichCatalogCandidate[];
  verification?: NichCatalogMatchVote | null;
}): NichSlotDecision {
  const candidates = args.candidates;
  const top = candidates[0];
  const runnerUp = candidates[1];
  const margin = top ? top.score - (runnerUp?.score ?? 0) : 0;
  const visualConfidence = clamp01(args.evidence.visualConfidence);

  if (!top) {
    return {
      status: "UNKNOWN",
      confidence: 0,
      topCandidates: [],
      reason: "no-catalog-candidate",
    };
  }

  // Legible in-game item-name text beats every inferred signal.
  const visibleTextItem = args.evidence.visibleText ? getItem(args.evidence.visibleText.trim()) : undefined;
  if (visibleTextItem) {
    const row = candidates.find((candidate) => candidate.itemId === visibleTextItem.ID);
    return {
      status: "ACCEPTED",
      itemId: visibleTextItem.ID,
      itemName: visibleTextItem.NAME,
      category: String(visibleTextItem.CATEGORY ?? "OTHER"),
      confidence: 0.97,
      topCandidates: row ? candidates : [toCandidate(
        { item: visibleTextItem, normalizedName: "", tokens: [], species: new Set(), colors: new Set() },
        0.97,
        1,
        ["visible-item-name-text"],
      ), ...candidates].slice(0, 6),
      reason: "exact-visible-item-name",
    };
  }

  const verification = args.verification;

  if (verification && verification.chosenItemId) {
    const chosen = candidates.find((candidate) => candidate.itemId === verification.chosenItemId);
    if (chosen) {
      // The verifier compared the screenshot crop against catalog artwork, so it
      // carries more weight than descriptive retrieval — but not all of it.
      const blended = clamp01(0.6 * clamp01(verification.confidence) + 0.4 * chosen.score);
      const ordered = [chosen, ...candidates.filter((candidate) => candidate.itemId !== chosen.itemId)];
      if (blended >= VISION_ACCEPT_THRESHOLD && clamp01(verification.confidence) >= 0.8) {
        return {
          status: "ACCEPTED",
          itemId: chosen.itemId,
          itemName: chosen.itemName,
          category: chosen.category,
          confidence: blended,
          topCandidates: ordered,
          reason: "catalog-image-match",
        };
      }
      // The verifier picked this artwork but not decisively. That is a TENTATIVE
      // identity, not a lost one — keep the name and ask the user.
      return {
        status: "NEEDS_CONFIRMATION",
        itemId: chosen.itemId,
        itemName: chosen.itemName,
        category: chosen.category,
        confidence: blended,
        topCandidates: ordered,
        reason: "catalog-image-match-below-threshold",
      };
    }
  }

  if (verification && verification.chosenItemId === null) {
    // The verifier explicitly said no candidate matches the artwork. Never
    // promote a primary identity here — but the ranked catalog list is still the
    // most useful thing we can offer the user.
    return {
      status: "UNKNOWN",
      confidence: Math.min(candidateConfidence(top), 0.5),
      topCandidates: discriminating(candidates) ? candidates : [],
      reason: "catalog-image-match-rejected-all",
    };
  }

  // No verification pass ran (disabled, out of budget, or artwork unavailable).
  const stronglyNamedByModel = strongNameChannelAgrees(top) && !top.signals.includes("species-mismatch");
  const namedByModel = nameChannelAgrees(top) && !top.signals.includes("species-mismatch");

  // ACCEPT: strict. Retrieval put this catalog entry on top by a clear margin,
  // the model's own naming channel produced that same entry, the read was
  // visually confident, and several independent channels contributed.
  if (
    candidateConfidence(top) >= VISION_ACCEPT_THRESHOLD
    && margin >= VISION_ACCEPT_MARGIN
    && visualConfidence >= 0.78
    && stronglyNamedByModel
    && evidenceChannelCount(top) >= MIN_ACCEPT_EVIDENCE_CHANNELS
  ) {
    return {
      status: "ACCEPTED",
      itemId: top.itemId,
      itemName: top.itemName,
      category: top.category,
      confidence: Math.min(candidateConfidence(top), 0.95),
      topCandidates: candidates,
      reason: "retrieval-and-name-channel-agreement",
    };
  }

  // TENTATIVE: failing to AUTO-CONFIRM is not failing to IDENTIFY. If the model
  // named a real catalog entry whose species matches the artwork, or retrieval
  // separated a clear leader, show that pet with a "needs confirmation" state
  // instead of throwing the identity away.
  if (
    (namedByModel && visualConfidence >= 0.28)
    || (top.score >= VISION_CONFIRM_THRESHOLD && margin >= VISION_CONFIRM_MARGIN)
  ) {
    return {
      status: "NEEDS_CONFIRMATION",
      itemId: top.itemId,
      itemName: top.itemName,
      category: top.category,
      confidence: candidateConfidence(top),
      topCandidates: candidates,
      reason: namedByModel
        ? "catalog-named-by-model-needs-confirmation"
        : "clear-retrieval-leader-needs-confirmation",
    };
  }

  // UNKNOWN, but still useful: keep the ranked catalog suggestions whenever they
  // actually discriminate. An undifferentiated block of same-scoring names is
  // noise, not evidence, so that case stays genuinely empty.
  const useful = discriminating(candidates);
  return {
    status: "UNKNOWN",
    confidence: candidateConfidence(top),
    topCandidates: useful ? candidates : [],
    reason: useful ? "ranked-suggestions-only" : "insufficient-visual-evidence",
  };
}

/**
 * Do these candidates actually distinguish anything?
 *
 * Species-only evidence ranks every cat in the catalog identically; listing the
 * first five alphabetically is noise dressed up as a suggestion. Require either
 * a real spread between first and last, or a naming signal on the leader.
 */
function discriminating(candidates: NichCatalogCandidate[]) {
  if (!candidates.length) return false;
  const top = candidates[0];
  if (top.score < VISION_SUGGEST_THRESHOLD) return false;
  if (nameChannelAgrees(top)) return true;
  const last = candidates[candidates.length - 1];
  return top.score - last.score >= 0.05;
}

/**
 * Session-local learning (§15): when the user corrects one slot, visually
 * near-identical slots in the SAME screenshot should treat that catalog item as
 * a stronger candidate. This never writes permanent training data — the caller
 * holds the map for the lifetime of the screenshot review only.
 */
export function applySessionCorrectionBoost(
  candidates: NichCatalogCandidate[],
  correctedItemIds: string[],
): NichCatalogCandidate[] {
  if (!correctedItemIds.length) return candidates;
  const corrected = new Set(correctedItemIds);
  return candidates
    .map((candidate) =>
      corrected.has(candidate.itemId)
        ? {
            ...candidate,
            score: clamp01(candidate.score + 0.15),
            signals: [...candidate.signals, "session-correction-of-duplicate-slot"],
          }
        : candidate,
    )
    .sort((a, b) => b.score - a.score || a.itemName.localeCompare(b.itemName));
}

/**
 * Two slots in one screenshot are treated as the same artwork when their visual
 * evidence agrees on species and dominant colours. Used only to propagate a
 * user correction — never to force adjacent slots to be different pets.
 */
export function evidenceLooksIdentical(first: NichVisualEvidence, second: NichVisualEvidence) {
  const firstSpecies = new Set(normalizeAnimalType(first.animalType));
  const secondSpecies = new Set(normalizeAnimalType(second.animalType));
  if (!firstSpecies.size || !secondSpecies.size) return false;
  const speciesOverlap = [...firstSpecies].some((key) => secondSpecies.has(key));
  if (!speciesOverlap) return false;

  const firstColors = new Set(normalizeColors(first.bodyColors));
  const secondColors = new Set(normalizeColors(second.bodyColors));
  if (!firstColors.size || !secondColors.size) return speciesOverlap;
  const shared = [...firstColors].filter((key) => secondColors.has(key)).length;
  return shared / Math.max(firstColors.size, secondColors.size) >= 0.5;
}

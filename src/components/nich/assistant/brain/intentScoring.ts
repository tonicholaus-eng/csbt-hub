import type { NichIntent } from "./types";
import type { NichMessageAnalysis } from "./messageAnalysis";
import { clamp } from "./language";

export type NichFeatureIntent =
  | "tradeComparison"
  | "nearbyValue"
  | "petLookup";

export type NichIntentCandidate = {
  intent: NichFeatureIntent;
  score: number;
  reasons: string[];
};

const MIN_ROUTE_SCORE = 50;

function hasAction(
  analysis: NichMessageAnalysis,
  action: "compare" | "lookup" | "nearby" | "trade" | "variant" | "advice",
): boolean {
  return analysis.actions.includes(action);
}

function scoreTradeComparison(
  analysis: NichMessageAnalysis,
): NichIntentCandidate | null {
  if (!analysis.tradeQuery) {
    return null;
  }

  let score = 92;
  const reasons = ["A complete two-sided trade was parsed."];

  if (analysis.hasTradeStructure) {
    score += 4;
    reasons.push("The wording contains explicit trade structure.");
  }

  if (analysis.pets.length >= 2) {
    score += 2;
    reasons.push("At least two database items were detected.");
  }

  score += Math.round(clamp(analysis.confidence, 0, 1) * 2);

  return {
    intent: "tradeComparison",
    score: clamp(score, 0, 100),
    reasons,
  };
}

function scoreNearbyValue(
  analysis: NichMessageAnalysis,
): NichIntentCandidate | null {
  if (
    analysis.nearbyTargetValue === null ||
    !hasAction(analysis, "nearby")
  ) {
    return null;
  }

  let score = 86;
  const reasons = ["A nearby-value request and numeric target were detected."];

  if (analysis.pets.length === 0) {
    score += 5;
    reasons.push("No named item competes with the nearby-search intent.");
  }

  if (analysis.isStandaloneNumber) {
    score -= 18;
    reasons.push("A bare number is weaker than an explicit nearby request.");
  }

  return {
    intent: "nearbyValue",
    score: clamp(score, 0, 100),
    reasons,
  };
}

function scorePetLookup(
  analysis: NichMessageAnalysis,
): NichIntentCandidate | null {
  const hasMatchedItem =
    analysis.pets.length > 0 ||
    analysis.itemResolution?.status === "matched";

  if (!hasMatchedItem || !hasAction(analysis, "lookup")) {
    return null;
  }

  let score = 62;
  const reasons = ["A database item and direct lookup wording were detected."];

  if (analysis.isDirectLookup) {
    score += 20;
    reasons.push("The message is a concise value lookup.");
  }

  if (hasAction(analysis, "variant")) {
    score += 6;
    reasons.push("A Normal, Neon, or Mega variant was requested.");
  }

  if (analysis.pets.length > 1) {
    score += 4;
    reasons.push("Several items were requested together.");
  }

  if (analysis.tradeQuery || analysis.hasTradeStructure) {
    score -= 40;
    reasons.push("Trade structure lowers lookup priority.");
  }

  if (hasAction(analysis, "nearby")) {
    score -= 30;
    reasons.push("Nearby-search wording lowers lookup priority.");
  }

  if (hasAction(analysis, "advice") && !analysis.isDirectLookup) {
    score -= 30;
    reasons.push("Advice wording indicates a broader question.");
  }

  score += Math.round(clamp(analysis.confidence, 0, 1) * 6);

  return {
    intent: "petLookup",
    score: clamp(score, 0, 100),
    reasons,
  };
}

export function scoreFeatureIntents(
  analysis: NichMessageAnalysis,
): NichIntentCandidate[] {
  return [
    scoreTradeComparison(analysis),
    scoreNearbyValue(analysis),
    scorePetLookup(analysis),
  ]
    .filter((candidate): candidate is NichIntentCandidate => candidate !== null)
    .filter((candidate) => candidate.score >= MIN_ROUTE_SCORE)
    .sort((a, b) => b.score - a.score);
}

export function getHighestScoringIntent(
  analysis: NichMessageAnalysis,
): NichIntent | null {
  return scoreFeatureIntents(analysis)[0]?.intent ?? null;
}

export default scoreFeatureIntents;

import type {
  NichIntent,
} from "./types";

import type {
  NichMessageAnalysis,
} from "./messageAnalysis";

export type NichFeatureIntent =
  | "tradeComparison"
  | "nearbyValue"
  | "petLookup";

export type NichIntentCandidate = {
  intent: NichFeatureIntent;
  score: number;
  reasons: string[];
};

function hasAction(
  analysis: NichMessageAnalysis,
  action:
    | "compare"
    | "lookup"
    | "nearby"
    | "trade"
    | "variant",
) {
  return analysis.actions.includes(action);
}

function scoreTradeComparison(
  analysis: NichMessageAnalysis,
): NichIntentCandidate | null {
  if (!analysis.tradeQuery) {
    return null;
  }

  let score = 90;
  const reasons = [
    "The message contains two valid trade sides.",
  ];

  if (hasAction(analysis, "compare")) {
    score += 5;
    reasons.push(
      "The message contains comparison language.",
    );
  }

  if (analysis.pets.length === 2) {
    score += 3;
    reasons.push(
      "Exactly two pets were detected.",
    );
  }

  if (hasAction(analysis, "lookup")) {
    score += 1;
  }

  return {
    intent: "tradeComparison",
    score: Math.min(score, 100),
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

  let score = 84;
  const reasons = [
    "A nearby-value request and target number were detected.",
  ];

  if (analysis.pets.length === 0) {
    score += 5;
  }

  if (analysis.numbers.length > 0) {
    score += 3;
  }

  return {
    intent: "nearbyValue",
    score: Math.min(score, 100),
    reasons,
  };
}

function scorePetLookup(
  analysis: NichMessageAnalysis,
): NichIntentCandidate | null {
  if (analysis.pets.length === 0) {
    return null;
  }

  let score = 48;
  const reasons = [
    `${analysis.pets.length} pet${
      analysis.pets.length === 1 ? "" : "s"
    } detected.`,
  ];

  if (hasAction(analysis, "lookup")) {
    score += 22;
    reasons.push(
      "The message contains value lookup language.",
    );
  }

  if (hasAction(analysis, "variant")) {
    score += 8;
    reasons.push(
      "A pet variant was detected.",
    );
  }

  if (analysis.pets.length > 1) {
    score += 5;
  }

  if (analysis.tradeQuery) {
    score -= 35;
    reasons.push(
      "Trade syntax lowers lookup priority.",
    );
  }

  if (hasAction(analysis, "nearby")) {
    score -= 25;
  }

  return {
    intent: "petLookup",
    score: Math.max(0, score),
    reasons,
  };
}

export function scoreFeatureIntents(
  analysis: NichMessageAnalysis,
): NichIntentCandidate[] {
  const candidates = [
    scoreTradeComparison(analysis),
    scoreNearbyValue(analysis),
    scorePetLookup(analysis),
  ].filter(
    (
      candidate,
    ): candidate is NichIntentCandidate =>
      candidate !== null,
  );

  return candidates.sort(
    (firstCandidate, secondCandidate) =>
      secondCandidate.score -
      firstCandidate.score,
  );
}

export function getHighestScoringIntent(
  analysis: NichMessageAnalysis,
): NichIntent | null {
  return (
    scoreFeatureIntents(analysis)[0]
      ?.intent ?? null
  );
}

export default scoreFeatureIntents;
/**
 * Screenshot intent selection.
 *
 * Uploading a screenshot never starts an analysis on its own: NICH asks what the
 * user wants first, and the chosen intent is preserved across recognition,
 * corrections and re-runs. A screenshot is not assumed to be a W/F/L question.
 */

import type { NichTradeSession } from "./tradeSession";

export type NichScreenshotIntent = "WFL" | "VALUES" | "IDENTIFY" | "DEMAND" | "GENERAL";

export function inferScreenshotIntent(message: string): NichScreenshotIntent {
  const normalized = message
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (
    /\bw\/?f\/?l\b/.test(normalized) ||
    /\b(win|fair|lose)\b/.test(normalized) ||
    /\b(analy[sz]e|calculate|check)\b.*\btrade\b/.test(normalized)
  ) {
    return "WFL";
  }

  if (/\b(how much|value|values|worth|price|prices)\b/.test(normalized)) {
    return "VALUES";
  }

  if (/\b(demand|popular|popularity|trend|trending)\b/.test(normalized)) {
    return "DEMAND";
  }

  if (
    /\b(identify|recognize|recognise|what pet|what pets|what item|what items|what are these|which pet|which pets)\b/.test(normalized)
  ) {
    return "IDENTIFY";
  }

  return "GENERAL";
}

export function uniqueNames(names: string[]) {
  return [...new Set(names.map((name) => name.trim()).filter(Boolean))];
}

/** Only CONFIRMED slots are eligible for a value/demand/WFL answer. */
export function tradeSessionNames(session: NichTradeSession | undefined) {
  if (!session) return [];
  return [...session.userSide, ...session.theirSide]
    .filter((slot) => slot.status === "CONFIRMED")
    .map((slot) => slot.canonicalName)
    .filter((name): name is string => Boolean(name));
}

/**
 * Re-issue the user's ORIGINAL goal after recognition or a correction. A
 * screenshot the user asked "How much are these?" about must stay a value
 * question even after they fix a slot.
 */
export function screenshotRouteMessage(
  intent: NichScreenshotIntent,
  question: string,
  names: string[],
) {
  const listed = uniqueNames(names);
  switch (intent) {
    case "WFL":
      return "W/F/L this trade";
    case "VALUES":
      return listed.length ? `How much are ${listed.join(", ")}?` : question;
    case "DEMAND":
      return listed.length ? `What is the demand for ${listed.join(", ")}?` : question;
    case "IDENTIFY":
    case "GENERAL":
    default:
      return question;
  }
}

/**
 * What NICH says about itself.
 *
 * The engine's provenance labels ("LOCAL MM2 ENGINE", "TRADE ENGINE") are
 * accurate *identifiers* — they record which part of CSBT produced an answer,
 * and the tests assert on them — but they were also being printed straight onto
 * the screen, which told a trader about our architecture instead of about their
 * trade. This module is the seam: identifiers stay in the response payload,
 * these words go on the chips.
 *
 * The mapping lives here rather than in either console because both MM2
 * surfaces render the same chips and had drifted into saying it differently.
 */

/** Chip text for each provenance label the MM2 engine can attach. */
export const MM2_SOURCE_DISPLAY: Readonly<Record<string, string>> = Object.freeze({
  "LOCAL MM2 ENGINE": "CSBT values",
  "MM2 CATALOG": "MM2 catalog",
  "SUPREME VALUES": "Supreme values",
  "GCASH DATABASE": "GCash values",
  "DEMAND DATA": "Demand data",
  "TRADE ENGINE": "Trade calculator",
  "NICH AI": "NICH AI",
  "MM2 CONTEXT": "This conversation",
});

/** Friendly chip text, falling back to the raw label if a new one appears. */
export function mm2SourceLabel(source: string): string {
  return MM2_SOURCE_DISPLAY[source] ?? source;
}

/**
 * The one-line status under NICH's name.
 *
 * It used to read "Local-first · Built around CSBT market data", which is a
 * description of how the assistant is built. A trader wants to know what it can
 * do for them.
 */
export const NICH_TAGLINE = "Values · Trades · Demand";
export const NICH_THINKING = "Checking CSBT values…";
export const NICH_READING_SCREENSHOT = "Reading your screenshot…";

/** What NICH is doing right now, in the MM2 console's status chip. */
export const MM2_ACTIVITY_LABELS = {
  ONLINE: "Ready",
  READY: "Ready",
  "QUERYING MM2 DATABASE": "Checking MM2 values…",
  "ANALYZING TRADE": "Checking your trade…",
  "SEARCHING CATALOG": "Searching weapons…",
} as const;

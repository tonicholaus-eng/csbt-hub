/**
 * MM2 rarity presentation.
 *
 * The catalog's 14 categories previously reached the UI as an ad-hoc rainbow of
 * Tailwind utilities (fuchsia / rose / amber / cyan / red) applied inconsistently
 * across five components. This is the single table those components read, and it
 * keeps MM2's rule: rarity is expressed as *restrained* light on a graphite
 * plate, not as a saturated card.
 *
 * `glow` is the display-case light under the weapon, `edge` the lit lower rail,
 * and `ink` the mark on the plate. All three are deliberately low-chroma; the
 * hierarchy comes from how much light a tier gets, not how loud its hue is.
 */
export type MM2RarityTone = {
  /** Display-case light beneath the weapon. */
  glow: string;
  /** Lit lower edge of the plate. */
  edge: string;
  /** Colour of the fallback mark. */
  ink: string;
  /** Border for chips and plates at this tier. */
  border: string;
  /** Chip background at this tier. */
  chip: string;
  /** Chip text. Every value here clears 4.5:1 on the MM2 panel scale. */
  chipInk: string;
  /**
   * Relative standing of the tier, 0-3. Drives how much presence a card gets
   * so a 1,000,000 Godly does not render identically to an 11-value Common.
   */
  rank: 0 | 1 | 2 | 3;
};

const NEUTRAL: MM2RarityTone = {
  glow: "rgba(148,163,184,.13)",
  edge: "rgba(148,163,184,.34)",
  ink: "#7c8493",
  border: "rgba(255,255,255,.08)",
  chip: "rgba(255,255,255,.04)",
  chipInk: "#a8aebb",
  rank: 0,
};

const TONES: Record<string, MM2RarityTone> = {
  GODLY: {
    glow: "rgba(226,52,74,.30)",
    edge: "rgba(238,66,87,.72)",
    ink: "#e79aa3",
    border: "rgba(226,52,74,.30)",
    chip: "rgba(226,52,74,.10)",
    chipInk: "#f0919b",
    rank: 3,
  },
  ANCIENT: {
    glow: "rgba(199,113,45,.26)",
    edge: "rgba(214,132,58,.66)",
    ink: "#dcab7d",
    border: "rgba(199,113,45,.28)",
    chip: "rgba(199,113,45,.10)",
    chipInk: "#deae83",
    rank: 3,
  },
  CHROMA: {
    glow: "rgba(168,85,190,.26)",
    edge: "rgba(186,104,206,.62)",
    ink: "#cba4da",
    border: "rgba(168,85,190,.26)",
    chip: "rgba(168,85,190,.10)",
    chipInk: "#c8a0d8",
    rank: 3,
  },
  LEGENDARY: {
    glow: "rgba(206,74,58,.22)",
    edge: "rgba(220,92,74,.56)",
    ink: "#dda093",
    border: "rgba(206,74,58,.22)",
    chip: "rgba(206,74,58,.09)",
    chipInk: "#dfa598",
    rank: 2,
  },
  VINTAGE: {
    glow: "rgba(180,140,70,.20)",
    edge: "rgba(196,158,86,.54)",
    ink: "#d5bd8d",
    border: "rgba(180,140,70,.21)",
    chip: "rgba(180,140,70,.09)",
    chipInk: "#d3bc90",
    rank: 2,
  },
  UNIQUE: {
    glow: "rgba(80,150,178,.22)",
    edge: "rgba(96,170,198,.56)",
    ink: "#9fc4d4",
    border: "rgba(80,150,178,.23)",
    chip: "rgba(80,150,178,.09)",
    chipInk: "#a3c6d5",
    rank: 2,
  },
  SET: {
    glow: "rgba(176,60,80,.19)",
    edge: "rgba(196,74,95,.50)",
    ink: "#cf98a2",
    border: "rgba(176,60,80,.20)",
    chip: "rgba(176,60,80,.08)",
    chipInk: "#d09aa4",
    rank: 2,
  },
  RARE: {
    glow: "rgba(96,124,178,.18)",
    edge: "rgba(114,144,198,.48)",
    ink: "#a8b8d6",
    border: "rgba(96,124,178,.19)",
    chip: "rgba(96,124,178,.08)",
    chipInk: "#adbcd8",
    rank: 1,
  },
  PET: {
    glow: "rgba(112,150,124,.17)",
    edge: "rgba(130,170,142,.44)",
    ink: "#a9c2b3",
    border: "rgba(112,150,124,.18)",
    chip: "rgba(112,150,124,.08)",
    chipInk: "#aec5b7",
    rank: 1,
  },
  UNCOMMON: { ...NEUTRAL, rank: 1 },
  COMMON: NEUTRAL,
  MISC: NEUTRAL,
  EVO: NEUTRAL,
  UNTRADABLE: {
    glow: "rgba(120,130,148,.08)",
    edge: "rgba(120,130,148,.22)",
    ink: "#6f7684",
    border: "rgba(255,255,255,.06)",
    chip: "rgba(255,255,255,.03)",
    chipInk: "#939aa8",
    rank: 0,
  },
};

export function mm2RarityTone(category?: string | null): MM2RarityTone {
  return TONES[(category ?? "").toUpperCase()] ?? NEUTRAL;
}

/**
 * The mark shown on a weapon plate when the catalog art cannot be fetched.
 * Initials of the first two significant words, else the first two letters.
 */
export function mm2WeaponMark(name: string): string {
  const words = name
    .replace(/[()]/g, " ")
    .split(/\s+/)
    .filter((word) => /[a-z0-9]/i.test(word));

  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  return (words[0] ?? name).slice(0, 2).toUpperCase();
}

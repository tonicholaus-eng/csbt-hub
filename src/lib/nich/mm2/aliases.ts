/**
 * MM2 trading shorthand.
 *
 * These are MM2 community abbreviations only. Nothing in this file may ever
 * name an Adopt Me pet: the file is imported exclusively by the MM2 resolver,
 * and an Adopt Me entry here would be a cross-game leak that no guard could
 * catch, because the resolver would still be resolving against the MM2 catalog
 * with an Adopt Me intent.
 *
 * Values are canonical MM2 catalog **names**, which the resolver then converts
 * to canonical IDs. Names are unique across all 1,099 weapons (see
 * tests/mm2Catalog.test.ts), so a name target is unambiguous — but a *slug* of
 * that name is not, which is why aliases resolve through the exact-name path
 * and never through the loose normalizer.
 */

export const MM2_CURATED_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  // Godly / Ancient shorthand
  bl: "Black Luger",
  blackluger: "Black Luger",
  db: "Darkbringer",
  dbringer: "Darkbringer",
  cdb: "Chroma Darkbringer",
  ds: "Deathshard",
  cds: "Chroma Deathshard",
  ib: "Icebreaker",
  icebreak: "Icebreaker",
  ip: "Icepiercer",
  icepierce: "Icepiercer",
  harv: "Harvester",
  harvestor: "Harvester",
  ew: "Elderwood",
  ewb: "Elderwood Blade",
  ews: "Elderwood Scythe",
  "ew scythe": "Elderwood Scythe",
  "ew blade": "Elderwood Blade",
  "ew revolver": "Elderwood Revolver",
  gb: "Gingerblade",
  cgb: "Chroma Gingerblade",
  bat: "Batwing",
  bw: "Batwing",

  // Chroma shorthand
  ceg: "Chroma Evergun",
  cegreen: "Chroma Evergreen",
  ces: "Chroma Ever Set",
  cluger: "Chroma Luger",
  cseer: "Chroma Seer",
  ctides: "Chroma Tides",
  clumi: "Chroma Luminous",

  // Common weapon shorthand
  tg: "Traveler's Gun",
  travelers: "Traveler's Gun",
  "travelers gun": "Traveler's Gun",
  "traveler gun": "Traveler's Gun",
  vg: "Vampire's Gun",
  "vampires gun": "Vampire's Gun",
  "vampire gun": "Vampire's Gun",
  eg: "Evergun",
  egreen: "Evergreen",
  ab: "Alienbeam",
  rg: "Raygun",
  hw: "Heart Wand",
  "heartwand": "Heart Wand",
  cs: "Candy Sword",
  sc: "Snowcannon",
});

/**
 * Tokens that describe *how a weapon is being talked about* rather than which
 * weapon it is. The resolver refuses to treat these as item names so a trade
 * like "harvester for 2 godlies" cannot fuzzy-match "godly" into a weapon.
 */
export const MM2_RESERVED_TOKENS: ReadonlySet<string> = new Set([
  "godly",
  "godlies",
  "ancient",
  "ancients",
  "chroma",
  "chromas",
  "vintage",
  "vintages",
  "legendary",
  "legendaries",
  "rare",
  "rares",
  "common",
  "commons",
  "uncommon",
  "uncommons",
  "unique",
  "set",
  "sets",
  "pet",
  "pets",
  "misc",
  "evo",
  "untradable",
  "untradeable",
  "knife",
  "knives",
  "gun",
  "guns",
  "weapon",
  "weapons",
  "item",
  "items",
  "value",
  "values",
  "demand",
  "supreme",
  "gcash",
  "wfl",
  "win",
  "fair",
  "lose",
  "trade",
  "trades",
]);

/** MM2 catalog categories, used by filter/search intents. */
export const MM2_CATEGORIES = [
  "GODLY",
  "ANCIENT",
  "CHROMA",
  "VINTAGE",
  "LEGENDARY",
  "UNIQUE",
  "RARE",
  "UNCOMMON",
  "COMMON",
  "SET",
  "PET",
  "MISC",
  "EVO",
  "UNTRADABLE",
] as const;

export type MM2Category = (typeof MM2_CATEGORIES)[number];

/**
 * Spoken forms of each category. "godlies" and "godly weapons" both mean the
 * GODLY category; nothing here maps to an Adopt Me rarity.
 */
export const MM2_CATEGORY_PHRASES: Readonly<Record<string, MM2Category>> = Object.freeze({
  godly: "GODLY",
  godlies: "GODLY",
  godlys: "GODLY",
  ancient: "ANCIENT",
  ancients: "ANCIENT",
  chroma: "CHROMA",
  chromas: "CHROMA",
  vintage: "VINTAGE",
  vintages: "VINTAGE",
  legendary: "LEGENDARY",
  legendaries: "LEGENDARY",
  legendarys: "LEGENDARY",
  unique: "UNIQUE",
  uniques: "UNIQUE",
  rare: "RARE",
  rares: "RARE",
  uncommon: "UNCOMMON",
  uncommons: "UNCOMMON",
  common: "COMMON",
  commons: "COMMON",
  set: "SET",
  sets: "SET",
  pet: "PET",
  pets: "PET",
  misc: "MISC",
  evo: "EVO",
  evos: "EVO",
  untradable: "UNTRADABLE",
  untradeable: "UNTRADABLE",
});

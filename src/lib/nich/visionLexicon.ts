/**
 * Catalog-derived visual lexicon for NICH screenshot recognition.
 *
 * The CSBT Adopt Me catalog stores names, categories, rarities and image URLs.
 * It does not store species/colour metadata, so retrieval derives those tags
 * from the catalog names themselves. Every tag therefore stays traceable to a
 * real catalog entry: nothing here invents an item, a value or a property the
 * catalog does not already contain.
 *
 * These tables are deliberately recall-oriented. Precision comes later, from the
 * catalog-image verification pass and the abstention thresholds in
 * visionRecognition.ts — never from string similarity.
 */

/** Vision `animalType` -> catalog name tokens that plausibly belong to it. */
export const SPECIES_TOKENS: Record<string, string[]> = {
  dragon: ["dragon", "drake", "wyvern", "hydra", "basilisk", "kaijunior", "dino", "dinosaur", "raptor", "rex", "kitsune", "griffin", "phoenix"],
  bat: ["bat", "vampire"],
  cat: ["cat", "kitty", "kitten", "siamese", "tabby", "persian", "sphynx", "abyssinian", "lynx", "caracal"],
  bigcat: ["lion", "tiger", "leopard", "panther", "cheetah", "jaguar", "cougar", "puma", "leo", "lynx"],
  dog: ["dog", "doggy", "puppy", "hound", "retriever", "spaniel", "corgi", "husky", "shepherd", "terrier", "chow", "sheepdog", "dalmatian", "pomeranian", "poodle", "beagle", "pug", "shiba", "collie", "dachshund", "chihuahua", "samoyed", "malamute", "bulldog", "greyhound", "boxer"],
  wolf: ["wolf", "fox", "coyote", "dingo", "jackal", "kitsune"],
  bear: ["bear", "cub", "panda", "koala"],
  horse: ["horse", "pony", "unicorn", "alicorn", "shetland", "mustang", "stallion", "mare", "foal", "pegasus", "zebra", "donkey", "mule"],
  unicorn: ["unicorn", "alicorn", "pegasus"],
  deer: ["deer", "reindeer", "moose", "elk", "fawn", "stag", "caribou"],
  bird: ["bird", "owl", "chick", "chicken", "duck", "ducky", "duckling", "penguin", "parrot", "macaw", "toucan", "crow", "raven", "eagle", "hawk", "falcon", "albatross", "flamingo", "peacock", "pheasant", "swan", "goose", "hummingbird", "kiwi", "condor", "robin", "cardinal", "turkey", "dodo", "puffin", "pelican", "stork", "seagull"],
  bug: ["butterfly", "moth", "bee", "ladybug", "beetle", "scarab", "spider", "scorpion", "ant", "snail", "caterpillar", "dragonfly", "firefly", "cricket", "grasshopper", "mantis", "wasp"],
  fish: ["fish", "shark", "mahi", "betta", "koi", "goldfish", "salmon", "clownfish", "swordfish", "puffer", "eel", "ray", "stingray"],
  sealife: ["whale", "dolphin", "octopus", "squid", "crab", "lobster", "jellyfish", "starfish", "seahorse", "turtle", "walrus", "seal", "otter", "narwhal", "hermit", "kelp", "kraken", "axolotl", "manatee"],
  reptile: ["snake", "lizard", "gecko", "chameleon", "iguana", "crocodile", "alligator", "turtle", "tortoise", "cobra", "python", "viper", "glyptodon"],
  amphibian: ["frog", "toad", "axolotl", "newt", "salamander", "tadpole"],
  rodent: ["mouse", "rat", "hamster", "guinea", "squirrel", "chipmunk", "beaver", "capybara", "gerbil", "hedgehog", "porcupine"],
  rabbit: ["rabbit", "bunny", "hare", "choccybunny", "cabbit", "jackalope"],
  monkey: ["monkey", "gorilla", "capuchin", "gibbon", "chimp", "chimpanzee", "orangutan", "lemur", "baboon", "marmoset", "mandrill"],
  farm: ["cow", "calf", "bull", "ox", "angus", "pig", "piglet", "hog", "boar", "sheep", "lamb", "ram", "goat", "buffalo", "bison", "llama", "alpaca", "chicken", "rooster", "hen"],
  elephant: ["elephant", "mammoth", "rhino", "hippo", "giraffe", "camel"],
  marsupial: ["kangaroo", "wallaby", "koala", "opossum", "possum", "wombat", "quokka", "platypus", "echidna"],
  undead: ["skeleton", "skele", "zombie", "mummy", "ghost", "undead", "phantom", "wraith", "spooky", "reaper", "bone"],
  mythical: ["griffin", "phoenix", "kitsune", "yeti", "troll", "mistletroll", "fairy", "sprite", "golem", "gargoyle", "cerberus", "chimera", "sphinx", "minotaur", "kraken", "hydra", "basilisk", "alicorn"],
  object: ["cake", "cube", "rock", "tree", "gingerbread", "scarecrow", "balloon", "eggy", "friend", "snowman", "candy"],
};

/** Vision `bodyColors` -> catalog name tokens that imply that colour. */
export const COLOR_TOKENS: Record<string, string[]> = {
  black: ["black", "shadow", "midnight", "dark", "obsidian", "onyx", "raven", "void", "eclipse", "coal", "soot", "noir"],
  white: ["white", "albino", "snow", "arctic", "frost", "ice", "icy", "ghost", "pearl", "ivory", "polar", "winter", "blizzard", "cloud"],
  gray: ["gray", "grey", "silver", "steel", "stone", "granite", "ash", "smoke", "skeleton", "bone", "rock", "concrete"],
  red: ["red", "crimson", "scarlet", "ruby", "blood", "fire", "flame", "lava", "cherry", "strawberry", "cardinal", "valentine", "cupid", "devil", "evil"],
  orange: ["orange", "amber", "pumpkin", "autumn", "sunset", "tangerine", "carrot", "fox", "tiger", "marigold"],
  yellow: ["yellow", "gold", "golden", "sun", "sunny", "honey", "banana", "lemon", "canary", "cheese", "corn"],
  green: ["green", "emerald", "jade", "forest", "jungle", "leaf", "kelp", "lime", "mint", "moss", "zombie", "slime", "toxic", "cactus"],
  blue: ["blue", "sapphire", "ocean", "sea", "aqua", "cyan", "sky", "water", "frost", "ice", "icy", "arctic", "glacier", "lagoon", "navy"],
  purple: ["purple", "violet", "lavender", "amethyst", "grape", "plum", "shadow", "mystic", "cosmic", "galaxy", "nebula", "lunar"],
  pink: ["pink", "rose", "blossom", "cherry", "candy", "bubblegum", "flamingo", "strawberry", "peppermint", "sakura", "valentine", "cupid"],
  brown: ["brown", "chocolate", "choccy", "coffee", "cocoa", "mocha", "wood", "oakee", "tan", "caramel", "bronze", "chestnut", "walnut", "mud"],
  rainbow: ["rainbow", "prism", "prismatic", "uplift", "iridescent", "opal", "aurora", "kaleido"],
};

/** Vision `features` phrases -> catalog name tokens they support. */
export const FEATURE_TOKENS: Array<{ match: RegExp; tokens: string[] }> = [
  { match: /skelet|bone|rib\s?cage|undead|skull/i, tokens: ["skeleton", "skele", "undead", "mummy", "bone", "skull", "zombie", "ghost"] },
  { match: /\bwing/i, tokens: ["dragon", "bat", "butterfly", "bird", "griffin", "fairy", "moth", "bee", "phoenix", "owl", "angel", "pegasus", "alicorn"] },
  { match: /horn|antler/i, tokens: ["dragon", "unicorn", "alicorn", "ox", "goat", "bull", "deer", "reindeer", "moose", "demon", "devil", "ram", "rhino", "elk"] },
  { match: /crown|royal|regal|throne/i, tokens: ["king", "queen", "royal", "crown", "prince", "princess", "emperor", "monarch"] },
  { match: /fluff|floof|fuzzy|puffy/i, tokens: ["chow", "pomeranian", "samoyed", "sheep", "alpaca", "llama", "bunny", "rabbit", "owl", "cloud"] },
  { match: /shell|carapace/i, tokens: ["turtle", "tortoise", "crab", "snail", "hermit", "beetle", "scarab", "glyptodon", "armadillo"] },
  { match: /tentacle|suction/i, tokens: ["octopus", "squid", "kraken", "jellyfish"] },
  { match: /\bfin\b|flipper/i, tokens: ["fish", "shark", "whale", "dolphin", "seal", "walrus", "penguin", "mahi", "betta", "koi", "narwhal"] },
  { match: /beak|feather/i, tokens: ["bird", "owl", "duck", "chick", "parrot", "crow", "eagle", "penguin", "phoenix", "griffin", "toucan"] },
  { match: /mane/i, tokens: ["lion", "leo", "horse", "pony", "unicorn", "alicorn", "griffin"] },
  { match: /trunk|tusk/i, tokens: ["elephant", "mammoth", "walrus", "boar", "warthog"] },
  { match: /stripe/i, tokens: ["tiger", "zebra", "bee", "skunk", "raccoon", "badger", "chipmunk"] },
  { match: /spot|speckl/i, tokens: ["dalmatian", "leopard", "cheetah", "cow", "ladybug", "giraffe", "fawn", "deer"] },
  { match: /long\s?ear|floppy\s?ear/i, tokens: ["rabbit", "bunny", "hare", "cabbit", "spaniel", "beagle", "elephant", "donkey"] },
  { match: /halo|angel/i, tokens: ["angel", "alicorn", "ghost", "cherub"] },
  { match: /flame|fire|burning|ember/i, tokens: ["fire", "flame", "phoenix", "lava", "ember", "inferno", "dragon"] },
  { match: /candy|sweet|dessert|frosting|icing/i, tokens: ["candy", "cake", "gingerbread", "peppermint", "chocolate", "strawberry", "cupcake", "donut", "sugar", "cookie"] },
  { match: /star|cosmic|galax|space|nebula/i, tokens: ["cosmic", "galaxy", "star", "lunar", "moon", "space", "nebula", "astro", "celestial"] },
  { match: /pumpkin|spooky|halloween/i, tokens: ["halloween", "pumpkin", "spooky", "ghost", "zombie", "mummy", "skeleton", "witch", "bat"] },
  { match: /santa|christmas|holiday|festive|\belf\b/i, tokens: ["christmas", "santa", "reindeer", "gingerbread", "elf", "holiday", "snow", "winter", "mistletroll"] },
  { match: /\begg/i, tokens: ["egg", "eggy", "chick", "duckling"] },
  { match: /robot|mecha|cyber|metal/i, tokens: ["robot", "mecha", "cyber", "steel", "chrome", "metal"] },
];

const speciesByToken = new Map<string, string[]>();
for (const [species, tokens] of Object.entries(SPECIES_TOKENS)) {
  for (const token of tokens) {
    speciesByToken.set(token, [...(speciesByToken.get(token) ?? []), species]);
  }
}

const colorByToken = new Map<string, string[]>();
for (const [color, tokens] of Object.entries(COLOR_TOKENS)) {
  for (const token of tokens) {
    colorByToken.set(token, [...(colorByToken.get(token) ?? []), color]);
  }
}

/** Species keys implied by one catalog-name token, e.g. "unicorn" -> horse + unicorn. */
export function speciesForToken(token: string) {
  return speciesByToken.get(token) ?? [];
}

/** Colour keys implied by one catalog-name token, e.g. "frost" -> white + blue. */
export function colorsForToken(token: string) {
  return colorByToken.get(token) ?? [];
}

/** Normalize a free-text vision animalType onto the species keys it can mean. */
export function normalizeAnimalType(value: string | undefined) {
  const text = (value ?? "").toLowerCase().replace(/[^a-z\s]/g, " ").trim();
  if (!text) return [];
  const keys = new Set<string>();
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (Object.prototype.hasOwnProperty.call(SPECIES_TOKENS, word)) keys.add(word);
    for (const species of speciesForToken(word)) keys.add(species);
  }
  return [...keys];
}

/** Normalize free-text colour words onto the canonical colour keys. */
export function normalizeColors(values: string[]) {
  const keys = new Set<string>();
  for (const raw of values) {
    for (const word of String(raw).toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean)) {
      if (Object.prototype.hasOwnProperty.call(COLOR_TOKENS, word)) keys.add(word);
      for (const color of colorsForToken(word)) keys.add(color);
    }
  }
  return [...keys];
}

/** Catalog-name tokens supported by the model's free-text feature phrases. */
export function tokensForFeatures(features: string[]) {
  const haystack = features.join(" | ");
  const tokens = new Set<string>();
  for (const rule of FEATURE_TOKENS) {
    if (!rule.match.test(haystack)) continue;
    for (const token of rule.tokens) tokens.add(token);
  }
  return [...tokens];
}

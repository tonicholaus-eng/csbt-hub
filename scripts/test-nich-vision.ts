import routeNichMessage from "../src/components/nich/assistant/brain/router";
import { initialNichContext } from "../src/components/nich/assistant/memory/context";
import {
  buildVisionLocalPrompt,
  verifyVisionItem,
} from "../src/lib/nich/vision";

function expect(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

const verifiedTrade = [
  verifyVisionItem({
    rawName: "Frost Dragon",
    side: "YOU",
    variant: "NORMAL",
    potion: "FR",
    quantity: 1,
    confidence: 0.99,
  }),
  verifyVisionItem({
    rawName: "Owl",
    side: "THEM",
    variant: "NORMAL",
    potion: "FR",
    quantity: 1,
    confidence: 0.99,
  }),
  verifyVisionItem({
    rawName: "Turtle",
    side: "THEM",
    variant: "NEON",
    potion: "R",
    quantity: 2,
    confidence: 0.97,
  }),
];

expect(verifiedTrade.every((item) => item.verified), "Known screenshot items should verify against the CSBT database.");

const prompt = buildVisionLocalPrompt("TRADE", verifiedTrade);
expect(prompt === "WFL me FR Frost Dragon them FR Owl + 2x NR Turtle", `Unexpected screenshot trade prompt: ${prompt}`);

const response = routeNichMessage({
  message: prompt ?? "",
  context: initialNichContext,
});
expect(response.intent === "tradeComparison", "Screenshot-generated trade should route through the local W/F/L engine.");
expect(Boolean(response.tradeComparison), "Screenshot-generated trade should produce a structured trade comparison.");
expect(!/Potion warning|Source:|Trade shape:|counteroffer|overpay by|gain about/i.test(response.text), "Plain W/F/L should stay concise unless the user asks for advice/details.");
expect(/Your Offer/.test(response.text) && /Their Offer/.test(response.text), "Concise W/F/L should still show both trade sides.");

const typo = verifyVisionItem({
  rawName: "Frost Dragn",
  side: "NONE",
  variant: "NORMAL",
  potion: "UNKNOWN",
  quantity: 1,
  confidence: 0.95,
});
expect(typo.verified && typo.itemName === "Frost Dragon", "Small Gemini naming typos should be corrected by the CSBT database matcher.");


const genericPanda = verifyVisionItem({
  rawName: "Panda",
  side: "THEM",
  variant: "MEGA",
  potion: "FR",
  quantity: 1,
  confidence: 0.99,
});
expect(!genericPanda.verified, "Icon-only generic Panda recognition must not silently become authoritative when Giant Panda is a valid distinct pet.");
expect(genericPanda.alternatives.includes("Giant Panda"), "Panda ambiguity should surface Giant Panda as a correction candidate.");

const giantPanda = verifyVisionItem({
  rawName: "Giant Panda",
  side: "THEM",
  variant: "MEGA",
  potion: "FR",
  quantity: 1,
  confidence: 0.95,
});
expect(giantPanda.verified && giantPanda.itemName === "Giant Panda", "Full Giant Panda recognition should verify normally.");

const hallucination = verifyVisionItem({
  rawName: "Totally Fake Pet",
  side: "NONE",
  variant: "NORMAL",
  potion: "UNKNOWN",
  quantity: 1,
  confidence: 0.99,
});
expect(!hallucination.verified, "Unknown AI item names must not become authoritative CSBT items.");

const noPotionNeon = [
  verifyVisionItem({
    rawName: "Turtle",
    side: "YOU",
    variant: "NEON",
    potion: "NONE",
    quantity: 1,
    confidence: 0.99,
  }),
  verifyVisionItem({
    rawName: "Owl",
    side: "THEM",
    variant: "NORMAL",
    potion: "FR",
    quantity: 1,
    confidence: 0.99,
  }),
];
const noPotionPrompt = buildVisionLocalPrompt("TRADE", noPotionNeon) ?? "";
const noPotionResponse = routeNichMessage({ message: noPotionPrompt, context: initialNichContext });
expect(noPotionResponse.tradeComparison?.offered.variant === "neon", "Explicit no-potion Neon recognition must preserve the Neon variant.");

console.log("NICH Gemini Vision local verification tests passed.");

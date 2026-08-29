import fs from "node:fs";

const EXPECTED_VERSION = "vision-v34-smart-catalog-recognition-20260829";
const EXPECTED_MODEL = "gemini-3.6-flash";
const route = fs.readFileSync("src/app/api/nich/vision/route.ts", "utf8");
const wrangler = fs.readFileSync("wrangler.jsonc", "utf8");
const client = fs.readFileSync("src/components/nich/assistant/NichChat.tsx", "utf8");

const failures = [];
if (!route.includes(EXPECTED_VERSION)) failures.push(`route.ts is not ${EXPECTED_VERSION}`);
if (!route.includes("gemini-inline-data")) failures.push("route.ts is not advertising the Gemini inline-data transport");
if (!route.includes("request.arrayBuffer()") || !route.includes('toString("base64")')) failures.push("route.ts is missing the bounded inline-image conversion path");
if (route.includes("generativelanguage.googleapis.com/upload/v1beta/files")) failures.push("route.ts still calls the Gemini Files upload endpoint");
if (route.includes("X-Goog-Upload-Protocol") || route.includes('duplex: "half"')) failures.push("route.ts still contains the old Gemini Files streaming transport");
if (route.includes("temperature: 0.1")) failures.push("route.ts still sends the deprecated Gemini temperature parameter");
if (!client.includes(EXPECTED_VERSION)) failures.push(`NichChat.tsx is not sending the ${EXPECTED_VERSION} client marker`);
if (!wrangler.includes(`\"NICH_GEMINI_VISION_MODEL\": \"${EXPECTED_MODEL}\"`)) failures.push(`wrangler.jsonc does not pin ${EXPECTED_MODEL}`);
if (!wrangler.includes('"NICH_GEMINI_VISION_THINKING_LEVEL": "minimal"')) failures.push("wrangler.jsonc does not pin minimal thinking");
if (!wrangler.includes('"NICH_GEMINI_VISION_MAX_TOKENS": "4096"')) failures.push("wrangler.jsonc does not pin the 4096-token compact-output budget");
if (!wrangler.includes('"NICH_GEMINI_VISION_MAX_IMAGE_BYTES": "2097152"')) failures.push("wrangler.jsonc does not pin the 2 MB browser-prepared image ceiling");
if (!wrangler.includes('"name": "csbt-price-checker"')) failures.push('wrangler worker name is not csbt-price-checker');
if (!wrangler.includes('"pattern": "csbthub.com"')) failures.push('wrangler custom domain is not csbthub.com');


if (!route.includes('generativelanguage.googleapis.com/v1beta/interactions')) failures.push("route.ts is not using the Gemini Interactions API");
if (!route.includes('getCloudflareContext') || !route.includes('CLOUDFLARE_VISION_MODEL') || !route.includes('performCloudflareVisionFallback')) failures.push("route.ts is missing the Cloudflare Workers AI regional fallback");
if (!wrangler.includes('"ai"') || !wrangler.includes('"binding": "AI"')) failures.push("wrangler.jsonc is missing the Workers AI binding");
if (!route.includes('type: "image"') || !route.includes('data: inlineImageBase64') || !route.includes('mime_type: mimeType')) failures.push("route.ts is missing Interactions inline image-data input");
if (!route.includes('baseline-model-text-inline-image')) failures.push("route.ts is missing the inline-image Interactions request-mode marker");
if (route.includes('requestBody.response_format')) failures.push("route.ts still enables the optional Interactions response_format path");
if (route.includes(':generateContent')) failures.push("route.ts still contains legacy generateContent calls");
if (!route.includes('confusion-family-targeted-audit-v2')) failures.push("route.ts is missing v27 targeted visual disambiguation marker");
if (!route.includes('Bush Elephant') || !route.includes('Sugar Axolotl')) failures.push("route.ts is missing v27 confusion-family rescue candidates");

// v33 — slot cropping + catalog-constrained recognition.
const recognition = fs.readFileSync("src/lib/nich/visionRecognition.ts", "utf8");
const slots = fs.readFileSync("src/lib/nich/visionSlots.ts", "utf8");
const sheet = fs.readFileSync("src/components/nich/assistant/visionSlotSheet.ts", "utf8");

if (!route.includes('visionStage === "slots"')) failures.push("route.ts is missing the v33 slot-crop recognition stage");
if (!route.includes("decodeSlotManifest")) failures.push("route.ts is not decoding the slot-crop manifest");
if (!route.includes("verifyVisionItemFromEvidence")) failures.push("route.ts is not resolving slot identities through the catalog-constrained resolver");
if (!route.includes("buildCatalogMatchPrompt") || !route.includes("fetchCatalogImage")) failures.push("route.ts is missing the catalog-image verification pass");
if (!route.includes("performCloudflareStructuredCall")) failures.push("route.ts is missing the Workers AI fallback for the slot-evidence pass");
if (!recognition.includes("MAX_WEAK_NAME_SIMILARITY_BONUS")) failures.push("visionRecognition.ts is missing the text-similarity cap");
if (!recognition.includes("VISION_ACCEPT_THRESHOLD") || !recognition.includes("VISION_CONFIRM_THRESHOLD")) failures.push("visionRecognition.ts is missing the abstention thresholds");
if (!slots.includes("planSlotSheet")) failures.push("visionSlots.ts is missing the slot-crop sheet planner");
if (!sheet.includes("buildSlotCropSheet")) failures.push("visionSlotSheet.ts is missing the browser crop-sheet builder");
if (!client.includes("buildSlotCropSheet") || !client.includes('stage: "slots"')) failures.push("NichChat.tsx is not running the v33 slot-crop pass");
if (fs.readFileSync("src/lib/nich/vision.ts", "utf8").includes("databaseConfidence >= 0.82")) failures.push("vision.ts still accepts identities on fuzzy string similarity alone");

// v33.1 — one canonical provider schema + tentative candidates.
const providerSchema = fs.readFileSync("src/lib/nich/visionProviderSchema.ts", "utf8");
const pipeline = fs.readFileSync("src/lib/nich/visionSlotPipeline.ts", "utf8");
const card = fs.readFileSync("src/components/nich/assistant/NichTradeReviewCard.tsx", "utf8");
const tradeSession = fs.readFileSync("src/lib/nich/tradeSession.ts", "utf8");

if (!route.includes("normalizeProviderSlotEvidence")) failures.push("route.ts is not normalizing provider payloads into one canonical schema");
if (!route.includes("runSlotRecognitionPipeline")) failures.push("route.ts is not using the shared slot-recognition pipeline");
if (!providerSchema.includes("toConfidence") || !providerSchema.includes("toTriState")) failures.push("visionProviderSchema.ts is missing the confidence/badge normalizers");
if (!pipeline.includes("SlotDiagnostic")) failures.push("visionSlotPipeline.ts is missing per-slot development diagnostics");
if (!recognition.includes("catalog-named-by-model-needs-confirmation")) failures.push("visionRecognition.ts no longer produces tentative catalog candidates");
if (!recognition.includes("earned / available")) failures.push("visionRecognition.ts is back to an uncalibrated additive score");
if (!tradeSession.includes("describeRecognitionCounts")) failures.push("tradeSession.ts is missing the canonical recognition counts");
if (!card.includes("describeRecognitionCounts")) failures.push("NichTradeReviewCard.tsx is not deriving its counts from the canonical source");
if (card.includes('>No items detected.</div>')) failures.push("NichTradeReviewCard.tsx still hard-codes a per-column 'No items detected'");

if (failures.length) {
  console.error("\n❌ NICH deployment source verification FAILED:");
  for (const failure of failures) console.error(` - ${failure}`);
  console.error("\nDo not deploy until these checks pass.\n");
  process.exit(1);
}

console.log(`✅ NICH source verified: ${EXPECTED_VERSION}`);
console.log(`✅ Vision model pinned: ${EXPECTED_MODEL}`);
console.log("✅ Primary path: browser compression -> bounded inline image -> Gemini Interactions -> compact JSON");
console.log("✅ Regional fallback: Gemini location rejection -> Cloudflare Workers AI vision -> compact JSON");
console.log("✅ Recognition: slot detection -> enlarged crops -> visual evidence -> catalog candidates -> catalog-image verification -> abstention");
console.log("✅ Worker target: csbt-price-checker -> csbthub.com");

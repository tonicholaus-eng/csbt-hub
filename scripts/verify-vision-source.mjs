import fs from "node:fs";

const EXPECTED_VERSION = "vision-v29-cloudflare-inline-data-20260818";
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
if (!route.includes('type: "image"') || !route.includes('data: inlineImageBase64') || !route.includes('mime_type: mimeType')) failures.push("route.ts is missing Interactions inline image-data input");
if (!route.includes('baseline-model-text-inline-image')) failures.push("route.ts is missing the inline-image Interactions request-mode marker");
if (route.includes('requestBody.response_format')) failures.push("route.ts still enables the optional Interactions response_format path");
if (route.includes(':generateContent')) failures.push("route.ts still contains legacy generateContent calls");
if (!route.includes('confusion-family-targeted-audit-v2')) failures.push("route.ts is missing v27 targeted visual disambiguation marker");
if (!route.includes('Bush Elephant') || !route.includes('Sugar Axolotl')) failures.push("route.ts is missing v27 confusion-family rescue candidates");
if (failures.length) {
  console.error("\n❌ NICH deployment source verification FAILED:");
  for (const failure of failures) console.error(` - ${failure}`);
  console.error("\nDo not deploy until these checks pass.\n");
  process.exit(1);
}

console.log(`✅ NICH source verified: ${EXPECTED_VERSION}`);
console.log(`✅ Vision model pinned: ${EXPECTED_MODEL}`);
console.log("✅ Free-plan path: browser compression -> bounded inline image -> Gemini Interactions -> compact JSON");
console.log("✅ Stability path: Interactions baseline model + text + inline image data; optional config disabled");
console.log("✅ Worker target: csbt-price-checker -> csbthub.com");

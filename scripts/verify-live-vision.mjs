const EXPECTED_VERSION = "vision-v34-smart-catalog-recognition-20260829";
const EXPECTED_MODEL = "gemini-3.6-flash";
const EXPECTED_RELEASE = "csbt-nich-vision-v34-smart-catalog-recognition";
const url = `https://csbthub.com/api/nich/vision?deployCheck=${Date.now()}`;

console.log(`\nChecking live NICH release at ${url} ...`);

try {
  const response = await fetch(url, { headers: { "Cache-Control": "no-cache, no-store, max-age=0", Pragma: "no-cache" }, cache: "no-store" });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = null; }
  if (!response.ok || !data) {
    console.error(`❌ Live check failed: HTTP ${response.status}`);
    console.error(text.slice(0, 800));
    process.exit(1);
  }
  console.log("Live /api/nich/vision:", JSON.stringify(data, null, 2));
  const problems = [];
  if (data.recognitionVersion !== EXPECTED_VERSION) problems.push(`recognitionVersion is ${data.recognitionVersion ?? "missing"}, expected ${EXPECTED_VERSION}`);
  if (data.model !== EXPECTED_MODEL) problems.push(`model is ${data.model ?? "missing"}, expected ${EXPECTED_MODEL}`);
  if (data.release !== EXPECTED_RELEASE) problems.push(`release is ${data.release ?? "missing"}, expected ${EXPECTED_RELEASE}`);
  if (data.transport !== "gemini-interactions+cloudflare-workers-ai-vision-fallback") problems.push(`transport is ${data.transport ?? "missing"}, expected gemini-interactions+cloudflare-workers-ai-vision-fallback`);
  if (data.freePlanOptimized !== true) problems.push("freePlanOptimized is not true");
  if (data.thinkingLevel !== "minimal") problems.push(`thinkingLevel is ${data.thinkingLevel ?? "missing"}, expected minimal`);
  if (problems.length) {
    console.error("\n❌ DEPLOYMENT MISMATCH: csbthub.com is still serving an older/different Worker.");
    for (const problem of problems) console.error(` - ${problem}`);
    console.error("\nWait 30-60 seconds and run npm.cmd run verify:vision-live again. If it still fails, inspect Wrangler deployments.");
    process.exit(1);
  }
  console.log(`\n✅ LIVE VERIFIED: ${EXPECTED_RELEASE}`);
  console.log("✅ csbthub.com is serving the Free-plan optimized NICH vision Worker.");
} catch (error) {
  console.error("❌ Could not verify the live NICH endpoint:", error instanceof Error ? error.message : error);
  process.exit(1);
}

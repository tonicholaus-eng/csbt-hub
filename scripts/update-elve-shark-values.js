const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");

const {
  ELVE_URL,
  createSnapshotFromHtml,
  createSnapshotFromItems,
  mergeSnapshotItems,
  rawItemToSnapshotItem,
  readJsonIfPresent,
  validateSnapshot,
  writeSnapshot,
} = require("./lib/elve-shark");

const projectRoot = process.cwd();

const snapshotPath = path.join(projectRoot, "source-data", "elve-shark-values.json");
const backupPath = path.join(projectRoot, "source-data", "elve-shark-values.backup.json");
const diagnosticsPath = path.join(projectRoot, "source-data", "elve-fetch-diagnostics.json");

const EXTRA_CATEGORY_TABS = [
  { label: "Vehicles", category: "VEHICLE" },
  { label: "Food", category: "FOOD" },
  { label: "Gifts", category: "GIFT" },
  { label: "Strollers", category: "STROLLER" },
  { label: "Stickers", category: "STICKER" },
  { label: "Other", category: "OTHER", optional: true },
];


function objectLooksLikeItem(value, fallbackCategory = null) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const converted = rawItemToSnapshotItem(value, fallbackCategory);
  return Boolean(
    converted &&
      (converted.normal !== null || converted.neon !== null || converted.mega !== null),
  );
}

function collectItemObjects(value, fallbackCategory, output, seen = new WeakSet(), depth = 0) {
  if (value === null || value === undefined || depth > 18) return;

  if (typeof value === "string") {
    const text = value.trim();
    if (!text || text.length > 8_000_000) return;

    const tryParse = (candidate) => {
      try {
        const parsed = JSON.parse(candidate);
        collectItemObjects(parsed, fallbackCategory, output, seen, depth + 1);
        return true;
      } catch {
        return false;
      }
    };

    if ((text.startsWith("{") && text.endsWith("}")) || (text.startsWith("[") && text.endsWith("]"))) {
      if (tryParse(text)) return;
    }

    // Next.js RSC payloads commonly contain one JSON value per `id:<json>` line.
    for (const line of text.split(/\r?\n/)) {
      const colon = line.indexOf(":");
      if (colon < 0) continue;
      const tail = line.slice(colon + 1).trim();
      if (
        (tail.startsWith("{") && tail.endsWith("}")) ||
        (tail.startsWith("[") && tail.endsWith("]")) ||
        (tail.startsWith('"') && tail.endsWith('"'))
      ) {
        tryParse(tail);
      }
    }
    return;
  }

  if (typeof value !== "object") return;
  if (seen.has(value)) return;
  seen.add(value);

  if (objectLooksLikeItem(value, fallbackCategory)) {
    const converted = rawItemToSnapshotItem(value, fallbackCategory);
    if (converted) output.push(converted);
  }

  if (Array.isArray(value)) {
    for (const child of value) {
      collectItemObjects(child, fallbackCategory, output, seen, depth + 1);
    }
    return;
  }

  for (const child of Object.values(value)) {
    collectItemObjects(child, fallbackCategory, output, seen, depth + 1);
  }
}

function findPushCallEnd(html, startIndex) {
  let inString = false;
  let escaped = false;
  let squareDepth = 0;
  let curlyDepth = 0;

  for (let index = startIndex; index < html.length; index += 1) {
    const character = html[index];

    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }

    if (character === '"') {
      inString = true;
      continue;
    }

    if (character === "[") squareDepth += 1;
    if (character === "]") squareDepth -= 1;
    if (character === "{") curlyDepth += 1;
    if (character === "}") curlyDepth -= 1;

    if (character === ")" && squareDepth === 0 && curlyDepth === 0) return index;
  }

  return -1;
}

function collectFromNextFlightHtml(html, fallbackCategory = null) {
  const found = [];
  const marker = "self.__next_f.push(";
  let cursor = 0;

  while (cursor < html.length) {
    const callStart = html.indexOf(marker, cursor);
    if (callStart === -1) break;

    const argumentStart = callStart + marker.length;
    const callEnd = findPushCallEnd(html, argumentStart);
    if (callEnd === -1) break;

    const argumentText = html.slice(argumentStart, callEnd).trim();
    cursor = callEnd + 1;

    try {
      const parsedArguments = JSON.parse(argumentText);
      collectItemObjects(parsedArguments, fallbackCategory, found);
    } catch {
      // Ignore unrelated chunks.
    }
  }

  return found;
}

async function collectBrowserState(page, fallbackCategory, output) {
  const payloads = await page.evaluate(() => {
    const result = [];

    if (Array.isArray(window.__next_f)) result.push(window.__next_f);
    if (window.__NEXT_DATA__) result.push(window.__NEXT_DATA__);

    for (const script of Array.from(document.querySelectorAll("script"))) {
      const text = script.textContent?.trim();
      if (!text || text.length > 8_000_000) continue;

      const type = String(script.getAttribute("type") ?? "").toLowerCase();
      if (
        type.includes("json") ||
        text.includes("initialPets") ||
        text.includes("rvalue") ||
        text.includes("nvalue") ||
        text.includes("mvalue") ||
        text.includes("sharkValue") ||
        text.includes("regularValue")
      ) {
        result.push(text);
      }
    }

    return result;
  }).catch(() => []);

  for (const payload of payloads) {
    collectItemObjects(payload, fallbackCategory, output);
  }
}

async function clickCategory(page, label) {
  const regexp = new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
  const locators = [
    page.getByRole("button", { name: regexp }),
    page.getByRole("tab", { name: regexp }),
    page.getByText(label, { exact: true }),
  ];

  for (const locator of locators) {
    const count = await locator.count().catch(() => 0);
    for (let index = 0; index < Math.min(count, 8); index += 1) {
      const candidate = locator.nth(index);
      const visible = await candidate.isVisible().catch(() => false);
      if (!visible) continue;

      try {
        await candidate.scrollIntoViewIfNeeded().catch(() => {});
        await candidate.click({ timeout: 5_000 });
        return true;
      } catch {
        // Try the next matching visible element.
      }
    }
  }

  // Fallback for non-semantic category pills.
  return page.evaluate((targetLabel) => {
    const elements = Array.from(
      document.querySelectorAll("button,[role='tab'],a,[role='button'],div,span"),
    );

    const visible = (element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
    };

    const exact = elements.find(
      (element) => element.textContent?.trim().toLowerCase() === targetLabel.toLowerCase() && visible(element),
    );

    if (!exact) return false;
    exact.click();
    return true;
  }, label).catch(() => false);
}

function countByCategory(items) {
  return items.reduce((counts, item) => {
    counts[item.category] = (counts[item.category] ?? 0) + 1;
    return counts;
  }, {});
}

async function fetchElveData() {
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/150.0.0.0 Safari/537.36",
      locale: "en-US",
      viewport: { width: 1920, height: 1080 },
      extraHTTPHeaders: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        "Upgrade-Insecure-Requests": "1",
      },
    });

    const page = await context.newPage();
    const capturedItems = [];
    const diagnostics = [];
    const pendingResponses = new Set();
    let activeFallbackCategory = null;

    page.on("response", (response) => {
      const task = (async () => {
        const request = response.request();
        const resourceType = request.resourceType();
        if (!["xhr", "fetch", "document"].includes(resourceType)) return;

        const headers = response.headers();
        const contentType = String(headers["content-type"] ?? "").toLowerCase();
        if (
          !contentType.includes("json") &&
          !contentType.includes("text") &&
          !contentType.includes("component") &&
          !contentType.includes("javascript")
        ) {
          return;
        }

        let body;
        try {
          body = await response.text();
        } catch {
          return;
        }

        if (!body || body.length > 15_000_000) return;

        const before = capturedItems.length;
        let parsed = false;

        try {
          const json = JSON.parse(body);
          collectItemObjects(json, activeFallbackCategory, capturedItems);
          parsed = true;
        } catch {
          collectItemObjects(body, activeFallbackCategory, capturedItems);
        }

        const added = capturedItems.length - before;
        if (added > 0 || resourceType === "fetch" || resourceType === "xhr") {
          diagnostics.push({
            url: response.url(),
            status: response.status(),
            resourceType,
            contentType,
            fallbackCategory: activeFallbackCategory,
            parsedAsJson: parsed,
            candidateItems: added,
          });
        }
      })().finally(() => pendingResponses.delete(task));

      pendingResponses.add(task);
    });

    console.log("Opening Elvebredd using Chromium...");

    const response = await page.goto(ELVE_URL, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });

    if (!response) throw new Error("Elvebredd returned no browser response.");
    const status = response.status();
    if (status < 200 || status >= 400) throw new Error(`Elvebredd returned HTTP ${status}.`);

    // Give the client app a moment to hydrate. Elvebredd has changed its
    // Next.js payload shape before, so `initialPets` is no longer treated as a
    // required marker.
    await page.waitForTimeout(2_500);
    await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});

    let html = await page.content();
    if (html.length < 100_000) {
      throw new Error(`Elvebredd response was unexpectedly small (${html.length} characters).`);
    }

    console.log(`Elvebredd page loaded successfully (${html.length} characters).`);

    // Inspect server-rendered Next.js flight chunks and hydrated browser state.
    // This works with both the old `initialPets` shape and newer RSC/API shapes.
    capturedItems.push(...collectFromNextFlightHtml(html));
    await collectBrowserState(page, null, capturedItems);

    for (const tab of EXTRA_CATEGORY_TABS) {
      activeFallbackCategory = tab.category;
      const clicked = await clickCategory(page, tab.label);

      if (!clicked) {
        if (!tab.optional) console.warn(`Could not find Elve category tab: ${tab.label}.`);
        continue;
      }

      console.log(`Loading Elve category: ${tab.label}...`);
      await page.waitForTimeout(1_600);
      await page.waitForLoadState("networkidle", { timeout: 6_000 }).catch(() => {});

      // Some builds inject RSC data into the page after a tab switch.
      const categoryHtml = await page.content();
      capturedItems.push(...collectFromNextFlightHtml(categoryHtml, tab.category));
      await collectBrowserState(page, tab.category, capturedItems);
    }

    activeFallbackCategory = null;
    await Promise.allSettled(Array.from(pendingResponses));

    // Final page HTML in case the app appended lazy chunks after the last tab.
    html = await page.content();
    capturedItems.push(...collectFromNextFlightHtml(html));
    await collectBrowserState(page, null, capturedItems);

    return { html, capturedItems, diagnostics };
  } finally {
    await browser.close();
  }
}

function mergeFreshWithPrevious(previousSnapshot, freshItems) {
  if (!previousSnapshot?.items?.length) {
    return {
      items: mergeSnapshotItems([], freshItems),
      preservedCategories: [],
      freshCategoryCounts: countByCategory(freshItems),
    };
  }

  const previousByCategory = new Map();
  const freshByCategory = new Map();

  for (const item of previousSnapshot.items) {
    const list = previousByCategory.get(item.category) ?? [];
    list.push(item);
    previousByCategory.set(item.category, list);
  }
  for (const item of freshItems) {
    const list = freshByCategory.get(item.category) ?? [];
    list.push(item);
    freshByCategory.set(item.category, list);
  }

  const categories = new Set([...previousByCategory.keys(), ...freshByCategory.keys()]);
  const merged = [];
  const preservedCategories = [];

  for (const category of categories) {
    const previous = previousByCategory.get(category) ?? [];
    const fresh = mergeSnapshotItems([], freshByCategory.get(category) ?? []);
    const threshold = previous.length > 0 ? Math.max(10, Math.floor(previous.length * 0.65)) : 1;
    const freshLooksComplete = fresh.length >= threshold;

    if (freshLooksComplete) {
      merged.push(...fresh);
    } else {
      // Preserve last-known-good records for categories the redesigned site no
      // longer exposes completely, while still allowing newly captured items
      // and fresh values to override cached rows.
      merged.push(...mergeSnapshotItems(previous, fresh));
      if (previous.length > 0) preservedCategories.push(category);
    }
  }

  return {
    items: mergeSnapshotItems([], merged),
    preservedCategories,
    freshCategoryCounts: countByCategory(freshItems),
  };
}

function snapshotsHaveSameValues(previousSnapshot, nextSnapshot) {
  if (!previousSnapshot?.items || previousSnapshot.items.length !== nextSnapshot.items.length) return false;

  const previousMap = new Map(
    previousSnapshot.items.map((item) => [
      `${item.category}:${item.name}`,
      `${item.normal ?? ""}|${item.neon ?? ""}|${item.mega ?? ""}`,
    ]),
  );

  return nextSnapshot.items.every(
    (item) =>
      previousMap.get(`${item.category}:${item.name}`) ===
      `${item.normal ?? ""}|${item.neon ?? ""}|${item.mega ?? ""}`,
  );
}

function fallbackToLastKnownGoodSnapshot(previousSnapshot, error) {
  if (previousSnapshot) {
    validateSnapshot(previousSnapshot, null);
    console.warn("Elvebredd refresh did not complete. The last-known-good snapshot was left unchanged.");
    console.warn(`Cached records: ${previousSnapshot.recordCount ?? previousSnapshot.items.length}`);
    console.warn(`Cached fetchedAt: ${previousSnapshot.fetchedAt ?? "unknown"}`);
  }

  // Fail the command instead of returning success with stale data. This keeps
  // `npm run refresh:values` from syncing an old cache into the master XLSX.
  throw error;
}

async function main() {
  const previousSnapshot = readJsonIfPresent(snapshotPath);

  let fetched;
  try {
    fetched = await fetchElveData();
  } catch (error) {
    fallbackToLastKnownGoodSnapshot(previousSnapshot, error);
    return;
  }

  let legacySnapshot = null;
  try {
    legacySnapshot = createSnapshotFromHtml(fetched.html);
  } catch (error) {
    console.warn(
      "Legacy Elve initialPets payload was not found. Using browser/RSC/API capture instead.",
    );
    console.warn(error instanceof Error ? error.message : String(error));
  }

  const browserFreshItems = mergeSnapshotItems([], fetched.capturedItems).filter(
    (item) => item.normal !== null || item.neon !== null || item.mega !== null,
  );
  const freshItems = mergeSnapshotItems(legacySnapshot?.items ?? [], browserFreshItems);

  if (freshItems.length === 0) {
    fallbackToLastKnownGoodSnapshot(
      previousSnapshot,
      new Error("Elvebredd loaded, but no value-bearing items could be extracted from the current page/API payloads."),
    );
    return;
  }

  const mergedResult = mergeFreshWithPrevious(previousSnapshot, freshItems);
  const snapshot = createSnapshotFromItems(mergedResult.items, {
    fetchedAt: new Date().toISOString(),
    sourceVersion: legacySnapshot?.sourceVersion ?? previousSnapshot?.sourceVersion ?? null,
    captureMode: legacySnapshot ? "legacy+browser" : "browser-rsc-api",
  });
  snapshot.recordCount = snapshot.items.length;
  snapshot.categoryCounts = countByCategory(snapshot.items);
  snapshot.freshCategoryCounts = mergedResult.freshCategoryCounts;
  snapshot.preservedCategories = mergedResult.preservedCategories;
  snapshot.fetchDiagnosticsFile = path.basename(diagnosticsPath);

  fs.writeFileSync(
    diagnosticsPath,
    `${JSON.stringify(
      {
        fetchedAt: snapshot.fetchedAt,
        sourceVersion: snapshot.sourceVersion,
        captureMode: snapshot.captureMode,
        categoryCounts: snapshot.categoryCounts,
        freshCategoryCounts: snapshot.freshCategoryCounts,
        preservedCategories: snapshot.preservedCategories,
        freshCandidates: freshItems.length,
        network: fetched.diagnostics,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  validateSnapshot(snapshot, previousSnapshot);

  console.log(`Fresh Elve candidates captured: ${freshItems.length}`);
  console.log("Fresh category counts:");
  for (const [category, count] of Object.entries(snapshot.freshCategoryCounts).sort()) {
    console.log(`- ${category}: ${count}`);
  }

  if (snapshot.preservedCategories.length > 0) {
    console.warn(
      `Preserved cached records for partially exposed categories: ${snapshot.preservedCategories.join(", ")}.`,
    );
  }

  console.log("Final Elve category counts:");
  for (const [category, count] of Object.entries(snapshot.categoryCounts).sort()) {
    console.log(`- ${category}: ${count}`);
  }

  const requiredExpandedCategories = ["VEHICLE", "FOOD", "GIFT", "STROLLER", "STICKER"];
  const missingExpandedCategories = requiredExpandedCategories.filter(
    (category) => !(snapshot.categoryCounts[category] > 0),
  );

  if (missingExpandedCategories.length > 0) {
    throw new Error(
      `Elve snapshot is missing expanded categories (${missingExpandedCategories.join(", ")}). ` +
        `Network diagnostics were saved to ${diagnosticsPath}.`,
    );
  }

  if (snapshotsHaveSameValues(previousSnapshot, snapshot)) {
    // Refresh fetchedAt/diagnostics even when values are unchanged so the local
    // snapshot no longer looks stale after a successful check.
    writeSnapshot(snapshot, snapshotPath, backupPath);
    console.log(`Elve Shark values are unchanged (${snapshot.recordCount} records).`);
    console.log(`Checked source version: ${snapshot.sourceVersion ?? "unknown"}`);
    console.log(`Checked at: ${snapshot.fetchedAt}`);
    console.log(`Refreshed snapshot metadata: ${snapshotPath}`);
    return;
  }

  writeSnapshot(snapshot, snapshotPath, backupPath);

  console.log(`Updated Elve Shark values: ${snapshot.recordCount} records.`);
  console.log(`Source version: ${snapshot.sourceVersion ?? "unknown"}`);
  console.log(`Fetched at: ${snapshot.fetchedAt}`);
  console.log(`Saved: ${snapshotPath}`);
  console.log(`Backup: ${backupPath}`);
  console.log(`Fetch diagnostics: ${diagnosticsPath}`);
}

main().catch((error) => {
  console.error("Elve value refresh failed:");
  console.error(error);
  process.exit(1);
});

const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");

const {
  ELVE_URL,
  createSnapshotFromHtml,
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

function normalizeKey(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function objectLooksLikeItem(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const keys = new Set(Object.keys(value).map(normalizeKey));
  const hasName = ["name", "itemname", "title"].some((key) => keys.has(key));
  const hasValue = [
    "rvalue",
    "value",
    "regularvalue",
    "sharkvalue",
    "nvalue",
    "mvalue",
  ].some((key) => keys.has(key));

  return hasName && hasValue;
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

  if (objectLooksLikeItem(value)) {
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

    try {
      await page.waitForFunction(
        () => document.documentElement.innerHTML.includes("initialPets"),
        { timeout: 60_000 },
      );
    } catch {
      console.warn("The initialPets marker was not detected immediately. Checking the complete page HTML.");
    }

    let html = await page.content();
    if (html.length < 100_000) {
      throw new Error(`Elvebredd response was unexpectedly small (${html.length} characters).`);
    }
    if (!html.includes("initialPets")) {
      throw new Error("Elvebredd page did not contain the initialPets payload.");
    }

    console.log(`Elvebredd page loaded successfully (${html.length} characters).`);

    // Inspect every Next.js flight chunk, not only the legacy initialPets object.
    capturedItems.push(...collectFromNextFlightHtml(html));

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
    }

    activeFallbackCategory = null;
    await Promise.allSettled(Array.from(pendingResponses));

    // Final page HTML in case the app appended lazy chunks after the last tab.
    html = await page.content();
    capturedItems.push(...collectFromNextFlightHtml(html));

    return { html, capturedItems, diagnostics };
  } finally {
    await browser.close();
  }
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

function useLastKnownGoodSnapshot(previousSnapshot, error) {
  if (!previousSnapshot) throw error;

  validateSnapshot(previousSnapshot, null);
  console.warn("Elvebredd could not be checked. Using the last-known-good snapshot.");
  console.warn(error instanceof Error ? error.message : String(error));
  console.warn(`Cached records: ${previousSnapshot.recordCount ?? previousSnapshot.items.length}`);
  console.warn(`Cached source version: ${previousSnapshot.sourceVersion ?? "unknown"}`);
}

async function main() {
  const previousSnapshot = readJsonIfPresent(snapshotPath);

  let fetched;
  try {
    fetched = await fetchElveData();
  } catch (error) {
    useLastKnownGoodSnapshot(previousSnapshot, error);
    return;
  }

  const snapshot = createSnapshotFromHtml(fetched.html);
  snapshot.items = mergeSnapshotItems(snapshot.items, fetched.capturedItems);
  snapshot.recordCount = snapshot.items.length;
  snapshot.categoryCounts = countByCategory(snapshot.items);
  snapshot.fetchDiagnosticsFile = path.basename(diagnosticsPath);

  fs.writeFileSync(
    diagnosticsPath,
    `${JSON.stringify(
      {
        fetchedAt: snapshot.fetchedAt,
        sourceVersion: snapshot.sourceVersion,
        categoryCounts: snapshot.categoryCounts,
        network: fetched.diagnostics,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  if (snapshot.unrecognizedTypes?.length) {
    console.warn(`Unrecognized Elve item types were skipped: ${snapshot.unrecognizedTypes.join(", ")}.`);
  }

  validateSnapshot(snapshot, previousSnapshot);

  console.log("Elve category counts:");
  for (const [category, count] of Object.entries(snapshot.categoryCounts).sort()) {
    console.log(`- ${category}: ${count}`);
  }

  const requiredExpandedCategories = ["VEHICLE", "FOOD", "GIFT", "STROLLER", "STICKER"];
  const missingExpandedCategories = requiredExpandedCategories.filter(
    (category) => !(snapshot.categoryCounts[category] > 0),
  );

  if (missingExpandedCategories.length > 0) {
    throw new Error(
      `Elve expanded-category capture is incomplete (${missingExpandedCategories.join(", ")}). ` +
        `Network diagnostics were saved to ${diagnosticsPath}.`,
    );
  }

  if (snapshotsHaveSameValues(previousSnapshot, snapshot)) {
    console.log(`Elve Shark values are unchanged (${snapshot.recordCount} records).`);
    console.log(`Checked source version: ${snapshot.sourceVersion ?? "unknown"}`);
    console.log(`Checked at: ${snapshot.fetchedAt}`);
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

const path = require("path");
const { chromium } = require("playwright");

const {
  ELVE_URL,
  createSnapshotFromHtml,
  readJsonIfPresent,
  validateSnapshot,
  writeSnapshot,
} = require("./lib/elve-shark");

const projectRoot = process.cwd();

const snapshotPath = path.join(
  projectRoot,
  "source-data",
  "elve-shark-values.json",
);

const backupPath = path.join(
  projectRoot,
  "source-data",
  "elve-shark-values.backup.json",
);

async function fetchElvePage() {
  const browser = await chromium.launch({
    headless: true,
  });

  try {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/150.0.0.0 Safari/537.36",

      locale: "en-US",

      viewport: {
        width: 1920,
        height: 1080,
      },

      extraHTTPHeaders: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        "Upgrade-Insecure-Requests": "1",
      },
    });

    const page = await context.newPage();

    console.log("Opening Elvebredd using Chromium...");

    const response = await page.goto(ELVE_URL, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });

    if (!response) {
      throw new Error(
        "Elvebredd returned no browser response.",
      );
    }

    const status = response.status();

    if (status < 200 || status >= 400) {
      throw new Error(
        `Elvebredd returned HTTP ${status}.`,
      );
    }

    try {
      await page.waitForFunction(
        () =>
          document.documentElement.innerHTML.includes(
            "initialPets",
          ),
        {
          timeout: 60_000,
        },
      );
    } catch {
      console.warn(
        "The initialPets marker was not detected immediately. Checking the complete page HTML.",
      );
    }

    const html = await page.content();

    if (html.length < 100_000) {
      throw new Error(
        `Elvebredd response was unexpectedly small (${html.length} characters).`,
      );
    }

    if (!html.includes("initialPets")) {
      throw new Error(
        "Elvebredd page did not contain the initialPets payload.",
      );
    }

    console.log(
      `Elvebredd page loaded successfully (${html.length} characters).`,
    );

    return html;
  } finally {
    await browser.close();
  }
}

function snapshotsHaveSameValues(
  previousSnapshot,
  nextSnapshot,
) {
  if (
    !previousSnapshot?.items ||
    previousSnapshot.items.length !==
      nextSnapshot.items.length
  ) {
    return false;
  }

  const previousMap = new Map(
    previousSnapshot.items.map((item) => [
      `${item.category}:${item.name}`,
      `${item.normal ?? ""}|${item.neon ?? ""}|${
        item.mega ?? ""
      }`,
    ]),
  );

  return nextSnapshot.items.every(
    (item) =>
      previousMap.get(
        `${item.category}:${item.name}`,
      ) ===
      `${item.normal ?? ""}|${item.neon ?? ""}|${
        item.mega ?? ""
      }`,
  );
}

function useLastKnownGoodSnapshot(
  previousSnapshot,
  error,
) {
  if (!previousSnapshot) {
    throw error;
  }

  validateSnapshot(previousSnapshot, null);

  console.warn(
    "Elvebredd could not be checked. Using the last-known-good snapshot.",
  );

  console.warn(
    error instanceof Error
      ? error.message
      : String(error),
  );

  console.warn(
    `Cached records: ${
      previousSnapshot.recordCount ??
      previousSnapshot.items.length
    }`,
  );

  console.warn(
    `Cached source version: ${
      previousSnapshot.sourceVersion ?? "unknown"
    }`,
  );
}

async function main() {
  const previousSnapshot =
    readJsonIfPresent(snapshotPath);

  let html;

  try {
    html = await fetchElvePage();
  } catch (error) {
    useLastKnownGoodSnapshot(
      previousSnapshot,
      error,
    );

    return;
  }

  const snapshot =
    createSnapshotFromHtml(html);

  validateSnapshot(
    snapshot,
    previousSnapshot,
  );

  if (
    snapshotsHaveSameValues(
      previousSnapshot,
      snapshot,
    )
  ) {
    console.log(
      `Elve Shark values are unchanged (${snapshot.recordCount} records).`,
    );

    console.log(
      `Checked source version: ${
        snapshot.sourceVersion ?? "unknown"
      }`,
    );

    console.log(
      `Checked at: ${snapshot.fetchedAt}`,
    );

    return;
  }

  writeSnapshot(
    snapshot,
    snapshotPath,
    backupPath,
  );

  console.log(
    `Updated Elve Shark values: ${snapshot.recordCount} records.`,
  );

  console.log(
    `Source version: ${
      snapshot.sourceVersion ?? "unknown"
    }`,
  );

  console.log(
    `Fetched at: ${snapshot.fetchedAt}`,
  );

  console.log(
    `Saved: ${snapshotPath}`,
  );

  console.log(
    `Backup: ${backupPath}`,
  );
}

main().catch((error) => {
  console.error(
    "Elve Shark update failed. The last-known-good snapshot was kept.",
  );

  console.error(
    error instanceof Error
      ? error.stack ?? error.message
      : String(error),
  );

  process.exitCode = 1;
});
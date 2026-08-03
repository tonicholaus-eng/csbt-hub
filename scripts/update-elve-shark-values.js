const path = require("path");
const {
  ELVE_URL,
  createSnapshotFromHtml,
  readJsonIfPresent,
  validateSnapshot,
  writeSnapshot,
} = require("./lib/elve-shark");

const projectRoot = process.cwd();
const snapshotPath = path.join(projectRoot, "source-data", "elve-shark-values.json");
const backupPath = path.join(projectRoot, "source-data", "elve-shark-values.backup.json");

async function fetchElvePage() {
  const response = await fetch(ELVE_URL, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
      "Cache-Control": "no-cache",
      "User-Agent": "CSBT-HUB-Value-Updater/1.0 (+daily; source attribution enabled)",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(45_000),
  });

  if (!response.ok) {
    throw new Error(`Elvebredd returned HTTP ${response.status}.`);
  }

  const html = await response.text();
  if (html.length < 100_000) {
    throw new Error(`Elvebredd response was unexpectedly small (${html.length} characters).`);
  }

  return html;
}


function snapshotsHaveSameValues(previousSnapshot, nextSnapshot) {
  if (!previousSnapshot?.items || previousSnapshot.items.length !== nextSnapshot.items.length) {
    return false;
  }

  const previousMap = new Map(
    previousSnapshot.items.map((item) => [
      `${item.category}:${item.name}`,
      `${item.normal ?? ""}|${item.neon ?? ""}|${item.mega ?? ""}`,
    ]),
  );

  return nextSnapshot.items.every((item) =>
    previousMap.get(`${item.category}:${item.name}`) ===
    `${item.normal ?? ""}|${item.neon ?? ""}|${item.mega ?? ""}`,
  );
}

async function main() {
  const previousSnapshot = readJsonIfPresent(snapshotPath);
  const html = await fetchElvePage();
  const snapshot = createSnapshotFromHtml(html);
  validateSnapshot(snapshot, previousSnapshot);

  if (snapshotsHaveSameValues(previousSnapshot, snapshot)) {
    console.log(`Elve Shark values are unchanged (${snapshot.recordCount} records).`);
    console.log(`Checked source version: ${snapshot.sourceVersion ?? "unknown"}`);
    return;
  }

  writeSnapshot(snapshot, snapshotPath, backupPath);

  console.log(`Updated Elve Shark values: ${snapshot.recordCount} records.`);
  console.log(`Source version: ${snapshot.sourceVersion ?? "unknown"}`);
  console.log(`Fetched at: ${snapshot.fetchedAt}`);
  console.log(`Saved: ${snapshotPath}`);
}

main().catch((error) => {
  console.error("Elve Shark update failed. The last-known-good snapshot was kept.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

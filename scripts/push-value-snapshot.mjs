import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { loadLocalEnv } from "./load-local-env.mjs";
import { createClient } from "@supabase/supabase-js";

loadLocalEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !secretKey) {
  console.log("[value-history] Skipped: add SUPABASE_SECRET_KEY to enable database snapshots.");
  process.exit(0);
}

const file = path.join(process.cwd(), "src", "data", "tradingItems.json");
const items = JSON.parse(await fs.readFile(file, "utf8"));
const snapshotDate = new Date().toISOString().slice(0, 10);

const fields = [
  ["GCASH", "NORMAL", "GCASH_NORMAL"],
  ["GCASH", "NEON", "GCASH_NEON"],
  ["GCASH", "MEGA", "GCASH_MEGA"],
  ["ELVE", "NORMAL", "ELVE_NORMAL"],
  ["ELVE", "NEON", "ELVE_NEON"],
  ["ELVE", "MEGA", "ELVE_MEGA"],
];

const rowMap = new Map();
for (const item of items) {
  for (const [source, valueType, field] of fields) {
    const raw = item[field];
    if (raw === null || raw === undefined || String(raw).trim() === "") continue;

    const value = typeof raw === "number" ? raw : Number(raw);
    // Zero/null values are not market observations and must not enter
    // value_history. This also prevents Exchange from treating an
    // unpriced item as a canonical zero-value listing.
    if (!Number.isFinite(value) || value <= 0) continue;

    const row = {
      snapshot_date: snapshotDate,
      item_id: item.ID,
      item_name: item.NAME,
      category: item.CATEGORY,
      source,
      value_type: valueType,
      value,
    };

    const conflictKey = `${snapshotDate}|${item.ID}|${source}|${valueType}`;
    const previous = rowMap.get(conflictKey);

    // If legacy punctuation aliases somehow produce the same canonical ID,
    // prefer the row with the most useful item name/value instead of sending
    // two conflicting rows in a single Postgres upsert.
    if (!previous || String(row.item_name).length > String(previous.item_name).length) {
      rowMap.set(conflictKey, row);
    }
  }
}

const rows = Array.from(rowMap.values());

const supabase = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Older versions of this script converted null to Number(null) === 0 and
// accidentally stored zero-value history rows. Remove those invalid market
// observations before writing the current snapshot.
const { error: cleanupError } = await supabase
  .from("value_history")
  .delete()
  .lte("value", 0);
if (cleanupError) throw cleanupError;

const batchSize = 500;
for (let index = 0; index < rows.length; index += batchSize) {
  const batch = rows.slice(index, index + batchSize);
  const { error } = await supabase
    .from("value_history")
    .upsert(batch, { onConflict: "snapshot_date,item_id,source,value_type" });
  if (error) throw error;
}

console.log(`[value-history] Stored ${rows.length} values for ${snapshotDate}.`);

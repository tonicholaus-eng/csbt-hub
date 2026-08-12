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

const rows = [];
for (const item of items) {
  for (const [source, valueType, field] of fields) {
    const raw = item[field];
    const value = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(value)) continue;
    rows.push({
      snapshot_date: snapshotDate,
      item_id: item.ID,
      item_name: item.NAME,
      category: item.CATEGORY,
      source,
      value_type: valueType,
      value,
    });
  }
}

const supabase = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const batchSize = 500;
for (let index = 0; index < rows.length; index += batchSize) {
  const batch = rows.slice(index, index + batchSize);
  const { error } = await supabase
    .from("value_history")
    .upsert(batch, { onConflict: "snapshot_date,item_id,source,value_type" });
  if (error) throw error;
}

console.log(`[value-history] Stored ${rows.length} values for ${snapshotDate}.`);

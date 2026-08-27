import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { loadLocalEnv } from "./load-local-env.mjs";
import { createClient } from "@supabase/supabase-js";

/**
 * Push the generated MM2 catalog into public.game_catalog_items.
 *
 * WHY THIS EXISTS (audit 08_DATA_PIPELINES D-02 / 19 B-10)
 * marketplace_create_listing and marketplace_create_offer resolve every MM2 item
 * against game_catalog_items and RAISE when a weapon is absent. That table was
 * seeded once by a ~1,200-line literal INSERT inside
 * 20260826000100_multigame_social.sql, reflecting mm2Items.json at
 * 2026-08-24T20:26:24Z, and nothing has updated it since.
 *
 * So `npm run refresh:mm2` used to update the browser catalog while leaving the
 * server catalog frozen: any newly added weapon was rejected server-side, and
 * snapshot_value on new listings was the migration-time value.
 *
 * This script closes that gap the same way push-value-snapshot.mjs does for
 * Adopt Me values.
 *
 * SAFETY
 *   * Skips silently when SUPABASE_SECRET_KEY is absent, so it is safe inside a
 *     chained npm script on a machine with no credentials.
 *   * Upsert only. It never deletes rows, so a weapon that disappears upstream
 *     is retained rather than breaking listings that already reference it.
 *   * Refuses to run against an unexpectedly small catalog.
 *   * Point it at a local/dev Supabase project until MM2 is released.
 */

loadLocalEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !secretKey) {
  console.log("[mm2-catalog] Skipped: add SUPABASE_SECRET_KEY to enable catalog sync.");
  process.exit(0);
}

const file = path.join(process.cwd(), "src", "data", "mm2Items.json");
const items = JSON.parse(await fs.readFile(file, "utf8"));

if (!Array.isArray(items) || items.length < 500) {
  throw new Error(
    `[mm2-catalog] Refusing to push: expected a full MM2 catalog, got ${
      Array.isArray(items) ? items.length : "a non-array"
    }. Run "npm run generate:mm2" first.`,
  );
}

function finiteOrNull(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

const seen = new Set();
const rows = [];

for (const item of items) {
  const itemId = typeof item.ID === "string" ? item.ID.trim() : "";
  const itemName = typeof item.NAME === "string" ? item.NAME.trim() : "";
  if (!itemId || !itemName) continue;
  // (game_id,item_id) is the primary key; a duplicate in one payload would make
  // Postgres reject the whole batch.
  if (seen.has(itemId)) continue;
  seen.add(itemId);

  const demand = finiteOrNull(item.DEMAND);

  rows.push({
    game_id: "mm2",
    item_id: itemId,
    item_name: itemName.slice(0, 120),
    image_url: typeof item.IMAGE === "string" && item.IMAGE ? item.IMAGE : null,
    category: String(item.CATEGORY ?? "OTHER").toUpperCase(),
    // Demand is left null when unrated rather than defaulted to 0.
    demand_label: demand === null ? null : `${demand}/10`,
    demand_score: demand,
    // Unpriced weapons stay null. A zero here would let Exchange treat an
    // unpriced weapon as a canonical zero-value item.
    supreme_value: finiteOrNull(item.SOURCE_VALUE),
    gcash_value: finiteOrNull(item.GCASH_VALUE),
    source_updated_at: typeof item.UPDATED_AT === "string" ? item.UPDATED_AT : null,
    updated_at: new Date().toISOString(),
  });
}

const supabase = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const batchSize = 500;
for (let index = 0; index < rows.length; index += batchSize) {
  const batch = rows.slice(index, index + batchSize);
  const { error } = await supabase
    .from("game_catalog_items")
    .upsert(batch, { onConflict: "game_id,item_id" });
  if (error) throw error;
}

const priced = rows.filter((row) => row.supreme_value !== null).length;
console.log(
  `[mm2-catalog] Upserted ${rows.length} MM2 weapons (${priced} priced, ${
    rows.length - priced
  } unpriced).`,
);

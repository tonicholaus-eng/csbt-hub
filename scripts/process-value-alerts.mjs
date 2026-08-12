import { loadLocalEnv } from "./load-local-env.mjs";
import { createClient } from "@supabase/supabase-js";

loadLocalEnv();

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !secretKey) {
    console.log("[value-alerts] Skipped: add SUPABASE_SECRET_KEY to enable alerts.");
    return;
  }

  const supabase = createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 1 } },
  });

  const { data: watches, error: watchError } = await supabase
    .from("value_watchlist")
    .select("id,user_id,item_id,item_name,source,value_type,alert_percent,enabled")
    .eq("enabled", true);

  if (watchError) throw watchError;
  if (!watches?.length) {
    console.log("[value-alerts] No enabled watches.");
    return;
  }

  const userIds = [...new Set(watches.map((watch) => watch.user_id).filter(Boolean))];
  const { data: preferenceRows, error: preferenceError } = await supabase
    .from("notification_preferences")
    .select("user_id,value_changes")
    .in("user_id", userIds);

  if (preferenceError) throw preferenceError;
  const valueAlertsEnabled = new Map(
    (preferenceRows ?? []).map((row) => [row.user_id, row.value_changes !== false]),
  );

  let created = 0;
  for (const watch of watches) {
    if (valueAlertsEnabled.get(watch.user_id) === false) continue;

    const { data: history, error: historyError } = await supabase
      .from("value_history")
      .select("snapshot_date,value")
      .eq("item_id", watch.item_id)
      .eq("source", watch.source)
      .eq("value_type", watch.value_type)
      .order("snapshot_date", { ascending: false })
      .limit(2);

    if (historyError || !history || history.length < 2) continue;

    const latest = Number(history[0].value);
    const previous = Number(history[1].value);
    if (!Number.isFinite(latest) || !Number.isFinite(previous) || previous === 0) continue;

    const changePercent = ((latest - previous) / previous) * 100;
    if (Math.abs(changePercent) < Number(watch.alert_percent ?? 10)) continue;

    const direction = changePercent > 0 ? "increased" : "dropped";
    const sign = changePercent > 0 ? "+" : "";
    const dedupeKey = `value-watch:${watch.id}:${history[0].snapshot_date}`;

    const { error: notificationError } = await supabase.from("notifications").insert({
      user_id: watch.user_id,
      type: "value_change",
      title: `${watch.item_name} ${direction}`,
      body: `${watch.source} ${watch.value_type.toLowerCase()} value moved ${sign}${changePercent.toFixed(1)}% since the previous snapshot.`,
      href: `/values/${encodeURIComponent(watch.item_id)}`,
      dedupe_key: dedupeKey,
    });

    if (!notificationError) created += 1;
    else if (!/duplicate|unique/i.test(notificationError.message)) {
      console.warn(`[value-alerts] ${watch.item_name}: ${notificationError.message}`);
    }
  }

  console.log(`[value-alerts] Created ${created} notification(s).`);
}

main().catch((error) => {
  console.error("[value-alerts] Failed:");
  console.error(error);
  process.exitCode = 1;
});

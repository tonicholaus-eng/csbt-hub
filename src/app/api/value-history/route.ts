import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const validSources = new Set(["GCASH", "ELVE"]);
const validTypes = new Set(["NORMAL", "NEON", "MEGA"]);

export async function GET(request: NextRequest) {
  const itemId = request.nextUrl.searchParams.get("itemId")?.trim();
  const source = (request.nextUrl.searchParams.get("source") ?? "GCASH").toUpperCase();
  const valueType = (request.nextUrl.searchParams.get("type") ?? "NORMAL").toUpperCase();
  const requestedDays = Number(request.nextUrl.searchParams.get("days") ?? 30);
  const days = Number.isFinite(requestedDays) ? Math.min(90, Math.max(7, Math.round(requestedDays))) : 30;

  if (!itemId || !validSources.has(source) || !validTypes.has(valueType)) {
    return NextResponse.json({ success: false, points: [], error: "Invalid history request." }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return NextResponse.json({ success: true, points: [], configured: false });
  }

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days + 1);
  const sinceDate = since.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("value_history")
    .select("snapshot_date,value")
    .eq("item_id", itemId)
    .eq("source", source)
    .eq("value_type", valueType)
    .gte("snapshot_date", sinceDate)
    .order("snapshot_date", { ascending: true });

  if (error) {
    // The app can be deployed before the migration is applied. Treat missing history as empty.
    if (/relation|schema|does not exist/i.test(error.message)) {
      return NextResponse.json({ success: true, points: [], configured: false });
    }
    return NextResponse.json({ success: false, points: [], error: error.message }, { status: 500 });
  }

  const points = (data ?? [])
    .map((row) => ({ date: String(row.snapshot_date), value: Number(row.value) }))
    .filter((point) => Number.isFinite(point.value));

  return NextResponse.json(
    { success: true, configured: true, itemId, source, valueType, days, points },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
  );
}

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const allowed = new Set(["LISTING_VIEW", "SEARCH", "MATCH_VIEW", "OFFER_BUILDER_OPEN"]);

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) return NextResponse.json({ ok: false }, { status: 503 });

  let body: { eventType?: string; listingId?: string; itemId?: string; valueSource?: string; value?: number; gameId?: string; metadata?: Record<string, unknown> };
  try { body = await request.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const eventType = String(body.eventType ?? "").toUpperCase();
  if (!allowed.has(eventType)) return NextResponse.json({ ok: false }, { status: 400 });

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const userAgent = request.headers.get("user-agent")?.slice(0, 220) ?? "unknown";
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${forwarded}|${userAgent}|${secret.slice(-24)}`),
  );
  const fingerprint = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");

  const metadata: Record<string, unknown> = {};
  const requestedGame = typeof body.gameId === "string"
    ? body.gameId
    : typeof body.metadata?.game_id === "string"
      ? body.metadata.game_id
      : null;
  if (requestedGame === "adopt-me" || requestedGame === "mm2") metadata.game_id = requestedGame;

  if (eventType === "SEARCH") {
    const query = typeof body.metadata?.query === "string" ? body.metadata.query.trim().slice(0, 80) : "";
    if (query.length < 2) return NextResponse.json({ ok: false }, { status: 400 });
    metadata.query = query;
  }

  const supabase = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.rpc("marketplace_log_client_event", {
    p_fingerprint: fingerprint,
    p_event_type: eventType,
    p_listing_id: body.listingId ?? null,
    p_item_id: typeof body.itemId === "string" ? body.itemId.slice(0, 180) : null,
    p_value_source: body.valueSource === "GCASH" || body.valueSource === "ELVE" || body.valueSource === "SUPREME" ? body.valueSource : null,
    p_value: typeof body.value === "number" && Number.isFinite(body.value) ? body.value : null,
    p_metadata: metadata,
  });
  if (error) return NextResponse.json({ ok: false }, { status: 500 });
  if (!data) return NextResponse.json({ ok: false, rateLimited: true }, { status: 429 });
  return NextResponse.json({ ok: true });
}

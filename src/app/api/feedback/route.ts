import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const categories = new Set(["WRONG_VALUE", "MISSING_ITEM", "BUG", "FEATURE", "OTHER"]);

async function fingerprint(request: Request, secret: string) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ua = request.headers.get("user-agent")?.slice(0, 220) ?? "unknown";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${ip}|${ua}|${secret.slice(-24)}`));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) return NextResponse.json({ ok: false, message: "Feedback is temporarily unavailable." }, { status: 503 });

  let body: { category?: string; itemId?: string | null; itemName?: string | null; message?: string; pageUrl?: string | null; website?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 }); }

  // Honeypot: pretend success so bots do not learn how they were detected.
  if (body.website?.trim()) return NextResponse.json({ ok: true });

  const category = String(body.category ?? "").toUpperCase();
  const message = String(body.message ?? "").trim();
  if (!categories.has(category) || message.length < 5 || message.length > 2000) {
    return NextResponse.json({ ok: false, message: "Please check your feedback and try again." }, { status: 400 });
  }

  const supabase = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const fp = await fingerprint(request, secret);
  const { data: allowed, error: quotaError } = await supabase.rpc("feedback_consume_quota", {
    p_fingerprint: fp, p_limit: 5, p_window_minutes: 15,
  });
  if (quotaError) console.warn("Feedback quota check unavailable:", quotaError.message);
  if (!quotaError && allowed === false) {
    return NextResponse.json({ ok: false, message: "Too many submissions. Please try again later." }, { status: 429 });
  }

  let userId: string | null = null;
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const { data } = await supabase.auth.getUser(auth.slice(7));
    userId = data.user?.id ?? null;
  }

  const pageUrl = typeof body.pageUrl === "string" && body.pageUrl.length <= 500 ? body.pageUrl : null;
  const itemId = typeof body.itemId === "string" ? body.itemId.slice(0, 120) : null;
  const itemName = typeof body.itemName === "string" ? body.itemName.slice(0, 180) : null;
  const { error } = await supabase.from("feedback_submissions").insert({
    user_id: userId, category, item_id: itemId, item_name: itemName, message, page_url: pageUrl,
  });
  if (error) {
    console.error("Feedback insert failed:", error.message);
    return NextResponse.json({ ok: false, message: "Feedback could not be submitted right now. Please try again." }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}

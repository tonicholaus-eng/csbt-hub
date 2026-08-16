import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

type FallbackBucket = { count: number; resetAt: number };
const fallbackBuckets = new Map<string, FallbackBucket>();
let warnedAboutFallback = false;

function getServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) return null;
  return {
    client: createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } }),
    secret,
  };
}

function hashBucket(namespace: string, identifier: string, secret: string) {
  return createHash("sha256").update(`${namespace}|${identifier}|${secret.slice(-24)}`).digest("hex");
}

function consumeFallback(bucketKey: string, limit: number, windowSeconds: number) {
  const now = Date.now();
  const current = fallbackBuckets.get(bucketKey);
  if (!current || current.resetAt <= now) {
    fallbackBuckets.set(bucketKey, { count: 1, resetAt: now + windowSeconds * 1000 });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  if (fallbackBuckets.size > 2_000) {
    for (const [key, value] of fallbackBuckets) if (value.resetAt <= now) fallbackBuckets.delete(key);
  }
  return true;
}

export async function consumeServerQuota({
  namespace,
  identifier,
  limit,
  windowSeconds,
}: {
  namespace: string;
  identifier: string;
  limit: number;
  windowSeconds: number;
}) {
  const server = getServerClient();
  if (!server) {
    const localKey = createHash("sha256").update(`${namespace}|${identifier}`).digest("hex");
    return consumeFallback(localKey, limit, windowSeconds);
  }

  const bucketKey = hashBucket(namespace, identifier, server.secret);
  const { data, error } = await server.client.rpc("nich_consume_quota", {
    p_bucket_key: bucketKey,
    p_limit: Math.max(1, Math.floor(limit)),
    p_window_seconds: Math.max(1, Math.floor(windowSeconds)),
  });

  if (!error) return Boolean(data);

  // Allows local development and a safe deployment transition before the migration is applied.
  if (!warnedAboutFallback) {
    warnedAboutFallback = true;
    console.warn("[CSBT quota] Durable quota RPC unavailable; using per-instance fallback until the Supabase migration is deployed.");
  }
  return consumeFallback(bucketKey, limit, windowSeconds);
}

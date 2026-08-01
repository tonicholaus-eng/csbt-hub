import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

let browserClient:
  | SupabaseClient
  | null = null;

export function getSupabaseBrowserClient():
  | SupabaseClient
  | null {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseBrowserKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (
    !supabaseUrl ||
    !supabaseBrowserKey
  ) {
    return null;
  }

  if (!browserClient) {
    browserClient = createClient(
      supabaseUrl,
      supabaseBrowserKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      },
    );
  }

  return browserClient;
}

export default getSupabaseBrowserClient;

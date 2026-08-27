export type SupabaseCompatError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

export function isLegacyGameSchemaError(error: SupabaseCompatError | null | undefined) {
  if (!error) return false;
  const text = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`.toLowerCase();
  return (
    error.code === "42703" ||
    error.code === "PGRST202" ||
    error.code === "PGRST204" ||
    text.includes("game_id") ||
    text.includes("community_channel_counts_by_game") ||
    (text.includes("marketplace_create_listing") && text.includes("function"))
  );
}

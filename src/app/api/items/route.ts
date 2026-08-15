import { NextResponse } from "next/server";
import { itemList, searchItems } from "../../../lib/search";
import type { DemandTier, ItemCategory, ValueSource } from "../../../components/trade/types";
import { getItemValue, parseTradeValue } from "../../../lib/valueSystem";

const demandOrder: Record<string, number> = { S: 0, A: 1, B: 2, C: 3, D: 4 };

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const category = (searchParams.get("category") ?? "ALL") as ItemCategory | "ALL";
  const rarity = searchParams.get("rarity") ?? "ALL";
  const demand = (searchParams.get("demand") ?? "ALL") as DemandTier | "ALL";
  const source = (searchParams.get("source") ?? "ALL") as ValueSource | "ALL";
  const sort = searchParams.get("sort") ?? "AZ";
  const offset = Math.max(0, Number(searchParams.get("offset") ?? 0) || 0);
  const limit = Math.min(240, Math.max(1, Number(searchParams.get("limit") ?? 30) || 30));

  const base = query ? searchItems(query, itemList.length) : itemList;
  const filtered = base.filter((item) => {
    if (category !== "ALL" && item.CATEGORY !== category) return false;
    if (rarity !== "ALL" && (item.RARITY ?? "").toLowerCase() !== rarity.toLowerCase()) return false;
    if (demand !== "ALL" && item.DEMAND_TIER !== demand) return false;
    if (source !== "ALL") {
      return ["NORMAL", "NEON", "MEGA"].some((type) => (parseTradeValue(getItemValue(item, source, type as "NORMAL" | "NEON" | "MEGA")) ?? 0) > 0);
    }
    return true;
  });

  filtered.sort((a, b) => {
    if (sort === "GCASH_HIGH") return (parseTradeValue(getItemValue(b, "GCASH", "NORMAL")) ?? -1) - (parseTradeValue(getItemValue(a, "GCASH", "NORMAL")) ?? -1) || a.NAME.localeCompare(b.NAME);
    if (sort === "ELVE_HIGH") return (parseTradeValue(getItemValue(b, "ELVE", "NORMAL")) ?? -1) - (parseTradeValue(getItemValue(a, "ELVE", "NORMAL")) ?? -1) || a.NAME.localeCompare(b.NAME);
    if (sort === "DEMAND") return (demandOrder[a.DEMAND_TIER ?? ""] ?? 99) - (demandOrder[b.DEMAND_TIER ?? ""] ?? 99) || a.NAME.localeCompare(b.NAME);
    if (sort === "RECENT") return new Date(b.UPDATED_AT ?? 0).getTime() - new Date(a.UPDATED_AT ?? 0).getTime() || a.NAME.localeCompare(b.NAME);
    return a.NAME.localeCompare(b.NAME, undefined, { numeric: true, sensitivity: "base" });
  });

  const rarities = Array.from(new Set(itemList.map((item) => item.RARITY?.trim()).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b));
  return NextResponse.json({ items: filtered.slice(offset, offset + limit), total: filtered.length, rarities }, {
    headers: { "Cache-Control": query ? "public, max-age=60, stale-while-revalidate=300" : "public, max-age=300, stale-while-revalidate=1800" },
  });
}

import type { MetadataRoute } from "next";
import tradingMeta from "../data/tradingMeta.json";
import { itemList } from "../lib/search";

const base = "https://csbthub.com";
const publicRoutes = ["", "/values", "/calculator", "/exchange", "/demand", "/trade-feed", "/community", "/trading-servers", "/seminar", "/nich", "/about", "/feedback", "/community-guidelines", "/privacy", "/terms"];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(tradingMeta.generatedAt);
  return [
    ...publicRoutes.map((path, index) => ({
      url: `${base}${path || "/"}`,
      lastModified,
      changeFrequency: path === "/values" || path === "/demand" || path === "/exchange" ? "daily" as const : "weekly" as const,
      priority: index === 0 ? 1 : path === "/values" ? 0.95 : path === "/exchange" ? 0.9 : 0.7,
    })),
    ...itemList.map((item) => ({
      url: `${base}/values/${encodeURIComponent(item.ID)}`,
      lastModified: item.UPDATED_AT ? new Date(item.UPDATED_AT) : lastModified,
      changeFrequency: "weekly" as const,
      priority: item.DEMAND_TIER === "S" ? 0.85 : item.DEMAND_TIER === "A" ? 0.8 : 0.65,
    })),
  ];
}

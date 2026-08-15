import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/notifications",
        "/profile",
        "/inventory",
        "/wishlist",
        "/exchange/rooms/",
        "/exchange/moderation",
        "/exchange/middleman",
      ],
    },
    sitemap: "https://csbthub.com/sitemap.xml",
    host: "https://csbthub.com",
  };
}

import type { NextConfig } from "next";

const cspReportOnly = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com",
  "connect-src 'self' https: wss:",
  "media-src 'self' blob: https:",
  "worker-src 'self' blob:",
].join("; ");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "elvebredd.com",
        port: "",
        pathname: "/images/pets/**",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
    ];
    if (process.env.NODE_ENV === "production") {
      securityHeaders.push({ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" });
    }
    const staticAssetCacheHeaders = [
      { key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" },
    ];

    return [
      { source: "/logo.png", headers: staticAssetCacheHeaders },
      { source: "/apple-touch-icon.png", headers: staticAssetCacheHeaders },
      { source: "/favicon.ico", headers: staticAssetCacheHeaders },
      { source: "/nich/:path*", headers: staticAssetCacheHeaders },
      { source: "/about/:path*", headers: staticAssetCacheHeaders },
      { source: "/:path*", headers: securityHeaders },
    ];
  },
};

export default nextConfig;

import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());

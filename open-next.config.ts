import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

/**
 * CSBT is predominantly build-time/static content. Serving prerendered routes
 * from Workers Static Assets avoids spinning up the NextServer for every page
 * request, which is important on the Workers Free 10 ms CPU budget.
 *
 * The app does not use ISR/on-demand revalidation. Dynamic API routes still
 * execute normally; only build-time cache entries are intercepted here.
 */
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: true,
});

# CSBT HUB — Cloudflare Error 1102 CPU Fix

## What was happening

The production Worker was spending more CPU than the Workers Free request budget on some requests. The project was also using the default OpenNext cache configuration, so prerendered/SSG routes could still enter the NextServer instead of being served directly from Workers Static Assets.

## Fixes applied

1. **Enabled OpenNext static-assets incremental caching + cache interception**
   - `open-next.config.ts`
   - Prerendered routes can be served without loading the NextServer on every request.

2. **Moved static-file cache rules to `public/_headers`**
   - Keeps immutable Next build assets cached for one year.
   - Caches CSBT logo/Nich/about public images for one week.
   - Removed ineffective `next.config.ts` cache rules for files served directly by Workers Static Assets.

3. **Removed `/api/items` from the Values page hot path**
   - Search/filter/sort/pagination now use the already-generated compact catalog locally in the browser.
   - Opening Values and typing searches no longer creates repeated Worker API invocations.

4. **Pre-rendered all known item detail pages**
   - `/values/[id]` now has `generateStaticParams()` and `dynamicParams = false`.
   - Known item pages are generated at build time rather than rendered by the Worker per visit.

5. **Made the Demand API lighter**
   - Added `src/data/petImageIndex.json` (~54 KB) specifically for PET name/image lookup.
   - The Demand route no longer imports the ~630 KB compact full catalog or ~1.6 MB full database just to find pet images.
   - Updated the data generator so the small PET image index is regenerated automatically.
   - Removed Next ISR caching from the external AMVGG fetch because this project now uses the read-only static-assets incremental cache for build-time pages.
   - Added short browser caching to reduce repeat API calls.

6. **Added short browser caching to public value-history responses**
   - Reduces repeat calls while keeping history reasonably fresh.

7. **Pinned deployment-critical versions**
   - Next.js: `16.2.11`
   - OpenNext Cloudflare: `1.20.2`
   - Wrangler: `4.123.0`
   - `@next/third-parties`: `16.3.0`
   - Prevents a fresh `npm install` from silently moving these deployment-critical packages to a newer minor version.

## Validation completed here

- Patched TypeScript/TSX files: **0 syntax/transpile diagnostics** using TypeScript parser/transpilation checks.
- `package.json`: valid JSON.
- `wrangler.jsonc`: valid JSON.
- New PET image index generated successfully: **770 PET rows**.
- Verified the Values page no longer references `/api/items`.

### Validation limitation

A full `npm ci` / `npm run build` could not be completed inside this sandbox because the dependency packages were not available in the local npm cache and the install could not finish here. **Run the commands below on your PC before production deployment.**

## Safe deployment steps

Keep the currently rolled-back working Cloudflare version live while testing this folder.

```powershell
npm ci
npm run lint
npm run build
npm run preview
```

Check the important pages locally, especially:

- `/`
- `/values`
- several `/values/<item-id>` pages
- `/demand`
- `/calculator`
- `/inventory`
- `/nich`

When those pass:

```powershell
npm run deploy
```

After deployment, watch Cloudflare **Metrics** and **Observability**. The key target is for normal page visits to stop repeatedly consuming the NextServer CPU path and for Error 1102 events to fall sharply.

## Important note about NICH/API routes

Static-page caching fixes the main site path, but genuinely dynamic endpoints such as NICH AI/vision still execute Worker code. If Error 1102 remains only when using those endpoints, profile those specific requests next; they may still need additional route-specific optimization or a higher Worker CPU allowance.

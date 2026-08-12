# CSBT Exchange Final QA

## Scope completed

CSBT Exchange is layered on top of the existing CSBT profiles, inventory, wishlist, notifications, values, demand, Nich, and Trade Voting systems. Existing marketplace/listing files did not exist in the uploaded source; Exchange was added as a new feature set without deleting any original source file.

## Safety and data-integrity checks

- Listing and offer creation use atomic Supabase RPCs.
- Listing/offer item IDs and Normal/Neon/Mega variants are validated against the latest server-side `value_history` catalog.
- Offer totals and the value-compatibility score are recomputed server-side; browser-provided totals are not trusted for market analytics.
- Accepted-item market signals are transaction-implied from real accepted trade ratios rather than copied directly from the current value list.
- Direct browser inserts/edits for protected Exchange records are revoked where the RPC workflow is required.
- External links are blocked in listings, offers, and Trade Room messages.
- Trade Rooms keep an immutable accepted-offer snapshot.
- Trust Score penalties only use reports that approved CSBT staff explicitly uphold.
- Middleman and moderation roles are admin-managed; members cannot self-approve.
- Public telemetry is written through a service-role API route with hashed fingerprints and per-minute rate limits.

## Source validation completed in the build environment

- Targeted strict TypeScript validation for Exchange, touched profile/navigation integrations, Nich integration, and Demand integration passed using TypeScript 5.8.3 with framework shims because npm dependencies could not be fetched in the container.
- All TS/TSX files were syntax-parsed with the TypeScript parser.
- All relative local imports were checked for resolvable targets.
- All project JSON files were parsed.
- All JS/MJS scripts passed `node --check`.
- The current tree was compared against the original uploaded ZIP; no original source file was missing and no suspicious file truncation was detected.
- `package.json` and `package-lock.json` remain unchanged from the uploaded project.

## Environment limitation

A real `next build` could not be executed in the container because npm dependency restoration failed due the environment's registry/network ClientError/EAI_AGAIN behavior. Run the normal production build on the user's PC after copying the project:

```powershell
npm install --no-audit --no-fund
npm run build
```

If the local build reports an error, fix that exact error before deployment.

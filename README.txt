CSBT Exchange ListingDetail TypeScript null-narrowing fix

Replace this file in your project:
src/components/exchange/ListingDetail.tsx

What changed:
- blockTrader() now captures supabase locally as actionClient and checks !actionClient before use.
- reportListing() does the same.
- This fixes Next/TypeScript reporting that the outer render-scoped client may be null inside async callbacks.

After copying, run:
npm run build

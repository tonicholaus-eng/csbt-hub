CSBT Exchange nullable Supabase client hotfix

Fixes the strict TypeScript build failure:
  'supabase' is possibly 'null'

Files patched:
- src/components/exchange/ListingDetail.tsx
- src/components/exchange/ExchangeHub.tsx
- src/components/exchange/ModerationDesk.tsx
- src/components/exchange/MiddlemanDesk.tsx
- src/components/exchange/TradeRoomExperience.tsx

The fix captures the nullable Supabase client into a locally narrowed `client` constant before async handlers, callbacks, and realtime cleanup closures use it.

Apply:
1. Copy everything INSIDE this patch folder into the project root.
2. Replace existing files.
3. Run: npm run build

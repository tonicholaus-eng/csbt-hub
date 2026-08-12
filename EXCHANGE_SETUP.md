# CSBT Exchange Setup

## 1. Apply the Exchange migration

Your existing CSBT Foundation / Phase Two tables stay in place.

Open Supabase -> SQL Editor and run the entire file:

```text
src/lib/supabase/exchange.sql
```

For a brand-new Supabase setup, the current `src/lib/supabase/foundation.sql` also contains the Exchange migration at the end.

## 2. Confirm value history is populated

Exchange validates listing and offer items against the server-side `value_history` table so browser dev tools cannot forge market snapshots. Before opening Exchange to members, make sure at least one current snapshot exists:

```powershell
npm run snapshot:values
```

Your normal `npm run refresh:values` / `npm run refresh:deploy` workflow will keep future snapshots current.

## 3. Server environment

The Exchange telemetry route uses the server-only Supabase secret that the CSBT value-history scripts already use.

Use either:

```env
SUPABASE_SECRET_KEY=sb_secret_...
```

or the backwards-compatible:

```env
SUPABASE_SERVICE_ROLE_KEY=...
```

Never prefix this secret with `NEXT_PUBLIC_`.

## 4. Approve CSBT middlemen

Middlemen are intentionally admin-managed. A normal member cannot approve themselves.

Find the staff member's Supabase Auth user UUID, then run an example like:

```sql
insert into public.middleman_roster (user_id, display_name, status)
values ('USER_UUID_HERE', 'Staff Name', 'OFFLINE')
on conflict (user_id) do update set display_name = excluded.display_name;
```

They can then open:

```text
/exchange/middleman
```

and set themselves Online when accepting cases.

## 5. Approve Exchange moderators

```sql
insert into public.exchange_staff (user_id, display_name, role)
values ('USER_UUID_HERE', 'Staff Name', 'MODERATOR')
on conflict (user_id) do update set display_name = excluded.display_name, role = excluded.role;
```

Valid roles are `MODERATOR` and `ADMIN`.

Staff then use:

```text
/exchange/moderation
```

## 6. Build locally

```powershell
npm install --no-audit --no-fund
npm run build
npm run dev
```

## 7. Test before publishing

Use two normal CSBT accounts (and optionally one approved middleman account):

1. Account A saves an inventory and creates an Exchange listing.
2. Account B opens `/exchange`, checks its Smart Match, and sends an offer.
3. Account A counters or accepts.
4. Confirm an accepted offer creates a locked Trade Room.
5. Send structured messages and verify external links are rejected.
6. Request a middleman and verify it appears in `/exchange/middleman`.
7. Both traders confirm completion and leave reviews.
8. Submit a test report and verify an approved moderator can review it in `/exchange/moderation`.
9. Open the Market tab and verify live signals begin collecting.

## Important

Exchange starts with zero genuine CSBT accepted-trade history. The **CSBT Market** column intentionally says `Collecting` until actual accepted item signals exist. Do not backfill fake market activity.

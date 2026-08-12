# CSBT HUB Foundation Setup

This revision adds the account/profile, notifications, value history, watchlist alerts, and saved trade-history foundation.

## 1. Apply the Supabase migration

Open your existing Supabase project:

1. Go to **SQL Editor**.
2. Open `src/lib/supabase/foundation.sql` from this project.
3. Copy the full SQL file into the SQL Editor.
4. Run it once.

The migration is designed to be safe to re-run. It creates or extends:

- `profiles`
- `notification_preferences`
- `notifications`
- `value_watchlist`
- `value_history`
- `trade_history`
- avatar storage policies
- realtime publication entries
- community post rate limiting

It also creates a welcome notification for existing accounts.

### Existing CSBT installs

If you already ran `foundation.sql` before the inventory/community upgrade, run `src/lib/supabase/phase-two.sql` once as well. It adds saved inventory, wishlist, community W/F/L voting, and feedback tables. Fresh installs can simply run the current `foundation.sql`, which includes the phase-two schema.

## 2. Add the Supabase secret key privately

The public Supabase URL and anon key already power the browser-side features. Automated value snapshots and alert generation require a server-only key.

Add this to `.env.local` for local development:

```env
SUPABASE_SECRET_KEY=your_secret_key
```

Standalone value scripts automatically load `.env.local`, so `npm run snapshot:values` and `npm run alerts:values` work locally without manually exporting the variables.

Add the same variable in Vercel project environment variables for production.

**Security:** never rename this to `NEXT_PUBLIC_SUPABASE_SECRET_KEY`, never expose it in browser code, and never commit `.env.local`.

## 3. Start the site

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## 4. Start value history

After the migration and secret key are ready:

```bash
npm run snapshot:values
```

The first snapshot establishes the baseline. A value chart needs at least two snapshots.

Your normal refresh command now also records a snapshot and processes watchlist alerts:

```bash
npm run refresh:values
```

That command runs:

1. Elve refresh
2. Data generation
3. Data validation
4. Value-history snapshot
5. Value-alert processing

## New routes

- `/profile` — CSBT account/profile and activity hub
- `/notifications` — notification inbox and preferences
- `/trades` — saved calculator trade history/status
- `/inventory` — inventory calculator and profile-saved inventory
- `/wishlist` — wishlist and value-alert controls
- `/trade-feed` — community Win / Fair / Lose voting
- `/feedback` — value, missing-item, bug, and feature feedback
- `/values/[id]` — dedicated item value/history pages

## Roblox

The profile schema includes `roblox_username` and a separate `roblox_user_id` field so OAuth can be added later. The current Roblox username field is intentionally marked **unverified**. This revision does not ask users for Roblox passwords, cookies, or session tokens.

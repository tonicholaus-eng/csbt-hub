CSBT Exchange - ambiguous item SQL hotfix

Problem fixed:
  column reference "item" is ambiguous

Cause:
  marketplace_create_listing and marketplace_create_offer used `item` as both
  a PL/pgSQL variable and a jsonb_array_elements SQL alias.

Apply now:
1. Open Supabase > SQL Editor > New Query.
2. Open src/lib/supabase/exchange-item-alias-hotfix.sql from this patch.
3. Copy the ENTIRE SQL file into Supabase and click Run.
4. Expected result: Success. No rows returned.
5. Retry Publish Listing. No app rebuild is needed for the live database fix.

Project source update:
Copy src/lib/supabase/exchange.sql and foundation.sql into your local project too,
so the fixed RPC definitions remain in source control/future setup files.

The hotfix replaces only:
- public.marketplace_create_listing(...)
- public.marketplace_create_offer(...)

It does not delete listings, users, value history, profiles, or Exchange data.

-- Privacy-limited persistent NICH preferences. Conversation/trade screenshots are
-- intentionally not stored here; this table only keeps explicit user aliases and
-- small assistant preferences that remain useful across sessions.
create table if not exists public.nich_user_memory (
  user_id uuid primary key references auth.users(id) on delete cascade,
  aliases jsonb not null default '{}'::jsonb check (jsonb_typeof(aliases) = 'object'),
  preferred_value_source text check (preferred_value_source in ('GCASH', 'ELVE')),
  response_style text check (response_style in ('concise', 'balanced')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.nich_user_memory enable row level security;

revoke all on public.nich_user_memory from public, anon;
grant select, insert, update, delete on public.nich_user_memory to authenticated;

drop policy if exists "Members read own NICH memory" on public.nich_user_memory;
create policy "Members read own NICH memory"
on public.nich_user_memory for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Members create own NICH memory" on public.nich_user_memory;
create policy "Members create own NICH memory"
on public.nich_user_memory for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Members update own NICH memory" on public.nich_user_memory;
create policy "Members update own NICH memory"
on public.nich_user_memory for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Members delete own NICH memory" on public.nich_user_memory;
create policy "Members delete own NICH memory"
on public.nich_user_memory for delete to authenticated
using ((select auth.uid()) = user_id);

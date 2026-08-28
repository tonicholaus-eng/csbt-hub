-- ===========================================================================
-- PREPARED, NOT APPLIED. See supabase/migrations_pending/README.md.
--
-- Gives public.nich_user_memory a game dimension so MM2 assistant preferences
-- can be persisted without sharing a row with Adopt Me.
--
-- Non-destructive by construction:
--   * no DROP TABLE, no DROP COLUMN, no DELETE
--   * every existing row is Adopt Me and is labelled as such by the DEFAULT,
--     so there is no backfill and no window where a row is unlabelled
--   * re-runnable: every statement is guarded
-- ===========================================================================

-- 1. The game dimension. Existing rows predate MM2 NICH, so 'adopt-me' is not
--    a guess — it is the only thing they can be.
alter table public.nich_user_memory
  add column if not exists game_id text not null default 'adopt-me';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.nich_user_memory'::regclass
      and conname = 'nich_user_memory_game_id_check'
  ) then
    alter table public.nich_user_memory
      add constraint nich_user_memory_game_id_check
      check (game_id in ('adopt-me', 'mm2'));
  end if;
end $$;

-- 2. One row per user per game.
do $$
declare
  primary_key_name text;
begin
  select conname into primary_key_name
  from pg_constraint
  where conrelid = 'public.nich_user_memory'::regclass
    and contype = 'p';

  -- Only rewrite the key if it is still the single-column one.
  if primary_key_name is not null and (
    select count(*) from pg_index
    where indrelid = 'public.nich_user_memory'::regclass
      and indisprimary
      and array_length(indkey::int2[], 1) = 1
  ) = 1 then
    execute format('alter table public.nich_user_memory drop constraint %I', primary_key_name);
    alter table public.nich_user_memory
      add constraint nich_user_memory_pkey primary key (user_id, game_id);
  end if;
end $$;

-- 3. Value sources are per game and must not cross.
--    Adopt Me prices in GCash and Elve Shark; MM2 in Supreme and GCash. The old
--    constraint allowed only the Adopt Me pair, which would reject every MM2
--    row; replacing it with a permissive list would allow an MM2 row to claim
--    ELVE. This keeps both games honest at the database level.
alter table public.nich_user_memory
  drop constraint if exists nich_user_memory_preferred_value_source_check;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.nich_user_memory'::regclass
      and conname = 'nich_user_memory_value_source_per_game_check'
  ) then
    alter table public.nich_user_memory
      add constraint nich_user_memory_value_source_per_game_check
      check (
        preferred_value_source is null
        or (game_id = 'adopt-me' and preferred_value_source in ('GCASH', 'ELVE'))
        or (game_id = 'mm2'      and preferred_value_source in ('SUPREME', 'GCASH'))
      );
  end if;
end $$;

-- 4. Reading a user's memory for one game stays a single-index lookup.
create index if not exists nich_user_memory_user_game_idx
  on public.nich_user_memory (user_id, game_id);

-- RLS policies are unchanged: they key off user_id only, which is still correct
-- because game_id never widens who may read a row.

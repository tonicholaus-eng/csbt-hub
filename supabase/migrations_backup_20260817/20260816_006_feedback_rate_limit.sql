-- Durable, server-only anonymous feedback throttling.
-- Non-destructive: no existing feedback rows are changed.
create table if not exists public.feedback_rate_limits (
  fingerprint text not null,
  bucket timestamptz not null,
  submission_count integer not null default 1 check (submission_count > 0),
  primary key (fingerprint, bucket)
);

alter table public.feedback_rate_limits enable row level security;
revoke all on public.feedback_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on public.feedback_rate_limits to service_role;

create or replace function public.feedback_consume_quota(
  p_fingerprint text,
  p_limit integer default 5,
  p_window_minutes integer default 15
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_limit integer := greatest(1, least(coalesce(p_limit, 5), 100));
  normalized_window integer := greatest(1, least(coalesce(p_window_minutes, 15), 1440));
  window_seconds integer := normalized_window * 60;
  window_start timestamptz := to_timestamp(floor(extract(epoch from now()) / window_seconds) * window_seconds);
  next_count integer;
begin
  if char_length(coalesce(p_fingerprint, '')) < 32 then return false; end if;

  insert into public.feedback_rate_limits (fingerprint, bucket, submission_count)
  values (p_fingerprint, window_start, 1)
  on conflict (fingerprint, bucket) do update
  set submission_count = public.feedback_rate_limits.submission_count + 1
  returning submission_count into next_count;

  return next_count <= normalized_limit;
end;
$$;

revoke all on function public.feedback_consume_quota(text,integer,integer) from public, anon, authenticated;
grant execute on function public.feedback_consume_quota(text,integer,integer) to service_role;

create or replace function public.feedback_prune_rate_limits()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare deleted_count integer;
begin
  delete from public.feedback_rate_limits where bucket < now() - interval '2 days';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.feedback_prune_rate_limits() from public, anon, authenticated;
grant execute on function public.feedback_prune_rate_limits() to service_role;

-- Durable NICH rate-limit state for serverless deployments.
create table if not exists public.nich_usage_buckets (
  bucket_key text primary key,
  request_count integer not null default 0 check (request_count >= 0),
  reset_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.nich_usage_buckets enable row level security;
revoke all on public.nich_usage_buckets from public, anon, authenticated;
grant select, insert, update, delete on public.nich_usage_buckets to service_role;

create or replace function public.nich_consume_quota(
  p_bucket_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_limit integer := greatest(1, least(coalesce(p_limit, 1), 100000));
  normalized_window integer := greatest(1, least(coalesce(p_window_seconds, 60), 86400));
  next_count integer;
begin
  if char_length(coalesce(p_bucket_key, '')) < 16 then return false; end if;

  insert into public.nich_usage_buckets (bucket_key, request_count, reset_at, updated_at)
  values (p_bucket_key, 1, now() + make_interval(secs => normalized_window), now())
  on conflict (bucket_key) do update
  set request_count = case
        when public.nich_usage_buckets.reset_at <= now() then 1
        else public.nich_usage_buckets.request_count + 1
      end,
      reset_at = case
        when public.nich_usage_buckets.reset_at <= now() then now() + make_interval(secs => normalized_window)
        else public.nich_usage_buckets.reset_at
      end,
      updated_at = now()
  returning request_count into next_count;

  return next_count <= normalized_limit;
end;
$$;

revoke all on function public.nich_consume_quota(text,integer,integer) from public, anon, authenticated;
grant execute on function public.nich_consume_quota(text,integer,integer) to service_role;

create or replace function public.nich_prune_usage_buckets()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare deleted_count integer;
begin
  delete from public.nich_usage_buckets where reset_at < now() - interval '2 days';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.nich_prune_usage_buckets() from public, anon, authenticated;
grant execute on function public.nich_prune_usage_buckets() to service_role;

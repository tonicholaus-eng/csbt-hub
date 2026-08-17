-- Retention helpers for pseudonymous abuse/rate-limit telemetry.
-- Accepted/completed trade intelligence is preserved. Only short-lived client telemetry is pruned.
create index if not exists marketplace_event_rate_limits_bucket_idx on public.marketplace_event_rate_limits (bucket);
create index if not exists marketplace_events_created_type_idx on public.marketplace_events (created_at, event_type);

create or replace function public.marketplace_prune_short_lived_telemetry(
  p_client_event_days integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_buckets integer := 0;
  deleted_events integer := 0;
  keep_days integer := greatest(7, least(coalesce(p_client_event_days, 30), 365));
begin
  delete from public.marketplace_event_rate_limits where bucket < now() - interval '2 days';
  get diagnostics deleted_buckets = row_count;

  delete from public.marketplace_events
  where created_at < now() - make_interval(days => keep_days)
    and event_type in ('LISTING_VIEW','SEARCH','MATCH_VIEW','OFFER_BUILDER_OPEN');
  get diagnostics deleted_events = row_count;

  return jsonb_build_object('rate_buckets', deleted_buckets, 'client_events', deleted_events);
end;
$$;

revoke all on function public.marketplace_prune_short_lived_telemetry(integer) from public, anon, authenticated;
grant execute on function public.marketplace_prune_short_lived_telemetry(integer) to service_role;

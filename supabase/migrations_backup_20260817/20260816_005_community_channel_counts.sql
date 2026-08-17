-- Lightweight counts for Lounge navigation so clients do not load every channel's posts.
create or replace function public.community_channel_counts()
returns table(channel_slug text, post_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select p.channel_slug, count(*)::bigint
  from public.community_posts p
  group by p.channel_slug;
$$;

revoke all on function public.community_channel_counts() from public;
grant execute on function public.community_channel_counts() to anon, authenticated;

-- CSBT Discord-style live community feed
-- Run this entire file in Supabase Dashboard > SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  content text not null default '',
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint community_posts_display_name_length
    check (
      char_length(trim(display_name))
      between 2 and 32
    ),

  constraint community_posts_content_length
    check (
      char_length(content) <= 2000
    ),

  constraint community_posts_has_content
    check (
      char_length(trim(content)) > 0
      or image_path is not null
    )
);

create index if not exists
  community_posts_created_at_idx
on public.community_posts (
  created_at desc
);

create index if not exists
  community_posts_user_id_idx
on public.community_posts (
  user_id
);

create or replace function
  public.set_community_post_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists
  set_community_post_updated_at
on public.community_posts;

create trigger
  set_community_post_updated_at
before update
on public.community_posts
for each row
execute function
  public.set_community_post_updated_at();

alter table
  public.community_posts
enable row level security;

drop policy if exists
  "Anyone can read community posts"
on public.community_posts;

create policy
  "Anyone can read community posts"
on public.community_posts
for select
to anon, authenticated
using (true);

drop policy if exists
  "Members can create their own posts"
on public.community_posts;

create policy
  "Members can create their own posts"
on public.community_posts
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
);

drop policy if exists
  "Members can update their own posts"
on public.community_posts;

create policy
  "Members can update their own posts"
on public.community_posts
for update
to authenticated
using (
  (select auth.uid()) = user_id
)
with check (
  (select auth.uid()) = user_id
);

drop policy if exists
  "Members can delete their own posts"
on public.community_posts;

create policy
  "Members can delete their own posts"
on public.community_posts
for delete
to authenticated
using (
  (select auth.uid()) = user_id
);

grant select
on public.community_posts
to anon, authenticated;

grant insert, update, delete
on public.community_posts
to authenticated;

alter table
  public.community_posts
replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'community_posts'
  ) then
    alter publication
      supabase_realtime
    add table
      public.community_posts;
  end if;
end
$$;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'community-images',
  'community-images',
  true,
  5242880,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ]
)
on conflict (id)
do update set
  public = excluded.public,
  file_size_limit =
    excluded.file_size_limit,
  allowed_mime_types =
    excluded.allowed_mime_types;

drop policy if exists
  "Anyone can view community images"
on storage.objects;

create policy
  "Anyone can view community images"
on storage.objects
for select
to public
using (
  bucket_id = 'community-images'
);

drop policy if exists
  "Members can upload their own community images"
on storage.objects;

create policy
  "Members can upload their own community images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'community-images'
  and (
    storage.foldername(name)
  )[1] = (
    select auth.uid()
  )::text
);

drop policy if exists
  "Members can update their own community images"
on storage.objects;

create policy
  "Members can update their own community images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'community-images'
  and owner_id = (
    select auth.uid()
  )::text
)
with check (
  bucket_id = 'community-images'
  and owner_id = (
    select auth.uid()
  )::text
);

drop policy if exists
  "Members can delete their own community images"
on storage.objects;

create policy
  "Members can delete their own community images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'community-images'
  and owner_id = (
    select auth.uid()
  )::text
);

-- =========================
-- CSBT Lounge upgrade
-- =========================
create extension if not exists pgcrypto;

alter table public.community_posts
  add column if not exists channel_slug text not null default 'general';

alter table public.community_posts
  drop constraint if exists community_posts_channel_slug_check;

alter table public.community_posts
  add constraint community_posts_channel_slug_check
  check (channel_slug in (
    'general',
    'announcements',
    'trade-chat',
    'looking-for-offers',
    'trade-help',
    'wins-and-trades',
    'value-discussion',
    'demand-talk',
    'screenshots',
    'memes',
    'inventory-flex'
  ));

create index if not exists community_posts_channel_created_idx
  on public.community_posts (channel_slug, created_at desc);

-- Reactions ---------------------------------------------------------------
create table if not exists public.community_reactions (
  id bigint generated by default as identity primary key,
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (post_id, user_id, emoji),
  constraint community_reactions_emoji_check
    check (emoji in ('👍','😂','🔥','😭','🤝','W','F','L'))
);

create index if not exists community_reactions_post_idx
  on public.community_reactions (post_id, created_at);

alter table public.community_reactions enable row level security;

drop policy if exists "Anyone can read lounge reactions" on public.community_reactions;
create policy "Anyone can read lounge reactions"
  on public.community_reactions for select
  to anon, authenticated using (true);

drop policy if exists "Members add own lounge reactions" on public.community_reactions;
create policy "Members add own lounge reactions"
  on public.community_reactions for insert
  to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Members remove own lounge reactions" on public.community_reactions;
create policy "Members remove own lounge reactions"
  on public.community_reactions for delete
  to authenticated using ((select auth.uid()) = user_id);

grant select on public.community_reactions to anon, authenticated;
grant insert, delete on public.community_reactions to authenticated;

-- Threads / replies -------------------------------------------------------
create table if not exists public.community_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_replies_display_name_length check (char_length(trim(display_name)) between 2 and 32),
  constraint community_replies_content_length check (char_length(trim(content)) between 1 and 1000)
);

create index if not exists community_replies_post_created_idx
  on public.community_replies (post_id, created_at);

alter table public.community_replies enable row level security;

drop policy if exists "Anyone can read lounge replies" on public.community_replies;
create policy "Anyone can read lounge replies"
  on public.community_replies for select
  to anon, authenticated using (true);

drop policy if exists "Members create own lounge replies" on public.community_replies;
create policy "Members create own lounge replies"
  on public.community_replies for insert
  to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Members delete own lounge replies" on public.community_replies;
create policy "Members delete own lounge replies"
  on public.community_replies for delete
  to authenticated using ((select auth.uid()) = user_id);

grant select on public.community_replies to anon, authenticated;
grant insert, delete on public.community_replies to authenticated;

-- Keep #announcements staff-only while preserving normal member posting.
-- The helper intentionally tolerates installations where Exchange has not been installed yet.
create or replace function public.can_post_lounge_channel(p_channel text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  allowed boolean := false;
begin
  if p_channel <> 'announcements' then
    return true;
  end if;

  if to_regclass('public.exchange_staff') is null then
    return false;
  end if;

  execute 'select exists (select 1 from public.exchange_staff where user_id = $1)'
    into allowed
    using auth.uid();

  return allowed;
end;
$$;

grant execute on function public.can_post_lounge_channel(text) to authenticated;

drop policy if exists "Members can create their own posts" on public.community_posts;
create policy "Members can create their own posts"
  on public.community_posts for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and public.can_post_lounge_channel(channel_slug)
  );

alter table public.community_reactions replica identity full;
alter table public.community_replies replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'community_reactions'
  ) then
    alter publication supabase_realtime add table public.community_reactions;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'community_replies'
  ) then
    alter publication supabase_realtime add table public.community_replies;
  end if;
end
$$;

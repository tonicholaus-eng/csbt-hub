-- Limit public profile reads to an intentional projection while preserving owner access.
-- Non-destructive: no profile data is deleted.
create or replace view public.public_profiles as
select
  user_id,
  display_name,
  avatar_path,
  roblox_username,
  (roblox_user_id is not null) as roblox_verified,
  bio,
  created_at,
  updated_at
from public.profiles;

revoke all on public.public_profiles from public, anon, authenticated;
grant select on public.public_profiles to anon, authenticated;

drop policy if exists "Profiles are publicly readable" on public.profiles;
drop policy if exists "Members read own profile" on public.profiles;
create policy "Members read own profile" on public.profiles
for select to authenticated
using (user_id = (select auth.uid()));

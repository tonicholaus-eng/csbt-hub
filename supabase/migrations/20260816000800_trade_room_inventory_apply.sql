-- Explicit, idempotent Trade Room -> Inventory application.
-- Existing inventories are never changed automatically. A participant must call the RPC after
-- both sides have confirmed the room as COMPLETED.
create table if not exists public.trade_room_inventory_applies (
  room_id uuid not null references public.trade_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  applied_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

alter table public.trade_room_inventory_applies enable row level security;
drop policy if exists "Members read own trade inventory applications" on public.trade_room_inventory_applies;
create policy "Members read own trade inventory applications" on public.trade_room_inventory_applies
for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.trade_room_inventory_applies from public, anon;
grant select on public.trade_room_inventory_applies to authenticated;

create or replace function public.marketplace_apply_completed_trade_to_inventory(p_room_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  room public.trade_rooms%rowtype;
  outgoing jsonb;
  incoming jsonb;
  rec record;
  marker_created boolean := false;
begin
  select * into room from public.trade_rooms where id = p_room_id for update;
  if room.id is null then raise exception 'Trade room not found'; end if;
  if auth.uid() not in (room.user_a, room.user_b) then raise exception 'Not a room participant'; end if;
  if room.status <> 'COMPLETED' then raise exception 'Both traders must confirm completion before inventory can be updated'; end if;

  insert into public.trade_room_inventory_applies (room_id, user_id)
  values (p_room_id, auth.uid())
  on conflict (room_id, user_id) do nothing
  returning true into marker_created;

  if not coalesce(marker_created, false) then
    return 'ALREADY_APPLIED';
  end if;

  if auth.uid() = room.user_a then
    outgoing := coalesce(room.lock_snapshot -> 'sender_items', '[]'::jsonb);
    incoming := coalesce(room.lock_snapshot -> 'recipient_items', '[]'::jsonb);
  else
    outgoing := coalesce(room.lock_snapshot -> 'recipient_items', '[]'::jsonb);
    incoming := coalesce(room.lock_snapshot -> 'sender_items', '[]'::jsonb);
  end if;

  if jsonb_typeof(outgoing) <> 'array' or jsonb_typeof(incoming) <> 'array' then
    raise exception 'Locked trade snapshot is invalid';
  end if;

  -- Aggregate matching stacks before validating so duplicate lines cannot under-count
  -- the outgoing quantity. The locked snapshot remains the source of truth.
  for rec in
    select
      value ->> 'item_id' as item_id,
      case when coalesce(value ->> 'value_type', 'NORMAL') in ('NORMAL','NEON','MEGA')
        then coalesce(value ->> 'value_type', 'NORMAL') else 'NORMAL' end as value_type,
      case when coalesce(value ->> 'potion_status', 'BASE') in ('BASE','NO_POTION','RIDE','FLY','FLY_RIDE')
        then coalesce(value ->> 'potion_status', 'BASE') else 'BASE' end as potion_status,
      sum(greatest(1, least(999, coalesce((value ->> 'quantity')::integer, 1))))::integer as quantity
    from jsonb_array_elements(outgoing)
    group by 1, 2, 3
  loop
    if rec.item_id is null or not exists (
      select 1 from public.inventory_items i
      where i.user_id = auth.uid()
        and i.item_id = rec.item_id
        and i.value_type = rec.value_type
        and i.potion_status = rec.potion_status
        and i.quantity >= rec.quantity
    ) then
      raise exception 'Your saved inventory does not contain enough outgoing items to apply this trade safely';
    end if;
  end loop;

  for rec in
    select
      value ->> 'item_id' as item_id,
      case when coalesce(value ->> 'value_type', 'NORMAL') in ('NORMAL','NEON','MEGA')
        then coalesce(value ->> 'value_type', 'NORMAL') else 'NORMAL' end as value_type,
      case when coalesce(value ->> 'potion_status', 'BASE') in ('BASE','NO_POTION','RIDE','FLY','FLY_RIDE')
        then coalesce(value ->> 'potion_status', 'BASE') else 'BASE' end as potion_status,
      sum(greatest(1, least(999, coalesce((value ->> 'quantity')::integer, 1))))::integer as quantity
    from jsonb_array_elements(outgoing)
    group by 1, 2, 3
  loop
    delete from public.inventory_items i
    where i.user_id = auth.uid()
      and i.item_id = rec.item_id
      and i.value_type = rec.value_type
      and i.potion_status = rec.potion_status
      and i.quantity = rec.quantity;

    update public.inventory_items i
    set quantity = i.quantity - rec.quantity
    where i.user_id = auth.uid()
      and i.item_id = rec.item_id
      and i.value_type = rec.value_type
      and i.potion_status = rec.potion_status
      and i.quantity > rec.quantity;
  end loop;

  for rec in
    select
      value ->> 'item_id' as item_id,
      case when coalesce(value ->> 'value_type', 'NORMAL') in ('NORMAL','NEON','MEGA')
        then coalesce(value ->> 'value_type', 'NORMAL') else 'NORMAL' end as value_type,
      case when coalesce(value ->> 'potion_status', 'BASE') in ('BASE','NO_POTION','RIDE','FLY','FLY_RIDE')
        then coalesce(value ->> 'potion_status', 'BASE') else 'BASE' end as potion_status,
      sum(greatest(1, least(999, coalesce((value ->> 'quantity')::integer, 1))))::integer as quantity,
      max(coalesce(value ->> 'item_name', value ->> 'item_id')) as item_name,
      max(nullif(value ->> 'image_url', '')) as image_url,
      max(coalesce(value ->> 'category', 'OTHER')) as category
    from jsonb_array_elements(incoming)
    group by 1, 2, 3
  loop
    if rec.item_id is null then
      raise exception 'Locked trade snapshot contains an invalid incoming item';
    end if;
    if rec.quantity > 999 or coalesce((
      select i.quantity from public.inventory_items i
      where i.user_id = auth.uid()
        and i.item_id = rec.item_id
        and i.value_type = rec.value_type
        and i.potion_status = rec.potion_status
    ), 0) + rec.quantity > 999 then
      raise exception 'Applying this trade would exceed the maximum saved quantity for an incoming item';
    end if;

    insert into public.inventory_items (
      user_id, item_id, item_name, image_url, category, value_type, potion_status, quantity
    ) values (
      auth.uid(), rec.item_id, rec.item_name, rec.image_url, rec.category,
      rec.value_type, rec.potion_status, rec.quantity
    )
    on conflict (user_id, item_id, value_type, potion_status) do update
    set quantity = public.inventory_items.quantity + excluded.quantity,
        item_name = excluded.item_name,
        image_url = coalesce(excluded.image_url, public.inventory_items.image_url),
        category = excluded.category,
        updated_at = now();
  end loop;

  insert into public.trade_room_events (room_id, actor_id, event_type, body)
  values (p_room_id, auth.uid(), 'INVENTORY_APPLIED', 'A trader updated their saved inventory from the completed locked trade.');

  return 'APPLIED';
end;
$$;

revoke all on function public.marketplace_apply_completed_trade_to_inventory(uuid) from public, anon;
grant execute on function public.marketplace_apply_completed_trade_to_inventory(uuid) to authenticated;

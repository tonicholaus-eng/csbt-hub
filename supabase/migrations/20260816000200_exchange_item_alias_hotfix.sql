-- CSBT Exchange hotfix: remove ambiguous PL/pgSQL `item` references.
-- Safe to run on an existing Exchange installation.
-- Replaces only marketplace_create_listing and marketplace_create_offer.

create or replace function public.marketplace_create_listing(
  p_value_source text,
  p_intent text,
  p_title text,
  p_note text,
  p_preferences jsonb,
  p_allow_counteroffers boolean,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_listing_id uuid;
  item_row jsonb;
  normalized_source text := upper(coalesce(p_value_source,'GCASH'));
  normalized_intent text := upper(coalesce(p_intent,'OPEN_OFFERS'));
  normalized_side text;
  normalized_value_type text;
  canonical_name text;
  canonical_category text;
  canonical_value numeric;
  have_count integer := 0;
begin
  if auth.uid() is null then raise exception 'Sign in to create a listing'; end if;
  if normalized_source not in ('GCASH','ELVE') then raise exception 'Invalid value source'; end if;
  if normalized_intent not in ('SPECIFIC','SIMILAR_VALUE','UPGRADE','DOWNGRADE','WISHLIST','OPEN_OFFERS') then raise exception 'Invalid listing intent'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 36 then raise exception 'Listing must contain 1 to 36 item rows'; end if;
  if coalesce(p_title,'') ~* '(https?://|www[.]|discord[.]gg|bit[.]ly|tinyurl[.])' or coalesce(p_note,'') ~* '(https?://|www[.]|discord[.]gg|bit[.]ly|tinyurl[.])' then raise exception 'External links are not allowed in Exchange listings'; end if;

  select count(*) into have_count from jsonb_array_elements(p_items) as item_entry where upper(item_entry->>'side') = 'HAVE';
  if have_count < 1 then raise exception 'Add at least one item you have'; end if;
  if normalized_intent = 'SPECIFIC' and not exists (select 1 from jsonb_array_elements(p_items) as item_entry where upper(item_entry->>'side') = 'WANT') then raise exception 'Specific listings need at least one wanted item'; end if;

  insert into public.marketplace_listings (user_id,value_source,intent,title,note,preferences,allow_counteroffers)
  values (auth.uid(),normalized_source,normalized_intent,nullif(left(trim(coalesce(p_title,'')),90),''),nullif(left(trim(coalesce(p_note,'')),600),''),coalesce(p_preferences,'{}'::jsonb),coalesce(p_allow_counteroffers,true))
  returning id into new_listing_id;

  for item_row in select value from jsonb_array_elements(p_items) as item_entry(value)
  loop
    normalized_side := upper(coalesce(item_row->>'side',''));
    normalized_value_type := upper(coalesce(item_row->>'value_type','NORMAL'));
    if normalized_side not in ('HAVE','WANT') then raise exception 'Invalid listing item side'; end if;
    if normalized_value_type not in ('NORMAL','NEON','MEGA') then raise exception 'Invalid item variant'; end if;
    if nullif(trim(coalesce(item_row->>'item_id','')),'') is null then raise exception 'Missing item ID'; end if;

    canonical_name := null;
    canonical_category := null;
    canonical_value := null;
    select vh.item_name, vh.category, vh.value
      into canonical_name, canonical_category, canonical_value
    from public.value_history vh
    where vh.item_id = item_row->>'item_id'
      and upper(vh.source) = normalized_source
      and upper(vh.value_type) = normalized_value_type
    order by vh.snapshot_date desc, vh.captured_at desc
    limit 1;

    if canonical_name is null then
      raise exception 'Item % / % is not in the current CSBT value catalog', item_row->>'item_id', normalized_value_type;
    end if;

    insert into public.marketplace_listing_items (
      listing_id,side,item_id,item_name,image_url,category,value_type,potion_status,quantity,snapshot_value,demand_tier
    ) values (
      new_listing_id,
      normalized_side,
      item_row->>'item_id',
      left(canonical_name,120),
      case
        when coalesce(item_row->>'image_url','') ~ '^/images/' then item_row->>'image_url'
        when coalesce(item_row->>'image_url','') ~ '^https://elvebredd[.]com/' then item_row->>'image_url'
        else null
      end,
      upper(coalesce(canonical_category,'OTHER')),
      normalized_value_type,
      upper(coalesce(item_row->>'potion_status','BASE')),
      greatest(1,least(99,coalesce((item_row->>'quantity')::integer,1))),
      canonical_value,
      case when upper(coalesce(item_row->>'demand_tier','')) in ('S','A','B','C','D') then upper(item_row->>'demand_tier') else null end
    );
  end loop;

  return new_listing_id;
end;
$$;
grant execute on function public.marketplace_create_listing(text,text,text,text,jsonb,boolean,jsonb) to authenticated;

create or replace function public.marketplace_create_offer(
  p_listing_id uuid,
  p_parent_offer_id uuid,
  p_value_source text,
  p_sender_total numeric,
  p_recipient_total numeric,
  p_compatibility_score integer,
  p_explanation jsonb,
  p_note text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  listing_row public.marketplace_listings%rowtype;
  parent_row public.marketplace_offers%rowtype;
  recipient uuid;
  new_offer_id uuid;
  item_row jsonb;
  sender_count integer;
  recipient_count integer;
  normalized_source text := upper(coalesce(p_value_source,'GCASH'));
  normalized_side text;
  normalized_value_type text;
  canonical_name text;
  canonical_category text;
  canonical_value numeric;
  server_sender_total numeric := 0;
  server_recipient_total numeric := 0;
  server_value_score integer := 70;
begin
  if auth.uid() is null then raise exception 'Sign in to send an offer'; end if;
  select * into listing_row from public.marketplace_listings where id = p_listing_id for update;
  if listing_row.id is null or listing_row.status <> 'OPEN' or listing_row.expires_at <= now() then raise exception 'This listing is no longer open'; end if;
  if normalized_source not in ('GCASH','ELVE') or normalized_source <> listing_row.value_source then raise exception 'Offer value source must match the listing'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 2 or jsonb_array_length(p_items) > 36 then raise exception 'Offer must contain both sides'; end if;
  if coalesce(p_note,'') ~* '(https?://|www[.]|discord[.]gg|bit[.]ly|tinyurl[.])' then raise exception 'External links are not allowed in Exchange offers'; end if;

  if p_parent_offer_id is null then
    recipient := listing_row.user_id;
  else
    if not listing_row.allow_counteroffers then raise exception 'This listing does not allow counteroffers'; end if;
    select * into parent_row from public.marketplace_offers where id = p_parent_offer_id for update;
    if parent_row.id is null or parent_row.listing_id <> p_listing_id then raise exception 'Counteroffer chain mismatch'; end if;
    if parent_row.recipient_id <> auth.uid() or parent_row.status <> 'PENDING' then raise exception 'The original offer cannot be countered'; end if;
    recipient := parent_row.sender_id;
  end if;

  if recipient = auth.uid() then raise exception 'You cannot offer to yourself'; end if;
  if public.marketplace_users_blocked(auth.uid(),recipient) then raise exception 'This trade is blocked'; end if;

  select count(*) into sender_count from jsonb_array_elements(p_items) as item_entry where upper(item_entry->>'side') = 'SENDER';
  select count(*) into recipient_count from jsonb_array_elements(p_items) as item_entry where upper(item_entry->>'side') = 'RECIPIENT';
  if sender_count < 1 or recipient_count < 1 then raise exception 'Both sides need at least one item'; end if;

  -- Totals and compatibility are intentionally initialized server-side. The client values in
  -- p_sender_total / p_recipient_total / p_compatibility_score are accepted only for backwards
  -- RPC compatibility and are never trusted for Exchange market data.
  insert into public.marketplace_offers (listing_id,sender_id,recipient_id,parent_offer_id,value_source,sender_total,recipient_total,compatibility_score,explanation,note)
  values (p_listing_id,auth.uid(),recipient,p_parent_offer_id,normalized_source,0,0,70,coalesce(p_explanation,'{}'::jsonb),nullif(left(trim(coalesce(p_note,'')),500),''))
  returning id into new_offer_id;

  for item_row in select value from jsonb_array_elements(p_items) as item_entry(value)
  loop
    normalized_side := upper(coalesce(item_row->>'side',''));
    normalized_value_type := upper(coalesce(item_row->>'value_type','NORMAL'));
    if normalized_side not in ('SENDER','RECIPIENT') then raise exception 'Invalid offer item side'; end if;
    if normalized_value_type not in ('NORMAL','NEON','MEGA') then raise exception 'Invalid item variant'; end if;
    if nullif(trim(coalesce(item_row->>'item_id','')),'') is null then raise exception 'Missing item ID'; end if;

    canonical_name := null;
    canonical_category := null;
    canonical_value := null;
    select vh.item_name, vh.category, vh.value
      into canonical_name, canonical_category, canonical_value
    from public.value_history vh
    where vh.item_id = item_row->>'item_id'
      and upper(vh.source) = normalized_source
      and upper(vh.value_type) = normalized_value_type
    order by vh.snapshot_date desc, vh.captured_at desc
    limit 1;

    if canonical_name is null then
      raise exception 'Item % / % is not in the current CSBT value catalog', item_row->>'item_id', normalized_value_type;
    end if;

    insert into public.marketplace_offer_items (offer_id,side,item_id,item_name,image_url,category,value_type,potion_status,quantity,snapshot_value,demand_tier)
    values (
      new_offer_id,
      normalized_side,
      item_row->>'item_id',
      left(canonical_name,120),
      case
        when coalesce(item_row->>'image_url','') ~ '^/images/' then item_row->>'image_url'
        when coalesce(item_row->>'image_url','') ~ '^https://elvebredd[.]com/' then item_row->>'image_url'
        else null
      end,
      upper(coalesce(canonical_category,'OTHER')),
      normalized_value_type,
      upper(coalesce(item_row->>'potion_status','BASE')),
      greatest(1,least(99,coalesce((item_row->>'quantity')::integer,1))),
      canonical_value,
      case when upper(coalesce(item_row->>'demand_tier','')) in ('S','A','B','C','D') then upper(item_row->>'demand_tier') else null end
    );
  end loop;

  select coalesce(sum(coalesce(snapshot_value,0) * quantity),0) into server_sender_total
  from public.marketplace_offer_items where offer_id = new_offer_id and side = 'SENDER';
  select coalesce(sum(coalesce(snapshot_value,0) * quantity),0) into server_recipient_total
  from public.marketplace_offer_items where offer_id = new_offer_id and side = 'RECIPIENT';

  if server_recipient_total > 0 then
    server_value_score := greatest(0,least(100,round(100 - (abs(server_sender_total-server_recipient_total) / server_recipient_total) * 100)::integer));
  end if;

  update public.marketplace_offers
  set sender_total = server_sender_total,
      recipient_total = server_recipient_total,
      compatibility_score = server_value_score,
      explanation = coalesce(p_explanation,'{}'::jsonb) || jsonb_build_object(
        'server_validated', true,
        'server_value_score', server_value_score,
        'server_sender_total', server_sender_total,
        'server_recipient_total', server_recipient_total
      )
  where id = new_offer_id;

  if p_parent_offer_id is not null then
    update public.marketplace_offers set status = 'COUNTERED' where id = p_parent_offer_id;
  end if;
  return new_offer_id;
end;
$$;
grant execute on function public.marketplace_create_offer(uuid,uuid,text,numeric,numeric,integer,jsonb,text,jsonb) to authenticated;


-- Public storefront can ingest capped UX / error / rage-click events into
-- the tenant's app_collections without exposing org_id to the browser.

create or replace function storefront_ingest_ux_event(
  p_host text,
  p_slug text,
  p_payload jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_id text;
  v_kind text;
begin
  select org_id into v_org from storefront_by_host(p_host, p_slug);
  if v_org is null then
    return jsonb_build_object('ok', false, 'error', 'unknown_store');
  end if;

  v_kind := left(coalesce(p_payload->>'kind', 'error'), 40);
  if v_kind not in ('error', 'ux_failure', 'rage_click') then
    return jsonb_build_object('ok', false, 'error', 'ignored_kind');
  end if;

  v_id := left(coalesce(p_payload->>'id', gen_random_uuid()::text), 80);

  insert into app_collections (org_id, collection, entity_id, data)
  values (
    v_org,
    'ux-events',
    v_id,
    jsonb_build_object(
      'id', v_id,
      'sessionId', left(coalesce(p_payload->>'sessionId', ''), 80),
      'kind', case when v_kind = 'rage_click' then 'ux_failure' else v_kind end,
      'path', left(coalesce(p_payload->>'path', '/'), 200),
      'message', left(coalesce(p_payload->>'message', ''), 500),
      'replay', coalesce(p_payload->'replay', '[]'::jsonb),
      'at', left(coalesce(p_payload->>'at', now()::text), 40),
      'slug', left(coalesce(p_slug, ''), 80)
    )
  )
  on conflict (org_id, collection, entity_id) do update
    set data = excluded.data, updated_at = now();

  delete from app_collections c
  where c.org_id = v_org
    and c.collection = 'ux-events'
    and c.entity_id not in (
      select entity_id
      from app_collections
      where org_id = v_org and collection = 'ux-events'
      order by created_at desc
      limit 400
    );

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

grant execute on function storefront_ingest_ux_event(text, text, jsonb) to anon, authenticated;

-- Public storefront chrome (theme, banners, published commerce) must resolve
-- from the storefront host/slug, not from the caller's session. Anonymous
-- shoppers have no profile, so RLS on app_documents would otherwise hide the
-- tenant's store and fall back to empty defaults.

create or replace function storefront_documents(p_host text, p_slug text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_sf storefronts;
  v_commerce jsonb;
  v_website jsonb;
  v_settings jsonb;
begin
  select * into v_sf from storefront_by_host(p_host, p_slug);
  if v_sf.org_id is null then
    return null;
  end if;

  select data into v_commerce
    from app_documents
   where org_id = v_sf.org_id and key = 'commerce';

  select data into v_website
    from app_documents
   where org_id = v_sf.org_id and key = 'website';

  select data into v_settings
    from app_documents
   where org_id = v_sf.org_id and key = 'settings';

  return jsonb_build_object(
    'orgId', v_sf.org_id,
    'slug', v_sf.slug,
    'commerce', coalesce(v_commerce, '{}'::jsonb),
    'website', coalesce(v_website, '{}'::jsonb),
    'settings', coalesce(v_settings, '{}'::jsonb)
  );
end;
$$;

revoke all on function storefront_documents(text, text) from public;
grant execute on function storefront_documents(text, text) to anon, authenticated;

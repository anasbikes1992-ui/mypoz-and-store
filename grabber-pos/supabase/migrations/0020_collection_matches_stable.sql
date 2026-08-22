create or replace function collection_matches_rules(
  p products, rules jsonb, source_category text
) returns boolean
language plpgsql stable as $$
declare
  r jsonb;
  v_field text;
  v_op text;
  v_val text;
  v_price numeric;
  v_cat text;
begin
  if source_category is not null and source_category <> '' and source_category <> 'all' then
    select c.name into v_cat from categories c where c.id = p.category_id;
    if v_cat is distinct from source_category then return false; end if;
  end if;

  if rules is null or jsonb_array_length(rules) = 0 then return true; end if;

  for r in select * from jsonb_array_elements(rules) loop
    v_field := r->>'field';
    v_op    := r->>'op';
    v_val   := r->>'value';
    v_price := coalesce(p.online_price, p.sale_price);

    if v_field = 'price' then
      if v_op = 'lt' and not (v_price < v_val::numeric) then return false; end if;
      if v_op = 'lte' and not (v_price <= v_val::numeric) then return false; end if;
      if v_op = 'gt' and not (v_price > v_val::numeric) then return false; end if;
      if v_op = 'gte' and not (v_price >= v_val::numeric) then return false; end if;
    elsif v_field = 'tag' then
      if v_op = 'eq' and not (v_val = any(p.tags)) then return false; end if;
    elsif v_field = 'featured' then
      if v_op = 'eq' and not (p.featured = (v_val::boolean)) then return false; end if;
    elsif v_field = 'category' then
      select c.name into v_cat from categories c where c.id = p.category_id;
      if v_op = 'eq' and v_cat is distinct from v_val then return false; end if;
    end if;
  end loop;

  return true;
end;
$$;
-- 0027_audit_unification.sql
-- Canonical audit ledger: audit_events is the only production audit store.
-- Authenticated clients: SELECT only. Writes via write_audit_event (DEFINER).
-- Do not trust client-supplied actor_id / org_id when auth.uid() is present.

alter table public.audit_events
  add column if not exists actor_role text,
  add column if not exists actor_label text,
  add column if not exists correlation_id text;

create index if not exists audit_events_correlation_idx
  on public.audit_events (org_id, correlation_id)
  where correlation_id is not null;

-- Ensure no UPDATE/DELETE policies exist for tenants (append-only).
drop policy if exists audit_update on public.audit_events;
drop policy if exists audit_delete on public.audit_events;
drop policy if exists audit_insert on public.audit_events;

drop policy if exists audit_read on public.audit_events;
create policy audit_read on public.audit_events
  for select using (
    org_id = public.current_org_id()
    and public.current_user_role() in ('owner', 'manager')
  );

create or replace function public.write_audit_event(
  p_action text,
  p_entity text,
  p_entity_id text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_correlation_id text default null,
  p_org_id uuid default null,
  p_actor_id uuid default null,
  p_actor_role text default null,
  p_actor_label text default null
)
returns public.audit_events
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_org uuid;
  v_actor uuid;
  v_role text;
  v_label text;
  v_row public.audit_events;
begin
  if p_action is null or length(trim(p_action)) = 0 then
    raise exception 'AUDIT: action required';
  end if;
  if p_entity is null or length(trim(p_entity)) = 0 then
    raise exception 'AUDIT: entity required';
  end if;

  if auth.uid() is not null then
    -- Session path: never trust client org/actor overrides.
    v_org := public.current_org_id();
    if v_org is null then
      raise exception 'AUDIT: no organization for session';
    end if;
    v_actor := auth.uid();
    v_role := public.current_user_role();
    v_label := coalesce(
      nullif(trim(p_actor_label), ''),
      (select full_name from public.profiles where id = v_actor),
      v_actor::text
    );
  else
    -- Service-role / webhook path: caller must supply org.
    if p_org_id is null then
      raise exception 'AUDIT: org_id required for service writes';
    end if;
    v_org := p_org_id;
    v_actor := p_actor_id;
    v_role := nullif(trim(p_actor_role), '');
    v_label := coalesce(nullif(trim(p_actor_label), ''), 'system');
  end if;

  insert into public.audit_events (
    org_id, actor_id, actor_role, actor_label, action, entity, entity_id,
    metadata, correlation_id
  ) values (
    v_org,
    v_actor,
    v_role,
    v_label,
    trim(p_action),
    trim(p_entity),
    nullif(trim(coalesce(p_entity_id, '')), ''),
    coalesce(p_metadata, '{}'::jsonb),
    nullif(trim(coalesce(p_correlation_id, '')), '')
  )
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.write_audit_event(
  text, text, text, jsonb, text, uuid, uuid, text, text
) from public;
grant execute on function public.write_audit_event(
  text, text, text, jsonb, text, uuid, uuid, text, text
) to authenticated, service_role;

comment on function public.write_audit_event is
  'Append-only audit write. Session callers ignore client org/actor; service callers must pass p_org_id.';

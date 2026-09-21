-- APPLICATA SU SUPABASE coastalrowing2026 (ref ocynnjwpyhjophmhqqam) il 21/09/2026.
-- Introduce gruppi nominabili e ordinabili per le attività dei volontari.
-- Le attività esistenti restano inizialmente senza gruppo.

begin;

create table if not exists public.volunteer_activity_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 120),
  display_order integer not null default 1000,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists volunteer_activity_groups_name_ci_uidx
  on public.volunteer_activity_groups (lower(btrim(name)));

create index if not exists volunteer_activity_groups_active_order_idx
  on public.volunteer_activity_groups(active, display_order);

alter table public.volunteer_activity_groups enable row level security;
revoke all on table public.volunteer_activity_groups from public, anon, authenticated;
grant select, insert, update, delete on table public.volunteer_activity_groups to service_role;

alter table public.volunteer_activities
  add column if not exists group_id uuid null
  references public.volunteer_activity_groups(id) on delete set null;

create index if not exists volunteer_activities_group_active_idx
  on public.volunteer_activities(group_id, active);

create or replace function public.admin_save_volunteer_activity_group(
  p_actor_name text,
  p_group_id uuid,
  p_name text
) returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_actor text := btrim(coalesce(p_actor_name, ''));
  v_name text := btrim(coalesce(p_name, ''));
  v_current public.volunteer_activity_groups%rowtype;
  v_existing public.volunteer_activity_groups%rowtype;
  v_saved public.volunteer_activity_groups%rowtype;
  v_order integer;
begin
  if length(v_actor) < 2 then raise exception 'VOLUNTEER_INVALID_ACTOR'; end if;
  if length(v_name) < 1 or length(v_name) > 120 then raise exception 'VOLUNTEER_INVALID_ACTIVITY_GROUP'; end if;

  if p_group_id is null then
    select * into v_existing
    from public.volunteer_activity_groups
    where lower(btrim(name)) = lower(v_name)
    limit 1
    for update;

    if found then
      if v_existing.active then
        return jsonb_build_object(
          'id', v_existing.id,
          'name', v_existing.name,
          'displayOrder', v_existing.display_order,
          'active', true,
          'existing', true
        );
      end if;

      select coalesce(max(display_order), 0) + 10 into v_order
      from public.volunteer_activity_groups
      where active;

      update public.volunteer_activity_groups
      set name = v_name,
          display_order = v_order,
          active = true,
          updated_at = now()
      where id = v_existing.id
      returning * into v_saved;
    else
      select coalesce(max(display_order), 0) + 10 into v_order
      from public.volunteer_activity_groups
      where active;

      insert into public.volunteer_activity_groups(name, display_order, active)
      values (v_name, v_order, true)
      returning * into v_saved;
    end if;
  else
    select * into v_current
    from public.volunteer_activity_groups
    where id = p_group_id
    for update;
    if not found then raise exception 'VOLUNTEER_ACTIVITY_GROUP_NOT_FOUND'; end if;

    perform 1
    from public.volunteer_activity_groups
    where id <> p_group_id
      and lower(btrim(name)) = lower(v_name);
    if found then raise exception 'VOLUNTEER_ACTIVITY_GROUP_DUPLICATE'; end if;

    update public.volunteer_activity_groups
    set name = v_name,
        active = true,
        updated_at = now()
    where id = p_group_id
    returning * into v_saved;
  end if;

  insert into public.volunteer_audit_log(
    actor_name, action_type, entity_type, entity_id, previous_value, new_value
  ) values (
    v_actor,
    case
      when p_group_id is not null then 'activity_group_updated'
      when v_existing.id is not null then 'activity_group_reactivated'
      else 'activity_group_created'
    end,
    'activity_group',
    v_saved.id,
    case
      when p_group_id is not null then to_jsonb(v_current)
      when v_existing.id is not null then to_jsonb(v_existing)
      else null
    end,
    to_jsonb(v_saved)
  );

  return jsonb_build_object(
    'id', v_saved.id,
    'name', v_saved.name,
    'displayOrder', v_saved.display_order,
    'active', v_saved.active,
    'existing', false
  );
end;
$$;

create or replace function public.admin_deactivate_volunteer_activity_group(
  p_actor_name text,
  p_group_id uuid
) returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_actor text := btrim(coalesce(p_actor_name, ''));
  v_current public.volunteer_activity_groups%rowtype;
  v_activity_count integer;
begin
  if length(v_actor) < 2 then raise exception 'VOLUNTEER_INVALID_ACTOR'; end if;

  select * into v_current
  from public.volunteer_activity_groups
  where id = p_group_id and active
  for update;
  if not found then raise exception 'VOLUNTEER_ACTIVITY_GROUP_NOT_FOUND'; end if;

  select count(*)::integer into v_activity_count
  from public.volunteer_activities
  where active and group_id = p_group_id;

  update public.volunteer_activities
  set group_id = null,
      updated_at = now()
  where group_id = p_group_id;

  update public.volunteer_activity_groups
  set active = false,
      updated_at = now()
  where id = p_group_id;

  insert into public.volunteer_audit_log(
    actor_name, action_type, entity_type, entity_id, previous_value, new_value
  ) values (
    v_actor,
    'activity_group_deactivated',
    'activity_group',
    p_group_id,
    to_jsonb(v_current),
    to_jsonb(v_current) || jsonb_build_object(
      'active', false,
      'activitiesUngrouped', v_activity_count
    )
  );

  return jsonb_build_object(
    'id', p_group_id,
    'active', false,
    'activitiesUngrouped', v_activity_count
  );
end;
$$;

create or replace function public.admin_reorder_volunteer_activity_groups(
  p_actor_name text,
  p_group_ids uuid[]
) returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_actor text := btrim(coalesce(p_actor_name, ''));
  v_expected integer;
  v_matched integer;
  v_len integer := coalesce(array_length(p_group_ids, 1), 0);
  v_i integer;
begin
  if length(v_actor) < 2 then raise exception 'VOLUNTEER_INVALID_ACTOR'; end if;

  select count(*)::integer into v_expected
  from public.volunteer_activity_groups
  where active;

  if v_len <> v_expected then raise exception 'VOLUNTEER_INVALID_ACTIVITY_GROUP_ORDER'; end if;

  select count(*)::integer into v_matched
  from public.volunteer_activity_groups
  where active and id = any(p_group_ids);

  if v_matched <> v_expected then raise exception 'VOLUNTEER_INVALID_ACTIVITY_GROUP_ORDER'; end if;

  if v_len > 0 then
    for v_i in 1..v_len loop
      update public.volunteer_activity_groups
      set display_order = v_i * 10,
          updated_at = now()
      where id = p_group_ids[v_i] and active;
    end loop;
  end if;

  insert into public.volunteer_audit_log(
    actor_name, action_type, entity_type, entity_id, previous_value, new_value
  ) values (
    v_actor,
    'activity_group_order_updated',
    'activity_group_order',
    null,
    null,
    jsonb_build_object('groupIds', to_jsonb(p_group_ids))
  );

  return jsonb_build_object('updated', v_len);
end;
$$;

create or replace function public.admin_set_volunteer_activity_group(
  p_actor_name text,
  p_activity_id uuid,
  p_group_id uuid
) returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_actor text := btrim(coalesce(p_actor_name, ''));
  v_activity public.volunteer_activities%rowtype;
  v_group public.volunteer_activity_groups%rowtype;
  v_saved public.volunteer_activities%rowtype;
begin
  if length(v_actor) < 2 then raise exception 'VOLUNTEER_INVALID_ACTOR'; end if;

  select * into v_activity
  from public.volunteer_activities
  where id = p_activity_id and active
  for update;
  if not found then raise exception 'VOLUNTEER_INVALID_ACTIVITY'; end if;

  if p_group_id is not null then
    select * into v_group
    from public.volunteer_activity_groups
    where id = p_group_id and active;
    if not found then raise exception 'VOLUNTEER_INVALID_ACTIVITY_GROUP'; end if;
  end if;

  update public.volunteer_activities
  set group_id = p_group_id,
      updated_at = now()
  where id = p_activity_id
  returning * into v_saved;

  insert into public.volunteer_audit_log(
    actor_name, action_type, entity_type, entity_id, previous_value, new_value
  ) values (
    v_actor,
    'activity_group_assignment_updated',
    'activity',
    p_activity_id,
    to_jsonb(v_activity),
    to_jsonb(v_saved)
  );

  return jsonb_build_object(
    'activityId', v_saved.id,
    'groupId', v_saved.group_id
  );
end;
$$;

revoke all on function public.admin_save_volunteer_activity_group(text, uuid, text) from public, anon, authenticated;
revoke all on function public.admin_deactivate_volunteer_activity_group(text, uuid) from public, anon, authenticated;
revoke all on function public.admin_reorder_volunteer_activity_groups(text, uuid[]) from public, anon, authenticated;
revoke all on function public.admin_set_volunteer_activity_group(text, uuid, uuid) from public, anon, authenticated;

grant execute on function public.admin_save_volunteer_activity_group(text, uuid, text) to service_role;
grant execute on function public.admin_deactivate_volunteer_activity_group(text, uuid) to service_role;
grant execute on function public.admin_reorder_volunteer_activity_groups(text, uuid[]) to service_role;
grant execute on function public.admin_set_volunteer_activity_group(text, uuid, uuid) to service_role;

commit;

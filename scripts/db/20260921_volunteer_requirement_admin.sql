-- APPLICATA SU SUPABASE coastalrowing2026 (ref ocynnjwpyhjophmhqqam) il 21/09/2026.
-- Gestione atomica delle esigenze. Se cambia la coppia turno-attività,
-- sposta anche le assegnazioni attive preservando storico e responsabile.

create or replace function public.admin_save_volunteer_activity_requirement(
  p_actor_name text,
  p_requirement_id uuid,
  p_shift_id uuid,
  p_activity_id uuid,
  p_required_count integer
) returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_actor text := btrim(coalesce(p_actor_name, ''));
  v_current public.volunteer_activity_requirements%rowtype;
  v_saved public.volunteer_activity_requirements%rowtype;
  v_existing public.volunteer_activity_requirements%rowtype;
  v_activity public.volunteer_activities%rowtype;
  v_assignment public.volunteer_assignments%rowtype;
  v_save_result jsonb;
  v_new_assignment_id uuid;
  v_moved_count integer := 0;
begin
  if length(v_actor) < 2 then raise exception 'VOLUNTEER_INVALID_ACTOR'; end if;
  if p_shift_id is null or p_activity_id is null then raise exception 'VOLUNTEER_INVALID_REQUIREMENT'; end if;
  if p_required_count is null or p_required_count < 1 or p_required_count > 999 then
    raise exception 'VOLUNTEER_INVALID_REQUIREMENT';
  end if;

  perform 1 from public.volunteer_shifts where id = p_shift_id and active;
  if not found then raise exception 'VOLUNTEER_INVALID_SHIFT'; end if;

  select * into v_activity
  from public.volunteer_activities
  where id = p_activity_id and active;
  if not found then raise exception 'VOLUNTEER_INVALID_ACTIVITY'; end if;

  if p_requirement_id is null then
    select * into v_existing
    from public.volunteer_activity_requirements
    where shift_id = p_shift_id and activity_id = p_activity_id
    for update;

    if found then
      update public.volunteer_activity_requirements
      set required_count = p_required_count,
          active = true,
          updated_at = now()
      where id = v_existing.id
      returning * into v_saved;
    else
      insert into public.volunteer_activity_requirements(
        shift_id, activity_id, required_count, active
      ) values (
        p_shift_id, p_activity_id, p_required_count, true
      )
      returning * into v_saved;
    end if;

    insert into public.volunteer_audit_log(
      actor_name, action_type, entity_type, entity_id, previous_value, new_value
    ) values (
      v_actor,
      case when v_existing.id is null then 'requirement_created' else 'requirement_updated' end,
      'activity_requirement',
      v_saved.id,
      case when v_existing.id is null then null else to_jsonb(v_existing) end,
      to_jsonb(v_saved)
    );

    return jsonb_build_object(
      'id', v_saved.id,
      'shiftId', v_saved.shift_id,
      'activityId', v_saved.activity_id,
      'requiredCount', v_saved.required_count,
      'movedAssignments', 0
    );
  end if;

  select * into v_current
  from public.volunteer_activity_requirements
  where id = p_requirement_id
  for update;
  if not found then raise exception 'VOLUNTEER_REQUIREMENT_NOT_FOUND'; end if;

  if (v_current.shift_id, v_current.activity_id) is distinct from (p_shift_id, p_activity_id) then
    select * into v_existing
    from public.volunteer_activity_requirements
    where shift_id = p_shift_id
      and activity_id = p_activity_id
      and id <> v_current.id
      and active
    limit 1;
    if found then raise exception 'VOLUNTEER_REQUIREMENT_DUPLICATE'; end if;

    update public.volunteer_activity_requirements
    set shift_id = p_shift_id,
        activity_id = p_activity_id,
        required_count = p_required_count,
        active = true,
        updated_at = now()
    where id = v_current.id
    returning * into v_saved;

    for v_assignment in
      select *
      from public.volunteer_assignments
      where active
        and shift_id = v_current.shift_id
        and activity_id = v_current.activity_id
      order by created_at, id
    loop
      v_save_result := public.admin_save_volunteer_assignment(
        v_actor,
        v_assignment.id,
        v_assignment.person_id,
        p_shift_id,
        null,
        null,
        v_activity.name,
        case when v_current.activity_id = p_activity_id then v_assignment.role else null end,
        v_assignment.requested_profile,
        v_assignment.note
      );
      v_new_assignment_id := (v_save_result->>'id')::uuid;
      if v_assignment.is_responsible then
        perform public.admin_set_volunteer_assignment_responsible(
          v_actor,
          v_new_assignment_id,
          true
        );
      end if;
      v_moved_count := v_moved_count + 1;
    end loop;
  else
    update public.volunteer_activity_requirements
    set required_count = p_required_count,
        active = true,
        updated_at = now()
    where id = v_current.id
    returning * into v_saved;
  end if;

  insert into public.volunteer_audit_log(
    actor_name, action_type, entity_type, entity_id, previous_value, new_value
  ) values (
    v_actor,
    'requirement_updated',
    'activity_requirement',
    v_saved.id,
    to_jsonb(v_current),
    to_jsonb(v_saved) || jsonb_build_object('movedAssignments', v_moved_count)
  );

  return jsonb_build_object(
    'id', v_saved.id,
    'shiftId', v_saved.shift_id,
    'activityId', v_saved.activity_id,
    'requiredCount', v_saved.required_count,
    'movedAssignments', v_moved_count
  );
end;
$$;

create or replace function public.admin_deactivate_volunteer_activity_requirement(
  p_actor_name text,
  p_requirement_id uuid
) returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_actor text := btrim(coalesce(p_actor_name, ''));
  v_current public.volunteer_activity_requirements%rowtype;
  v_assignment_count integer;
begin
  if length(v_actor) < 2 then raise exception 'VOLUNTEER_INVALID_ACTOR'; end if;

  select * into v_current
  from public.volunteer_activity_requirements
  where id = p_requirement_id and active
  for update;
  if not found then raise exception 'VOLUNTEER_REQUIREMENT_NOT_FOUND'; end if;

  select count(*) into v_assignment_count
  from public.volunteer_assignments
  where active
    and shift_id = v_current.shift_id
    and activity_id = v_current.activity_id;

  if v_assignment_count > 0 then
    raise exception 'VOLUNTEER_REQUIREMENT_HAS_ASSIGNMENTS';
  end if;

  update public.volunteer_activity_requirements
  set active = false,
      updated_at = now()
  where id = v_current.id;

  insert into public.volunteer_audit_log(
    actor_name, action_type, entity_type, entity_id, previous_value, new_value
  ) values (
    v_actor,
    'requirement_deactivated',
    'activity_requirement',
    v_current.id,
    to_jsonb(v_current),
    to_jsonb(v_current) || jsonb_build_object('active', false)
  );

  return jsonb_build_object('id', v_current.id, 'active', false);
end;
$$;

revoke all on function public.admin_save_volunteer_activity_requirement(text, uuid, uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.admin_deactivate_volunteer_activity_requirement(text, uuid) from public, anon, authenticated;

grant execute on function public.admin_save_volunteer_activity_requirement(text, uuid, uuid, uuid, integer) to service_role;
grant execute on function public.admin_deactivate_volunteer_activity_requirement(text, uuid) to service_role;

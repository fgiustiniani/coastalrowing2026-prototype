-- APPLICATA SU SUPABASE coastalrowing2026 (ref ocynnjwpyhjophmhqqam) il 21/09/2026.
-- Aggiunge un ordine persistente delle persone all'interno di ciascuna coppia turno-attività
-- e una RPC atomica per il riordino drag & drop.

begin;

alter table public.volunteer_assignments
  add column if not exists display_order integer not null default 1000;

with ranked as (
  select
    id,
    row_number() over (
      partition by shift_id, activity_id
      order by created_at, id
    ) * 10 as new_order
  from public.volunteer_assignments
  where active and shift_id is not null
)
update public.volunteer_assignments a
set display_order = ranked.new_order
from ranked
where a.id = ranked.id;

create index if not exists volunteer_assignments_pair_order_idx
  on public.volunteer_assignments(shift_id, activity_id, active, display_order);

create or replace function public.admin_save_volunteer_assignment(
  p_actor_name text,
  p_assignment_id uuid,
  p_person_id uuid,
  p_shift_id uuid,
  p_raw_day text,
  p_raw_shift text,
  p_activity text,
  p_role text,
  p_requested_profile text,
  p_note text
) returns jsonb
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_actor text := btrim(coalesce(p_actor_name, ''));
  v_activity_name text := btrim(coalesce(p_activity, ''));
  v_person public.volunteer_people%rowtype;
  v_old public.volunteer_assignments%rowtype;
  v_new public.volunteer_assignments%rowtype;
  v_activity_id uuid;
  v_day text;
  v_shift text;
  v_old_value jsonb;
  v_display_order integer;
  v_same_pair boolean := false;
begin
  if length(v_actor) < 2 then raise exception 'VOLUNTEER_INVALID_ACTOR'; end if;
  if length(v_activity_name) < 1 or length(v_activity_name) > 200 then raise exception 'VOLUNTEER_INVALID_ASSIGNMENT'; end if;

  select * into v_person from public.volunteer_people where id = p_person_id and active for update;
  if not found then raise exception 'VOLUNTEER_PERSON_NOT_FOUND'; end if;

  if p_shift_id is not null then
    select day_label, shift_label into v_day, v_shift
    from public.volunteer_shifts where id = p_shift_id and active;
    if not found then raise exception 'VOLUNTEER_INVALID_ASSIGNMENT'; end if;
  else
    v_day := btrim(coalesce(p_raw_day, ''));
    v_shift := btrim(coalesce(p_raw_shift, ''));
    if v_day = '' or v_shift = '' then raise exception 'VOLUNTEER_INVALID_ASSIGNMENT'; end if;
  end if;

  select id into v_activity_id
  from public.volunteer_activities
  where lower(name) = lower(v_activity_name) and active
  limit 1;
  if v_activity_id is null then
    insert into public.volunteer_activities(name) values (v_activity_name) returning id into v_activity_id;
  end if;

  if p_assignment_id is not null then
    select * into v_old from public.volunteer_assignments
    where id = p_assignment_id and active for update;
    if not found then raise exception 'VOLUNTEER_ASSIGNMENT_NOT_FOUND'; end if;

    v_same_pair :=
      v_old.shift_id is not distinct from p_shift_id
      and v_old.activity_id = v_activity_id
      and (
        p_shift_id is not null
        or (
          coalesce(v_old.raw_day,'') = coalesce(v_day,'')
          and coalesce(v_old.raw_shift,'') = coalesce(v_shift,'')
        )
      );

    if v_same_pair then
      v_display_order := v_old.display_order;
    end if;

    v_old_value := jsonb_build_object(
      'personId', v_old.person_id, 'shiftId', v_old.shift_id,
      'rawDay', v_old.raw_day, 'rawShift', v_old.raw_shift,
      'activityId', v_old.activity_id, 'role', v_old.role,
      'requestedProfile', v_old.requested_profile, 'note', v_old.note,
      'displayOrder', v_old.display_order
    );
    update public.volunteer_assignments set active = false, updated_at = now() where id = v_old.id;
  end if;

  if v_display_order is null then
    select coalesce(max(display_order), 0) + 10
    into v_display_order
    from public.volunteer_assignments
    where active
      and shift_id is not distinct from p_shift_id
      and activity_id = v_activity_id;
  end if;

  insert into public.volunteer_assignments(
    person_id, shift_id, activity_id, raw_day, raw_shift, role, requested_profile, note,
    source_type, active, supersedes_assignment_id, display_order
  ) values (
    p_person_id, p_shift_id, v_activity_id,
    case when p_shift_id is null then nullif(v_day, '') else null end,
    case when p_shift_id is null then nullif(v_shift, '') else null end,
    nullif(btrim(coalesce(p_role,'')), ''),
    nullif(btrim(coalesce(p_requested_profile,'')), ''),
    nullif(btrim(coalesce(p_note,'')), ''),
    'admin', true, p_assignment_id, v_display_order
  ) returning * into v_new;

  insert into public.volunteer_audit_log(
    actor_name, person_id, person_code, action_type, entity_type, entity_id,
    previous_value, new_value, note
  ) values (
    v_actor, v_person.id, v_person.person_code,
    case when p_assignment_id is null then 'assignment_created' else 'assignment_replaced' end,
    'assignment', v_new.id, v_old_value,
    jsonb_build_object(
      'personId', v_new.person_id, 'shiftId', v_new.shift_id,
      'day', v_day, 'shift', v_shift, 'activity', v_activity_name,
      'role', v_new.role, 'requestedProfile', v_new.requested_profile, 'note', v_new.note,
      'supersedesAssignmentId', v_new.supersedes_assignment_id,
      'displayOrder', v_new.display_order
    ), v_new.note
  );

  return jsonb_build_object(
    'id', v_new.id,
    'active', true,
    'supersedesAssignmentId', v_new.supersedes_assignment_id,
    'displayOrder', v_new.display_order
  );
end;
$function$;

create or replace function public.admin_reorder_volunteer_assignments(
  p_actor_name text,
  p_shift_id uuid,
  p_activity_id uuid,
  p_assignment_ids uuid[]
) returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_actor text := btrim(coalesce(p_actor_name, ''));
  v_expected integer;
  v_matched integer;
  v_len integer := coalesce(array_length(p_assignment_ids, 1), 0);
  v_i integer;
begin
  if length(v_actor) < 2 then raise exception 'VOLUNTEER_INVALID_ACTOR'; end if;
  if p_shift_id is null or p_activity_id is null then raise exception 'VOLUNTEER_INVALID_ASSIGNMENT_ORDER'; end if;

  select count(*)::integer into v_expected
  from public.volunteer_assignments
  where active and shift_id = p_shift_id and activity_id = p_activity_id;

  if v_len <> v_expected then raise exception 'VOLUNTEER_INVALID_ASSIGNMENT_ORDER'; end if;

  select count(*)::integer into v_matched
  from public.volunteer_assignments
  where active
    and shift_id = p_shift_id
    and activity_id = p_activity_id
    and id = any(p_assignment_ids);

  if v_matched <> v_expected then raise exception 'VOLUNTEER_INVALID_ASSIGNMENT_ORDER'; end if;

  if v_len > 0 then
    for v_i in 1..v_len loop
      update public.volunteer_assignments
      set display_order = v_i * 10,
          updated_at = now()
      where id = p_assignment_ids[v_i]
        and active
        and shift_id = p_shift_id
        and activity_id = p_activity_id;
    end loop;
  end if;

  insert into public.volunteer_audit_log(
    actor_name, action_type, entity_type, entity_id, previous_value, new_value
  ) values (
    v_actor,
    'assignment_order_updated',
    'assignment_order',
    null,
    null,
    jsonb_build_object(
      'shiftId', p_shift_id,
      'activityId', p_activity_id,
      'assignmentIds', to_jsonb(p_assignment_ids)
    )
  );

  return jsonb_build_object('updated', v_len);
end;
$$;

revoke all on function public.admin_reorder_volunteer_assignments(text, uuid, uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.admin_reorder_volunteer_assignments(text, uuid, uuid, uuid[]) to service_role;

commit;

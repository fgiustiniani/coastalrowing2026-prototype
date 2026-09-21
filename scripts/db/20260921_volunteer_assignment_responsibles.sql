begin;

alter table public.volunteer_assignments
  add column if not exists is_responsible boolean not null default false;

create unique index if not exists volunteer_assignments_one_responsible_per_shift_activity_idx
  on public.volunteer_assignments(shift_id, activity_id)
  where active and is_responsible and shift_id is not null;

create or replace function public.volunteer_assignment_inherit_responsibility()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_old_responsible boolean := false;
  v_old_shift_id uuid;
  v_old_activity_id uuid;
begin
  if new.supersedes_assignment_id is null then
    return new;
  end if;

  select a.is_responsible, a.shift_id, a.activity_id
  into v_old_responsible, v_old_shift_id, v_old_activity_id
  from public.volunteer_assignments a
  where a.id = new.supersedes_assignment_id;

  new.is_responsible :=
    coalesce(v_old_responsible, false)
    and v_old_shift_id is not distinct from new.shift_id
    and v_old_activity_id = new.activity_id;

  return new;
end;
$$;

drop trigger if exists volunteer_assignment_inherit_responsibility_trg
  on public.volunteer_assignments;

create trigger volunteer_assignment_inherit_responsibility_trg
before insert on public.volunteer_assignments
for each row
execute function public.volunteer_assignment_inherit_responsibility();

create or replace function public.admin_set_volunteer_assignment_responsible(
  p_actor_name text,
  p_assignment_id uuid,
  p_is_responsible boolean
) returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_actor text := btrim(coalesce(p_actor_name, ''));
  v_target public.volunteer_assignments%rowtype;
  v_target_person public.volunteer_people%rowtype;
  v_previous record;
  v_next boolean := coalesce(p_is_responsible, false);
begin
  if length(v_actor) < 2 then
    raise exception 'VOLUNTEER_INVALID_ACTOR';
  end if;

  select *
  into v_target
  from public.volunteer_assignments
  where id = p_assignment_id and active
  for update;

  if not found then
    raise exception 'VOLUNTEER_ASSIGNMENT_NOT_FOUND';
  end if;

  if v_next and v_target.shift_id is null then
    raise exception 'VOLUNTEER_RESPONSIBLE_REQUIRES_STANDARD_SHIFT';
  end if;

  select *
  into v_target_person
  from public.volunteer_people
  where id = v_target.person_id;

  if v_next then
    for v_previous in
      select a.*, p.person_code
      from public.volunteer_assignments a
      left join public.volunteer_people p on p.id = a.person_id
      where a.active
        and a.shift_id = v_target.shift_id
        and a.activity_id = v_target.activity_id
        and a.is_responsible
        and a.id <> v_target.id
      for update of a
    loop
      update public.volunteer_assignments
      set is_responsible = false,
          updated_at = now()
      where id = v_previous.id;

      insert into public.volunteer_audit_log(
        actor_name, person_id, person_code, action_type, entity_type, entity_id,
        previous_value, new_value, note
      ) values (
        v_actor,
        v_previous.person_id,
        v_previous.person_code,
        'assignment_responsible_replaced',
        'assignment',
        v_previous.id,
        jsonb_build_object('isResponsible', true),
        jsonb_build_object('isResponsible', false),
        'Responsabile sostituito per la stessa attività e turno'
      );
    end loop;
  end if;

  update public.volunteer_assignments
  set is_responsible = v_next,
      updated_at = now()
  where id = v_target.id;

  insert into public.volunteer_audit_log(
    actor_name, person_id, person_code, action_type, entity_type, entity_id,
    previous_value, new_value
  ) values (
    v_actor,
    v_target.person_id,
    v_target_person.person_code,
    case when v_next then 'assignment_responsible_set' else 'assignment_responsible_removed' end,
    'assignment',
    v_target.id,
    jsonb_build_object('isResponsible', coalesce(v_target.is_responsible, false)),
    jsonb_build_object('isResponsible', v_next)
  );

  return jsonb_build_object(
    'id', v_target.id,
    'active', true,
    'isResponsible', v_next
  );
end;
$$;

revoke all on function public.admin_set_volunteer_assignment_responsible(text,uuid,boolean)
  from public, anon, authenticated;
grant execute on function public.admin_set_volunteer_assignment_responsible(text,uuid,boolean)
  to service_role;

revoke all on function public.volunteer_assignment_inherit_responsibility()
  from public, anon, authenticated;

commit;

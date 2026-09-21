-- APPLICATA SU SUPABASE coastalrowing2026 (ref ocynnjwpyhjophmhqqam) il 21/09/2026.
-- Unifica il salvataggio di pianificazione: può riutilizzare o creare in modo atomico
-- turno e attività, quindi salvare/modificare l'abbinamento turno-attività.

create or replace function public.admin_save_volunteer_planning(
  p_actor_name text,
  p_requirement_id uuid,
  p_shift_id uuid,
  p_new_shift_date date,
  p_new_shift_start time without time zone,
  p_new_shift_end time without time zone,
  p_activity_id uuid,
  p_new_activity_name text,
  p_required_count integer
) returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_actor text := btrim(coalesce(p_actor_name, ''));
  v_shift public.volunteer_shifts%rowtype;
  v_activity public.volunteer_activities%rowtype;
  v_requirement jsonb;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_day_label text;
  v_shift_label text;
  v_code text;
  v_prev_order integer;
  v_next_order integer;
  v_sort_order integer;
  v_shift_created boolean := false;
  v_activity_created boolean := false;
  v_activity_reactivated boolean := false;
  v_weekdays text[] := array['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
  v_months text[] := array['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
begin
  if length(v_actor) < 2 then raise exception 'VOLUNTEER_INVALID_ACTOR'; end if;
  if p_required_count is null or p_required_count < 1 or p_required_count > 999 then
    raise exception 'VOLUNTEER_INVALID_REQUIREMENT';
  end if;

  if p_shift_id is not null then
    select * into v_shift
    from public.volunteer_shifts
    where id = p_shift_id and active
    for update;
    if not found then raise exception 'VOLUNTEER_INVALID_SHIFT'; end if;
  else
    if p_new_shift_date is null or p_new_shift_start is null or p_new_shift_end is null then
      raise exception 'VOLUNTEER_NEW_SHIFT_REQUIRED';
    end if;
    if p_new_shift_end <= p_new_shift_start then
      raise exception 'VOLUNTEER_INVALID_SHIFT_TIME';
    end if;

    v_starts_at := (p_new_shift_date::timestamp + p_new_shift_start) at time zone 'Europe/Rome';
    v_ends_at := (p_new_shift_date::timestamp + p_new_shift_end) at time zone 'Europe/Rome';

    select * into v_shift
    from public.volunteer_shifts
    where starts_at = v_starts_at and ends_at = v_ends_at
    order by active desc, created_at
    limit 1
    for update;

    if found then
      if not v_shift.active then
        update public.volunteer_shifts
        set active = true,
            availability_selectable = false,
            updated_at = now()
        where id = v_shift.id
        returning * into v_shift;

        insert into public.volunteer_audit_log(
          actor_name, action_type, entity_type, entity_id, previous_value, new_value
        ) values (
          v_actor, 'shift_reactivated', 'shift', v_shift.id, null, to_jsonb(v_shift)
        );
      end if;
    else
      v_day_label :=
        v_weekdays[(extract(dow from p_new_shift_date)::integer) + 1]
        || ' ' || extract(day from p_new_shift_date)::integer
        || ' ' || v_months[extract(month from p_new_shift_date)::integer];
      v_shift_label := to_char(p_new_shift_start, 'HH24:MI') || '–' || to_char(p_new_shift_end, 'HH24:MI');
      v_code := 'manual-' || to_char(p_new_shift_date, 'YYYYMMDD')
        || '-' || to_char(p_new_shift_start, 'HH24MI')
        || '-' || to_char(p_new_shift_end, 'HH24MI')
        || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);

      select max(sort_order) into v_prev_order
      from public.volunteer_shifts
      where starts_at < v_starts_at;

      select min(sort_order) into v_next_order
      from public.volunteer_shifts
      where starts_at > v_starts_at;

      if v_prev_order is null and v_next_order is null then
        v_sort_order := 10;
      elsif v_prev_order is null then
        v_sort_order := v_next_order - 5;
        if v_sort_order = v_next_order then v_sort_order := v_next_order - 1; end if;
      elsif v_next_order is null then
        v_sort_order := v_prev_order + 10;
      elsif v_next_order - v_prev_order > 1 then
        v_sort_order := v_prev_order + ((v_next_order - v_prev_order) / 2);
      else
        select coalesce(max(sort_order), 0) + 10 into v_sort_order from public.volunteer_shifts;
      end if;

      insert into public.volunteer_shifts(
        code, day_label, shift_label, starts_at, ends_at, sort_order,
        availability_selectable, active
      ) values (
        v_code, v_day_label, v_shift_label, v_starts_at, v_ends_at, v_sort_order,
        false, true
      )
      returning * into v_shift;

      v_shift_created := true;

      insert into public.volunteer_audit_log(
        actor_name, action_type, entity_type, entity_id, previous_value, new_value
      ) values (
        v_actor, 'shift_created', 'shift', v_shift.id, null, to_jsonb(v_shift)
      );
    end if;
  end if;

  if p_activity_id is not null then
    select * into v_activity
    from public.volunteer_activities
    where id = p_activity_id and active
    for update;
    if not found then raise exception 'VOLUNTEER_INVALID_ACTIVITY'; end if;
  else
    if length(btrim(coalesce(p_new_activity_name, ''))) < 1
       or length(btrim(coalesce(p_new_activity_name, ''))) > 200 then
      raise exception 'VOLUNTEER_NEW_ACTIVITY_REQUIRED';
    end if;

    select * into v_activity
    from public.volunteer_activities
    where lower(btrim(name)) = lower(btrim(p_new_activity_name))
    order by active desc, created_at
    limit 1
    for update;

    if found then
      if not v_activity.active then
        update public.volunteer_activities
        set active = true,
            updated_at = now()
        where id = v_activity.id
        returning * into v_activity;
        v_activity_reactivated := true;

        insert into public.volunteer_audit_log(
          actor_name, action_type, entity_type, entity_id, previous_value, new_value
        ) values (
          v_actor, 'activity_reactivated', 'activity', v_activity.id, null, to_jsonb(v_activity)
        );
      end if;
    else
      insert into public.volunteer_activities(name, active)
      values (btrim(p_new_activity_name), true)
      returning * into v_activity;
      v_activity_created := true;

      insert into public.volunteer_audit_log(
        actor_name, action_type, entity_type, entity_id, previous_value, new_value
      ) values (
        v_actor, 'activity_created', 'activity', v_activity.id, null, to_jsonb(v_activity)
      );
    end if;
  end if;

  v_requirement := public.admin_save_volunteer_activity_requirement(
    v_actor,
    p_requirement_id,
    v_shift.id,
    v_activity.id,
    p_required_count
  );

  return jsonb_build_object(
    'requirement', v_requirement,
    'shiftId', v_shift.id,
    'shiftCreated', v_shift_created,
    'activityId', v_activity.id,
    'activityName', v_activity.name,
    'activityCreated', v_activity_created,
    'activityReactivated', v_activity_reactivated
  );
end;
$$;

revoke all on function public.admin_save_volunteer_planning(
  text, uuid, uuid, date, time without time zone, time without time zone, uuid, text, integer
) from public, anon, authenticated;

grant execute on function public.admin_save_volunteer_planning(
  text, uuid, uuid, date, time without time zone, time without time zone, uuid, text, integer
) to service_role;

-- APPLICATA SU SUPABASE coastalrowing2026 (ref ocynnjwpyhjophmhqqam) il 21/09/2026.
-- Aggiunge un ordine persistente dei box attività all'interno di ciascun turno
-- e una RPC atomica per il riordino della vista a schede.

begin;

alter table public.volunteer_activity_requirements
  add column if not exists display_order integer not null default 1000;

with ranked as (
  select
    r.id,
    row_number() over (
      partition by r.shift_id
      order by lower(a.name), r.created_at, r.id
    ) * 10 as new_order
  from public.volunteer_activity_requirements r
  join public.volunteer_activities a on a.id = r.activity_id
  where r.active
)
update public.volunteer_activity_requirements r
set display_order = ranked.new_order
from ranked
where r.id = ranked.id;

create index if not exists volunteer_activity_requirements_shift_order_idx
  on public.volunteer_activity_requirements(shift_id, active, display_order);

create or replace function public.admin_reorder_volunteer_activity_requirements(
  p_actor_name text,
  p_shift_id uuid,
  p_requirement_ids uuid[]
) returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_actor text := btrim(coalesce(p_actor_name, ''));
  v_expected integer;
  v_matched integer;
  v_len integer := coalesce(array_length(p_requirement_ids, 1), 0);
  v_i integer;
begin
  if length(v_actor) < 2 then raise exception 'VOLUNTEER_INVALID_ACTOR'; end if;
  if p_shift_id is null then raise exception 'VOLUNTEER_INVALID_REQUIREMENT_ORDER'; end if;

  perform 1 from public.volunteer_shifts where id = p_shift_id and active;
  if not found then raise exception 'VOLUNTEER_INVALID_SHIFT'; end if;

  select count(*)::integer into v_expected
  from public.volunteer_activity_requirements
  where active and shift_id = p_shift_id;

  if v_len <> v_expected then raise exception 'VOLUNTEER_INVALID_REQUIREMENT_ORDER'; end if;

  select count(*)::integer into v_matched
  from public.volunteer_activity_requirements
  where active
    and shift_id = p_shift_id
    and id = any(p_requirement_ids);

  if v_matched <> v_expected then raise exception 'VOLUNTEER_INVALID_REQUIREMENT_ORDER'; end if;

  if v_len > 0 then
    for v_i in 1..v_len loop
      update public.volunteer_activity_requirements
      set display_order = v_i * 10,
          updated_at = now()
      where id = p_requirement_ids[v_i]
        and active
        and shift_id = p_shift_id;
    end loop;
  end if;

  insert into public.volunteer_audit_log(
    actor_name, action_type, entity_type, entity_id, previous_value, new_value
  ) values (
    v_actor,
    'requirement_order_updated',
    'activity_requirement_order',
    null,
    null,
    jsonb_build_object(
      'shiftId', p_shift_id,
      'requirementIds', to_jsonb(p_requirement_ids)
    )
  );

  return jsonb_build_object('updated', v_len);
end;
$$;

revoke all on function public.admin_reorder_volunteer_activity_requirements(text, uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.admin_reorder_volunteer_activity_requirements(text, uuid, uuid[]) to service_role;

-- admin_save_volunteer_activity_requirement è stata aggiornata nella stessa migrazione
-- per conservare la posizione se l'abbinamento resta nello stesso turno e mettere
-- in fondo i nuovi abbinamenti o quelli spostati verso un altro turno.

commit;

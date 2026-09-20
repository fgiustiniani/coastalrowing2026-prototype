-- PREPARATA PER feature/volontari. NON ESEGUIRE SENZA AUTORIZZAZIONE ESPLICITA.
-- Strutture dedicate alla gestione volontari dei Campionati Italiani Coastal Rowing 2026.
-- Nessuna tabella boat_test_* viene modificata.

begin;

create table if not exists public.volunteer_people (
  id uuid primary key default gen_random_uuid(),
  person_code text,
  surname text,
  given_name text,
  display_name text not null,
  source_type text not null default 'member' check (source_type in ('member','external','manual','admin')),
  source_row integer,
  selectable boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(btrim(display_name)) between 2 and 160)
);

create unique index if not exists volunteer_people_person_code_uidx
  on public.volunteer_people (person_code)
  where person_code is not null;
create index if not exists volunteer_people_name_idx
  on public.volunteer_people (surname, given_name, display_name);

create table if not exists public.volunteer_shifts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  day_label text not null,
  shift_label text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  sort_order integer not null unique,
  availability_selectable boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.volunteer_activities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(btrim(name)) between 1 and 200)
);

create table if not exists public.volunteer_assignments (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.volunteer_people(id),
  shift_id uuid references public.volunteer_shifts(id),
  activity_id uuid not null references public.volunteer_activities(id),
  raw_day text,
  raw_shift text,
  role text,
  requested_profile text,
  note text,
  source_type text not null default 'excel' check (source_type in ('excel','admin','manual')),
  source_row integer,
  active boolean not null default true,
  supersedes_assignment_id uuid references public.volunteer_assignments(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    shift_id is not null
    or (nullif(btrim(raw_day), '') is not null and nullif(btrim(raw_shift), '') is not null)
  )
);
create index if not exists volunteer_assignments_person_active_idx
  on public.volunteer_assignments(person_id, active);
create index if not exists volunteer_assignments_shift_active_idx
  on public.volunteer_assignments(shift_id, active);
create index if not exists volunteer_assignments_activity_active_idx
  on public.volunteer_assignments(activity_id, active);

create table if not exists public.volunteer_submissions (
  id uuid primary key default gen_random_uuid(),
  client_submission_id uuid not null unique,
  session_id text not null,
  actor_name text not null,
  person_id uuid not null references public.volunteer_people(id),
  selected_person_name text not null,
  person_code text,
  created_at timestamptz not null default now(),
  check (length(btrim(actor_name)) between 2 and 120),
  check (length(btrim(selected_person_name)) between 2 and 160)
);
create index if not exists volunteer_submissions_person_created_idx
  on public.volunteer_submissions(person_id, created_at desc);
create index if not exists volunteer_submissions_session_created_idx
  on public.volunteer_submissions(session_id, created_at desc);

create table if not exists public.volunteer_assignment_responses (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.volunteer_submissions(id),
  assignment_id uuid not null references public.volunteer_assignments(id),
  response text not null check (response in ('confirmed','declined')),
  note text,
  day_snapshot text not null,
  shift_snapshot text not null,
  activity_snapshot text not null,
  role_snapshot text,
  created_at timestamptz not null default now(),
  unique (submission_id, assignment_id)
);
create index if not exists volunteer_assignment_responses_assignment_idx
  on public.volunteer_assignment_responses(assignment_id, created_at desc);

create table if not exists public.volunteer_availability (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.volunteer_submissions(id),
  shift_id uuid not null references public.volunteer_shifts(id),
  note text,
  created_at timestamptz not null default now(),
  unique (submission_id, shift_id)
);

create table if not exists public.volunteer_audit_log (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references public.volunteer_submissions(id),
  actor_name text not null,
  person_id uuid references public.volunteer_people(id),
  person_code text,
  action_type text not null,
  entity_type text not null,
  entity_id uuid,
  previous_value jsonb,
  new_value jsonb,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists volunteer_audit_person_created_idx
  on public.volunteer_audit_log(person_id, created_at desc);
create index if not exists volunteer_audit_submission_idx
  on public.volunteer_audit_log(submission_id);

create table if not exists public.volunteer_imports (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  source_fingerprint text,
  imported_by text not null,
  status text not null default 'prepared' check (status in ('prepared','applied','rejected','rolled_back')),
  summary jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  applied_at timestamptz
);

alter table public.volunteer_people enable row level security;
alter table public.volunteer_shifts enable row level security;
alter table public.volunteer_activities enable row level security;
alter table public.volunteer_assignments enable row level security;
alter table public.volunteer_submissions enable row level security;
alter table public.volunteer_assignment_responses enable row level security;
alter table public.volunteer_availability enable row level security;
alter table public.volunteer_audit_log enable row level security;
alter table public.volunteer_imports enable row level security;

revoke all on table public.volunteer_people from public, anon, authenticated;
revoke all on table public.volunteer_shifts from public, anon, authenticated;
revoke all on table public.volunteer_activities from public, anon, authenticated;
revoke all on table public.volunteer_assignments from public, anon, authenticated;
revoke all on table public.volunteer_submissions from public, anon, authenticated;
revoke all on table public.volunteer_assignment_responses from public, anon, authenticated;
revoke all on table public.volunteer_availability from public, anon, authenticated;
revoke all on table public.volunteer_audit_log from public, anon, authenticated;
revoke all on table public.volunteer_imports from public, anon, authenticated;

grant select, insert, update, delete on table public.volunteer_people to service_role;
grant select, insert, update, delete on table public.volunteer_shifts to service_role;
grant select, insert, update, delete on table public.volunteer_activities to service_role;
grant select, insert, update, delete on table public.volunteer_assignments to service_role;
grant select, insert, update, delete on table public.volunteer_submissions to service_role;
grant select, insert, update, delete on table public.volunteer_assignment_responses to service_role;
grant select, insert, update, delete on table public.volunteer_availability to service_role;
grant select, insert, update, delete on table public.volunteer_audit_log to service_role;
grant select, insert, update, delete on table public.volunteer_imports to service_role;

insert into public.volunteer_shifts
  (code, day_label, shift_label, starts_at, ends_at, sort_order, availability_selectable, active)
values
  ('thu-01-1500-1800', 'Giovedì 1 ottobre', '15:00–18:00', '2026-10-01 15:00:00+02', '2026-10-01 18:00:00+02', 10, true, true),
  ('fri-02-0700-1000', 'Venerdì 2 ottobre', '07:00–10:00', '2026-10-02 07:00:00+02', '2026-10-02 10:00:00+02', 20, true, true),
  ('fri-02-1000-1200', 'Venerdì 2 ottobre', '10:00–12:00', '2026-10-02 10:00:00+02', '2026-10-02 12:00:00+02', 30, true, true),
  ('fri-02-1400-1600', 'Venerdì 2 ottobre', '14:00–16:00', '2026-10-02 14:00:00+02', '2026-10-02 16:00:00+02', 40, true, true),
  ('fri-02-1600-1800', 'Venerdì 2 ottobre', '16:00–18:00', '2026-10-02 16:00:00+02', '2026-10-02 18:00:00+02', 50, true, true),
  ('sat-03-0700-1000', 'Sabato 3 ottobre', '07:00–10:00', '2026-10-03 07:00:00+02', '2026-10-03 10:00:00+02', 60, true, true),
  ('sat-03-1000-1300', 'Sabato 3 ottobre', '10:00–13:00', '2026-10-03 10:00:00+02', '2026-10-03 13:00:00+02', 70, true, true),
  ('sat-03-1400-1700', 'Sabato 3 ottobre', '14:00–17:00', '2026-10-03 14:00:00+02', '2026-10-03 17:00:00+02', 80, true, true),
  ('sat-03-1700-1900', 'Sabato 3 ottobre', '17:00–19:00', '2026-10-03 17:00:00+02', '2026-10-03 19:00:00+02', 90, true, true),
  ('sun-04-0700-1000', 'Domenica 4 ottobre', '07:00–10:00', '2026-10-04 07:00:00+02', '2026-10-04 10:00:00+02', 100, true, true),
  ('sun-04-1000-1300', 'Domenica 4 ottobre', '10:00–13:00', '2026-10-04 10:00:00+02', '2026-10-04 13:00:00+02', 110, true, true),
  ('sun-04-1400-1600', 'Domenica 4 ottobre', '14:00–16:00', '2026-10-04 14:00:00+02', '2026-10-04 16:00:00+02', 120, true, true),
  ('sun-04-1600-1800', 'Domenica 4 ottobre', '16:00–18:00', '2026-10-04 16:00:00+02', '2026-10-04 18:00:00+02', 130, true, true)
on conflict (code) do update set
  day_label = excluded.day_label,
  shift_label = excluded.shift_label,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  sort_order = excluded.sort_order,
  availability_selectable = excluded.availability_selectable,
  active = excluded.active,
  updated_at = now();

create or replace function public.submit_volunteer_submission(
  p_actor_name text,
  p_person_id uuid,
  p_manual_person_name text,
  p_client_submission_id uuid,
  p_session_id text,
  p_responses jsonb,
  p_availability jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_actor text := btrim(coalesce(p_actor_name, ''));
  v_manual text := btrim(coalesce(p_manual_person_name, ''));
  v_session text := btrim(coalesce(p_session_id, ''));
  v_person public.volunteer_people%rowtype;
  v_submission public.volunteer_submissions%rowtype;
  v_existing public.volunteer_submissions%rowtype;
  v_assignment public.volunteer_assignments%rowtype;
  v_activity_name text;
  v_day text;
  v_shift text;
  v_person_created boolean := false;
  v_assignment_count integer;
  v_response_count integer;
  v_response jsonb;
  v_avail jsonb;
  v_response_value text;
  v_note text;
  v_old_response text;
  v_old_note text;
  v_previous_availability jsonb := '[]'::jsonb;
  v_new_availability jsonb := '[]'::jsonb;
begin
  if length(v_actor) < 2 or length(v_actor) > 120 then
    raise exception 'VOLUNTEER_INVALID_ACTOR';
  end if;
  if p_client_submission_id is null or length(v_session) < 8 then
    raise exception 'VOLUNTEER_INVALID_SUBMISSION';
  end if;

  select * into v_existing
  from public.volunteer_submissions
  where client_submission_id = p_client_submission_id;

  if found then
    return jsonb_build_object(
      'id', v_existing.id,
      'personId', v_existing.person_id,
      'personName', v_existing.selected_person_name,
      'personCode', v_existing.person_code,
      'createdAt', v_existing.created_at,
      'duplicate', true
    );
  end if;

  if p_person_id is not null then
    select * into v_person
    from public.volunteer_people
    where id = p_person_id and active and selectable
    for update;
    if not found then raise exception 'VOLUNTEER_PERSON_NOT_FOUND'; end if;
  else
    if length(v_manual) < 2 or length(v_manual) > 160 then
      raise exception 'VOLUNTEER_PERSON_NOT_FOUND';
    end if;
    insert into public.volunteer_people(display_name, source_type, selectable, active)
    values (v_manual, 'manual', true, true)
    returning * into v_person;
    v_person_created := true;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_person.id::text, 20261004));

  if exists (
    select 1 from public.volunteer_submissions
    where session_id = v_session and created_at > now() - interval '8 seconds'
  ) then
    raise exception 'VOLUNTEER_RATE_LIMIT';
  end if;

  select count(*) into v_assignment_count
  from public.volunteer_assignments
  where person_id = v_person.id and active;

  if jsonb_typeof(coalesce(p_responses, '[]'::jsonb)) <> 'array' then
    raise exception 'VOLUNTEER_RESPONSES_INCOMPLETE';
  end if;

  select count(distinct value->>'assignmentId') into v_response_count
  from jsonb_array_elements(coalesce(p_responses, '[]'::jsonb));

  if v_response_count <> v_assignment_count
     or exists (
       select 1
       from jsonb_array_elements(coalesce(p_responses, '[]'::jsonb)) r(value)
       where not exists (
         select 1 from public.volunteer_assignments a
         where a.id::text = r.value->>'assignmentId'
           and a.person_id = v_person.id and a.active
       )
     )
     or exists (
       select 1
       from public.volunteer_assignments a
       where a.person_id = v_person.id and a.active
         and not exists (
           select 1 from jsonb_array_elements(coalesce(p_responses, '[]'::jsonb)) r(value)
           where r.value->>'assignmentId' = a.id::text
         )
     ) then
    raise exception 'VOLUNTEER_RESPONSES_INCOMPLETE';
  end if;

  if exists (
    select 1 from jsonb_array_elements(coalesce(p_responses, '[]'::jsonb)) r(value)
    where coalesce(r.value->>'response','') not in ('confirmed','declined')
       or length(coalesce(r.value->>'note','')) > 1000
  ) then
    raise exception 'VOLUNTEER_RESPONSES_INCOMPLETE';
  end if;

  if jsonb_typeof(coalesce(p_availability, '[]'::jsonb)) <> 'array' then
    raise exception 'VOLUNTEER_INVALID_AVAILABILITY';
  end if;

  if exists (
    select 1 from jsonb_array_elements(coalesce(p_availability, '[]'::jsonb)) a(value)
    where length(coalesce(a.value->>'note','')) > 1000
       or not exists (
         select 1 from public.volunteer_shifts s
         where s.id::text = a.value->>'shiftId' and s.active and s.availability_selectable
       )
       or exists (
         select 1 from public.volunteer_assignments va
         where va.person_id = v_person.id and va.active
           and va.shift_id::text = a.value->>'shiftId'
       )
  ) or (
    select count(*) from jsonb_array_elements(coalesce(p_availability, '[]'::jsonb))
  ) <> (
    select count(distinct value->>'shiftId') from jsonb_array_elements(coalesce(p_availability, '[]'::jsonb))
  ) then
    raise exception 'VOLUNTEER_INVALID_AVAILABILITY';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'shiftId', av.shift_id,
    'note', av.note
  ) order by s.sort_order), '[]'::jsonb)
  into v_previous_availability
  from public.volunteer_availability av
  join public.volunteer_shifts s on s.id = av.shift_id
  where av.submission_id = (
    select id from public.volunteer_submissions
    where person_id = v_person.id order by created_at desc limit 1
  );

  insert into public.volunteer_submissions(
    client_submission_id, session_id, actor_name, person_id, selected_person_name, person_code
  ) values (
    p_client_submission_id, v_session, v_actor, v_person.id, v_person.display_name, v_person.person_code
  ) returning * into v_submission;

  if v_person_created then
    insert into public.volunteer_audit_log(
      submission_id, actor_name, person_id, person_code, action_type, entity_type, entity_id, new_value
    ) values (
      v_submission.id, v_actor, v_person.id, null, 'person_manual_created', 'person', v_person.id,
      jsonb_build_object('displayName', v_person.display_name)
    );
  end if;

  for v_response in select value from jsonb_array_elements(coalesce(p_responses, '[]'::jsonb)) loop
    select * into v_assignment
    from public.volunteer_assignments a
    where a.id::text = v_response->>'assignmentId'
      and a.person_id = v_person.id and a.active;

    if not found then raise exception 'VOLUNTEER_ASSIGNMENT_NOT_FOUND'; end if;

    select act.name,
           coalesce(s.day_label, v_assignment.raw_day, ''),
           coalesce(s.shift_label, v_assignment.raw_shift, '')
    into v_activity_name, v_day, v_shift
    from public.volunteer_activities act
    left join public.volunteer_shifts s on s.id = v_assignment.shift_id
    where act.id = v_assignment.activity_id;

    v_response_value := v_response->>'response';
    v_note := nullif(btrim(coalesce(v_response->>'note','')), '');

    select ar.response, ar.note
    into v_old_response, v_old_note
    from public.volunteer_assignment_responses ar
    join public.volunteer_submissions vs on vs.id = ar.submission_id
    where ar.assignment_id = v_assignment.id
    order by vs.created_at desc, ar.created_at desc
    limit 1;

    insert into public.volunteer_assignment_responses(
      submission_id, assignment_id, response, note,
      day_snapshot, shift_snapshot, activity_snapshot, role_snapshot
    ) values (
      v_submission.id, v_assignment.id, v_response_value, v_note,
      v_day, v_shift, v_activity_name, v_assignment.role
    );

    insert into public.volunteer_audit_log(
      submission_id, actor_name, person_id, person_code, action_type, entity_type, entity_id,
      previous_value, new_value, note
    ) values (
      v_submission.id, v_actor, v_person.id, v_person.person_code, 'assignment_response', 'assignment', v_assignment.id,
      case when v_old_response is null then null else jsonb_build_object('response', v_old_response, 'note', v_old_note) end,
      jsonb_build_object('response', v_response_value, 'note', v_note), v_note
    );
  end loop;

  for v_avail in select value from jsonb_array_elements(coalesce(p_availability, '[]'::jsonb)) loop
    insert into public.volunteer_availability(submission_id, shift_id, note)
    values (
      v_submission.id,
      (v_avail->>'shiftId')::uuid,
      nullif(btrim(coalesce(v_avail->>'note','')), '')
    );
  end loop;

  select coalesce(jsonb_agg(jsonb_build_object(
    'shiftId', av.shift_id,
    'note', av.note
  ) order by s.sort_order), '[]'::jsonb)
  into v_new_availability
  from public.volunteer_availability av
  join public.volunteer_shifts s on s.id = av.shift_id
  where av.submission_id = v_submission.id;

  insert into public.volunteer_audit_log(
    submission_id, actor_name, person_id, person_code, action_type, entity_type,
    previous_value, new_value
  ) values (
    v_submission.id, v_actor, v_person.id, v_person.person_code,
    'availability_snapshot', 'availability', v_previous_availability, v_new_availability
  );

  return jsonb_build_object(
    'id', v_submission.id,
    'personId', v_person.id,
    'personName', v_person.display_name,
    'personCode', v_person.person_code,
    'createdAt', v_submission.created_at,
    'duplicate', false
  );
end;
$$;

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
security invoker
set search_path = public, pg_temp
as $$
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

    v_old_value := jsonb_build_object(
      'personId', v_old.person_id, 'shiftId', v_old.shift_id,
      'rawDay', v_old.raw_day, 'rawShift', v_old.raw_shift,
      'activityId', v_old.activity_id, 'role', v_old.role,
      'requestedProfile', v_old.requested_profile, 'note', v_old.note
    );
    update public.volunteer_assignments set active = false, updated_at = now() where id = v_old.id;
  end if;

  insert into public.volunteer_assignments(
    person_id, shift_id, activity_id, raw_day, raw_shift, role, requested_profile, note,
    source_type, active, supersedes_assignment_id
  ) values (
    p_person_id, p_shift_id, v_activity_id,
    case when p_shift_id is null then nullif(v_day, '') else null end,
    case when p_shift_id is null then nullif(v_shift, '') else null end,
    nullif(btrim(coalesce(p_role,'')), ''),
    nullif(btrim(coalesce(p_requested_profile,'')), ''),
    nullif(btrim(coalesce(p_note,'')), ''),
    'admin', true, p_assignment_id
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
      'supersedesAssignmentId', v_new.supersedes_assignment_id
    ), v_new.note
  );

  return jsonb_build_object('id', v_new.id, 'active', true, 'supersedesAssignmentId', v_new.supersedes_assignment_id);
end;
$$;

create or replace function public.admin_deactivate_volunteer_assignment(
  p_actor_name text,
  p_assignment_id uuid,
  p_note text
) returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_actor text := btrim(coalesce(p_actor_name, ''));
  v_assignment public.volunteer_assignments%rowtype;
  v_person public.volunteer_people%rowtype;
  v_activity text;
  v_day text;
  v_shift text;
begin
  if length(v_actor) < 2 then raise exception 'VOLUNTEER_INVALID_ACTOR'; end if;

  select * into v_assignment
  from public.volunteer_assignments a
  where a.id = p_assignment_id and a.active
  for update;
  if not found then raise exception 'VOLUNTEER_ASSIGNMENT_NOT_FOUND'; end if;

  select act.name,
         coalesce(s.day_label, v_assignment.raw_day, ''),
         coalesce(s.shift_label, v_assignment.raw_shift, '')
  into v_activity, v_day, v_shift
  from public.volunteer_activities act
  left join public.volunteer_shifts s on s.id = v_assignment.shift_id
  where act.id = v_assignment.activity_id;

  select * into v_person from public.volunteer_people where id = v_assignment.person_id;
  update public.volunteer_assignments set active = false, updated_at = now() where id = v_assignment.id;

  insert into public.volunteer_audit_log(
    actor_name, person_id, person_code, action_type, entity_type, entity_id, previous_value, new_value, note
  ) values (
    v_actor, v_assignment.person_id, v_person.person_code, 'assignment_deactivated', 'assignment', v_assignment.id,
    jsonb_build_object(
      'active', true, 'day', v_day, 'shift', v_shift, 'activity', v_activity,
      'role', v_assignment.role, 'requestedProfile', v_assignment.requested_profile, 'note', v_assignment.note
    ), jsonb_build_object('active', false), nullif(btrim(coalesce(p_note,'')), '')
  );

  return jsonb_build_object('id', v_assignment.id, 'active', false);
end;
$$;

revoke all on function public.submit_volunteer_submission(text,uuid,text,uuid,text,jsonb,jsonb) from public, anon, authenticated;
revoke all on function public.admin_save_volunteer_assignment(text,uuid,uuid,uuid,text,text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.admin_deactivate_volunteer_assignment(text,uuid,text) from public, anon, authenticated;
grant execute on function public.submit_volunteer_submission(text,uuid,text,uuid,text,jsonb,jsonb) to service_role;
grant execute on function public.admin_save_volunteer_assignment(text,uuid,uuid,uuid,text,text,text,text,text,text) to service_role;
grant execute on function public.admin_deactivate_volunteer_assignment(text,uuid,text) to service_role;

commit;

import {
  ApiError,
  clean,
  formatApiError,
  isSameOrigin,
  isUuid,
  json,
  parseJsonBody,
  requireAdmin,
  rpc,
  supabaseRequest
} from './_lib/volunteers-common.mjs';

const rows = (value) => Array.isArray(value) ? value : [];

async function adminSnapshot() {
  const [people, shifts, activities, assignments, submissions, responses, availability] = await Promise.all([
    supabaseRequest('volunteer_people', {
      query: {
        select: 'id,person_code,display_name,surname,given_name,source_type,selectable,active,created_at,updated_at',
        active: 'eq.true',
        order: 'surname.asc,given_name.asc,display_name.asc'
      }
    }),
    supabaseRequest('volunteer_shifts', {
      query: {
        select: 'id,code,day_label,shift_label,starts_at,ends_at,sort_order,availability_selectable,active',
        active: 'eq.true',
        order: 'sort_order.asc'
      }
    }),
    supabaseRequest('volunteer_activities', {
      query: { select: 'id,name,active', active: 'eq.true', order: 'name.asc' }
    }),
    supabaseRequest('volunteer_assignments', {
      query: {
        select: 'id,person_id,shift_id,activity_id,raw_day,raw_shift,role,requested_profile,note,source_type,source_row,active,supersedes_assignment_id,created_at,updated_at',
        active: 'eq.true',
        order: 'created_at.asc'
      }
    }),
    supabaseRequest('volunteer_submissions', {
      query: { select: 'id,session_id,actor_name,person_id,selected_person_name,person_code,created_at', order: 'created_at.desc' }
    }),
    supabaseRequest('volunteer_assignment_responses', {
      query: { select: 'id,submission_id,assignment_id,response,note,created_at', order: 'created_at.desc' }
    }),
    supabaseRequest('volunteer_availability', {
      query: { select: 'id,submission_id,shift_id,note,created_at', order: 'created_at.desc' }
    })
  ]);

  const peopleRows = rows(people);
  const shiftRows = rows(shifts);
  const activityRows = rows(activities);
  const assignmentRows = rows(assignments);
  const submissionRows = rows(submissions);
  const responseRows = rows(responses);
  const availabilityRows = rows(availability);

  const personById = new Map(peopleRows.map((row) => [row.id, row]));
  const shiftById = new Map(shiftRows.map((row) => [row.id, row]));
  const activityById = new Map(activityRows.map((row) => [row.id, row]));
  const submissionById = new Map(submissionRows.map((row) => [row.id, row]));

  const latestSubmissionByPerson = new Map();
  for (const submission of submissionRows) {
    if (!latestSubmissionByPerson.has(submission.person_id)) latestSubmissionByPerson.set(submission.person_id, submission);
  }

  const latestResponseByAssignment = new Map();
  for (const response of responseRows) {
    const submission = submissionById.get(response.submission_id);
    const stamp = submission?.created_at || response.created_at || '';
    const current = latestResponseByAssignment.get(response.assignment_id);
    if (!current || String(stamp).localeCompare(String(current.stamp)) > 0) {
      latestResponseByAssignment.set(response.assignment_id, { ...response, stamp, actorName: submission?.actor_name || '' });
    }
  }

  const availabilityBySubmission = new Map();
  for (const item of availabilityRows) {
    if (!availabilityBySubmission.has(item.submission_id)) availabilityBySubmission.set(item.submission_id, []);
    const shift = shiftById.get(item.shift_id);
    availabilityBySubmission.get(item.submission_id).push({
      shiftId: item.shift_id,
      day: shift?.day_label || '',
      shift: shift?.shift_label || '',
      note: item.note || ''
    });
  }

  const hydratedAssignments = assignmentRows.map((assignment) => {
    const person = personById.get(assignment.person_id) || null;
    const shift = shiftById.get(assignment.shift_id) || null;
    const activity = activityById.get(assignment.activity_id) || null;
    const current = latestResponseByAssignment.get(assignment.id) || null;
    return {
      id: assignment.id,
      personId: assignment.person_id,
      personCode: person?.person_code || '',
      personName: person?.display_name || 'Persona non disponibile',
      shiftId: shift?.id || null,
      day: shift?.day_label || assignment.raw_day || '',
      shift: shift?.shift_label || assignment.raw_shift || '',
      shiftMatched: Boolean(shift),
      activityId: assignment.activity_id,
      activity: activity?.name || 'Attività',
      role: assignment.role || '',
      requestedProfile: assignment.requested_profile || '',
      note: assignment.note || '',
      sourceType: assignment.source_type,
      sourceRow: assignment.source_row,
      currentResponse: current?.response || null,
      currentNote: current?.note || '',
      currentResponseAt: current?.stamp || null,
      currentActorName: current?.actorName || ''
    };
  });

  const peopleWithState = peopleRows.map((person) => {
    const latest = latestSubmissionByPerson.get(person.id) || null;
    return {
      ...person,
      latestSubmission: latest ? {
        id: latest.id,
        actorName: latest.actor_name,
        createdAt: latest.created_at,
        availability: availabilityBySubmission.get(latest.id) || []
      } : null
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    people: peopleWithState,
    shifts: shiftRows,
    activities: activityRows,
    assignments: hydratedAssignments
  };
}

async function auditForPerson(personId) {
  if (!isUuid(personId)) throw new ApiError('Persona non valida.', 400, 'INVALID_PERSON');
  const audit = await supabaseRequest('volunteer_audit_log', {
    query: {
      select: 'id,submission_id,actor_name,person_id,person_code,action_type,entity_type,entity_id,previous_value,new_value,note,created_at',
      person_id: `eq.${personId}`,
      order: 'created_at.desc',
      limit: 300
    }
  });
  return rows(audit);
}

export default async (request) => {
  try {
    if (!isSameOrigin(request)) throw new ApiError('Origine non consentita.', 403, 'FORBIDDEN');
    const admin = requireAdmin(request);

    if (request.method === 'GET') {
      const url = new URL(request.url);
      const view = clean(url.searchParams.get('view') || 'snapshot', 30);
      if (view === 'snapshot') return json(await adminSnapshot());
      if (view === 'audit') {
        const personId = clean(url.searchParams.get('personId'), 60);
        return json({ audit: await auditForPerson(personId) });
      }
      throw new ApiError('Vista non valida.', 400, 'INVALID_VIEW');
    }

    if (request.method === 'POST') {
      const body = await parseJsonBody(request);
      const action = clean(body.action, 40);
      const actorName = `admin:${clean(admin.username, 100)}`;

      if (action === 'save-assignment') {
        const personId = clean(body.personId, 60);
        const assignmentId = clean(body.assignmentId, 60) || null;
        const shiftId = clean(body.shiftId, 60) || null;
        const activity = clean(body.activity, 200);
        if (!isUuid(personId)) throw new ApiError('Persona non valida.', 400, 'INVALID_PERSON');
        if (assignmentId && !isUuid(assignmentId)) throw new ApiError('Assegnazione non valida.', 400, 'INVALID_ASSIGNMENT');
        if (shiftId && !isUuid(shiftId)) throw new ApiError('Turno non valido.', 400, 'INVALID_SHIFT');
        if (!activity) throw new ApiError('Indica l’attività.', 400, 'ACTIVITY_REQUIRED');

        const result = await rpc('admin_save_volunteer_assignment', {
          p_actor_name: actorName,
          p_assignment_id: assignmentId,
          p_person_id: personId,
          p_shift_id: shiftId,
          p_raw_day: clean(body.rawDay, 80) || null,
          p_raw_shift: clean(body.rawShift, 80) || null,
          p_activity: activity,
          p_role: clean(body.role, 200) || null,
          p_requested_profile: clean(body.requestedProfile, 200) || null,
          p_note: clean(body.note, 1000) || null
        });
        return json({ ok: true, assignment: result });
      }

      if (action === 'deactivate-assignment') {
        const assignmentId = clean(body.assignmentId, 60);
        if (!isUuid(assignmentId)) throw new ApiError('Assegnazione non valida.', 400, 'INVALID_ASSIGNMENT');
        const result = await rpc('admin_deactivate_volunteer_assignment', {
          p_actor_name: actorName,
          p_assignment_id: assignmentId,
          p_note: clean(body.note, 1000) || null
        });
        return json({ ok: true, assignment: result });
      }

      throw new ApiError('Operazione non valida.', 400, 'INVALID_ACTION');
    }

    return json({ error: 'Metodo non consentito.' }, 405);
  } catch (error) {
    return formatApiError(error);
  }
};

export const config = { path: '/api/volunteers-admin' };

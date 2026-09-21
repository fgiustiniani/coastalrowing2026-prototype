import {
  ApiError,
  clean,
  formatApiError,
  isSameOrigin,
  isUuid,
  issueVolunteerSession,
  json,
  parseJsonBody,
  requireVolunteerSession,
  rpc,
  supabaseRequest,
  verifySharedAccessToken
} from './_lib/volunteers-common.mjs';

const rows = (value) => Array.isArray(value) ? value : [];

async function listPeople() {
  const [people, assignments] = await Promise.all([
    supabaseRequest('volunteer_people', { query: { select: 'id,person_code,display_name,surname,given_name', active: 'eq.true', selectable: 'eq.true', order: 'surname.asc,given_name.asc,display_name.asc' } }),
    supabaseRequest('volunteer_assignments', { query: { select: 'person_id', active: 'eq.true' } })
  ]);
  const assigned = new Set(rows(assignments).map((row) => row.person_id));
  return rows(people).filter((person) => assigned.has(person.id));
}

async function listSelectableShifts() {
  const shifts = await supabaseRequest('volunteer_shifts', {
    query: { select: 'id,code,day_label,shift_label,starts_at,ends_at,sort_order,availability_selectable', active: 'eq.true', availability_selectable: 'eq.true', order: 'sort_order.asc' }
  });
  return rows(shifts).map((shift) => ({
    id: shift.id,
    code: shift.code,
    day: shift.day_label,
    shift: shift.shift_label,
    startsAt: shift.starts_at,
    endsAt: shift.ends_at,
    assigned: false,
    selected: false,
    note: ''
  }));
}

async function personState(personId) {
  const people = await supabaseRequest('volunteer_people', {
    query: { select: 'id,person_code,display_name,surname,given_name', id: `eq.${personId}`, active: 'eq.true', selectable: 'eq.true', limit: 1 }
  });
  const person = rows(people)[0];
  if (!person) throw new ApiError('Persona non trovata.', 404, 'PERSON_NOT_FOUND');

  const [assignments, activities, shifts, submissions] = await Promise.all([
    supabaseRequest('volunteer_assignments', { query: { select: 'id,shift_id,activity_id,raw_day,raw_shift,role,requested_profile,note,created_at', person_id: `eq.${personId}`, active: 'eq.true', order: 'created_at.asc' } }),
    supabaseRequest('volunteer_activities', { query: { select: 'id,name,active', order: 'name.asc' } }),
    supabaseRequest('volunteer_shifts', { query: { select: 'id,code,day_label,shift_label,starts_at,ends_at,sort_order,availability_selectable', active: 'eq.true', order: 'sort_order.asc' } }),
    supabaseRequest('volunteer_submissions', { query: { select: 'id,actor_name,created_at', person_id: `eq.${personId}`, order: 'created_at.desc' } })
  ]);

  const assignmentRows = rows(assignments);
  const submissionRows = rows(submissions);
  const activityById = new Map(rows(activities).map((row) => [row.id, row]));
  const shiftById = new Map(rows(shifts).map((row) => [row.id, row]));
  const submissionTime = new Map(submissionRows.map((row) => [row.id, row.created_at]));
  const assignmentIds = assignmentRows.map((row) => row.id);

  let responseRows = [];
  if (assignmentIds.length) {
    responseRows = rows(await supabaseRequest('volunteer_assignment_responses', {
      query: { select: 'assignment_id,submission_id,response,note,created_at', assignment_id: `in.(${assignmentIds.join(',')})`, order: 'created_at.desc' }
    }));
  }
  const latestResponse = new Map();
  responseRows
    .sort((a, b) => String(submissionTime.get(b.submission_id) || b.created_at).localeCompare(String(submissionTime.get(a.submission_id) || a.created_at)))
    .forEach((row) => { if (!latestResponse.has(row.assignment_id)) latestResponse.set(row.assignment_id, row); });

  const latestSubmission = submissionRows[0] || null;
  let availabilityRows = [];
  if (latestSubmission) {
    availabilityRows = rows(await supabaseRequest('volunteer_availability', { query: { select: 'shift_id,note', submission_id: `eq.${latestSubmission.id}` } }));
  }
  const availabilityByShift = new Map(availabilityRows.map((row) => [row.shift_id, row]));

  const hydratedAssignments = assignmentRows.map((assignment) => {
    const shift = shiftById.get(assignment.shift_id) || null;
    const activity = activityById.get(assignment.activity_id) || null;
    const current = latestResponse.get(assignment.id) || null;
    return {
      id: assignment.id,
      day: shift?.day_label || assignment.raw_day || '',
      shift: shift?.shift_label || assignment.raw_shift || '',
      shiftId: shift?.id || null,
      shiftMatched: Boolean(shift),
      activity: activity?.name || 'Attività',
      role: assignment.role || '',
      requestedProfile: assignment.requested_profile || '',
      note: assignment.note || '',
      currentResponse: current?.response || null,
      currentNote: current?.note || '',
      currentResponseAt: current ? (submissionTime.get(current.submission_id) || current.created_at) : null
    };
  });

  const assignedShiftIds = new Set(hydratedAssignments.map((row) => row.shiftId).filter(Boolean));
  const availabilityShifts = rows(shifts)
    .filter((shift) => shift.availability_selectable)
    .map((shift) => ({
      id: shift.id,
      code: shift.code,
      day: shift.day_label,
      shift: shift.shift_label,
      startsAt: shift.starts_at,
      endsAt: shift.ends_at,
      assigned: assignedShiftIds.has(shift.id),
      selected: availabilityByShift.has(shift.id),
      note: availabilityByShift.get(shift.id)?.note || ''
    }));

  return {
    person,
    assignments: hydratedAssignments,
    availabilityShifts,
    latestSubmission: latestSubmission ? { id: latestSubmission.id, actorName: latestSubmission.actor_name, createdAt: latestSubmission.created_at } : null
  };
}

export default async (request) => {
  try {
    if (!isSameOrigin(request)) throw new ApiError('Origine non consentita.', 403, 'FORBIDDEN');

    if (request.method === 'POST') {
      const body = await parseJsonBody(request);
      const action = clean(body.action, 40);

      if (action === 'session') {
        if (clean(body.website, 200)) return json({ ok: true });
        if (!verifySharedAccessToken(body.accessToken)) throw new ApiError('Link di accesso non valido.', 401, 'INVALID_ACCESS');
        return json({ ok: true, ...issueVolunteerSession() });
      }

      const session = requireVolunteerSession(request);
      if (action !== 'submit') throw new ApiError('Operazione non valida.', 400, 'INVALID_ACTION');
      if (clean(body.website, 200)) return json({ ok: true });

      const actorName = clean(body.actorName, 120);
      const personId = clean(body.personId, 60) || null;
      const manualPersonName = clean(body.manualPersonName, 160) || null;
      const clientSubmissionId = clean(body.clientSubmissionId, 60);
      const responses = Array.isArray(body.responses) ? body.responses.slice(0, 200) : [];
      const availability = Array.isArray(body.availability) ? body.availability.slice(0, 50) : [];

      if (actorName.length < 2) throw new ApiError('Inserisci nome e cognome di chi sta compilando.', 400, 'ACTOR_REQUIRED');
      if (!personId && (!manualPersonName || manualPersonName.length < 2)) throw new ApiError('Seleziona una persona o inseriscila manualmente.', 400, 'PERSON_REQUIRED');
      if (personId && !isUuid(personId)) throw new ApiError('Persona non valida.', 400, 'INVALID_PERSON');
      if (!isUuid(clientSubmissionId)) throw new ApiError('Identificativo invio non valido.', 400, 'INVALID_SUBMISSION_ID');

      const result = await rpc('submit_volunteer_submission', {
        p_actor_name: actorName,
        p_person_id: personId,
        p_manual_person_name: manualPersonName,
        p_client_submission_id: clientSubmissionId,
        p_session_id: clean(session.jti, 100),
        p_responses: responses.map((item) => ({ assignmentId: clean(item?.assignmentId, 60), response: clean(item?.response, 20), note: clean(item?.note, 1000) })),
        p_availability: availability.map((item) => ({ shiftId: clean(item?.shiftId, 60), note: clean(item?.note, 1000) }))
      });
      return json({ ok: true, submission: result });
    }

    if (request.method === 'GET') {
      requireVolunteerSession(request);
      const url = new URL(request.url);
      const view = clean(url.searchParams.get('view') || 'people', 30);
      if (view === 'people') {
        const [people, shifts] = await Promise.all([listPeople(), listSelectableShifts()]);
        return json({ people, shifts });
      }
      if (view === 'person') {
        const personId = clean(url.searchParams.get('id'), 60);
        if (!isUuid(personId)) throw new ApiError('Persona non valida.', 400, 'INVALID_PERSON');
        return json(await personState(personId));
      }
      throw new ApiError('Vista non valida.', 400, 'INVALID_VIEW');
    }

    return json({ error: 'Metodo non consentito.' }, 405);
  } catch (error) {
    return formatApiError(error);
  }
};

export const config = { path: '/api/volunteers' };
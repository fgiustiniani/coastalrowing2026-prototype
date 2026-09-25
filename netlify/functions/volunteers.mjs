import { randomBytes } from 'node:crypto';
import {
  ApiError,
  SupabaseError,
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
import { sendVolunteerSummaryEmail } from './_lib/volunteer-emails.mjs';
import { sendVolunteerSummaryWhatsApp } from './_lib/volunteer-whatsapp.mjs';

const rows = (value) => Array.isArray(value) ? value : [];

async function listPeople(searchText = '') {
  const query = clean(searchText, 120).trim().toLocaleLowerCase('it-IT');
  if (query.length < 2) return [];
  const people = await supabaseRequest('volunteer_people', {
    query: {
      select: 'id,person_code,display_name,surname,given_name,source_type',
      active: 'eq.true',
      selectable: 'eq.true',
      order: 'surname.asc,given_name.asc,display_name.asc'
    }
  });
  return rows(people)
    .filter((person) => {
      const haystack = `${person.surname || ''} ${person.given_name || ''} ${person.display_name || ''} ${person.person_code || ''}`.toLocaleLowerCase('it-IT');
      return haystack.includes(query);
    })
    .slice(0, 12);
}

function normalizePersonName(value, maxLength = 160) {
  return clean(value, maxLength).replace(/\s+/g, ' ').trim();
}

async function resolveManualPerson(surnameValue, givenNameValue, legacyDisplayName = '') {
  const surname = normalizePersonName(surnameValue, 80);
  const givenName = normalizePersonName(givenNameValue, 80);
  let displayName = [surname, givenName].filter(Boolean).join(' ');

  if ((!surname || !givenName) && legacyDisplayName) {
    displayName = normalizePersonName(legacyDisplayName);
  }
  if (displayName.length < 2) throw new ApiError('Inserisci cognome e nome.', 400, 'PERSON_REQUIRED');

  const people = rows(await supabaseRequest('volunteer_people', {
    query: {
      select: 'id,person_code,display_name,surname,given_name,source_type',
      active: 'eq.true',
      selectable: 'eq.true',
      order: 'display_name.asc'
    }
  }));
  const displayKey = normalizePersonName(displayName).toLocaleLowerCase('it-IT');
  const existing = people.find((person) => {
    const exactFields = surname && givenName
      && normalizePersonName(person.surname || '', 80).toLocaleLowerCase('it-IT') === surname.toLocaleLowerCase('it-IT')
      && normalizePersonName(person.given_name || '', 80).toLocaleLowerCase('it-IT') === givenName.toLocaleLowerCase('it-IT');
    return exactFields || normalizePersonName(person.display_name).toLocaleLowerCase('it-IT') === displayKey;
  });
  if (existing) return { person: existing, created: false };

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const personCode = `SB${randomBytes(4).toString('hex').toUpperCase()}`;
    try {
      const created = rows(await supabaseRequest('volunteer_people', {
        method: 'POST',
        body: {
          person_code: personCode,
          surname: surname || null,
          given_name: givenName || null,
          display_name: displayName,
          source_type: 'manual',
          selectable: true,
          active: true
        },
        prefer: 'return=representation'
      }))[0];
      if (created) return { person: created, created: true };
    } catch (error) {
      if (!(error instanceof SupabaseError) || error.status !== 409) throw error;
    }
  }
  throw new ApiError('Non è stato possibile generare il codice del nominativo.', 500, 'MANUAL_PERSON_CODE_FAILED');
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
    sortOrder: Number(shift.sort_order ?? 9999),
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

  const [assignments, assignmentHistory, activities, shifts, submissions] = await Promise.all([
    supabaseRequest('volunteer_assignments', { query: { select: 'id,shift_id,activity_id,raw_day,raw_shift,role,requested_profile,note,supersedes_assignment_id,created_at', person_id: `eq.${personId}`, active: 'eq.true', order: 'created_at.asc' } }),
    supabaseRequest('volunteer_assignments', { query: { select: 'id,shift_id,raw_day,raw_shift,supersedes_assignment_id,created_at', person_id: `eq.${personId}`, order: 'created_at.asc' } }),
    supabaseRequest('volunteer_activities', { query: { select: 'id,name,active', order: 'name.asc' } }),
    supabaseRequest('volunteer_shifts', { query: { select: 'id,code,day_label,shift_label,starts_at,ends_at,sort_order,availability_selectable', active: 'eq.true', order: 'sort_order.asc' } }),
    supabaseRequest('volunteer_submissions', { query: { select: 'id,actor_name,created_at', person_id: `eq.${personId}`, order: 'created_at.desc' } })
  ]);

  const assignmentRows = rows(assignments);
  const assignmentHistoryRows = rows(assignmentHistory);
  const assignmentHistoryById = new Map(assignmentHistoryRows.map((row) => [row.id, row]));
  const submissionRows = rows(submissions);
  const activityById = new Map(rows(activities).map((row) => [row.id, row]));
  const shiftById = new Map(rows(shifts).map((row) => [row.id, row]));
  const submissionTime = new Map(submissionRows.map((row) => [row.id, row.created_at]));
  const assignmentIds = assignmentHistoryRows.map((row) => row.id);
  const submissionIds = submissionRows.map((row) => row.id);

  let responseRows = [];
  let assignmentAvailabilityAuditRows = [];
  let availabilityHistoryRows = [];
  const lookupTasks = [];
  if (assignmentIds.length) {
    lookupTasks.push(
      supabaseRequest('volunteer_assignment_responses', {
        query: { select: 'assignment_id,submission_id,response,note,created_at', assignment_id: `in.(${assignmentIds.join(',')})`, order: 'created_at.desc' }
      }).then((value) => { responseRows = rows(value); }),
      supabaseRequest('volunteer_audit_log', {
        query: {
          select: 'entity_id,action_type,created_at',
          person_id: `eq.${personId}`,
          entity_type: 'eq.assignment',
          action_type: 'eq.assignment_from_availability',
          entity_id: `in.(${assignmentIds.join(',')})`,
          order: 'created_at.asc'
        }
      }).then((value) => { assignmentAvailabilityAuditRows = rows(value); })
    );
  }
  if (submissionIds.length) {
    lookupTasks.push(
      supabaseRequest('volunteer_availability', {
        query: {
          select: 'submission_id,shift_id,created_at',
          submission_id: `in.(${submissionIds.join(',')})`,
          order: 'created_at.asc'
        }
      }).then((value) => { availabilityHistoryRows = rows(value); })
    );
  }
  if (lookupTasks.length) await Promise.all(lookupTasks);
  const latestResponse = new Map();
  responseRows
    .sort((a, b) => String(submissionTime.get(b.submission_id) || b.created_at).localeCompare(String(submissionTime.get(a.submission_id) || a.created_at)))
    .forEach((row) => { if (!latestResponse.has(row.assignment_id)) latestResponse.set(row.assignment_id, row); });

  const availabilityMarkedAssignmentIds = new Set(
    assignmentAvailabilityAuditRows.map((row) => row.entity_id).filter(Boolean)
  );
  const availabilityDeclaredAtByShift = new Map();
  for (const item of availabilityHistoryRows) {
    if (!item.shift_id) continue;
    const stamp = Date.parse(submissionTime.get(item.submission_id) || item.created_at || '');
    if (!Number.isFinite(stamp)) continue;
    if (!availabilityDeclaredAtByShift.has(item.shift_id)) availabilityDeclaredAtByShift.set(item.shift_id, []);
    availabilityDeclaredAtByShift.get(item.shift_id).push(stamp);
  }

  const sameAssignmentTurn = (current, previous) => {
    if (!current || !previous) return false;
    if (current.shift_id || previous.shift_id) {
      return Boolean(current.shift_id && previous.shift_id && current.shift_id === previous.shift_id);
    }
    return String(current.raw_day || '') === String(previous.raw_day || '')
      && String(current.raw_shift || '') === String(previous.raw_shift || '');
  };

  const responseForAssignment = (assignment) => {
    let current = assignment;
    const seen = new Set();

    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      const response = latestResponse.get(current.id) || null;
      if (response) return response;
      if (!current.supersedes_assignment_id) break;

      const previous = assignmentHistoryById.get(current.supersedes_assignment_id) || null;
      if (!previous || !sameAssignmentTurn(current, previous)) break;
      current = previous;
    }
    return null;
  };

  const assignmentEnteredCurrentShiftAt = (assignment) => {
    if (!assignment?.id || !assignment.shift_id) return null;
    let current = assignment;
    let enteredAt = Date.parse(current.created_at || '');
    enteredAt = Number.isFinite(enteredAt) ? enteredAt : null;
    const seen = new Set();

    while (current?.supersedes_assignment_id && !seen.has(current.id)) {
      seen.add(current.id);
      const previous = assignmentHistoryById.get(current.supersedes_assignment_id) || null;
      if (!previous || !sameAssignmentTurn(current, previous)) break;
      const previousAt = Date.parse(previous.created_at || '');
      if (Number.isFinite(previousAt) && (enteredAt === null || previousAt < enteredAt)) enteredAt = previousAt;
      current = previous;
    }
    return enteredAt;
  };

  const assignmentComesFromAvailability = (assignment) => {
    if (!assignment?.shift_id) return false;

    let current = assignment;
    const seen = new Set();

    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      if (availabilityMarkedAssignmentIds.has(current.id)) return true;
      if (!current.supersedes_assignment_id) break;

      const previous = assignmentHistoryById.get(current.supersedes_assignment_id) || null;
      if (!previous || !sameAssignmentTurn(current, previous)) break;
      current = previous;
    }

    const enteredAt = assignmentEnteredCurrentShiftAt(assignment);
    if (!Number.isFinite(enteredAt)) return false;
    const declaredAt = availabilityDeclaredAtByShift.get(assignment.shift_id) || [];
    return declaredAt.some((stamp) => stamp <= enteredAt);
  };

  const latestSubmission = submissionRows[0] || null;
  let availabilityRows = [];
  if (latestSubmission) {
    availabilityRows = rows(await supabaseRequest('volunteer_availability', { query: { select: 'shift_id,note', submission_id: `eq.${latestSubmission.id}` } }));
  }
  const availabilityByShift = new Map(availabilityRows.map((row) => [row.shift_id, row]));

  const hydratedAssignments = assignmentRows.map((assignment) => {
    const shift = shiftById.get(assignment.shift_id) || null;
    const activity = activityById.get(assignment.activity_id) || null;
    const current = responseForAssignment(assignment);
    return {
      id: assignment.id,
      day: shift?.day_label || assignment.raw_day || '',
      shift: shift?.shift_label || assignment.raw_shift || '',
      shiftId: shift?.id || null,
      shiftMatched: Boolean(shift),
      startsAt: shift?.starts_at || null,
      endsAt: shift?.ends_at || null,
      sortOrder: Number(shift?.sort_order ?? 9999),
      activity: activity?.name || 'Attività',
      role: assignment.role || '',
      requestedProfile: assignment.requested_profile || '',
      note: assignment.note || '',
      assignedFromAvailability: assignmentComesFromAvailability(assignment),
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
      sortOrder: Number(shift.sort_order ?? 9999),
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

      if (action === 'email-summary') {
        const email = clean(body.email, 254);
        const submissionId = clean(body.submissionId, 60);
        if (!isUuid(submissionId)) throw new ApiError('Invio non valido.', 400, 'INVALID_SUBMISSION_ID');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError('Inserisci un indirizzo email valido.', 400, 'INVALID_EMAIL');

        const submissions = rows(await supabaseRequest('volunteer_submissions', {
          query: {
            select: 'id,session_id,actor_name,person_id,person_code,selected_person_name,created_at',
            id: `eq.${submissionId}`,
            session_id: `eq.${clean(session.jti, 100)}`,
            limit: 1
          }
        }));
        const submission = submissions[0];
        if (!submission) throw new ApiError('Invio non trovato per questa sessione.', 404, 'SUBMISSION_NOT_FOUND');

        const previousEmails = rows(await supabaseRequest('volunteer_audit_log', {
          query: {
            select: 'id',
            submission_id: `eq.${submissionId}`,
            action_type: 'eq.summary_email_sent',
            limit: 3
          }
        }));
        if (previousEmails.length >= 3) {
          throw new ApiError('Hai già richiesto più volte il riepilogo per questo invio.', 429, 'EMAIL_RATE_LIMIT');
        }

        const state = await personState(submission.person_id);
        await sendVolunteerSummaryEmail({ email, personState: state, requestUrl: request.url });

        try {
          await supabaseRequest('volunteer_audit_log', {
            method: 'POST',
            body: {
              submission_id: submission.id,
              actor_name: submission.actor_name || 'Volontario',
              person_id: submission.person_id,
              person_code: submission.person_code || null,
              action_type: 'summary_email_sent',
              entity_type: 'submission',
              entity_id: submission.id,
              new_value: { sent: true, email }
            },
            prefer: 'return=minimal'
          });
        } catch (auditError) {
          console.error('Audit invio riepilogo volontario fallito:', auditError?.message || auditError);
        }

        return json({ ok: true, sent: true });
      }

      if (action === 'whatsapp-summary') {
        const phone = clean(body.phone, 40);
        const submissionId = clean(body.submissionId, 60);
        if (!isUuid(submissionId)) throw new ApiError('Invio non valido.', 400, 'INVALID_SUBMISSION_ID');

        const submissions = rows(await supabaseRequest('volunteer_submissions', {
          query: {
            select: 'id,session_id,actor_name,person_id,person_code,selected_person_name,created_at',
            id: `eq.${submissionId}`,
            session_id: `eq.${clean(session.jti, 100)}`,
            limit: 1
          }
        }));
        const submission = submissions[0];
        if (!submission) throw new ApiError('Invio non trovato per questa sessione.', 404, 'SUBMISSION_NOT_FOUND');

        const previousWhatsApps = rows(await supabaseRequest('volunteer_audit_log', {
          query: {
            select: 'id',
            submission_id: `eq.${submissionId}`,
            action_type: 'eq.summary_whatsapp_sent',
            limit: 3
          }
        }));
        if (previousWhatsApps.length >= 3) {
          throw new ApiError('Hai già richiesto più volte il riepilogo per questo invio.', 429, 'WHATSAPP_RATE_LIMIT');
        }

        await sendVolunteerSummaryWhatsApp({
          phone,
          personName: submission.selected_person_name,
          submissionId: submission.id
        });

        try {
          await supabaseRequest('volunteer_audit_log', {
            method: 'POST',
            body: {
              submission_id: submission.id,
              actor_name: submission.actor_name || 'Volontario',
              person_id: submission.person_id,
              person_code: submission.person_code || null,
              action_type: 'summary_whatsapp_sent',
              entity_type: 'submission',
              entity_id: submission.id,
              new_value: { sent: true }
            },
            prefer: 'return=minimal'
          });
        } catch (auditError) {
          console.error('Audit invio WhatsApp riepilogo volontario fallito:', auditError?.message || auditError);
        }

        return json({ ok: true, sent: true });
      }

      if (action !== 'submit') throw new ApiError('Operazione non valida.', 400, 'INVALID_ACTION');
      if (clean(body.website, 200)) return json({ ok: true });

      const actorName = clean(body.actorName, 120);
      const personId = clean(body.personId, 60) || null;
      const manualPersonName = clean(body.manualPersonName, 160) || null;
      const manualSurname = clean(body.manualSurname, 80) || null;
      const manualGivenName = clean(body.manualGivenName, 80) || null;
      const clientSubmissionId = clean(body.clientSubmissionId, 60);
      const responses = Array.isArray(body.responses) ? body.responses.slice(0, 200) : [];
      const availability = Array.isArray(body.availability) ? body.availability.slice(0, 50) : [];

      if (actorName.length < 2) throw new ApiError('Inserisci nome e cognome di chi sta compilando.', 400, 'ACTOR_REQUIRED');
      if (!personId && ((!manualSurname || manualSurname.length < 2 || !manualGivenName || manualGivenName.length < 2) && (!manualPersonName || manualPersonName.length < 2))) throw new ApiError('Seleziona una persona o inserisci cognome e nome.', 400, 'PERSON_REQUIRED');
      if (personId && !isUuid(personId)) throw new ApiError('Persona non valida.', 400, 'INVALID_PERSON');
      if (!isUuid(clientSubmissionId)) throw new ApiError('Identificativo invio non valido.', 400, 'INVALID_SUBMISSION_ID');

      let resolvedPersonId = personId;
      let createdManualPerson = null;
      if (!resolvedPersonId) {
        const resolved = await resolveManualPerson(manualSurname, manualGivenName, manualPersonName);
        resolvedPersonId = resolved.person.id;
        if (resolved.created) createdManualPerson = resolved.person;
      }

      let result;
      try {
        result = await rpc('submit_volunteer_submission', {
          p_actor_name: actorName,
          p_person_id: resolvedPersonId,
          p_manual_person_name: null,
          p_client_submission_id: clientSubmissionId,
          p_session_id: clean(session.jti, 100),
          p_responses: responses.map((item) => ({ assignmentId: clean(item?.assignmentId, 60), response: clean(item?.response, 20), note: clean(item?.note, 1000) })),
          p_availability: availability.map((item) => ({ shiftId: clean(item?.shiftId, 60), note: clean(item?.note, 1000) }))
        });
      } catch (error) {
        if (createdManualPerson?.id) {
          try {
            await supabaseRequest('volunteer_people', {
              method: 'DELETE',
              query: { id: `eq.${createdManualPerson.id}` },
              prefer: 'return=minimal'
            });
          } catch {}
        }
        throw error;
      }

      if (createdManualPerson) {
        try {
          await supabaseRequest('volunteer_audit_log', {
            method: 'POST',
            body: {
              submission_id: result?.id || null,
              actor_name: actorName,
              person_id: createdManualPerson.id,
              person_code: createdManualPerson.person_code,
              action_type: 'person_manual_created',
              entity_type: 'person',
              entity_id: createdManualPerson.id,
              new_value: {
                surname: createdManualPerson.surname || null,
                givenName: createdManualPerson.given_name || null,
                displayName: createdManualPerson.display_name,
                personCode: createdManualPerson.person_code
              }
            },
            prefer: 'return=minimal'
          });
        } catch (auditError) {
          console.error('Volunteer manual person audit failed', auditError?.message || auditError);
        }
      }

      return json({ ok: true, submission: result });
    }

    if (request.method === 'GET') {
      requireVolunteerSession(request);
      const url = new URL(request.url);
      const view = clean(url.searchParams.get('view') || 'people', 30);
      if (view === 'people') {
        const query = clean(url.searchParams.get('q'), 120);
        const [people, shifts] = await Promise.all([listPeople(query), listSelectableShifts()]);
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
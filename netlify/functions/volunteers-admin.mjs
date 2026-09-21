import {
  ApiError,
  SupabaseError,
  clean,
  formatApiError,
  isSameOrigin,
  isUuid,
  issueVolunteerInvite,
  json,
  parseJsonBody,
  requireAdmin,
  rpc,
  supabaseRequest
} from './_lib/volunteers-common.mjs';

const rows = (value) => Array.isArray(value) ? value : [];

async function adminRead(operation, path, options) {
  try {
    return await supabaseRequest(path, options);
  } catch (error) {
    if (error instanceof SupabaseError) error.operation = operation;
    throw error;
  }
}

async function adminReadOptional(operation, path, options) {
  try {
    return await adminRead(operation, path, options);
  } catch (error) {
    const code = clean(error?.payload?.code || '', 50);
    if (error instanceof SupabaseError && (code === 'PGRST205' || code === '42P01')) return null;
    throw error;
  }
}

async function adminReadOptionalColumn(operation, path, options) {
  try {
    return await adminRead(operation, path, options);
  } catch (error) {
    const code = clean(error?.payload?.code || '', 50);
    if (error instanceof SupabaseError && ['PGRST204', '42703'].includes(code)) return null;
    throw error;
  }
}

async function adminSnapshot() {
  const [people, shifts, activities, assignments, assignmentResponsibilities, submissions, responses, availability, raceProgram] = await Promise.all([
    adminRead('persone', 'volunteer_people', {
      query: {
        select: 'id,person_code,display_name,surname,given_name,source_type,selectable,active,created_at,updated_at',
        active: 'eq.true',
        order: 'surname.asc,given_name.asc,display_name.asc'
      }
    }),
    adminRead('turni', 'volunteer_shifts', {
      query: {
        select: 'id,code,day_label,shift_label,starts_at,ends_at,sort_order,availability_selectable,active',
        active: 'eq.true',
        order: 'sort_order.asc'
      }
    }),
    adminRead('attività', 'volunteer_activities', {
      query: { select: 'id,name,active,created_at,updated_at', order: 'name.asc' }
    }),
    adminRead('assegnazioni', 'volunteer_assignments', {
      query: {
        select: 'id,person_id,shift_id,activity_id,raw_day,raw_shift,role,requested_profile,note,source_type,source_row,active,supersedes_assignment_id,created_at,updated_at',
        active: 'eq.true',
        order: 'created_at.asc'
      }
    }),
    adminReadOptionalColumn('responsabili assegnazioni', 'volunteer_assignments', {
      query: {
        select: 'id,is_responsible',
        active: 'eq.true'
      }
    }),
    adminRead('invii', 'volunteer_submissions', {
      query: { select: 'id,session_id,actor_name,person_id,selected_person_name,person_code,created_at', order: 'created_at.desc' }
    }),
    adminRead('risposte', 'volunteer_assignment_responses', {
      query: { select: 'id,submission_id,assignment_id,response,note,created_at', order: 'created_at.desc' }
    }),
    adminRead('disponibilità', 'volunteer_availability', {
      query: { select: 'id,submission_id,shift_id,note,created_at', order: 'created_at.desc' }
    }),
    adminReadOptional('programma gare', 'volunteer_race_program', {
      query: {
        select: 'id,person_id,person_code,person_name,crew_label,race_date,race_time,source_type,source_row,active,created_at,updated_at',
        active: 'eq.true',
        order: 'person_name.asc,crew_label.asc'
      }
    })
  ]);

  const peopleRows = rows(people);
  const shiftRows = rows(shifts);
  const activityRows = rows(activities);
  const assignmentRows = rows(assignments);
  const responsibilityRows = rows(assignmentResponsibilities);
  const submissionRows = rows(submissions);
  const responseRows = rows(responses);
  const availabilityRows = rows(availability);
  const raceRows = rows(raceProgram);

  const personById = new Map(peopleRows.map((row) => [row.id, row]));
  const shiftById = new Map(shiftRows.map((row) => [row.id, row]));
  const activityById = new Map(activityRows.map((row) => [row.id, row]));
  const submissionById = new Map(submissionRows.map((row) => [row.id, row]));
  const responsibilityByAssignmentId = new Map(responsibilityRows.map((row) => [row.id, row.is_responsible === true]));

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
      personSourceType: person?.source_type || '',
      shiftId: shift?.id || null,
      day: shift?.day_label || assignment.raw_day || '',
      shift: shift?.shift_label || assignment.raw_shift || '',
      shiftMatched: Boolean(shift),
      activityId: assignment.activity_id,
      activity: activity?.name || 'Attività',
      activityActive: activity?.active !== false,
      role: assignment.role || '',
      requestedProfile: assignment.requested_profile || '',
      note: assignment.note || '',
      sourceType: assignment.source_type,
      sourceRow: assignment.source_row,
      isResponsible: responsibilityByAssignmentId.get(assignment.id) || false,
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

  const hydratedRaceProgram = raceRows.map((entry) => {
    const person = personById.get(entry.person_id) || null;
    return {
      id: entry.id,
      personId: entry.person_id,
      personCode: person?.person_code || entry.person_code || '',
      personName: person?.display_name || entry.person_name || 'Persona non disponibile',
      crewLabel: entry.crew_label || '',
      raceDate: entry.race_date || null,
      raceTime: entry.race_time ? String(entry.race_time).slice(0, 5) : null,
      sourceType: entry.source_type,
      sourceRow: entry.source_row
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    people: peopleWithState,
    shifts: shiftRows,
    activities: activityRows.filter((row) => row.active),
    activityCatalog: activityRows,
    assignments: hydratedAssignments,
    responsibilityAvailable: assignmentResponsibilities !== null,
    raceProgramAvailable: raceProgram !== null,
    raceProgram: hydratedRaceProgram
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

async function auditAdminChange({ actorName, actionType, entityType, entityId, person = null, previousValue = null, newValue = null, note = null }) {
  await supabaseRequest('volunteer_audit_log', {
    method: 'POST',
    body: {
      actor_name: actorName,
      person_id: person?.id || null,
      person_code: person?.person_code || null,
      action_type: actionType,
      entity_type: entityType,
      entity_id: entityId || null,
      previous_value: previousValue,
      new_value: newValue,
      note: note || null
    },
    prefer: 'return=minimal'
  });
}

async function activePerson(personId) {
  const people = await supabaseRequest('volunteer_people', {
    query: {
      select: 'id,person_code,display_name,source_type,active',
      id: `eq.${personId}`,
      active: 'eq.true',
      limit: 1
    }
  });
  const person = rows(people)[0];
  if (!person) throw new ApiError('Persona non valida.', 400, 'INVALID_PERSON');
  return person;
}

function normalizeRaceDate(value) {
  const text = clean(value, 10);
  if (!text) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new ApiError('Data gara non valida.', 400, 'INVALID_RACE_DATE');
  return text;
}

function normalizeRaceTime(value) {
  const text = clean(value, 8);
  if (!text) return null;
  const normalized = text.slice(0, 5);
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(normalized)) throw new ApiError('Orario gara non valido.', 400, 'INVALID_RACE_TIME');
  return normalized;
}

async function requireRaceProgramTable() {
  const probe = await adminReadOptional('programma gare', 'volunteer_race_program', {
    query: { select: 'id', limit: 1 }
  });
  if (probe === null) {
    throw new ApiError('L’anagrafica programma gare non è ancora inizializzata nel database.', 503, 'RACE_PROGRAM_NOT_INITIALIZED');
  }
}

export default async (request) => {
  try {
    if (!isSameOrigin(request)) throw new ApiError('Origine non consentita.', 403, 'FORBIDDEN');
    const admin = requireAdmin(request);

    if (request.method === 'GET') {
      const url = new URL(request.url);
      const view = clean(url.searchParams.get('view') || 'snapshot', 30);
      if (view === 'snapshot') return json(await adminSnapshot());
      if (view === 'invite') {
        const origin = new URL(request.url).origin;
        const invite = issueVolunteerInvite();
        return json({
          accessUrl: `${origin}/internal/volontari/#access=${encodeURIComponent(invite)}`,
          expiresAt: '2026-10-06T21:59:59.000Z'
        });
      }
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

      if (action === 'set-assignment-responsible') {
        const assignmentId = clean(body.assignmentId, 60);
        if (!isUuid(assignmentId)) throw new ApiError('Assegnazione non valida.', 400, 'INVALID_ASSIGNMENT');
        const isResponsible = body.isResponsible === true;
        try {
          const result = await rpc('admin_set_volunteer_assignment_responsible', {
            p_actor_name: actorName,
            p_assignment_id: assignmentId,
            p_is_responsible: isResponsible
          });
          return json({ ok: true, assignment: result });
        } catch (error) {
          const code = clean(error?.payload?.code || '', 50);
          if (error instanceof SupabaseError && ['PGRST202', '42883'].includes(code)) {
            throw new ApiError('La funzione responsabile non è ancora inizializzata nel database.', 503, 'RESPONSIBILITY_NOT_INITIALIZED');
          }
          throw error;
        }
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

      if (action === 'save-activity') {
        const activityId = clean(body.activityId, 60) || null;
        const name = clean(body.name, 200);
        if (!name) throw new ApiError('Indica il nome dell’attività.', 400, 'ACTIVITY_REQUIRED');
        if (activityId && !isUuid(activityId)) throw new ApiError('Attività non valida.', 400, 'INVALID_ACTIVITY');

        let current = null;
        let saved = null;
        if (activityId) {
          const currentRows = await supabaseRequest('volunteer_activities', {
            query: { select: 'id,name,active', id: `eq.${activityId}`, limit: 1 }
          });
          current = rows(currentRows)[0] || null;
          if (!current) throw new ApiError('Attività non trovata.', 404, 'ACTIVITY_NOT_FOUND');
          const result = await supabaseRequest('volunteer_activities', {
            method: 'PATCH',
            query: { id: `eq.${activityId}` },
            body: { name, active: true, updated_at: new Date().toISOString() },
            prefer: 'return=representation'
          });
          saved = rows(result)[0] || null;
        } else {
          const existingRows = await supabaseRequest('volunteer_activities', {
            query: { select: 'id,name,active', name: `eq.${name}`, limit: 1 }
          });
          current = rows(existingRows)[0] || null;
          if (current) {
            const result = await supabaseRequest('volunteer_activities', {
              method: 'PATCH',
              query: { id: `eq.${current.id}` },
              body: { active: true, updated_at: new Date().toISOString() },
              prefer: 'return=representation'
            });
            saved = rows(result)[0] || null;
          } else {
            const result = await supabaseRequest('volunteer_activities', {
              method: 'POST',
              body: { name, active: true },
              prefer: 'return=representation'
            });
            saved = rows(result)[0] || null;
          }
        }
        if (!saved) throw new ApiError('Attività non salvata.', 500, 'ACTIVITY_SAVE_FAILED');
        await auditAdminChange({
          actorName,
          actionType: current ? 'activity_updated' : 'activity_created',
          entityType: 'activity',
          entityId: saved.id,
          previousValue: current,
          newValue: { id: saved.id, name: saved.name, active: saved.active }
        });
        return json({ ok: true, activity: saved });
      }

      if (action === 'delete-activity') {
        const activityId = clean(body.activityId, 60);
        if (!isUuid(activityId)) throw new ApiError('Attività non valida.', 400, 'INVALID_ACTIVITY');
        const currentRows = await supabaseRequest('volunteer_activities', {
          query: { select: 'id,name,active', id: `eq.${activityId}`, limit: 1 }
        });
        const current = rows(currentRows)[0] || null;
        if (!current) throw new ApiError('Attività non trovata.', 404, 'ACTIVITY_NOT_FOUND');
        await supabaseRequest('volunteer_activities', {
          method: 'PATCH',
          query: { id: `eq.${activityId}` },
          body: { active: false, updated_at: new Date().toISOString() },
          prefer: 'return=minimal'
        });
        await auditAdminChange({
          actorName,
          actionType: 'activity_deactivated',
          entityType: 'activity',
          entityId: activityId,
          previousValue: current,
          newValue: { ...current, active: false }
        });
        return json({ ok: true });
      }

      if (action === 'save-race-entry') {
        await requireRaceProgramTable();
        const entryId = clean(body.entryId, 60) || null;
        const personId = clean(body.personId, 60);
        const crewLabel = clean(body.crewLabel, 240);
        const raceDate = normalizeRaceDate(body.raceDate);
        const raceTime = normalizeRaceTime(body.raceTime);
        if (entryId && !isUuid(entryId)) throw new ApiError('Voce gara non valida.', 400, 'INVALID_RACE_ENTRY');
        if (!isUuid(personId)) throw new ApiError('Persona non valida.', 400, 'INVALID_PERSON');
        if (!crewLabel) throw new ApiError('Indica equipaggio/categoria.', 400, 'RACE_CREW_REQUIRED');

        const person = await activePerson(personId);
        if (!person.person_code) throw new ApiError('La persona selezionata non ha un codice socio.', 400, 'PERSON_CODE_REQUIRED');

        let current = null;
        let saved = null;
        const nextValue = {
          person_id: person.id,
          person_code: person.person_code,
          person_name: person.display_name,
          crew_label: crewLabel,
          race_date: raceDate,
          race_time: raceTime,
          source_type: 'admin',
          active: true,
          updated_at: new Date().toISOString()
        };

        if (entryId) {
          const currentRows = await supabaseRequest('volunteer_race_program', {
            query: { select: 'id,person_id,person_code,person_name,crew_label,race_date,race_time,active', id: `eq.${entryId}`, limit: 1 }
          });
          current = rows(currentRows)[0] || null;
          if (!current) throw new ApiError('Voce gara non trovata.', 404, 'RACE_ENTRY_NOT_FOUND');
          const result = await supabaseRequest('volunteer_race_program', {
            method: 'PATCH',
            query: { id: `eq.${entryId}` },
            body: nextValue,
            prefer: 'return=representation'
          });
          saved = rows(result)[0] || null;
        } else {
          const existingRows = await supabaseRequest('volunteer_race_program', {
            query: {
              select: 'id,person_id,person_code,person_name,crew_label,race_date,race_time,active',
              person_code: `eq.${person.person_code}`,
              crew_label: `eq.${crewLabel}`,
              limit: 1
            }
          });
          current = rows(existingRows)[0] || null;
          if (current) {
            const result = await supabaseRequest('volunteer_race_program', {
              method: 'PATCH',
              query: { id: `eq.${current.id}` },
              body: nextValue,
              prefer: 'return=representation'
            });
            saved = rows(result)[0] || null;
          } else {
            const result = await supabaseRequest('volunteer_race_program', {
              method: 'POST',
              body: { ...nextValue, source_row: null },
              prefer: 'return=representation'
            });
            saved = rows(result)[0] || null;
          }
        }
        if (!saved) throw new ApiError('Voce gara non salvata.', 500, 'RACE_ENTRY_SAVE_FAILED');
        await auditAdminChange({
          actorName,
          actionType: current ? 'race_entry_updated' : 'race_entry_created',
          entityType: 'race_program',
          entityId: saved.id,
          person,
          previousValue: current,
          newValue: saved
        });
        return json({ ok: true, raceEntry: saved });
      }

      if (action === 'delete-race-entry') {
        await requireRaceProgramTable();
        const entryId = clean(body.entryId, 60);
        if (!isUuid(entryId)) throw new ApiError('Voce gara non valida.', 400, 'INVALID_RACE_ENTRY');
        const currentRows = await supabaseRequest('volunteer_race_program', {
          query: { select: 'id,person_id,person_code,person_name,crew_label,race_date,race_time,active', id: `eq.${entryId}`, limit: 1 }
        });
        const current = rows(currentRows)[0] || null;
        if (!current) throw new ApiError('Voce gara non trovata.', 404, 'RACE_ENTRY_NOT_FOUND');
        await supabaseRequest('volunteer_race_program', {
          method: 'PATCH',
          query: { id: `eq.${entryId}` },
          body: { active: false, updated_at: new Date().toISOString() },
          prefer: 'return=minimal'
        });
        const person = await activePerson(current.person_id);
        await auditAdminChange({
          actorName,
          actionType: 'race_entry_deactivated',
          entityType: 'race_program',
          entityId: entryId,
          person,
          previousValue: current,
          newValue: { ...current, active: false }
        });
        return json({ ok: true });
      }

      throw new ApiError('Operazione non valida.', 400, 'INVALID_ACTION');
    }

    return json({ error: 'Metodo non consentito.' }, 405);
  } catch (error) {
    if (error instanceof SupabaseError) {
      const dbCode = clean(error.payload?.code || '', 50) || 'DATABASE_ERROR';
      const dbMessage = clean(error.payload?.message || error.message || 'Errore database.', 260);
      const operation = clean(error.operation || 'operazione', 80);
      console.error('Errore database area volontari admin:', {
        operation,
        status: error.status,
        code: dbCode,
        message: dbMessage
      });
      return json({
        error: `Database (${operation}): ${dbMessage} [${dbCode}]`,
        code: dbCode
      }, 500);
    }
    return formatApiError(error);
  }
};

export const config = { path: '/api/volunteers-admin' };
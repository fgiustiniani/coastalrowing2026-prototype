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
  const [people, shifts, activities, assignments, assignmentHistory, assignmentResponsibilities, submissions, responses, availability, raceProgram, requirements] = await Promise.all([
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
        select: 'id,person_id,shift_id,activity_id,raw_day,raw_shift,role,requested_profile,note,source_type,source_row,active,supersedes_assignment_id,display_order,created_at,updated_at',
        active: 'eq.true',
        order: 'created_at.asc'
      }
    }),
    adminRead('storico assegnazioni', 'volunteer_assignments', {
      query: {
        select: 'id,person_id,shift_id,activity_id,raw_day,raw_shift,role,requested_profile,note,source_type,source_row,active,supersedes_assignment_id,display_order,created_at,updated_at',
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
      query: {
        select: 'id,submission_id,assignment_id,response,note,day_snapshot,shift_snapshot,activity_snapshot,role_snapshot,created_at',
        order: 'created_at.desc'
      }
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
    }),
    adminReadOptional('esigenze attività', 'volunteer_activity_requirements', {
      query: {
        select: 'id,shift_id,activity_id,required_count,active,created_at,updated_at',
        active: 'eq.true',
        order: 'created_at.asc'
      }
    })
  ]);

  const peopleRows = rows(people);
  const shiftRows = rows(shifts);
  const activityRows = rows(activities);
  const assignmentRows = rows(assignments);
  const assignmentHistoryRows = rows(assignmentHistory);
  const responsibilityRows = rows(assignmentResponsibilities);
  const submissionRows = rows(submissions);
  const responseRows = rows(responses);
  const availabilityRows = rows(availability);
  const raceRows = rows(raceProgram);
  const requirementRows = rows(requirements);

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
      displayOrder: Number(assignment.display_order || 0),
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

  const assignmentHistoryById = new Map(assignmentHistoryRows.map((row) => [row.id, row]));

  const hydrateComparisonAssignment = (assignment) => {
    if (!assignment) return null;
    const person = personById.get(assignment.person_id) || null;
    const shift = shiftById.get(assignment.shift_id) || null;
    const activity = activityById.get(assignment.activity_id) || null;
    return {
      assignmentId: assignment.id,
      personId: assignment.person_id,
      personName: person?.display_name || 'Persona non disponibile',
      day: shift?.day_label || assignment.raw_day || '',
      shift: shift?.shift_label || assignment.raw_shift || '',
      activity: activity?.name || 'Attività',
      role: assignment.role || '',
      createdAt: assignment.created_at || null,
      updatedAt: assignment.updated_at || null
    };
  };

  const lineageIds = (assignment) => {
    const ids = [];
    const seen = new Set();
    let current = assignment || null;
    while (current?.id && !seen.has(current.id)) {
      ids.push(current.id);
      seen.add(current.id);
      current = current.supersedes_assignment_id
        ? assignmentHistoryById.get(current.supersedes_assignment_id) || null
        : null;
    }
    return ids;
  };

  const activeDescendantByAncestor = new Map();
  for (const active of assignmentRows) {
    for (const ancestorId of lineageIds(active)) {
      const existing = activeDescendantByAncestor.get(ancestorId);
      if (!existing || String(active.created_at || '').localeCompare(String(existing.created_at || '')) > 0) {
        activeDescendantByAncestor.set(ancestorId, active);
      }
    }
  }

  const latestBaselineResponsesByPerson = new Map();
  for (const response of responseRows) {
    const submission = submissionById.get(response.submission_id);
    if (!submission) continue;
    const latest = latestSubmissionByPerson.get(submission.person_id);
    if (!latest || latest.id !== submission.id) continue;
    if (!latestBaselineResponsesByPerson.has(submission.person_id)) latestBaselineResponsesByPerson.set(submission.person_id, []);
    latestBaselineResponsesByPerson.get(submission.person_id).push(response);
  }

  const postConfirmationChanges = [];
  for (const [personId, latestSubmission] of latestSubmissionByPerson.entries()) {
    const person = personById.get(personId);
    if (!person) continue;
    const baselineResponses = latestBaselineResponsesByPerson.get(personId) || [];
    const baselineIds = new Set(baselineResponses.map((row) => row.assignment_id));
    const changes = [];

    for (const response of baselineResponses) {
      const baselineAssignment = assignmentHistoryById.get(response.assignment_id) || null;
      const currentAssignment = activeDescendantByAncestor.get(response.assignment_id) || null;
      const before = {
        assignmentId: response.assignment_id,
        personId,
        personName: person.display_name,
        day: response.day_snapshot || '',
        shift: response.shift_snapshot || '',
        activity: response.activity_snapshot || '',
        role: response.role_snapshot || '',
        response: response.response || null,
        note: response.note || ''
      };

      if (!currentAssignment) {
        changes.push({
          type: 'removed',
          changedAt: baselineAssignment?.updated_at || null,
          before,
          after: null,
          fields: ['assignment']
        });
        continue;
      }

      const after = hydrateComparisonAssignment(currentAssignment);
      const fields = [];
      if (after.personId !== personId) fields.push('person');
      if (String(before.day || '') !== String(after.day || '')) fields.push('day');
      if (String(before.shift || '') !== String(after.shift || '')) fields.push('shift');
      if (String(before.activity || '') !== String(after.activity || '')) fields.push('activity');
      if (String(before.role || '') !== String(after.role || '')) fields.push('role');

      if (fields.length) {
        changes.push({
          type: after.personId !== personId ? 'reassigned' : 'modified',
          changedAt: currentAssignment.created_at || currentAssignment.updated_at || null,
          before,
          after,
          fields
        });
      }
    }

    for (const currentAssignment of assignmentRows.filter((row) => row.person_id === personId)) {
      const ancestry = lineageIds(currentAssignment);
      if (ancestry.some((id) => baselineIds.has(id))) continue;
      if (String(currentAssignment.created_at || '') <= String(latestSubmission.created_at || '')) continue;
      changes.push({
        type: 'added',
        changedAt: currentAssignment.created_at || null,
        before: null,
        after: hydrateComparisonAssignment(currentAssignment),
        fields: ['assignment']
      });
    }

    changes.sort((a, b) => String(a.changedAt || '').localeCompare(String(b.changedAt || '')));
    if (changes.length) {
      postConfirmationChanges.push({
        personId,
        personName: person.display_name,
        personCode: person.person_code || '',
        submissionId: latestSubmission.id,
        submittedAt: latestSubmission.created_at,
        changes
      });
    }
  }

  postConfirmationChanges.sort((a, b) => String(a.personName || '').localeCompare(String(b.personName || ''), 'it'));

  const assignmentsByRequirementKey = new Map();
  for (const assignment of hydratedAssignments) {
    if (!assignment.shiftId || !assignment.activityId) continue;
    const key = `${assignment.shiftId}|${assignment.activityId}`;
    if (!assignmentsByRequirementKey.has(key)) assignmentsByRequirementKey.set(key, []);
    assignmentsByRequirementKey.get(key).push(assignment);
  }

  const hydratedRequirements = requirementRows.map((requirement) => {
    const shift = shiftById.get(requirement.shift_id) || null;
    const activity = activityById.get(requirement.activity_id) || null;
    const assigned = assignmentsByRequirementKey.get(`${requirement.shift_id}|${requirement.activity_id}`) || [];
    const confirmedCount = assigned.filter((row) => row.currentResponse === 'confirmed').length;
    const declinedCount = assigned.filter((row) => row.currentResponse === 'declined').length;
    const pendingCount = assigned.length - confirmedCount - declinedCount;
    return {
      id: requirement.id,
      shiftId: requirement.shift_id,
      day: shift?.day_label || '',
      shift: shift?.shift_label || '',
      shiftSortOrder: shift?.sort_order ?? 9999,
      activityId: requirement.activity_id,
      activity: activity?.name || 'Attività non disponibile',
      requiredCount: Number(requirement.required_count || 0),
      assignedCount: assigned.length,
      confirmedCount,
      declinedCount,
      pendingCount,
      active: requirement.active !== false,
      createdAt: requirement.created_at || null,
      updatedAt: requirement.updated_at || null
    };
  }).sort((a, b) =>
    (a.shiftSortOrder ?? 9999) - (b.shiftSortOrder ?? 9999)
    || String(a.activity || '').localeCompare(String(b.activity || ''), 'it')
  );

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
    requirementsAvailable: requirements !== null,
    requirements: hydratedRequirements,
    postConfirmationChanges,
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

async function requireRequirementsTable() {
  const probe = await adminReadOptional('esigenze attività', 'volunteer_activity_requirements', {
    query: { select: 'id', limit: 1 }
  });
  if (probe === null) {
    throw new ApiError('L’anagrafica delle esigenze non è ancora inizializzata nel database.', 503, 'REQUIREMENTS_NOT_INITIALIZED');
  }
}

async function resolveRequirement(requirementId) {
  if (!isUuid(requirementId)) throw new ApiError('Esigenza non valida.', 400, 'INVALID_REQUIREMENT');
  const requirementRows = await adminRead('esigenza attività', 'volunteer_activity_requirements', {
    query: {
      select: 'id,shift_id,activity_id,required_count,active',
      id: `eq.${requirementId}`,
      active: 'eq.true',
      limit: 1
    }
  });
  const requirement = rows(requirementRows)[0] || null;
  if (!requirement) throw new ApiError('Esigenza non trovata o non attiva.', 404, 'REQUIREMENT_NOT_FOUND');

  const activityRows = await adminRead('attività esigenza', 'volunteer_activities', {
    query: { select: 'id,name,active', id: `eq.${requirement.activity_id}`, limit: 1 }
  });
  const activity = rows(activityRows)[0] || null;
  if (!activity?.active) throw new ApiError('L’attività prevista non è attiva.', 400, 'REQUIREMENT_ACTIVITY_INACTIVE');

  return { requirement, activity };
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

      if (action === 'save-person') {
        const personId = clean(body.personId, 60) || null;
        const personCode = clean(body.personCode, 40) || null;
        const surname = clean(body.surname, 100) || null;
        const givenName = clean(body.givenName, 100) || null;
        const displayName = clean(body.displayName, 160)
          || [surname, givenName].filter(Boolean).join(' ').trim();
        const selectable = body.selectable !== false;

        if (personId && !isUuid(personId)) throw new ApiError('Persona non valida.', 400, 'INVALID_PERSON');
        if (!displayName || displayName.length < 2) throw new ApiError('Indica il nominativo.', 400, 'PERSON_NAME_REQUIRED');

        let current = null;
        let saved = null;
        const now = new Date().toISOString();

        if (personId) {
          const currentRows = await supabaseRequest('volunteer_people', {
            query: {
              select: 'id,person_code,surname,given_name,display_name,source_type,selectable,active',
              id: `eq.${personId}`,
              limit: 1
            }
          });
          current = rows(currentRows)[0] || null;
          if (!current) throw new ApiError('Persona non trovata.', 404, 'PERSON_NOT_FOUND');

          const result = await supabaseRequest('volunteer_people', {
            method: 'PATCH',
            query: { id: `eq.${personId}` },
            body: {
              person_code: personCode,
              surname,
              given_name: givenName,
              display_name: displayName,
              selectable,
              active: true,
              updated_at: now
            },
            prefer: 'return=representation'
          });
          saved = rows(result)[0] || null;
        } else {
          const result = await supabaseRequest('volunteer_people', {
            method: 'POST',
            body: {
              person_code: personCode,
              surname,
              given_name: givenName,
              display_name: displayName,
              source_type: 'manual',
              selectable,
              active: true
            },
            prefer: 'return=representation'
          });
          saved = rows(result)[0] || null;
        }

        if (!saved) throw new ApiError('Persona non salvata.', 500, 'PERSON_SAVE_FAILED');

        if (personId) {
          const raceProgramProbe = await adminReadOptional('programma gare', 'volunteer_race_program', {
            query: { select: 'id', limit: 1 }
          });
          if (raceProgramProbe !== null) {
            const raceRowsForPerson = await supabaseRequest('volunteer_race_program', {
              query: { select: 'id', person_id: `eq.${personId}`, active: 'eq.true', limit: 1 }
            });
            if (rows(raceRowsForPerson).length && !personCode) {
              throw new ApiError('La persona è presente nel programma gare: il codice non può essere vuoto.', 409, 'PERSON_CODE_REQUIRED');
            }
            await supabaseRequest('volunteer_race_program', {
              method: 'PATCH',
              query: { person_id: `eq.${personId}`, active: 'eq.true' },
              body: {
                person_code: personCode,
                person_name: displayName,
                updated_at: now
              },
              prefer: 'return=minimal'
            });
          }
        }

        await auditAdminChange({
          actorName,
          actionType: current ? 'person_updated' : 'person_created',
          entityType: 'person',
          entityId: saved.id,
          person: saved,
          previousValue: current,
          newValue: {
            id: saved.id,
            personCode: saved.person_code,
            surname: saved.surname,
            givenName: saved.given_name,
            displayName: saved.display_name,
            selectable: saved.selectable,
            active: saved.active
          }
        });
        return json({ ok: true, person: saved });
      }

      if (action === 'delete-person') {
        const personId = clean(body.personId, 60);
        if (!isUuid(personId)) throw new ApiError('Persona non valida.', 400, 'INVALID_PERSON');

        const currentRows = await supabaseRequest('volunteer_people', {
          query: {
            select: 'id,person_code,surname,given_name,display_name,source_type,selectable,active',
            id: `eq.${personId}`,
            limit: 1
          }
        });
        const current = rows(currentRows)[0] || null;
        if (!current) throw new ApiError('Persona non trovata.', 404, 'PERSON_NOT_FOUND');

        const assignmentRowsForPerson = await supabaseRequest('volunteer_assignments', {
          query: { select: 'id', person_id: `eq.${personId}`, active: 'eq.true', limit: 1 }
        });
        if (rows(assignmentRowsForPerson).length) {
          throw new ApiError('Non puoi eliminare una persona finché ha assegnazioni attive.', 409, 'PERSON_HAS_ASSIGNMENTS');
        }

        const raceProgramProbe = await adminReadOptional('programma gare', 'volunteer_race_program', {
          query: { select: 'id', limit: 1 }
        });
        if (raceProgramProbe !== null) {
          const raceRowsForPerson = await supabaseRequest('volunteer_race_program', {
            query: { select: 'id', person_id: `eq.${personId}`, active: 'eq.true', limit: 1 }
          });
          if (rows(raceRowsForPerson).length) {
            throw new ApiError('Non puoi eliminare una persona finché è presente nel programma gare.', 409, 'PERSON_HAS_RACES');
          }
        }

        await supabaseRequest('volunteer_people', {
          method: 'PATCH',
          query: { id: `eq.${personId}` },
          body: { active: false, selectable: false, updated_at: new Date().toISOString() },
          prefer: 'return=minimal'
        });
        await auditAdminChange({
          actorName,
          actionType: 'person_deactivated',
          entityType: 'person',
          entityId: personId,
          person: current,
          previousValue: current,
          newValue: { ...current, active: false, selectable: false }
        });
        return json({ ok: true });
      }

      if (action === 'reorder-assignments') {
        const shiftId = clean(body.shiftId, 60);
        const activityId = clean(body.activityId, 60);
        const assignmentIds = Array.isArray(body.assignmentIds)
          ? body.assignmentIds.map((value) => clean(value, 60))
          : [];

        if (!isUuid(shiftId) || !isUuid(activityId) || assignmentIds.some((id) => !isUuid(id))) {
          throw new ApiError('Ordine assegnazioni non valido.', 400, 'INVALID_ASSIGNMENT_ORDER');
        }

        const result = await rpc('admin_reorder_volunteer_assignments', {
          p_actor_name: actorName,
          p_shift_id: shiftId,
          p_activity_id: activityId,
          p_assignment_ids: assignmentIds
        });
        return json({ ok: true, order: result });
      }

      if (action === 'save-assignment') {
        const personId = clean(body.personId, 60);
        const assignmentId = clean(body.assignmentId, 60) || null;
        const requirementId = clean(body.requirementId, 60) || null;
        let shiftId = clean(body.shiftId, 60) || null;
        let activity = clean(body.activity, 200);
        let role = clean(body.role, 200) || null;

        if (!isUuid(personId)) throw new ApiError('Persona non valida.', 400, 'INVALID_PERSON');
        if (assignmentId && !isUuid(assignmentId)) throw new ApiError('Assegnazione non valida.', 400, 'INVALID_ASSIGNMENT');

        const requirementsProbe = await adminReadOptional('esigenze attività', 'volunteer_activity_requirements', {
          query: { select: 'id', limit: 1 }
        });

        if (requirementsProbe !== null) {
          if (!requirementId) throw new ApiError('Seleziona una coppia turno-attività prevista.', 400, 'REQUIREMENT_REQUIRED');
          const resolved = await resolveRequirement(requirementId);
          shiftId = resolved.requirement.shift_id;
          activity = resolved.activity.name;

          if (assignmentId) {
            const currentRows = await adminRead('assegnazione corrente', 'volunteer_assignments', {
              query: { select: 'id,shift_id,activity_id,role', id: `eq.${assignmentId}`, active: 'eq.true', limit: 1 }
            });
            const current = rows(currentRows)[0] || null;
            role = current
              && current.activity_id === resolved.requirement.activity_id
              ? (current.role || null)
              : null;
          } else {
            role = null;
          }
        } else {
          if (shiftId && !isUuid(shiftId)) throw new ApiError('Turno non valido.', 400, 'INVALID_SHIFT');
          if (!activity) throw new ApiError('Indica l’attività.', 400, 'ACTIVITY_REQUIRED');
        }

        const result = await rpc('admin_save_volunteer_assignment', {
          p_actor_name: actorName,
          p_assignment_id: assignmentId,
          p_person_id: personId,
          p_shift_id: shiftId,
          p_raw_day: requirementsProbe !== null ? null : (clean(body.rawDay, 80) || null),
          p_raw_shift: requirementsProbe !== null ? null : (clean(body.rawShift, 80) || null),
          p_activity: activity,
          p_role: role,
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

        const requirementRows = await adminReadOptional('esigenze attività', 'volunteer_activity_requirements', {
          query: { select: 'id', activity_id: `eq.${activityId}`, active: 'eq.true', limit: 1 }
        });
        if (requirementRows !== null && rows(requirementRows).length) {
          throw new ApiError('Non puoi eliminare un’attività finché è usata nelle esigenze per turno.', 409, 'ACTIVITY_HAS_REQUIREMENTS');
        }

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

      if (action === 'save-requirement') {
        await requireRequirementsTable();
        const requirementId = clean(body.requirementId, 60) || null;
        const shiftId = clean(body.shiftId, 60);
        const activityId = clean(body.activityId, 60);
        const requiredCount = Number(body.requiredCount);

        if (requirementId && !isUuid(requirementId)) throw new ApiError('Esigenza non valida.', 400, 'INVALID_REQUIREMENT');
        if (!isUuid(shiftId)) throw new ApiError('Turno non valido.', 400, 'INVALID_SHIFT');
        if (!isUuid(activityId)) throw new ApiError('Attività non valida.', 400, 'INVALID_ACTIVITY');
        if (!Number.isInteger(requiredCount) || requiredCount < 1 || requiredCount > 999) {
          throw new ApiError('Il numero di persone necessarie deve essere compreso tra 1 e 999.', 400, 'INVALID_REQUIRED_COUNT');
        }

        try {
          const result = await rpc('admin_save_volunteer_activity_requirement', {
            p_actor_name: actorName,
            p_requirement_id: requirementId,
            p_shift_id: shiftId,
            p_activity_id: activityId,
            p_required_count: requiredCount
          });
          return json({ ok: true, requirement: result });
        } catch (error) {
          const message = clean(error?.payload?.message || error?.message || '', 200);
          if (message.includes('VOLUNTEER_REQUIREMENT_DUPLICATE')) {
            throw new ApiError('Esiste già un’esigenza per questa attività e questo turno.', 409, 'REQUIREMENT_DUPLICATE');
          }
          throw error;
        }
      }

      if (action === 'delete-requirement') {
        await requireRequirementsTable();
        const requirementId = clean(body.requirementId, 60);
        if (!isUuid(requirementId)) throw new ApiError('Esigenza non valida.', 400, 'INVALID_REQUIREMENT');

        try {
          const result = await rpc('admin_deactivate_volunteer_activity_requirement', {
            p_actor_name: actorName,
            p_requirement_id: requirementId
          });
          return json({ ok: true, requirement: result });
        } catch (error) {
          const message = clean(error?.payload?.message || error?.message || '', 200);
          if (message.includes('VOLUNTEER_REQUIREMENT_HAS_ASSIGNMENTS')) {
            throw new ApiError('Non puoi eliminare questa esigenza finché contiene persone assegnate.', 409, 'REQUIREMENT_HAS_ASSIGNMENTS');
          }
          throw error;
        }
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
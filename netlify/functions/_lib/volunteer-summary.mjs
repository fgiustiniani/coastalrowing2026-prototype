import { ApiError, clean, isUuid, supabaseRequest } from './volunteers-common.mjs';

const rows = (value) => Array.isArray(value) ? value : [];

function sortKey(value) {
  const parsed = Date.parse(value || '');
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

function sortItems(items = []) {
  return [...items].sort((a, b) => {
    const startA = sortKey(a.startsAt);
    const startB = sortKey(b.startsAt);
    if (startA !== startB) {
      if (!Number.isFinite(startA)) return 1;
      if (!Number.isFinite(startB)) return -1;
      return startA - startB;
    }
    return `${a.day || ''} ${a.shift || ''} ${a.activity || ''}`.localeCompare(
      `${b.day || ''} ${b.shift || ''} ${b.activity || ''}`,
      'it'
    );
  });
}

export function activityLabel(row) {
  const activity = clean(row?.activity, 240);
  const role = clean(row?.role, 160);
  if (activity.toLocaleLowerCase('it-IT') === 'gestione barche in spiaggia' && role) return `${activity} - ${role}`;
  if (activity.toLocaleLowerCase('it-IT') === 'piloti gommoni' && /^Pilota gommone /i.test(role)) return role;
  return activity.replace(/^(Gestione barche in spiaggia|Barche noleggiate)-\s*/i, '$1 - ');
}

export async function loadVolunteerSubmissionSummary(submissionIdValue) {
  const submissionId = clean(submissionIdValue, 60);
  if (!isUuid(submissionId)) throw new ApiError('Riepilogo non valido.', 400, 'INVALID_SUBMISSION_ID');

  const submissions = rows(await supabaseRequest('volunteer_submissions', {
    query: {
      select: 'id,actor_name,person_id,person_code,selected_person_name,created_at',
      id: `eq.${submissionId}`,
      limit: 1
    }
  }));
  const submission = submissions[0];
  if (!submission) throw new ApiError('Riepilogo non trovato.', 404, 'SUBMISSION_NOT_FOUND');

  const [responses, availability] = await Promise.all([
    supabaseRequest('volunteer_assignment_responses', {
      query: {
        select: 'assignment_id,response,note,day_snapshot,shift_snapshot,activity_snapshot,role_snapshot,created_at',
        submission_id: `eq.${submissionId}`,
        order: 'created_at.asc'
      }
    }),
    supabaseRequest('volunteer_availability', {
      query: {
        select: 'shift_id,note,created_at',
        submission_id: `eq.${submissionId}`,
        order: 'created_at.asc'
      }
    })
  ]);

  const responseRows = rows(responses);
  const availabilityRows = rows(availability);
  const assignmentIds = [...new Set(responseRows.map((row) => clean(row.assignment_id, 60)).filter(isUuid))];
  const availabilityShiftIds = [...new Set(availabilityRows.map((row) => clean(row.shift_id, 60)).filter(isUuid))];

  let assignments = [];
  if (assignmentIds.length) {
    assignments = rows(await supabaseRequest('volunteer_assignments', {
      query: {
        select: 'id,shift_id',
        id: `in.(${assignmentIds.join(',')})`
      }
    }));
  }

  const assignmentShiftById = new Map(assignments.map((row) => [row.id, row.shift_id]));
  const responseShiftIds = responseRows
    .map((row) => assignmentShiftById.get(row.assignment_id))
    .filter(isUuid);
  const shiftIds = [...new Set([...availabilityShiftIds, ...responseShiftIds])];

  let shifts = [];
  if (shiftIds.length) {
    shifts = rows(await supabaseRequest('volunteer_shifts', {
      query: {
        select: 'id,day_label,shift_label,starts_at,ends_at,sort_order',
        id: `in.(${shiftIds.join(',')})`
      }
    }));
  }
  const shiftById = new Map(shifts.map((row) => [row.id, row]));

  const assignmentItems = responseRows.map((row) => {
    const shift = shiftById.get(assignmentShiftById.get(row.assignment_id)) || null;
    return {
      assignmentId: row.assignment_id,
      response: row.response,
      day: clean(row.day_snapshot, 120),
      shift: clean(row.shift_snapshot, 120),
      startsAt: shift?.starts_at || null,
      activity: clean(row.activity_snapshot, 240),
      role: clean(row.role_snapshot, 160),
      note: clean(row.note, 1000)
    };
  });

  const availabilityItems = availabilityRows.map((row) => {
    const shift = shiftById.get(row.shift_id) || null;
    return {
      shiftId: row.shift_id,
      day: clean(shift?.day_label, 120),
      shift: clean(shift?.shift_label, 120),
      startsAt: shift?.starts_at || null,
      note: clean(row.note, 1000)
    };
  });

  return {
    submission: {
      id: submission.id,
      actorName: clean(submission.actor_name, 120),
      personId: submission.person_id,
      personCode: clean(submission.person_code, 80),
      personName: clean(submission.selected_person_name, 160),
      createdAt: submission.created_at
    },
    confirmed: sortItems(assignmentItems.filter((row) => row.response === 'confirmed')),
    declined: sortItems(assignmentItems.filter((row) => row.response === 'declined')),
    availability: sortItems(availabilityItems)
  };
}

export function sampleVolunteerSubmissionSummary() {
  return {
    submission: {
      id: '00000000-0000-4000-8000-000000000000',
      actorName: 'Mario Rossi',
      personId: '00000000-0000-4000-8000-000000000000',
      personCode: '280',
      personName: 'Mario Rossi',
      createdAt: '2026-09-21T10:00:00+02:00'
    },
    confirmed: [
      {
        response: 'confirmed',
        day: 'Sabato 3 ottobre',
        shift: '07:00–10:00',
        startsAt: '2026-10-03T07:00:00+02:00',
        activity: 'Info point',
        role: '',
        note: ''
      },
      {
        response: 'confirmed',
        day: 'Sabato 3 ottobre',
        shift: '10:00–13:00',
        startsAt: '2026-10-03T10:00:00+02:00',
        activity: 'Gestione barche in spiaggia',
        role: 'C2x',
        note: 'Disponibile per tutto il turno.'
      }
    ],
    declined: [
      {
        response: 'declined',
        day: 'Sabato 3 ottobre',
        shift: '14:00–17:00',
        startsAt: '2026-10-03T14:00:00+02:00',
        activity: 'Accoglienza',
        role: '',
        note: 'Impegno già programmato.'
      }
    ],
    availability: [
      {
        day: 'Domenica 4 ottobre',
        shift: '07:00–10:00',
        startsAt: '2026-10-04T07:00:00+02:00',
        note: ''
      }
    ]
  };
}

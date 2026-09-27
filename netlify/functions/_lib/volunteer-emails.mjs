import nodemailer from 'nodemailer';
import { ApiError, clean } from './volunteers-common.mjs';

function env(name) {
  return clean(process.env[name] || '', 4000);
}

function cleanHeader(value, maxLength = 254) {
  return clean(value, maxLength).replace(/[\r\n]+/g, ' ').trim();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function isDeployPreview(requestUrl) {
  try {
    const hostname = new URL(requestUrl).hostname.toLowerCase();
    return env('CONTEXT') === 'deploy-preview' || hostname.startsWith('deploy-preview-');
  } catch {
    return env('CONTEXT') === 'deploy-preview';
  }
}

function activityLabel(row) {
  const activity = clean(row?.activity, 240);
  const role = clean(row?.role, 160);
  if (activity.toLocaleLowerCase('it-IT') === 'gestione barche in spiaggia' && role) return `${activity} - ${role}`;
  if (activity.toLocaleLowerCase('it-IT') === 'piloti gommoni' && /^Pilota gommone /i.test(role)) return role;
  return activity.replace(/^(Gestione barche in spiaggia|Barche noleggiate)-\s*/i, '$1 - ');
}

function responseLabel(value) {
  if (value === 'confirmed') return 'Confermata';
  if (value === 'declined') return 'Non disponibile';
  return 'Da rispondere';
}

function sortChronologically(items = []) {
  return [...items].sort((a, b) => {
    const startA = Date.parse(a?.startsAt || '');
    const startB = Date.parse(b?.startsAt || '');
    if (Number.isFinite(startA) && Number.isFinite(startB) && startA !== startB) return startA - startB;

    const orderA = Number(a?.sortOrder);
    const orderB = Number(b?.sortOrder);
    if (Number.isFinite(orderA) && Number.isFinite(orderB) && orderA !== orderB) return orderA - orderB;

    const whenA = `${a?.day || ''} ${a?.shift || ''}`;
    const whenB = `${b?.day || ''} ${b?.shift || ''}`;
    const whenCompare = whenA.localeCompare(whenB, 'it');
    if (whenCompare !== 0) return whenCompare;

    return activityLabel(a).localeCompare(activityLabel(b), 'it');
  });
}

function availabilityActivityLabel(row) {
  const activities = Array.isArray(row?.requestActivities)
    ? row.requestActivities.map((item) => clean(item, 240)).filter(Boolean)
    : [];
  return activities.length ? activities.join(' · ') : '';
}

export async function sendVolunteerSummaryEmail({
  email,
  personState,
  requestUrl,
  accompanyingMessage = '',
  currentSubmissionId = null
}) {
  const recipient = cleanHeader(email, 254);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    throw new ApiError('Inserisci un indirizzo email valido.', 400, 'INVALID_EMAIL');
  }

  const smtpHost = env('SMTP_HOST');
  const smtpUser = env('SMTP_USER');
  const smtpPass = env('SMTP_PASS');
  const smtpPort = Number(env('SMTP_PORT') || 465);
  const smtpSecure = String(env('SMTP_SECURE') || (smtpPort === 465)) === 'true';
  const fromEmail = cleanHeader(
    env('BOOKING_FROM_EMAIL') || env('CONTACT_FROM_EMAIL') || env('PARTNERSHIP_FROM_EMAIL') || smtpUser,
    254
  );
  const fromName = cleanHeader(
    env('BOOKING_FROM_NAME') || env('CONTACT_FROM_NAME') || env('PARTNERSHIP_FROM_NAME') || 'Campionati Italiani Coastal Rowing 2026',
    160
  );
  const replyTo = cleanHeader(env('BOOKING_NOTIFICATION_RECIPIENT') || fromEmail, 254);

  if (!smtpHost || !smtpUser || !smtpPass || !fromEmail) {
    throw new ApiError('Il servizio email non è configurato.', 503, 'EMAIL_NOT_CONFIGURED');
  }

  const personName = clean(personState?.person?.display_name || 'Volontario', 160);
  const message = clean(accompanyingMessage, 4000);
  const submissionId = clean(currentSubmissionId, 60);

  const currentAssignments = (Array.isArray(personState?.assignments) ? personState.assignments : [])
    .filter((row) =>
      row.currentResponse === 'confirmed'
      || row.currentResponse === 'declined'
      || (row.assignedFromAvailability && row.currentResponse !== 'declined')
    )
    .map((row) => ({
      ...row,
      summaryActivity: activityLabel(row),
      summaryStatus: row.currentResponse === 'declined' ? 'Non disponibile' : 'Confermata',
      summaryKind: row.currentResponse === 'declined' ? 'declined' : 'confirmed',
      summaryNew: false
    }));

  const historicalResponses = [
    ...(Array.isArray(personState?.historicalResponses) ? personState.historicalResponses : []),
    ...(Array.isArray(personState?.historicalOpenRequestResponses)
      ? personState.historicalOpenRequestResponses.filter((row) => !submissionId || row.submissionId !== submissionId)
      : [])
  ].map((row) => ({
    ...row,
    summaryActivity: clean(row.activity, 500) || 'Attività',
    summaryStatus: row.response === 'declined' ? 'Non disponibile' : 'Confermata',
    summaryKind: row.response === 'declined' ? 'declined' : 'confirmed',
    summaryNew: false
  }));

  const currentOpenResponses = (Array.isArray(personState?.openRequestResponses) ? personState.openRequestResponses : [])
    .filter((row) =>
      submissionId
      && row.submissionId === submissionId
      && ['confirmed', 'declined'].includes(row.response)
    )
    .map((row) => ({
      ...row,
      summaryActivity: '',
      summaryStatus: row.response === 'declined' ? 'Non disponibile' : 'Confermata',
      summaryKind: row.response === 'declined' ? 'declined' : 'confirmed',
      summaryNew: true
    }));

  const newConfirmedShiftIds = new Set(
    currentOpenResponses
      .filter((row) => row.summaryKind === 'confirmed')
      .map((row) => row.shiftId)
      .filter(Boolean)
  );

  const additionalAvailability = (Array.isArray(personState?.availabilityShifts) ? personState.availabilityShifts : [])
    .filter((shift) => shift.selected && !shift.assigned && !newConfirmedShiftIds.has(shift.id))
    .map((shift) => ({
      ...shift,
      summaryActivity: 'Nessuna attività assegnata: sei libero',
      summaryStatus: shift.isReleasedConfirmed
        ? 'Disponibilità già confermata in precedenza'
        : 'Disponibilità aggiuntiva dichiarata in precedenza',
      summaryKind: 'availability',
      summaryNew: false,
      raceConflict: shift.raceConflict === true
    }));

  const currentAssignmentShiftKeys = new Set(
    currentAssignments.map((row) => row.shiftId || ((row.day || '') + '|' + (row.shift || '')))
  );

  const stateTimestamp = (row) => {
    const value = row?.summaryStateAt
      || row?.stateAt
      || row?.responseAt
      || row?.currentResponseAt
      || row?.createdAt
      || row?.releasedAt
      || '';
    const stamp = Date.parse(value);
    return Number.isFinite(stamp) ? stamp : 0;
  };

  const statePriority = (row) => {
    if (row?.summaryKind === 'availability') return 4;
    if (row?.summaryKind === 'declined') return 3;
    if (row?.summaryKind === 'confirmed') return 2;
    return 1;
  };

  const latestStateByShift = new Map();
  for (const row of [...historicalResponses, ...currentOpenResponses, ...additionalAvailability]) {
    const shiftKey = row.shiftId || ((row.day || '') + '|' + (row.shift || ''));
    if (!shiftKey || currentAssignmentShiftKeys.has(shiftKey)) continue;

    const current = latestStateByShift.get(shiftKey);
    const rowTime = stateTimestamp(row);
    const currentTime = current ? stateTimestamp(current) : -1;
    if (!current || rowTime > currentTime || (rowTime === currentTime && statePriority(row) > statePriority(current))) {
      latestStateByShift.set(shiftKey, row);
    }
  }

  const summaryRows = sortChronologically([
    ...currentAssignments,
    ...latestStateByShift.values()
  ]);
  const hasConfirmedActivity = summaryRows.some((row) => row.summaryKind === 'confirmed');
  const hasAdditionalAvailability = summaryRows.some((row) => row.summaryKind === 'availability' && row.raceConflict !== true);
  const showThanks = hasConfirmedActivity || hasAdditionalAvailability;
  const availabilityFollowUp = 'Al più presto sarai contattato per condividere le attività da fare nei turni per i quali hai dato disponibilità';
  const thanksMessage = 'Grazie per la disponibilità mostrata!!';

  const rowText = summaryRows.length
    ? summaryRows.map((row) => {
        const availabilityRaceConflict = row.summaryKind === 'availability' && row.raceConflict === true;
        if (availabilityRaceConflict) {
          return `- ${row.day} · ${row.shift} — [Non assegnato per coincidenza gara]`;
        }
        const badges = row.summaryNew ? '[NUOVA]' : '';
        const activity = clean(row.summaryActivity, 500);
        return `- ${row.day} · ${row.shift} — ${row.summaryStatus}${badges ? ` ${badges}` : ''}${activity ? ` — ${activity}` : ''}`;
      }).join('\n')
    : '- Nessuna disponibilità da riepilogare';

  const cardStyle = {
    confirmed: {
      background: '#edf8f0',
      border: '#a9d3b5',
      status: '#2d6a3d'
    },
    declined: {
      background: '#fff1ee',
      border: '#e3b3aa',
      status: '#a43f2c'
    },
    availability: {
      background: '#fff7e7',
      border: '#e5c58a',
      status: '#9a6500'
    },
    'race-conflict': {
      background: '#ffffff',
      border: '#e3b3aa',
      status: '#a43f2c'
    }
  };

  const summaryHtml = summaryRows.length
    ? summaryRows.map((row) => {
        const style = cardStyle[row.summaryKind] || cardStyle.availability;
        const activity = clean(row.summaryActivity, 500);
        const availabilityRaceConflict = row.summaryKind === 'availability' && row.raceConflict === true;
        const badges = availabilityRaceConflict
          ? '<span style="display:inline-block;margin-left:4px;padding:3px 7px;border-radius:999px;background:#a43f2c;color:#ffffff;font-size:10px;line-height:1.15;font-weight:800;">Non assegnato per coincidenza gara</span>'
          : (row.summaryNew
            ? '<span style="display:inline-block;margin-left:4px;padding:3px 7px;border-radius:999px;background:#0a6b7d;color:#ffffff;font-size:10px;line-height:1;font-weight:800;letter-spacing:.04em;">NUOVA</span>'
            : '');
        return `
          <div style="margin:0 0 10px 0;padding:12px 14px;border:1px solid ${style.border};border-radius:12px;background:${style.background};">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td style="font-size:15px;line-height:1.3;font-weight:700;color:#263f48;">
                  ${escapeHtml(row.day)} · ${escapeHtml(row.shift)}
                </td>
                <td align="right" style="padding-left:10px;">${badges}</td>
              </tr>
            </table>
            ${!availabilityRaceConflict && activity ? `<div style="margin-top:5px;font-size:13px;line-height:1.35;color:#60757d;">${escapeHtml(activity)}</div>` : ''}
            ${!availabilityRaceConflict && row.summaryStatus ? `
              <div style="margin-top:5px;font-size:12px;line-height:1.3;font-weight:700;color:${style.status};">
                ${escapeHtml(row.summaryStatus)}
              </div>` : ''}
          </div>
        `;
      }).join('')
    : '<p style="color:#60757d;font-style:italic;">Nessuna disponibilità da riepilogare.</p>';

  const prefix = isDeployPreview(requestUrl) ? 'TEST - ' : '';
  const subject = `${prefix}Riepilogo disponibilità volontario - Campionati Italiani Coastal Rowing 2026`;

  const text = [
    `Riepilogo disponibilità di ${personName}`,
    '',
    ...(message ? [message, ''] : []),
    rowText,
    '',
    'Questo messaggio riepiloga l’ultima compilazione registrata.',
    ...(hasAdditionalAvailability ? ['', availabilityFollowUp] : []),
    ...(showThanks ? ['', thanksMessage] : [])
  ].join('\n');

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#263f48;line-height:1.45;max-width:680px;margin:0 auto;">
      <h2 style="margin:0 0 6px 0;font-size:22px;line-height:1.25;">Riepilogo disponibilità</h2>
      <p style="margin:0 0 18px 0;"><strong>${escapeHtml(personName)}</strong></p>
      ${message ? `<p style="margin:0 0 18px 0;">${escapeHtml(message).replace(/\n/g, '<br>')}</p>` : ''}
      <div style="margin:0 0 18px 0;">${summaryHtml}</div>
      <p style="margin:16px 0 0 0;color:#60757d;font-size:12px;">Questo messaggio riepiloga l’ultima compilazione registrata.</p>
      ${hasAdditionalAvailability ? `<p style="margin:14px 0 0 0;">${escapeHtml(availabilityFollowUp)}</p>` : ''}
      ${showThanks ? `<p style="margin:14px 0 0 0;"><strong>${escapeHtml(thanksMessage)}</strong></p>` : ''}
    </div>
  `;

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: { user: smtpUser, pass: smtpPass }
  });

  try {
    await transporter.sendMail({
      from: { name: fromName, address: fromEmail },
      envelope: { from: smtpUser, to: recipient },
      to: recipient,
      replyTo: replyTo || fromEmail,
      subject,
      text,
      html
    });
  } catch (error) {
    console.error('Invio riepilogo volontario fallito:', error);
    throw new ApiError('Non è stato possibile inviare il riepilogo. Riprova tra poco.', 502, 'EMAIL_DELIVERY_FAILED');
  }

  return { sent: true };
}
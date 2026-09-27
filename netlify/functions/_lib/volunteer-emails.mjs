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

export async function sendVolunteerSummaryEmail({ email, personState, requestUrl, accompanyingMessage = '' }) {
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
  const assignments = sortChronologically(
    Array.isArray(personState?.assignments) ? personState.assignments : []
  );
  const availability = sortChronologically(
    (Array.isArray(personState?.availabilityShifts) ? personState.availabilityShifts : [])
      .filter((shift) => shift.selected && !shift.assigned)
  );

  const hasConfirmedActivity = assignments.some((row) => row.currentResponse === 'confirmed');
  const hasAdditionalAvailability = availability.length > 0;
  const showThanks = hasConfirmedActivity || hasAdditionalAvailability;
  const availabilityFollowUp = 'Al più presto sarai contattato per condividere le attività da fare nei turni per i quali hai dato disponibilità';
  const thanksMessage = 'Grazie per la disponibilità mostrata!!';

  const assignmentText = assignments.length
    ? assignments.map((row) => {
        const note = clean(row.currentNote, 1000);
        return `- ${row.day} · ${row.shift} — ${activityLabel(row)}: ${responseLabel(row.currentResponse)}${note ? ` — Nota: ${note}` : ''}`;
      }).join('\n')
    : '- Nessuna attività assegnata';

  const availabilityText = availability.length
    ? availability.map((row) => {
        const activity = availabilityActivityLabel(row);
        return `- ${row.day} · ${row.shift}${activity ? ` — ${activity}` : ''}${row.note ? ` — Nota: ${clean(row.note, 1000)}` : ''}`;
      }).join('\n')
    : '- Nessuna disponibilità aggiuntiva indicata';

  const assignmentHtml = assignments.length
    ? `<ul>${assignments.map((row) => {
        const note = clean(row.currentNote, 1000);
        return `<li><strong>${escapeHtml(row.day)} · ${escapeHtml(row.shift)}</strong> — ${escapeHtml(activityLabel(row))}: ${escapeHtml(responseLabel(row.currentResponse))}${note ? `<br><small>Nota: ${escapeHtml(note)}</small>` : ''}</li>`;
      }).join('')}</ul>`
    : '<p>Nessuna attività assegnata.</p>';

  const availabilityHtml = availability.length
    ? `<ul>${availability.map((row) => {
        const activity = availabilityActivityLabel(row);
        return `<li><strong>${escapeHtml(row.day)} · ${escapeHtml(row.shift)}</strong>${activity ? `<br><span>${escapeHtml(activity)}</span>` : ''}${row.note ? `<br><small>Nota: ${escapeHtml(clean(row.note, 1000))}</small>` : ''}</li>`;
      }).join('')}</ul>`
    : '<p>Nessuna disponibilità aggiuntiva indicata.</p>';

  const prefix = isDeployPreview(requestUrl) ? 'TEST - ' : '';
  const subject = `${prefix}Riepilogo disponibilità volontario - Campionati Italiani Coastal Rowing 2026`;

  const text = [
    `Riepilogo disponibilità di ${personName}`,
    '',
    ...(message ? [message, ''] : []),
    'Attività assegnate:',
    assignmentText,
    '',
    'Disponibilità aggiuntive:',
    availabilityText,
    '',
    'Questo messaggio riepiloga l’ultima compilazione registrata.',
    ...(hasAdditionalAvailability ? ['', availabilityFollowUp] : []),
    ...(showThanks ? ['', thanksMessage] : [])
  ].join('\n');

  const html = `
    <h2>Riepilogo disponibilità</h2>
    <p><strong>${escapeHtml(personName)}</strong></p>
    ${message ? `<p class="accompanying-message">${escapeHtml(message).replace(/\n/g, '<br>')}</p>` : ''}
    <h3>Attività assegnate</h3>
    ${assignmentHtml}
    <h3>Disponibilità aggiuntive</h3>
    ${availabilityHtml}
    <p><small>Questo messaggio riepiloga l’ultima compilazione registrata.</small></p>
    ${hasAdditionalAvailability ? `<p>${escapeHtml(availabilityFollowUp)}</p>` : ''}
    ${showThanks ? `<p><strong>${escapeHtml(thanksMessage)}</strong></p>` : ''}
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
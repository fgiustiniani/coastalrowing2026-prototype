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

export async function sendVolunteerSummaryEmail({ email, personState, requestUrl }) {
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
  const assignments = Array.isArray(personState?.assignments) ? personState.assignments : [];
  const availability = (Array.isArray(personState?.availabilityShifts) ? personState.availabilityShifts : [])
    .filter((shift) => shift.selected && !shift.assigned);

  const assignmentText = assignments.length
    ? assignments.map((row) => {
        const note = clean(row.currentNote, 1000);
        return `- ${row.day} · ${row.shift} — ${activityLabel(row)}: ${responseLabel(row.currentResponse)}${note ? ` — Nota: ${note}` : ''}`;
      }).join('\n')
    : '- Nessuna attività assegnata';

  const availabilityText = availability.length
    ? availability.map((row) => `- ${row.day} · ${row.shift}${row.note ? ` — Nota: ${clean(row.note, 1000)}` : ''}`).join('\n')
    : '- Nessuna disponibilità aggiuntiva indicata';

  const assignmentHtml = assignments.length
    ? `<ul>${assignments.map((row) => {
        const note = clean(row.currentNote, 1000);
        return `<li><strong>${escapeHtml(row.day)} · ${escapeHtml(row.shift)}</strong> — ${escapeHtml(activityLabel(row))}: ${escapeHtml(responseLabel(row.currentResponse))}${note ? `<br><small>Nota: ${escapeHtml(note)}</small>` : ''}</li>`;
      }).join('')}</ul>`
    : '<p>Nessuna attività assegnata.</p>';

  const availabilityHtml = availability.length
    ? `<ul>${availability.map((row) => `<li><strong>${escapeHtml(row.day)} · ${escapeHtml(row.shift)}</strong>${row.note ? `<br><small>Nota: ${escapeHtml(clean(row.note, 1000))}</small>` : ''}</li>`).join('')}</ul>`
    : '<p>Nessuna disponibilità aggiuntiva indicata.</p>';

  const prefix = isDeployPreview(requestUrl) ? 'TEST - ' : '';
  const subject = `${prefix}Riepilogo disponibilità volontario - Campionati Italiani Coastal Rowing 2026`;

  const text = [
    `Riepilogo disponibilità di ${personName}`,
    '',
    'Attività assegnate:',
    assignmentText,
    '',
    'Disponibilità aggiuntive:',
    availabilityText,
    '',
    'Questo messaggio riepiloga l’ultima compilazione registrata.'
  ].join('\n');

  const html = `
    <h2>Riepilogo disponibilità</h2>
    <p><strong>${escapeHtml(personName)}</strong></p>
    <h3>Attività assegnate</h3>
    ${assignmentHtml}
    <h3>Disponibilità aggiuntive</h3>
    ${availabilityHtml}
    <p><small>Questo messaggio riepiloga l’ultima compilazione registrata.</small></p>
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

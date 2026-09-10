import nodemailer from 'nodemailer';
import {
  ApiError,
  SECRETARIAT_EMAIL,
  clean,
  cleanHeader,
  escapeHtml
} from './boat-bookings-common.mjs';
import { publicBookingV2 } from './boat-bookings-v2.mjs';

function env(name) {
  return globalThis.Netlify?.env?.get?.(name) || '';
}

function siteBase(requestUrl) {
  const configured = clean(env('BOOKING_SITE_URL'), 500).replace(/\/$/, '');
  return configured || new URL(requestUrl).origin;
}

function editLinkFor(rawToken, requestUrl) {
  if (!rawToken) return '';
  return `${siteBase(requestUrl)}/modifica-prenotazione-barche.html#token=${encodeURIComponent(rawToken)}`;
}

export function getBookingViewLink(bookingCode, requestUrl) {
  if (!bookingCode) return '';
  return `${siteBase(requestUrl)}/prenotazione-barche.html#code=${encodeURIComponent(bookingCode)}`;
}

export async function sendBookingEmails({
  record,
  rawToken,
  requestUrl,
  kind = 'updated'
}) {
  const booking = publicBookingV2(record);

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
  const notificationRecipient = cleanHeader(
    env('BOOKING_NOTIFICATION_RECIPIENT') || SECRETARIAT_EMAIL,
    254
  );
  const subjectPrefix = cleanHeader(env('BOOKING_SUBJECT_PREFIX'), 40);

  if (!smtpHost || !smtpUser || !smtpPass || !fromEmail) {
    throw new ApiError('Il servizio email non è configurato.', 503, 'EMAIL_NOT_CONFIGURED');
  }

  const subjectByKind = {
    created: 'Conferma prenotazione prove barche – Coastal Rowing Pesaro 2026',
    updated: 'Prenotazione prove barche aggiornata – Coastal Rowing Pesaro 2026',
    resent: 'Riepilogo prenotazione prove barche – Coastal Rowing Pesaro 2026',
    deleted: 'Prenotazione prove barche annullata – Coastal Rowing Pesaro 2026'
  };
  const headingByKind = {
    created: 'Prenotazione confermata',
    updated: 'Prenotazione aggiornata',
    resent: 'Riepilogo della prenotazione',
    deleted: 'Prenotazione annullata'
  };

  const subject = `${subjectPrefix}${subjectByKind[kind] || subjectByKind.updated}`;
  const heading = headingByKind[kind] || headingByKind.updated;
  const editLink = kind === 'deleted' ? '' : editLinkFor(rawToken, requestUrl);
  const viewLink = kind === 'deleted' ? '' : getBookingViewLink(booking.bookingCode, requestUrl);

  const textBoats = (booking.items || []).map((item) =>
    `${item.builder} – ${item.boatType}: ${item.quantity} — barche ${item.boatNumbers.join(', ')}`
  ).join('\n');

  const htmlBoats = (booking.items || []).map((item) =>
    `<li><strong>${escapeHtml(item.builder)} – ${escapeHtml(item.boatType)}</strong>: ${item.quantity}<br>Barche assegnate: <strong>${item.boatNumbers.map(escapeHtml).join(', ')}</strong></li>`
  ).join('');

  const baseText = [
    heading,
    '',
    `Codice prenotazione: ${booking.bookingCode}`,
    `Società: ${booking.society}`,
    `Referente: ${booking.contactSurname} ${booking.contactName}`,
    `Telefono: ${booking.phone}`,
    `Email: ${booking.email}`,
    `Slot: ${booking.slotLabel}`,
    '',
    'Barche assegnate:',
    textBoats
  ];

  const userText = [
    ...baseText,
    ...(editLink ? ['', 'Link personale di modifica:', editLink] : [])
  ].join('\n');

  const organizationText = [
    ...baseText,
    ...(viewLink ? ['', 'Visualizza prenotazione:', viewLink] : [])
  ].join('\n');

  const baseHtml = `
    <h2>${escapeHtml(heading)}</h2>
    <p><strong>Codice prenotazione:</strong> ${escapeHtml(booking.bookingCode)}</p>
    <p><strong>Società:</strong> ${escapeHtml(booking.society)}<br>
    <strong>Referente:</strong> ${escapeHtml(booking.contactSurname)} ${escapeHtml(booking.contactName)}<br>
    <strong>Telefono:</strong> ${escapeHtml(booking.phone)}<br>
    <strong>Email:</strong> ${escapeHtml(booking.email)}<br>
    <strong>Slot:</strong> ${escapeHtml(booking.slotLabel)}</p>
    <p><strong>Barche assegnate:</strong></p>
    <ul>${htmlBoats}</ul>
  `;

  const userHtml = `
    ${baseHtml}
    ${editLink ? `<p><a href="${escapeHtml(editLink)}">Modifica la prenotazione</a></p><p><small>Il link consente modifiche fino al termine stabilito dall’organizzazione.</small></p>` : ''}
  `;

  const organizationHtml = `
    ${baseHtml}
    ${viewLink ? `<p><a href="${escapeHtml(viewLink)}">Visualizza la prenotazione</a></p>` : ''}
  `;

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: { user: smtpUser, pass: smtpPass }
  });

  const deliveries = [
    transporter.sendMail({
      from: { name: fromName, address: fromEmail },
      to: booking.email,
      replyTo: notificationRecipient || fromEmail,
      subject,
      text: userText,
      html: userHtml
    })
  ];

  if (notificationRecipient) {
    deliveries.push(transporter.sendMail({
      from: { name: fromName, address: fromEmail },
      to: notificationRecipient,
      replyTo: booking.email,
      subject,
      text: organizationText,
      html: organizationHtml
    }));
  }

  await Promise.all(deliveries);

  return { editLink, viewLink };
}

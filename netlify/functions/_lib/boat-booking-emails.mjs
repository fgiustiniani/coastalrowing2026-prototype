import nodemailer from 'nodemailer';
import {
  ApiError,
  SECRETARIAT_EMAIL,
  clean,
  cleanHeader,
  escapeHtml
} from './boat-bookings-common.mjs';
import { publicBookingV2 } from './boat-bookings-v2.mjs';

// Le variabili Netlify vengono risolte nel contesto del deploy corrente e rilette a ogni nuovo deploy.
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

function isDeployPreview(requestUrl) {
  try {
    const hostname = new URL(requestUrl).hostname.toLowerCase();
    return env('CONTEXT') === 'deploy-preview' || hostname.startsWith('deploy-preview-');
  } catch {
    return env('CONTEXT') === 'deploy-preview';
  }
}

function deliveryErrorMessage(error) {
  return cleanHeader(error?.message || 'Errore SMTP non specificato.', 300);
}

async function sendWithRetry(transporter, message, label) {
  let lastError = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const info = await transporter.sendMail(message);
      return {
        sent: true,
        attempts: attempt,
        accepted: Array.isArray(info?.accepted) ? info.accepted.map(String) : [],
        rejected: Array.isArray(info?.rejected) ? info.rejected.map(String) : []
      };
    } catch (error) {
      lastError = error;
      console.error(`Invio email ${label} fallito (tentativo ${attempt}/2):`, error);
    }
  }

  return {
    sent: false,
    attempts: 2,
    accepted: [],
    rejected: [],
    error: deliveryErrorMessage(lastError)
  };
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

  if (!smtpHost || !smtpUser || !smtpPass || !fromEmail) {
    throw new ApiError('Il servizio email non è configurato.', 503, 'EMAIL_NOT_CONFIGURED');
  }

  const subjectByKind = {
    created: 'Nuova prenotazione prova barca Campionati Italiani Coastal 26',
    updated: 'Modifica prenotazione prova barca Campionati Italiani Coastal 26',
    // Il reinvio manuale ripropone la conferma della prenotazione esistente.
    resent: 'Nuova prenotazione prova barca Campionati Italiani Coastal 26',
    deleted: 'Eliminazione prenotazione prova barca Campionati Italiani Coastal 26'
  };
  const headingByKind = {
    created: 'Prenotazione confermata',
    updated: 'Prenotazione aggiornata',
    resent: 'Riepilogo della prenotazione',
    deleted: 'Prenotazione annullata'
  };

  const conditionsNotice = 'Le uscite in mare saranno possibili solo se le condizioni meteo-marine saranno ritenute favorevoli dal COL.';
  const subjectPrefix = isDeployPreview(requestUrl) ? 'TEST - ' : '';
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
    textBoats,
    '',
    `Attenzione: ${conditionsNotice}`
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
    <p><strong>Attenzione:</strong> ${escapeHtml(conditionsNotice)}</p>
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

  // I due messaggi restano separati: solo il referente riceve il link personale
  // di modifica. Gli invii sono sequenziali e ciascuno viene ritentato una volta.
  const userDelivery = await sendWithRetry(transporter, {
    from: { name: fromName, address: fromEmail },
    envelope: { from: smtpUser, to: booking.email },
    to: booking.email,
    replyTo: notificationRecipient || fromEmail,
    subject,
    text: userText,
    html: userHtml
  }, 'referente');

  const organizationDelivery = notificationRecipient
    ? await sendWithRetry(transporter, {
        from: { name: fromName, address: fromEmail },
        envelope: { from: smtpUser, to: notificationRecipient },
        to: notificationRecipient,
        replyTo: booking.email,
        subject,
        text: organizationText,
        html: organizationHtml
      }, 'organizzazione')
    : { sent: false, attempts: 0, accepted: [], rejected: [], error: 'Destinatario organizzazione non configurato.' };

  if (!userDelivery.sent || !organizationDelivery.sent) {
    const failed = [];
    if (!userDelivery.sent) failed.push('referente');
    if (!organizationDelivery.sent) failed.push('organizzazione');
    throw new ApiError(
      `Invio email incompleto: non è stato possibile consegnare il messaggio a ${failed.join(' e ')}.`,
      502,
      'EMAIL_DELIVERY_INCOMPLETE',
      { userDelivery, organizationDelivery }
    );
  }

  return {
    editLink,
    viewLink,
    userSent: true,
    organizationSent: true,
    deliveries: {
      user: userDelivery,
      organization: organizationDelivery
    }
  };
}

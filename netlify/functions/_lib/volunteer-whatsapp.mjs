import { Buffer } from 'node:buffer';
import { ApiError, clean, issueVolunteerSummaryPdfToken } from './volunteers-common.mjs';

function env(name) {
  return clean(globalThis.Netlify?.env?.get?.(name) || '', 4000);
}

function normalizeRecipient(value) {
  let phone = clean(value, 40).replace(/[\s().-]+/g, '');
  if (phone.startsWith('00')) phone = `+${phone.slice(2)}`;
  if (!phone.startsWith('+')) {
    if (/^39\d{8,13}$/.test(phone)) phone = `+${phone}`;
    else phone = `+39${phone}`;
  }
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    throw new ApiError('Inserisci un numero di cellulare valido, ad esempio +39 331 123 4567.', 400, 'INVALID_WHATSAPP_PHONE');
  }
  return `whatsapp:${phone}`;
}

function twilioConfig() {
  const accountSid = env('TWILIO_ACCOUNT_SID');
  const apiKeySid = env('TWILIO_API_KEY_SID');
  const apiKeySecret = env('TWILIO_API_KEY_SECRET');
  const from = env('TWILIO_WHATSAPP_FROM');
  const contentSid = env('TWILIO_WHATSAPP_CONTENT_SID');
  const enabled = env('VOLUNTEER_WHATSAPP_ENABLED').toLowerCase() === 'true';

  if (!enabled) throw new ApiError('L’invio WhatsApp non è ancora attivo.', 503, 'WHATSAPP_DISABLED');
  if (!/^AC[a-f0-9]{32}$/i.test(accountSid) || !/^SK[a-f0-9]{32}$/i.test(apiKeySid) || !apiKeySecret) {
    throw new ApiError('Il servizio WhatsApp non è configurato.', 503, 'WHATSAPP_NOT_CONFIGURED');
  }
  if (!/^whatsapp:\+[1-9]\d{7,14}$/i.test(from) || !/^HX[a-f0-9]{32}$/i.test(contentSid)) {
    throw new ApiError('Il servizio WhatsApp non è configurato.', 503, 'WHATSAPP_NOT_CONFIGURED');
  }

  return { accountSid, apiKeySid, apiKeySecret, from, contentSid };
}

export async function sendVolunteerSummaryWhatsApp({ phone, personName, submissionId }) {
  const config = twilioConfig();
  const to = normalizeRecipient(phone);
  const name = clean(personName || 'Volontario', 160);
  const pdfToken = issueVolunteerSummaryPdfToken(submissionId, 3600);

  const form = new URLSearchParams();
  form.set('From', config.from);
  form.set('To', to);
  form.set('ContentSid', config.contentSid);
  form.set('ContentVariables', JSON.stringify({
    1: name,
    2: `${pdfToken}.pdf`
  }));

  const authorization = Buffer.from(`${config.apiKeySid}:${config.apiKeySecret}`, 'utf8').toString('base64');
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(config.accountSid)}/Messages.json`,
    {
      method: 'POST',
      headers: {
        authorization: `Basic ${authorization}`,
        'content-type': 'application/x-www-form-urlencoded'
      },
      body: form.toString()
    }
  );

  if (!response.ok) {
    let code = '';
    try {
      const payload = await response.json();
      code = clean(payload?.code, 40);
    } catch {}
    console.error('Invio WhatsApp riepilogo volontario fallito:', response.status, code || 'TWILIO_ERROR');
    throw new ApiError('Non è stato possibile inviare il riepilogo su WhatsApp. Riprova tra poco.', 502, 'WHATSAPP_DELIVERY_FAILED');
  }

  return { sent: true };
}

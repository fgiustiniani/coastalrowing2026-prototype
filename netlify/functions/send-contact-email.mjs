import nodemailer from 'nodemailer';

const DEFAULT_RECIPIENT = 'f.giustiniani@canottieripesaro.it';
const MAX_LENGTHS = {
  nome: 100,
  cognome: 100,
  email: 254,
  oggetto: 180,
  messaggio: 5000
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

function clean(value, maxLength) {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLength);
}

function cleanHeader(value, maxLength) {
  return clean(value, maxLength).replace(/[\r\n]+/g, ' ');
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getRecipient() {
  return cleanHeader(process.env.CONTACT_RECIPIENT || DEFAULT_RECIPIENT, 254);
}

export default async (request) => {
  const recipient = getRecipient();

  if (request.method === 'GET') {
    return json({ contactEmail: recipient });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Metodo non consentito.' }, 405);
  }

  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get('origin');
  if (origin && origin !== requestOrigin) {
    return json({ error: 'Origine non consentita.' }, 403);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Dati non validi.' }, 400);
  }

  const website = clean(payload.website, 200);
  if (website) {
    return json({ ok: true });
  }

  const nome = cleanHeader(payload.nome, MAX_LENGTHS.nome);
  const cognome = cleanHeader(payload.cognome, MAX_LENGTHS.cognome);
  const email = cleanHeader(payload.email, MAX_LENGTHS.email).toLowerCase();
  const oggetto = cleanHeader(payload.oggetto, MAX_LENGTHS.oggetto);
  const messaggio = clean(payload.messaggio, MAX_LENGTHS.messaggio);

  if (!nome || !cognome || !email || !oggetto || !messaggio) {
    return json({ error: 'Compila tutti i campi obbligatori.' }, 400);
  }

  if (!isValidEmail(email)) {
    return json({ error: 'Inserisci un indirizzo email valido.' }, 400);
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpPort = Number(process.env.SMTP_PORT || 465);
  const smtpSecure = String(process.env.SMTP_SECURE ?? (smtpPort === 465)) === 'true';
  const fromEmail = cleanHeader(
    process.env.CONTACT_FROM_EMAIL || process.env.PARTNERSHIP_FROM_EMAIL || smtpUser || '',
    254
  );
  const fromName = cleanHeader(
    process.env.CONTACT_FROM_NAME || process.env.PARTNERSHIP_FROM_NAME || 'Campionati Italiani Coastal Rowing 2026',
    160
  );

  if (!smtpHost || !smtpUser || !smtpPass || !fromEmail) {
    console.error('Configurazione SMTP incompleta per il modulo contatti.');
    return json({ error: 'Il servizio email non è ancora configurato.' }, 503);
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  });

  const subject = `Contatto dal sito - ${oggetto}`;
  const text = [
    'Messaggio inviato dal sito dei Campionati Italiani Coastal Rowing 2026',
    '',
    `Nome: ${nome}`,
    `Cognome: ${cognome}`,
    `Email: ${email}`,
    `Oggetto: ${oggetto}`,
    '',
    'Messaggio:',
    messaggio
  ].join('\n');

  const html = `
    <h2>Messaggio dal sito dei Campionati Italiani Coastal Rowing 2026</h2>
    <p><strong>Nome:</strong> ${escapeHtml(nome)}</p>
    <p><strong>Cognome:</strong> ${escapeHtml(cognome)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p><strong>Oggetto:</strong> ${escapeHtml(oggetto)}</p>
    <p><strong>Messaggio:</strong></p>
    <p>${escapeHtml(messaggio).replaceAll('\n', '<br>')}</p>
  `;

  try {
    await transporter.sendMail({
      from: { name: fromName, address: fromEmail },
      to: recipient,
      cc: email,
      replyTo: email,
      subject,
      text,
      html
    });

    return json({ ok: true, copiedTo: email });
  } catch (error) {
    console.error('Errore invio email contatti:', error);
    return json({ error: 'Non è stato possibile inviare il messaggio. Riprova più tardi.' }, 500);
  }
};

export const config = {
  path: '/api/contact'
};
import nodemailer from 'nodemailer';
import { Buffer } from 'node:buffer';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual
} from 'node:crypto';

export const SECRETARIAT_EMAIL = 'segreteria-gare@canottieripesaro.it';
export const BUILDERS = ['LOVA', 'Swift'];
export const BOAT_TYPES = ['C1x', 'C2x', 'C4x+'];
export const SLOT_LABELS = new Map([
  ['1300', '13:00–13:20'],
  ['1330', '13:30–13:50'],
  ['1400', '14:00–14:20'],
  ['1430', '14:30–14:50'],
  ['1500', '15:00–15:20'],
  ['1530', '15:30–15:50'],
  ['1600', '16:00–16:20'],
  ['1630', '16:30–16:50']
]);

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{40,80}$/;

export class ApiError extends Error {
  constructor(message, status = 400, code = 'BAD_REQUEST', details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class SupabaseError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = 'SupabaseError';
    this.status = status;
    this.payload = payload;
  }
}

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

export function clean(value, maxLength = 500) {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLength);
}

export function cleanHeader(value, maxLength = 254) {
  return clean(value, maxLength).replace(/[\r\n]+/g, ' ');
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isSameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  return origin === new URL(request.url).origin;
}

function safeEqual(left, right) {
  const leftHash = createHash('sha256').update(String(left)).digest();
  const rightHash = createHash('sha256').update(String(right)).digest();
  return timingSafeEqual(leftHash, rightHash);
}

function readBasicAuth(request) {
  const header = request.headers.get('authorization') || '';
  if (!header.startsWith('Basic ')) return null;
  try {
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const separator = decoded.indexOf(':');
    if (separator < 0) return null;
    return {
      username: decoded.slice(0, separator),
      password: decoded.slice(separator + 1)
    };
  } catch {
    return null;
  }
}

export function isAdminAuthorized(request) {
  const expectedUser = process.env.BOOKING_ADMIN_USER || process.env.NEWS_ADMIN_USER;
  const expectedPassword = process.env.BOOKING_ADMIN_PASSWORD || process.env.NEWS_ADMIN_PASSWORD;
  if (!expectedUser || !expectedPassword) {
    return { configured: false, valid: false };
  }
  const credentials = readBasicAuth(request);
  if (!credentials) return { configured: true, valid: false };
  return {
    configured: true,
    valid:
      safeEqual(credentials.username, expectedUser) &&
      safeEqual(credentials.password, expectedPassword)
  };
}

function supabaseConfig() {
  const url = clean(process.env.SUPABASE_URL, 500).replace(/\/$/, '');
  const secretKey = clean(process.env.SUPABASE_SECRET_KEY, 1000);
  if (!url || !secretKey) {
    throw new ApiError('Il database delle prenotazioni non è configurato.', 503, 'DATABASE_NOT_CONFIGURED');
  }
  return { url, secretKey };
}

export async function supabaseRequest(path, { method = 'GET', body, query, prefer } = {}) {
  const { url, secretKey } = supabaseConfig();
  const target = new URL(`${url}/rest/v1/${path}`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') target.searchParams.set(key, String(value));
    });
  }

  const headers = {
    apikey: secretKey,
    accept: 'application/json'
  };
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (prefer) headers.prefer = prefer;

  const response = await fetch(target, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }
  if (!response.ok) {
    const message = payload?.message || payload?.details || `Errore Supabase (${response.status})`;
    throw new SupabaseError(message, response.status, payload);
  }
  return payload;
}

export function rpc(name, args = {}) {
  return supabaseRequest(`rpc/${name}`, { method: 'POST', body: args });
}

export function generateEditToken() {
  return randomBytes(32).toString('base64url');
}

export function hashEditToken(token) {
  return createHash('sha256').update(String(token)).digest('hex');
}

function tokenEncryptionKey() {
  const source = process.env.BOOKING_TOKEN_ENCRYPTION_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!source) throw new ApiError('Chiave di cifratura token non configurata.', 503, 'TOKEN_KEY_NOT_CONFIGURED');
  return createHash('sha256').update(`coastal-bookings|${source}`).digest();
}

export function encryptEditToken(token) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', tokenEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(token), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join(':');
}

export function decryptEditToken(value) {
  try {
    const [version, ivText, tagText, encryptedText] = String(value || '').split(':');
    if (version !== 'v1' || !ivText || !tagText || !encryptedText) return null;
    const decipher = createDecipheriv('aes-256-gcm', tokenEncryptionKey(), Buffer.from(ivText, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedText, 'base64url')),
      decipher.final()
    ]).toString('utf8');
    return TOKEN_PATTERN.test(decrypted) ? decrypted : null;
  } catch {
    return null;
  }
}

export function normalizeToken(value) {
  const token = clean(value, 100);
  if (!TOKEN_PATTERN.test(token)) throw new ApiError('Link di modifica non valido.', 400, 'INVALID_TOKEN');
  return token;
}

export function validateBookingPayload(payload) {
  const society = cleanHeader(payload.society, 160);
  const contactSurname = cleanHeader(payload.contactSurname, 100);
  const contactName = cleanHeader(payload.contactName, 100);
  const phone = cleanHeader(payload.phone, 40);
  const email = cleanHeader(payload.email, 254).toLowerCase();
  const slotCode = clean(payload.slotCode, 10);
  const privacyAccepted = payload.privacyAccepted === true;
  const website = clean(payload.website, 200);

  if (website) return { spam: true };
  if (!society || !contactSurname || !contactName || !phone || !email || !slotCode) {
    throw new ApiError('Compila tutti i campi obbligatori.', 400, 'MISSING_FIELDS');
  }
  if (!isValidEmail(email)) throw new ApiError('Inserisci un indirizzo email valido.', 400, 'INVALID_EMAIL');
  if (!SLOT_LABELS.has(slotCode)) throw new ApiError('Seleziona uno slot valido.', 400, 'INVALID_SLOT');
  if (!privacyAccepted) throw new ApiError('Conferma di aver letto l’informativa privacy.', 400, 'PRIVACY_REQUIRED');

  const sourceItems = Array.isArray(payload.items) ? payload.items : [];
  if (!sourceItems.length) throw new ApiError('Seleziona almeno una barca.', 400, 'ITEMS_REQUIRED');

  const merged = new Map();
  for (const source of sourceItems) {
    const builder = cleanHeader(source?.builder, 40);
    const boatType = cleanHeader(source?.boatType, 20);
    const quantity = Number(source?.quantity);
    if (!BUILDERS.includes(builder) || !BOAT_TYPES.includes(boatType) || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      throw new ApiError('Una delle barche selezionate non è valida.', 400, 'INVALID_ITEM');
    }
    const key = `${builder}|${boatType}`;
    merged.set(key, { builder, boatType, quantity: (merged.get(key)?.quantity || 0) + quantity });
  }

  return {
    society,
    contactSurname,
    contactName,
    phone,
    email,
    slotCode,
    items: Array.from(merged.values())
  };
}

export function dbItems(items) {
  return items.map((item) => ({
    builder: item.builder,
    boat_type: item.boatType ?? item.boat_type,
    quantity: Number(item.quantity)
  }));
}

export function publicBooking(booking, items = []) {
  return {
    id: booking.id,
    society: booking.society,
    contactSurname: booking.contact_surname,
    contactName: booking.contact_name,
    phone: booking.phone,
    email: booking.email,
    slotCode: booking.slot_code,
    slotLabel: SLOT_LABELS.get(booking.slot_code) || booking.slot_code,
    createdAt: booking.created_at,
    updatedAt: booking.updated_at,
    items: items.map((item) => ({
      builder: item.builder,
      boatType: item.boat_type,
      quantity: Number(item.quantity)
    }))
  };
}

export async function getAvailability(excludeBookingId = null) {
  const rows = await rpc('get_boat_test_availability', {
    p_exclude_booking_id: excludeBookingId || null
  });
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    slotCode: row.slot_code,
    slotLabel: row.slot_label,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    builder: row.builder,
    boatType: row.boat_type,
    capacity: Number(row.capacity),
    booked: Number(row.booked),
    remaining: Number(row.remaining)
  }));
}

async function getItemsForBooking(bookingId) {
  return (await supabaseRequest('boat_test_booking_items', {
    query: {
      select: 'booking_id,builder,boat_type,quantity',
      booking_id: `eq.${bookingId}`,
      order: 'builder.asc,boat_type.asc'
    }
  })) || [];
}

export async function getBookingById(id, { includeDeleted = false } = {}) {
  const query = {
    select: 'id,society,contact_surname,contact_name,phone,email,slot_code,edit_token_hash,edit_token_encrypted,created_at,updated_at,deleted_at',
    id: `eq.${id}`,
    limit: 1
  };
  if (!includeDeleted) query.deleted_at = 'is.null';
  const rows = await supabaseRequest('boat_test_bookings', { query });
  const booking = Array.isArray(rows) ? rows[0] : null;
  if (!booking) return null;
  const items = await getItemsForBooking(booking.id);
  return { booking, items };
}

export async function getBookingByToken(rawToken) {
  const token = normalizeToken(rawToken);
  const tokenHash = hashEditToken(token);
  const rows = await supabaseRequest('boat_test_bookings', {
    query: {
      select: 'id,society,contact_surname,contact_name,phone,email,slot_code,edit_token_hash,edit_token_encrypted,created_at,updated_at,deleted_at',
      edit_token_hash: `eq.${tokenHash}`,
      deleted_at: 'is.null',
      limit: 1
    }
  });
  const booking = Array.isArray(rows) ? rows[0] : null;
  if (!booking) return null;
  const items = await getItemsForBooking(booking.id);
  return { token, booking, items };
}

export async function listActiveBookings() {
  const bookings = (await supabaseRequest('boat_test_bookings', {
    query: {
      select: 'id,society,contact_surname,contact_name,phone,email,slot_code,created_at,updated_at',
      deleted_at: 'is.null',
      order: 'created_at.desc'
    }
  })) || [];
  const allItems = (await supabaseRequest('boat_test_booking_items', {
    query: { select: 'booking_id,builder,boat_type,quantity' }
  })) || [];
  const activeIds = new Set(bookings.map((booking) => booking.id));
  const byBooking = new Map();
  allItems.forEach((item) => {
    if (!activeIds.has(item.booking_id)) return;
    if (!byBooking.has(item.booking_id)) byBooking.set(item.booking_id, []);
    byBooking.get(item.booking_id).push(item);
  });
  return bookings.map((booking) => publicBooking(booking, byBooking.get(booking.id) || []));
}

export async function persistEncryptedToken(bookingId, rawToken, { updateHash = false } = {}) {
  const body = { edit_token_encrypted: encryptEditToken(rawToken) };
  if (updateHash) body.edit_token_hash = hashEditToken(rawToken);
  await supabaseRequest('boat_test_bookings', {
    method: 'PATCH',
    query: { id: `eq.${bookingId}` },
    body,
    prefer: 'return=minimal'
  });
}

export async function ensureReadableToken(record) {
  const existing = decryptEditToken(record.booking.edit_token_encrypted);
  if (existing) return existing;
  const token = generateEditToken();
  await persistEncryptedToken(record.booking.id, token, { updateHash: true });
  return token;
}

function bookingLink(rawToken, requestUrl) {
  const configured = clean(process.env.BOOKING_SITE_URL, 500).replace(/\/$/, '');
  const base = configured || new URL(requestUrl).origin;
  return `${base}/modifica-prenotazione-barche.html#token=${encodeURIComponent(rawToken)}`;
}

export function getBookingLink(rawToken, requestUrl) {
  return bookingLink(rawToken, requestUrl);
}

export async function sendBookingNotification({ booking, items, rawToken, requestUrl, kind = 'updated' }) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpPort = Number(process.env.SMTP_PORT || 465);
  const smtpSecure = String(process.env.SMTP_SECURE ?? (smtpPort === 465)) === 'true';
  const fromEmail = cleanHeader(
    process.env.BOOKING_FROM_EMAIL || process.env.CONTACT_FROM_EMAIL || process.env.PARTNERSHIP_FROM_EMAIL || smtpUser || '',
    254
  );
  const fromName = cleanHeader(
    process.env.BOOKING_FROM_NAME || process.env.CONTACT_FROM_NAME || process.env.PARTNERSHIP_FROM_NAME || 'Campionati Italiani Coastal Rowing 2026',
    160
  );

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

  const slotLabel = SLOT_LABELS.get(booking.slot_code) || booking.slot_code;
  const normalizedItems = items.map((item) => ({
    builder: item.builder,
    boatType: item.boat_type ?? item.boatType,
    quantity: Number(item.quantity)
  }));
  const editLink = kind === 'deleted' || !rawToken ? '' : bookingLink(rawToken, requestUrl);
  const boatLines = normalizedItems.map((item) => `${item.builder} – ${item.boatType}: ${item.quantity}`).join('\n');
  const boatsHtml = normalizedItems
    .map((item) => `<li><strong>${escapeHtml(item.builder)} – ${escapeHtml(item.boatType)}</strong>: ${item.quantity}</li>`)
    .join('');

  const text = [
    headingByKind[kind] || headingByKind.updated,
    '',
    'Prove barche – venerdì 2 ottobre 2026',
    `Società: ${booking.society}`,
    `Referente: ${booking.contact_surname} ${booking.contact_name}`,
    `Telefono: ${booking.phone}`,
    `Email: ${booking.email}`,
    `Slot: ${slotLabel}`,
    '',
    'Barche:',
    boatLines,
    ...(editLink ? ['', 'Per modificare la prenotazione:', editLink, '', 'Conserva questo link: è personale.'] : [])
  ].join('\n');

  const html = `
    <h2>${escapeHtml(headingByKind[kind] || headingByKind.updated)}</h2>
    <p><strong>Prove barche – venerdì 2 ottobre 2026</strong></p>
    <p><strong>Società:</strong> ${escapeHtml(booking.society)}<br>
    <strong>Referente:</strong> ${escapeHtml(booking.contact_surname)} ${escapeHtml(booking.contact_name)}<br>
    <strong>Telefono:</strong> ${escapeHtml(booking.phone)}<br>
    <strong>Email:</strong> ${escapeHtml(booking.email)}<br>
    <strong>Slot:</strong> ${escapeHtml(slotLabel)}</p>
    <p><strong>Barche prenotate:</strong></p>
    <ul>${boatsHtml}</ul>
    ${editLink ? `<p><a href="${escapeHtml(editLink)}">Modifica la prenotazione</a></p><p><small>Conserva questo link: è personale e consente di modificare la prenotazione.</small></p>` : ''}
  `;

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: { user: smtpUser, pass: smtpPass }
  });

  await transporter.sendMail({
    from: { name: fromName, address: fromEmail },
    to: booking.email,
    cc: booking.email.toLowerCase() === SECRETARIAT_EMAIL.toLowerCase() ? undefined : SECRETARIAT_EMAIL,
    replyTo: SECRETARIAT_EMAIL,
    subject: subjectByKind[kind] || subjectByKind.updated,
    text,
    html
  });

  return { editLink };
}

export function mapDatabaseError(error) {
  if (!(error instanceof SupabaseError)) return null;
  const message = String(error.payload?.message || error.message || '');
  if (message.includes('INSUFFICIENT_AVAILABILITY')) {
    return new ApiError('Una o più barche non sono più disponibili nello slot scelto. Aggiorna la disponibilità e riprova.', 409, 'INSUFFICIENT_AVAILABILITY');
  }
  if (message.includes('CAPACITY_BELOW_CURRENT_BOOKINGS')) {
    return new ApiError('La nuova disponibilità è inferiore alle barche già prenotate.', 409, 'CAPACITY_BELOW_CURRENT_BOOKINGS');
  }
  if (message.includes('BOOKING_NOT_FOUND')) {
    return new ApiError('Prenotazione non trovata.', 404, 'BOOKING_NOT_FOUND');
  }
  if (message.includes('INVALID_SLOT') || message.includes('INVALID_BOAT_COMBINATION') || message.includes('INVALID_BOOKING_ITEM')) {
    return new ApiError('Dati della prenotazione non validi.', 400, 'INVALID_BOOKING');
  }
  return null;
}

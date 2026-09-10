import nodemailer from 'nodemailer';
import { randomBytes } from 'node:crypto';
import {
  ApiError,
  BOAT_TYPES,
  BUILDERS,
  SECRETARIAT_EMAIL,
  SLOT_LABELS,
  SupabaseError,
  clean,
  cleanHeader,
  dbItems,
  decryptEditToken,
  ensureReadableToken,
  escapeHtml,
  generateEditToken,
  getAvailability,
  getBookingLink,
  hashEditToken,
  isAdminAuthorized,
  isSameOrigin,
  json,
  normalizeToken,
  persistEncryptedToken,
  rpc,
  supabaseRequest,
  validateBookingPayload
} from './boat-bookings-common.mjs';

export {
  ApiError,
  BOAT_TYPES,
  BUILDERS,
  clean,
  cleanHeader,
  dbItems,
  ensureReadableToken,
  generateEditToken,
  getAvailability,
  getBookingLink,
  hashEditToken,
  isAdminAuthorized,
  isSameOrigin,
  json,
  persistEncryptedToken,
  rpc,
  validateBookingPayload
};

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_PATTERN = /^PB26-[A-HJ-NP-Z2-9]{8}$/;
const BOOKING_SELECT = 'id,booking_code,society,contact_surname,contact_name,phone,email,slot_code,edit_token_hash,edit_token_encrypted,created_at,updated_at,deleted_at';

function env(name) {
  return globalThis.Netlify?.env?.get?.(name) || '';
}

export function generateBookingCode() {
  return `PB26-${Array.from(randomBytes(8), (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('')}`;
}

export function normalizeBookingCode(value) {
  const raw = clean(value, 30).toUpperCase().replace(/\s+/g, '');
  const suffix = raw.replace(/^PB26-?/, '');
  const code = `PB26-${suffix}`;
  if (!CODE_PATTERN.test(code)) {
    throw new ApiError('Inserisci un codice prenotazione valido.', 400, 'INVALID_BOOKING_CODE');
  }
  return code;
}

export async function getSettings() {
  const rows = await rpc('get_boat_test_booking_settings');
  const row = Array.isArray(rows) ? rows[0] : null;
  return {
    bookingCutoffAt: row?.booking_cutoff_at || null,
    bookingOpen: row?.booking_open !== false
  };
}

async function getItems(bookingId) {
  return (await supabaseRequest('boat_test_booking_items', {
    query: {
      select: 'booking_id,builder,boat_type,quantity',
      booking_id: `eq.${bookingId}`,
      order: 'builder.asc,boat_type.asc'
    }
  })) || [];
}

async function getAssignments(bookingId) {
  return (await supabaseRequest('boat_test_active_assignment_details', {
    query: {
      select: 'booking_id,boat_id,slot_code,boat_number,builder,boat_type',
      booking_id: `eq.${bookingId}`,
      order: 'builder.asc,boat_type.asc,boat_number.asc'
    }
  })) || [];
}

async function hydrate(booking) {
  if (!booking) return null;
  const [items, assignments] = await Promise.all([getItems(booking.id), getAssignments(booking.id)]);
  return { booking, items, assignments };
}

export async function getBookingByIdV2(id) {
  const rows = await supabaseRequest('boat_test_bookings', {
    query: {
      select: BOOKING_SELECT,
      id: `eq.${id}`,
      deleted_at: 'is.null',
      limit: 1
    }
  });
  return hydrate(Array.isArray(rows) ? rows[0] : null);
}

export async function getBookingByTokenV2(rawToken) {
  const token = normalizeToken(rawToken);
  const rows = await supabaseRequest('boat_test_bookings', {
    query: {
      select: BOOKING_SELECT,
      edit_token_hash: `eq.${hashEditToken(token)}`,
      deleted_at: 'is.null',
      limit: 1
    }
  });
  const record = await hydrate(Array.isArray(rows) ? rows[0] : null);
  return record ? { token, ...record } : null;
}

export async function getBookingByCodeV2(rawCode) {
  const bookingCode = normalizeBookingCode(rawCode);
  const rows = await supabaseRequest('boat_test_bookings', {
    query: {
      select: BOOKING_SELECT,
      booking_code: `eq.${bookingCode}`,
      deleted_at: 'is.null',
      limit: 1
    }
  });
  return hydrate(Array.isArray(rows) ? rows[0] : null);
}

function groupItems(items, assignments) {
  const grouped = new Map();

  for (const item of items || []) {
    grouped.set(`${item.builder}|${item.boat_type}`, {
      builder: item.builder,
      boatType: item.boat_type,
      quantity: Number(item.quantity),
      boatNumbers: []
    });
  }

  for (const assignment of assignments || []) {
    const key = `${assignment.builder}|${assignment.boat_type}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        builder: assignment.builder,
        boatType: assignment.boat_type,
        quantity: 0,
        boatNumbers: []
      });
    }
    grouped.get(key).boatNumbers.push(assignment.boat_number);
  }

  return Array.from(grouped.values()).map((item) => ({
    ...item,
    boatNumbers: item.boatNumbers.sort((a, b) =>
      String(a).localeCompare(String(b), 'it', { numeric: true })
    )
  }));
}

export function publicBookingV2(record) {
  const { booking, items, assignments } = record;
  return {
    id: booking.id,
    bookingCode: booking.booking_code,
    society: booking.society,
    contactSurname: booking.contact_surname,
    contactName: booking.contact_name,
    phone: booking.phone,
    email: booking.email,
    slotCode: booking.slot_code,
    slotLabel: SLOT_LABELS.get(booking.slot_code) || booking.slot_code,
    createdAt: booking.created_at,
    updatedAt: booking.updated_at,
    items: groupItems(items, assignments)
  };
}

export async function listActiveBookingsV2() {
  const bookings = (await supabaseRequest('boat_test_bookings', {
    query: {
      select: BOOKING_SELECT,
      deleted_at: 'is.null',
      order: 'created_at.desc'
    }
  })) || [];

  return Promise.all(bookings.map(async (booking) => publicBookingV2(await hydrate(booking))));
}

export async function listSlots() {
  const rows = (await supabaseRequest('boat_test_slots', {
    query: {
      select: 'code,label,starts_at,ends_at,sort_order,active',
      order: 'sort_order.asc'
    }
  })) || [];

  return rows.map((row) => ({
    code: row.code,
    label: row.label || SLOT_LABELS.get(row.code) || row.code,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    sortOrder: Number(row.sort_order || 0),
    active: Boolean(row.active)
  }));
}

export async function setSlotActive(code, active) {
  const slotCode = clean(code, 10);
  if (!SLOT_LABELS.has(slotCode)) {
    throw new ApiError('Slot non valido.', 400, 'INVALID_SLOT');
  }

  const nextActive = Boolean(active);
  if (!nextActive) {
    const activeBookings = (await supabaseRequest('boat_test_bookings', {
      query: {
        select: 'id',
        slot_code: `eq.${slotCode}`,
        deleted_at: 'is.null',
        limit: 1
      }
    })) || [];

    if (activeBookings.length) {
      throw new ApiError(
        'Lo slot contiene prenotazioni attive. Sposta o elimina prima le prenotazioni presenti nello slot.',
        409,
        'SLOT_HAS_BOOKINGS'
      );
    }
  }

  await supabaseRequest('boat_test_slots', {
    method: 'PATCH',
    query: { code: `eq.${slotCode}` },
    body: { active: nextActive },
    prefer: 'return=minimal'
  });
}

export async function listBoats() {
  const rows = (await supabaseRequest('boat_test_boats', {
    query: {
      select: 'id,boat_number,builder,boat_type,active,created_at',
      order: 'builder.asc,boat_type.asc,boat_number.asc'
    }
  })) || [];

  return rows.map((row) => ({
    id: row.id,
    number: row.boat_number,
    builder: row.builder,
    boatType: row.boat_type,
    active: Boolean(row.active),
    createdAt: row.created_at
  }));
}

export async function addBoat({ number, builder, boatType }) {
  const boatNumber = cleanHeader(number, 40);
  const normalizedBuilder = cleanHeader(builder, 40);
  const normalizedType = cleanHeader(boatType, 20);

  if (!boatNumber) throw new ApiError('Inserisci il numero della barca.', 400, 'BOAT_NUMBER_REQUIRED');
  if (!BUILDERS.includes(normalizedBuilder) || !BOAT_TYPES.includes(normalizedType)) {
    throw new ApiError('Cantiere o tipo di barca non validi.', 400, 'INVALID_BOAT');
  }

  await supabaseRequest('boat_test_boats', {
    method: 'POST',
    body: {
      boat_number: boatNumber,
      builder: normalizedBuilder,
      boat_type: normalizedType,
      active: true
    },
    prefer: 'return=minimal'
  });
}

export async function setBoatActive(id, active) {
  await rpc('set_boat_test_boat_active', {
    p_boat_id: clean(id, 80),
    p_active: Boolean(active)
  });
}

export async function deleteBoat(id) {
  await rpc('delete_boat_test_boat', { p_boat_id: clean(id, 80) });
}

export async function setCutoff(cutoffLocal) {
  const value = cleanHeader(cutoffLocal, 32);
  if (value && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    throw new ApiError('Data e ora di chiusura non valide.', 400, 'INVALID_CUTOFF');
  }
  await rpc('set_boat_test_booking_cutoff', { p_cutoff_local: value || null });
  return getSettings();
}

export async function sendBookingNotificationV2({
  record,
  rawToken,
  requestUrl,
  kind = 'updated'
}) {
  const { booking } = record;
  const items = groupItems(record.items, record.assignments);

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

  const editLink = kind === 'deleted' || !rawToken ? '' : getBookingLink(rawToken, requestUrl);
  const slotLabel = SLOT_LABELS.get(booking.slot_code) || booking.slot_code;

  const textBoats = items.map((item) =>
    `${item.builder} – ${item.boatType}: ${item.quantity} — barche ${item.boatNumbers.join(', ')}`
  ).join('\n');

  const htmlBoats = items.map((item) =>
    `<li><strong>${escapeHtml(item.builder)} – ${escapeHtml(item.boatType)}</strong>: ${item.quantity}<br>Barche assegnate: <strong>${item.boatNumbers.map(escapeHtml).join(', ')}</strong></li>`
  ).join('');

  const text = [
    headingByKind[kind] || headingByKind.updated,
    '',
    `Codice prenotazione: ${booking.booking_code}`,
    `Società: ${booking.society}`,
    `Referente: ${booking.contact_surname} ${booking.contact_name}`,
    `Telefono: ${booking.phone}`,
    `Email: ${booking.email}`,
    `Slot: ${slotLabel}`,
    '',
    'Barche assegnate:',
    textBoats,
    ...(editLink ? ['', 'Link personale di modifica:', editLink] : [])
  ].join('\n');

  const html = `
    <h2>${escapeHtml(headingByKind[kind] || headingByKind.updated)}</h2>
    <p><strong>Codice prenotazione:</strong> ${escapeHtml(booking.booking_code)}</p>
    <p><strong>Società:</strong> ${escapeHtml(booking.society)}<br>
    <strong>Referente:</strong> ${escapeHtml(booking.contact_surname)} ${escapeHtml(booking.contact_name)}<br>
    <strong>Telefono:</strong> ${escapeHtml(booking.phone)}<br>
    <strong>Email:</strong> ${escapeHtml(booking.email)}<br>
    <strong>Slot:</strong> ${escapeHtml(slotLabel)}</p>
    <p><strong>Barche assegnate:</strong></p>
    <ul>${htmlBoats}</ul>
    ${editLink ? `<p><a href="${escapeHtml(editLink)}">Modifica la prenotazione</a></p><p><small>Il link consente modifiche fino al termine stabilito dall’organizzazione.</small></p>` : ''}
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
    cc: booking.email.toLowerCase() === notificationRecipient.toLowerCase() ? undefined : notificationRecipient,
    replyTo: notificationRecipient || fromEmail,
    subject: `${subjectPrefix}${subjectByKind[kind] || subjectByKind.updated}`,
    text,
    html
  });

  return { editLink };
}

export function mapDatabaseErrorV2(error) {
  if (!(error instanceof SupabaseError)) return null;

  const message = String(error.payload?.message || error.message || '');
  const code = String(error.payload?.code || '');

  if (message.includes('INSUFFICIENT_AVAILABILITY')) {
    return new ApiError('Una o più barche non sono più disponibili nello slot scelto. Aggiorna la disponibilità e riprova.', 409, 'INSUFFICIENT_AVAILABILITY');
  }
  if (message.includes('BOOKING_CLOSED')) {
    return new ApiError('Le prenotazioni e le modifiche online sono chiuse. Eventuali variazioni possono essere effettuate solo dall’organizzazione.', 409, 'BOOKING_CLOSED');
  }
  if (message.includes('BOOKING_NOT_FOUND')) {
    return new ApiError('Prenotazione non trovata.', 404, 'BOOKING_NOT_FOUND');
  }
  if (message.includes('BOAT_CURRENTLY_BOOKED')) {
    return new ApiError('La barca è assegnata a una prenotazione attiva e non può essere disattivata.', 409, 'BOAT_CURRENTLY_BOOKED');
  }
  if (message.includes('BOAT_MUST_BE_INACTIVE')) {
    return new ApiError('Disattiva prima la barca, poi potrai eliminarla.', 409, 'BOAT_MUST_BE_INACTIVE');
  }
  if (message.includes('BOAT_HAS_HISTORY')) {
    return new ApiError('La barca è già stata utilizzata in una prenotazione: può essere disattivata ma non eliminata.', 409, 'BOAT_HAS_HISTORY');
  }
  if (message.includes('BOAT_NUMBER_IMMUTABLE')) {
    return new ApiError('Il numero della barca non può essere modificato.', 409, 'BOAT_NUMBER_IMMUTABLE');
  }
  if (message.includes('BOAT_NOT_FOUND')) {
    return new ApiError('Barca non trovata.', 404, 'BOAT_NOT_FOUND');
  }
  if (message.includes('INVALID_CUTOFF')) {
    return new ApiError('Data e ora di chiusura non valide.', 400, 'INVALID_CUTOFF');
  }
  if (code === '23505' && message.toLowerCase().includes('booking')) {
    return new ApiError('Codice prenotazione già utilizzato.', 409, 'BOOKING_CODE_COLLISION');
  }
  if (code === '23505' && message.toLowerCase().includes('boat')) {
    return new ApiError('Esiste già una barca con questo numero.', 409, 'BOAT_NUMBER_EXISTS');
  }
  return null;
}
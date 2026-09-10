import {
  ApiError,
  dbItems,
  generateBookingCode,
  generateEditToken,
  getAvailability,
  getBookingByCodeV2,
  getBookingByIdV2,
  getBookingByTokenV2,
  getBookingLink,
  getSettings,
  hashEditToken,
  isSameOrigin,
  json,
  mapDatabaseErrorV2,
  persistEncryptedToken,
  publicBookingV2,
  rpc,
  sendBookingNotificationV2,
  validateBookingPayload
} from './_lib/boat-bookings-v2.mjs';

async function readPayload(request) {
  try {
    return await request.json();
  } catch {
    throw new ApiError('Dati non validi.', 400, 'INVALID_JSON');
  }
}

function validateEmailConfirmation(payload) {
  const email = String(payload.email || '').trim().toLowerCase();
  const emailConfirm = String(payload.emailConfirm || '').trim().toLowerCase();

  if (!emailConfirm) {
    throw new ApiError('Ripeti l’indirizzo email nel campo di conferma.', 400, 'EMAIL_CONFIRMATION_REQUIRED');
  }
  if (email !== emailConfirm) {
    throw new ApiError('Gli indirizzi email non coincidono.', 400, 'EMAIL_MISMATCH');
  }
}

async function createBooking(payload, request) {
  const validated = validateBookingPayload(payload);
  if (validated.spam) return json({ ok: true });
  validateEmailConfirmation(payload);

  const rawToken = generateEditToken();
  let bookingId = null;
  let lastError = null;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      bookingId = await rpc('create_boat_test_booking', {
        p_society: validated.society,
        p_contact_surname: validated.contactSurname,
        p_contact_name: validated.contactName,
        p_phone: validated.phone,
        p_email: validated.email,
        p_slot_code: validated.slotCode,
        p_edit_token_hash: hashEditToken(rawToken),
        p_booking_code: generateBookingCode(),
        p_items: dbItems(validated.items)
      });
      break;
    } catch (error) {
      const mapped = mapDatabaseErrorV2(error);
      if (mapped?.code === 'BOOKING_CODE_COLLISION') {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  if (!bookingId) throw lastError || new Error('Impossibile generare il codice prenotazione.');

  try {
    await persistEncryptedToken(bookingId, rawToken);
  } catch (error) {
    console.error('Impossibile memorizzare la copia cifrata del token:', error);
  }

  const record = await getBookingByIdV2(bookingId);
  if (!record) throw new Error('Prenotazione salvata ma non riletta.');

  let emailSent = false;
  let warning = '';
  let editLink = getBookingLink(rawToken, request.url);

  try {
    const sent = await sendBookingNotificationV2({
      record,
      rawToken,
      requestUrl: request.url,
      kind: 'created'
    });
    editLink = sent.editLink || editLink;
    emailSent = true;
  } catch (error) {
    console.error('Prenotazione salvata, errore invio email:', error);
    warning = 'La prenotazione è stata registrata, ma non è stato possibile inviare l’email di conferma. Conserva il codice e il link di modifica mostrati qui sotto.';
  }

  return json({
    ok: true,
    booking: publicBookingV2(record),
    editLink,
    emailSent,
    warning: warning || undefined
  }, 201);
}

async function loadBooking(payload) {
  const record = await getBookingByTokenV2(payload.token);
  if (!record) {
    throw new ApiError('Il link di modifica non è valido o la prenotazione non è più attiva.', 404, 'BOOKING_NOT_FOUND');
  }

  const [availability, settings] = await Promise.all([
    getAvailability(record.booking.id),
    getSettings()
  ]);

  return json({
    ok: true,
    booking: publicBookingV2(record),
    availability,
    settings,
    canEdit: settings.bookingOpen
  });
}

async function lookupBooking(payload) {
  const record = await getBookingByCodeV2(payload.bookingCode);
  if (!record) {
    throw new ApiError('Nessuna prenotazione trovata con questo codice.', 404, 'BOOKING_NOT_FOUND');
  }

  return json({
    ok: true,
    booking: publicBookingV2(record)
  });
}

async function updateBooking(payload, request) {
  const current = await getBookingByTokenV2(payload.token);
  if (!current) {
    throw new ApiError('Il link di modifica non è valido o la prenotazione non è più attiva.', 404, 'BOOKING_NOT_FOUND');
  }

  const validated = validateBookingPayload(payload);
  if (validated.spam) return json({ ok: true });
  validateEmailConfirmation(payload);

  await rpc('update_boat_test_booking', {
    p_booking_id: current.booking.id,
    p_society: validated.society,
    p_contact_surname: validated.contactSurname,
    p_contact_name: validated.contactName,
    p_phone: validated.phone,
    p_email: validated.email,
    p_slot_code: validated.slotCode,
    p_items: dbItems(validated.items),
    p_ignore_cutoff: false
  });

  try {
    await persistEncryptedToken(current.booking.id, current.token);
  } catch (error) {
    console.error('Impossibile aggiornare la copia cifrata del token:', error);
  }

  const updated = await getBookingByIdV2(current.booking.id);
  if (!updated) throw new Error('Prenotazione aggiornata ma non riletta.');

  let emailSent = false;
  let warning = '';

  try {
    await sendBookingNotificationV2({
      record: updated,
      rawToken: current.token,
      requestUrl: request.url,
      kind: 'updated'
    });
    emailSent = true;
  } catch (error) {
    console.error('Prenotazione aggiornata, errore invio email:', error);
    warning = 'La modifica è stata salvata, ma non è stato possibile inviare l’email di conferma.';
  }

  const [availability, settings] = await Promise.all([
    getAvailability(updated.booking.id),
    getSettings()
  ]);

  return json({
    ok: true,
    booking: publicBookingV2(updated),
    availability,
    settings,
    canEdit: settings.bookingOpen,
    editLink: getBookingLink(current.token, request.url),
    emailSent,
    warning: warning || undefined
  });
}

export default async (request) => {
  if (request.method !== 'POST') return json({ error: 'Metodo non consentito.' }, 405);
  if (!isSameOrigin(request)) return json({ error: 'Origine non consentita.' }, 403);

  try {
    const payload = await readPayload(request);
    const action = String(payload.action || 'create').trim().toLowerCase();

    if (action === 'create') return await createBooking(payload, request);
    if (action === 'get') return await loadBooking(payload);
    if (action === 'lookup') return await lookupBooking(payload);
    if (action === 'update') return await updateBooking(payload, request);

    throw new ApiError('Operazione non valida.', 400, 'INVALID_ACTION');
  } catch (error) {
    const mapped = mapDatabaseErrorV2(error);
    const apiError = mapped || (error instanceof ApiError ? error : null);
    if (apiError) return json({ error: apiError.message, code: apiError.code }, apiError.status);

    console.error('Errore gestione prenotazione prove barche:', error);
    return json({ error: 'Non è stato possibile completare l’operazione.' }, 500);
  }
};

export const config = {
  path: '/api/boat-bookings'
};

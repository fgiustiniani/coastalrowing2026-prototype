import {
  ApiError,
  dbItems,
  generateEditToken,
  getAvailability,
  getBookingById,
  getBookingByToken,
  getBookingLink,
  hashEditToken,
  isSameOrigin,
  json,
  mapDatabaseError,
  persistEncryptedToken,
  publicBooking,
  rpc,
  sendBookingNotification,
  validateBookingPayload
} from './_lib/boat-bookings-common.mjs';

async function readPayload(request) {
  try {
    return await request.json();
  } catch {
    throw new ApiError('Dati non validi.', 400, 'INVALID_JSON');
  }
}

async function createBooking(payload, request) {
  const validated = validateBookingPayload(payload);
  if (validated.spam) return json({ ok: true });

  const rawToken = generateEditToken();
  const bookingId = await rpc('create_boat_test_booking', {
    p_society: validated.society,
    p_contact_surname: validated.contactSurname,
    p_contact_name: validated.contactName,
    p_phone: validated.phone,
    p_email: validated.email,
    p_slot_code: validated.slotCode,
    p_edit_token_hash: hashEditToken(rawToken),
    p_items: dbItems(validated.items)
  });

  try {
    await persistEncryptedToken(bookingId, rawToken);
  } catch (error) {
    console.error('Impossibile memorizzare la copia cifrata del token:', error);
  }

  const record = await getBookingById(bookingId);
  if (!record) throw new Error('Prenotazione salvata ma non riletta.');

  let emailSent = false;
  let emailWarning = '';
  let editLink = getBookingLink(rawToken, request.url);
  try {
    const notification = await sendBookingNotification({
      booking: record.booking,
      items: record.items,
      rawToken,
      requestUrl: request.url,
      kind: 'created'
    });
    editLink = notification.editLink || editLink;
    emailSent = true;
  } catch (error) {
    console.error('Prenotazione salvata, errore invio email:', error);
    emailWarning = 'La prenotazione è stata registrata, ma non è stato possibile inviare l’email di conferma. Conserva il link di modifica mostrato qui sotto.';
  }

  return json({
    ok: true,
    booking: publicBooking(record.booking, record.items),
    editLink,
    emailSent,
    warning: emailWarning || undefined
  }, 201);
}

async function loadBooking(payload) {
  const record = await getBookingByToken(payload.token);
  if (!record) throw new ApiError('Il link di modifica non è valido o la prenotazione non è più attiva.', 404, 'BOOKING_NOT_FOUND');
  const availability = await getAvailability(record.booking.id);
  return json({
    ok: true,
    booking: publicBooking(record.booking, record.items),
    availability
  });
}

async function updateBooking(payload, request) {
  const current = await getBookingByToken(payload.token);
  if (!current) throw new ApiError('Il link di modifica non è valido o la prenotazione non è più attiva.', 404, 'BOOKING_NOT_FOUND');

  const validated = validateBookingPayload(payload);
  if (validated.spam) return json({ ok: true });

  await rpc('update_boat_test_booking', {
    p_booking_id: current.booking.id,
    p_society: validated.society,
    p_contact_surname: validated.contactSurname,
    p_contact_name: validated.contactName,
    p_phone: validated.phone,
    p_email: validated.email,
    p_slot_code: validated.slotCode,
    p_items: dbItems(validated.items)
  });

  try {
    await persistEncryptedToken(current.booking.id, current.token);
  } catch (error) {
    console.error('Impossibile aggiornare la copia cifrata del token:', error);
  }

  const updated = await getBookingById(current.booking.id);
  if (!updated) throw new Error('Prenotazione aggiornata ma non riletta.');

  let emailSent = false;
  let emailWarning = '';
  try {
    await sendBookingNotification({
      booking: updated.booking,
      items: updated.items,
      rawToken: current.token,
      requestUrl: request.url,
      kind: 'updated'
    });
    emailSent = true;
  } catch (error) {
    console.error('Prenotazione aggiornata, errore invio email:', error);
    emailWarning = 'La modifica è stata salvata, ma non è stato possibile inviare l’email di conferma.';
  }

  const availability = await getAvailability(updated.booking.id);
  return json({
    ok: true,
    booking: publicBooking(updated.booking, updated.items),
    availability,
    editLink: getBookingLink(current.token, request.url),
    emailSent,
    warning: emailWarning || undefined
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
    if (action === 'update') return await updateBooking(payload, request);
    throw new ApiError('Operazione non valida.', 400, 'INVALID_ACTION');
  } catch (error) {
    const mapped = mapDatabaseError(error);
    const apiError = mapped || (error instanceof ApiError ? error : null);
    if (apiError) return json({ error: apiError.message, code: apiError.code }, apiError.status);
    console.error('Errore gestione prenotazione prove barche:', error);
    return json({ error: 'Non è stato possibile completare l’operazione.' }, 500);
  }
};

export const config = {
  path: '/api/boat-bookings'
};

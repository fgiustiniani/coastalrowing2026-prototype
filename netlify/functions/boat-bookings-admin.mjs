import {
  ApiError,
  BOAT_TYPES,
  BUILDERS,
  dbItems,
  ensureReadableToken,
  getAvailability,
  getBookingById,
  isAdminAuthorized,
  isSameOrigin,
  json,
  listActiveBookings,
  mapDatabaseError,
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

async function dashboardPayload() {
  const [bookings, availability] = await Promise.all([
    listActiveBookings(),
    getAvailability()
  ]);
  return { bookings, availability, builders: BUILDERS, boatTypes: BOAT_TYPES };
}

async function updateBooking(payload, request) {
  const bookingId = String(payload.id || '').trim();
  if (!bookingId) throw new ApiError('Prenotazione non valida.', 400, 'INVALID_BOOKING_ID');
  const current = await getBookingById(bookingId);
  if (!current) throw new ApiError('Prenotazione non trovata.', 404, 'BOOKING_NOT_FOUND');
  const validated = validateBookingPayload({ ...payload, privacyAccepted: true, website: '' });

  await rpc('update_boat_test_booking', {
    p_booking_id: bookingId,
    p_society: validated.society,
    p_contact_surname: validated.contactSurname,
    p_contact_name: validated.contactName,
    p_phone: validated.phone,
    p_email: validated.email,
    p_slot_code: validated.slotCode,
    p_items: dbItems(validated.items)
  });

  const token = await ensureReadableToken(current);
  const updated = await getBookingById(bookingId);
  if (!updated) throw new Error('Prenotazione aggiornata ma non riletta.');

  let emailSent = false;
  let warning = '';
  try {
    await sendBookingNotification({
      booking: updated.booking,
      items: updated.items,
      rawToken: token,
      requestUrl: request.url,
      kind: 'updated'
    });
    emailSent = true;
  } catch (error) {
    console.error('Modifica admin salvata, errore email:', error);
    warning = 'Modifica salvata, ma l’email di aggiornamento non è stata inviata.';
  }

  return json({ ok: true, booking: publicBooking(updated.booking, updated.items), emailSent, warning: warning || undefined });
}

async function deleteBooking(payload, request) {
  const bookingId = String(payload.id || '').trim();
  if (!bookingId) throw new ApiError('Prenotazione non valida.', 400, 'INVALID_BOOKING_ID');
  const current = await getBookingById(bookingId);
  if (!current) throw new ApiError('Prenotazione non trovata.', 404, 'BOOKING_NOT_FOUND');

  await rpc('delete_boat_test_booking', { p_booking_id: bookingId });

  let emailSent = false;
  let warning = '';
  try {
    await sendBookingNotification({
      booking: current.booking,
      items: current.items,
      rawToken: null,
      requestUrl: request.url,
      kind: 'deleted'
    });
    emailSent = true;
  } catch (error) {
    console.error('Cancellazione admin salvata, errore email:', error);
    warning = 'Prenotazione annullata, ma l’email di annullamento non è stata inviata.';
  }

  return json({ ok: true, emailSent, warning: warning || undefined });
}

async function setCapacity(payload) {
  const builder = String(payload.builder || '').trim();
  const boatType = String(payload.boatType || '').trim();
  const capacity = Number(payload.capacity);
  const slotCode = String(payload.slotCode || '').trim() || null;
  if (!BUILDERS.includes(builder) || !BOAT_TYPES.includes(boatType) || !Number.isInteger(capacity) || capacity < 0 || capacity > 99) {
    throw new ApiError('Dati della disponibilità non validi.', 400, 'INVALID_CAPACITY');
  }
  await rpc('set_boat_test_capacity', {
    p_builder: builder,
    p_boat_type: boatType,
    p_capacity: capacity,
    p_slot_code: slotCode
  });
  return json({ ok: true, availability: await getAvailability() });
}

async function resendBooking(payload, request) {
  const bookingId = String(payload.id || '').trim();
  if (!bookingId) throw new ApiError('Prenotazione non valida.', 400, 'INVALID_BOOKING_ID');
  const current = await getBookingById(bookingId);
  if (!current) throw new ApiError('Prenotazione non trovata.', 404, 'BOOKING_NOT_FOUND');
  const token = await ensureReadableToken(current);
  await sendBookingNotification({
    booking: current.booking,
    items: current.items,
    rawToken: token,
    requestUrl: request.url,
    kind: 'resent'
  });
  return json({ ok: true, emailSent: true });
}

export default async (request) => {
  if (request.method !== 'POST') return json({ error: 'Metodo non consentito.' }, 405);
  if (!isSameOrigin(request)) return json({ error: 'Origine non consentita.' }, 403);

  const auth = isAdminAuthorized(request);
  if (!auth.configured) return json({ error: 'L’area amministrativa non è configurata.' }, 503);
  if (!auth.valid) return json({ error: 'Credenziali non valide.' }, 401);

  try {
    const payload = await readPayload(request);
    const action = String(payload.action || '').trim().toLowerCase();
    if (action === 'login') return json({ ok: true });
    if (action === 'list') return json({ ok: true, ...(await dashboardPayload()) });
    if (action === 'update') return await updateBooking(payload, request);
    if (action === 'delete') return await deleteBooking(payload, request);
    if (action === 'setcapacity') return await setCapacity(payload);
    if (action === 'resend') return await resendBooking(payload, request);
    throw new ApiError('Operazione non valida.', 400, 'INVALID_ACTION');
  } catch (error) {
    const mapped = mapDatabaseError(error);
    const apiError = mapped || (error instanceof ApiError ? error : null);
    if (apiError) return json({ error: apiError.message, code: apiError.code }, apiError.status);
    console.error('Errore area admin prenotazioni barche:', error);
    return json({ error: 'Non è stato possibile completare l’operazione.' }, 500);
  }
};

export const config = {
  path: '/api/boat-bookings-admin'
};

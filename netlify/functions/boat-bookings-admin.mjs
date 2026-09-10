import {
  ApiError,
  BOAT_TYPES,
  BUILDERS,
  addBoat,
  clean,
  dbItems,
  deleteBoat,
  ensureReadableToken,
  getAvailability,
  getBookingByIdV2,
  getSettings,
  isAdminAuthorized,
  isSameOrigin,
  json,
  listActiveBookingsV2,
  listBoats,
  mapDatabaseErrorV2,
  publicBookingV2,
  rpc,
  sendBookingNotificationV2,
  setBoatActive,
  setCutoff,
  validateBookingPayload
} from './_lib/boat-bookings-v2.mjs';

async function readPayload(request) {
  try {
    return await request.json();
  } catch {
    throw new ApiError('Dati non validi.', 400, 'INVALID_JSON');
  }
}

async function dashboardPayload() {
  const [bookings, availability, boats, settings] = await Promise.all([
    listActiveBookingsV2(),
    getAvailability(),
    listBoats(),
    getSettings()
  ]);
  return { bookings, availability, boats, settings, builders: BUILDERS, boatTypes: BOAT_TYPES };
}

async function updateBooking(payload, request) {
  const bookingId = clean(payload.id, 80);
  if (!bookingId) throw new ApiError('Prenotazione non valida.', 400, 'INVALID_BOOKING_ID');

  const current = await getBookingByIdV2(bookingId);
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
    p_items: dbItems(validated.items),
    p_ignore_cutoff: true
  });

  const token = await ensureReadableToken(current);
  const updated = await getBookingByIdV2(bookingId);
  if (!updated) throw new Error('Prenotazione aggiornata ma non riletta.');

  let emailSent = false;
  let warning = '';

  try {
    await sendBookingNotificationV2({
      record: updated,
      rawToken: token,
      requestUrl: request.url,
      kind: 'updated'
    });
    emailSent = true;
  } catch (error) {
    console.error('Modifica admin salvata, errore email:', error);
    warning = 'Modifica salvata, ma l’email di aggiornamento non è stata inviata.';
  }

  return json({ ok: true, booking: publicBookingV2(updated), emailSent, warning: warning || undefined });
}

async function deleteBooking(payload, request) {
  const bookingId = clean(payload.id, 80);
  if (!bookingId) throw new ApiError('Prenotazione non valida.', 400, 'INVALID_BOOKING_ID');

  const current = await getBookingByIdV2(bookingId);
  if (!current) throw new ApiError('Prenotazione non trovata.', 404, 'BOOKING_NOT_FOUND');

  await rpc('delete_boat_test_booking', { p_booking_id: bookingId });

  let emailSent = false;
  let warning = '';

  try {
    await sendBookingNotificationV2({
      record: current,
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

async function resendBooking(payload, request) {
  const bookingId = clean(payload.id, 80);
  if (!bookingId) throw new ApiError('Prenotazione non valida.', 400, 'INVALID_BOOKING_ID');

  const current = await getBookingByIdV2(bookingId);
  if (!current) throw new ApiError('Prenotazione non trovata.', 404, 'BOOKING_NOT_FOUND');

  const token = await ensureReadableToken(current);
  await sendBookingNotificationV2({
    record: current,
    rawToken: token,
    requestUrl: request.url,
    kind: 'resent'
  });

  return json({ ok: true, emailSent: true });
}

async function saveCutoff(payload) {
  return json({ ok: true, settings: await setCutoff(payload.cutoffLocal) });
}

async function createBoat(payload) {
  await addBoat({ number: payload.number, builder: payload.builder, boatType: payload.boatType });
  return json({
    ok: true,
    boats: await listBoats(),
    availability: await getAvailability()
  }, 201);
}

async function toggleBoat(payload) {
  const boatId = clean(payload.id, 80);
  if (!boatId) throw new ApiError('Barca non valida.', 400, 'INVALID_BOAT_ID');

  await setBoatActive(boatId, payload.active === true);
  return json({
    ok: true,
    boats: await listBoats(),
    availability: await getAvailability()
  });
}

async function removeBoat(payload) {
  const boatId = clean(payload.id, 80);
  if (!boatId) throw new ApiError('Barca non valida.', 400, 'INVALID_BOAT_ID');

  await deleteBoat(boatId);
  return json({
    ok: true,
    boats: await listBoats(),
    availability: await getAvailability()
  });
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
    if (action === 'resend') return await resendBooking(payload, request);
    if (action === 'setcutoff') return await saveCutoff(payload);
    if (action === 'addboat') return await createBoat(payload);
    if (action === 'toggleboat') return await toggleBoat(payload);
    if (action === 'deleteboat') return await removeBoat(payload);

    throw new ApiError('Operazione non valida.', 400, 'INVALID_ACTION');
  } catch (error) {
    const mapped = mapDatabaseErrorV2(error);
    const apiError = mapped || (error instanceof ApiError ? error : null);
    if (apiError) return json({ error: apiError.message, code: apiError.code }, apiError.status);

    console.error('Errore area admin prenotazioni barche:', error);
    return json({ error: 'Non è stato possibile completare l’operazione.' }, 500);
  }
};

export const config = {
  path: '/api/boat-bookings-admin'
};

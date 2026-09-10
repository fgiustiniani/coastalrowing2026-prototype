import {
  getAvailability,
  isSameOrigin,
  json,
  ApiError
} from './_lib/boat-bookings-common.mjs';

export default async (request) => {
  if (request.method !== 'GET') return json({ error: 'Metodo non consentito.' }, 405);
  if (!isSameOrigin(request)) return json({ error: 'Origine non consentita.' }, 403);

  try {
    const availability = await getAvailability();
    return json({ availability });
  } catch (error) {
    console.error('Errore disponibilità prove barche:', error);
    if (error instanceof ApiError) return json({ error: error.message, code: error.code }, error.status);
    return json({ error: 'Non è stato possibile caricare la disponibilità.' }, 500);
  }
};

export const config = {
  path: '/api/boat-availability'
};

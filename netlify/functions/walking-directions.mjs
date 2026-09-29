const POINT_LINKS = {
  '1': 'https://maps.app.goo.gl/mgaSRyb9ETSPAWWn8',
  '2': 'https://maps.app.goo.gl/8ouoP92AmxmiMSpV9',
  '3': 'https://maps.app.goo.gl/gnsDZq8upJsce1rUA',
  '4': 'https://maps.app.goo.gl/Q9oqx5rz3vjTvsRQ8',
  '5': 'https://maps.app.goo.gl/TysJzh64PogUqsWE7',
  '6': 'https://maps.app.goo.gl/DGfSHpoN7i3Wt4RC7',
  '7': 'https://maps.app.goo.gl/DGfSHpoN7i3Wt4RC7',
  '8': 'https://maps.app.goo.gl/9geUCNftSE8A1F6h6',
  '9': 'https://maps.app.goo.gl/Pc8ofT7eu1EyEWMEA',
  '10': 'https://maps.app.goo.gl/Sv7j2GNW8ATJ5t3U6',
  '11': 'https://maps.app.goo.gl/oWVCbN2UQYbQTa9b7',
  '12': 'https://maps.app.goo.gl/z9TCStLaTCEJsKgJA',
  '13': 'https://maps.app.goo.gl/bBBGfXqxEwEJKKPU8',
  '14': 'https://maps.app.goo.gl/dGQSvVoBD2UCh7CQ9',
  water: 'https://maps.app.goo.gl/BpdJzzSwQpwoyeGV8'
};

function validCoordinates(lat, lng) {
  return Number.isFinite(lat)
    && Number.isFinite(lng)
    && lat >= -90 && lat <= 90
    && lng >= -180 && lng <= 180;
}

function extractCoordinates(value) {
  const text = String(value || '');

  const patterns = [
    /@(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/,
    /!3d(-?\d{1,2}(?:\.\d+)?)!4d(-?\d{1,3}(?:\.\d+)?)/,
    /"latitude"\s*:\s*(-?\d{1,2}(?:\.\d+)?)[\s\S]{0,120}?"longitude"\s*:\s*(-?\d{1,3}(?:\.\d+)?)/,
    /"lat"\s*:\s*(-?\d{1,2}(?:\.\d+)?)[\s\S]{0,120}?"lng"\s*:\s*(-?\d{1,3}(?:\.\d+)?)/
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const lat = Number(match[1]);
    const lng = Number(match[2]);
    if (validCoordinates(lat, lng)) return { lat, lng };
  }

  return null;
}

async function resolveCoordinates(shortUrl) {
  let currentUrl = shortUrl;

  for (let step = 0; step < 6; step += 1) {
    const response = await fetch(currentUrl, {
      redirect: 'manual',
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; CoastalRowing2026/1.0)'
      }
    });

    const location = response.headers.get('location');
    if (location && response.status >= 300 && response.status < 400) {
      currentUrl = new URL(location, currentUrl).toString();
      const fromRedirect = extractCoordinates(currentUrl);
      if (fromRedirect) return fromRedirect;
      continue;
    }

    const fromFinalUrl = extractCoordinates(response.url || currentUrl);
    if (fromFinalUrl) return fromFinalUrl;

    const body = await response.text();
    const fromBody = extractCoordinates(body);
    if (fromBody) return fromBody;

    break;
  }

  return null;
}

export default async (request) => {
  if (request.method !== 'GET') {
    return new Response('Metodo non consentito.', { status: 405 });
  }

  const requestUrl = new URL(request.url);
  const point = requestUrl.searchParams.get('point') || '';
  const shortUrl = POINT_LINKS[point];

  if (!shortUrl) {
    return new Response('Punto non valido.', { status: 400 });
  }

  try {
    const coordinates = await resolveCoordinates(shortUrl);
    if (coordinates) {
      const destination = `${coordinates.lat.toFixed(7)},${coordinates.lng.toFixed(7)}`;
      const walkingUrl = new URL('https://www.google.com/maps/dir/');
      walkingUrl.searchParams.set('api', '1');
      walkingUrl.searchParams.set('destination', destination);
      walkingUrl.searchParams.set('travelmode', 'walking');
      walkingUrl.searchParams.set('dir_action', 'navigate');

      return Response.redirect(walkingUrl.toString(), 302);
    }
  } catch (_) {
    // Se Google non consente la risoluzione server-side, manteniamo il link esatto fornito.
  }

  return Response.redirect(shortUrl, 302);
};

export const config = {
  path: '/api/walking-directions'
};

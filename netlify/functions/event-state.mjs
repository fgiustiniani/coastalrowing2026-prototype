import { getStore } from '@netlify/blobs';
import { Buffer } from 'node:buffer';
import { createHash, timingSafeEqual } from 'node:crypto';

function defaultConfig() {
  return { state: 'pre', stream: 'sabato', updatedAt: null };
}

function validStates() {
  return new Set(['pre', 'live', 'pause', 'post']);
}

function validStreams() {
  return new Set(['sabato', 'domenica']);
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

function clean(value, maxLength = 80) {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLength);
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

function isAuthorized(request) {
  const expectedUser = Netlify.env.get('EVENT_ADMIN_USER') || Netlify.env.get('NEWS_ADMIN_USER');
  const expectedPassword = Netlify.env.get('EVENT_ADMIN_PASSWORD') || Netlify.env.get('NEWS_ADMIN_PASSWORD');

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

function sanitizeStoreSuffix(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function resolveStoreName(requestUrl) {
  const configuredStore = String(Netlify.env.get('EVENT_STATE_STORE_NAME') || '').trim();
  if (configuredStore) return configuredStore;

  const hostname = requestUrl.hostname.toLowerCase();
  if (hostname.endsWith('.netlify.app') && hostname.includes('--')) {
    const deployPrefix = sanitizeStoreSuffix(hostname.split('--')[0]);
    if (deployPrefix) return `coastal-event-state-${deployPrefix}`;
  }

  return 'coastal-event-state';
}

function normalizeConfig(value) {
  const defaults = defaultConfig();
  const state = validStates().has(value?.state) ? value.state : defaults.state;
  const stream = validStreams().has(value?.stream) ? value.stream : defaults.stream;
  const updatedAt = typeof value?.updatedAt === 'string' ? value.updatedAt : null;
  return { state, stream, updatedAt };
}

async function readConfig(store) {
  const stored = await store.get('current', { type: 'json' });
  return normalizeConfig(stored || defaultConfig());
}

export default async (request) => {
  const requestUrl = new URL(request.url);
  const store = getStore(resolveStoreName(requestUrl), { consistency: 'strong' });

  if (request.method === 'GET') {
    try {
      return json(await readConfig(store));
    } catch (error) {
      console.error('Errore lettura stato evento:', error);
      return json(defaultConfig());
    }
  }

  if (request.method !== 'POST') {
    return json({ error: 'Metodo non consentito.' }, 405);
  }

  const requestOrigin = requestUrl.origin;
  const origin = request.headers.get('origin');
  if (origin && origin !== requestOrigin) {
    return json({ error: 'Origine non consentita.' }, 403);
  }

  const auth = isAuthorized(request);
  if (!auth.configured) {
    return json({ error: 'La gestione evento non è ancora configurata.' }, 503);
  }
  if (!auth.valid) {
    return json({ error: 'Credenziali non valide.' }, 401);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Dati non validi.' }, 400);
  }

  const action = clean(payload.action, 20);

  if (action === 'login') {
    return json({ ok: true, ...(await readConfig(store)) });
  }

  if (action !== 'set') {
    return json({ error: 'Operazione non valida.' }, 400);
  }

  const state = clean(payload.state, 20);
  const stream = clean(payload.stream, 20);

  if (!validStates().has(state)) {
    return json({ error: 'Stato evento non valido.' }, 400);
  }
  if (!validStreams().has(stream)) {
    return json({ error: 'Diretta YouTube non valida.' }, 400);
  }

  const config = {
    state,
    stream,
    updatedAt: new Date().toISOString()
  };

  try {
    await store.setJSON('current', config);
    return json({ ok: true, ...config });
  } catch (error) {
    console.error('Errore salvataggio stato evento:', error);
    return json({ error: 'Non è stato possibile salvare lo stato evento.' }, 500);
  }
};

export const config = {
  path: '/api/event-state'
};

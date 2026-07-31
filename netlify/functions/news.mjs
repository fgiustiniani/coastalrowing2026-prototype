import { getStore } from '@netlify/blobs';
import { Buffer } from 'node:buffer';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';

const STORE_KEY = 'items';
const MAX_ITEMS = 100;

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
  const expectedUser = process.env.NEWS_ADMIN_USER;
  const expectedPassword = process.env.NEWS_ADMIN_PASSWORD;

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

async function readNews(store) {
  const stored = await store.get(STORE_KEY, { type: 'json' });
  return Array.isArray(stored) ? stored : [];
}

function sortNews(items) {
  return [...items].sort((a, b) => {
    const byDate = String(b.date || '').localeCompare(String(a.date || ''));
    if (byDate !== 0) return byDate;
    return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
  });
}

function validateNewsPayload(payload) {
  const title = clean(payload.title, 160);
  const date = clean(payload.date, 10);
  const summary = clean(payload.summary, 600);
  const body = clean(payload.body, 5000);

  if (!title || !date || !summary) {
    return { error: 'Compila titolo, data e sintesi.' };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { error: 'Inserisci una data valida.' };
  }

  return { title, date, summary, body };
}

export default async (request) => {
  const requestUrl = new URL(request.url);
  const defaultStoreName = requestUrl.hostname.startsWith('develop--')
    ? 'coastal-news-develop'
    : 'coastal-news';
  const store = getStore(process.env.NEWS_STORE_NAME || defaultStoreName);

  if (request.method === 'GET') {
    try {
      const news = sortNews(await readNews(store));
      return json({ news });
    } catch (error) {
      console.error('Errore lettura news:', error);
      return json({ error: 'Non è stato possibile caricare le news.' }, 500);
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
    return json({ error: 'La gestione news non è ancora configurata.' }, 503);
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
    return json({ ok: true });
  }

  if (!['create', 'update', 'delete'].includes(action)) {
    return json({ error: 'Operazione non valida.' }, 400);
  }

  try {
    const news = await readNews(store);

    if (action === 'delete') {
      const id = clean(payload.id, 80);
      if (!id) return json({ error: 'News non valida.' }, 400);

      const updated = news.filter((item) => item.id !== id);
      if (updated.length === news.length) {
        return json({ error: 'News non trovata.' }, 404);
      }

      await store.setJSON(STORE_KEY, updated);
      return json({ ok: true, news: sortNews(updated) });
    }

    const validated = validateNewsPayload(payload);
    if (validated.error) return json({ error: validated.error }, 400);

    if (action === 'create') {
      const item = {
        id: randomUUID(),
        ...validated,
        createdAt: new Date().toISOString()
      };

      const updated = sortNews([item, ...news]).slice(0, MAX_ITEMS);
      await store.setJSON(STORE_KEY, updated);
      return json({ ok: true, news: updated, item });
    }

    const id = clean(payload.id, 80);
    const index = news.findIndex((item) => item.id === id);
    if (index < 0) return json({ error: 'News non trovata.' }, 404);

    const item = {
      ...news[index],
      ...validated,
      updatedAt: new Date().toISOString()
    };

    const updated = [...news];
    updated[index] = item;
    const sorted = sortNews(updated);
    await store.setJSON(STORE_KEY, sorted);
    return json({ ok: true, news: sorted, item });
  } catch (error) {
    console.error('Errore gestione news:', error);
    return json({ error: 'Non è stato possibile completare l’operazione.' }, 500);
  }
};

export const config = {
  path: '/api/news'
};

import { Buffer } from 'node:buffer';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

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
      'cache-control': 'no-store, max-age=0'
    }
  });
}

export function clean(value, maxLength = 500) {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLength);
}

export function isSameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  return origin === new URL(request.url).origin;
}

function env(name) {
  return clean(process.env[name] || '', 4000);
}

function safeEqual(left, right) {
  const leftHash = createHash('sha256').update(String(left)).digest();
  const rightHash = createHash('sha256').update(String(right)).digest();
  return timingSafeEqual(leftHash, rightHash);
}

function accessSecret() {
  const explicit = env('VOLUNTEER_ACCESS_TOKEN');
  if (explicit) return explicit;
  const databaseSecret = env('SUPABASE_SECRET_KEY');
  if (!databaseSecret) throw new ApiError('Accesso volontari non configurato.', 503, 'ACCESS_NOT_CONFIGURED');
  return createHash('sha256').update(`coastal-volunteers-access|${databaseSecret}`).digest('hex');
}

function sessionKey() {
  return createHash('sha256').update(`coastal-volunteers-session|${accessSecret()}`).digest();
}

function inviteKey() {
  return createHash('sha256').update(`coastal-volunteers-invite|${accessSecret()}`).digest();
}
function summaryPdfKey() {
  return createHash('sha256').update(`coastal-volunteers-summary-pdf|${accessSecret()}`).digest();
}

export function issueVolunteerInvite() {
  const payload = {
    v: 1,
    scope: 'volunteers',
    exp: Math.floor(Date.parse('2026-10-06T21:59:59Z') / 1000)
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = createHmac('sha256', inviteKey()).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

function verifyInviteToken(value) {
  const [encoded, signature, extra] = String(value || '').split('.');
  if (!encoded || !signature || extra) return false;
  const expected = createHmac('sha256', inviteKey()).update(encoded).digest('base64url');
  if (!safeEqual(signature, expected)) return false;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    return payload?.v === 1 && payload?.scope === 'volunteers' && Number.isFinite(payload?.exp) && payload.exp > now;
  } catch {
    return false;
  }
}

export function verifySharedAccessToken(value) {
  const supplied = clean(value, 1000);
  if (!supplied) return false;
  const explicit = env('VOLUNTEER_ACCESS_TOKEN');
  if (explicit && safeEqual(supplied, explicit)) return true;
  return verifyInviteToken(supplied);
}

export function issueVolunteerSummaryPdfToken(submissionIdValue, ttlSeconds = 3600) {
  const submissionId = clean(submissionIdValue, 60);
  if (!isUuid(submissionId)) throw new ApiError('Invio non valido.', 400, 'INVALID_SUBMISSION_ID');
  const now = Math.floor(Date.now() / 1000);
  const requestedTtl = Number(ttlSeconds);
  const ttl = Number.isFinite(requestedTtl) ? Math.min(Math.max(Math.trunc(requestedTtl), 60), 21600) : 3600;
  const payload = { v: 1, scope: 'volunteer-summary-pdf', submissionId, exp: now + ttl };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = createHmac('sha256', summaryPdfKey()).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

export function verifyVolunteerSummaryPdfToken(value) {
  const supplied = clean(value, 4000);
  const [encoded, signature, extra] = supplied.split('.');
  if (!encoded || !signature || extra) throw new ApiError('Link al riepilogo non valido o scaduto.', 401, 'INVALID_PDF_TOKEN');
  const expected = createHmac('sha256', summaryPdfKey()).update(encoded).digest('base64url');
  if (!safeEqual(signature, expected)) throw new ApiError('Link al riepilogo non valido o scaduto.', 401, 'INVALID_PDF_TOKEN');
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (payload?.v !== 1 || payload?.scope !== 'volunteer-summary-pdf' || !isUuid(payload?.submissionId) || !Number.isFinite(payload?.exp) || payload.exp <= now) {
      throw new Error('invalid');
    }
    return payload;
  } catch {
    throw new ApiError('Link al riepilogo non valido o scaduto.', 401, 'INVALID_PDF_TOKEN');
  }
}

export function issueVolunteerSession() {
  const now = Math.floor(Date.now() / 1000);
  const payload = { iat: now, exp: now + (12 * 60 * 60), jti: randomBytes(18).toString('base64url') };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = createHmac('sha256', sessionKey()).update(encoded).digest('base64url');
  return { token: `${encoded}.${signature}`, expiresAt: new Date(payload.exp * 1000).toISOString() };
}

export function requireVolunteerSession(request) {
  const header = request.headers.get('authorization') || '';
  if (!header.startsWith('Bearer ')) throw new ApiError('Sessione non valida.', 401, 'UNAUTHORIZED');
  const token = header.slice(7).trim();
  const [encoded, signature, extra] = token.split('.');
  if (!encoded || !signature || extra) throw new ApiError('Sessione non valida.', 401, 'UNAUTHORIZED');
  const expected = createHmac('sha256', sessionKey()).update(encoded).digest('base64url');
  if (!safeEqual(signature, expected)) throw new ApiError('Sessione non valida.', 401, 'UNAUTHORIZED');

  let payload;
  try { payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')); }
  catch { throw new ApiError('Sessione non valida.', 401, 'UNAUTHORIZED'); }
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(payload?.exp) || payload.exp <= now || !clean(payload?.jti, 100)) {
    throw new ApiError('Sessione scaduta.', 401, 'SESSION_EXPIRED');
  }
  return payload;
}

function readBasicAuth(request) {
  const header = request.headers.get('authorization') || '';
  if (!header.startsWith('Basic ')) return null;
  try {
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const separator = decoded.indexOf(':');
    if (separator < 0) return null;
    return { username: decoded.slice(0, separator), password: decoded.slice(separator + 1) };
  } catch { return null; }
}

export function requireAdmin(request) {
  const expectedUser = env('BOOKING_ADMIN_USER') || env('NEWS_ADMIN_USER');
  const expectedPassword = env('BOOKING_ADMIN_PASSWORD') || env('NEWS_ADMIN_PASSWORD');
  if (!expectedUser || !expectedPassword) throw new ApiError('Credenziali amministrative non configurate.', 503, 'ADMIN_NOT_CONFIGURED');
  const credentials = readBasicAuth(request);
  if (!credentials || !safeEqual(credentials.username, expectedUser) || !safeEqual(credentials.password, expectedPassword)) {
    throw new ApiError('Credenziali non valide.', 401, 'UNAUTHORIZED');
  }
  return { username: clean(credentials.username, 100) };
}

function supabaseConfig() {
  const url = env('SUPABASE_URL').replace(/\/$/, '');
  const secretKey = env('SUPABASE_SECRET_KEY');
  if (!url || !secretKey) throw new ApiError('Database volontari non configurato.', 503, 'DATABASE_NOT_CONFIGURED');
  return { url, secretKey };
}

export async function supabaseRequest(path, { method = 'GET', body, query, prefer } = {}) {
  const { url, secretKey } = supabaseConfig();
  const target = new URL(`${url}/rest/v1/${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') target.searchParams.set(key, String(value));
    }
  }
  const headers = { apikey: secretKey, accept: 'application/json' };
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
    try { payload = JSON.parse(text); }
    catch { payload = text; }
  }
  if (!response.ok) throw new SupabaseError(payload?.message || payload?.details || `Errore database (${response.status})`, response.status, payload);
  return payload;
}

export function rpc(name, args = {}) {
  return supabaseRequest(`rpc/${name}`, { method: 'POST', body: args });
}

export async function parseJsonBody(request, maxBytes = 120000) {
  const text = await request.text();
  if (Buffer.byteLength(text, 'utf8') > maxBytes) throw new ApiError('Richiesta troppo grande.', 413, 'PAYLOAD_TOO_LARGE');
  if (!text) return {};
  try { return JSON.parse(text); }
  catch { throw new ApiError('Dati non validi.', 400, 'INVALID_JSON'); }
}

export function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clean(value, 60));
}

export function formatApiError(error) {
  if (error instanceof ApiError) return json({ error: error.message, code: error.code, details: error.details }, error.status);
  if (error instanceof SupabaseError) {
    const message = String(error.payload?.message || error.message || 'Errore database.');
    const known = message.match(/VOLUNTEER_[A-Z0-9_]+/i)?.[0] || '';
    if (known === 'VOLUNTEER_RESPONSES_INCOMPLETE') return json({ error: 'Devi rispondere a tutte le attività assegnate.', code: known }, 409);
    if (known === 'VOLUNTEER_PERSON_NOT_FOUND') return json({ error: 'Persona non trovata o non più disponibile.', code: known }, 404);
    if (known === 'VOLUNTEER_INVALID_AVAILABILITY') return json({ error: 'Una disponibilità aggiuntiva non è valida.', code: known }, 400);
    if (known === 'VOLUNTEER_ASSIGNMENT_NOT_FOUND') return json({ error: 'Assegnazione non trovata.', code: known }, 404);
    if (known === 'VOLUNTEER_RATE_LIMIT') return json({ error: 'Invio troppo ravvicinato. Riprova tra pochi secondi.', code: known }, 429);
    if (known === 'VOLUNTEER_INVALID_ACTOR') return json({ error: 'Nome di chi compila non valido.', code: known }, 400);
    return json({ error: 'Il database non ha completato l’operazione.', code: known || 'DATABASE_ERROR' }, 500);
  }
  console.error(error);
  return json({ error: 'Errore imprevisto.', code: 'INTERNAL_ERROR' }, 500);
}
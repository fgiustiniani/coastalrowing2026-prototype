import { getStore } from '@netlify/blobs';
import { FIC_SOCIETIES_2026 } from './_data/fic-societies-2026.mjs';
import { syncRentalMailFromGmail } from './_lib/rental-mail-gmail.mjs';

const ALLOWED_HOST = 'feature-admin-societa-iscritte--campionatiitalianicoastal2026.netlify.app';
const STORE_NAME = 'coastal-fic-admin-feature-admin-societa-iscritte';
const STORE_KEY = 'rental-mail-sync';

export default async (request) => {
  const url = new URL(request.url);
  if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 });
  if (url.hostname.toLowerCase() !== ALLOWED_HOST) return new Response('Not found', { status: 404 });

  const store = getStore(STORE_NAME, { consistency: 'strong' });
  try {
    const before = await store.get(STORE_KEY, { type: 'json' });
    const result = await syncRentalMailFromGmail(FIC_SOCIETIES_2026);
    const state = {
      syncedAt: result.syncedAt,
      messagesFound: result.messagesFound,
      messagesConsidered: result.messagesConsidered,
      matchedCodes: Array.isArray(result.matchedCodes) ? result.matchedCodes : [],
      unmatched: Array.isArray(result.unmatched) ? result.unmatched : []
    };
    await store.setJSON(STORE_KEY, state);
    const after = await store.get(STORE_KEY, { type: 'json' });

    return Response.json({
      ok: true,
      beforeSyncedAt: before?.syncedAt || null,
      afterSyncedAt: after?.syncedAt || null,
      messagesFound: Number(after?.messagesFound || 0),
      messagesConsidered: Number(after?.messagesConsidered || 0),
      matchedCodes: Array.isArray(after?.matchedCodes) ? after.matchedCodes.length : 0,
      unmatched: Array.isArray(after?.unmatched) ? after.unmatched.length : 0,
      persisted: Boolean(after?.syncedAt && after?.syncedAt === state.syncedAt)
    }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    return Response.json({
      ok: false,
      code: error?.code || 'SYNC_ERROR',
      error: error?.message || 'Sync test failed'
    }, {
      status: 502,
      headers: { 'cache-control': 'no-store' }
    });
  }
};

export const config = {
  path: '/api/_tmp-mail-sync-diagnose-7f2c9d41'
};

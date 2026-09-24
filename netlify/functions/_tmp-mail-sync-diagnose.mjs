import { FIC_SOCIETIES_2026 } from './_data/fic-societies-2026.mjs';
import { syncRentalMailFromGmail } from './_lib/rental-mail-gmail.mjs';

const ALLOWED_HOST = 'feature-admin-societa-iscritte--campionatiitalianicoastal2026.netlify.app';
const CHECK_TOKEN = 'imap-check-7f2c9d41';

export default async (request) => {
  const url = new URL(request.url);
  if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 });
  if (url.hostname.toLowerCase() !== ALLOWED_HOST || url.searchParams.get('check') !== CHECK_TOKEN) {
    return new Response('Not found', { status: 404 });
  }

  try {
    const result = await syncRentalMailFromGmail(FIC_SOCIETIES_2026);
    return Response.json({
      ok: true,
      messagesFound: Number(result.messagesFound || 0),
      messagesConsidered: Number(result.messagesConsidered || 0),
      matchedCodes: Array.isArray(result.matchedCodes) ? result.matchedCodes.length : 0,
      unmatched: Array.isArray(result.unmatched) ? result.unmatched.length : 0
    }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    return Response.json({
      ok: false,
      code: error?.code || 'IMAP_ERROR',
      error: error?.message || 'IMAP test failed'
    }, {
      status: 502,
      headers: { 'cache-control': 'no-store' }
    });
  }
};

export const config = {
  path: '/api/_tmp-mail-sync-diagnose'
};

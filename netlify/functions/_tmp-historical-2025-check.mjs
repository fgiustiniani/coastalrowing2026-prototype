const SOURCE_URL = 'https://canottaggioservice.canottaggio.net/dati/pis25CICR.html';
const ALLOWED_HOST = 'feature-admin-societa-iscritte--campionatiitalianicoastal2026.netlify.app';

function decode(value) {
  return String(value ?? '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function text(value) {
  return decode(
    String(value ?? '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>|<\/div>|<\/li>/gi, '\n')
      .replace(/<[^>]*>/g, ' ')
  )
    .replace(/\r/g, '')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function rowsFromHtml(html) {
  const rows = [];
  const rowPattern = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = rowPattern.exec(html))) {
    const cells = [];
    const cellPattern = /<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi;
    let cellMatch;
    while ((cellMatch = cellPattern.exec(rowMatch[1]))) {
      cells.push(text(cellMatch[2]));
    }
    if (cells.length) rows.push(cells);
  }
  return rows;
}

export default async (request) => {
  const requestUrl = new URL(request.url);
  if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 });
  if (requestUrl.hostname.toLowerCase() !== ALLOWED_HOST) return new Response('Not found', { status: 404 });

  const response = await fetch(SOURCE_URL, {
    method: 'GET',
    redirect: 'follow',
    cache: 'no-store',
    headers: {
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'accept-language': 'it-IT,it;q=0.9,en;q=0.7',
      'user-agent': 'Mozilla/5.0 (compatible; CoastalRowingPesaro2026/1.0)'
    }
  });

  const html = await response.text();
  const rows = rowsFromHtml(html);
  const headerIndex = rows.findIndex((cells) => {
    const joined = cells.join(' ').toUpperCase();
    return joined.includes('SOCIET') && joined.includes('ATLETI') && joined.includes('FISICI');
  });

  return new Response(JSON.stringify({
    ok: response.ok,
    status: response.status,
    finalUrl: response.url,
    headerIndex,
    header: headerIndex >= 0 ? rows[headerIndex] : null,
    rows: headerIndex >= 0 ? rows.slice(headerIndex + 1).filter((cells) => cells.some(Boolean)).slice(0, 100) : rows.slice(0, 25)
  }), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
};

export const config = {
  path: '/api/_tmp-historical-2025-check'
};

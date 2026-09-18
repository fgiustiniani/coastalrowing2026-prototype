import { getStore } from '@netlify/blobs';
import { randomUUID } from 'node:crypto';
import { isAdminAuthorized, isSameOrigin, json } from './_lib/boat-bookings-common.mjs';
import { FIC_SOCIETIES_2026 } from './_data/fic-societies-2026.mjs';

const EVENT_PATH = 'elenco_societa_iscritte.php?ope=26CICR/270S35XZ46IJP8WH';
const EVENT_URLS = [
  `https://www.canottaggio.net/${EVENT_PATH}`,
  `https://canottaggio.net/${EVENT_PATH}`
];

const REGISTERED_2025_CODES = new Set(["050155","040086","030127","040165","098890","020119","030016","010109","120158","050004","100016","150003","070169","070110","080005","010168","050142","030135","030026","050005","080117","130164","110213","110014","080131","110043","030065","050174","050047","030045","050143","030005","050073","110052","110098","030024","040007","050002","100121","050001","080009","030153","010122","090024","070170","030134","040026","030014","030195","040051","100010","030104","100118","010096","040160","070101","070077","010014","040258","030011","030017","100044"]);

// Fonte FIC 2025, Meeting Capitani Trieste: 62 società e 445 atleti nel Campionato.
const ATHLETES_2025 = 445;

// Snapshot delle richieste di noleggio ricevute via e-mail e verificate il 18/09/2026.
// La presenza indica esclusivamente che una mail di noleggio è stata ricevuta, non che la richiesta sia ancora attiva.
const RENTAL_MAIL_RECEIVED_CODES = new Set([
  "110004","120060","030044","010096","030293","080131","020119","150003","030045","040083",
  "030134","130017","040086","111112","060054","030011","070110","070077","050004","050174",
  "030127","132001","070007","110043","120016","030104","040081","010109","110213","120002",
  "120158","100044","130164","070101","050002","100037","050142","050005","030023","100118",
  "120021","070128"
]);

const SNAPSHOT_STORE_KEY = 'uploads';
const MAX_SNAPSHOT_UPLOADS = 30;
const MAX_HTML_UPLOAD_CHARS = 2500000;

const MANUAL_MATCHES_BY_FISCAL_CODE = new Map([
  ['80008900393', '060054'], // RAVENNA SC -> Canottieri Ravenna 1873
  ['00758160329', '050005'], // GINNASTICATS -> Società Ginnastica Triestina - Nautica
  ['90024400088', '070077']  // SANTOSTEFANO -> Canottieri Santo Stefano al Mare
]);

const STOPWORDS = new Set([
  'ASD','SSD','SSDRL','SRL','ARL','ASS','ASSOCIAZIONE','SPORTIVA','SPORTIVO','DILETTANTISTICA',
  'DILETTANTISTICO','SOCIETA','SOCIETÀ','CIRCOLO','CIRC','CANOTTIERI','CANOTTAGGIO','CAN',
  'CLUB','NAUTICO','NAUTICA','POLISPORTIVA','POL','GRUPPO','SPORTIVO','SEZIONE','SEZ',
  'REALE','LEGA','NAVALE','ITALIANA','LNI','ROWING','TEAM','DELLA','DELLE','DEI','DEGLI',
  'DI','DEL','DA','LA','LE','IL','LO','GLI','E','SPA','SAS'
]);

function htmlDecode(value) {
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

function cellText(html) {
  return htmlDecode(
    String(html ?? '')
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

function parseMoney(value) {
  const text = String(value ?? '').trim();
  if (!text) return 0;
  const normalized = text
    .replace(/[€\s]/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '');
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function parseFicHtml(html) {
  const tableRows = [];
  const rowPattern = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;

  while ((rowMatch = rowPattern.exec(html))) {
    const cells = [];
    const cellPattern = /<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi;
    let cellMatch;
    while ((cellMatch = cellPattern.exec(rowMatch[1]))) {
      cells.push(cellText(cellMatch[2]));
    }
    if (cells.length) tableRows.push(cells);
  }

  const headerIndex = tableRows.findIndex((cells) => {
    const joined = cells.join(' ').toUpperCase();
    return joined.includes('TEAM') && joined.includes('IMPORTO') && joined.includes('DOVUTO');
  });

  const startIndex = headerIndex >= 0 ? headerIndex + 1 : 0;
  const registrations = [];

  for (const cells of tableRows.slice(startIndex)) {
    if (cells.length < 9) continue;
    const joined = cells.join(' ').trim();
    if (!joined) continue;

    // Il portale storico FIC espone 12 colonne. Se il markup aggiunge celle accessorie,
    // usiamo le ultime 4 come valori economici e le prime 8 come dati amministrativi.
    const financial = cells.slice(-4);
    const prefix = cells.slice(0, Math.max(0, cells.length - 4));
    if (prefix.length < 5) continue;

    const teamCell = prefix[0] || '';
    const teamLines = teamCell.split('\n').map((part) => part.trim()).filter(Boolean);
    const team = teamLines[0] || teamCell.trim();
    const details = teamLines.slice(1).join(' · ');

    // Totali finali: prima cella vuota o non riconducibile a una società.
    if (!team || /^totale/i.test(team)) continue;

    const record = {
      team,
      details,
      address: prefix[2] || '',
      fiscalCode: prefix[3] || '',
      manager: prefix[4] || '',
      coach: prefix[5] || '',
      paymentType: prefix[6] || '',
      accountingDate: '',
      paymentRegistrationDate: prefix[7] || '',
      verificationDate: '',
      amountDue: parseMoney(financial[0]),
      boatRental: parseMoney(financial[1]),
      oarRental: parseMoney(financial[2]),
      amountPaid: parseMoney(financial[3]),
      raw: cells.join(' · ')
    };

    // Evita che la riga dei totali venga scambiata per una società.
    if (!record.fiscalCode && !record.manager && !record.coach && !/[A-ZÀ-ÖØ-Ý]/i.test(record.team)) continue;
    registrations.push(record);
  }

  if (!registrations.length) {
    throw new Error('Nessuna società riconosciuta nella pagina FIC.');
  }
  return registrations;
}

function parseInteger(value) {
  const match = String(value ?? '').replace(/\s+/g, '').match(/-?\d+/);
  return match ? Number(match[0]) : null;
}

function parseRegistrationSnapshotHtml(html) {
  const tableRows = [];
  const rowPattern = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;

  while ((rowMatch = rowPattern.exec(html))) {
    const cells = [];
    const cellPattern = /<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi;
    let cellMatch;
    while ((cellMatch = cellPattern.exec(rowMatch[1]))) {
      cells.push(cellText(cellMatch[2]));
    }
    if (cells.length) tableRows.push(cells);
  }

  const byCode = new Map();
  let athletesTotal = null;

  for (const cells of tableRows) {
    const joined = cells.join(' ').toUpperCase();
    if (joined.includes('ATLETI FISICI PRESENTI')) {
      const numericValues = cells
        .flatMap((cell) => String(cell).match(/\b\d+\b/g) || [])
        .map(Number)
        .filter(Number.isFinite);
      if (numericValues.length) athletesTotal = numericValues[numericValues.length - 1];
    }

    if (cells.length < 7 || !/^\d+$/.test(String(cells[0] || '').trim())) continue;

    const societyCell = String(cells[1] || '').trim();
    const codeMatch = societyCell.match(/\((\d{6})\)\s*$/);
    if (!codeMatch) continue;

    const code = codeMatch[1];
    byCode.set(code, {
      code,
      team: societyCell.replace(/\s*\(\d{6}\)\s*$/, '').trim(),
      manager: cells[2] || '',
      coach: cells[3] || '',
      athleteEntries: parseInteger(cells[4]),
      crews: parseInteger(cells[5]),
      physicalAthletes: parseInteger(cells[6])
    });
  }

  const societies = Array.from(byCode.values());
  if (!societies.length) {
    throw new Error('Il file HTML non contiene un elenco società riconoscibile.');
  }

  return { societies, athletesTotal };
}

function sanitizeStoreSuffix(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function resolveSnapshotStoreName(requestUrl) {
  const hostname = requestUrl.hostname.toLowerCase();
  if (hostname.endsWith('.netlify.app') && hostname.includes('--')) {
    const deployPrefix = sanitizeStoreSuffix(hostname.split('--')[0]);
    if (deployPrefix) return `coastal-fic-admin-${deployPrefix}`;
  }
  return 'coastal-fic-admin';
}

async function readSnapshotUploads(store) {
  const stored = await store.get(SNAPSHOT_STORE_KEY, { type: 'json' });
  return Array.isArray(stored) ? stored : [];
}

function snapshotMeta(item) {
  if (!item) return null;
  return {
    id: item.id,
    updateDate: item.updateDate,
    uploadedAt: item.uploadedAt,
    fileName: item.fileName,
    societyCount: Number(item.societyCount || item.societies?.length || 0),
    athletesTotal: Number.isFinite(Number(item.athletesTotal)) ? Number(item.athletesTotal) : null
  };
}

function latestSnapshot(uploads) {
  return [...uploads].sort((a, b) =>
    String(b.uploadedAt || '').localeCompare(String(a.uploadedAt || ''))
  )[0] || null;
}

async function saveSnapshotUpload(request, store) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return { error: 'Dati di upload non validi.', status: 400 };
  }

  if (String(payload.action || '') !== 'upload-html') {
    return { error: 'Operazione non valida.', status: 400 };
  }

  const updateDate = String(payload.updateDate || '').trim();
  const fileName = String(payload.fileName || 'elenco-iscritti.html')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, 180);
  const html = String(payload.html || '');

  if (!/^\d{4}-\d{2}-\d{2}$/.test(updateDate)) {
    return { error: 'Indica una data di aggiornamento valida.', status: 400 };
  }
  if (!html || html.length > MAX_HTML_UPLOAD_CHARS) {
    return { error: 'Il file HTML è vuoto o troppo grande.', status: 400 };
  }

  let parsed;
  try {
    parsed = parseRegistrationSnapshotHtml(html);
  } catch (error) {
    return { error: error?.message || 'File HTML non riconosciuto.', status: 400 };
  }

  const masterCodes = new Set(FIC_SOCIETIES_2026.map((society) => String(society.code || '')));
  const unknownCodes = parsed.societies
    .map((society) => society.code)
    .filter((code) => !masterCodes.has(code));

  const item = {
    id: randomUUID(),
    updateDate,
    uploadedAt: new Date().toISOString(),
    fileName: fileName || 'elenco-iscritti.html',
    societyCount: parsed.societies.length,
    athletesTotal: parsed.athletesTotal,
    unknownCodes,
    societies: parsed.societies
  };

  const uploads = await readSnapshotUploads(store);
  const updated = [item, ...uploads].slice(0, MAX_SNAPSHOT_UPLOADS);
  await store.setJSON(SNAPSHOT_STORE_KEY, updated);

  return {
    ok: true,
    upload: snapshotMeta(item),
    unknownCodes,
    uploads: updated.map(snapshotMeta)
  };
}

function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/&/g, ' E ')
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(value) {
  return normalize(value)
    .split(' ')
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));
}

function tokenScore(master, registration, tokenFrequency) {
  const masterName = normalize(master.name);
  const registrationText = normalize(`${registration.team} ${registration.details} ${registration.raw}`);

  if (master.code && registrationText.includes(master.code)) return 1.25;
  if (masterName.length >= 5 && registrationText.includes(masterName)) return 1.15;

  const mt = tokens(master.name);
  const rt = new Set(tokens(`${registration.team} ${registration.details}`));
  if (!mt.length) return 0;

  const hits = mt.filter((token) => rt.has(token));
  const coverage = hits.length / mt.length;
  const union = new Set([...mt, ...rt]).size || 1;
  const jaccard = hits.length / union;

  let score = coverage * 0.68 + jaccard * 0.22;

  const city = normalize(master.city);
  if (city && registrationText.includes(city)) score += 0.16;

  const province = normalize(master.province);
  if (province && new RegExp(`(?:^| )${province}(?: |$)`).test(registrationText)) score += 0.03;

  if (mt.length === 1 && hits.length === 1) {
    const frequency = tokenFrequency.get(mt[0]) || 99;
    if (frequency === 1) score += 0.18;
    else score -= 0.10;
  }

  return score;
}

function normalizedFiscalCode(value) {
  return String(value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function matchRegistrations(registrations) {
  const tokenFrequency = new Map();
  for (const society of FIC_SOCIETIES_2026) {
    for (const token of new Set(tokens(society.name))) {
      tokenFrequency.set(token, (tokenFrequency.get(token) || 0) + 1);
    }
  }

  const societyIndexByCode = new Map(
    FIC_SOCIETIES_2026.map((society, index) => [String(society.code || ''), index])
  );
  const usedSocieties = new Set();
  const registrationToSociety = new Map();

  // Gli abbinamenti confermati manualmente hanno priorità sul matcher fuzzy.
  registrations.forEach((registration, registrationIndex) => {
    const fiscalCode = normalizedFiscalCode(registration.fiscalCode);
    const societyCode = MANUAL_MATCHES_BY_FISCAL_CODE.get(fiscalCode);
    const societyIndex = societyIndexByCode.get(societyCode);
    if (societyCode && Number.isInteger(societyIndex) && !usedSocieties.has(societyIndex)) {
      registrationToSociety.set(registrationIndex, { societyIndex, score: 1 });
      usedSocieties.add(societyIndex);
    }
  });

  const candidates = [];
  registrations.forEach((registration, registrationIndex) => {
    if (registrationToSociety.has(registrationIndex)) return;

    const ranked = FIC_SOCIETIES_2026
      .map((society, societyIndex) => ({
        societyIndex,
        score: tokenScore(society, registration, tokenFrequency)
      }))
      .sort((a, b) => b.score - a.score);

    candidates.push({
      registrationIndex,
      ranked: ranked.slice(0, 4)
    });
  });

  // Assegna prima le corrispondenze più nette, evitando che una società venga associata due volte.
  candidates.sort((a, b) => (b.ranked[0]?.score || 0) - (a.ranked[0]?.score || 0));
  const diagnostics = [];

  for (const candidate of candidates) {
    const available = candidate.ranked.filter((item) => !usedSocieties.has(item.societyIndex));
    const best = available[0];
    const second = available[1];
    const bestScore = best?.score || 0;
    const gap = bestScore - (second?.score || 0);

    const decisive = bestScore >= 1.0 || (bestScore >= 0.76 && gap >= 0.055);
    if (best && decisive) {
      registrationToSociety.set(candidate.registrationIndex, {
        societyIndex: best.societyIndex,
        score: bestScore
      });
      usedSocieties.add(best.societyIndex);
    } else {
      diagnostics.push({
        registrationIndex: candidate.registrationIndex,
        suggestions: candidate.ranked.slice(0, 3)
      });
    }
  }

  const bySociety = new Map();
  for (const [registrationIndex, match] of registrationToSociety.entries()) {
    bySociety.set(match.societyIndex, {
      registration: registrations[registrationIndex],
      confidence: Math.min(1, match.score)
    });
  }

  const unmatchedRegistrations = diagnostics.map((item) => ({
    ...registrations[item.registrationIndex],
    suggestions: item.suggestions.map((suggestion) => ({
      code: FIC_SOCIETIES_2026[suggestion.societyIndex]?.code || '',
      name: FIC_SOCIETIES_2026[suggestion.societyIndex]?.name || '',
      score: Number(suggestion.score.toFixed(3))
    }))
  }));

  return { bySociety, unmatchedRegistrations };
}

async function fetchFicPage() {
  let lastError = null;

  for (const url of EVENT_URLS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'accept-language': 'it-IT,it;q=0.9,en;q=0.7',
          'user-agent': 'Mozilla/5.0 (compatible; CoastalRowingPesaro2026/1.0; +https://coastalrowing26.canottieripesaro.it/)'
        }
      });

      if (!response.ok) {
        lastError = new Error(`FIC HTTP ${response.status}`);
        continue;
      }

      const html = await response.text();
      return { url: response.url || url, html };
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError || new Error('Pagina FIC non raggiungibile.');
}

function summaryFrom(rows, registrations, unmatchedRegistrations, registrationAvailable, financialAvailable, snapshot) {
  const money = registrations.reduce((sum, item) => ({
    amountDue: sum.amountDue + Number(item.amountDue || 0),
    boatRental: sum.boatRental + Number(item.boatRental || 0),
    oarRental: sum.oarRental + Number(item.oarRental || 0),
    amountPaid: sum.amountPaid + Number(item.amountPaid || 0)
  }), { amountDue: 0, boatRental: 0, oarRental: 0, amountPaid: 0 });

  const registered = registrationAvailable ? rows.filter((row) => row.status === 'registered').length : 0;
  const rentalMailReceived = rows.filter((row) => row.rentalMailReceived).length;
  const rentalMailRegistered = registrationAvailable
    ? rows.filter((row) => row.status === 'registered' && row.rentalMailReceived).length
    : null;

  return {
    totalSocieties: rows.length,
    registered2025: REGISTERED_2025_CODES.size,
    athletes2025: ATHLETES_2025,
    athletes2026: snapshot && Number.isFinite(Number(snapshot.athletesTotal)) ? Number(snapshot.athletesTotal) : null,
    registered,
    notRegistered: registrationAvailable ? rows.length - registered : null,
    sourceRegistrations: registrationAvailable
      ? (snapshot ? Number(snapshot.societyCount || snapshot.societies?.length || 0) : registrations.length)
      : null,
    financialRegistrations: financialAvailable ? registrations.length : null,
    unmatchedRegistrations: financialAvailable ? unmatchedRegistrations.length : null,
    rentalMailReceived,
    rentalMailRegistered,
    ...money
  };
}

export default async (request) => {
  if (!isSameOrigin(request)) return json({ error: 'Origine non consentita.' }, 403);

  const auth = isAdminAuthorized(request);
  if (!auth.configured) return json({ error: 'L’area amministrativa non è configurata.' }, 503);
  if (!auth.valid) return json({ error: 'Credenziali non valide.' }, 401);

  const requestUrl = new URL(request.url);
  const snapshotStore = getStore(resolveSnapshotStoreName(requestUrl));

  if (request.method === 'POST') {
    try {
      const saved = await saveSnapshotUpload(request, snapshotStore);
      if (saved.error) return json({ error: saved.error }, saved.status || 400);
      return json(saved);
    } catch (error) {
      console.error('Errore salvataggio snapshot iscritti:', error);
      return json({ error: 'Non è stato possibile salvare il file HTML.' }, 500);
    }
  }

  if (request.method !== 'GET') return json({ error: 'Metodo non consentito.' }, 405);

  let uploads = [];
  try {
    uploads = await readSnapshotUploads(snapshotStore);
  } catch (error) {
    console.error('Errore lettura snapshot iscritti:', error);
  }
  const snapshot = latestSnapshot(uploads);
  const snapshotByCode = new Map(
    (snapshot?.societies || []).map((society) => [String(society.code || ''), society])
  );

  let registrations = [];
  let financialAvailable = false;
  let sourceUrl = EVENT_URLS[0];
  let sourceError = '';
  let unmatchedRegistrations = [];
  let bySociety = new Map();

  try {
    const source = await fetchFicPage();
    sourceUrl = source.url;
    registrations = parseFicHtml(source.html);
    const matched = matchRegistrations(registrations);
    bySociety = matched.bySociety;
    unmatchedRegistrations = matched.unmatchedRegistrations;
    financialAvailable = true;
  } catch (error) {
    console.error('Errore lettura elenco società FIC:', error);
    sourceError = error?.name === 'AbortError'
      ? 'Il portale FIC non ha risposto entro il tempo previsto.'
      : 'Il portale FIC non è raggiungibile o il formato della pagina è cambiato.';
  }

  const registrationAvailable = Boolean(snapshot) || financialAvailable;
  const registrationSource = snapshot ? 'upload' : (financialAvailable ? 'live' : 'none');

  const rows = FIC_SOCIETIES_2026.map((society, index) => {
    const match = bySociety.get(index);
    const code = String(society.code || '');
    const snapshotRegistration = snapshotByCode.get(code) || null;
    let status = 'unknown';

    if (snapshot) status = snapshotRegistration ? 'registered' : 'not_registered';
    else if (financialAvailable) status = match ? 'registered' : 'not_registered';

    return {
      ...society,
      registered2025: REGISTERED_2025_CODES.has(code),
      rentalMailReceived: RENTAL_MAIL_RECEIVED_CODES.has(code),
      status,
      matchConfidence: match ? Number(match.confidence.toFixed(3)) : null,
      registration: match?.registration || null,
      registrationSnapshot: snapshotRegistration
    };
  });

  return json({
    ok: true,
    fetchedAt: new Date().toISOString(),
    sourceUrl,
    ficAvailable: registrationAvailable,
    financialAvailable,
    registrationSource,
    sourceError: sourceError || undefined,
    latestUpload: snapshotMeta(snapshot),
    uploadHistory: uploads.map(snapshotMeta),
    rentalMailUpdatedAt: '2026-09-18',
    summary: summaryFrom(
      rows,
      registrations,
      unmatchedRegistrations,
      registrationAvailable,
      financialAvailable,
      snapshot
    ),
    rows,
    unmatchedRegistrations: financialAvailable ? unmatchedRegistrations : []
  });
};

export const config = {
  path: '/api/fic-registrations-admin'
};

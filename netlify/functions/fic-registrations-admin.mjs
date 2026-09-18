import { isAdminAuthorized, isSameOrigin, json } from './_lib/boat-bookings-common.mjs';
import { FIC_SOCIETIES_2026 } from './_data/fic-societies-2026.mjs';

const EVENT_PATH = 'elenco_societa_iscritte.php?ope=26CICR/270S35XZ46IJP8WH';
const EVENT_URLS = [
  `https://www.canottaggio.net/${EVENT_PATH}`,
  `https://canottaggio.net/${EVENT_PATH}`
];

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
      fiscalCode: prefix[1] || '',
      manager: prefix[2] || '',
      coach: prefix[3] || '',
      paymentType: prefix[4] || '',
      accountingDate: prefix[5] || '',
      paymentRegistrationDate: prefix[6] || '',
      verificationDate: prefix[7] || '',
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

function matchRegistrations(registrations) {
  const tokenFrequency = new Map();
  for (const society of FIC_SOCIETIES_2026) {
    for (const token of new Set(tokens(society.name))) {
      tokenFrequency.set(token, (tokenFrequency.get(token) || 0) + 1);
    }
  }

  const candidates = [];
  registrations.forEach((registration, registrationIndex) => {
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
  const usedSocieties = new Set();
  const registrationToSociety = new Map();
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

function summaryFrom(rows, registrations, unmatchedRegistrations, available) {
  const money = registrations.reduce((sum, item) => ({
    amountDue: sum.amountDue + Number(item.amountDue || 0),
    boatRental: sum.boatRental + Number(item.boatRental || 0),
    oarRental: sum.oarRental + Number(item.oarRental || 0),
    amountPaid: sum.amountPaid + Number(item.amountPaid || 0)
  }), { amountDue: 0, boatRental: 0, oarRental: 0, amountPaid: 0 });

  const registered = available ? rows.filter((row) => row.status === 'registered').length : 0;
  return {
    totalSocieties: rows.length,
    registered,
    notRegistered: available ? rows.length - registered : null,
    sourceRegistrations: available ? registrations.length : null,
    unmatchedRegistrations: available ? unmatchedRegistrations.length : null,
    ...money
  };
}

export default async (request) => {
  if (request.method !== 'GET') return json({ error: 'Metodo non consentito.' }, 405);
  if (!isSameOrigin(request)) return json({ error: 'Origine non consentita.' }, 403);

  const auth = isAdminAuthorized(request);
  if (!auth.configured) return json({ error: 'L’area amministrativa non è configurata.' }, 503);
  if (!auth.valid) return json({ error: 'Credenziali non valide.' }, 401);

  let registrations = [];
  let ficAvailable = false;
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
    ficAvailable = true;
  } catch (error) {
    console.error('Errore lettura elenco società FIC:', error);
    sourceError = error?.name === 'AbortError'
      ? 'Il portale FIC non ha risposto entro il tempo previsto.'
      : 'Il portale FIC non è raggiungibile o il formato della pagina è cambiato.';
  }

  const rows = FIC_SOCIETIES_2026.map((society, index) => {
    const match = bySociety.get(index);
    return {
      ...society,
      status: ficAvailable ? (match ? 'registered' : 'not_registered') : 'unknown',
      matchConfidence: match ? Number(match.confidence.toFixed(3)) : null,
      registration: match?.registration || null
    };
  });

  return json({
    ok: true,
    fetchedAt: new Date().toISOString(),
    sourceUrl,
    ficAvailable,
    sourceError: sourceError || undefined,
    summary: summaryFrom(rows, registrations, unmatchedRegistrations, ficAvailable),
    rows,
    unmatchedRegistrations
  });
};

export const config = {
  path: '/api/fic-registrations-admin'
};

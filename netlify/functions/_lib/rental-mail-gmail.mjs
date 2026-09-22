import { ImapFlow } from 'imapflow';

const GMAIL_HOST = 'imap.gmail.com';
const GMAIL_PORT = 993;
const MAX_MESSAGES = 80;
const SOURCE_PREVIEW_BYTES = 80000;
const MAX_UNMATCHED_PREVIEWS = 24;

// La base manuale è verificata fino al 21/09/2026: il sync deve cercare solo
// messaggi nuovi o a ridosso di quella data, evitando di rileggere settimane di posta.
const RENTAL_SEARCH_QUERY =
  'in:anywhere after:2026/09/20 {to:segreteria-gare@canottieripesaro.it cc:segreteria-gare@canottieripesaro.it} {noleggio imbarcazioni "richiesta imbarcazioni" "disponibilita barche" "disponibilità barche"} -subject:"Nuova prenotazione prova barca"';

const GENERIC_DOMAINS = new Set([
  'gmail.com','googlemail.com','hotmail.com','outlook.com','live.com','icloud.com',
  'yahoo.com','yahoo.it','libero.it','virgilio.it','alice.it','tin.it','fastwebnet.it'
]);

const STOPWORDS = new Set([
  'ASD','SSD','SSDRL','SRL','ARL','ASSOCIAZIONE','SPORTIVA','SPORTIVO',
  'DILETTANTISTICA','DILETTANTISTICO','SOCIETA','SOCIETÀ','CIRCOLO','CIRC',
  'CANOTTIERI','CANOTTAGGIO','CAN','CLUB','NAUTICO','NAUTICA','POLISPORTIVA',
  'POL','GRUPPO','SPORTIVO','SEZIONE','SEZ','REALE','LEGA','NAVALE','ITALIANA',
  'LNI','ROWING','TEAM','DELLA','DELLE','DEI','DEGLI','DI','DEL','DA','LA','LE',
  'IL','LO','GLI','E','SPA','SAS'
]);

function env(name) {
  return globalThis.Netlify?.env?.get?.(name) || '';
}

function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/&/g, ' E ')
    .replace(/[^A-Z0-9@._+-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function nameTokens(value) {
  return normalize(value)
    .split(' ')
    .filter((token) =>
      token.length >= 3 &&
      !/^\d+$/.test(token) &&
      !STOPWORDS.has(token)
    );
}

function envelopeFrom(envelope) {
  const sender = envelope?.from?.[0] || {};
  const address = String(sender.address || '').toLowerCase();
  const name = String(sender.name || '');
  return {
    address,
    name,
    display: name && address ? `${name} <${address}>` : (address || name)
  };
}

function splitMasterEmails(value) {
  return String(value || '')
    .split(/[;,\s]+/)
    .map((item) => item.trim().toLowerCase())
    .filter((item) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item));
}

function attachmentNames(node, out = []) {
  if (!node) return out;
  const filename =
    node?.dispositionParameters?.filename ||
    node?.parameters?.name ||
    '';
  if (filename) out.push(String(filename));
  for (const child of node?.childNodes || []) attachmentNames(child, out);
  return out;
}

function decodeQuotedPrintablePreview(value) {
  return String(value ?? '')
    .replace(/=\r?\n/g, '')
    .replace(/=([0-9A-F]{2})/gi, (_, hex) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCharCode(code) : _;
    });
}

function rentalCandidate(subject, sourcePreview = '') {
  const s = normalize(subject);
  if (/^FIC\s*-?\s*(?:BONIFICO|VERIFICATO)/.test(s)) return false;
  if (s.includes('MODERATOR S SPAM REPORT')) return false;
  if (
    s.includes('NUOVA PRENOTAZIONE PROVA BARCA') ||
    s.includes('MODIFICA PRENOTAZIONE PROVA BARCA') ||
    s.includes('ELIMINAZIONE PRENOTAZIONE PROVA BARCA')
  ) return false;

  const text = normalize(`${subject} ${sourcePreview}`);
  return (
    text.includes('NOLEGGIO') ||
    text.includes('RICHIESTA IMBARCAZION') ||
    text.includes('DISPONIBILITA BARC') ||
    text.includes('PRENOTAZIONE IMBARCAZION') ||
    text.includes('PRENOTAZIONE BARC') ||
    text.includes('MODULO RICHIESTA')
  );
}

function scoreSociety(society, rawText) {
  const text = normalize(rawText);
  const societyName = normalize(society.name);
  if (societyName.length >= 5 && text.includes(societyName)) return 1;

  const societyTokens = nameTokens(society.name);
  if (!societyTokens.length) return 0;

  const messageTokens = new Set(nameTokens(rawText));
  const hits = societyTokens.filter((token) => messageTokens.has(token));
  if (!hits.length) return 0;

  let score = hits.length / societyTokens.length;
  const city = normalize(society.city);
  if (city && text.includes(city)) score += 0.18;
  if (societyTokens.length === 1 && hits.length === 1) score += 0.12;
  return Math.min(1, score);
}

function matchSociety({ fromAddress, rawText }, societies) {
  const raw = String(rawText || '');

  for (const society of societies) {
    const code = String(society.code || '');
    if (code && new RegExp('(?:^|\\D)' + code + '(?:\\D|$)').test(raw)) {
      return { code, confidence: 1, reason: 'codice FIC' };
    }
  }

  const sender = String(fromAddress || '').toLowerCase();
  if (sender) {
    for (const society of societies) {
      if (splitMasterEmails(society.email).includes(sender)) {
        return { code: String(society.code || ''), confidence: 1, reason: 'e-mail anagrafica' };
      }
    }

    const domain = sender.split('@')[1] || '';
    if (domain && !GENERIC_DOMAINS.has(domain)) {
      const matches = societies.filter((society) =>
        splitMasterEmails(society.email).some((email) => email.endsWith('@' + domain))
      );
      if (matches.length === 1 && matches[0].code) {
        return { code: String(matches[0].code), confidence: 0.98, reason: 'dominio e-mail' };
      }
    }
  }

  const ranked = societies
    .filter((society) => society.code)
    .map((society) => ({ society, score: scoreSociety(society, raw) }))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  const second = ranked[1];
  const gap = (best?.score || 0) - (second?.score || 0);

  if (best && (best.score >= 0.96 || (best.score >= 0.78 && gap >= 0.16))) {
    return {
      code: String(best.society.code || ''),
      confidence: Number(best.score.toFixed(3)),
      reason: 'nome società'
    };
  }

  return {
    code: '',
    confidence: 0,
    reason: '',
    suggestions: ranked.slice(0, 3)
      .filter((item) => item.score >= 0.45)
      .map((item) => ({
        code: String(item.society.code || ''),
        name: String(item.society.name || ''),
        score: Number(item.score.toFixed(2))
      }))
  };
}

function safeImapError(error) {
  const message = String(error?.message || '');
  const responseText = String(error?.responseText || '');
  const combined = `${message} ${responseText}`;

  if (/AUTHENTICATIONFAILED|Invalid credentials|Application-specific password required|LOGIN failed/i.test(combined)) {
    return { code: 'IMAP_AUTH_FAILED', message: 'Gmail ha rifiutato le credenziali IMAP.' };
  }
  if (/timeout|ETIMEDOUT|ETIMEOUT/i.test(combined)) {
    return { code: 'IMAP_TIMEOUT', message: 'Gmail non ha risposto entro il tempo previsto.' };
  }
  if (/ECONNREFUSED|ECONNRESET|ENETUNREACH|EHOSTUNREACH|ENOTFOUND|NoConnection/i.test(combined)) {
    return { code: 'IMAP_CONNECTION_FAILED', message: 'Connessione IMAP a Gmail non disponibile.' };
  }
  return { code: 'IMAP_ERROR', message: 'Non è stato possibile leggere Gmail.' };
}

export async function syncRentalMailFromGmail(societies) {
  const user = String(env('RENTAL_MAIL_IMAP_USER') || env('SMTP_USER') || '').trim();
  const password = String(env('RENTAL_MAIL_IMAP_PASS') || env('SMTP_PASS') || '').replace(/\s+/g, '');

  if (!user || !password) {
    const error = new Error('Credenziali Gmail non configurate sul server.');
    error.code = 'IMAP_NOT_CONFIGURED';
    throw error;
  }

  const client = new ImapFlow({
    host: GMAIL_HOST,
    port: GMAIL_PORT,
    secure: true,
    auth: { user, pass: password },
    connectionTimeout: 10000,
    greetingTimeout: 8000,
    socketTimeout: 20000,
    logger: false
  });

  let connected = false;
  try {
    await client.connect();
    connected = true;

    const mailboxes = await client.list();
    const allMail =
      mailboxes.find((mailbox) => mailbox.specialUse === '\\All')?.path ||
      mailboxes.find((mailbox) => /all mail|tutti i messaggi/i.test(mailbox.path))?.path ||
      'INBOX';

    await client.mailboxOpen(allMail, { readOnly: true });

    const found = await client.search({ gmraw: RENTAL_SEARCH_QUERY }, { uid: true });
    const uids = Array.isArray(found) ? found.slice(-MAX_MESSAGES) : [];

    if (!uids.length) {
      return {
        syncedAt: new Date().toISOString(),
        account: user,
        mailbox: allMail,
        messagesFound: 0,
        messagesConsidered: 0,
        matchedCodes: [],
        unmatched: []
      };
    }

    const messages = await client.fetchAll(
      uids,
      { envelope: true, bodyStructure: true, internalDate: true },
      { uid: true }
    );

    const matchedCodes = new Set();
    const unresolved = [];
    let messagesConsidered = 0;

    for (const message of messages) {
      const subject = String(message.envelope?.subject || '');
      const from = envelopeFrom(message.envelope);
      const filenames = attachmentNames(message.bodyStructure);
      const firstPassText = [from.display, subject, ...filenames].join(' ');

      if (!rentalCandidate(subject, filenames.join(' '))) continue;
      messagesConsidered += 1;

      const match = matchSociety({
        fromAddress: from.address,
        rawText: firstPassText
      }, societies);

      if (match.code) {
        matchedCodes.add(match.code);
      } else {
        unresolved.push({ message, subject, from, filenames, suggestions: match.suggestions || [] });
      }
    }

    const unmatched = [];
    const unresolvedBatch = unresolved.slice(0, MAX_UNMATCHED_PREVIEWS);
    let previewsByUid = new Map();

    // Recupera i preview dei messaggi non riconosciuti con una sola richiesta IMAP.
    // Prima veniva eseguito un fetchOne per ogni mail, con molti round-trip e rischio
    // di superare il limite della Function Netlify.
    if (unresolvedBatch.length) {
      try {
        const previewMessages = await client.fetchAll(
          unresolvedBatch.map((item) => item.message.uid),
          { source: { start: 0, maxLength: SOURCE_PREVIEW_BYTES } },
          { uid: true }
        );
        previewsByUid = new Map(
          previewMessages.map((message) => [
            String(message.uid),
            decodeQuotedPrintablePreview(message?.source?.toString('utf8') || '')
          ])
        );
      } catch {}

      for (const item of unresolvedBatch) {
        const preview = previewsByUid.get(String(item.message.uid)) || '';
        const rawText = [
          item.from.display,
          item.subject,
          item.filenames.join(' '),
          preview
        ].join(' ');

        if (!rentalCandidate(item.subject, rawText)) continue;

        const match = matchSociety({
          fromAddress: item.from.address,
          rawText
        }, societies);

        if (match.code) {
          matchedCodes.add(match.code);
        } else {
          unmatched.push({
            uid: item.message.uid,
            subject: item.subject.slice(0, 180),
            from: item.from.display.slice(0, 180),
            date: item.message.envelope?.date
              ? new Date(item.message.envelope.date).toISOString()
              : (item.message.internalDate ? new Date(item.message.internalDate).toISOString() : ''),
            suggestions: match.suggestions || item.suggestions || []
          });
        }
      }
    }

    return {
      syncedAt: new Date().toISOString(),
      account: user,
      mailbox: allMail,
      messagesFound: messages.length,
      messagesConsidered,
      matchedCodes: Array.from(matchedCodes).sort(),
      unmatched
    };
  } catch (error) {
    const safe = safeImapError(error);
    const wrapped = new Error(safe.message);
    wrapped.code = error?.code === 'IMAP_NOT_CONFIGURED' ? error.code : safe.code;
    throw wrapped;
  } finally {
    if (connected) {
      try { await client.logout(); } catch {
        try { client.close(); } catch {}
      }
    }
  }
}

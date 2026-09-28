import { PDFDocument, StandardFonts, rgb, PDFName, PDFString } from 'pdf-lib';

const LOGO_JPEG_BASE64 = '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';
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 42;
const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);

const COLORS = {
  ink: rgb(0.11, 0.25, 0.29),
  muted: rgb(0.37, 0.46, 0.49),
  line: rgb(0.79, 0.85, 0.86),
  blue: rgb(0.02, 0.39, 0.49),
  blueSoft: rgb(0.92, 0.97, 0.98),
  yellowSoft: rgb(1.0, 0.97, 0.84),
  yellowLine: rgb(0.91, 0.76, 0.28),
  noteSoft: rgb(0.96, 0.98, 0.98),
  white: rgb(1, 1, 1)
};

function safeText(value) {
  return String(value ?? '')
    .replace(/[–—]/g, '-')
    .replace(/•/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function wrapText(font, text, size, maxWidth) {
  const words = safeText(text).split(' ').filter(Boolean);
  if (!words.length) return [''];
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? current + ' ' + word : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function formatRaceDay(value) {
  const text = String(value || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return text || 'Giorno da definire';
  try {
    const formatted = new Intl.DateTimeFormat('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'Europe/Rome'
    }).format(new Date(text + 'T12:00:00Z'));
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  } catch {
    return text;
  }
}

function formatRaceTime(value) {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})/);
  return match ? match[1].padStart(2, '0') + ':' + match[2] : 'orario da definire';
}

function daySortKey(label, assignments, races) {
  const assignment = assignments.find((row) => row.day === label && row.startsAt);
  if (assignment) {
    const stamp = Date.parse(assignment.startsAt);
    if (Number.isFinite(stamp)) return stamp;
  }
  const race = races.find((row) => formatRaceDay(row.raceDate) === label);
  if (race?.raceDate) {
    const stamp = Date.parse(race.raceDate + 'T00:00:00Z');
    if (Number.isFinite(stamp)) return stamp;
  }
  return Number.MAX_SAFE_INTEGER;
}

function addLink(page, doc, x, y, width, height, url) {
  if (!url || !width || !height) return;
  try {
    const annotation = doc.context.register(doc.context.obj({
      Type: PDFName.of('Annot'),
      Subtype: PDFName.of('Link'),
      Rect: [x, y, x + width, y + height],
      Border: [0, 0, 0],
      A: {
        Type: PDFName.of('Action'),
        S: PDFName.of('URI'),
        URI: PDFString.of(String(url))
      }
    }));
    page.node.addAnnot(annotation);
  } catch {}
}

export async function buildVolunteerProgramPdf({
  personState,
  programUrl = '',
  ficUrl = 'https://www.canottaggio.org/'
}) {
  const doc = await PDFDocument.create();
  doc.setTitle('Il programma delle tue attivita');
  doc.setSubject('Campionati Italiani Coastal Rowing 2026 - programma volontario');
  doc.setCreator('Societa Canottieri Pesaro ASD');

  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let logo = null;
  try {
    logo = await doc.embedJpg(Buffer.from(LOGO_JPEG_BASE64, 'base64'));
  } catch {}

  const personName = safeText(personState?.person?.display_name || 'Volontario');
  const assignments = [...(Array.isArray(personState?.assignments) ? personState.assignments : [])]
    .sort((a, b) => Number(a.sortOrder ?? 9999) - Number(b.sortOrder ?? 9999)
      || safeText(a.activity).localeCompare(safeText(b.activity), 'it'));
  const races = [...(Array.isArray(personState?.races) ? personState.races : [])]
    .sort((a, b) => String(a.raceDate || '').localeCompare(String(b.raceDate || ''))
      || String(a.raceTime || '').localeCompare(String(b.raceTime || ''))
      || String(a.crewLabel || '').localeCompare(String(b.crewLabel || ''), 'it'));
  const handoverByAssignment = new Map(
    (Array.isArray(personState?.handovers) ? personState.handovers : [])
      .map((row) => [row.assignmentId, row])
  );

  const dayLabels = [...new Set([
    ...assignments.map((row) => safeText(row.day)).filter(Boolean),
    ...races.map((row) => formatRaceDay(row.raceDate)).filter(Boolean)
  ])].sort((a, b) => daySortKey(a, assignments, races) - daySortKey(b, assignments, races));

  let page;
  let y;

  function addPage(first = false) {
    page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;

    if (first) {
      if (logo) {
        const natural = logo.scale(1);
        const width = 238;
        const height = natural.height * (width / natural.width);
        page.drawImage(logo, {
          x: (PAGE_WIDTH - width) / 2,
          y: y - height,
          width,
          height
        });
        y -= height + 18;
      }

      page.drawText(personName, {
        x: MARGIN,
        y: y - 25,
        size: 25,
        font: bold,
        color: COLORS.ink
      });
      y -= 34;
      page.drawText('Il programma delle tue attivita', {
        x: MARGIN,
        y: y - 13,
        size: 12,
        font: regular,
        color: COLORS.muted
      });
      y -= 28;

      const introLines = [
        'Qui per ogni giorno trovi:',
        '- le attivita di supporto dove nel riquadro "Chi viene dopo di me" trovi le persone che ti daranno il cambio;',
        '- le gare a cui parteciperai con il tuo equipaggio.'
      ];
      const wrapped = introLines.flatMap((line) => wrapText(regular, line, 9.3, CONTENT_WIDTH - 24));
      const introHeight = 18 + (wrapped.length * 13) + 12;
      page.drawRectangle({
        x: MARGIN,
        y: y - introHeight,
        width: CONTENT_WIDTH,
        height: introHeight,
        color: COLORS.noteSoft,
        borderColor: COLORS.line,
        borderWidth: 0.8
      });
      let iy = y - 17;
      for (let i = 0; i < wrapped.length; i += 1) {
        page.drawText(wrapped[i], {
          x: MARGIN + 12,
          y: iy,
          size: 9.3,
          font: i === 0 ? bold : regular,
          color: COLORS.ink
        });
        iy -= 13;
      }
      y -= introHeight + 20;
    } else {
      page.drawText(personName + ' - Il programma delle tue attivita', {
        x: MARGIN,
        y: y - 12,
        size: 10,
        font: bold,
        color: COLORS.muted
      });
      y -= 28;
    }
  }

  function ensureSpace(height) {
    if (y - height < 68) addPage(false);
  }

  function drawDayTitle(label) {
    ensureSpace(40);
    page.drawRectangle({
      x: MARGIN,
      y: y - 29,
      width: CONTENT_WIDTH,
      height: 29,
      color: COLORS.blue
    });
    page.drawText(safeText(label), {
      x: MARGIN + 12,
      y: y - 19,
      size: 12,
      font: bold,
      color: COLORS.white
    });
    y -= 39;
  }

  function drawAssignment(row) {
    const activity = safeText(row.activity || 'Attivita di supporto');
    const activityLines = wrapText(bold, activity, 10.6, CONTENT_WIDTH - 28);
    const handover = handoverByAssignment.get(row.id) || null;
    const successorText = handover?.successors?.length
      ? handover.successors.join(', ')
      : '';
    const successorLines = successorText
      ? wrapText(regular, successorText, 8.8, CONTENT_WIDTH - 46)
      : [];
    const handoverHeight = successorLines.length ? 34 + (successorLines.length * 11) : 0;
    const height = 48 + (activityLines.length * 13) + handoverHeight + 10;

    ensureSpace(height + 8);
    page.drawRectangle({
      x: MARGIN,
      y: y - height,
      width: CONTENT_WIDTH,
      height,
      color: COLORS.blueSoft,
      borderColor: COLORS.line,
      borderWidth: 0.8
    });

    page.drawText('ATTIVITA DI SUPPORTO', {
      x: MARGIN + 12,
      y: y - 15,
      size: 7.3,
      font: bold,
      color: COLORS.blue
    });
    page.drawText(safeText(row.shift || ''), {
      x: MARGIN + 12,
      y: y - 31,
      size: 10.5,
      font: bold,
      color: COLORS.ink
    });

    let ay = y - 47;
    for (const line of activityLines) {
      page.drawText(line, {
        x: MARGIN + 12,
        y: ay,
        size: 10.6,
        font: bold,
        color: COLORS.ink
      });
      ay -= 13;
    }

    if (successorLines.length) {
      const boxTop = ay - 2;
      const boxHeight = 25 + (successorLines.length * 11);
      page.drawRectangle({
        x: MARGIN + 12,
        y: boxTop - boxHeight,
        width: CONTENT_WIDTH - 24,
        height: boxHeight,
        color: COLORS.white,
        borderColor: COLORS.blue,
        borderWidth: 0.8
      });
      page.drawText('CHI VIENE DOPO DI ME - ' + safeText(handover.toShift || ''), {
        x: MARGIN + 22,
        y: boxTop - 14,
        size: 7.8,
        font: bold,
        color: COLORS.blue
      });
      let sy = boxTop - 27;
      for (const line of successorLines) {
        page.drawText(line, {
          x: MARGIN + 22,
          y: sy,
          size: 8.8,
          font: regular,
          color: COLORS.ink
        });
        sy -= 11;
      }
    }

    y -= height + 8;
  }

  function drawRace(row) {
    const title = safeText(row.crewLabel || 'Gara');
    const titleLines = wrapText(bold, title, 10.6, CONTENT_WIDTH - 28);
    const crewText = Array.isArray(row.crewMembers) && row.crewMembers.length
      ? 'Equipaggio: ' + row.crewMembers.join(', ')
      : '';
    const crewLines = crewText ? wrapText(regular, crewText, 8.8, CONTENT_WIDTH - 28) : [];
    const height = 45 + (titleLines.length * 13) + (crewLines.length * 11) + 8;

    ensureSpace(height + 8);
    page.drawRectangle({
      x: MARGIN,
      y: y - height,
      width: CONTENT_WIDTH,
      height,
      color: COLORS.yellowSoft,
      borderColor: COLORS.yellowLine,
      borderWidth: 0.8
    });
    page.drawText('GARA', {
      x: MARGIN + 12,
      y: y - 15,
      size: 7.3,
      font: bold,
      color: rgb(0.55, 0.38, 0.02)
    });
    page.drawText(formatRaceTime(row.raceTime), {
      x: MARGIN + 12,
      y: y - 31,
      size: 10.5,
      font: bold,
      color: COLORS.ink
    });
    let ry = y - 47;
    for (const line of titleLines) {
      page.drawText(line, {
        x: MARGIN + 12,
        y: ry,
        size: 10.6,
        font: bold,
        color: COLORS.ink
      });
      ry -= 13;
    }
    for (const line of crewLines) {
      page.drawText(line, {
        x: MARGIN + 12,
        y: ry - 1,
        size: 8.8,
        font: regular,
        color: COLORS.muted
      });
      ry -= 11;
    }
    y -= height + 8;
  }

  function drawRememberBox() {
    const line1a = 'Questa e una stampa. La situazione aggiornata la trovi sempre qui: ';
    const link1 = 'Le mie attivita';
    const line2a = 'Verifica sempre gli orari delle gare nel ';
    const link2 = 'sito ufficiale della FIC';
    const rememberHeight = 82;
    ensureSpace(rememberHeight + 10);

    page.drawRectangle({
      x: MARGIN,
      y: y - rememberHeight,
      width: CONTENT_WIDTH,
      height: rememberHeight,
      color: COLORS.noteSoft,
      borderColor: COLORS.line,
      borderWidth: 0.8
    });
    page.drawText('RICORDA', {
      x: MARGIN + 12,
      y: y - 17,
      size: 8,
      font: bold,
      color: COLORS.blue
    });

    const x = MARGIN + 12;
    const y1 = y - 36;
    page.drawText(line1a, { x, y: y1, size: 8.8, font: regular, color: COLORS.ink });
    const xLink1 = x + regular.widthOfTextAtSize(line1a, 8.8);
    page.drawText(link1, { x: xLink1, y: y1, size: 8.8, font: bold, color: COLORS.blue });
    const w1 = bold.widthOfTextAtSize(link1, 8.8);
    page.drawLine({ start: { x: xLink1, y: y1 - 1 }, end: { x: xLink1 + w1, y: y1 - 1 }, thickness: 0.5, color: COLORS.blue });
    addLink(page, doc, xLink1, y1 - 2, w1, 12, programUrl);

    const y2 = y - 55;
    page.drawText(line2a, { x, y: y2, size: 8.8, font: regular, color: COLORS.ink });
    const xLink2 = x + regular.widthOfTextAtSize(line2a, 8.8);
    page.drawText(link2, { x: xLink2, y: y2, size: 8.8, font: bold, color: COLORS.blue });
    const w2 = bold.widthOfTextAtSize(link2, 8.8);
    page.drawLine({ start: { x: xLink2, y: y2 - 1 }, end: { x: xLink2 + w2, y: y2 - 1 }, thickness: 0.5, color: COLORS.blue });
    addLink(page, doc, xLink2, y2 - 2, w2, 12, ficUrl);

    y -= rememberHeight + 8;
  }

  addPage(true);

  if (!dayLabels.length) {
    page.drawText('Non risultano attivita o gare da mostrare.', {
      x: MARGIN,
      y: y - 12,
      size: 10,
      font: regular,
      color: COLORS.muted
    });
    y -= 30;
  } else {
    for (const day of dayLabels) {
      drawDayTitle(day);
      const dayAssignments = assignments.filter((row) => safeText(row.day) === day);
      const dayRaces = races.filter((row) => formatRaceDay(row.raceDate) === day);
      for (const assignment of dayAssignments) drawAssignment(assignment);
      for (const race of dayRaces) drawRace(race);
      y -= 5;
    }
  }

  drawRememberBox();

  const pages = doc.getPages();
  pages.forEach((item, index) => {
    item.drawText('Campionati Italiani Coastal Rowing 2026 - Pesaro', {
      x: MARGIN,
      y: 28,
      size: 7.2,
      font: regular,
      color: COLORS.muted
    });
    const pageLabel = `${index + 1}/${pages.length}`;
    item.drawText(pageLabel, {
      x: PAGE_WIDTH - MARGIN - regular.widthOfTextAtSize(pageLabel, 7.2),
      y: 28,
      size: 7.2,
      font: regular,
      color: COLORS.muted
    });
  });

  return doc.save();
}

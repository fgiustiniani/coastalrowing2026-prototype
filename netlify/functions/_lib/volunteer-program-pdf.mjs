import { PDFDocument, StandardFonts, rgb, PDFName, PDFString } from 'pdf-lib';

const LOGO_PNG_BASE64 = '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';
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 20;
const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);

const COLORS = {
  ink: rgb(0.08, 0.24, 0.29),
  muted: rgb(0.35, 0.43, 0.46),
  line: rgb(0.78, 0.83, 0.84),
  teal: rgb(0.00, 0.36, 0.43),
  race: rgb(0.76, 0.36, 0.04),
  raceSoft: rgb(1.00, 0.94, 0.87),
  handoverSoft: rgb(1.00, 0.98, 0.86),
  handoverLine: rgb(0.88, 0.75, 0.31),
  noteSoft: rgb(0.93, 0.97, 0.98),
  white: rgb(1, 1, 1)
};

function safeText(value) {
  return String(value ?? '')
    .replace(/[–—]/g, '-')
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
    if (!current || font.widthOfTextAtSize(candidate, size) <= maxWidth) {
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

function timeMinutes(value) {
  const match = String(value || '').match(/(\d{1,2}):(\d{2})/);
  if (!match) return 9999;
  return (Number(match[1]) * 60) + Number(match[2]);
}

function daySortKey(label, assignments, races) {
  const assignment = assignments.find((row) => safeText(row.day) === label && row.startsAt);
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
  ficUrl = 'https://canottaggioservice.canottaggio.net/menu_nazionali_cal.php?manif=003907&&k1=C&sta_ag=2026'
}) {
  const doc = await PDFDocument.create();
  doc.setTitle('Il programma delle tue attività');
  doc.setSubject('Campionati Italiani Coastal Rowing 2026 - programma volontario');
  doc.setCreator('Società Canottieri Pesaro ASD');

  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let logo = null;
  try {
    logo = await doc.embedPng(Buffer.from(LOGO_PNG_BASE64, 'base64'));
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

  function drawHeader() {
    if (!logo) return;
    const natural = logo.scale(1);
    const width = CONTENT_WIDTH;
    const height = natural.height * (width / natural.width);
    page.drawImage(logo, {
      x: MARGIN,
      y: y - height,
      width,
      height
    });
    y -= height + 14;
  }

  function addPage(first = false) {
    page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - 16;
    drawHeader();

    if (first) {
      page.drawText(personName, {
        x: MARGIN,
        y: y - 23,
        size: 25,
        font: bold,
        color: COLORS.ink
      });
      y -= 31;

      page.drawText('Il programma delle tue attività', {
        x: MARGIN,
        y: y - 12,
        size: 12.5,
        font: regular,
        color: COLORS.teal
      });
      y -= 25;

      const intro = [
        'Qui, per ogni giorno, trovi:',
        '- le attività di supporto dove, nel riquadro Chi viene dopo di me, trovi le persone che ti daranno il cambio;',
        '- le gare a cui parteciperai con il tuo equipaggio.'
      ];
      for (const text of intro) {
        const lines = wrapText(regular, text, 8.9, CONTENT_WIDTH);
        for (const line of lines) {
          page.drawText(line, {
            x: MARGIN,
            y: y - 10,
            size: 8.9,
            font: regular,
            color: COLORS.ink
          });
          y -= 11;
        }
      }
      y -= 6;
    } else {
      page.drawText(personName + ' - Il programma delle tue attività', {
        x: MARGIN,
        y: y - 11,
        size: 9,
        font: bold,
        color: COLORS.muted
      });
      y -= 24;
    }
  }

  function ensureSpace(height) {
    if (y - height < 58) addPage(false);
  }

  function drawRememberBox() {
    const height = 50;
    ensureSpace(height + 10);

    page.drawRectangle({
      x: MARGIN - 6,
      y: y - height,
      width: CONTENT_WIDTH + 12,
      height,
      color: COLORS.noteSoft,
      borderColor: COLORS.line,
      borderWidth: 0.6
    });

    const x = MARGIN + 2;
    const size = 8.2;
    const y1 = y - 17;

    const lead = 'Ricorda: ';
    page.drawText(lead, { x, y: y1, size, font: bold, color: COLORS.ink });
    let tx = x + bold.widthOfTextAtSize(lead, size);

    const line1a = 'questa è una stampa. La situazione aggiornata la trovi sempre qui: ';
    page.drawText(line1a, { x: tx, y: y1, size, font: regular, color: COLORS.ink });
    tx += regular.widthOfTextAtSize(line1a, size);

    const link1 = 'Le mie attività';
    page.drawText(link1, { x: tx, y: y1, size, font: bold, color: COLORS.teal });
    const w1 = bold.widthOfTextAtSize(link1, size);
    page.drawLine({
      start: { x: tx, y: y1 - 1 },
      end: { x: tx + w1, y: y1 - 1 },
      thickness: 0.4,
      color: COLORS.teal
    });
    addLink(page, doc, tx, y1 - 2, w1, 11, programUrl);

    const y2 = y - 35;
    const provisionalRaceNote = 'Gli orari delle gare si basano sul programma provvisorio e non sono ancora quelli definitivi.';
    page.drawText(provisionalRaceNote, {
      x,
      y: y2,
      size,
      font: regular,
      color: COLORS.ink
    });

    y -= height + 15;
  }

  function drawDayTitle(label) {
    ensureSpace(31);
    page.drawText(safeText(label), {
      x: MARGIN,
      y: y - 16,
      size: 13.5,
      font: bold,
      color: COLORS.ink
    });
    y -= 25;
  }

  function drawAssignment(row) {
    const mainText = safeText(row.shift || '') + '   ' + safeText(row.activity || 'Attività di supporto');
    const mainLines = wrapText(bold, mainText, 10.4, CONTENT_WIDTH - 24);
    const handover = handoverByAssignment.get(row.id) || null;
    const successors = Array.isArray(handover?.successors) ? handover.successors.filter(Boolean) : [];
    const successorLines = successors.length
      ? wrapText(regular, successors.join(', '), 8.1, CONTENT_WIDTH - 48)
      : [];

    const baseHeight = 31 + (mainLines.length * 12) + 9;
    const handoverHeight = successorLines.length ? 32 + (successorLines.length * 10) : 0;
    const height = baseHeight + handoverHeight;

    ensureSpace(height + 7);

    page.drawRectangle({
      x: MARGIN + 2,
      y: y - height,
      width: CONTENT_WIDTH - 4,
      height,
      color: COLORS.white,
      borderColor: COLORS.line,
      borderWidth: 0.7
    });
    page.drawLine({
      start: { x: MARGIN + 3, y },
      end: { x: MARGIN + 3, y: y - height },
      thickness: 3,
      color: COLORS.teal
    });

    page.drawText('ATTIVITÀ DI SUPPORTO', {
      x: MARGIN + 12,
      y: y - 15,
      size: 7.4,
      font: bold,
      color: COLORS.teal
    });

    let my = y - 34;
    for (const line of mainLines) {
      page.drawText(line, {
        x: MARGIN + 12,
        y: my,
        size: 10.4,
        font: bold,
        color: COLORS.ink
      });
      my -= 12;
    }

    if (successorLines.length) {
      const boxHeight = 26 + (successorLines.length * 10);
      const boxTop = my - 1;
      page.drawRectangle({
        x: MARGIN + 12,
        y: boxTop - boxHeight,
        width: CONTENT_WIDTH - 26,
        height: boxHeight,
        color: COLORS.handoverSoft,
        borderColor: COLORS.handoverLine,
        borderWidth: 0.7
      });
      page.drawText('CHI VIENE DOPO DI ME', {
        x: MARGIN + 20,
        y: boxTop - 13,
        size: 7.4,
        font: bold,
        color: COLORS.ink
      });
      page.drawText(safeText(handover.toShift || ''), {
        x: MARGIN + 20,
        y: boxTop - 25,
        size: 8.1,
        font: regular,
        color: COLORS.ink
      });
      let sy = boxTop - 35;
      for (const line of successorLines) {
        page.drawText(line, {
          x: MARGIN + 20,
          y: sy,
          size: 8.1,
          font: regular,
          color: COLORS.ink
        });
        sy -= 10;
      }
    }

    y -= height + 7;
  }

  function drawRace(row) {
    const mainText = formatRaceTime(row.raceTime) + '   ' + safeText(row.crewLabel || 'Gara');
    const mainLines = wrapText(bold, mainText, 10.4, CONTENT_WIDTH - 24);
    const crewText = Array.isArray(row.crewMembers) && row.crewMembers.length
      ? 'Equipaggio: ' + row.crewMembers.join(', ')
      : '';
    const crewLines = crewText ? wrapText(regular, crewText, 8.1, CONTENT_WIDTH - 24) : [];
    const height = 31 + (mainLines.length * 12) + (crewLines.length * 10) + 9;

    ensureSpace(height + 7);

    page.drawRectangle({
      x: MARGIN + 2,
      y: y - height,
      width: CONTENT_WIDTH - 4,
      height,
      color: COLORS.raceSoft,
      borderColor: COLORS.line,
      borderWidth: 0.7
    });
    page.drawLine({
      start: { x: MARGIN + 3, y },
      end: { x: MARGIN + 3, y: y - height },
      thickness: 3,
      color: COLORS.race
    });

    page.drawText('GARA', {
      x: MARGIN + 12,
      y: y - 15,
      size: 7.4,
      font: bold,
      color: COLORS.race
    });

    let ry = y - 34;
    for (const line of mainLines) {
      page.drawText(line, {
        x: MARGIN + 12,
        y: ry,
        size: 10.4,
        font: bold,
        color: COLORS.ink
      });
      ry -= 12;
    }
    for (const line of crewLines) {
      page.drawText(line, {
        x: MARGIN + 12,
        y: ry - 1,
        size: 8.1,
        font: regular,
        color: COLORS.muted
      });
      ry -= 10;
    }

    y -= height + 7;
  }

  addPage(true);
  drawRememberBox();

  if (!dayLabels.length) {
    page.drawText('Non risultano attività o gare da mostrare.', {
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
      const dayItems = [
        ...assignments
          .filter((row) => safeText(row.day) === day)
          .map((row) => ({ kind: 'assignment', time: timeMinutes(row.shift), row })),
        ...races
          .filter((row) => formatRaceDay(row.raceDate) === day)
          .map((row) => ({ kind: 'race', time: timeMinutes(row.raceTime), row }))
      ].sort((a, b) => a.time - b.time || (a.kind === 'race' ? 1 : -1));

      for (const item of dayItems) {
        if (item.kind === 'assignment') drawAssignment(item.row);
        else drawRace(item.row);
      }
      y -= 4;
    }
  }

  const pages = doc.getPages();
  pages.forEach((item, index) => {
    item.drawLine({
      start: { x: MARGIN, y: 40 },
      end: { x: PAGE_WIDTH - MARGIN, y: 40 },
      thickness: 0.5,
      color: COLORS.line
    });
    item.drawText('Campionati Italiani Coastal Rowing 2026 - Pesaro', {
      x: MARGIN,
      y: 24,
      size: 6.9,
      font: regular,
      color: COLORS.muted
    });
    const pageLabel = 'Pagina ' + (index + 1);
    item.drawText(pageLabel, {
      x: PAGE_WIDTH - MARGIN - regular.widthOfTextAtSize(pageLabel, 6.9),
      y: 24,
      size: 6.9,
      font: regular,
      color: COLORS.muted
    });
  });

  return doc.save();
}

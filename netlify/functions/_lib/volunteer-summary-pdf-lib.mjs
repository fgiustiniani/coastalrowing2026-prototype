import { PDFDocument, PageSizes, StandardFonts, rgb } from 'pdf-lib';
import { activityLabel } from './volunteer-summary.mjs';

const MARGIN_X = 50;
const MARGIN_TOP = 54;
const MARGIN_BOTTOM = 54;
const BODY_SIZE = 10.5;
const BODY_LINE = 15;
const SMALL_SIZE = 8.5;
const SMALL_LINE = 12;

function formatSubmissionDate(value) {
  const date = new Date(value || '');
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function splitLongWord(word, font, size, maxWidth) {
  const pieces = [];
  let current = '';
  for (const char of word) {
    const candidate = current + char;
    if (current && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      pieces.push(current);
      current = char;
    } else {
      current = candidate;
    }
  }
  if (current) pieces.push(current);
  return pieces;
}

function wrapText(text, font, size, maxWidth) {
  const paragraphs = String(text ?? '').split(/\r?\n/);
  const lines = [];
  for (let index = 0; index < paragraphs.length; index += 1) {
    const paragraph = paragraphs[index].trim();
    if (!paragraph) {
      lines.push('');
      continue;
    }
    const words = paragraph.split(/\s+/).flatMap((word) => (
      font.widthOfTextAtSize(word, size) <= maxWidth ? [word] : splitLongWord(word, font, size, maxWidth)
    ));
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (current && font.widthOfTextAtSize(candidate, size) > maxWidth) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

export async function createVolunteerSummaryPdf(summary) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const [pageWidth, pageHeight] = PageSizes.A4;
  const maxWidth = pageWidth - (MARGIN_X * 2);
  let page;
  let y;

  const addPage = () => {
    page = pdf.addPage(PageSizes.A4);
    y = pageHeight - MARGIN_TOP;
  };

  const ensureSpace = (needed) => {
    if (y - needed < MARGIN_BOTTOM) addPage();
  };

  const drawWrapped = (text, { font = regular, size = BODY_SIZE, lineHeight = BODY_LINE, indent = 0 } = {}) => {
    const width = maxWidth - indent;
    const lines = wrapText(text, font, size, width);
    ensureSpace(Math.max(lineHeight, lines.length * lineHeight));
    for (const line of lines) {
      if (!line) {
        y -= lineHeight;
        continue;
      }
      page.drawText(line, { x: MARGIN_X + indent, y, size, font, color: rgb(0.1, 0.1, 0.1) });
      y -= lineHeight;
    }
  };

  const drawSection = (title, items, formatter) => {
    ensureSpace(36);
    y -= 4;
    page.drawText(title, { x: MARGIN_X, y, size: 13, font: bold, color: rgb(0.08, 0.08, 0.08) });
    y -= 21;
    if (!items.length) {
      drawWrapped('Nessuna.', { size: BODY_SIZE });
      return;
    }
    for (const item of items) {
      ensureSpace(30);
      drawWrapped(`- ${formatter(item)}`, { size: BODY_SIZE, lineHeight: BODY_LINE });
      if (item.note) drawWrapped(`Nota: ${item.note}`, { size: SMALL_SIZE, lineHeight: SMALL_LINE, indent: 12 });
      y -= 3;
    }
  };

  addPage();
  pdf.setTitle('Riepilogo disponibilità volontario - Campionati Italiani Coastal Rowing 2026');
  pdf.setAuthor('Società Canottieri Pesaro');
  pdf.setSubject('Riepilogo disponibilità volontario');

  page.drawText('Campionati Italiani Coastal Rowing 2026', {
    x: MARGIN_X,
    y,
    size: 10,
    font: bold,
    color: rgb(0.25, 0.25, 0.25)
  });
  y -= 24;
  page.drawText('Riepilogo disponibilità', {
    x: MARGIN_X,
    y,
    size: 22,
    font: bold,
    color: rgb(0.05, 0.05, 0.05)
  });
  y -= 30;

  drawWrapped(summary?.submission?.personName || 'Volontario', { font: bold, size: 14, lineHeight: 18 });
  const compiledAt = formatSubmissionDate(summary?.submission?.createdAt);
  if (compiledAt) drawWrapped(`Compilazione registrata il ${compiledAt}`, { size: SMALL_SIZE, lineHeight: SMALL_LINE });
  y -= 10;

  const assignmentText = (item) => {
    const role = item.role && activityLabel(item) === item.activity ? ` - ${item.role}` : '';
    return `${item.day} | ${item.shift} - ${activityLabel(item)}${role}`;
  };
  const availabilityText = (item) => `${item.day} | ${item.shift}`;

  drawSection('Attività confermate', summary?.confirmed || [], assignmentText);
  drawSection('Attività non disponibili', summary?.declined || [], assignmentText);
  drawSection('Ulteriori disponibilità', summary?.availability || [], availabilityText);

  ensureSpace(70);
  y -= 14;
  drawWrapped(
    'Per qualsiasi dubbio o comunicazione, puoi fare riferimento a uno dei consiglieri della Società Canottieri Pesaro.',
    { size: SMALL_SIZE, lineHeight: SMALL_LINE }
  );
  if ((summary?.confirmed?.length || 0) > 0 || (summary?.availability?.length || 0) > 0) {
    y -= 5;
    drawWrapped('Grazie per la disponibilità mostrata!', { font: bold, size: BODY_SIZE, lineHeight: BODY_LINE });
  }

  const pageCount = pdf.getPageCount();
  pdf.getPages().forEach((currentPage, index) => {
    const footer = `Società Canottieri Pesaro - pagina ${index + 1} di ${pageCount}`;
    currentPage.drawText(footer, {
      x: MARGIN_X,
      y: 30,
      size: 7.5,
      font: regular,
      color: rgb(0.45, 0.45, 0.45)
    });
  });

  return pdf.save();
}

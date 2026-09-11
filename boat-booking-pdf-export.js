(() => {
  const bookingButton = document.querySelector('[data-export-bookings-pdf]');
  const matrixButton = document.querySelector('[data-export-matrix-pdf]');
  if (!bookingButton && !matrixButton) return;

  const CP1252 = new Map([
    [0x20ac, 0x80], [0x201a, 0x82], [0x0192, 0x83], [0x201e, 0x84],
    [0x2026, 0x85], [0x2020, 0x86], [0x2021, 0x87], [0x02c6, 0x88],
    [0x2030, 0x89], [0x0160, 0x8a], [0x2039, 0x8b], [0x0152, 0x8c],
    [0x017d, 0x8e], [0x2018, 0x91], [0x2019, 0x92], [0x201c, 0x93],
    [0x201d, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97],
    [0x02dc, 0x98], [0x2122, 0x99], [0x0161, 0x9a], [0x203a, 0x9b],
    [0x0153, 0x9c], [0x017e, 0x9e], [0x0178, 0x9f]
  ]);

  function cleanText(value) {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
  }

  function winAnsiChar(char) {
    const code = char.codePointAt(0);
    if (CP1252.has(code)) return CP1252.get(code);
    if (code >= 32 && code <= 255) return code;
    return 0x3f;
  }

  function pdfEscape(value) {
    const text = cleanText(value);
    let out = '';
    for (const char of text) {
      const byte = winAnsiChar(char);
      if (byte === 0x28 || byte === 0x29 || byte === 0x5c) out += '\\';
      out += String.fromCharCode(byte);
    }
    return out;
  }

  function formatNumber(value) {
    return Number(value.toFixed(2)).toString();
  }

  function wrapText(text, maxWidth, fontSize = 9) {
    const source = cleanText(text);
    if (!source) return [''];
    const maxChars = Math.max(8, Math.floor(maxWidth / (fontSize * 0.52)));
    const words = source.split(' ');
    const lines = [];
    let line = '';

    for (const word of words) {
      if (word.length > maxChars) {
        if (line) {
          lines.push(line);
          line = '';
        }
        for (let start = 0; start < word.length; start += maxChars) {
          lines.push(word.slice(start, start + maxChars));
        }
        continue;
      }
      const candidate = line ? `${line} ${word}` : word;
      if (candidate.length <= maxChars) line = candidate;
      else {
        if (line) lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    return lines.length ? lines : [''];
  }

  class SimplePdf {
    constructor(width, height) {
      this.width = width;
      this.height = height;
      this.pages = [];
    }

    addPage() {
      const page = [];
      this.pages.push(page);
      return page;
    }

    text(page, value, x, yTop, size = 9, bold = false) {
      page.push(`BT /F${bold ? 2 : 1} ${formatNumber(size)} Tf 1 0 0 1 ${formatNumber(x)} ${formatNumber(this.height - yTop)} Tm (${pdfEscape(value)}) Tj ET`);
    }

    line(page, x1, y1Top, x2, y2Top, gray = 0.78, width = 0.6) {
      page.push(`${formatNumber(gray)} G ${formatNumber(width)} w ${formatNumber(x1)} ${formatNumber(this.height - y1Top)} m ${formatNumber(x2)} ${formatNumber(this.height - y2Top)} l S 0 G`);
    }

    rect(page, x, yTop, width, height, { fillGray = null, strokeGray = 0.78 } = {}) {
      const y = this.height - yTop - height;
      if (fillGray !== null) {
        page.push(`${formatNumber(fillGray)} g ${formatNumber(x)} ${formatNumber(y)} ${formatNumber(width)} ${formatNumber(height)} re f 0 g`);
      }
      if (strokeGray !== null) {
        page.push(`${formatNumber(strokeGray)} G 0.5 w ${formatNumber(x)} ${formatNumber(y)} ${formatNumber(width)} ${formatNumber(height)} re S 0 G`);
      }
    }

    blob() {
      const objects = [];
      const addObject = (content) => {
        objects.push(content);
        return objects.length;
      };

      const catalogId = addObject('');
      const pagesId = addObject('');
      const fontRegularId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
      const fontBoldId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
      const pageIds = [];

      for (const pageCommands of this.pages) {
        const stream = `${pageCommands.join('\n')}\n`;
        const contentId = addObject(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`);
        const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${formatNumber(this.width)} ${formatNumber(this.height)}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`);
        pageIds.push(pageId);
      }

      objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
      objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

      let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
      const offsets = [0];
      objects.forEach((content, index) => {
        offsets.push(pdf.length);
        pdf += `${index + 1} 0 obj\n${content}\nendobj\n`;
      });

      const xrefOffset = pdf.length;
      pdf += `xref\n0 ${objects.length + 1}\n`;
      pdf += '0000000000 65535 f \n';
      for (let id = 1; id <= objects.length; id += 1) {
        pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
      }
      pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

      const bytes = new Uint8Array(pdf.length);
      for (let index = 0; index < pdf.length; index += 1) bytes[index] = pdf.charCodeAt(index) & 0xff;
      return new Blob([bytes], { type: 'application/pdf' });
    }
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function exportStamp() {
    return new Intl.DateTimeFormat('it-IT', {
      timeZone: 'Europe/Rome',
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(new Date());
  }

  function fileStamp() {
    const parts = new Intl.DateTimeFormat('it-IT', {
      timeZone: 'Europe/Rome',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(new Date());
    const get = (type) => parts.find((part) => part.type === type)?.value || '';
    return `${get('year')}${get('month')}${get('day')}-${get('hour')}${get('minute')}`;
  }

  function currentFiltersText() {
    const entries = [];
    const society = cleanText(document.querySelector('[data-filter-society]')?.value);
    const slot = document.querySelector('[data-filter-slot]');
    const builder = document.querySelector('[data-filter-builder]');
    const type = document.querySelector('[data-filter-type]');

    if (society) entries.push(`Società: ${society}`);
    if (slot?.value) entries.push(`Slot: ${cleanText(slot.selectedOptions[0]?.textContent)}`);
    if (builder?.value) entries.push(`Cantiere: ${builder.value}`);
    if (type?.value) entries.push(`Tipo: ${type.value}`);
    return entries.length ? entries.join(' | ') : 'Nessun filtro applicato';
  }

  function bookingRows() {
    return Array.from(document.querySelectorAll('[data-admin-bookings] .admin-booking')).map((article) => {
      const details = Array.from(article.querySelectorAll('.admin-booking__details > p')).map((node) => cleanText(node.textContent));
      return {
        code: cleanText(article.querySelector('.admin-booking__code')?.textContent),
        society: cleanText(article.querySelector('h3')?.textContent),
        meta: cleanText(article.querySelector('.admin-booking__meta')?.textContent),
        details,
        boats: cleanText(article.querySelector('.admin-booking__boats')?.textContent)
      };
    });
  }

  function exportBookings() {
    const rows = bookingRows();
    if (!rows.length) {
      window.alert('Nessuna prenotazione visualizzata da esportare.');
      return;
    }

    const pdf = new SimplePdf(595.28, 841.89);
    const margin = 36;
    const contentWidth = pdf.width - margin * 2;
    let page;
    let y;
    let pageNumber = 0;

    function startPage() {
      page = pdf.addPage();
      pageNumber += 1;
      y = 42;
      pdf.text(page, 'Campionati Italiani Coastal Rowing 2026 - Pesaro', margin, y, 9, true);
      y += 22;
      pdf.text(page, pageNumber === 1 ? 'Elenco prenotazioni prove barche' : 'Elenco prenotazioni prove barche - continuazione', margin, y, 17, true);
      y += 18;
      pdf.text(page, `Esportato il ${exportStamp()} - ${rows.length} prenotazion${rows.length === 1 ? 'e' : 'i'}`, margin, y, 9);
      y += 15;
      const filterLines = wrapText(`Filtri: ${currentFiltersText()}`, contentWidth, 9);
      filterLines.forEach((line) => {
        pdf.text(page, line, margin, y, 9);
        y += 12;
      });
      y += 8;
      pdf.line(page, margin, y, pdf.width - margin, y, 0.72, 0.7);
      y += 18;
    }

    startPage();

    rows.forEach((row, index) => {
      const detailLines = row.details.flatMap((detail) => wrapText(detail, contentWidth, 9));
      const boatLines = wrapText(row.boats, contentWidth, 9);
      const metaLines = wrapText(row.meta, contentWidth, 8.5);
      const blockHeight = 19 + metaLines.length * 11 + detailLines.length * 12 + boatLines.length * 12 + 22;

      if (y + blockHeight > pdf.height - 42) startPage();

      pdf.text(page, row.society || 'Società', margin, y, 12, true);
      if (row.code) pdf.text(page, row.code, pdf.width - margin - 118, y, 9, true);
      y += 16;
      metaLines.forEach((line) => {
        pdf.text(page, line, margin, y, 8.5);
        y += 11;
      });
      y += 2;
      detailLines.forEach((line) => {
        pdf.text(page, line, margin, y, 9);
        y += 12;
      });
      boatLines.forEach((line, boatIndex) => {
        pdf.text(page, line, margin, y, 9, boatIndex === 0);
        y += 12;
      });
      y += 6;
      if (index < rows.length - 1) {
        pdf.line(page, margin, y, pdf.width - margin, y, 0.86, 0.5);
        y += 15;
      }
    });

    downloadBlob(pdf.blob(), `prenotazioni-prove-barche-${fileStamp()}.pdf`);
  }

  function matrixData() {
    const table = document.querySelector('[data-admin-matrix] table');
    if (!table) return null;
    const headers = Array.from(table.querySelectorAll('thead th')).map((cell) => cleanText(cell.textContent));
    const rows = Array.from(table.querySelectorAll('tbody tr')).map((row) =>
      Array.from(row.querySelectorAll('th, td')).map((cell) => cleanText(cell.textContent))
    );
    return { headers, rows };
  }

  function exportMatrix() {
    const table = matrixData();
    if (!table || !table.headers.length || !table.rows.length) {
      window.alert('La tabella di occupazione non è disponibile.');
      return;
    }

    const pdf = new SimplePdf(841.89, 595.28);
    const margin = 34;
    const usableWidth = pdf.width - margin * 2;
    const firstColumn = 116;
    const otherColumn = (usableWidth - firstColumn) / Math.max(1, table.headers.length - 1);
    const widths = table.headers.map((_, index) => index === 0 ? firstColumn : otherColumn);
    const headerHeight = 42;
    const rowHeight = 48;
    const tableTop = 100;
    const maxRows = Math.max(1, Math.floor((pdf.height - tableTop - 32 - headerHeight) / rowHeight));
    const chunks = [];
    for (let index = 0; index < table.rows.length; index += maxRows) chunks.push(table.rows.slice(index, index + maxRows));

    chunks.forEach((chunk, pageIndex) => {
      const page = pdf.addPage();
      pdf.text(page, 'Campionati Italiani Coastal Rowing 2026 - Pesaro', margin, 38, 9, true);
      pdf.text(page, pageIndex === 0 ? 'Occupazione prove barche per slot' : 'Occupazione prove barche per slot - continuazione', margin, 62, 17, true);
      pdf.text(page, `Esportato il ${exportStamp()} - valori: prenotate / barche attive censite`, margin, 80, 9);

      let x = margin;
      table.headers.forEach((header, colIndex) => {
        const width = widths[colIndex];
        pdf.rect(page, x, tableTop, width, headerHeight, { fillGray: 0.92, strokeGray: 0.72 });
        const lines = wrapText(header, width - 10, 8.5).slice(0, 2);
        lines.forEach((line, lineIndex) => pdf.text(page, line, x + 5, tableTop + 16 + lineIndex * 11, 8.5, true));
        x += width;
      });

      chunk.forEach((row, rowIndex) => {
        const yTop = tableTop + headerHeight + rowIndex * rowHeight;
        x = margin;
        row.forEach((cell, colIndex) => {
          const width = widths[colIndex] || otherColumn;
          const isFull = /COMPLETO|SLOT CHIUSO|NESSUNA BARCA/i.test(cell);
          pdf.rect(page, x, yTop, width, rowHeight, { fillGray: isFull ? 0.955 : null, strokeGray: 0.82 });
          const lines = wrapText(cell, width - 10, colIndex === 0 ? 8.5 : 8).slice(0, 3);
          lines.forEach((line, lineIndex) => pdf.text(page, line, x + 5, yTop + 15 + lineIndex * 10.5, colIndex === 0 ? 8.5 : 8, lineIndex === 0));
          x += width;
        });
      });
    });

    downloadBlob(pdf.blob(), `occupazione-slot-prove-barche-${fileStamp()}.pdf`);
  }

  bookingButton?.addEventListener('click', exportBookings);
  matrixButton?.addEventListener('click', exportMatrix);
})();

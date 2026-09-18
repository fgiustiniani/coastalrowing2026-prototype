(() => {
  const pdfButton = document.querySelector('[data-society-export-pdf]');
  const xlsxButton = document.querySelector('[data-society-export-xlsx]');
  if (!pdfButton && !xlsxButton) return;

  function cleanText(value) {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
  }

  function euro(value) {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(Number(value || 0));
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

  function exportStamp() {
    return new Intl.DateTimeFormat('it-IT', {
      timeZone: 'Europe/Rome',
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(new Date());
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

  function getRowsOrAlert() {
    const rows = window.societyAdmin?.getVisibleRows?.() || [];
    if (!rows.length) {
      window.alert('Nessuna società visualizzata da esportare.');
      return null;
    }
    return rows;
  }

  // ---------------- XLSX ----------------

  function xmlEscape(value) {
    return String(value ?? '')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&apos;');
  }

  function columnName(index) {
    let value = index + 1;
    let name = '';
    while (value > 0) {
      const remainder = (value - 1) % 26;
      name = String.fromCharCode(65 + remainder) + name;
      value = Math.floor((value - 1) / 26);
    }
    return name;
  }

  function excelRows(rows) {
    const sourceUrl = window.societyAdmin?.getData?.()?.sourceUrl || '';
    const output = [[
      'Stato iscrizione',
      'Regione',
      'Comitato FIC',
      'Codice società',
      'Società',
      'Località',
      'Provincia',
      'E-mail',
      'Nome nel portale FIC',
      'Codice fiscale',
      'Dirigente responsabile',
      'Tecnico responsabile',
      'Tipo pagamento',
      'Data contabile',
      'Data registrazione pagamento',
      'Data registrazione verifica',
      'Importo dovuto',
      'Noleggio barche',
      'Noleggio remi',
      'Importo pagato',
      'Confidenza abbinamento',
      'Fonte FIC'
    ]];

    rows.forEach((row) => {
      const r = row.registration;
      output.push([
        window.societyAdmin?.statusLabel?.(row.status) || row.status || '',
        row.region || '',
        row.committee || '',
        row.code || '',
        row.name || '',
        row.city || '',
        row.province || '',
        row.email || '',
        r?.team || '',
        r?.fiscalCode || '',
        r?.manager || '',
        r?.coach || '',
        r?.paymentType || '',
        r?.accountingDate || '',
        r?.paymentRegistrationDate || '',
        r?.verificationDate || '',
        r ? Number(r.amountDue || 0) : '',
        r ? Number(r.boatRental || 0) : '',
        r ? Number(r.oarRental || 0) : '',
        r ? Number(r.amountPaid || 0) : '',
        row.matchConfidence ?? '',
        sourceUrl
      ]);
    });

    return output;
  }

  function worksheetXml(rows) {
    const lastColumn = columnName(rows[0].length - 1);
    const lastCell = `${lastColumn}${rows.length}`;
    const widths = [18,18,18,15,34,22,11,30,26,18,24,24,20,19,24,24,16,16,16,16,18,42];
    const cols = widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join('');

    const body = rows.map((row, rowIndex) => {
      const cells = row.map((value, colIndex) => {
        const ref = `${columnName(colIndex)}${rowIndex + 1}`;
        const headerStyle = rowIndex === 0 ? ' s="1"' : '';
        const moneyStyle = rowIndex > 0 && colIndex >= 16 && colIndex <= 19 ? ' s="2"' : headerStyle;
        const confidenceStyle = rowIndex > 0 && colIndex === 20 ? ' s="3"' : headerStyle;
        if (typeof value === 'number' && Number.isFinite(value)) {
          return `<c r="${ref}"${moneyStyle || confidenceStyle} t="n"><v>${value}</v></c>`;
        }
        return `<c r="${ref}"${headerStyle} t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
      }).join('');
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    }).join('');

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:${lastCell}"/>
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <cols>${cols}</cols>
  <sheetData>${body}</sheetData>
  <autoFilter ref="A1:${lastCell}"/>
</worksheet>`;
  }

  const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }

  function u16(value) {
    const bytes = new Uint8Array(2);
    new DataView(bytes.buffer).setUint16(0, value & 0xffff, true);
    return bytes;
  }

  function u32(value) {
    const bytes = new Uint8Array(4);
    new DataView(bytes.buffer).setUint32(0, value >>> 0, true);
    return bytes;
  }

  function concatBytes(parts) {
    const total = parts.reduce((sum, part) => sum + part.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    parts.forEach((part) => {
      out.set(part, offset);
      offset += part.length;
    });
    return out;
  }

  function dosDateTime(date = new Date()) {
    const year = Math.max(1980, date.getFullYear());
    return {
      dosDate: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
      dosTime: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)
    };
  }

  function zipStore(files) {
    const encoder = new TextEncoder();
    const localParts = [];
    const centralParts = [];
    let offset = 0;
    const now = dosDateTime();

    Object.entries(files).forEach(([name, content]) => {
      const nameBytes = encoder.encode(name);
      const dataBytes = typeof content === 'string' ? encoder.encode(content) : content;
      const crc = crc32(dataBytes);

      const localHeader = concatBytes([
        u32(0x04034b50),
        u16(20),
        u16(0),
        u16(0),
        u16(now.dosTime),
        u16(now.dosDate),
        u32(crc),
        u32(dataBytes.length),
        u32(dataBytes.length),
        u16(nameBytes.length),
        u16(0),
        nameBytes
      ]);
      localParts.push(localHeader, dataBytes);

      const centralHeader = concatBytes([
        u32(0x02014b50),
        u16(20),
        u16(20),
        u16(0),
        u16(0),
        u16(now.dosTime),
        u16(now.dosDate),
        u32(crc),
        u32(dataBytes.length),
        u32(dataBytes.length),
        u16(nameBytes.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(offset),
        nameBytes
      ]);
      centralParts.push(centralHeader);
      offset += localHeader.length + dataBytes.length;
    });

    const central = concatBytes(centralParts);
    const end = concatBytes([
      u32(0x06054b50),
      u16(0),
      u16(0),
      u16(Object.keys(files).length),
      u16(Object.keys(files).length),
      u32(central.length),
      u32(offset),
      u16(0)
    ]);

    return concatBytes([...localParts, central, end]);
  }

  function xlsxBlob(rows) {
    const sheet = worksheetXml(excelRows(rows));
    const files = {
      '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`,
      '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
      'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Società" sheetId="1" r:id="rId1"/></sheets>
</workbook>`,
      'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
      'xl/styles.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="2">
    <numFmt numFmtId="164" formatCode="#,##0.00 [$€-it-IT]"/>
    <numFmt numFmtId="165" formatCode="0.0%"/>
  </numFmts>
  <fonts count="2">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF0B6478"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="4">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1"/>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
    <xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`,
      'xl/worksheets/sheet1.xml': sheet
    };

    const bytes = zipStore(files);
    return new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  function exportXlsx() {
    const rows = getRowsOrAlert();
    if (!rows) return;
    downloadBlob(xlsxBlob(rows), `societa-iscritte-coastal-2026-${fileStamp()}.xlsx`);
  }

  // ---------------- PDF ----------------

  const CP1252 = new Map([
    [0x20ac, 0x80], [0x201a, 0x82], [0x0192, 0x83], [0x201e, 0x84],
    [0x2026, 0x85], [0x2020, 0x86], [0x2021, 0x87], [0x02c6, 0x88],
    [0x2030, 0x89], [0x0160, 0x8a], [0x2039, 0x8b], [0x0152, 0x8c],
    [0x017d, 0x8e], [0x2018, 0x91], [0x2019, 0x92], [0x201c, 0x93],
    [0x201d, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97],
    [0x02dc, 0x98], [0x2122, 0x99], [0x0161, 0x9a], [0x203a, 0x9b],
    [0x0153, 0x9c], [0x017e, 0x9e], [0x0178, 0x9f]
  ]);

  function winAnsiChar(char) {
    const code = char.codePointAt(0);
    if (CP1252.has(code)) return CP1252.get(code);
    if (code >= 32 && code <= 255) return code;
    return 0x3f;
  }

  function pdfEscape(value) {
    let out = '';
    for (const char of cleanText(value)) {
      const byte = winAnsiChar(char);
      if (byte === 0x28 || byte === 0x29 || byte === 0x5c) out += '\\';
      out += String.fromCharCode(byte);
    }
    return out;
  }

  function fmt(value) {
    return Number(Number(value).toFixed(2)).toString();
  }

  function wrapText(text, maxWidth, fontSize = 8) {
    const source = cleanText(text);
    if (!source) return [''];
    const maxChars = Math.max(6, Math.floor(maxWidth / (fontSize * 0.52)));
    const words = source.split(' ');
    const lines = [];
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (candidate.length <= maxChars) line = candidate;
      else {
        if (line) lines.push(line);
        line = word.length <= maxChars ? word : word.slice(0, maxChars - 1) + '…';
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

    text(page, value, x, yTop, size = 8, bold = false) {
      page.push(`BT /F${bold ? 2 : 1} ${fmt(size)} Tf 1 0 0 1 ${fmt(x)} ${fmt(this.height - yTop)} Tm (${pdfEscape(value)}) Tj ET`);
    }

    line(page, x1, y1Top, x2, y2Top, gray = 0.78, width = 0.5) {
      page.push(`${fmt(gray)} G ${fmt(width)} w ${fmt(x1)} ${fmt(this.height - y1Top)} m ${fmt(x2)} ${fmt(this.height - y2Top)} l S 0 G`);
    }

    rect(page, x, yTop, width, height, fillGray = null, strokeGray = 0.78) {
      const y = this.height - yTop - height;
      if (fillGray !== null) page.push(`${fmt(fillGray)} g ${fmt(x)} ${fmt(y)} ${fmt(width)} ${fmt(height)} re f 0 g`);
      if (strokeGray !== null) page.push(`${fmt(strokeGray)} G .4 w ${fmt(x)} ${fmt(y)} ${fmt(width)} ${fmt(height)} re S 0 G`);
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

      for (const commands of this.pages) {
        const stream = `${commands.join('\n')}\n`;
        const contentId = addObject(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`);
        const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${fmt(this.width)} ${fmt(this.height)}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`);
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
      pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
      for (let id = 1; id <= objects.length; id += 1) {
        pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
      }
      pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

      const bytes = new Uint8Array(pdf.length);
      for (let i = 0; i < pdf.length; i += 1) bytes[i] = pdf.charCodeAt(i) & 0xff;
      return new Blob([bytes], { type: 'application/pdf' });
    }
  }

  function exportPdf() {
    const rows = getRowsOrAlert();
    if (!rows) return;

    const pdf = new SimplePdf(841.89, 595.28);
    const margin = 28;
    const pageWidth = pdf.width - margin * 2;
    const columns = [
      { key: 'region', label: 'Regione', width: 72 },
      { key: 'code', label: 'Codice', width: 58 },
      { key: 'name', label: 'Società', width: 235 },
      { key: 'status', label: 'Stato', width: 70 },
      { key: 'due', label: 'Dovuto', width: 82 },
      { key: 'boats', label: 'Nol. barche', width: 82 },
      { key: 'oars', label: 'Nol. remi', width: 82 },
      { key: 'paid', label: 'Pagato', width: 82 }
    ];
    const totalColumnWidth = columns.reduce((sum, col) => sum + col.width, 0);
    const scale = Math.min(1, pageWidth / totalColumnWidth);
    columns.forEach((col) => { col.width *= scale; });

    let page;
    let y;

    function drawHeader() {
      page = pdf.addPage();
      y = 28;
      pdf.text(page, 'Campionati Italiani Coastal Rowing 2026 - Pesaro', margin, y, 9, true);
      y += 18;
      pdf.text(page, 'Società iscritte - elenco amministrativo', margin, y, 16, true);
      y += 16;
      pdf.text(page, `Esportato il ${exportStamp()} - ${rows.length} società`, margin, y, 8);
      y += 12;
      const filter = window.societyAdmin?.getFilterLabel?.() || 'Nessun filtro applicato';
      wrapText(`Filtri: ${filter}`, pageWidth, 8).forEach((line) => {
        pdf.text(page, line, margin, y, 8);
        y += 10;
      });
      y += 5;

      let x = margin;
      columns.forEach((col) => {
        pdf.rect(page, x, y, col.width, 20, 0.93, 0.78);
        pdf.text(page, col.label, x + 4, y + 13, 7, true);
        x += col.width;
      });
      y += 20;
    }

    function valuesFor(row) {
      const r = row.registration;
      return {
        region: row.region || '',
        code: row.code || '',
        name: row.name || '',
        status: window.societyAdmin?.statusLabel?.(row.status) || row.status || '',
        due: r ? euro(r.amountDue) : '—',
        boats: r ? euro(r.boatRental) : '—',
        oars: r ? euro(r.oarRental) : '—',
        paid: r ? euro(r.amountPaid) : '—'
      };
    }

    drawHeader();

    rows.forEach((row) => {
      const values = valuesFor(row);
      const societyLines = wrapText(values.name, columns[2].width - 8, 7.5).slice(0, 2);
      const rowHeight = Math.max(20, 8 + societyLines.length * 9);

      if (y + rowHeight > pdf.height - 28) drawHeader();

      let x = margin;
      columns.forEach((col, index) => {
        pdf.rect(page, x, y, col.width, rowHeight, null, 0.86);
        const value = values[col.key];
        if (col.key === 'name') {
          societyLines.forEach((line, lineIndex) => pdf.text(page, line, x + 4, y + 11 + lineIndex * 9, 7.5, lineIndex === 0));
        } else {
          pdf.text(page, value, x + 4, y + 13, 7.2, index === 3);
        }
        x += col.width;
      });
      y += rowHeight;
    });

    downloadBlob(pdf.blob(), `societa-iscritte-coastal-2026-${fileStamp()}.pdf`);
  }

  pdfButton?.addEventListener('click', exportPdf);
  xlsxButton?.addEventListener('click', exportXlsx);
})();

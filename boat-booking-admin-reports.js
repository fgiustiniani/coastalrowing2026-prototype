(() => {
  const excelButton = document.querySelector('[data-export-bookings-xlsx]');
  const societyContainer = document.querySelector('[data-admin-society-report]');
  const societyReportFilter = document.querySelector('[data-report-society-filter]');
  if (!excelButton && !societyContainer) return;

  const fallbackSlots = new Map([
    ['1400', '14:00–14:20'], ['1430', '14:30–14:50'], ['1500', '15:00–15:20'],
    ['1530', '15:30–15:50'], ['1600', '16:00–16:20'], ['1630', '16:30–16:50'],
    ['1700', '17:00–17:20'], ['1730', '17:30–17:50'], ['1800', '18:00–18:20']
  ]);

  let state = window.boatBookingAdminData || null;

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function slotLabel(code) {
    return (state?.slots || []).find((slot) => slot.code === code)?.label || fallbackSlots.get(code) || code || '—';
  }

  function slotOrder(code) {
    const item = (state?.slots || []).find((slot) => slot.code === code);
    if (item && Number.isFinite(Number(item.sortOrder))) return Number(item.sortOrder);
    return Array.from(fallbackSlots.keys()).indexOf(code);
  }

  function formatDate(value) {
    if (!value) return '';
    try {
      return new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
    } catch {
      return String(value);
    }
  }

  function bookingTotal(booking) {
    return (booking.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  }

  function itemsSummary(booking) {
    return (booking.items || []).map((item) => {
      const numbers = Array.isArray(item.boatNumbers) && item.boatNumbers.length ? ` — ${item.boatNumbers.join(', ')}` : '';
      return `${item.builder} ${item.boatType} × ${Number(item.quantity || 0)}${numbers}`;
    }).join(' · ') || 'Nessuna barca';
  }

  function currentFilters() {
    return {
      society: (document.querySelector('[data-filter-society]')?.value || '').trim().toLowerCase(),
      slot: document.querySelector('[data-filter-slot]')?.value || '',
      builder: document.querySelector('[data-filter-builder]')?.value || '',
      type: document.querySelector('[data-filter-type]')?.value || ''
    };
  }

  function matchesFilters(booking, filters) {
    if (filters.society && !String(booking.society || '').toLowerCase().includes(filters.society)) return false;
    if (filters.slot && booking.slotCode !== filters.slot) return false;
    if (filters.builder && !(booking.items || []).some((item) => item.builder === filters.builder)) return false;
    if (filters.type && !(booking.items || []).some((item) => item.boatType === filters.type)) return false;
    return true;
  }

  function visibleBookings() {
    if (!state?.bookings) return [];
    const filters = currentFilters();
    return state.bookings.filter((booking) => matchesFilters(booking, filters));
  }

  function societyKey(value) {
    return String(value ?? '').trim().toLocaleLowerCase('it-IT');
  }

  function syncSocietyReportFilter() {
    if (!societyReportFilter) return;
    const current = societyReportFilter.value;
    const names = Array.from(new Map((state?.bookings || []).map((booking) => {
      const name = String(booking.society || '').trim();
      return [societyKey(name), name];
    }).filter(([key]) => key)).values())
      .sort((a, b) => a.localeCompare(b, 'it-IT', { sensitivity: 'base' }));

    societyReportFilter.innerHTML = '<option value="">Tutte le società</option>' + names
      .map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`)
      .join('');

    if (names.some((name) => societyKey(name) === societyKey(current))) {
      societyReportFilter.value = names.find((name) => societyKey(name) === societyKey(current)) || '';
    }
  }

  function renderSocietyReport() {
    if (!societyContainer) return;
    const selectedSociety = societyKey(societyReportFilter?.value);
    const bookings = (Array.isArray(state?.bookings) ? state.bookings : [])
      .filter((booking) => !selectedSociety || societyKey(booking.society) === selectedSociety);
    if (!bookings.length) {
      societyContainer.innerHTML = `<div class="booking-empty">${selectedSociety ? 'Nessuna prenotazione per la società selezionata.' : 'Nessuna società ha ancora effettuato prenotazioni.'}</div>`;
      return;
    }

    const groups = new Map();
    bookings.forEach((booking) => {
      const displayName = String(booking.society || 'Società').trim() || 'Società';
      const key = displayName.toLocaleLowerCase('it-IT');
      if (!groups.has(key)) groups.set(key, { name: displayName, bookings: [] });
      groups.get(key).bookings.push(booking);
    });

    societyContainer.innerHTML = Array.from(groups.values())
      .sort((a, b) => a.name.localeCompare(b.name, 'it-IT', { sensitivity: 'base' }))
      .map((group) => {
        const ordered = [...group.bookings].sort((a, b) => slotOrder(a.slotCode) - slotOrder(b.slotCode) || String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
        const totalBoats = ordered.reduce((sum, booking) => sum + bookingTotal(booking), 0);
        const slotsCount = new Set(ordered.map((booking) => booking.slotCode)).size;
        const contacts = Array.from(new Map(ordered.map((booking) => {
          const name = `${booking.contactSurname || ''} ${booking.contactName || ''}`.trim();
          const contact = [name, booking.phone, booking.email].filter(Boolean).join(' · ');
          return [contact.toLocaleLowerCase('it-IT'), contact];
        })).values()).filter(Boolean);

        return `
          <article class="admin-society-card">
            <div class="admin-society-card__head">
              <h3>${escapeHtml(group.name)}</h3>
              <div class="admin-society-card__stats">
                <span class="admin-society-card__stat">${ordered.length} prenotazion${ordered.length === 1 ? 'e' : 'i'}</span>
                <span class="admin-society-card__stat">${slotsCount} slot</span>
                <span class="admin-society-card__stat">${totalBoats} barc${totalBoats === 1 ? 'a' : 'he'}</span>
              </div>
            </div>
            <p class="admin-society-card__contacts"><strong>Referent${contacts.length === 1 ? 'e' : 'i'}:</strong> ${contacts.map(escapeHtml).join('<br>')}</p>
            <div class="admin-society-bookings">
              ${ordered.map((booking) => `
                <div class="admin-society-booking">
                  <strong>${escapeHtml(slotLabel(booking.slotCode))}</strong>
                  <span>${escapeHtml(booking.bookingCode || '')} · ${escapeHtml(`${booking.contactSurname || ''} ${booking.contactName || ''}`.trim())}</span>
                  <span>${escapeHtml(itemsSummary(booking))}</span>
                </div>`).join('')}
            </div>
          </article>`;
      }).join('');
  }

  function fileStamp() {
    const parts = new Intl.DateTimeFormat('it-IT', {
      timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(new Date());
    const get = (type) => parts.find((part) => part.type === type)?.value || '';
    return `${get('year')}${get('month')}${get('day')}-${get('hour')}${get('minute')}`;
  }

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

  function excelRows(bookings) {
    const rows = [[
      'Codice prenotazione', 'Società', 'Cognome referente', 'Nome referente', 'Telefono', 'Email',
      'Codice slot', 'Slot', 'Cantiere', 'Tipo barca', 'Quantità', 'Numeri barche',
      'Totale barche prenotazione', 'Creata il', 'Aggiornata il'
    ]];

    [...bookings]
      .sort((a, b) => String(a.society || '').localeCompare(String(b.society || ''), 'it-IT', { sensitivity: 'base' }) || slotOrder(a.slotCode) - slotOrder(b.slotCode))
      .forEach((booking) => {
        const items = booking.items?.length ? booking.items : [null];
        const total = bookingTotal(booking);
        items.forEach((item) => rows.push([
          booking.bookingCode || '', booking.society || '', booking.contactSurname || '', booking.contactName || '',
          booking.phone || '', booking.email || '', booking.slotCode || '', slotLabel(booking.slotCode),
          item?.builder || '', item?.boatType || '', Number(item?.quantity || 0),
          Array.isArray(item?.boatNumbers) ? item.boatNumbers.join(', ') : '', total,
          formatDate(booking.createdAt), formatDate(booking.updatedAt)
        ]));
      });
    return rows;
  }

  function worksheetXml(rows) {
    const lastCell = `${columnName(rows[0].length - 1)}${Math.max(1, rows.length)}`;
    const widths = [18, 30, 20, 18, 18, 30, 13, 18, 14, 14, 11, 24, 18, 20, 20];
    const cols = widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join('');
    const body = rows.map((row, rowIndex) => {
      const cells = row.map((value, colIndex) => {
        const ref = `${columnName(colIndex)}${rowIndex + 1}`;
        const style = rowIndex === 0 ? ' s="1"' : '';
        if (typeof value === 'number' && Number.isFinite(value)) return `<c r="${ref}"${style} t="n"><v>${value}</v></c>`;
        return `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
      }).join('');
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    }).join('');
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${lastCell}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${cols}</cols><sheetData>${body}</sheetData><autoFilter ref="A1:${lastCell}"/></worksheet>`;
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
    parts.forEach((part) => { out.set(part, offset); offset += part.length; });
    return out;
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

  function dosDateTime(date = new Date()) {
    const year = Math.max(1980, date.getFullYear());
    return {
      dosDate: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
      dosTime: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)
    };
  }

  function zipBlob(files) {
    const encoder = new TextEncoder();
    const localParts = [];
    const centralParts = [];
    let offset = 0;
    const stamp = dosDateTime();

    files.forEach(([name, content]) => {
      const nameBytes = encoder.encode(name);
      const dataBytes = encoder.encode(content);
      const crc = crc32(dataBytes);
      const localHeader = concatBytes([
        u32(0x04034b50), u16(20), u16(0), u16(0), u16(stamp.dosTime), u16(stamp.dosDate),
        u32(crc), u32(dataBytes.length), u32(dataBytes.length), u16(nameBytes.length), u16(0)
      ]);
      const localRecord = concatBytes([localHeader, nameBytes, dataBytes]);
      localParts.push(localRecord);

      const centralHeader = concatBytes([
        u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(stamp.dosTime), u16(stamp.dosDate),
        u32(crc), u32(dataBytes.length), u32(dataBytes.length), u16(nameBytes.length), u16(0), u16(0),
        u16(0), u16(0), u32(0), u32(offset)
      ]);
      centralParts.push(concatBytes([centralHeader, nameBytes]));
      offset += localRecord.length;
    });

    const centralDirectory = concatBytes(centralParts);
    const endRecord = concatBytes([
      u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length),
      u32(centralDirectory.length), u32(offset), u16(0)
    ]);
    return new Blob([...localParts, centralDirectory, endRecord], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
  }

  function buildXlsx(rows, sheetName = 'Prenotazioni') {
    const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;
    const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
    const safeSheetName = xmlEscape(String(sheetName || 'Prenotazioni').replace(/[\\/*?:[\]]/g, ' ').slice(0, 31) || 'Prenotazioni');
    const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${safeSheetName}" sheetId="1" r:id="rId1"/></sheets></workbook>`;
    const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
    const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

    return zipBlob([
      ['[Content_Types].xml', contentTypes],
      ['_rels/.rels', rootRels],
      ['xl/workbook.xml', workbook],
      ['xl/_rels/workbook.xml.rels', workbookRels],
      ['xl/styles.xml', styles],
      ['xl/worksheets/sheet1.xml', worksheetXml(rows)]
    ]);
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

  function exportExcel() {
    const bookings = visibleBookings();
    if (!bookings.length) {
      window.alert('Nessuna prenotazione corrisponde ai filtri correnti.');
      return;
    }
    downloadBlob(buildXlsx(excelRows(bookings)), `prenotazioni-prove-barche-${fileStamp()}.xlsx`);
  }

  window.BoatBookingXlsxTools = { buildXlsx, downloadBlob, fileStamp };

  window.addEventListener('boat-booking-admin:data', (event) => {
    state = event.detail || null;
    syncSocietyReportFilter();
    renderSocietyReport();
  });

  societyReportFilter?.addEventListener('change', renderSocietyReport);
  excelButton?.addEventListener('click', exportExcel);
  if (state) {
    syncSocietyReportFilter();
    renderSocietyReport();
  }
})();

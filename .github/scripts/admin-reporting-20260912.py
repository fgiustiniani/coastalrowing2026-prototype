from pathlib import Path


def replace_once(path, old, new, label):
    p = Path(path)
    s = p.read_text(encoding='utf-8')
    if old not in s:
        raise SystemExit(f'Anchor not found: {label} in {path}')
    p.write_text(s.replace(old, new, 1), encoding='utf-8')


# Admin HTML: styles
replace_once(
    'admin-prenotazioni-barche.html',
    '    .admin-export-button { flex: 0 0 auto; }\n',
    '''    .admin-export-button { flex: 0 0 auto; }

    .admin-slot-fill {
      display: grid;
      gap: 5px;
      min-width: 92px;
    }
    .admin-slot-fill__value {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 8px;
      white-space: nowrap;
    }
    .admin-slot-fill__value strong { color: #173e4b; font-size: .92rem; }
    .admin-slot-fill__value span { color: #64757b; font-size: .78rem; font-weight: 800; }
    .admin-slot-fill__track {
      display: block;
      height: 7px;
      overflow: hidden;
      border-radius: 999px;
      background: #e5ecee;
    }
    .admin-slot-fill__track > span {
      display: block;
      width: var(--slot-fill, 0%);
      height: 100%;
      border-radius: inherit;
      background: #2f8f6b;
    }
    .admin-slot-fill.is-medium .admin-slot-fill__track > span { background: #d59a2f; }
    .admin-slot-fill.is-high .admin-slot-fill__track > span { background: #cf6b2c; }
    .admin-slot-fill.is-full .admin-slot-fill__track > span { background: #b42318; }

    .admin-society-report { display: grid; gap: 14px; }
    .admin-society-card {
      padding: 18px;
      border: 1px solid #dfe8ea;
      border-radius: 16px;
      background: #fff;
    }
    .admin-society-card__head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 14px;
      flex-wrap: wrap;
      padding-bottom: 12px;
      border-bottom: 1px solid #e7edef;
    }
    .admin-society-card__head h3 { margin: 0; color: #173e4b; font-size: 1.2rem; }
    .admin-society-card__stats { display: flex; gap: 7px; flex-wrap: wrap; }
    .admin-society-card__stat {
      padding: 5px 9px;
      border-radius: 999px;
      background: #edf6f8;
      color: #0b6478;
      font-size: .78rem;
      font-weight: 800;
    }
    .admin-society-card__contacts { margin: 12px 0 0; color: #52666c; font-size: .9rem; line-height: 1.5; }
    .admin-society-bookings { display: grid; gap: 8px; margin-top: 14px; }
    .admin-society-booking {
      display: grid;
      grid-template-columns: minmax(150px, .7fr) minmax(210px, 1fr) minmax(0, 1.6fr);
      gap: 12px;
      align-items: start;
      padding: 10px 12px;
      border-radius: 11px;
      background: #f7fafb;
      color: #334b52;
      font-size: .88rem;
      line-height: 1.4;
    }
    .admin-society-booking strong { color: #173e4b; }

    @media (max-width: 760px) {
      .admin-society-booking { grid-template-columns: 1fr; gap: 4px; }
    }
''',
    'admin styles'
)

# Excel button
replace_once(
    'admin-prenotazioni-barche.html',
    '''            <h2>Prenotazioni</h2>
            <button class="admin-button admin-export-button" data-export-bookings-pdf type="button">Esporta PDF</button>
''',
    '''            <h2>Prenotazioni</h2>
            <button class="admin-button admin-export-button" data-export-bookings-pdf type="button">Esporta PDF</button>
            <button class="admin-button admin-export-button" data-export-bookings-xlsx type="button">Esporta Excel</button>
''',
    'excel button'
)

# Society report section
replace_once(
    'admin-prenotazioni-barche.html',
    '''          </details>

          <details class="booking-card admin-collapsible">
            <summary>Impostazioni prenotazioni</summary>
''',
    '''          </details>

          <details class="booking-card admin-collapsible">
            <summary>Report per società</summary>
            <div class="admin-collapsible__body">
              <p class="booking-card__intro">Una scheda riepilogativa per ogni società che ha effettuato almeno una prenotazione.</p>
              <div class="admin-society-report" data-admin-society-report style="margin-top:18px"></div>
            </div>
          </details>

          <details class="booking-card admin-collapsible">
            <summary>Impostazioni prenotazioni</summary>
''',
    'society report section'
)

# Reports script
replace_once(
    'admin-prenotazioni-barche.html',
    '''  <script src="boat-booking-admin.js" defer></script>
  <script src="boat-booking-admin-list-ux.js" defer></script>
  <script src="boat-booking-pdf-export.js" defer></script>
''',
    '''  <script src="boat-booking-admin.js" defer></script>
  <script src="boat-booking-admin-list-ux.js" defer></script>
  <script src="boat-booking-pdf-export.js" defer></script>
  <script src="boat-booking-admin-reports.js" defer></script>
''',
    'reports script'
)

# Admin JS: occupancy indicator
old_matrix = '''  function renderMatrix() {
    if (!matrix) return;
    const columns = builders.flatMap((builder) => boatTypes.map((boatType) => [builder, boatType]));

    matrix.innerHTML = `
      <table class="admin-matrix">
        <thead>
          <tr>
            <th>Slot</th>
            ${columns.map(([builder, type]) => `<th>${builder}<br><small>${type}</small></th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${slots.map(([code, label]) => {
            const info = slotInfo(code);
            const isInactive = info?.active === false;
            return `
            <tr>
              <th>${escapeHtml(info?.label || label)}${isInactive ? '<br><small>CHIUSO</small>' : ''}</th>
              ${columns.map(([builder, type]) => {
                const row = availabilityRow(code, builder, type) || { booked: 0, capacity: 0, remaining: 0 };
                const noBoats = Number(row.capacity) === 0;
                const full = !noBoats && Number(row.remaining) <= 0;
                return `<td class="admin-matrix__cell${full ? ' is-full' : ''}${noBoats ? ' is-empty' : ''}">
                  <strong>${row.booked}/${row.capacity}</strong>
                  <small>${isInactive ? 'SLOT CHIUSO' : noBoats ? 'NESSUNA BARCA' : full ? 'COMPLETO' : `${row.remaining} libere`}</small>
                </td>`;
              }).join('')}
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  }
'''
new_matrix = '''  function renderMatrix() {
    if (!matrix) return;
    const columns = builders.flatMap((builder) => boatTypes.map((boatType) => [builder, boatType]));

    matrix.innerHTML = `
      <table class="admin-matrix">
        <thead>
          <tr>
            <th>Slot</th>
            <th>Riempimento slot</th>
            ${columns.map(([builder, type]) => `<th>${builder}<br><small>${type}</small></th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${slots.map(([code, label]) => {
            const info = slotInfo(code);
            const isInactive = info?.active === false;
            const totals = columns.reduce((acc, [builder, type]) => {
              const row = availabilityRow(code, builder, type) || { booked: 0, capacity: 0 };
              acc.booked += Number(row.booked || 0);
              acc.capacity += Number(row.capacity || 0);
              return acc;
            }, { booked: 0, capacity: 0 });
            const percentage = totals.capacity > 0
              ? Math.min(100, Math.round((totals.booked / totals.capacity) * 100))
              : 0;
            const fillClass = percentage >= 100 ? ' is-full' : percentage >= 80 ? ' is-high' : percentage >= 50 ? ' is-medium' : '';

            return `
            <tr>
              <th>${escapeHtml(info?.label || label)}${isInactive ? '<br><small>CHIUSO</small>' : ''}</th>
              <td class="admin-matrix__occupancy">
                <div class="admin-slot-fill${fillClass}" style="--slot-fill:${percentage}%">
                  <span class="admin-slot-fill__value"><strong>${totals.booked}/${totals.capacity}</strong><span>${percentage}%</span></span>
                  <span class="admin-slot-fill__track" aria-hidden="true"><span></span></span>
                </div>
              </td>
              ${columns.map(([builder, type]) => {
                const row = availabilityRow(code, builder, type) || { booked: 0, capacity: 0, remaining: 0 };
                const noBoats = Number(row.capacity) === 0;
                const full = !noBoats && Number(row.remaining) <= 0;
                return `<td class="admin-matrix__cell${full ? ' is-full' : ''}${noBoats ? ' is-empty' : ''}">
                  <strong>${row.booked}/${row.capacity}</strong>
                  <small>${isInactive ? 'SLOT CHIUSO' : noBoats ? 'NESSUNA BARCA' : full ? 'COMPLETO' : `${row.remaining} libere`}</small>
                </td>`;
              }).join('')}
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  }
'''
replace_once('boat-booking-admin.js', old_matrix, new_matrix, 'renderMatrix')

# Expose data to reporting module
replace_once(
    'boat-booking-admin.js',
    '''    renderBookings();
    syncEditSlotOptions();
  }
''',
    '''    renderBookings();
    syncEditSlotOptions();
    window.boatBookingAdminData = data;
    window.dispatchEvent(new CustomEvent('boat-booking-admin:data', { detail: data }));
  }
''',
    'admin data event'
)

# List UX: include Excel in heading actions
replace_once(
    'boat-booking-admin-list-ux.js',
    '''    const exportButton = heading?.querySelector('[data-export-bookings-pdf]');
    if (heading && refresh && exportButton && !heading.querySelector('[data-admin-section-actions]')) {
''',
    '''    const exportButton = heading?.querySelector('[data-export-bookings-pdf]');
    const excelButton = heading?.querySelector('[data-export-bookings-xlsx]');
    if (heading && refresh && exportButton && !heading.querySelector('[data-admin-section-actions]')) {
''',
    'excel action lookup'
)
replace_once(
    'boat-booking-admin-list-ux.js',
    '      actions.append(refresh, exportButton);\n',
    '      actions.append(refresh, exportButton);\n      if (excelButton) actions.append(excelButton);\n',
    'excel action append'
)

# PDF: single landscape page
old_export = '''  function exportMatrix() {
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
'''
new_export = '''  function exportMatrix() {
    const table = matrixData();
    if (!table || !table.headers.length || !table.rows.length) {
      window.alert('La tabella di occupazione non è disponibile.');
      return;
    }

    const pdf = new SimplePdf(841.89, 595.28);
    const margin = 28;
    const usableWidth = pdf.width - margin * 2;
    const firstColumn = 92;
    const occupancyColumn = table.headers.length > 1 ? 94 : 0;
    const dataColumns = Math.max(1, table.headers.length - (occupancyColumn ? 2 : 1));
    const otherColumn = (usableWidth - firstColumn - occupancyColumn) / dataColumns;
    const widths = table.headers.map((_, index) => index === 0 ? firstColumn : index === 1 && occupancyColumn ? occupancyColumn : otherColumn);
    const tableTop = 88;
    const headerHeight = 34;
    const availableRowsHeight = pdf.height - tableTop - headerHeight - 26;
    const rowHeight = Math.max(30, Math.min(42, availableRowsHeight / Math.max(1, table.rows.length)));
    const bodyFont = rowHeight < 35 ? 6.7 : 7.4;
    const firstFont = rowHeight < 35 ? 7.1 : 7.8;

    const page = pdf.addPage();
    pdf.text(page, 'Campionati Italiani Coastal Rowing 2026 - Pesaro', margin, 28, 8.5, true);
    pdf.text(page, 'Occupazione prove barche per slot', margin, 51, 16, true);
    pdf.text(page, `Esportato il ${exportStamp()} - riempimento slot e valori prenotate / barche attive censite`, margin, 70, 8.3);

    let x = margin;
    table.headers.forEach((header, colIndex) => {
      const width = widths[colIndex];
      pdf.rect(page, x, tableTop, width, headerHeight, { fillGray: 0.92, strokeGray: 0.72 });
      const lines = wrapText(header, width - 8, 7.6).slice(0, 2);
      lines.forEach((line, lineIndex) => pdf.text(page, line, x + 4, tableTop + 13 + lineIndex * 9.5, 7.6, true));
      x += width;
    });

    table.rows.forEach((row, rowIndex) => {
      const yTop = tableTop + headerHeight + rowIndex * rowHeight;
      x = margin;
      row.forEach((cell, colIndex) => {
        const width = widths[colIndex] || otherColumn;
        const isFull = /COMPLETO|SLOT CHIUSO|NESSUNA BARCA|100%/i.test(cell);
        pdf.rect(page, x, yTop, width, rowHeight, { fillGray: isFull ? 0.955 : null, strokeGray: 0.82 });
        const fontSize = colIndex === 0 ? firstFont : bodyFont;
        const lines = wrapText(cell, width - 8, fontSize).slice(0, rowHeight < 35 ? 2 : 3);
        lines.forEach((line, lineIndex) => pdf.text(page, line, x + 4, yTop + 13 + lineIndex * 9.3, fontSize, lineIndex === 0));
        x += width;
      });
    });

    downloadBlob(pdf.blob(), `occupazione-slot-prove-barche-${fileStamp()}.pdf`);
  }
'''
replace_once('boat-booking-pdf-export.js', old_export, new_export, 'single page matrix PDF')

# New reports module
Path('boat-booking-admin-reports.js').write_text(r'''(() => {
  const excelButton = document.querySelector('[data-export-bookings-xlsx]');
  const societyContainer = document.querySelector('[data-admin-society-report]');
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

  function renderSocietyReport() {
    if (!societyContainer) return;
    const bookings = Array.isArray(state?.bookings) ? state.bookings : [];
    if (!bookings.length) {
      societyContainer.innerHTML = '<div class="booking-empty">Nessuna società ha ancora effettuato prenotazioni.</div>';
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

  function buildXlsx(rows) {
    const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;
    const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
    const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Prenotazioni" sheetId="1" r:id="rId1"/></sheets></workbook>`;
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

  window.addEventListener('boat-booking-admin:data', (event) => {
    state = event.detail || null;
    renderSocietyReport();
  });

  excelButton?.addEventListener('click', exportExcel);
  if (state) renderSocietyReport();
})();
''', encoding='utf-8')

from pathlib import Path


def replace_once(path, old, new, label):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'Anchor not found: {label} in {path}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')


# --- Admin HTML: report menu styles ---
replace_once(
    'admin-prenotazioni-barche.html',
    '''    .admin-society-booking strong { color: #173e4b; }\n\n    @media (max-width: 760px) {\n''',
    '''    .admin-society-booking strong { color: #173e4b; }\n\n    .admin-report-nav {\n      display: grid;\n      grid-template-columns: repeat(3, minmax(0, 1fr));\n      gap: 8px;\n      margin: 22px 0 18px;\n      padding: 5px;\n      border-radius: 14px;\n      background: #edf3f5;\n    }\n    .admin-report-tab {\n      appearance: none;\n      min-height: 44px;\n      padding: 9px 12px;\n      border: 1px solid transparent;\n      border-radius: 10px;\n      background: transparent;\n      color: #52666c;\n      font: inherit;\n      font-size: .9rem;\n      font-weight: 800;\n      cursor: pointer;\n    }\n    .admin-report-tab:hover,\n    .admin-report-tab:focus-visible { color: #0b6478; background: rgba(255,255,255,.72); }\n    .admin-report-tab.is-active {\n      border-color: #d5e2e5;\n      background: #fff;\n      color: #173e4b;\n      box-shadow: 0 2px 8px rgba(16,34,53,.08);\n    }\n    .admin-report-tab:focus-visible { outline: 2px solid #0b6478; outline-offset: 2px; }\n    .admin-report-panel[hidden] { display: none !important; }\n    .admin-report-panel { min-width: 0; }\n    .admin-report-panel__head {\n      display: flex;\n      align-items: flex-start;\n      justify-content: space-between;\n      gap: 16px;\n      flex-wrap: wrap;\n      margin-bottom: 16px;\n    }\n    .admin-report-panel__copy { max-width: 720px; }\n    .admin-report-panel__copy h3 { margin: 0 0 5px; color: #173e4b; font-size: 1.1rem; }\n    .admin-report-panel__copy p { margin: 0; }\n    .admin-report-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }\n\n    .admin-slot-report { display: grid; gap: 14px; }\n    .admin-slot-card {\n      padding: 18px;\n      border: 1px solid #dfe8ea;\n      border-radius: 16px;\n      background: #fff;\n    }\n    .admin-slot-card__head {\n      display: flex;\n      align-items: flex-start;\n      justify-content: space-between;\n      gap: 14px;\n      flex-wrap: wrap;\n      padding-bottom: 12px;\n      border-bottom: 1px solid #e7edef;\n    }\n    .admin-slot-card__head h3 { margin: 0; color: #173e4b; font-size: 1.2rem; }\n    .admin-slot-card__stats { display: flex; gap: 7px; flex-wrap: wrap; }\n    .admin-slot-card__stat {\n      padding: 5px 9px;\n      border-radius: 999px;\n      background: #edf6f8;\n      color: #0b6478;\n      font-size: .78rem;\n      font-weight: 800;\n    }\n    .admin-slot-bookings { display: grid; gap: 8px; margin-top: 14px; }\n    .admin-slot-booking {\n      display: grid;\n      grid-template-columns: minmax(180px, .9fr) minmax(180px, 1fr) minmax(0, 1.7fr);\n      gap: 12px;\n      align-items: start;\n      padding: 10px 12px;\n      border-radius: 11px;\n      background: #f7fafb;\n      color: #334b52;\n      font-size: .88rem;\n      line-height: 1.4;\n    }\n    .admin-slot-booking strong { color: #173e4b; }\n\n    @media (max-width: 760px) {\n      .admin-report-nav { grid-template-columns: 1fr; }\n      .admin-society-booking,\n      .admin-slot-booking { grid-template-columns: 1fr; gap: 4px; }\n''',
    'report menu styles'
)

# Remove duplicate old mobile rule now included in replacement.
replace_once(
    'admin-prenotazioni-barche.html',
    '''      .admin-society-booking { grid-template-columns: 1fr; gap: 4px; }\n    }\n\n    @media (max-width: 640px) {\n''',
    '''    }\n\n    @media (max-width: 640px) {\n''',
    'old society mobile rule'
)

# --- Admin HTML: consolidate report sections ---
old_sections = '''          <details class="booking-card admin-collapsible">\n            <summary>Occupazione per slot</summary>\n            <div class="admin-collapsible__body">\n              <div class="admin-export-row">\n                <p class="booking-card__intro">Valori nel formato prenotate / barche attive censite.</p>\n                <button class="admin-button admin-export-button" data-export-matrix-pdf type="button">Esporta PDF</button>\n              </div>\n              <div class="admin-matrix-wrap" data-admin-matrix style="margin-top:18px"></div>\n            </div>\n          </details>\n\n          <details class="booking-card admin-collapsible">\n            <summary>Report per società</summary>\n            <div class="admin-collapsible__body">\n              <p class="booking-card__intro">Una scheda riepilogativa per ogni società che ha effettuato almeno una prenotazione.</p>\n              <div class="admin-society-report" data-admin-society-report style="margin-top:18px"></div>\n            </div>\n          </details>\n'''

new_sections = '''          <details class="booking-card admin-collapsible" data-admin-reports-menu>\n            <summary>Report</summary>\n            <div class="admin-collapsible__body">\n              <div class="admin-report-nav" role="tablist" aria-label="Report prenotazioni">\n                <button class="admin-report-tab is-active" type="button" role="tab" aria-selected="true" data-report-target="occupancy">Occupazione slot</button>\n                <button class="admin-report-tab" type="button" role="tab" aria-selected="false" data-report-target="society">Report per società</button>\n                <button class="admin-report-tab" type="button" role="tab" aria-selected="false" data-report-target="slot">Report per slot</button>\n              </div>\n\n              <section class="admin-report-panel" data-report-panel="occupancy">\n                <div class="admin-report-panel__head">\n                  <div class="admin-report-panel__copy">\n                    <h3>Occupazione slot</h3>\n                    <p class="booking-card__intro">Riempimento complessivo dello slot e dettaglio prenotate / barche attive censite per cantiere e tipo.</p>\n                  </div>\n                  <div class="admin-report-actions">\n                    <button class="admin-button admin-export-button" data-export-matrix-pdf type="button">PDF</button>\n                    <button class="admin-button admin-export-button" data-export-occupancy-xlsx type="button">Excel</button>\n                  </div>\n                </div>\n                <div class="admin-matrix-wrap" data-admin-matrix></div>\n              </section>\n\n              <section class="admin-report-panel" data-report-panel="society" hidden>\n                <div class="admin-report-panel__head">\n                  <div class="admin-report-panel__copy">\n                    <h3>Report per società</h3>\n                    <p class="booking-card__intro">Una scheda riepilogativa per ogni società con prenotazioni, slot, referenti e barche assegnate.</p>\n                  </div>\n                  <div class="admin-report-actions">\n                    <button class="admin-button admin-export-button" data-export-society-pdf type="button">PDF</button>\n                    <button class="admin-button admin-export-button" data-export-society-xlsx type="button">Excel</button>\n                  </div>\n                </div>\n                <div class="admin-society-report" data-admin-society-report></div>\n              </section>\n\n              <section class="admin-report-panel" data-report-panel="slot" hidden>\n                <div class="admin-report-panel__head">\n                  <div class="admin-report-panel__copy">\n                    <h3>Report per slot</h3>\n                    <p class="booking-card__intro">Riepilogo operativo di ogni fascia oraria con società, referenti, prenotazioni e barche assegnate.</p>\n                  </div>\n                  <div class="admin-report-actions">\n                    <button class="admin-button admin-export-button" data-export-slot-pdf type="button">PDF</button>\n                    <button class="admin-button admin-export-button" data-export-slot-xlsx type="button">Excel</button>\n                  </div>\n                </div>\n                <div class="admin-slot-report" data-admin-slot-report></div>\n              </section>\n            </div>\n          </details>\n'''
replace_once('admin-prenotazioni-barche.html', old_sections, new_sections, 'report sections')

replace_once(
    'admin-prenotazioni-barche.html',
    '''  <script src="boat-booking-admin-reports.js" defer></script>\n''',
    '''  <script src="boat-booking-admin-reports.js" defer></script>\n  <script src="boat-booking-report-menu.js" defer></script>\n''',
    'report menu script tag'
)

# --- Expose PDF helpers to the report menu ---
replace_once(
    'boat-booking-pdf-export.js',
    '''  bookingButton?.addEventListener('click', exportBookings);\n  matrixButton?.addEventListener('click', exportMatrix);\n})();\n''',
    '''  window.BoatBookingPdfTools = { SimplePdf, downloadBlob, wrapText, exportStamp, fileStamp };\n\n  bookingButton?.addEventListener('click', exportBookings);\n  matrixButton?.addEventListener('click', exportMatrix);\n})();\n''',
    'pdf tools export'
)

# --- Let XLSX helper use report-specific sheet names and expose it ---
replace_once(
    'boat-booking-admin-reports.js',
    '''  function buildXlsx(rows) {\n''',
    '''  function buildXlsx(rows, sheetName = 'Prenotazioni') {\n''',
    'xlsx sheet name function'
)
replace_once(
    'boat-booking-admin-reports.js',
    '''    const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Prenotazioni" sheetId="1" r:id="rId1"/></sheets></workbook>`;\n''',
    '''    const safeSheetName = xmlEscape(String(sheetName || 'Prenotazioni').replace(/[\\\\/*?:[\\]]/g, ' ').slice(0, 31) || 'Prenotazioni');\n    const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${safeSheetName}" sheetId="1" r:id="rId1"/></sheets></workbook>`;\n''',
    'xlsx workbook sheet name'
)
replace_once(
    'boat-booking-admin-reports.js',
    '''  window.addEventListener('boat-booking-admin:data', (event) => {\n''',
    '''  window.BoatBookingXlsxTools = { buildXlsx, downloadBlob, fileStamp };\n\n  window.addEventListener('boat-booking-admin:data', (event) => {\n''',
    'xlsx tools export'
)

# --- New report menu behavior and report-specific exports ---
Path('boat-booking-report-menu.js').write_text(r'''(() => {
  const tabs = Array.from(document.querySelectorAll('[data-report-target]'));
  const panels = Array.from(document.querySelectorAll('[data-report-panel]'));
  const slotContainer = document.querySelector('[data-admin-slot-report]');
  const occupancyExcelButton = document.querySelector('[data-export-occupancy-xlsx]');
  const societyPdfButton = document.querySelector('[data-export-society-pdf]');
  const societyExcelButton = document.querySelector('[data-export-society-xlsx]');
  const slotPdfButton = document.querySelector('[data-export-slot-pdf]');
  const slotExcelButton = document.querySelector('[data-export-slot-xlsx]');

  if (!tabs.length && !slotContainer) return;

  const fallbackSlots = [
    ['1400', '14:00–14:20'], ['1430', '14:30–14:50'], ['1500', '15:00–15:20'],
    ['1530', '15:30–15:50'], ['1600', '16:00–16:20'], ['1630', '16:30–16:50'],
    ['1700', '17:00–17:20'], ['1730', '17:30–17:50'], ['1800', '18:00–18:20']
  ];

  let state = window.boatBookingAdminData || null;

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function cleanText(value) {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
  }

  function slotList() {
    if (state?.slots?.length) {
      return [...state.slots]
        .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0))
        .map((slot) => ({ code: slot.code, label: slot.label || slot.code, active: slot.active !== false }));
    }
    return fallbackSlots.map(([code, label]) => ({ code, label, active: true }));
  }

  function slotLabel(code) {
    return slotList().find((slot) => slot.code === code)?.label || code || '—';
  }

  function bookingTotal(booking) {
    return (booking.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  }

  function itemsSummary(booking) {
    return (booking.items || []).map((item) => {
      const numbers = Array.isArray(item.boatNumbers) && item.boatNumbers.length ? ` — barche ${item.boatNumbers.join(', ')}` : '';
      return `${item.builder} ${item.boatType} × ${Number(item.quantity || 0)}${numbers}`;
    }).join(' · ') || 'Nessuna barca';
  }

  function contactSummary(booking) {
    const name = `${booking.contactSurname || ''} ${booking.contactName || ''}`.trim();
    return [name, booking.phone, booking.email].filter(Boolean).join(' · ');
  }

  function formatDate(value) {
    if (!value) return '';
    try {
      return new Intl.DateTimeFormat('it-IT', {
        timeZone: 'Europe/Rome', dateStyle: 'short', timeStyle: 'short'
      }).format(new Date(value));
    } catch {
      return String(value);
    }
  }

  function setActiveReport(target) {
    tabs.forEach((button) => {
      const active = button.dataset.reportTarget === target;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.reportPanel !== target;
    });
  }

  tabs.forEach((button) => button.addEventListener('click', () => setActiveReport(button.dataset.reportTarget)));

  function renderSlotReport() {
    if (!slotContainer) return;
    const bookings = Array.isArray(state?.bookings) ? state.bookings : [];
    const slots = slotList();

    slotContainer.innerHTML = slots.map((slot) => {
      const slotBookings = bookings
        .filter((booking) => booking.slotCode === slot.code)
        .sort((a, b) => String(a.society || '').localeCompare(String(b.society || ''), 'it-IT', { sensitivity: 'base' }));
      const societies = new Set(slotBookings.map((booking) => cleanText(booking.society).toLocaleLowerCase('it-IT')).filter(Boolean)).size;
      const totalBoats = slotBookings.reduce((sum, booking) => sum + bookingTotal(booking), 0);

      return `
        <article class="admin-slot-card">
          <div class="admin-slot-card__head">
            <h3>${escapeHtml(slot.label)}${slot.active ? '' : ' — CHIUSO'}</h3>
            <div class="admin-slot-card__stats">
              <span class="admin-slot-card__stat">${slotBookings.length} prenotazion${slotBookings.length === 1 ? 'e' : 'i'}</span>
              <span class="admin-slot-card__stat">${societies} societ${societies === 1 ? 'à' : 'à'}</span>
              <span class="admin-slot-card__stat">${totalBoats} barc${totalBoats === 1 ? 'a' : 'he'}</span>
            </div>
          </div>
          ${slotBookings.length ? `
            <div class="admin-slot-bookings">
              ${slotBookings.map((booking) => `
                <div class="admin-slot-booking">
                  <strong>${escapeHtml(booking.society || 'Società')}</strong>
                  <span>${escapeHtml(booking.bookingCode || '')}<br>${escapeHtml(contactSummary(booking))}</span>
                  <span>${escapeHtml(itemsSummary(booking))}</span>
                </div>`).join('')}
            </div>` : '<div class="booking-empty" style="margin-top:14px">Nessuna prenotazione in questo slot.</div>'}
        </article>`;
    }).join('');
  }

  function reportCategories() {
    const categories = new Map();
    (state?.availability || []).forEach((row) => {
      if (!row?.builder || !row?.boatType) return;
      categories.set(`${row.builder}|${row.boatType}`, [row.builder, row.boatType]);
    });
    (state?.boats || []).forEach((boat) => {
      if (!boat?.builder || !boat?.boatType) return;
      categories.set(`${boat.builder}|${boat.boatType}`, [boat.builder, boat.boatType]);
    });
    return Array.from(categories.values()).sort((a, b) => a[0].localeCompare(b[0], 'it-IT') || a[1].localeCompare(b[1], 'it-IT'));
  }

  function availabilityRow(slotCode, builder, boatType) {
    return (state?.availability || []).find((row) => row.slotCode === slotCode && row.builder === builder && row.boatType === boatType) || null;
  }

  function occupancyRows() {
    const rows = [[
      'Codice slot', 'Slot', 'Stato slot', 'Prenotate totali', 'Capacità totale', 'Residue totali', 'Riempimento %',
      'Cantiere', 'Tipo barca', 'Prenotate', 'Capacità', 'Residue'
    ]];
    const categories = reportCategories();
    slotList().forEach((slot) => {
      const details = categories.map(([builder, boatType]) => {
        const row = availabilityRow(slot.code, builder, boatType) || { booked: 0, capacity: 0, remaining: 0 };
        return { builder, boatType, booked: Number(row.booked || 0), capacity: Number(row.capacity || 0), remaining: Number(row.remaining || 0) };
      });
      const totals = details.reduce((acc, row) => {
        acc.booked += row.booked;
        acc.capacity += row.capacity;
        acc.remaining += row.remaining;
        return acc;
      }, { booked: 0, capacity: 0, remaining: 0 });
      const fill = totals.capacity ? Math.round((totals.booked / totals.capacity) * 100) : 0;
      (details.length ? details : [{ builder: '', boatType: '', booked: 0, capacity: 0, remaining: 0 }]).forEach((row) => rows.push([
        slot.code, slot.label, slot.active ? 'Aperto' : 'Chiuso', totals.booked, totals.capacity, totals.remaining, fill,
        row.builder, row.boatType, row.booked, row.capacity, row.remaining
      ]));
    });
    return rows;
  }

  function societyRows() {
    const rows = [[
      'Società', 'Codice prenotazione', 'Codice slot', 'Slot', 'Cognome referente', 'Nome referente', 'Telefono', 'Email',
      'Cantiere', 'Tipo barca', 'Quantità', 'Numeri barche', 'Totale barche prenotazione', 'Creata il', 'Aggiornata il'
    ]];
    const bookings = [...(state?.bookings || [])].sort((a, b) => String(a.society || '').localeCompare(String(b.society || ''), 'it-IT', { sensitivity: 'base' }) || slotLabel(a.slotCode).localeCompare(slotLabel(b.slotCode), 'it-IT'));
    bookings.forEach((booking) => {
      const items = booking.items?.length ? booking.items : [null];
      items.forEach((item) => rows.push([
        booking.society || '', booking.bookingCode || '', booking.slotCode || '', slotLabel(booking.slotCode),
        booking.contactSurname || '', booking.contactName || '', booking.phone || '', booking.email || '',
        item?.builder || '', item?.boatType || '', Number(item?.quantity || 0),
        Array.isArray(item?.boatNumbers) ? item.boatNumbers.join(', ') : '', bookingTotal(booking),
        formatDate(booking.createdAt), formatDate(booking.updatedAt)
      ]));
    });
    return rows;
  }

  function slotRows() {
    const rows = [[
      'Codice slot', 'Slot', 'Stato slot', 'Società', 'Codice prenotazione', 'Cognome referente', 'Nome referente',
      'Telefono', 'Email', 'Cantiere', 'Tipo barca', 'Quantità', 'Numeri barche', 'Totale barche prenotazione'
    ]];
    slotList().forEach((slot) => {
      const bookings = (state?.bookings || [])
        .filter((booking) => booking.slotCode === slot.code)
        .sort((a, b) => String(a.society || '').localeCompare(String(b.society || ''), 'it-IT', { sensitivity: 'base' }));
      bookings.forEach((booking) => {
        const items = booking.items?.length ? booking.items : [null];
        items.forEach((item) => rows.push([
          slot.code, slot.label, slot.active ? 'Aperto' : 'Chiuso', booking.society || '', booking.bookingCode || '',
          booking.contactSurname || '', booking.contactName || '', booking.phone || '', booking.email || '',
          item?.builder || '', item?.boatType || '', Number(item?.quantity || 0),
          Array.isArray(item?.boatNumbers) ? item.boatNumbers.join(', ') : '', bookingTotal(booking)
        ]));
      });
    });
    return rows;
  }

  function exportXlsx(rows, sheetName, filename) {
    const tools = window.BoatBookingXlsxTools;
    if (!tools?.buildXlsx || !tools?.downloadBlob) {
      window.alert('Esportazione Excel non disponibile. Ricarica la pagina e riprova.');
      return;
    }
    if (rows.length <= 1) {
      window.alert('Non ci sono dati da esportare.');
      return;
    }
    tools.downloadBlob(tools.buildXlsx(rows, sheetName), `${filename}-${tools.fileStamp()}.xlsx`);
  }

  function pdfContext(title, landscape = false) {
    const tools = window.BoatBookingPdfTools;
    if (!tools?.SimplePdf) {
      window.alert('Esportazione PDF non disponibile. Ricarica la pagina e riprova.');
      return null;
    }
    const pdf = landscape ? new tools.SimplePdf(841.89, 595.28) : new tools.SimplePdf(595.28, 841.89);
    const margin = landscape ? 32 : 36;
    let page = null;
    let y = 0;

    function newPage(continuation = false) {
      page = pdf.addPage();
      y = 38;
      pdf.text(page, 'Campionati Italiani Coastal Rowing 2026 - Pesaro', margin, y, 8.5, true);
      y += 21;
      pdf.text(page, continuation ? `${title} - continuazione` : title, margin, y, 16, true);
      y += 17;
      pdf.text(page, `Esportato il ${tools.exportStamp()}`, margin, y, 8.2);
      y += 18;
      pdf.line(page, margin, y, pdf.width - margin, y, .82, .5);
      y += 16;
    }

    function ensure(height) {
      if (!page) newPage(false);
      if (y + height > pdf.height - 34) newPage(true);
    }

    function text(value, size = 8.7, bold = false, indent = 0, maxWidth = null) {
      const width = maxWidth || pdf.width - margin * 2 - indent;
      const lines = tools.wrapText(value, width, size);
      const lineHeight = size + 3;
      ensure(lines.length * lineHeight + 2);
      lines.forEach((line) => {
        pdf.text(page, line, margin + indent, y, size, bold);
        y += lineHeight;
      });
    }

    function gap(value = 7) { y += value; }
    function rule() { ensure(10); pdf.line(page, margin, y, pdf.width - margin, y, .88, .45); y += 10; }
    newPage(false);
    return { pdf, tools, margin, text, gap, rule, ensure, get page() { return page; }, get y() { return y; }, set y(value) { y = value; } };
  }

  function exportSocietyPdf() {
    const bookings = Array.isArray(state?.bookings) ? state.bookings : [];
    if (!bookings.length) {
      window.alert('Non ci sono prenotazioni da esportare.');
      return;
    }
    const ctx = pdfContext('Report prenotazioni per società');
    if (!ctx) return;
    const groups = new Map();
    bookings.forEach((booking) => {
      const name = cleanText(booking.society) || 'Società';
      const key = name.toLocaleLowerCase('it-IT');
      if (!groups.has(key)) groups.set(key, { name, bookings: [] });
      groups.get(key).bookings.push(booking);
    });

    Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name, 'it-IT', { sensitivity: 'base' })).forEach((group, groupIndex) => {
      const ordered = [...group.bookings].sort((a, b) => slotLabel(a.slotCode).localeCompare(slotLabel(b.slotCode), 'it-IT'));
      const totalBoats = ordered.reduce((sum, booking) => sum + bookingTotal(booking), 0);
      const slotCount = new Set(ordered.map((booking) => booking.slotCode)).size;
      ctx.ensure(54);
      ctx.text(group.name, 12, true);
      ctx.text(`${ordered.length} prenotazioni · ${slotCount} slot · ${totalBoats} barche`, 8.5);
      const contacts = Array.from(new Set(ordered.map(contactSummary).filter(Boolean)));
      if (contacts.length) ctx.text(`Referenti: ${contacts.join(' | ')}`, 8.2);
      ctx.gap(3);
      ordered.forEach((booking) => {
        ctx.text(`${slotLabel(booking.slotCode)} · ${booking.bookingCode || ''}`, 9, true, 8);
        ctx.text(`${contactSummary(booking)} · ${itemsSummary(booking)}`, 8.2, false, 8);
        ctx.gap(3);
      });
      if (groupIndex < groups.size - 1) ctx.rule();
    });

    ctx.tools.downloadBlob(ctx.pdf.blob(), `report-societa-prove-barche-${ctx.tools.fileStamp()}.pdf`);
  }

  function exportSlotPdf() {
    const ctx = pdfContext('Report prenotazioni per slot');
    if (!ctx) return;
    const bookings = Array.isArray(state?.bookings) ? state.bookings : [];
    slotList().forEach((slot, slotIndex, slots) => {
      const slotBookings = bookings
        .filter((booking) => booking.slotCode === slot.code)
        .sort((a, b) => String(a.society || '').localeCompare(String(b.society || ''), 'it-IT', { sensitivity: 'base' }));
      const totalBoats = slotBookings.reduce((sum, booking) => sum + bookingTotal(booking), 0);
      const societies = new Set(slotBookings.map((booking) => cleanText(booking.society).toLocaleLowerCase('it-IT')).filter(Boolean)).size;
      ctx.ensure(50);
      ctx.text(`${slot.label}${slot.active ? '' : ' - CHIUSO'}`, 12, true);
      ctx.text(`${slotBookings.length} prenotazioni · ${societies} società · ${totalBoats} barche`, 8.5);
      ctx.gap(3);
      if (!slotBookings.length) {
        ctx.text('Nessuna prenotazione.', 8.2, false, 8);
      } else {
        slotBookings.forEach((booking) => {
          ctx.text(`${booking.society || 'Società'} · ${booking.bookingCode || ''}`, 9, true, 8);
          ctx.text(`${contactSummary(booking)} · ${itemsSummary(booking)}`, 8.2, false, 8);
          ctx.gap(3);
        });
      }
      if (slotIndex < slots.length - 1) ctx.rule();
    });
    ctx.tools.downloadBlob(ctx.pdf.blob(), `report-slot-prove-barche-${ctx.tools.fileStamp()}.pdf`);
  }

  occupancyExcelButton?.addEventListener('click', () => exportXlsx(occupancyRows(), 'Occupazione slot', 'occupazione-slot-prove-barche'));
  societyExcelButton?.addEventListener('click', () => exportXlsx(societyRows(), 'Report società', 'report-societa-prove-barche'));
  slotExcelButton?.addEventListener('click', () => exportXlsx(slotRows(), 'Report slot', 'report-slot-prove-barche'));
  societyPdfButton?.addEventListener('click', exportSocietyPdf);
  slotPdfButton?.addEventListener('click', exportSlotPdf);

  window.addEventListener('boat-booking-admin:data', (event) => {
    state = event.detail || null;
    renderSlotReport();
  });

  if (state) renderSlotReport();
  setActiveReport('occupancy');
})();
''', encoding='utf-8')

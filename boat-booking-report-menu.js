(() => {
  const tabs = Array.from(document.querySelectorAll('[data-report-target]'));
  const panels = Array.from(document.querySelectorAll('[data-report-panel]'));
  const slotContainer = document.querySelector('[data-admin-slot-report]');
  const reportOverview = document.querySelector('[data-admin-report-overview]');
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

  function selectedSocietyKey() {
    return cleanText(document.querySelector('[data-report-society-filter]')?.value).toLocaleLowerCase('it-IT');
  }

  function societyReportBookings() {
    const selected = selectedSocietyKey();
    return (Array.isArray(state?.bookings) ? state.bookings : [])
      .filter((booking) => !selected || cleanText(booking.society).toLocaleLowerCase('it-IT') === selected);
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
    (state?.bookings || []).forEach((booking) => {
      (booking.items || []).forEach((item) => {
        if (!item?.builder || !item?.boatType) return;
        categories.set(`${item.builder}|${item.boatType}`, [item.builder, item.boatType]);
      });
    });
    return Array.from(categories.values()).sort((a, b) => a[0].localeCompare(b[0], 'it-IT') || a[1].localeCompare(b[1], 'it-IT'));
  }

  function renderReportOverview() {
    if (!reportOverview) return;
    const bookings = Array.isArray(state?.bookings) ? state.bookings : [];
    const societyCount = new Set(
      bookings.map((booking) => cleanText(booking.society).toLocaleLowerCase('it-IT')).filter(Boolean)
    ).size;

    const categoryTotals = new Map(
      reportCategories().map(([builder, boatType]) => [
        `${builder}|${boatType}`,
        { builder, boatType, quantity: 0 }
      ])
    );

    bookings.forEach((booking) => {
      (booking.items || []).forEach((item) => {
        if (!item?.builder || !item?.boatType) return;
        const key = `${item.builder}|${item.boatType}`;
        if (!categoryTotals.has(key)) {
          categoryTotals.set(key, { builder: item.builder, boatType: item.boatType, quantity: 0 });
        }
        categoryTotals.get(key).quantity += Number(item.quantity || 0);
      });
    });

    const categories = Array.from(categoryTotals.values()).sort((a, b) =>
      a.builder.localeCompare(b.builder, 'it-IT') || a.boatType.localeCompare(b.boatType, 'it-IT')
    );

    reportOverview.innerHTML = `
      <span class="admin-report-overview__item admin-report-overview__item--societies"><strong>${societyCount}</strong> società</span>
      ${categories.length ? '<span class="admin-report-overview__label">Barche prenotate</span>' : ''}
      ${categories.map((item) => `
        <span class="admin-report-overview__item"><strong>${item.quantity}</strong> ${escapeHtml(item.builder)} ${escapeHtml(item.boatType)}</span>
      `).join('')}
    `;
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
    const bookings = [...societyReportBookings()].sort((a, b) => String(a.society || '').localeCompare(String(b.society || ''), 'it-IT', { sensitivity: 'base' }) || slotLabel(a.slotCode).localeCompare(slotLabel(b.slotCode), 'it-IT'));
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
    const bookings = societyReportBookings();
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
      ctx.text(group.name, 16, true);
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
      ctx.text(`${slot.label}${slot.active ? '' : ' - CHIUSO'}`, 16, true);
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
    renderReportOverview();
    renderSlotReport();
  });

  if (state) {
    renderReportOverview();
    renderSlotReport();
  }
  setActiveReport('occupancy');
})();

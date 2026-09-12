from pathlib import Path


def replace_once(path, old, new, label):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'Anchor not found: {label} in {path}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')


# --- HTML/CSS: mobile export buttons in one row + society filter control ---
replace_once(
    'admin-prenotazioni-barche.html',
    '''    .admin-report-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }\n''',
    '''    .admin-report-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }\n    .admin-report-filter {\n      display: grid;\n      grid-template-columns: minmax(220px, 360px);\n      margin: 0 0 16px;\n    }\n    .admin-report-filter label {\n      display: grid;\n      gap: 6px;\n      color: #52666c;\n      font-size: .86rem;\n      font-weight: 800;\n    }\n    .admin-report-filter select {\n      min-height: 42px;\n      border: 1px solid #bccbd0;\n      border-radius: 9px;\n      padding: 7px 10px;\n      background: #fff;\n      color: #173e4b;\n      font: inherit;\n    }\n''',
    'report filter styles'
)

replace_once(
    'admin-prenotazioni-barche.html',
    '''      .admin-section-heading,\n      .admin-export-row { align-items: stretch; }\n      .admin-export-button { min-height: 44px; }\n''',
    '''      .admin-section-heading,\n      .admin-export-row { align-items: stretch; }\n      .admin-export-button { min-height: 44px; }\n      .admin-report-actions {\n        width: 100%;\n        display: grid;\n        grid-template-columns: repeat(2, minmax(0, 1fr));\n        gap: 8px;\n      }\n      .admin-report-actions .admin-export-button {\n        width: auto;\n        min-width: 0;\n      }\n      .admin-report-filter { grid-template-columns: 1fr; }\n''',
    'mobile report export layout'
)

replace_once(
    'admin-prenotazioni-barche.html',
    '''    @media (max-width: 420px) {\n      .admin-booking__actions { grid-template-columns: 1fr; }\n      .admin-export-button { width: 100%; }\n    }\n''',
    '''    @media (max-width: 420px) {\n      .admin-booking__actions { grid-template-columns: 1fr; }\n      .admin-export-button { width: 100%; }\n      .admin-report-actions .admin-export-button { width: auto; }\n    }\n''',
    'small mobile report export override'
)

replace_once(
    'admin-prenotazioni-barche.html',
    '''              </div>\n              <div class="admin-society-report" data-admin-society-report></div>\n            </section>\n''',
    '''              </div>\n              <div class="admin-report-filter">\n                <label for="reportSocietyFilter">Società\n                  <select id="reportSocietyFilter" data-report-society-filter>\n                    <option value="">Tutte le società</option>\n                  </select>\n                </label>\n              </div>\n              <div class="admin-society-report" data-admin-society-report></div>\n            </section>\n''',
    'society report filter markup'
)

# --- Admin report cards: populate/filter society view ---
replace_once(
    'boat-booking-admin-reports.js',
    '''  const societyContainer = document.querySelector('[data-admin-society-report]');\n  if (!excelButton && !societyContainer) return;\n''',
    '''  const societyContainer = document.querySelector('[data-admin-society-report]');\n  const societyReportFilter = document.querySelector('[data-report-society-filter]');\n  if (!excelButton && !societyContainer) return;\n''',
    'society filter selector'
)

replace_once(
    'boat-booking-admin-reports.js',
    '''  function renderSocietyReport() {\n    if (!societyContainer) return;\n    const bookings = Array.isArray(state?.bookings) ? state.bookings : [];\n    if (!bookings.length) {\n      societyContainer.innerHTML = '<div class="booking-empty">Nessuna società ha ancora effettuato prenotazioni.</div>';\n      return;\n    }\n''',
    '''  function societyKey(value) {\n    return String(value ?? '').trim().toLocaleLowerCase('it-IT');\n  }\n\n  function syncSocietyReportFilter() {\n    if (!societyReportFilter) return;\n    const current = societyReportFilter.value;\n    const names = Array.from(new Map((state?.bookings || []).map((booking) => {\n      const name = String(booking.society || '').trim();\n      return [societyKey(name), name];\n    }).filter(([key]) => key)).values())\n      .sort((a, b) => a.localeCompare(b, 'it-IT', { sensitivity: 'base' }));\n\n    societyReportFilter.innerHTML = '<option value="">Tutte le società</option>' + names\n      .map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`)\n      .join('');\n\n    if (names.some((name) => societyKey(name) === societyKey(current))) {\n      societyReportFilter.value = names.find((name) => societyKey(name) === societyKey(current)) || '';\n    }\n  }\n\n  function renderSocietyReport() {\n    if (!societyContainer) return;\n    const selectedSociety = societyKey(societyReportFilter?.value);\n    const bookings = (Array.isArray(state?.bookings) ? state.bookings : [])\n      .filter((booking) => !selectedSociety || societyKey(booking.society) === selectedSociety);\n    if (!bookings.length) {\n      societyContainer.innerHTML = `<div class="booking-empty">${selectedSociety ? 'Nessuna prenotazione per la società selezionata.' : 'Nessuna società ha ancora effettuato prenotazioni.'}</div>`;\n      return;\n    }\n''',
    'society filter rendering'
)

replace_once(
    'boat-booking-admin-reports.js',
    '''  window.addEventListener('boat-booking-admin:data', (event) => {\n    state = event.detail || null;\n    renderSocietyReport();\n  });\n\n  excelButton?.addEventListener('click', exportExcel);\n  if (state) renderSocietyReport();\n''',
    '''  window.addEventListener('boat-booking-admin:data', (event) => {\n    state = event.detail || null;\n    syncSocietyReportFilter();\n    renderSocietyReport();\n  });\n\n  societyReportFilter?.addEventListener('change', renderSocietyReport);\n  excelButton?.addEventListener('click', exportExcel);\n  if (state) {\n    syncSocietyReportFilter();\n    renderSocietyReport();\n  }\n''',
    'society filter events'
)

# --- Report menu: society filter also controls society PDF/XLSX; larger PDF headings ---
replace_once(
    'boat-booking-report-menu.js',
    '''  function contactSummary(booking) {\n    const name = `${booking.contactSurname || ''} ${booking.contactName || ''}`.trim();\n    return [name, booking.phone, booking.email].filter(Boolean).join(' · ');\n  }\n''',
    '''  function contactSummary(booking) {\n    const name = `${booking.contactSurname || ''} ${booking.contactName || ''}`.trim();\n    return [name, booking.phone, booking.email].filter(Boolean).join(' · ');\n  }\n\n  function selectedSocietyKey() {\n    return cleanText(document.querySelector('[data-report-society-filter]')?.value).toLocaleLowerCase('it-IT');\n  }\n\n  function societyReportBookings() {\n    const selected = selectedSocietyKey();\n    return (Array.isArray(state?.bookings) ? state.bookings : [])\n      .filter((booking) => !selected || cleanText(booking.society).toLocaleLowerCase('it-IT') === selected);\n  }\n''',
    'society export filter helper'
)

replace_once(
    'boat-booking-report-menu.js',
    '''    const bookings = [...(state?.bookings || [])].sort((a, b) => String(a.society || '').localeCompare(String(b.society || ''), 'it-IT', { sensitivity: 'base' }) || slotLabel(a.slotCode).localeCompare(slotLabel(b.slotCode), 'it-IT'));\n''',
    '''    const bookings = [...societyReportBookings()].sort((a, b) => String(a.society || '').localeCompare(String(b.society || ''), 'it-IT', { sensitivity: 'base' }) || slotLabel(a.slotCode).localeCompare(slotLabel(b.slotCode), 'it-IT'));\n''',
    'society excel filter'
)

replace_once(
    'boat-booking-report-menu.js',
    '''  function exportSocietyPdf() {\n    const bookings = Array.isArray(state?.bookings) ? state.bookings : [];\n''',
    '''  function exportSocietyPdf() {\n    const bookings = societyReportBookings();\n''',
    'society pdf filter'
)

replace_once(
    'boat-booking-report-menu.js',
    '''      ctx.text(group.name, 12, true);\n''',
    '''      ctx.text(group.name, 16, true);\n''',
    'society pdf heading size'
)

replace_once(
    'boat-booking-report-menu.js',
    '''      ctx.text(`${slot.label}${slot.active ? '' : ' - CHIUSO'}`, 12, true);\n''',
    '''      ctx.text(`${slot.label}${slot.active ? '' : ' - CHIUSO'}`, 16, true);\n''',
    'slot pdf heading size'
)

# --- Booking list export buttons: force PDF + Excel on one mobile row ---
replace_once(
    'boat-booking-admin-list-ux.js',
    '''      .admin-section-actions {\n        width: 100%;\n        justify-content: stretch;\n      }\n\n      .admin-section-actions .admin-button {\n        flex: 1 1 150px;\n      }\n''',
    '''      .admin-section-actions {\n        width: 100%;\n        display: grid;\n        grid-template-columns: repeat(2, minmax(0, 1fr));\n        gap: 8px;\n        justify-content: stretch;\n      }\n\n      .admin-section-actions .admin-button {\n        width: 100%;\n        min-width: 0;\n        flex: none;\n      }\n''',
    'mobile booking export row'
)

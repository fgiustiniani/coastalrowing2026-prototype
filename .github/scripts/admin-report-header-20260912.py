from pathlib import Path

HTML = Path('admin-prenotazioni-barche.html')
REPORT_JS = Path('boat-booking-report-menu.js')
LIST_UX = Path('boat-booking-admin-list-ux.js')


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'Anchor not found: {label}')
    return text.replace(old, new, 1)


# --- HTML: report first, bookings collapsible, report summary counters ---
s = HTML.read_text(encoding='utf-8')
if 'data-admin-report-overview' in s:
    raise SystemExit('Report overview already present')

s = replace_once(
    s,
    '    .admin-bookings-card { order: -1; }',
    '    .admin-bookings-card { order: 0; }',
    'bookings order'
)

css_anchor = '    .admin-report-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }\n'
css_extra = '''    .admin-report-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }\n\n    .admin-reports-summary {\n      flex-wrap: wrap;\n    }\n    .admin-reports-summary__title {\n      flex: 0 0 auto;\n      font-size: 1.02rem;\n    }\n    .admin-report-overview {\n      flex: 1 1 560px;\n      display: flex;\n      align-items: center;\n      justify-content: flex-end;\n      gap: 6px;\n      flex-wrap: wrap;\n      margin-left: auto;\n    }\n    .admin-report-overview__label {\n      color: #64757b;\n      font-size: .72rem;\n      font-weight: 800;\n      letter-spacing: .02em;\n      text-transform: uppercase;\n    }\n    .admin-report-overview__item {\n      display: inline-flex;\n      align-items: baseline;\n      gap: 4px;\n      padding: 5px 8px;\n      border-radius: 999px;\n      background: #edf6f8;\n      color: #52666c;\n      font-size: .74rem;\n      font-weight: 750;\n      white-space: nowrap;\n    }\n    .admin-report-overview__item strong {\n      color: #0b6478;\n      font-size: .86rem;\n    }\n    .admin-report-overview__item--societies {\n      background: #e7f1ec;\n      color: #365d4b;\n    }\n    .admin-report-overview__item--societies strong { color: #245d38; }\n'''
s = replace_once(s, css_anchor, css_extra, 'report summary styles')

media_anchor = '''    @media (max-width: 760px) {\n      .admin-report-nav { grid-template-columns: 1fr; }\n'''
media_repl = '''    @media (max-width: 760px) {\n      .admin-report-nav { grid-template-columns: 1fr; }\n      .admin-reports-summary__title { order: 1; }\n      .admin-reports-summary::after { order: 2; margin-left: auto; }\n      .admin-report-overview {\n        order: 3;\n        flex-basis: 100%;\n        justify-content: flex-start;\n        margin-left: 0;\n      }\n'''
s = replace_once(s, media_anchor, media_repl, 'report summary mobile styles')

booking_start_marker = '        <section class="booking-card admin-bookings-card">'
secondary_marker = '\n\n        <div class="admin-secondary-sections" aria-label="Altre funzioni amministrative">'
booking_start = s.index(booking_start_marker)
booking_end = s.index(secondary_marker, booking_start)
booking_block = s[booking_start:booking_end]

booking_block = replace_once(
    booking_block,
    booking_start_marker,
    '        <details class="booking-card admin-collapsible admin-bookings-card">',
    'booking details open'
)
booking_block = replace_once(
    booking_block,
    '          <div class="admin-section-heading">\n            <h2>Prenotazioni</h2>',
    '          <summary>Prenotazioni</summary>\n          <div class="admin-collapsible__body">\n            <div class="admin-section-heading">\n              <h2>Elenco prenotazioni</h2>',
    'booking summary/body'
)
closing_index = booking_block.rfind('        </section>')
if closing_index < 0:
    raise SystemExit('Booking closing section not found')
booking_block = booking_block[:closing_index] + '          </div>\n        </details>' + booking_block[closing_index + len('        </section>'):]

secondary_and_after = s[booking_end:]
report_start_marker = '          <details class="booking-card admin-collapsible" data-admin-reports-menu>'
settings_marker = '          <details class="booking-card admin-collapsible">\n            <summary>Impostazioni prenotazioni</summary>'
report_start = secondary_and_after.index(report_start_marker)
report_end = secondary_and_after.index(settings_marker, report_start)
report_block = secondary_and_after[report_start:report_end]
secondary_without_report = secondary_and_after[:report_start] + secondary_and_after[report_end:]

# Dedent report block by two spaces because it becomes a direct child of the dashboard.
report_block = '\n'.join(line[2:] if line.startswith('  ') else line for line in report_block.splitlines())
report_block = replace_once(
    report_block,
    '        <details class="booking-card admin-collapsible" data-admin-reports-menu>',
    '        <details class="booking-card admin-collapsible admin-reports-card" data-admin-reports-menu open>',
    'report details open'
)
report_block = replace_once(
    report_block,
    '          <summary>Report</summary>',
    '''          <summary class="admin-reports-summary">\n            <span class="admin-reports-summary__title">Report</span>\n            <span class="admin-report-overview" data-admin-report-overview aria-live="polite"></span>\n          </summary>''',
    'report overview header'
)

s = s[:booking_start] + report_block.rstrip() + '\n\n' + booking_block.rstrip() + secondary_without_report
HTML.write_text(s, encoding='utf-8')


# --- Report JS: dynamic overview in report header ---
j = REPORT_JS.read_text(encoding='utf-8')
j = replace_once(
    j,
    "  const slotContainer = document.querySelector('[data-admin-slot-report]');\n",
    "  const slotContainer = document.querySelector('[data-admin-slot-report]');\n  const reportOverview = document.querySelector('[data-admin-report-overview]');\n",
    'report overview selector'
)

categories_anchor = '''    (state?.boats || []).forEach((boat) => {\n      if (!boat?.builder || !boat?.boatType) return;\n      categories.set(`${boat.builder}|${boat.boatType}`, [boat.builder, boat.boatType]);\n    });\n    return Array.from(categories.values()).sort((a, b) => a[0].localeCompare(b[0], 'it-IT') || a[1].localeCompare(b[1], 'it-IT'));\n  }\n'''
categories_repl = '''    (state?.boats || []).forEach((boat) => {\n      if (!boat?.builder || !boat?.boatType) return;\n      categories.set(`${boat.builder}|${boat.boatType}`, [boat.builder, boat.boatType]);\n    });\n    (state?.bookings || []).forEach((booking) => {\n      (booking.items || []).forEach((item) => {\n        if (!item?.builder || !item?.boatType) return;\n        categories.set(`${item.builder}|${item.boatType}`, [item.builder, item.boatType]);\n      });\n    });\n    return Array.from(categories.values()).sort((a, b) => a[0].localeCompare(b[0], 'it-IT') || a[1].localeCompare(b[1], 'it-IT'));\n  }\n\n  function renderReportOverview() {\n    if (!reportOverview) return;\n    const bookings = Array.isArray(state?.bookings) ? state.bookings : [];\n    const societyCount = new Set(\n      bookings.map((booking) => cleanText(booking.society).toLocaleLowerCase('it-IT')).filter(Boolean)\n    ).size;\n\n    const categoryTotals = new Map(\n      reportCategories().map(([builder, boatType]) => [\n        `${builder}|${boatType}`,\n        { builder, boatType, quantity: 0 }\n      ])\n    );\n\n    bookings.forEach((booking) => {\n      (booking.items || []).forEach((item) => {\n        if (!item?.builder || !item?.boatType) return;\n        const key = `${item.builder}|${item.boatType}`;\n        if (!categoryTotals.has(key)) {\n          categoryTotals.set(key, { builder: item.builder, boatType: item.boatType, quantity: 0 });\n        }\n        categoryTotals.get(key).quantity += Number(item.quantity || 0);\n      });\n    });\n\n    const categories = Array.from(categoryTotals.values()).sort((a, b) =>\n      a.builder.localeCompare(b.builder, 'it-IT') || a.boatType.localeCompare(b.boatType, 'it-IT')\n    );\n\n    reportOverview.innerHTML = `\n      <span class="admin-report-overview__item admin-report-overview__item--societies"><strong>${societyCount}</strong> società</span>\n      ${categories.length ? '<span class="admin-report-overview__label">Barche prenotate</span>' : ''}\n      ${categories.map((item) => `\n        <span class="admin-report-overview__item"><strong>${item.quantity}</strong> ${escapeHtml(item.builder)} ${escapeHtml(item.boatType)}</span>\n      `).join('')}\n    `;\n  }\n'''
j = replace_once(j, categories_anchor, categories_repl, 'report categories and overview')

j = replace_once(
    j,
    '''  window.addEventListener('boat-booking-admin:data', (event) => {\n    state = event.detail || null;\n    renderSlotReport();\n  });\n\n  if (state) renderSlotReport();\n''',
    '''  window.addEventListener('boat-booking-admin:data', (event) => {\n    state = event.detail || null;\n    renderReportOverview();\n    renderSlotReport();\n  });\n\n  if (state) {\n    renderReportOverview();\n    renderSlotReport();\n  }\n''',
    'overview refresh'
)
REPORT_JS.write_text(j, encoding='utf-8')


# --- Booking UX: keep global refresh button in the main toolbar ---
u = LIST_UX.read_text(encoding='utf-8')
u = replace_once(
    u,
    '''    const heading = document.querySelector('.admin-bookings-card .admin-section-heading');\n    const refresh = document.querySelector('[data-admin-refresh]');\n    const exportButton = heading?.querySelector('[data-export-bookings-pdf]');\n    const excelButton = heading?.querySelector('[data-export-bookings-xlsx]');\n    if (heading && refresh && exportButton && !heading.querySelector('[data-admin-section-actions]')) {\n      const actions = document.createElement('div');\n      actions.className = 'admin-section-actions';\n      actions.dataset.adminSectionActions = '';\n      heading.appendChild(actions);\n      actions.append(refresh, exportButton);\n      if (excelButton) actions.append(excelButton);\n    }\n''',
    '''    const heading = document.querySelector('.admin-bookings-card .admin-section-heading');\n    const exportButton = heading?.querySelector('[data-export-bookings-pdf]');\n    const excelButton = heading?.querySelector('[data-export-bookings-xlsx]');\n    if (heading && exportButton && !heading.querySelector('[data-admin-section-actions]')) {\n      const actions = document.createElement('div');\n      actions.className = 'admin-section-actions';\n      actions.dataset.adminSectionActions = '';\n      heading.appendChild(actions);\n      actions.append(exportButton);\n      if (excelButton) actions.append(excelButton);\n    }\n''',
    'keep refresh global'
)
LIST_UX.write_text(u, encoding='utf-8')

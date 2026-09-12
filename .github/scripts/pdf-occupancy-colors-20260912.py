from pathlib import Path

PDF = Path('boat-booking-pdf-export.js')
REPORT = Path('boat-booking-report-menu.js')


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'Anchor not found: {label}')
    return text.replace(old, new, 1)


# --- Base PDF helper: support RGB fills/strokes and occupancy palettes ---
s = PDF.read_text(encoding='utf-8')

s = replace_once(
    s,
    """  function formatNumber(value) {\n    return Number(value.toFixed(2)).toString();\n  }\n""",
    """  function formatNumber(value) {\n    return Number(value.toFixed(2)).toString();\n  }\n\n  function occupancyPdfPalette(percentage, noBoats = false) {\n    if (noBoats) return { fill: [0.961, 0.965, 0.965], accent: [0.667, 0.710, 0.725], border: [0.875, 0.894, 0.898] };\n    if (percentage >= 100) return { fill: [1.000, 0.941, 0.933], accent: [0.706, 0.137, 0.094], border: [0.906, 0.710, 0.694] };\n    if (percentage >= 80) return { fill: [1.000, 0.953, 0.922], accent: [0.812, 0.420, 0.173], border: [0.929, 0.780, 0.682] };\n    if (percentage >= 50) return { fill: [1.000, 0.976, 0.925], accent: [0.835, 0.604, 0.184], border: [0.918, 0.839, 0.667] };\n    return { fill: [0.953, 0.980, 0.965], accent: [0.184, 0.561, 0.420], border: [0.812, 0.894, 0.847] };\n  }\n""",
    'occupancy palette helper'
)

s = replace_once(
    s,
    """    rect(page, x, yTop, width, height, { fillGray = null, strokeGray = 0.78 } = {}) {\n      const y = this.height - yTop - height;\n      if (fillGray !== null) {\n        page.push(`${formatNumber(fillGray)} g ${formatNumber(x)} ${formatNumber(y)} ${formatNumber(width)} ${formatNumber(height)} re f 0 g`);\n      }\n      if (strokeGray !== null) {\n        page.push(`${formatNumber(strokeGray)} G 0.5 w ${formatNumber(x)} ${formatNumber(y)} ${formatNumber(width)} ${formatNumber(height)} re S 0 G`);\n      }\n    }\n""",
    """    rect(page, x, yTop, width, height, { fillGray = null, strokeGray = 0.78, fillRgb = null, strokeRgb = null } = {}) {\n      const y = this.height - yTop - height;\n      if (Array.isArray(fillRgb)) {\n        const [r, g, b] = fillRgb;\n        page.push(`${formatNumber(r)} ${formatNumber(g)} ${formatNumber(b)} rg ${formatNumber(x)} ${formatNumber(y)} ${formatNumber(width)} ${formatNumber(height)} re f 0 g`);\n      } else if (fillGray !== null) {\n        page.push(`${formatNumber(fillGray)} g ${formatNumber(x)} ${formatNumber(y)} ${formatNumber(width)} ${formatNumber(height)} re f 0 g`);\n      }\n      if (Array.isArray(strokeRgb)) {\n        const [r, g, b] = strokeRgb;\n        page.push(`${formatNumber(r)} ${formatNumber(g)} ${formatNumber(b)} RG 0.5 w ${formatNumber(x)} ${formatNumber(y)} ${formatNumber(width)} ${formatNumber(height)} re S 0 G`);\n      } else if (strokeGray !== null) {\n        page.push(`${formatNumber(strokeGray)} G 0.5 w ${formatNumber(x)} ${formatNumber(y)} ${formatNumber(width)} ${formatNumber(height)} re S 0 G`);\n      }\n    }\n""",
    'RGB rect support'
)

s = replace_once(
    s,
    """  function matrixData() {\n    const table = document.querySelector('[data-admin-matrix] table');\n    if (!table) return null;\n    const headers = Array.from(table.querySelectorAll('thead th')).map((cell) => cleanText(cell.textContent));\n    const rows = Array.from(table.querySelectorAll('tbody tr')).map((row) =>\n      Array.from(row.querySelectorAll('th, td')).map((cell) => cleanText(cell.textContent))\n    );\n    return { headers, rows };\n  }\n""",
    """  function matrixData() {\n    const table = document.querySelector('[data-admin-matrix] table');\n    if (!table) return null;\n    const headers = Array.from(table.querySelectorAll('thead th')).map((cell) => cleanText(cell.textContent));\n    const rows = Array.from(table.querySelectorAll('tbody tr')).map((row) =>\n      Array.from(row.querySelectorAll('th, td')).map((cell) => {\n        const matrixFill = cell.querySelector('.admin-matrix-cell-fill');\n        const slotFill = cell.querySelector('.admin-slot-fill');\n        const fill = matrixFill || slotFill;\n        const value = cleanText(cell.querySelector('.admin-matrix-cell-fill__value strong, .admin-slot-fill__value strong')?.textContent);\n        const percentageText = cleanText(cell.querySelector('.admin-matrix-cell-fill__value span, .admin-slot-fill__value span')?.textContent);\n        const status = cleanText(matrixFill?.querySelector('small')?.textContent);\n        const parsed = Number.parseInt(percentageText.replace('%', ''), 10);\n        return {\n          text: cleanText(cell.textContent),\n          hasFill: Boolean(fill),\n          value,\n          percentageText,\n          status,\n          percentage: Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : 0,\n          noBoats: cell.classList.contains('is-empty')\n        };\n      })\n    );\n    return { headers, rows };\n  }\n""",
    'matrix structured data'
)

s = replace_once(
    s,
    """      row.forEach((cell, colIndex) => {\n        const width = widths[colIndex] || otherColumn;\n        const isFull = /COMPLETO|SLOT CHIUSO|NESSUNA BARCA|100%/i.test(cell);\n        pdf.rect(page, x, yTop, width, rowHeight, { fillGray: isFull ? 0.955 : null, strokeGray: 0.82 });\n        const fontSize = colIndex === 0 ? firstFont : bodyFont;\n        const lines = wrapText(cell, width - 8, fontSize).slice(0, rowHeight < 35 ? 2 : 3);\n        lines.forEach((line, lineIndex) => pdf.text(page, line, x + 4, yTop + 13 + lineIndex * 9.3, fontSize, lineIndex === 0));\n        x += width;\n      });\n""",
    """      row.forEach((cell, colIndex) => {\n        const width = widths[colIndex] || otherColumn;\n        const cellText = typeof cell === 'string' ? cell : cell.text;\n        const hasFill = Boolean(cell?.hasFill);\n        const palette = hasFill ? occupancyPdfPalette(cell.percentage, cell.noBoats) : null;\n        const isFull = /COMPLETO|SLOT CHIUSO|NESSUNA BARCA|100%/i.test(cellText);\n        pdf.rect(page, x, yTop, width, rowHeight, {\n          fillRgb: palette?.fill || null,\n          strokeRgb: palette?.border || null,\n          fillGray: palette ? null : (isFull ? 0.955 : null),\n          strokeGray: palette ? null : 0.82\n        });\n        const fontSize = colIndex === 0 ? firstFont : bodyFont;\n\n        if (hasFill) {\n          const valueLine = [cell.value, cell.percentageText].filter(Boolean).join(' · ');\n          pdf.text(page, valueLine || cellText, x + 4, yTop + 12.5, fontSize, true);\n          if (cell.status) pdf.text(page, cell.status, x + 4, yTop + 21.7, Math.max(5.8, fontSize - 0.5), false);\n\n          const trackX = x + 4;\n          const trackWidth = Math.max(8, width - 8);\n          const trackTop = yTop + rowHeight - 6;\n          pdf.rect(page, trackX, trackTop, trackWidth, 3, { fillGray: 0.90, strokeGray: null });\n          if (!cell.noBoats && cell.percentage > 0) {\n            pdf.rect(page, trackX, trackTop, trackWidth * (cell.percentage / 100), 3, { fillRgb: palette.accent, strokeGray: null });\n          }\n        } else {\n          const lines = wrapText(cellText, width - 8, fontSize).slice(0, rowHeight < 35 ? 2 : 3);\n          lines.forEach((line, lineIndex) => pdf.text(page, line, x + 4, yTop + 13 + lineIndex * 9.3, fontSize, lineIndex === 0));\n        }\n        x += width;\n      });\n""",
    'matrix PDF colored cells'
)

PDF.write_text(s, encoding='utf-8')


# --- Slot report PDF: colored slot header + fill indicator ---
r = REPORT.read_text(encoding='utf-8')

r = replace_once(
    r,
    """  function slotOccupancy(slotCode) {\n    const rows = (state?.availability || []).filter((row) => row.slotCode === slotCode);\n    const totals = rows.reduce((acc, row) => {\n      acc.booked += Number(row.booked || 0);\n      acc.capacity += Number(row.capacity || 0);\n      return acc;\n    }, { booked: 0, capacity: 0 });\n    const percentage = totals.capacity > 0\n      ? Math.min(100, Math.round((totals.booked / totals.capacity) * 100))\n      : 0;\n    const fillClass = percentage >= 100 ? 'is-full' : percentage >= 80 ? 'is-high' : percentage >= 50 ? 'is-medium' : 'is-low';\n    return { ...totals, percentage, fillClass };\n  }\n""",
    """  function slotOccupancy(slotCode) {\n    const rows = (state?.availability || []).filter((row) => row.slotCode === slotCode);\n    const totals = rows.reduce((acc, row) => {\n      acc.booked += Number(row.booked || 0);\n      acc.capacity += Number(row.capacity || 0);\n      return acc;\n    }, { booked: 0, capacity: 0 });\n    const percentage = totals.capacity > 0\n      ? Math.min(100, Math.round((totals.booked / totals.capacity) * 100))\n      : 0;\n    const fillClass = percentage >= 100 ? 'is-full' : percentage >= 80 ? 'is-high' : percentage >= 50 ? 'is-medium' : 'is-low';\n    return { ...totals, percentage, fillClass };\n  }\n\n  function pdfOccupancyPalette(percentage, noBoats = false) {\n    if (noBoats) return { fill: [0.961, 0.965, 0.965], accent: [0.667, 0.710, 0.725], border: [0.875, 0.894, 0.898] };\n    if (percentage >= 100) return { fill: [1.000, 0.941, 0.933], accent: [0.706, 0.137, 0.094], border: [0.906, 0.710, 0.694] };\n    if (percentage >= 80) return { fill: [1.000, 0.953, 0.922], accent: [0.812, 0.420, 0.173], border: [0.929, 0.780, 0.682] };\n    if (percentage >= 50) return { fill: [1.000, 0.976, 0.925], accent: [0.835, 0.604, 0.184], border: [0.918, 0.839, 0.667] };\n    return { fill: [0.953, 0.980, 0.965], accent: [0.184, 0.561, 0.420], border: [0.812, 0.894, 0.847] };\n  }\n""",
    'slot PDF palette helper'
)

r = replace_once(
    r,
    """      const totalBoats = slotBookings.reduce((sum, booking) => sum + bookingTotal(booking), 0);\n      const societies = new Set(slotBookings.map((booking) => cleanText(booking.society).toLocaleLowerCase('it-IT')).filter(Boolean)).size;\n      ctx.ensure(50);\n      ctx.text(`${slot.label}${slot.active ? '' : ' - CHIUSO'}`, 16, true);\n      ctx.text(`${slotBookings.length} prenotazioni · ${societies} società · ${totalBoats} barche`, 8.5);\n      ctx.gap(3);\n""",
    """      const totalBoats = slotBookings.reduce((sum, booking) => sum + bookingTotal(booking), 0);\n      const societies = new Set(slotBookings.map((booking) => cleanText(booking.society).toLocaleLowerCase('it-IT')).filter(Boolean)).size;\n      const occupancy = slotOccupancy(slot.code);\n      const palette = pdfOccupancyPalette(occupancy.percentage, occupancy.capacity === 0);\n      ctx.ensure(66);\n\n      const boxTop = ctx.y - 4;\n      const boxWidth = ctx.pdf.width - ctx.margin * 2;\n      const barX = ctx.margin + 8;\n      const barWidth = boxWidth - 16;\n      const barTop = boxTop + 36;\n      ctx.pdf.rect(ctx.page, ctx.margin, boxTop, boxWidth, 43, { fillRgb: palette.fill, strokeRgb: palette.border });\n      ctx.pdf.rect(ctx.page, barX, barTop, barWidth, 4, { fillGray: 0.90, strokeGray: null });\n      if (occupancy.capacity > 0 && occupancy.percentage > 0) {\n        ctx.pdf.rect(ctx.page, barX, barTop, barWidth * (occupancy.percentage / 100), 4, { fillRgb: palette.accent, strokeGray: null });\n      }\n\n      ctx.text(`${slot.label}${slot.active ? '' : ' - CHIUSO'}`, 16, true, 8, boxWidth - 16);\n      ctx.text(`${slotBookings.length} prenotazioni · ${societies} società · ${totalBoats} barche · occupazione ${occupancy.booked}/${occupancy.capacity} (${occupancy.percentage}%)`, 8.5, false, 8, boxWidth - 16);\n      ctx.gap(14);\n""",
    'slot PDF colored header'
)

REPORT.write_text(r, encoding='utf-8')

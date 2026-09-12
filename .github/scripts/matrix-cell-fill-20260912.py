from pathlib import Path

HTML = Path('admin-prenotazioni-barche.html')
JS = Path('boat-booking-admin.js')


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'Anchor not found: {label}')
    return text.replace(old, new, 1)

# JS: add percentage, fill class and bar inside each builder/type matrix cell.
s = JS.read_text(encoding='utf-8')
old = '''              ${columns.map(([builder, type]) => {
                const row = availabilityRow(code, builder, type) || { booked: 0, capacity: 0, remaining: 0 };
                const noBoats = Number(row.capacity) === 0;
                const full = !noBoats && Number(row.remaining) <= 0;
                return `<td class="admin-matrix__cell${full ? ' is-full' : ''}${noBoats ? ' is-empty' : ''}">
                  <strong>${row.booked}/${row.capacity}</strong>
                  <small>${isInactive ? 'SLOT CHIUSO' : noBoats ? 'NESSUNA BARCA' : full ? 'COMPLETO' : `${row.remaining} libere`}</small>
                </td>`;
              }).join('')}
'''
new = '''              ${columns.map(([builder, type]) => {
                const row = availabilityRow(code, builder, type) || { booked: 0, capacity: 0, remaining: 0 };
                const booked = Number(row.booked || 0);
                const capacity = Number(row.capacity || 0);
                const remaining = Number(row.remaining || 0);
                const noBoats = capacity === 0;
                const cellPercentage = capacity > 0
                  ? Math.min(100, Math.round((booked / capacity) * 100))
                  : 0;
                const cellFillClass = noBoats
                  ? ' is-empty'
                  : cellPercentage >= 100
                    ? ' is-full'
                    : cellPercentage >= 80
                      ? ' is-high'
                      : cellPercentage >= 50
                        ? ' is-medium'
                        : ' is-low';
                return `<td class="admin-matrix__cell admin-matrix__cell--fill${cellFillClass}" style="--matrix-cell-fill:${cellPercentage}%">
                  <div class="admin-matrix-cell-fill">
                    <span class="admin-matrix-cell-fill__value"><strong>${booked}/${capacity}</strong><span>${noBoats ? '—' : `${cellPercentage}%`}</span></span>
                    <span class="admin-matrix-cell-fill__track" aria-hidden="true"><span></span></span>
                    <small>${isInactive ? 'SLOT CHIUSO' : noBoats ? 'NESSUNA BARCA' : cellPercentage >= 100 ? 'COMPLETO' : `${remaining} libere`}</small>
                  </div>
                </td>`;
              }).join('')}
'''
s = replace_once(s, old, new, 'matrix cells')
JS.write_text(s, encoding='utf-8')

# HTML/CSS: colored matrix cells and compact progress indicator.
h = HTML.read_text(encoding='utf-8')
anchor = '''    .admin-slot-fill.is-medium .admin-slot-fill__track > span { background: #d59a2f; }
    .admin-slot-fill.is-high .admin-slot-fill__track > span { background: #cf6b2c; }
    .admin-slot-fill.is-full .admin-slot-fill__track > span { background: #b42318; }

'''
extra = '''    .admin-slot-fill.is-medium .admin-slot-fill__track > span { background: #d59a2f; }
    .admin-slot-fill.is-high .admin-slot-fill__track > span { background: #cf6b2c; }
    .admin-slot-fill.is-full .admin-slot-fill__track > span { background: #b42318; }

    .admin-matrix__cell--fill {
      --matrix-cell-color: #2f8f6b;
      background: #f3faf6;
      min-width: 112px;
    }
    .admin-matrix__cell--fill.is-medium {
      --matrix-cell-color: #d59a2f;
      background: #fff9ec;
    }
    .admin-matrix__cell--fill.is-high {
      --matrix-cell-color: #cf6b2c;
      background: #fff3eb;
    }
    .admin-matrix__cell--fill.is-full {
      --matrix-cell-color: #b42318;
      background: #fff0ee;
      color: inherit;
    }
    .admin-matrix__cell--fill.is-empty {
      --matrix-cell-color: #aab5b9;
      background: #f5f6f6;
      color: #777;
    }
    .admin-matrix-cell-fill {
      display: grid;
      gap: 5px;
      min-width: 94px;
    }
    .admin-matrix-cell-fill__value {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 6px;
      white-space: nowrap;
    }
    .admin-matrix-cell-fill__value strong {
      color: #173e4b;
      font-size: .9rem;
    }
    .admin-matrix-cell-fill__value span {
      color: #64757b;
      font-size: .74rem;
      font-weight: 800;
    }
    .admin-matrix-cell-fill__track {
      display: block;
      height: 6px;
      overflow: hidden;
      border-radius: 999px;
      background: rgba(16,34,53,.11);
    }
    .admin-matrix-cell-fill__track > span {
      display: block;
      width: var(--matrix-cell-fill, 0%);
      height: 100%;
      border-radius: inherit;
      background: var(--matrix-cell-color);
    }
    .admin-matrix-cell-fill small {
      color: #65777e;
      font-size: .72rem;
      font-weight: 700;
      white-space: nowrap;
    }

'''
h = replace_once(h, anchor, extra, 'matrix cell styles')
HTML.write_text(h, encoding='utf-8')

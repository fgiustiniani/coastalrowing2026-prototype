from pathlib import Path

HTML = Path('admin-prenotazioni-barche.html')
JS = Path('boat-booking-report-menu.js')


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'Anchor not found: {label}')
    return text.replace(old, new, 1)


# CSS: color slot cards and add occupancy indicator.
s = HTML.read_text(encoding='utf-8')
css_anchor = '''    .admin-slot-card {
      padding: 18px;
      border: 1px solid #dfe8ea;
      border-radius: 16px;
      background: #fff;
    }
'''
css_repl = '''    .admin-slot-card {
      --slot-report-color: #2f8f6b;
      --slot-report-bg: #f6fbf8;
      --slot-report-border: #cfe4d8;
      padding: 18px;
      border: 1px solid var(--slot-report-border);
      border-left: 5px solid var(--slot-report-color);
      border-radius: 16px;
      background: var(--slot-report-bg);
    }
    .admin-slot-card.is-medium {
      --slot-report-color: #b87b16;
      --slot-report-bg: #fffaf0;
      --slot-report-border: #ead6aa;
    }
    .admin-slot-card.is-high {
      --slot-report-color: #c65f24;
      --slot-report-bg: #fff5ed;
      --slot-report-border: #edc7ae;
    }
    .admin-slot-card.is-full {
      --slot-report-color: #b42318;
      --slot-report-bg: #fff1f1;
      --slot-report-border: #e7b5b1;
    }
'''
s = replace_once(s, css_anchor, css_repl, 'slot card colors')

stats_anchor = '''    .admin-slot-card__stats { display: flex; gap: 7px; flex-wrap: wrap; }
    .admin-slot-card__stat {
      padding: 5px 9px;
      border-radius: 999px;
      background: #edf6f8;
      color: #0b6478;
      font-size: .78rem;
      font-weight: 800;
    }
'''
stats_repl = '''    .admin-slot-card__stats { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
    .admin-slot-card__stat {
      padding: 5px 9px;
      border-radius: 999px;
      background: rgba(255,255,255,.78);
      color: #0b6478;
      font-size: .78rem;
      font-weight: 800;
    }
    .admin-slot-card__occupancy {
      display: grid;
      gap: 4px;
      min-width: 128px;
      padding: 6px 9px;
      border-radius: 10px;
      background: rgba(255,255,255,.9);
      box-shadow: inset 0 0 0 1px rgba(16,34,53,.07);
    }
    .admin-slot-card__occupancy-value {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 10px;
      color: #52666c;
      font-size: .76rem;
      font-weight: 800;
      white-space: nowrap;
    }
    .admin-slot-card__occupancy-value strong {
      color: var(--slot-report-color);
      font-size: .9rem;
    }
    .admin-slot-card__occupancy-track {
      display: block;
      height: 6px;
      overflow: hidden;
      border-radius: 999px;
      background: #e3e9eb;
    }
    .admin-slot-card__occupancy-track > span {
      display: block;
      width: var(--slot-report-fill, 0%);
      height: 100%;
      border-radius: inherit;
      background: var(--slot-report-color);
    }
'''
s = replace_once(s, stats_anchor, stats_repl, 'slot occupancy indicator styles')
HTML.write_text(s, encoding='utf-8')


# JS: calculate slot fill from the same availability data used by Occupazione slot.
j = JS.read_text(encoding='utf-8')
helper_anchor = '''  function bookingTotal(booking) {
    return (booking.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  }
'''
helper_repl = '''  function bookingTotal(booking) {
    return (booking.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  }

  function slotOccupancy(slotCode) {
    const rows = (state?.availability || []).filter((row) => row.slotCode === slotCode);
    const totals = rows.reduce((acc, row) => {
      acc.booked += Number(row.booked || 0);
      acc.capacity += Number(row.capacity || 0);
      return acc;
    }, { booked: 0, capacity: 0 });
    const percentage = totals.capacity > 0
      ? Math.min(100, Math.round((totals.booked / totals.capacity) * 100))
      : 0;
    const fillClass = percentage >= 100 ? 'is-full' : percentage >= 80 ? 'is-high' : percentage >= 50 ? 'is-medium' : 'is-low';
    return { ...totals, percentage, fillClass };
  }
'''
j = replace_once(j, helper_anchor, helper_repl, 'slot occupancy helper')

render_anchor = '''      const societies = new Set(slotBookings.map((booking) => cleanText(booking.society).toLocaleLowerCase('it-IT')).filter(Boolean)).size;
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
'''
render_repl = '''      const societies = new Set(slotBookings.map((booking) => cleanText(booking.society).toLocaleLowerCase('it-IT')).filter(Boolean)).size;
      const totalBoats = slotBookings.reduce((sum, booking) => sum + bookingTotal(booking), 0);
      const occupancy = slotOccupancy(slot.code);

      return `
        <article class="admin-slot-card ${occupancy.fillClass}" style="--slot-report-fill:${occupancy.percentage}%">
          <div class="admin-slot-card__head">
            <h3>${escapeHtml(slot.label)}${slot.active ? '' : ' — CHIUSO'}</h3>
            <div class="admin-slot-card__stats">
              <span class="admin-slot-card__occupancy" title="${occupancy.booked} barche prenotate su ${occupancy.capacity} disponibili">
                <span class="admin-slot-card__occupancy-value"><strong>${occupancy.booked}/${occupancy.capacity}</strong><span>${occupancy.percentage}% pieno</span></span>
                <span class="admin-slot-card__occupancy-track" aria-hidden="true"><span></span></span>
              </span>
              <span class="admin-slot-card__stat">${slotBookings.length} prenotazion${slotBookings.length === 1 ? 'e' : 'i'}</span>
              <span class="admin-slot-card__stat">${societies} societ${societies === 1 ? 'à' : 'à'}</span>
              <span class="admin-slot-card__stat">${totalBoats} barc${totalBoats === 1 ? 'a' : 'he'}</span>
            </div>
          </div>
'''
j = replace_once(j, render_anchor, render_repl, 'slot report occupancy rendering')
JS.write_text(j, encoding='utf-8')

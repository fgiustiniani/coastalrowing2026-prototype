(() => {
  const loginForm = document.querySelector('[data-society-admin-login]');
  const dashboard = document.querySelector('[data-society-dashboard]');
  if (!loginForm || !dashboard) return;

  const api = '/api/fic-registrations-admin';
  const ADMIN_SESSION_KEY = 'coastal2026-admin-session';
  const loginSection = loginForm.closest('.admin-login');
  const loginStatus = document.querySelector('[data-society-login-status]');
  const statusNode = document.querySelector('[data-society-status]');
  const refreshButton = document.querySelector('[data-society-refresh]');
  const sourceCard = document.querySelector('.society-source-card');
  const sourceTitle = document.querySelector('[data-society-source-title]');
  const sourceDetail = document.querySelector('[data-society-source-detail]');
  const sourceLink = document.querySelector('[data-society-source-link]');
  const kpis = document.querySelector('[data-society-kpis]');
  const tableContainer = document.querySelector('[data-society-table]');
  const tableScrollTop = document.querySelector('[data-society-table-scroll-top]');
  const tableScrollTopInner = document.querySelector('[data-society-table-scroll-top-inner]');
  const visibleCount = document.querySelector('[data-society-visible-count]');
  const regionFilter = document.querySelector('[data-society-filter-region]');
  const textFilter = document.querySelector('[data-society-filter-text]');
  const statusFilter = document.querySelector('[data-society-filter-status]');
  const paymentFilter = document.querySelector('[data-society-filter-payment]');
  const resetFilters = document.querySelector('[data-society-reset-filters]');
  const unmatched = document.querySelector('[data-society-unmatched]');
  const unmatchedCount = document.querySelector('[data-society-unmatched-count]');
  const unmatchedList = document.querySelector('[data-society-unmatched-list]');

  let credentials = null;
  let data = null;

  function readStoredCredentials() {
    try {
      const value = JSON.parse(sessionStorage.getItem(ADMIN_SESSION_KEY) || 'null');
      return value?.username && value?.password ? value : null;
    } catch {
      return null;
    }
  }

  function storeCredentials(value) {
    try {
      if (value?.username && value?.password) {
        sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(value));
      }
    } catch {}
  }

  function clearStoredCredentials() {
    try { sessionStorage.removeItem(ADMIN_SESSION_KEY); } catch {}
  }

  function setStatus(node, message = '', kind = '') {
    if (!node) return;
    node.textContent = message;
    node.className = `booking-status${kind ? ` is-${kind}` : ''}`;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function authHeader() {
    return credentials ? `Basic ${btoa(`${credentials.username}:${credentials.password}`)}` : '';
  }

  function formatMoney(value) {
    if (value === null || value === undefined || value === '') return '—';
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(Number(value || 0));
  }

  function formatTimestamp(value) {
    if (!value) return '—';
    try {
      return new Intl.DateTimeFormat('it-IT', {
        timeZone: 'Europe/Rome',
        dateStyle: 'short',
        timeStyle: 'short'
      }).format(new Date(value));
    } catch {
      return String(value);
    }
  }

  function showLogin(message = '') {
    credentials = null;
    if (loginSection) loginSection.hidden = false;
    dashboard.hidden = true;
    dashboard.inert = true;
    dashboard.setAttribute('aria-hidden', 'true');
    if (message) setStatus(loginStatus, message, 'error');
  }

  function showDashboard() {
    if (loginSection) loginSection.hidden = true;
    dashboard.hidden = false;
    dashboard.inert = false;
    dashboard.removeAttribute('aria-hidden');
  }

  async function requestData() {
    const response = await fetch(api, {
      method: 'GET',
      headers: { authorization: authHeader() },
      cache: 'no-store'
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(body.error || 'Non è stato possibile caricare i dati.');
      error.status = response.status;
      throw error;
    }
    return body;
  }

  function statusLabel(status) {
    if (status === 'registered') return 'Iscritta';
    if (status === 'not_registered') return 'Non iscritta';
    return 'Non disponibile';
  }

  function registrationSearchText(row) {
    const r = row.registration || {};
    return [
      row.name, row.code, row.city, row.province, row.email, row.region, row.committee,
      r.team, r.details, r.fiscalCode, r.manager, r.coach
    ].join(' ').toLocaleLowerCase('it-IT');
  }

  function matchesPaymentFilter(row, filterValue) {
    if (!filterValue) return true;
    const payment = paymentState(row.registration, row.status);
    if (filterValue === 'paid') return payment.className === 'is-paid';
    if (filterValue === 'due') return payment.className === 'is-due';
    if (filterValue === 'overpaid') return payment.className === 'is-overpaid';
    if (filterValue === 'none') return !payment.label;
    return true;
  }

  function visibleRows() {
    if (!data?.rows) return [];
    const region = regionFilter?.value || '';
    const status = statusFilter?.value || '';
    const payment = paymentFilter?.value || '';
    const search = (textFilter?.value || '').trim().toLocaleLowerCase('it-IT');

    return data.rows
      .filter((row) => !region || row.region === region)
      .filter((row) => !status || row.status === status)
      .filter((row) => matchesPaymentFilter(row, payment))
      .filter((row) => !search || registrationSearchText(row).includes(search))
      .sort((a, b) =>
        String(a.region || '').localeCompare(String(b.region || ''), 'it-IT', { sensitivity: 'base' }) ||
        String(a.name || '').localeCompare(String(b.name || ''), 'it-IT', { sensitivity: 'base' })
      );
  }

  function syncRegions() {
    if (!regionFilter || !data?.rows) return;
    const current = regionFilter.value;
    const regions = Array.from(new Set(data.rows.map((row) => row.region).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b, 'it-IT', { sensitivity: 'base' }));
    regionFilter.innerHTML = '<option value="">Tutte le regioni</option>' +
      regions.map((region) => `<option value="${escapeHtml(region)}">${escapeHtml(region)}</option>`).join('');
    if (regions.includes(current)) regionFilter.value = current;
  }

  function renderSource() {
    if (!data) return;
    sourceCard?.classList.toggle('is-ok', data.ficAvailable === true);
    sourceCard?.classList.toggle('is-warning', data.ficAvailable !== true);
    if (sourceLink && data.sourceUrl) sourceLink.href = data.sourceUrl;

    if (data.ficAvailable) {
      sourceTitle.textContent = 'Dati FIC aggiornati';
      sourceDetail.textContent =
        `Lettura effettuata il ${formatTimestamp(data.fetchedAt)} · ${data.summary?.sourceRegistrations ?? 0} società presenti nel portale FIC.` +
        ((data.summary?.unmatchedRegistrations || 0) ? ` ${data.summary.unmatchedRegistrations} riga/e da verificare.` : '');
    } else {
      sourceTitle.textContent = 'Anagrafica disponibile, aggiornamento FIC non riuscito';
      sourceDetail.textContent = `${data.sourceError || 'Portale FIC non disponibile.'} Lo stato di iscrizione non viene dedotto dai dati precedenti.`;
    }
  }

  function renderKpis() {
    if (!kpis || !data?.summary) return;
    const s = data.summary;
    const cards = [
      { label: 'Società FIC 2026', value: s.totalSocieties ?? 0, className: '' },
      {
        label: 'Iscritte',
        value: data.ficAvailable ? s.registered ?? 0 : '—',
        historic: s.registered2025 ?? 62,
        className: 'society-kpi--registered'
      },
      { label: 'Non iscritte', value: data.ficAvailable ? s.notRegistered ?? 0 : '—', className: 'society-kpi--not-registered' },
      { label: 'Importo dovuto', value: data.ficAvailable ? formatMoney(s.amountDue) : '—', className: '' },
      { label: 'Noleggio barche', value: data.ficAvailable ? formatMoney(s.boatRental) : '—', className: '' },
      { label: 'Importo pagato', value: data.ficAvailable ? formatMoney(s.amountPaid) : '—', className: '' }
    ];

    kpis.innerHTML = cards.map((card) => `
      <article class="society-kpi ${card.className}">
        <span class="society-kpi__label">${escapeHtml(card.label)}</span>
        <strong>
          ${escapeHtml(card.value)}
          ${card.historic !== undefined ? `<small class="society-kpi__historic">(${escapeHtml(card.historic)})</small>` : ''}
        </strong>
      </article>`).join('') +
      '<div class="society-kpis-note">Tra parentesi: numero di società iscritte nel 2025.</div>';
  }

  function paymentState(registration, registrationStatus = '') {
    if (!registration) return { label: '', className: '' };
    const due = Number(registration.amountDue || 0);
    const paid = Number(registration.amountPaid || 0);
    if (registrationStatus === 'registered' && Math.abs(due) < 0.01 && Math.abs(paid) < 0.01) {
      return { label: '', className: '' };
    }
    if (Math.abs(due - paid) < 0.01) return { label: 'OK', className: 'is-paid' };
    if (paid < due) return { label: 'Da saldare', className: 'is-due' };
    return { label: 'Da verificare', className: 'is-overpaid' };
  }

  let syncingHorizontalScroll = false;

  function syncHorizontalScrollbar() {
    if (!tableContainer || !tableScrollTop || !tableScrollTopInner) return;
    const table = tableContainer.querySelector('.society-table');
    if (!table) {
      tableScrollTop.hidden = true;
      return;
    }

    const scrollWidth = tableContainer.scrollWidth;
    const needsScroll = scrollWidth > tableContainer.clientWidth + 2;
    tableScrollTop.hidden = !needsScroll;
    tableScrollTopInner.style.width = `${scrollWidth}px`;

    if (!needsScroll) {
      tableScrollTop.scrollLeft = 0;
      tableContainer.scrollLeft = 0;
    } else if (Math.abs(tableScrollTop.scrollLeft - tableContainer.scrollLeft) > 1) {
      tableScrollTop.scrollLeft = tableContainer.scrollLeft;
    }
  }

  function renderTable() {
    const rows = visibleRows();
    const registeredCount = rows.filter((row) => row.status === 'registered').length;
    const registered2025Count = rows.filter((row) => row.registered2025).length;
    if (visibleCount) {
      visibleCount.textContent = `${registeredCount} iscritte su ${rows.length} (${registered2025Count} nel 2025)`;
    }
    if (!rows.length) {
      tableContainer.innerHTML = '<div class="society-empty">Nessuna società corrisponde ai filtri selezionati.</div>';
      if (tableScrollTop) tableScrollTop.hidden = true;
      window.societyAdmin?.notify();
      return;
    }

    tableContainer.innerHTML = `
      <table class="society-table">
        <thead><tr>
          <th>Stato</th><th>Iscritta 2025</th><th>Regione</th><th>Società</th>
          <th>Dir. resp.</th><th>Dir. tec.</th><th>Data reg.ne pagamento</th>
          <th class="society-table__money">Importo dovuto</th>
          <th class="society-table__money">Di cui noleggio barche</th>
          <th class="society-table__money">Importo pagato</th><th>Stato pagamento</th>
        </tr></thead>
        <tbody>
          ${rows.map((row) => {
            const r = row.registration;
            const statusClass = row.status === 'registered' ? 'is-registered' : row.status === 'not_registered' ? 'is-not-registered' : 'is-unknown';
            const payment = paymentState(r, row.status);
            return `
              <tr>
                <td data-label="Stato"><span class="society-status-badge ${statusClass}">${escapeHtml(statusLabel(row.status))}</span></td>
                <td data-label="Iscritta 2025"><span class="society-year-badge ${row.registered2025 ? 'is-yes' : 'is-no'}">${row.registered2025 ? 'Sì' : 'No'}</span></td>
                <td data-label="Regione">${escapeHtml(row.region || '—')}</td>
                <td data-label="Società" class="society-table__society">
                  <strong>${escapeHtml(row.name || '—')}</strong>
                  <small>${escapeHtml([row.city, row.province].filter(Boolean).join(' (') + (row.city && row.province ? ')' : ''))}</small>
                  ${row.email ? `<small>${escapeHtml(row.email)}</small>` : ''}
                  ${r?.team && r.team.toLocaleLowerCase('it-IT') !== String(row.name).toLocaleLowerCase('it-IT') ? `<small>FIC: ${escapeHtml(r.team)}</small>` : ''}
                </td>
                <td class="society-table__mobile-toggle">
                  <button type="button" class="society-row-toggle" data-society-row-toggle aria-expanded="false">Mostra dettagli</button>
                </td>
                <td data-label="Dir. resp." class="society-table__person society-table__detail">${escapeHtml(r?.manager || '—')}</td>
                <td data-label="Dir. tec." class="society-table__person society-table__detail">${escapeHtml(r?.coach || '—')}</td>
                <td data-label="Data reg.ne pagamento" class="society-table__date society-table__detail">${escapeHtml(r?.paymentRegistrationDate || '—')}</td>
                <td data-label="Importo dovuto" class="society-table__money society-table__detail">${r ? `<strong>${escapeHtml(formatMoney(r.amountDue))}</strong>` : '—'}</td>
                <td data-label="Di cui noleggio barche" class="society-table__money society-table__detail">${r ? escapeHtml(formatMoney(r.boatRental)) : '—'}</td>
                <td data-label="Importo pagato" class="society-table__money society-table__detail">${r ? `<strong>${escapeHtml(formatMoney(r.amountPaid))}</strong>` : '—'}</td>
                <td data-label="Stato pagamento">${payment.label ? `<span class="society-payment-badge ${payment.className}">${escapeHtml(payment.label)}</span>` : ''}</td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>`;
    requestAnimationFrame(syncHorizontalScrollbar);
    window.societyAdmin?.notify();
  }

    function renderUnmatched() {
    const rows = Array.isArray(data?.unmatchedRegistrations) ? data.unmatchedRegistrations : [];
    if (!unmatched || !unmatchedList || !unmatchedCount) return;
    unmatched.hidden = !rows.length;
    unmatchedCount.textContent = rows.length ? `(${rows.length})` : '';
    unmatchedList.className = 'society-unmatched-list';
    unmatchedList.innerHTML = rows.map((row) => `
      <div class="society-unmatched-row">
        <div><strong>${escapeHtml(row.team || 'Società FIC')}</strong><br><small>${escapeHtml(row.fiscalCode || '')}</small></div>
        <div>${escapeHtml(row.details || row.raw || '—')}</div>
        <div><strong>Possibili corrispondenze</strong><br>${(row.suggestions || []).map((item) =>
          `<small>${escapeHtml(item.code || '—')} · ${escapeHtml(item.name || '—')} · ${Math.round(Number(item.score || 0) * 100)}%</small>`
        ).join('<br>') || '<small>Nessuna</small>'}</div>
      </div>`).join('');
  }

  function renderAll() {
    syncRegions();
    renderSource();
    renderKpis();
    renderTable();
    renderUnmatched();
  }

  async function load({ initial = false } = {}) {
    if (!credentials) return;
    if (refreshButton) refreshButton.disabled = true;
    setStatus(initial ? loginStatus : statusNode, initial ? 'Accesso in corso…' : 'Aggiornamento…');

    try {
      data = await requestData();
      storeCredentials(credentials);
      showDashboard();
      renderAll();
      setStatus(statusNode, data.ficAvailable ? 'Dati aggiornati.' : 'Anagrafica caricata; dati FIC non disponibili.', data.ficAvailable ? 'success' : 'warning');
      setStatus(loginStatus, '');
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        clearStoredCredentials();
        showLogin('Credenziali non valide.');
      } else {
        setStatus(initial ? loginStatus : statusNode, error.message, 'error');
      }
    } finally {
      if (refreshButton) refreshButton.disabled = false;
    }
  }

  credentials = readStoredCredentials();
  if (credentials) load({ initial: true });
  else showLogin();

  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(loginForm);
    credentials = {
      username: String(formData.get('username') || ''),
      password: String(formData.get('password') || '')
    };
    load({ initial: true });
  });

  refreshButton?.addEventListener('click', () => load());

  tableContainer?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-society-row-toggle]');
    if (!button) return;
    const row = button.closest('tr');
    if (!row) return;
    const expanded = row.classList.toggle('is-expanded');
    button.setAttribute('aria-expanded', String(expanded));
    button.textContent = expanded ? 'Nascondi dettagli' : 'Mostra dettagli';
  });

  tableScrollTop?.addEventListener('scroll', () => {
    if (syncingHorizontalScroll || !tableContainer) return;
    syncingHorizontalScroll = true;
    tableContainer.scrollLeft = tableScrollTop.scrollLeft;
    requestAnimationFrame(() => { syncingHorizontalScroll = false; });
  });

  tableContainer?.addEventListener('scroll', () => {
    if (syncingHorizontalScroll || !tableScrollTop || tableScrollTop.hidden) return;
    syncingHorizontalScroll = true;
    tableScrollTop.scrollLeft = tableContainer.scrollLeft;
    requestAnimationFrame(() => { syncingHorizontalScroll = false; });
  });

  window.addEventListener('resize', () => requestAnimationFrame(syncHorizontalScrollbar));

  [regionFilter, statusFilter, paymentFilter].forEach((node) => node?.addEventListener('change', renderTable));
  textFilter?.addEventListener('input', renderTable);
  resetFilters?.addEventListener('click', () => {
    if (regionFilter) regionFilter.value = '';
    if (statusFilter) statusFilter.value = '';
    if (paymentFilter) paymentFilter.value = '';
    if (textFilter) textFilter.value = '';
    renderTable();
  });

  window.societyAdmin = {
    getVisibleRows: visibleRows,
    getData: () => data,
    formatMoney,
    statusLabel,
    paymentStatusLabel: (registration, status) => paymentState(registration, status).label,
    getFilterLabel: () => {
      const parts = [];
      if (regionFilter?.value) parts.push(`Regione: ${regionFilter.value}`);
      if (statusFilter?.value) parts.push(`Stato: ${statusLabel(statusFilter.value)}`);
      if (paymentFilter?.value) {
        const paymentLabels = {
          paid: 'OK',
          due: 'Da saldare',
          overpaid: 'Da verificare',
          none: 'Senza stato'
        };
        parts.push(`Pagamento: ${paymentLabels[paymentFilter.value] || paymentFilter.value}`);
      }
      if (textFilter?.value?.trim()) parts.push(`Ricerca: ${textFilter.value.trim()}`);
      return parts.length ? parts.join(' · ') : 'Nessun filtro applicato';
    },
    notify: () => window.dispatchEvent(new CustomEvent('society-admin:updated'))
  };
})();

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
  const historicFilter = document.querySelector('[data-society-filter-2025]');
  const rentalMailFilter = document.querySelector('[data-society-filter-rental-mail]');
  const paymentFilter = document.querySelector('[data-society-filter-payment]');
  const resetFilters = document.querySelector('[data-society-reset-filters]');
  const uploadForm = document.querySelector('[data-society-upload-form]');
  const uploadFile = document.querySelector('[data-society-upload-file]');
  const uploadDate = document.querySelector('[data-society-upload-date]');
  const uploadSubmit = document.querySelector('[data-society-upload-submit]');
  const uploadStatus = document.querySelector('[data-society-upload-status]');
  const uploadHistory = document.querySelector('[data-society-upload-history]');
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

  function formatDate(value) {
    if (!value) return '—';
    const parts = String(value).split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return String(value);
  }

  function todayRome() {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Rome',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date());
    const get = (type) => parts.find((part) => part.type === type)?.value || '';
    return `${get('year')}-${get('month')}-${get('day')}`;
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

  async function uploadHtmlSnapshot(file, updateDateValue) {
    const html = await file.text();
    const response = await fetch(api, {
      method: 'POST',
      headers: {
        authorization: authHeader(),
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        action: 'upload-html',
        fileName: file.name,
        updateDate: updateDateValue,
        html
      })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(body.error || 'Non è stato possibile caricare il file HTML.');
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
    const historic = historicFilter?.value || '';
    const rentalMail = rentalMailFilter?.value || '';
    const payment = paymentFilter?.value || '';
    const search = (textFilter?.value || '').trim().toLocaleLowerCase('it-IT');

    return data.rows
      .filter((row) => !region || row.region === region)
      .filter((row) => !status || row.status === status)
      .filter((row) => !historic || (row.registered2025 ? 'yes' : 'no') === historic)
      .filter((row) => !rentalMail || (row.rentalMailReceived ? 'yes' : 'no') === rentalMail)
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
    sourceCard?.classList.toggle('is-ok', data.ficAvailable === true && data.financialAvailable === true);
    sourceCard?.classList.toggle('is-warning', data.ficAvailable !== true || data.financialAvailable !== true);
    if (sourceLink && data.sourceUrl) sourceLink.href = data.sourceUrl;

    if (data.registrationSource === 'upload' && data.latestUpload) {
      sourceTitle.textContent = `Elenco iscritti aggiornato al ${formatDate(data.latestUpload.updateDate)}`;
      const athleteText = data.latestUpload.athletesTotal === null || data.latestUpload.athletesTotal === undefined
        ? 'atleti non disponibili'
        : `${data.latestUpload.athletesTotal} atleti`;
      sourceDetail.textContent =
        `${data.latestUpload.societyCount} società · ${athleteText} · file ${data.latestUpload.fileName}. ` +
        (data.financialAvailable
          ? `Dati economici FIC letti il ${formatTimestamp(data.fetchedAt)}.`
          : `Dati economici FIC non disponibili: ${data.sourceError || 'portale non raggiungibile'}`);
    } else if (data.ficAvailable) {
      sourceTitle.textContent = 'Dati FIC live aggiornati';
      sourceDetail.textContent =
        `Lettura effettuata il ${formatTimestamp(data.fetchedAt)} · ${data.summary?.sourceRegistrations ?? 0} società presenti nel portale FIC. Nessun file HTML caricato.` +
        ((data.summary?.unmatchedRegistrations || 0) ? ` ${data.summary.unmatchedRegistrations} riga/e da verificare.` : '');
    } else {
      sourceTitle.textContent = 'Anagrafica disponibile, elenco iscritti non disponibile';
      sourceDetail.textContent = `${data.sourceError || 'Portale FIC non disponibile.'} Carica un file HTML per aggiornare lo stato delle iscrizioni.`;
    }
  }

  function renderUploadHistory() {
    if (!uploadHistory) return;
    const uploads = Array.isArray(data?.uploadHistory) ? data.uploadHistory : [];
    if (!uploads.length) {
      uploadHistory.innerHTML = '<span class="society-upload-history__empty">Nessun file HTML caricato.</span>';
      return;
    }

    uploadHistory.innerHTML =
      '<strong>Storico aggiornamenti</strong>' +
      '<div class="society-upload-history__items">' +
      uploads.slice(0, 8).map((item, index) => {
        const athletes = item.athletesTotal === null || item.athletesTotal === undefined
          ? 'atleti n.d.'
          : `${item.athletesTotal} atleti`;
        return `<div class="society-upload-history__item${index === 0 ? ' is-current' : ''}">
          <span><b>${escapeHtml(formatDate(item.updateDate))}</b> · ${escapeHtml(item.societyCount)} società · ${escapeHtml(athletes)}</span>
          <small>${escapeHtml(item.fileName || '')} · caricato ${escapeHtml(formatTimestamp(item.uploadedAt))}${index === 0 ? ' · in uso' : ''}</small>
        </div>`;
      }).join('') +
      '</div>';
  }

  function renderKpis() {
    if (!kpis || !data?.summary) return;
    const s = data.summary;
    const cards = [
      { label: 'Società FIC 2026', value: s.totalSocieties ?? 0, className: '' },
      {
        label: 'Società iscritte',
        value: data.ficAvailable ? s.registered ?? 0 : '—',
        historic: `${s.registered2025 ?? 62} nel 2025`,
        mailBreakdown: data.ficAvailable ? {
          registered: s.rentalMailRegistered ?? 0,
          other: Math.max(0, Number(s.rentalMailReceived || 0) - Number(s.rentalMailRegistered || 0))
        } : null,
        className: 'society-kpi--registered'
      },
      {
        label: 'Atleti iscritti',
        value: s.athletes2026 ?? '—',
        historic: `${s.athletes2025 ?? 445} nel 2025`,
        className: 'society-kpi--athletes'
      },
      { label: 'Non iscritte', value: data.ficAvailable ? s.notRegistered ?? 0 : '—', className: 'society-kpi--not-registered' },
      { label: 'Importo dovuto', value: data.financialAvailable ? formatMoney(s.amountDue) : '—', className: '' },
      { label: 'Noleggio barche', value: data.financialAvailable ? formatMoney(s.boatRental) : '—', className: '' },
      { label: 'Importo pagato', value: data.financialAvailable ? formatMoney(s.amountPaid) : '—', className: '' }
    ];

    kpis.innerHTML = cards.map((card) => `
      <article class="society-kpi ${card.className}">
        <span class="society-kpi__label">${escapeHtml(card.label)}</span>
        <strong>
          ${escapeHtml(card.value)}
          ${card.historic !== undefined ? `<small class="society-kpi__historic">(${escapeHtml(card.historic)})</small>` : ''}
        </strong>
        ${card.mailBreakdown ? `<div class="society-kpi__mail-breakdown">
          <div class="society-kpi__mail-row">
            <span class="society-kpi__mail-marker" aria-hidden="true">↳</span>
            <b>${escapeHtml(card.mailBreakdown.registered)}</b>
            <span>${card.mailBreakdown.registered === 1 ? 'ha inviato' : 'hanno inviato'} mail di noleggio</span>
          </div>
          <div class="society-kpi__mail-row society-kpi__mail-row--extra">
            <span class="society-kpi__mail-marker" aria-hidden="true">+</span>
            <b>${escapeHtml(card.mailBreakdown.other)}</b>
            <span>${card.mailBreakdown.other === 1 ? 'altra società ha inviato' : 'altre società hanno inviato'} mail di noleggio</span>
          </div>
        </div>` : ''}
      </article>`).join('');
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
    const rentalMailCount = rows.filter((row) => row.rentalMailReceived).length;
    if (visibleCount) {
      visibleCount.textContent = `${registeredCount} iscritte su ${rows.length} (${registered2025Count} nel 2025) · ${rentalMailCount} mail noleggio`;
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
          <th>Stato</th><th>Iscritta 2025</th><th>Mail di noleggio</th><th>Regione</th><th>Società</th>
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
                <td data-label="Mail di noleggio"><span class="society-mail-badge ${row.rentalMailReceived ? 'is-yes' : 'is-no'}">${row.rentalMailReceived ? 'Ricevuta' : 'No'}</span></td>
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
    renderUploadHistory();
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

  if (uploadDate && !uploadDate.value) uploadDate.value = todayRome();

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

  uploadForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const file = uploadFile?.files?.[0];
    const updateDateValue = uploadDate?.value || '';
    if (!file) {
      setStatus(uploadStatus, 'Seleziona un file HTML.', 'error');
      return;
    }
    if (!updateDateValue) {
      setStatus(uploadStatus, 'Indica la data di aggiornamento.', 'error');
      return;
    }
    if (file.size > 2500000) {
      setStatus(uploadStatus, 'Il file HTML supera il limite consentito.', 'error');
      return;
    }

    if (uploadSubmit) uploadSubmit.disabled = true;
    setStatus(uploadStatus, 'Caricamento…');
    try {
      const result = await uploadHtmlSnapshot(file, updateDateValue);
      const unknown = Array.isArray(result.unknownCodes) ? result.unknownCodes.length : 0;
      setStatus(
        uploadStatus,
        unknown
          ? `File caricato. ${unknown} codice/i società non presenti nell’anagrafica FIC 2026.`
          : 'File caricato e impostato come aggiornamento corrente.',
        unknown ? 'warning' : 'success'
      );
      if (uploadFile) uploadFile.value = '';
      await load();
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        clearStoredCredentials();
        showLogin('Credenziali non valide.');
      } else {
        setStatus(uploadStatus, error.message, 'error');
      }
    } finally {
      if (uploadSubmit) uploadSubmit.disabled = false;
    }
  });

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

  [regionFilter, statusFilter, historicFilter, rentalMailFilter, paymentFilter].forEach((node) => node?.addEventListener('change', renderTable));
  textFilter?.addEventListener('input', renderTable);
  resetFilters?.addEventListener('click', () => {
    if (regionFilter) regionFilter.value = '';
    if (statusFilter) statusFilter.value = '';
    if (historicFilter) historicFilter.value = '';
    if (rentalMailFilter) rentalMailFilter.value = '';
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
      if (historicFilter?.value) parts.push(`Iscritta 2025: ${historicFilter.value === 'yes' ? 'Sì' : 'No'}`);
      if (rentalMailFilter?.value) parts.push(`Mail noleggio: ${rentalMailFilter.value === 'yes' ? 'Ricevuta' : 'Non ricevuta'}`);
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

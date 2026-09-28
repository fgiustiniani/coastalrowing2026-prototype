(() => {
  const api = '/api/volunteers';
  const SESSION_KEY = 'coastal2026-volunteer-session';

  const state = {
    session: null,
    step: 1,
    actorName: '',
    people: [],
    cachedShifts: [],
    selectedPerson: null,
    manualPersonName: '',
    manualSurname: '',
    manualGivenName: '',
    personState: null,
    responses: new Map(),
    availability: new Map(),
    initialAvailability: new Map(),
    clientSubmissionId: crypto.randomUUID(),
    latestSubmissionId: null,
    requestedPersonId: '',
    mode: 'survey',
    tshirtSize: '',
    tshirtSizeAvailable: false
  };

  const accessCard = document.querySelector('[data-access-card]');
  const accessForm = document.querySelector('[data-access-form]');
  const accessTokenInput = document.querySelector('[data-access-token]');
  const accessStatus = document.querySelector('[data-access-status]');
  const app = document.querySelector('[data-app]');
  const pageTitle = document.querySelector('[data-page-title]');
  const pageIntro = document.querySelector('[data-page-intro]');
  const summaryPersonPicker = document.querySelector('[data-summary-person-picker]');
  const summaryPersonSelect = document.querySelector('[data-summary-person-select]');
  const surveyPersonPicker = document.querySelector('[data-survey-person-picker]');
  const personPickerEyebrow = document.querySelector('[data-person-picker-eyebrow]');
  const personPickerTitle = document.querySelector('[data-person-picker-title]');
  const personPickerIntro = document.querySelector('[data-person-picker-intro]');
  const actorNameInput = document.querySelector('[data-actor-name]');
  const actorStatus = document.querySelector('[data-actor-status]');
  const continueActor = document.querySelector('[data-continue-actor]');
  const personSearch = document.querySelector('[data-person-search]');
  const personResults = document.querySelector('[data-person-results]');
  const personSelection = document.querySelector('[data-person-selection]');
  const manualBox = document.querySelector('[data-manual-box]');
  const manualToggle = document.querySelector('[data-manual-toggle]');
  const manualField = document.querySelector('[data-manual-field]');
  const manualSurnameInput = document.querySelector('[data-manual-surname]');
  const manualGivenNameInput = document.querySelector('[data-manual-given-name]');
  const continueManual = document.querySelector('[data-continue-manual]');
  const personIntro = document.querySelector('[data-person-intro]');
  const requestSection = document.querySelector('[data-request-section]');
  const assignmentList = document.querySelector('[data-assignment-list]');
  const assignmentStatus = document.querySelector('[data-assignment-status]');
  const availabilitySection = document.querySelector('[data-availability-section]');
  const availabilityList = document.querySelector('[data-availability-list]');
  const availabilityCount = document.querySelector('[data-availability-count]');
  const summary = document.querySelector('[data-summary]');
  const submitStatus = document.querySelector('[data-submit-status]');
  const submitButton = document.querySelector('[data-submit]');
  const submitWebsite = document.querySelector('[data-submit-website]');
  const noSubmit = document.querySelector('[data-no-submit]');
  const nextSummary = document.querySelector('[data-next-summary]');
  const backToResponses = document.querySelector('[data-back-to-responses]');
  const success = document.querySelector('[data-success]');
  const summaryEmailForm = document.querySelector('[data-summary-email-form]');
  const summaryEmailInput = document.querySelector('[data-summary-email]');
  const summaryEmailStatus = document.querySelector('[data-summary-email-status]');
  const summaryEmailSubmit = document.querySelector('[data-summary-email-submit]');
  const readonlySummary = document.querySelector('[data-readonly-summary]');
  const readonlyEmailForm = document.querySelector('[data-readonly-email-form]');
  const readonlyEmailInput = document.querySelector('[data-readonly-email]');
  const readonlyEmailStatus = document.querySelector('[data-readonly-email-status]');
  const readonlyEmailSubmit = document.querySelector('[data-readonly-email-submit]');
  const programPersonName = document.querySelector('[data-program-person-name]');
  const programPdfButton = document.querySelector('[data-download-program-pdf]');
  const programPdfStatus = document.querySelector('[data-program-pdf-status]');
  const changeSummaryPersonButton = document.querySelector('[data-change-summary-person]');
  const tshirtSection = document.querySelector('[data-tshirt-section]');
  const tshirtSizeInput = document.querySelector('[data-tshirt-size]');
  const tshirtStatus = document.querySelector('[data-tshirt-status]');
  const readonlyTshirtSizeInput = document.querySelector('[data-readonly-tshirt-size]');
  const readonlyTshirtStatus = document.querySelector('[data-readonly-tshirt-status]');
  const readonlyTshirtSaveButton = document.querySelector('[data-save-readonly-tshirt]');

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function setStatus(node, message = '', kind = '') {
    if (!node) return;
    node.textContent = message;
    node.className = `status${kind ? ` is-${kind}` : ''}`;
  }

  function storedSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); }
    catch { return null; }
  }

  function saveSession(value) {
    state.session = value;
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(value)); } catch {}
  }

  function clearSession() {
    state.session = null;
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
  }

  function authHeaders() {
    return state.session?.token ? { authorization: `Bearer ${state.session.token}` } : {};
  }

  async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: { ...authHeaders(), ...(options.headers || {}) },
      cache: 'no-store'
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(body.error || 'Operazione non riuscita.');
      error.status = response.status;
      error.code = body.code;
      throw error;
    }
    return body;
  }

  function showAccess(message = '') {
    if (app) app.hidden = true;
    if (accessCard) accessCard.hidden = false;
    if (message) setStatus(accessStatus, message, 'error');
  }

  function showApp() {
    if (accessCard) accessCard.hidden = true;
    if (app) app.hidden = false;
    showStep(state.step);
  }

  function showStep(step) {
    state.step = step;
    document.querySelectorAll('[data-step]').forEach((node) => {
      node.hidden = Number(node.dataset.step) !== step;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function scrollStepIntoView(step) {
    window.setTimeout(() => {
      const node = document.querySelector(`[data-step="${step}"]:not([hidden])`);
      if (!node) return;
      const top = Math.max(0, window.scrollY + node.getBoundingClientRect().top - 12);
      window.scrollTo({ top, behavior: 'smooth' });
    }, 40);
  }

  async function createSession(accessToken, website = '') {
    const response = await fetch(api, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'session', accessToken, website }),
      cache: 'no-store'
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.token) throw new Error(body.error || 'Codice di accesso non valido.');
    state.mode = body.mode === 'summary' ? 'summary' : 'survey';
    saveSession({ token: body.token, expiresAt: body.expiresAt, mode: state.mode });
  }

  async function loadPeople(searchText = '') {
    const query = String(searchText || '').trim();
    const body = await apiRequest(`${api}?view=people&q=${encodeURIComponent(query)}`);
    state.people = Array.isArray(body.people) ? body.people : [];
    state.cachedShifts = Array.isArray(body.shifts) ? body.shifts : [];
    if (typeof body.tshirtSizeAvailable === 'boolean') {
      state.tshirtSizeAvailable = body.tshirtSizeAvailable;
    }
    renderPeople();
  }

  function sortLabel(person) {
    const surname = person?.surname || '';
    const given = person?.given_name || '';
    if (surname || given) return `${surname} ${given}`.trim();
    return person?.display_name || '';
  }

  function personFirstName() {
    const selectedGiven = String(state.selectedPerson?.given_name || '').trim();
    if (selectedGiven) return selectedGiven;
    const manualGiven = String(state.manualGivenName || '').trim();
    if (manualGiven) return manualGiven;
    const fallback = String(state.manualPersonName || state.selectedPerson?.display_name || '').trim();
    return fallback.split(/\s+/).filter(Boolean).pop() || '';
  }

  function displayActivityName(value) {
    return String(value || '').trim().replace(/^(Gestione barche in spiaggia|Barche noleggiate)-\s*/i, '$1 - ');
  }

  function formatProgramRaceDay(value) {
    const text = String(value || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return text || 'Giorno da definire';
    try {
      const formatted = new Intl.DateTimeFormat('it-IT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: 'Europe/Rome'
      }).format(new Date(`${text}T12:00:00Z`));
      return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    } catch {
      return text;
    }
  }

  function formatProgramRaceTime(value) {
    const match = String(value || '').match(/^(\d{1,2}):(\d{2})/);
    return match ? `${match[1].padStart(2, '0')}:${match[2]}` : 'orario da definire';
  }

  function programTimeMinutes(value) {
    const match = String(value || '').match(/(\d{1,2}):(\d{2})/);
    if (!match) return 9999;
    return (Number(match[1]) * 60) + Number(match[2]);
  }

  function configureSummaryModeUi() {
    const isSummary = state.mode === 'summary';
    // Anche in modalità riepilogo usiamo la ricerca incrementale: non esponiamo mai
    // un menu apribile con l'intera anagrafica dei volontari.
    if (summaryPersonPicker) summaryPersonPicker.hidden = true;
    if (surveyPersonPicker) surveyPersonPicker.hidden = false;
    if (pageTitle) pageTitle.textContent = isSummary ? 'Le mie attività' : 'Disponibilità volontari';
    if (pageIntro) {
      pageIntro.textContent = isSummary
        ? 'Cerca il tuo nominativo per vedere la situazione aggiornata delle attività di supporto e delle gare.'
        : 'Controlla le richieste che richiedono una risposta e le disponibilità che ci hai già comunicato.';
    }
    if (personPickerEyebrow) personPickerEyebrow.textContent = isSummary ? 'Programma personale' : 'Persona interessata';
    if (personPickerTitle) personPickerTitle.textContent = isSummary ? 'Cerca il tuo nominativo' : 'Seleziona il nominativo';
    if (personPickerIntro) {
      personPickerIntro.textContent = isSummary
        ? 'Digita almeno due lettere del tuo nome o cognome e seleziona il suggerimento corretto.'
        : 'Cerca la persona per cui vuoi controllare o aggiornare le disponibilità.';
    }
  }

  function populateSummaryPersonSelect() {
    if (!summaryPersonSelect) return;
    const selected = state.selectedPerson?.id || summaryPersonSelect.value || '';
    const sorted = [...state.people].sort((a, b) => sortLabel(a).localeCompare(sortLabel(b), 'it'));
    summaryPersonSelect.innerHTML = [
      '<option value="">Seleziona il tuo nome e cognome</option>',
      ...sorted.map((person) =>
        `<option value="${escapeHtml(person.id)}">${escapeHtml(sortLabel(person))}</option>`
      )
    ].join('');
    if (selected && sorted.some((person) => person.id === selected)) summaryPersonSelect.value = selected;
  }

  function sortShiftsChronologically(items = []) {
    return [...items].sort((a, b) => {
      const orderA = Number(a?.sortOrder);
      const orderB = Number(b?.sortOrder);
      if (Number.isFinite(orderA) && Number.isFinite(orderB) && orderA !== orderB) return orderA - orderB;
      const startA = Date.parse(a?.startsAt || '');
      const startB = Date.parse(b?.startsAt || '');
      if (Number.isFinite(startA) && Number.isFinite(startB) && startA !== startB) return startA - startB;
      return `${a?.day || ''} ${a?.shift || ''} ${a?.activity || ''}`
        .localeCompare(`${b?.day || ''} ${b?.shift || ''} ${b?.activity || ''}`, 'it');
    });
  }

  function newRequests() {
    return sortShiftsChronologically(state.personState?.openRequests || []);
  }

  function groupItemsByTurn(items = []) {
    const groups = new Map();
    items.forEach((item) => {
      const key = item.shiftId || `${item.day || ''}|${item.shift || ''}`;
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          day: item.day || '',
          shift: item.shift || '',
          sortOrder: Number(item.sortOrder ?? 9999),
          assignments: []
        });
      }
      groups.get(key).assignments.push(item);
    });
    return [...groups.values()].sort((a, b) =>
      a.sortOrder - b.sortOrder
      || `${a.day} ${a.shift}`.localeCompare(`${b.day} ${b.shift}`, 'it')
    );
  }

  function requestGroups() {
    return newRequests().map((request) => ({
      ...request,
      key: request.key || `${request.shiftId}|${String(request.responseLabel || '').toLocaleLowerCase('it-IT')}`,
      label: request.responseLabel || 'Disponibilità'
    }));
  }

  function requestGroupByKey(key) {
    return requestGroups().find((group) => group.key === key) || null;
  }

  function confirmedAssignments() {
    return sortShiftsChronologically(
      (state.personState?.assignments || []).filter((assignment) =>
        assignment.currentResponse === 'confirmed'
        || (assignment.assignedFromAvailability && assignment.currentResponse !== 'declined')
      )
    );
  }

  function originalUnusedAvailability() {
    return sortShiftsChronologically(
      (state.personState?.availabilityShifts || []).filter((shift) => shift.selected && !shift.assigned)
    );
  }

  function renderPeople() {
    const query = String(personSearch?.value || '').trim();
    if (manualBox) manualBox.hidden = query.length < 2 || Boolean(state.selectedPerson) || state.people.length > 0;
    if (state.selectedPerson && query === sortLabel(state.selectedPerson)) {
      personResults.innerHTML = '';
      return;
    }
    if (query.length < 2) {
      personResults.innerHTML = '';
      return;
    }
    if (!state.people.length) {
      personResults.innerHTML = '<p class="muted person-search-empty">Nessun nominativo trovato.</p>';
      return;
    }
    personResults.innerHTML = state.people.map((person) => `
      <button class="person-option" type="button" data-person-id="${escapeHtml(person.id)}" role="option">
        <strong>${escapeHtml(sortLabel(person))}</strong>
        ${person.person_code ? `<small>Codice ${escapeHtml(person.person_code)}</small>` : ''}
      </button>
    `).join('');
  }

  function initializePersonState(detail) {
    state.personState = detail;
    state.responses = new Map();
    state.availability = new Map();
    state.initialAvailability = new Map();
    state.tshirtSizeAvailable = detail?.tshirtSizeAvailable !== false;
    state.tshirtSize = String(detail?.person?.tshirt_size || '').trim().toUpperCase();
    if (!['S', 'M', 'L', 'XL'].includes(state.tshirtSize)) state.tshirtSize = '';

    originalUnusedAvailability().forEach((shift) => {
      const value = { selected: true, note: shift.note || '' };
      state.availability.set(shift.id, value);
      state.initialAvailability.set(shift.id, value);
    });
  }

  function renderReadOnlyTshirtStep() {
    if (readonlyTshirtSizeInput) readonlyTshirtSizeInput.value = state.tshirtSize || '';
    setStatus(readonlyTshirtStatus, '');
  }

  async function saveReadOnlyTshirt() {
    const personId = state.selectedPerson?.id || '';
    const value = String(readonlyTshirtSizeInput?.value || '').trim().toUpperCase();

    if (!personId) {
      setStatus(readonlyTshirtStatus, 'Seleziona prima il nominativo.', 'error');
      return;
    }
    if (!['S', 'M', 'L', 'XL'].includes(value)) {
      setStatus(readonlyTshirtStatus, 'Seleziona la taglia della T-shirt.', 'error');
      readonlyTshirtSizeInput?.focus();
      return;
    }

    const oldText = readonlyTshirtSaveButton?.textContent || 'Salva e continua';
    if (readonlyTshirtSaveButton) {
      readonlyTshirtSaveButton.disabled = true;
      readonlyTshirtSaveButton.textContent = 'Salvataggio…';
    }
    setStatus(readonlyTshirtStatus, 'Salvataggio in corso…');

    try {
      await apiRequest(api, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'save-tshirt-size',
          personId,
          tshirtSize: value
        })
      });
      state.tshirtSize = value;
      if (state.personState?.person) state.personState.person.tshirt_size = value;
      renderReadOnlySummary();
      showStep(5);
    } catch (error) {
      setStatus(readonlyTshirtStatus, error.message, 'error');
    } finally {
      if (readonlyTshirtSaveButton) {
        readonlyTshirtSaveButton.disabled = false;
        readonlyTshirtSaveButton.textContent = oldText;
      }
    }
  }

  function tshirtSummaryHtml() {
    if (!state.tshirtSizeAvailable || !state.tshirtSize) return '';
    return `
      <div class="summary-tshirt">
        <strong>Taglia T-shirt</strong>
        <span>${escapeHtml(state.tshirtSize)}</span>
      </div>
    `;
  }

  function renderReadOnlySummary() {
    if (!readonlySummary) return;

    const assignments = sortShiftsChronologically(state.personState?.assignments || []);
    const races = [...(state.personState?.races || [])].sort((a, b) =>
      String(a.raceDate || '').localeCompare(String(b.raceDate || ''))
      || String(a.raceTime || '').localeCompare(String(b.raceTime || ''))
      || String(a.crewLabel || '').localeCompare(String(b.crewLabel || ''), 'it')
    );

    if (programPersonName) {
      programPersonName.textContent = state.selectedPerson?.display_name
        || state.personState?.person?.display_name
        || 'Le mie attività';
    }

    const byDay = new Map();
    const ensureDay = (day, order) => {
      if (!byDay.has(day)) byDay.set(day, { day, order, items: [] });
      const current = byDay.get(day);
      if (Number(order) < Number(current.order)) current.order = order;
      return current;
    };

    assignments.forEach((row) => {
      const day = row.day || 'Giorno da definire';
      ensureDay(day, Number(row.sortOrder ?? 9999)).items.push({
        kind: 'assignment',
        timeMinutes: programTimeMinutes(row.shift),
        row
      });
    });

    races.forEach((race) => {
      const day = formatProgramRaceDay(race.raceDate);
      const raceStamp = Date.parse(`${race.raceDate || ''}T${formatProgramRaceTime(race.raceTime)}:00`);
      ensureDay(day, Number.isFinite(raceStamp) ? raceStamp : 9999999999999).items.push({
        kind: 'race',
        timeMinutes: programTimeMinutes(race.raceTime),
        row: race
      });
    });

    const days = [...byDay.values()].sort((a, b) => Number(a.order) - Number(b.order)
      || a.day.localeCompare(b.day, 'it'));

    if (!days.length) {
      readonlySummary.innerHTML = '<p class="summary-empty">Non risultano attività di supporto o gare da mostrare.</p>';
      return;
    }

    readonlySummary.innerHTML = `
      <div class="volunteer-program__days">
        ${days.map((day) => `
          <section class="volunteer-program__day">
            <h3>${escapeHtml(day.day)}</h3>
            <div class="volunteer-program__items">
              ${[...day.items]
                .sort((a, b) => a.timeMinutes - b.timeMinutes || (a.kind === 'race' ? 1 : -1))
                .map((entry) => {
                  if (entry.kind === 'assignment') {
                    const item = entry.row;
                    return `
                      <article class="volunteer-program__item is-assignment">
                        <span class="volunteer-program__kind">Attività di supporto</span>
                        <strong class="volunteer-program__time">${escapeHtml(item.shift || '')}</strong>
                        <span class="volunteer-program__activity">${escapeHtml(displayActivityName(item.activity || 'Attività'))}</span>
                      </article>`;
                  }
                  const race = entry.row;
                  return `
                    <article class="volunteer-program__item is-race">
                      <span class="volunteer-program__kind">Gara</span>
                      <strong class="volunteer-program__time">${escapeHtml(formatProgramRaceTime(race.raceTime))}</strong>
                      <span class="volunteer-program__activity">${escapeHtml(race.crewLabel || 'Gara')}</span>
                      ${race.crewMembers?.length ? `
                        <span class="volunteer-program__crew"><strong>Equipaggio:</strong> ${escapeHtml(race.crewMembers.join(', '))}</span>
                      ` : ''}
                    </article>`;
                }).join('')}
            </div>
          </section>
        `).join('')}
      </div>
      <aside class="volunteer-program__remember">
        <strong>Ricorda</strong>
        <span>Questa pagina mostra la situazione aggiornata. Nel PDF troverai anche i riferimenti per tornare sempre a <strong>Le mie attività</strong>.</span>
        <span>Verifica sempre gli orari delle gare nel <a href="https://www.canottaggio.org/" target="_blank" rel="noopener">sito ufficiale della FIC</a>.</span>
      </aside>
    `;
  }

  async function downloadProgramPdf() {
    const personId = state.selectedPerson?.id || '';
    if (!personId) {
      setStatus(programPdfStatus, 'Seleziona prima il nominativo.', 'error');
      return;
    }

    const oldText = programPdfButton?.textContent || 'Scarica PDF';
    if (programPdfButton) {
      programPdfButton.disabled = true;
      programPdfButton.textContent = 'Preparazione PDF…';
    }
    setStatus(programPdfStatus, '');

    try {
      const response = await fetch(api, {
        method: 'POST',
        headers: {
          ...authHeaders(),
          'content-type': 'application/json'
        },
        body: JSON.stringify({ action: 'download-program-pdf', personId }),
        cache: 'no-store'
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'Non è stato possibile preparare il PDF.');
      }

      const blob = await response.blob();
      const disposition = response.headers.get('content-disposition') || '';
      const match = disposition.match(/filename="([^"]+)"/i);
      const filename = match?.[1] || 'programma-attivita.pdf';
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus(programPdfStatus, 'PDF pronto.', 'success');
    } catch (error) {
      setStatus(programPdfStatus, error.message, 'error');
    } finally {
      if (programPdfButton) {
        programPdfButton.disabled = false;
        programPdfButton.textContent = oldText;
      }
    }
  }


  async function selectPerson(person, loadedDetail = null) {
    state.selectedPerson = person;
    state.manualPersonName = '';
    state.manualSurname = '';
    state.manualGivenName = '';
    // Chi compila resta distinto dalla persona interessata.
    if (manualSurnameInput) manualSurnameInput.value = '';
    if (manualGivenNameInput) manualGivenNameInput.value = '';
    if (manualField) manualField.hidden = true;
    if (manualBox) manualBox.hidden = true;
    if (personSearch) personSearch.value = sortLabel(person);
    if (state.mode !== 'summary') {
      state.people = [];
      renderPeople();
    }
    setStatus(personSelection, 'Caricamento…');

    try {
      const detail = loadedDetail || await apiRequest(`${api}?view=person&id=${encodeURIComponent(person.id)}`);
      initializePersonState(detail);
      setStatus(personSelection, '');
      if (state.mode === 'summary') {
        if (summaryPersonSelect) summaryPersonSelect.value = person.id;
        renderReadOnlySummary();
        showStep(5);
      } else {
        renderWorkspace();
        showStep(3);
      }
    } catch (error) {
      setStatus(personSelection, error.message, 'error');
    }
  }

  function continueWithManualPerson() {
    if (state.mode === 'summary') {
      setStatus(personSelection, 'Per il riepilogo seleziona un nominativo presente nell’elenco.', 'error');
      return;
    }
    state.manualSurname = String(manualSurnameInput?.value || '').trim();
    state.manualGivenName = String(manualGivenNameInput?.value || '').trim();
    if (state.manualSurname.length < 2 || state.manualGivenName.length < 2) {
      setStatus(personSelection, 'Inserisci cognome e nome.', 'error');
      (state.manualSurname.length < 2 ? manualSurnameInput : manualGivenNameInput)?.focus();
      return;
    }
    state.selectedPerson = null;
    state.manualPersonName = `${state.manualSurname} ${state.manualGivenName}`.trim();
    initializePersonState({
      person: null,
      assignments: [],
      openRequests: [],
      availabilityShifts: [],
      latestSubmission: null,
      tshirtSizeAvailable: state.tshirtSizeAvailable
    });
    setStatus(personSelection, '');
    renderWorkspace();
    showStep(3);
  }

  function answeredRequestCount() {
    return requestGroups().filter((group) => Boolean(state.responses.get(group.key)?.response)).length;
  }

  function renderPersonIntro() {
    const firstName = personFirstName();
    const hasNewRequests = requestGroups().length > 0;
    const message = hasNewRequests
      ? 'Qui trovi i turni per i quali è richiesto un ulteriore supporto e per i quali puoi confermare o meno la tua disponibilità, insieme a un riepilogo delle disponibilità già date in precedenza.'
      : 'Hai già dato la tua disponibilità nei turni per i quali c\'è bisogno di ulteriore supporto, quindi non devi fare nulla. Qui trovi le disponibilità dichiarate in precedenza. GRAZIE!!';

    personIntro.innerHTML = `
      <p class="volunteer-greeting">Ciao ${escapeHtml(firstName || 'volontario')},</p>
      <p class="volunteer-overview__message">${escapeHtml(message)}</p>
    `;
  }

  function renderAssignments() {
    const groups = requestGroups();
    requestSection.hidden = groups.length === 0;

    if (!groups.length) {
      assignmentList.innerHTML = '';
      setStatus(assignmentStatus, '');
      return;
    }

    assignmentList.innerHTML = groups.map((group) => {
      const saved = state.responses.get(group.key) || {};
      return `
        <article class="assignment-card request-card ${saved.response ? 'is-complete' : ''}" data-request-key="${escapeHtml(group.key)}">
          <div class="assignment-card__head request-card__head">
            <div>
              <div class="request-card__when">${escapeHtml(group.day)} · ${escapeHtml(group.shift)}</div>
              <div class="request-card__activity">${escapeHtml(group.label)}</div>
            </div>
          </div>
          <div class="response-options response-options--simple">
            <label class="response-choice response-choice--yes">
              <input type="radio" name="response-${escapeHtml(group.key)}" value="confirmed" ${saved.response === 'confirmed' ? 'checked' : ''}>
              <span><strong>Confermo</strong></span>
            </label>
            <label class="response-choice response-choice--no">
              <input type="radio" name="response-${escapeHtml(group.key)}" value="declined" ${saved.response === 'declined' ? 'checked' : ''}>
              <span><strong>Non posso</strong></span>
            </label>
          </div>
          <details class="request-note">
            <summary>Aggiungi una nota <span>facoltativa</span></summary>
            <label class="field assignment-note">
              <textarea maxlength="1000" data-request-note placeholder="Scrivi qui solo se vuoi aggiungere un’informazione utile">${escapeHtml(saved.note || '')}</textarea>
            </label>
          </details>
        </article>
      `;
    }).join('');
  }

  function previousDeclaredCommitments() {
    const stateTimestamp = (row) => {
      const value = row?.stateAt
        || row?.currentResponseAt
        || row?.responseAt
        || row?.releasedAt
        || row?.createdAt
        || '';
      const stamp = Date.parse(value);
      return Number.isFinite(stamp) ? stamp : 0;
    };

    const latestByShift = new Map();
    const currentShiftIds = new Set();

    const currentAssignmentsByShift = new Map();
    for (const assignment of state.personState?.assignments || []) {
      const confirmed = assignment.currentResponse === 'confirmed'
        || (assignment.assignedFromAvailability && assignment.currentResponse !== 'declined');
      const declined = assignment.currentResponse === 'declined';
      if (!confirmed && !declined) continue;

      const shiftKey = assignment.shiftId || `${assignment.day || ''}|${assignment.shift || ''}`;
      if (!currentAssignmentsByShift.has(shiftKey)) currentAssignmentsByShift.set(shiftKey, []);
      currentAssignmentsByShift.get(shiftKey).push({ ...assignment, confirmed, declined });
    }

    for (const [shiftKey, assignments] of currentAssignmentsByShift.entries()) {
      const confirmedRows = assignments.filter((row) => row.confirmed);
      const declinedRows = assignments.filter((row) => row.declined);
      const sourceRows = confirmedRows.length ? confirmedRows : declinedRows;
      const first = sourceRows[0] || assignments[0];
      const activities = [...new Set(sourceRows
        .map((row) => displayActivityName(row.activity || 'Attività assegnata'))
        .filter(Boolean))];
      const latestAt = sourceRows.reduce((latest, row) => {
        const stamp = stateTimestamp(row);
        return stamp > latest ? stamp : latest;
      }, 0);

      latestByShift.set(shiftKey, {
        ...first,
        commitmentKind: confirmedRows.length ? 'assigned' : 'declined',
        commitmentActivity: activities.join(' · ') || 'Attività assegnata',
        commitmentStatus: confirmedRows.length ? 'Confermata' : 'Non posso',
        stateAt: latestAt ? new Date(latestAt).toISOString() : null
      });
      currentShiftIds.add(shiftKey);
    }

    for (const shift of originalUnusedAvailability()) {
      const shiftKey = shift.shiftId || shift.id || `${shift.day || ''}|${shift.shift || ''}`;
      if (!shiftKey || currentShiftIds.has(shiftKey)) continue;

      const candidate = {
        ...shift,
        commitmentKind: 'unassigned',
        commitmentActivity: 'Attività da definire',
        commitmentStatus: shift.isReleasedConfirmed
          ? 'Disponibilità già confermata in precedenza'
          : 'Disponibilità aggiuntiva dichiarata in precedenza'
      };
      const current = latestByShift.get(shiftKey);
      if (!current || stateTimestamp(candidate) >= stateTimestamp(current)) {
        latestByShift.set(shiftKey, candidate);
      }
    }

    const historical = [
      ...(state.personState?.historicalResponses || []),
      ...(state.personState?.historicalOpenRequestResponses || [])
    ];
    for (const item of historical) {
      if (!['confirmed', 'declined'].includes(item.response)) continue;
      const shiftKey = item.shiftId || `${item.day || ''}|${item.shift || ''}`;
      if (!shiftKey || currentShiftIds.has(shiftKey)) continue;

      const candidate = {
        ...item,
        commitmentKind: item.response === 'declined' ? 'declined' : 'confirmed-history',
        commitmentActivity: item.activity || 'Attività',
        commitmentStatus: item.response === 'declined' ? 'Non posso' : 'Confermata'
      };
      const current = latestByShift.get(shiftKey);
      if (!current || stateTimestamp(candidate) > stateTimestamp(current)) {
        latestByShift.set(shiftKey, candidate);
      }
    }

    return sortShiftsChronologically([...latestByShift.values()]);
  }

  function renderAvailability() {
    const commitments = previousDeclaredCommitments();
    availabilitySection.hidden = commitments.length === 0;
    if (availabilityCount) availabilityCount.textContent = commitments.length ? String(commitments.length) : '';

    if (!commitments.length) {
      availabilityList.innerHTML = '';
      return;
    }

    availabilityList.innerHTML = commitments.map((item) => {
      const assigned = item.commitmentKind === 'assigned' || item.commitmentKind === 'confirmed-history';
      const declined = item.commitmentKind === 'declined';
      const unassigned = item.commitmentKind === 'unassigned';
      const raceConflict = unassigned && item.raceConflict === true;
      const cardClass = declined
        ? 'previous-commitment--declined'
        : assigned
          ? 'previous-commitment--assigned'
          : 'previous-commitment--unassigned';

      return `
        <article class="availability-card previous-commitment ${cardClass}">
          <div class="availability-card__content">
            <div>
              <strong>${escapeHtml(item.day)} · ${escapeHtml(item.shift)}</strong>
              ${raceConflict
                ? '<span class="summary-race-conflict-badge">Non assegnato per coincidenza gara</span>'
                : `<span class="previous-commitment__activity">${escapeHtml(displayActivityName(item.commitmentActivity))}</span>
                   <span class="previous-commitment__status">${escapeHtml(item.commitmentStatus || '')}</span>`}
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  function renderSummary() {
    const currentAssignments = (state.personState?.assignments || [])
      .filter((assignment) =>
        assignment.currentResponse === 'confirmed'
        || assignment.currentResponse === 'declined'
        || (assignment.assignedFromAvailability && assignment.currentResponse !== 'declined')
      )
      .map((assignment) => ({
        ...assignment,
        summaryActivity: assignment.activity || 'Attività',
        summaryStatus: assignment.currentResponse === 'declined' ? 'Non disponibile' : 'Confermata',
        summaryKind: assignment.currentResponse === 'declined' ? 'declined' : 'confirmed',
        summaryNew: false
      }));

    const historicalResponses = [
      ...(state.personState?.historicalResponses || []),
      ...(state.personState?.historicalOpenRequestResponses || [])
    ].map((item) => ({
      ...item,
      summaryActivity: item.activity || 'Attività',
      summaryStatus: item.response === 'declined' ? 'Non disponibile' : 'Confermata',
      summaryKind: item.response === 'declined' ? 'declined' : 'confirmed',
      summaryNew: false
    }));

    const newResponses = requestGroups()
      .filter((request) => ['confirmed', 'declined'].includes(state.responses.get(request.key)?.response))
      .map((request) => {
        const response = state.responses.get(request.key)?.response;
        return {
          ...request,
          summaryActivity: '',
          summaryStatus: response === 'declined' ? 'Non disponibile' : 'Confermata',
          summaryKind: response === 'declined' ? 'declined' : 'confirmed',
          summaryNew: true
        };
      });

    const additionalAvailability = originalUnusedAvailability()
      .map((shift) => ({
        ...shift,
        summaryActivity: 'Nessuna attività assegnata: sei libero',
        summaryStatus: shift.isReleasedConfirmed
          ? 'Disponibilità già confermata in precedenza'
          : 'Disponibilità aggiuntiva dichiarata in precedenza',
        summaryKind: 'availability',
        summaryNew: false,
        raceConflict: shift.raceConflict === true
      }));

    const currentAssignmentShiftKeys = new Set(
      currentAssignments.map((row) => row.shiftId || `${row.day || ''}|${row.shift || ''}`)
    );

    const stateTimestamp = (row) => {
      if (row?.summaryNew) return Number.MAX_SAFE_INTEGER;
      const value = row?.summaryStateAt
        || row?.stateAt
        || row?.responseAt
        || row?.currentResponseAt
        || row?.createdAt
        || row?.releasedAt
        || '';
      const stamp = Date.parse(value);
      return Number.isFinite(stamp) ? stamp : 0;
    };

    const statePriority = (row) => {
      if (row?.summaryKind === 'availability') return 4;
      if (row?.summaryKind === 'declined') return 3;
      if (row?.summaryKind === 'confirmed') return 2;
      return 1;
    };

    const latestStateByShift = new Map();
    for (const row of [...historicalResponses, ...newResponses, ...additionalAvailability]) {
      const shiftKey = row.shiftId || `${row.day || ''}|${row.shift || ''}`;
      if (!shiftKey || currentAssignmentShiftKeys.has(shiftKey)) continue;

      const current = latestStateByShift.get(shiftKey);
      const rowTime = stateTimestamp(row);
      const currentTime = current ? stateTimestamp(current) : -1;
      if (!current || rowTime > currentTime || (rowTime === currentTime && statePriority(row) > statePriority(current))) {
        latestStateByShift.set(shiftKey, row);
      }
    }

    const rows = sortShiftsChronologically([
      ...currentAssignments,
      ...latestStateByShift.values()
    ]);

    if (!rows.length) {
      summary.innerHTML = `${tshirtSummaryHtml()}<p class="summary-empty">Nessuna disponibilità da riepilogare.</p>`;
      return;
    }

    summary.innerHTML = `
      ${tshirtSummaryHtml()}
      <div class="summary-items summary-items--unified">
        ${rows.map((item) => {
          const availabilityRaceConflict = item.summaryKind === 'availability' && item.raceConflict === true;
          return `
            <article class="summary-item summary-item--${escapeHtml(item.summaryKind)}">
              <div class="summary-item__top">
                <strong class="summary-item__when">${escapeHtml(item.day)} · ${escapeHtml(item.shift)}</strong>
                ${availabilityRaceConflict
                  ? '<span class="summary-race-conflict-badge">Non assegnato per coincidenza gara</span>'
                  : (item.summaryNew ? '<span class="summary-new-badge">NUOVA</span>' : '')}
              </div>
              ${!availabilityRaceConflict && item.summaryActivity
                ? `<span class="summary-item__activity">${escapeHtml(displayActivityName(item.summaryActivity))}</span>`
                : ''}
              ${!availabilityRaceConflict
                ? `<span class="summary-item__status">${escapeHtml(item.summaryStatus || '')}</span>`
                : ''}
            </article>
          `;
        }).join('')}
      </div>
    `;
  }

  function validateTshirt({ focus = false } = {}) {
    if (!state.tshirtSizeAvailable) {
      setStatus(tshirtStatus, '');
      return true;
    }
    const value = String(state.tshirtSize || '').trim().toUpperCase();
    if (['S', 'M', 'L', 'XL'].includes(value)) {
      state.tshirtSize = value;
      if (tshirtSizeInput) tshirtSizeInput.value = value;
      setStatus(tshirtStatus, '');
      return true;
    }
    setStatus(tshirtStatus, 'Seleziona la taglia della T-shirt.', 'error');
    if (focus) {
      tshirtSection?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      tshirtSizeInput?.focus();
    }
    return false;
  }

  function validateRequests({ focus = false } = {}) {
    const groups = requestGroups();
    const missing = groups.filter((group) => !state.responses.get(group.key)?.response);

    assignmentList?.querySelectorAll('.assignment-card.is-incomplete').forEach((card) => {
      card.classList.remove('is-incomplete');
    });

    if (!missing.length) {
      setStatus(assignmentStatus, '');
      return true;
    }

    setStatus(
      assignmentStatus,
      `Manca ${missing.length === 1 ? 'una risposta' : `${missing.length} risposte`}.`,
      'error'
    );
    missing.forEach((group) => {
      assignmentList?.querySelector(`[data-request-key="${CSS.escape(group.key)}"]`)?.classList.add('is-incomplete');
    });
    if (focus) {
      assignmentList?.querySelector('.assignment-card.is-incomplete')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return false;
  }

  function updateSubmitState() {
    const groups = requestGroups();
    const hasRequests = groups.length > 0;
    const complete = groups.every((group) => Boolean(state.responses.get(group.key)?.response));

    submitButton.hidden = false;
    noSubmit.hidden = hasRequests;
    submitButton.disabled = hasRequests && !complete;

    if (hasRequests) {
      submitButton.textContent = complete ? 'Invia risposte' : `Completa le richieste (${answeredRequestCount()}/${groups.length})`;
    } else {
      submitButton.textContent = 'Continua';
    }
  }

  function renderWorkspace() {
    renderPersonIntro();
    if (tshirtSection) tshirtSection.hidden = !state.tshirtSizeAvailable;
    if (tshirtSizeInput) tshirtSizeInput.value = state.tshirtSize || '';
    setStatus(tshirtStatus, '');
    renderAssignments();
    renderAvailability();
    updateSubmitState();
    setStatus(submitStatus, '');
  }

  function goToSummary() {
    if (!validateTshirt({ focus: true })) return;
    if (!validateRequests({ focus: true })) return;
    renderSummary();
    updateSubmitState();
    setStatus(submitStatus, '');
    showStep(4);
  }

  async function submit() {
    if (!validateTshirt({ focus: true })) return;
    if (!validateRequests({ focus: true })) return;

    const originalText = submitButton?.textContent || 'Invia risposte';
    submitButton.disabled = true;
    submitButton.textContent = 'Invio in corso…';
    setStatus(submitStatus, 'Invio in corso…');

    try {
      const payload = {
        action: 'submit',
        actorName: state.actorName,
        personId: state.selectedPerson?.id || null,
        manualPersonName: state.selectedPerson ? null : state.manualPersonName,
        manualSurname: state.selectedPerson ? null : state.manualSurname,
        manualGivenName: state.selectedPerson ? null : state.manualGivenName,
        tshirtSize: state.tshirtSizeAvailable ? state.tshirtSize : null,
        clientSubmissionId: state.clientSubmissionId,
        website: submitWebsite?.value || '',
        openRequestResponses: requestGroups()
          .map((request) => {
            const value = state.responses.get(request.key) || {};
            return {
              shiftId: request.shiftId,
              responseLabel: request.responseLabel || request.label || '',
              response: value.response || '',
              note: value.note || ''
            };
          }),
        availability: []
      };

      const body = await apiRequest(api, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });

      state.latestSubmissionId = body.submission?.id || null;
      document.querySelectorAll('[data-step]').forEach((node) => { node.hidden = true; });
      if (success) success.hidden = false;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      setStatus(submitStatus, error.message, 'error');
      submitButton.disabled = false;
      submitButton.textContent = originalText;
    }
  }

  async function sendSummaryEmail(event) {
    event.preventDefault();
    const email = String(summaryEmailInput?.value || '').trim();
    if (!state.latestSubmissionId) {
      setStatus(summaryEmailStatus, 'Riepilogo non disponibile.', 'error');
      return;
    }

    summaryEmailSubmit.disabled = true;
    const oldText = summaryEmailSubmit.textContent;
    summaryEmailSubmit.textContent = 'Invio in corso…';
    setStatus(summaryEmailStatus, '');

    try {
      await apiRequest(api, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'email-summary',
          submissionId: state.latestSubmissionId,
          email
        })
      });
      setStatus(summaryEmailStatus, 'Riepilogo inviato.', 'success');
      summaryEmailForm.reset();
    } catch (error) {
      setStatus(summaryEmailStatus, error.message, 'error');
    } finally {
      summaryEmailSubmit.disabled = false;
      summaryEmailSubmit.textContent = oldText;
    }
  }

  async function sendReadOnlySummaryEmail(event) {
    event.preventDefault();
    const email = String(readonlyEmailInput?.value || '').trim();
    const personId = state.selectedPerson?.id || '';
    if (!personId) {
      setStatus(readonlyEmailStatus, 'Seleziona prima il nominativo.', 'error');
      return;
    }

    readonlyEmailSubmit.disabled = true;
    const oldText = readonlyEmailSubmit.textContent;
    readonlyEmailSubmit.textContent = 'Invio in corso…';
    setStatus(readonlyEmailStatus, '');

    try {
      await apiRequest(api, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'email-program-pdf',
          personId,
          email
        })
      });
      setStatus(readonlyEmailStatus, 'PDF inviato.', 'success');
      readonlyEmailForm.reset();
    } catch (error) {
      setStatus(readonlyEmailStatus, error.message, 'error');
    } finally {
      readonlyEmailSubmit.disabled = false;
      readonlyEmailSubmit.textContent = oldText;
    }
  }

  async function continueWithActor() {
    state.actorName = String(actorNameInput?.value || '').replace(/\s+/g, ' ').trim();
    setStatus(actorStatus, '');

    if (state.requestedPersonId) {
      try {
        const detail = await apiRequest(`${api}?view=person&id=${encodeURIComponent(state.requestedPersonId)}`);
        if (detail?.person) {
          await selectPerson(detail.person, detail);
          scrollStepIntoView(state.step);
          return;
        }
      } catch {
        setStatus(personSelection, 'Il nominativo del link non è disponibile: cercalo manualmente.', 'error');
      }
    }

    showStep(2);
    if (manualBox) manualBox.hidden = state.mode === 'summary';
    try { personSearch?.focus({ preventScroll: true }); } catch { personSearch?.focus(); }
    scrollStepIntoView(2);
  }

  let searchTimer = null;
  personSearch?.addEventListener('input', () => {
    state.selectedPerson = null;
    clearTimeout(searchTimer);
    const query = String(personSearch.value || '').trim();
    if (query.length < 2) {
      state.people = [];
      renderPeople();
      return;
    }
    searchTimer = setTimeout(() => {
      loadPeople(query).catch((error) => setStatus(personSelection, error.message, 'error'));
    }, 150);
  });

  personResults?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-person-id]');
    if (!button) return;
    const person = state.people.find((item) => item.id === button.dataset.personId);
    if (person) selectPerson(person);
  });

  manualToggle?.addEventListener('click', () => {
    if (!manualField) return;
    manualField.hidden = !manualField.hidden;
    if (!manualField.hidden) manualSurnameInput?.focus();
  });

  summaryPersonSelect?.addEventListener('change', () => {
    const personId = summaryPersonSelect.value || '';
    if (!personId) {
      state.selectedPerson = null;
      state.personState = null;
      return;
    }
    const person = state.people.find((item) => item.id === personId);
    if (person) selectPerson(person);
  });

  programPdfButton?.addEventListener('click', downloadProgramPdf);

  changeSummaryPersonButton?.addEventListener('click', () => {
    state.selectedPerson = null;
    state.personState = null;
    if (summaryPersonSelect) summaryPersonSelect.value = '';
    setStatus(personSelection, '');
    showStep(2);
    summaryPersonSelect?.focus();
  });

  continueActor?.addEventListener('click', continueWithActor);
  actorNameInput?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    continueWithActor();
  });
  continueManual?.addEventListener('click', continueWithManualPerson);
  tshirtSizeInput?.addEventListener('change', () => {
    state.tshirtSize = String(tshirtSizeInput.value || '').trim().toUpperCase();
    setStatus(tshirtStatus, '');
  });
  nextSummary?.addEventListener('click', goToSummary);
  backToResponses?.addEventListener('click', () => showStep(3));

  assignmentList?.addEventListener('change', (event) => {
    if (!event.target.matches('input[type="radio"][name^="response-"]')) return;
    const card = event.target.closest('[data-request-key]');
    if (!card) return;
    const group = requestGroupByKey(card.dataset.requestKey);
    if (!group) return;
    const current = state.responses.get(group.key) || {};
    state.responses.set(group.key, { ...current, response: event.target.value });
    renderAssignments();
    updateSubmitState();
  });

  assignmentList?.addEventListener('input', (event) => {
    if (!event.target.matches('[data-request-note]')) return;
    const card = event.target.closest('[data-request-key]');
    if (!card) return;
    const group = requestGroupByKey(card.dataset.requestKey);
    if (!group) return;
    const current = state.responses.get(group.key) || {};
    state.responses.set(group.key, { ...current, note: event.target.value });
  });

  submitButton?.addEventListener('click', submit);
  readonlyTshirtSaveButton?.addEventListener('click', saveReadOnlyTshirt);
  summaryEmailForm?.addEventListener('submit', sendSummaryEmail);
  readonlyEmailForm?.addEventListener('submit', sendReadOnlySummaryEmail);

  accessForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus(accessStatus, 'Verifica accesso…');
    try {
      await createSession(accessTokenInput.value, accessForm.elements.website?.value || '');
      await loadPeople();
      setStatus(accessStatus, '');
      showApp();
    } catch (error) {
      setStatus(accessStatus, error.message, 'error');
    }
  });

  async function bootstrap() {
    const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
    const access = hash.get('access');
    const requestedPersonId = new URLSearchParams(location.search).get('person') || '';
    state.requestedPersonId = requestedPersonId;

    if (access) {
      try {
        await createSession(access);
        history.replaceState(null, '', `${location.pathname}${location.search}`);
      } catch (error) {
        clearSession();
        showAccess(error.message);
        return;
      }
    } else {
      const saved = storedSession();
      if (saved?.token) {
        state.session = saved;
        state.mode = saved.mode === 'summary' ? 'summary' : 'survey';
      }
    }

    if (!state.session?.token) {
      showAccess();
      return;
    }

    try {
      await loadPeople();
      configureSummaryModeUi();
      showApp();

      if (state.mode === 'summary') {
        if (state.requestedPersonId) {
          try {
            const detail = await apiRequest(`${api}?view=person&id=${encodeURIComponent(state.requestedPersonId)}`);
            const listedPerson = state.people.find((person) => person.id === state.requestedPersonId);
            const person = listedPerson || detail?.person || null;
            if (person) {
              await selectPerson(person, detail);
            } else {
              showStep(2);
              setStatus(personSelection, 'Il nominativo del link non è disponibile: selezionalo dal menu.', 'error');
            }
          } catch {
            showStep(2);
            setStatus(personSelection, 'Il nominativo del link non è disponibile: selezionalo dal menu.', 'error');
          }
        } else {
          showStep(2);
          summaryPersonSelect?.focus();
        }
      } else {
        showStep(1);
        actorNameInput?.focus();
      }
    } catch (error) {
      if (error.status === 401) {
        clearSession();
        showAccess('La sessione è scaduta. Riapri il link ricevuto.');
      } else {
        showAccess(error.message);
      }
    }
  }

  bootstrap();
})();

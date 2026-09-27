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
    requestedPersonId: ''
  };

  const accessCard = document.querySelector('[data-access-card]');
  const accessForm = document.querySelector('[data-access-form]');
  const accessTokenInput = document.querySelector('[data-access-token]');
  const accessStatus = document.querySelector('[data-access-status]');
  const app = document.querySelector('[data-app]');
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
  const requestProgress = document.querySelector('[data-request-progress]');
  const assignmentList = document.querySelector('[data-assignment-list]');
  const assignmentStatus = document.querySelector('[data-assignment-status]');
  const availabilitySection = document.querySelector('[data-availability-section]');
  const availabilityList = document.querySelector('[data-availability-list]');
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

  async function createSession(accessToken, website = '') {
    const response = await fetch(api, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'session', accessToken, website }),
      cache: 'no-store'
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.token) throw new Error(body.error || 'Codice di accesso non valido.');
    saveSession({ token: body.token, expiresAt: body.expiresAt });
  }

  async function loadPeople(searchText = '') {
    const query = String(searchText || '').trim();
    const body = await apiRequest(`${api}?view=people&q=${encodeURIComponent(query)}`);
    state.people = Array.isArray(body.people) ? body.people : [];
    state.cachedShifts = Array.isArray(body.shifts) ? body.shifts : [];
    renderPeople();
  }

  function sortLabel(person) {
    const surname = person?.surname || '';
    const given = person?.given_name || '';
    if (surname || given) return `${surname} ${given}`.trim();
    return person?.display_name || '';
  }

  function displayActivityName(value) {
    return String(value || '').trim().replace(/^(Gestione barche in spiaggia|Barche noleggiate)-\s*/i, '$1 - ');
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

    originalUnusedAvailability().forEach((shift) => {
      const value = { selected: true, note: shift.note || '' };
      state.availability.set(shift.id, value);
      state.initialAvailability.set(shift.id, value);
    });
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
    state.people = [];
    renderPeople();
    setStatus(personSelection, 'Caricamento…');

    try {
      const detail = loadedDetail || await apiRequest(`${api}?view=person&id=${encodeURIComponent(person.id)}`);
      initializePersonState(detail);
      setStatus(personSelection, '');
      renderWorkspace();
      showStep(3);
    } catch (error) {
      setStatus(personSelection, error.message, 'error');
    }
  }

  function continueWithManualPerson() {
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
      latestSubmission: null
    });
    setStatus(personSelection, '');
    renderWorkspace();
    showStep(3);
  }

  function answeredRequestCount() {
    return requestGroups().filter((group) => Boolean(state.responses.get(group.key)?.response)).length;
  }

  function renderPersonIntro() {
    const requests = requestGroups();
    const availability = originalUnusedAvailability();
    const name = state.selectedPerson ? sortLabel(state.selectedPerson) : state.manualPersonName;

    let message = '';
    if (requests.length) {
      message = `Abbiamo <strong>${requests.length} ${requests.length === 1 ? 'nuova richiesta' : 'nuove richieste'}</strong> per te. Rispondi solo alle richieste indicate qui sotto; ciò che hai già confermato non richiede alcuna azione.`;
    } else if (availability.length) {
      message = 'Non hai nuove attività da confermare. Controlla soltanto che le disponibilità aggiuntive già comunicate siano ancora valide.';
    } else {
      message = 'È tutto aggiornato. Non hai nuove richieste e non devi fare nulla.';
    }

    personIntro.innerHTML = `
      <p class="eyebrow">Ciao ${escapeHtml(name)}</p>
      <div class="volunteer-overview__message">${message}</div>
    `;
  }

  function renderAssignments() {
    const groups = requestGroups();
    requestSection.hidden = groups.length === 0;

    if (!groups.length) {
      assignmentList.innerHTML = '';
      if (requestProgress) requestProgress.textContent = '';
      setStatus(assignmentStatus, '');
      return;
    }

    const answered = answeredRequestCount();
    requestProgress.textContent = `${answered} di ${groups.length} completat${groups.length === 1 ? 'a' : 'e'}`;

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

  function renderAvailability() {
    const shifts = originalUnusedAvailability();
    availabilitySection.hidden = shifts.length === 0;

    if (!shifts.length) {
      availabilityList.innerHTML = '';
      return;
    }

    availabilityList.innerHTML = shifts.map((shift) => {
      const active = state.availability.has(shift.id);
      const initial = state.initialAvailability.get(shift.id) || {};
      return `
        <article class="availability-card availability-card--existing ${active ? 'is-active' : 'is-removed'}" data-shift-id="${escapeHtml(shift.id)}">
          <div class="availability-card__content">
            <div>
              <strong>${escapeHtml(shift.day)} · ${escapeHtml(shift.shift)}</strong>
              <span class="availability-state ${active ? 'is-active' : 'is-removed'}">
                ${active ? '✓ Disponibilità comunicata' : 'Disponibilità rimossa'}
              </span>
              ${initial.note ? `<small>Nota: ${escapeHtml(initial.note)}</small>` : ''}
            </div>
            <button class="button button--secondary availability-toggle" type="button" data-toggle-availability>
              ${active ? 'Togli disponibilità' : 'Ripristina'}
            </button>
          </div>
        </article>
      `;
    }).join('');
  }

  function availabilityHasChanges() {
    const initialIds = [...state.initialAvailability.keys()].sort();
    const currentIds = [...state.availability.keys()].sort();
    return initialIds.length !== currentIds.length
      || initialIds.some((id, index) => id !== currentIds[index]);
  }

  function summaryRowsHtml(items, emptyText, { status = false } = {}) {
    const rows = sortShiftsChronologically(items);
    if (!rows.length) return `<p class="summary-empty">${escapeHtml(emptyText)}</p>`;
    return `<div class="summary-items">${rows.map((item) => {
      const activity = item.summaryActivity || item.activity || item.label || item.responseLabel || 'Disponibilità aggiuntiva';
      const stateLabel = item.summaryStatus || '';
      return `
        <article class="summary-item">
          <strong class="summary-item__when">${escapeHtml(item.day)} · ${escapeHtml(item.shift)}</strong>
          <span class="summary-item__activity">${escapeHtml(displayActivityName(activity))}</span>
          ${status && stateLabel ? `<span class="summary-item__status">${escapeHtml(stateLabel)}</span>` : ''}
        </article>`;
    }).join('')}</div>`;
  }

  function renderSummary() {
    const currentAssignments = sortShiftsChronologically(state.personState?.assignments || []).map((assignment) => ({
      ...assignment,
      summaryActivity: assignment.activity || 'Attività',
      summaryStatus: assignment.currentResponse === 'confirmed'
        || (assignment.assignedFromAvailability && assignment.currentResponse !== 'declined')
          ? 'Confermata'
          : assignment.currentResponse === 'declined'
            ? 'Non disponibile'
            : 'Da rispondere'
    }));
    const requests = requestGroups();
    const newlyConfirmed = requests
      .filter((request) => state.responses.get(request.key)?.response === 'confirmed')
      .map((request) => {
        const activity = Array.isArray(request.activities) && request.activities.length
          ? request.activities.join(' · ')
          : request.label;
        return { ...request, activity, summaryActivity: activity, summaryStatus: 'Confermata' };
      });
    const newlyDeclined = requests
      .filter((request) => state.responses.get(request.key)?.response === 'declined')
      .map((request) => {
        const activity = Array.isArray(request.activities) && request.activities.length
          ? request.activities.join(' · ')
          : request.label;
        return { ...request, activity, summaryActivity: activity, summaryStatus: 'Non disponibile' };
      });
    const activeAvailability = originalUnusedAvailability()
      .filter((shift) => state.availability.has(shift.id))
      .map((shift) => ({ ...shift, summaryActivity: 'Disponibilità aggiuntiva' }));

    summary.innerHTML = `
      <section class="summary-section">
        <h3>Attività e richieste</h3>
        ${summaryRowsHtml([...currentAssignments, ...newlyConfirmed, ...newlyDeclined], 'Nessuna attività o richiesta.', { status: true })}
      </section>
      <section class="summary-section">
        <h3>Disponibilità aggiuntive attive</h3>
        ${summaryRowsHtml(activeAvailability, 'Nessuna disponibilità aggiuntiva attiva.')}
      </section>
    `;
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
    const changedAvailability = availabilityHasChanges();
    const hasSomethingToSend = hasRequests || changedAvailability;
    const complete = groups.every((group) => Boolean(state.responses.get(group.key)?.response));

    submitButton.hidden = !hasSomethingToSend;
    noSubmit.hidden = hasSomethingToSend;
    submitButton.disabled = hasRequests && !complete;

    if (hasRequests) {
      submitButton.textContent = complete ? 'Invia risposte' : `Completa le richieste (${answeredRequestCount()}/${groups.length})`;
    } else if (changedAvailability) {
      submitButton.textContent = 'Salva modifica disponibilità';
    }
  }

  function renderWorkspace() {
    renderPersonIntro();
    renderAssignments();
    renderAvailability();
    updateSubmitState();
    setStatus(submitStatus, '');
  }

  function goToSummary() {
    if (!validateRequests({ focus: true })) return;
    renderSummary();
    updateSubmitState();
    setStatus(submitStatus, '');
    showStep(4);
  }

  async function submit() {
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
        availability: Array.from(state.availability.entries())
          .map(([shiftId, value]) => ({ shiftId, note: value.note || '' }))
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

  async function continueWithActor() {
    state.actorName = String(actorNameInput?.value || '').replace(/\s+/g, ' ').trim();
    setStatus(actorStatus, '');

    if (state.requestedPersonId) {
      try {
        const detail = await apiRequest(`${api}?view=person&id=${encodeURIComponent(state.requestedPersonId)}`);
        if (detail?.person) {
          await selectPerson(detail.person, detail);
          return;
        }
      } catch {
        setStatus(personSelection, 'Il nominativo del link non è disponibile: cercalo manualmente.', 'error');
      }
    }

    showStep(2);
    personSearch?.focus();
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

  continueActor?.addEventListener('click', continueWithActor);
  actorNameInput?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    continueWithActor();
  });
  continueManual?.addEventListener('click', continueWithManualPerson);
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

  availabilityList?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-toggle-availability]');
    if (!button) return;
    const card = button.closest('[data-shift-id]');
    if (!card) return;
    const shiftId = card.dataset.shiftId;

    if (state.availability.has(shiftId)) {
      state.availability.delete(shiftId);
    } else {
      const initial = state.initialAvailability.get(shiftId) || { selected: true, note: '' };
      state.availability.set(shiftId, { ...initial, selected: true });
    }

    renderAvailability();
    updateSubmitState();
  });

  submitButton?.addEventListener('click', submit);
  summaryEmailForm?.addEventListener('submit', sendSummaryEmail);

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
      if (saved?.token) state.session = saved;
    }

    if (!state.session?.token) {
      showAccess();
      return;
    }

    try {
      await loadPeople();
      showApp();
      showStep(1);
      actorNameInput?.focus();
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

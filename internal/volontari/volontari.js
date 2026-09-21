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
    personState: null,
    responses: new Map(),
    availability: new Map(),
    clientSubmissionId: crypto.randomUUID()
  };

  const accessCard = document.querySelector('[data-access-card]');
  const accessForm = document.querySelector('[data-access-form]');
  const accessTokenInput = document.querySelector('[data-access-token]');
  const accessStatus = document.querySelector('[data-access-status]');
  const app = document.querySelector('[data-app]');
  const actorInput = document.querySelector('[data-actor-name]');
  const personSearch = document.querySelector('[data-person-search]');
  const personResults = document.querySelector('[data-person-results]');
  const personSelection = document.querySelector('[data-person-selection]');
  const manualBox = document.querySelector('[data-manual-box]');
  const manualToggle = document.querySelector('[data-manual-toggle]');
  const manualField = document.querySelector('[data-manual-field]');
  const manualInput = document.querySelector('[data-manual-person]');
  const assignmentList = document.querySelector('[data-assignment-list]');
  const assignmentStatus = document.querySelector('[data-assignment-status]');
  const availabilityList = document.querySelector('[data-availability-list]');
  const summary = document.querySelector('[data-summary]');
  const submitStatus = document.querySelector('[data-submit-status]');
  const submitButton = document.querySelector('[data-submit]');
  const submitWebsite = document.querySelector('[data-submit-website]');
  const success = document.querySelector('[data-success]');
  const successCopy = document.querySelector('[data-success-copy]');
  const submissionCode = document.querySelector('[data-submission-code]');

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
    app.hidden = true;
    accessCard.hidden = false;
    if (message) setStatus(accessStatus, message, 'error');
  }

  function showApp() {
    accessCard.hidden = true;
    app.hidden = false;
    showStep(state.step);
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
    const surname = person.surname || '';
    const given = person.given_name || '';
    if (surname || given) return `${surname} ${given}`.trim();
    return person.display_name || '';
  }

  function renderPeople() {
    const query = String(personSearch?.value || '').trim();
    if (manualBox) manualBox.hidden = query.length < 2 || Boolean(state.selectedPerson);
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

  async function selectPerson(person) {
    state.selectedPerson = person;
    state.manualPersonName = '';
    if (manualInput) manualInput.value = '';
    if (manualField) manualField.hidden = true;
    if (manualBox) manualBox.hidden = true;
    personSearch.value = sortLabel(person);
    setStatus(personSelection, 'Nominativo selezionato.', 'success');
    state.people = [];
    renderPeople();
    setStatus(assignmentStatus, 'Caricamento attività…');
    const detail = await apiRequest(`${api}?view=person&id=${encodeURIComponent(person.id)}`);
    state.personState = detail;
    state.responses = new Map();
    (detail.assignments || []).forEach((assignment) => {
      if (assignment.currentResponse) state.responses.set(assignment.id, { response: assignment.currentResponse, note: assignment.currentNote || '' });
    });
    state.availability = new Map();
    (detail.availabilityShifts || []).forEach((shift) => {
      if (shift.selected && !shift.assigned) state.availability.set(shift.id, { selected: true, note: shift.note || '' });
    });
    renderAssignments();
    renderAvailability();
    setStatus(assignmentStatus, '');
  }

  function useManualPerson() {
    const suggested = String(personSearch?.value || '').trim();
    state.selectedPerson = null;
    state.manualPersonName = suggested;
    state.personState = { assignments: [], availabilityShifts: state.cachedShifts };
    state.responses = new Map();
    state.availability = new Map();
    if (manualField) manualField.hidden = false;
    if (manualInput) {
      manualInput.value = suggested;
      manualInput.focus();
      manualInput.select();
    }
    setStatus(personSelection, 'Inserisci nome e cognome e prosegui.', '');
    renderAssignments();
    renderAvailability();
  }

  function displayActivityName(value) {
    return String(value || '').trim().replace(/^(Gestione barche in spiaggia|Barche noleggiate)-\s*/i, '$1 - ');
  }

  function renderAssignments() {
    const assignments = state.personState?.assignments || [];
    if (!assignments.length) {
      assignmentList.innerHTML = '<div class="assignment-card"><strong>Nessuna attività proposta.</strong><p class="muted">Puoi proseguire e indicare eventuali disponibilità aggiuntive.</p></div>';
      return;
    }
    assignmentList.innerHTML = assignments.map((assignment) => {
      const saved = state.responses.get(assignment.id) || {};
      const declined = saved.response === 'declined';
      return `
        <article class="assignment-card" data-assignment-id="${escapeHtml(assignment.id)}">
          <div class="assignment-card__head"><div><h3>${escapeHtml(displayActivityName(assignment.activity))}</h3><div class="meta">
            <span class="pill">${escapeHtml(assignment.day)}</span><span class="pill">${escapeHtml(assignment.shift)}</span>
            ${assignment.role ? `<span class="pill">${escapeHtml(assignment.role)}</span>` : ''}
            ${!assignment.shiftMatched ? '<span class="pill pill--warn">Turno da verificare</span>' : ''}
          </div></div></div>
          ${assignment.note ? `<p class="muted">${escapeHtml(assignment.note)}</p>` : ''}
          <div class="response-options">
            <label class="response-choice response-choice--yes"><input type="radio" name="response-${escapeHtml(assignment.id)}" value="confirmed" ${saved.response === 'confirmed' ? 'checked' : ''}><span>Confermo</span></label>
            <label class="response-choice response-choice--no"><input type="radio" name="response-${escapeHtml(assignment.id)}" value="declined" ${declined ? 'checked' : ''}><span>Non posso</span></label>
          </div>
          <label class="field assignment-note"><span>Nota facoltativa</span><textarea maxlength="1000" data-assignment-note placeholder="Se vuoi, aggiungi una nota utile per questa attività">${escapeHtml(saved.note || '')}</textarea></label>
        </article>`;
    }).join('');
  }

  function renderAvailability() {
    const shifts = state.personState?.availabilityShifts?.length ? state.personState.availabilityShifts : state.cachedShifts;
    if (!shifts.length) {
      availabilityList.innerHTML = '<p class="muted">Nessun turno disponibile.</p>';
      return;
    }
    const groups = new Map();
    for (const shift of shifts) {
      if (!groups.has(shift.day)) groups.set(shift.day, []);
      groups.get(shift.day).push(shift);
    }
    availabilityList.innerHTML = [...groups.entries()].map(([day, dayShifts]) => `
      <section class="availability-day">
        <h3 class="availability-day__title">${escapeHtml(day)}</h3>
        <div class="availability-day__shifts">
          ${dayShifts.map((shift) => {
            const selected = state.availability.get(shift.id)?.selected || false;
            const note = state.availability.get(shift.id)?.note || '';
            return `
              <article class="availability-card${shift.assigned ? ' is-assigned' : ''}" data-shift-id="${escapeHtml(shift.id)}">
                <div class="availability-card__head"><div><h4>${escapeHtml(shift.shift)}</h4>${shift.assigned ? '<span class="pill">Già assegnato</span>' : ''}</div></div>
                <label class="check"><input type="checkbox" data-availability-check ${selected ? 'checked' : ''} ${shift.assigned ? 'disabled' : ''}><span>${shift.assigned ? 'Turno già coperto da una tua attività' : 'Sono disponibile anche in questo turno'}</span></label>
                <label class="field availability-note" ${selected && !shift.assigned ? '' : 'hidden'}><span>Nota facoltativa</span><textarea maxlength="1000" data-availability-note placeholder="Es. disponibile solo per alcune attività">${escapeHtml(note)}</textarea></label>
              </article>`;
          }).join('')}
        </div>
      </section>`
    ).join('');
  }

  function validateAssignments() {
    const assignments = state.personState?.assignments || [];
    const missing = assignments.filter((assignment) => !state.responses.get(assignment.id)?.response);
    if (missing.length) {
      setStatus(assignmentStatus, `Manca una risposta per ${missing.length} attività.`, 'error');
      return false;
    }
    setStatus(assignmentStatus, '');
    return true;
  }

  function renderSummary() {
    const assignments = state.personState?.assignments || [];
    const confirmed = assignments.filter((a) => state.responses.get(a.id)?.response === 'confirmed');
    const declined = assignments.filter((a) => state.responses.get(a.id)?.response === 'declined');
    const shifts = state.personState?.availabilityShifts?.length ? state.personState.availabilityShifts : state.cachedShifts;
    const extra = shifts.filter((s) => state.availability.get(s.id)?.selected && !s.assigned);
    const selectedName = state.selectedPerson ? sortLabel(state.selectedPerson) : state.manualPersonName;
    const listAssignments = (items) => items.length
      ? `<ul class="summary-list">${items.map((a) => {
          const response = state.responses.get(a.id) || {};
          return `<li><strong>${escapeHtml(a.day)} · ${escapeHtml(a.shift)}</strong> — ${escapeHtml(displayActivityName(a.activity))}${a.role ? ` · ${escapeHtml(a.role)}` : ''}${response.note ? `<br><small>Nota: ${escapeHtml(response.note)}</small>` : ''}</li>`;
        }).join('')}</ul>`
      : '<p class="summary-empty">Nessuna.</p>';

    summary.innerHTML = `
      <section class="summary-section"><h3>Compilato da</h3><p>${escapeHtml(state.actorName)}</p></section>
      <section class="summary-section"><h3>Persona selezionata</h3><p><strong>${escapeHtml(selectedName)}</strong>${state.selectedPerson?.person_code ? ` · codice ${escapeHtml(state.selectedPerson.person_code)}` : ''}</p></section>
      <section class="summary-section"><h3>Attività confermate</h3>${listAssignments(confirmed)}</section>
      <section class="summary-section"><h3>Attività non disponibili</h3>${listAssignments(declined)}</section>
      <section class="summary-section"><h3>Ulteriori disponibilità</h3>${extra.length ? `<ul class="summary-list">${extra.map((s) => { const note = state.availability.get(s.id)?.note || ''; return `<li><strong>${escapeHtml(s.day)} · ${escapeHtml(s.shift)}</strong>${note ? `<br><small>Nota: ${escapeHtml(note)}</small>` : ''}</li>`; }).join('')}</ul>` : '<p class="summary-empty">Nessuna ulteriore disponibilità indicata.</p>'}</section>`;
  }

  function showStep(step) {
    state.step = step;
    document.querySelectorAll('[data-step]').forEach((node) => { node.hidden = Number(node.dataset.step) !== step; });
    document.querySelectorAll('[data-step-dot]').forEach((node) => {
      const n = Number(node.dataset.stepDot);
      if (n === step) node.setAttribute('aria-current', 'step'); else node.removeAttribute('aria-current');
      node.classList.toggle('is-complete', n < step);
    });
    if (step === 5) renderSummary();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function next(step) {
    if (step === 2) {
      state.actorName = String(actorInput.value || '').trim();
      if (state.actorName.length < 2) {
        actorInput.setCustomValidity('Inserisci nome e cognome.'); actorInput.reportValidity(); actorInput.setCustomValidity(''); actorInput.focus(); return;
      }
    }
    if (step === 3) {
      state.manualPersonName = String(manualInput?.value || state.manualPersonName || '').trim();
      if (!state.selectedPerson && state.manualPersonName.length < 2) {
        setStatus(personSelection, 'Seleziona il tuo nominativo oppure inseriscilo manualmente.', 'error');
        personSearch.focus();
        return;
      }
      if (!state.selectedPerson) {
        state.personState = { assignments: [], availabilityShifts: state.cachedShifts };
        renderAssignments();
        renderAvailability();
      }
      setStatus(personSelection, '');
    }
    if (step === 4 && !validateAssignments()) return;
    showStep(step);
  }

  async function submit() {
    if (!validateAssignments()) { showStep(3); return; }
    submitButton.disabled = true;
    setStatus(submitStatus, 'Invio in corso…');
    try {
      const payload = {
        action: 'submit',
        actorName: state.actorName,
        personId: state.selectedPerson?.id || null,
        manualPersonName: state.selectedPerson ? null : state.manualPersonName,
        clientSubmissionId: state.clientSubmissionId,
        website: submitWebsite.value || '',
        responses: Array.from(state.responses.entries()).map(([assignmentId, value]) => ({ assignmentId, response: value.response, note: value.note || '' })),
        availability: Array.from(state.availability.entries()).filter(([, value]) => value.selected).map(([shiftId, value]) => ({ shiftId, note: value.note || '' }))
      };
      const body = await apiRequest(api, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      document.querySelectorAll('[data-step], .stepper').forEach((node) => { node.hidden = true; });
      success.hidden = false;
      successCopy.textContent = `Le risposte per ${body.submission?.personName || (state.selectedPerson ? sortLabel(state.selectedPerson) : state.manualPersonName)} sono state registrate.`;
      const personalCode = String(body.submission?.personCode || '');
      submissionCode.textContent = `${personalCode.startsWith('SB') ? `Codice personale: ${personalCode} · ` : ''}${body.submission?.id ? `Riferimento: ${body.submission.id}` : ''}`;
      setStatus(submitStatus, '');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      if (error.status === 401) { clearSession(); showAccess('La sessione è scaduta. Riapri il link ricevuto.'); return; }
      setStatus(submitStatus, error.message, 'error');
    } finally { submitButton.disabled = false; }
  }

  let personSearchTimer = null;
  personSearch?.addEventListener('input', () => {
    const query = personSearch.value.trim();
    if (state.selectedPerson && query !== sortLabel(state.selectedPerson)) {
      state.selectedPerson = null;
      state.personState = null;
      state.responses = new Map();
      state.availability = new Map();
      setStatus(personSelection, '');
    }
    state.manualPersonName = '';
    if (manualField) manualField.hidden = true;
    if (manualInput) manualInput.value = '';
    clearTimeout(personSearchTimer);
    if (query.length < 2) {
      state.people = [];
      renderPeople();
      return;
    }
    personResults.innerHTML = '<p class="muted person-search-empty">Ricerca…</p>';
    personSearchTimer = setTimeout(() => {
      loadPeople(query).catch((error) => setStatus(personSelection, error.message, 'error'));
    }, 180);
  });
  personResults?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-person-id]'); if (!button) return;
    const person = state.people.find((row) => row.id === button.dataset.personId); if (!person) return;
    selectPerson(person).catch((error) => { personSelection.textContent = error.message; });
  });
  manualToggle?.addEventListener('click', useManualPerson);
  manualInput?.addEventListener('input', () => {
    state.manualPersonName = String(manualInput.value || '').trim();
    setStatus(personSelection, state.manualPersonName ? 'Nominativo inserito manualmente.' : '', state.manualPersonName ? 'success' : '');
  });

  assignmentList?.addEventListener('change', (event) => {
    const card = event.target.closest('[data-assignment-id]'); if (!card) return;
    const assignmentId = card.dataset.assignmentId;
    if (event.target.matches('input[type="radio"]')) {
      const current = state.responses.get(assignmentId) || {};
      state.responses.set(assignmentId, { ...current, response: event.target.value });
    }
  });
  assignmentList?.addEventListener('input', (event) => {
    if (!event.target.matches('[data-assignment-note]')) return;
    const card = event.target.closest('[data-assignment-id]');
    const assignmentId = card.dataset.assignmentId;
    const current = state.responses.get(assignmentId) || {};
    state.responses.set(assignmentId, { ...current, note: event.target.value });
  });

  availabilityList?.addEventListener('change', (event) => {
    if (!event.target.matches('[data-availability-check]')) return;
    const card = event.target.closest('[data-shift-id]'); const shiftId = card.dataset.shiftId; const noteField = card.querySelector('.availability-note'); const selected = event.target.checked;
    const current = state.availability.get(shiftId) || {}; state.availability.set(shiftId, { ...current, selected }); noteField.hidden = !selected;
    if (!selected) { const area = card.querySelector('[data-availability-note]'); if (area) area.value = ''; state.availability.delete(shiftId); }
  });
  availabilityList?.addEventListener('input', (event) => {
    if (!event.target.matches('[data-availability-note]')) return;
    const card = event.target.closest('[data-shift-id]'); const shiftId = card.dataset.shiftId; const current = state.availability.get(shiftId) || { selected: true };
    state.availability.set(shiftId, { ...current, note: event.target.value });
  });

  document.querySelectorAll('[data-next]').forEach((button) => button.addEventListener('click', () => next(Number(button.dataset.next))));
  document.querySelectorAll('[data-back]').forEach((button) => button.addEventListener('click', () => showStep(Number(button.dataset.back))));
  submitButton?.addEventListener('click', submit);

  accessForm?.addEventListener('submit', async (event) => {
    event.preventDefault(); setStatus(accessStatus, 'Verifica accesso…');
    try { await createSession(accessTokenInput.value, accessForm.elements.website?.value || ''); await loadPeople(); setStatus(accessStatus, ''); showApp(); }
    catch (error) { setStatus(accessStatus, error.message, 'error'); }
  });

  async function bootstrap() {
    const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
    const access = hash.get('access');
    if (access) {
      try { await createSession(access); history.replaceState(null, '', `${location.pathname}${location.search}`); }
      catch (error) { clearSession(); showAccess(error.message); return; }
    } else {
      const saved = storedSession(); if (saved?.token) state.session = saved;
    }
    if (!state.session?.token) { showAccess(); return; }
    try { await loadPeople(); showApp(); }
    catch (error) {
      if (error.status === 401) { clearSession(); showAccess('La sessione è scaduta. Riapri il link ricevuto.'); }
      else showAccess(error.message);
    }
  }

  bootstrap();
})();
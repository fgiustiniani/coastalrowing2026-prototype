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

  async function loadPeople() {
    const body = await apiRequest(`${api}?view=people`);
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
    const query = String(personSearch?.value || '').trim().toLocaleLowerCase('it-IT');
    const filtered = state.people
      .filter((person) => {
        const text = `${person.surname || ''} ${person.given_name || ''} ${person.display_name || ''} ${person.person_code || ''}`.toLocaleLowerCase('it-IT');
        return !query || text.includes(query);
      })
      .slice(0, 100);

    if (!filtered.length) {
      personResults.innerHTML = '<p class="muted">Nessuna persona trovata tra quelle con attività assegnate.</p>';
      return;
    }
    personResults.innerHTML = filtered.map((person) => `
      <button class="person-option${state.selectedPerson?.id === person.id ? ' is-selected' : ''}" type="button" data-person-id="${escapeHtml(person.id)}" role="option" aria-selected="${state.selectedPerson?.id === person.id}">
        <strong>${escapeHtml(sortLabel(person))}</strong>
        ${person.person_code ? `<small>Codice ${escapeHtml(person.person_code)}</small>` : ''}
      </button>
    `).join('');
  }

  async function selectPerson(person) {
    state.selectedPerson = person;
    state.manualPersonName = '';
    manualInput.value = '';
    manualField.hidden = true;
    personSelection.textContent = `Selezionato: ${sortLabel(person)}${person.person_code ? ` · codice ${person.person_code}` : ''}`;
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
    state.selectedPerson = null;
    state.personState = { assignments: [], availabilityShifts: state.cachedShifts };
    state.responses = new Map();
    state.availability = new Map();
    manualField.hidden = false;
    manualInput.focus();
    personSelection.textContent = '';
    renderPeople();
    renderAssignments();
    renderAvailability();
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
          <div class="assignment-card__head"><div><h3>${escapeHtml(assignment.activity)}</h3><div class="meta">
            <span class="pill">${escapeHtml(assignment.day)}</span><span class="pill">${escapeHtml(assignment.shift)}</span>
            ${assignment.role ? `<span class="pill">${escapeHtml(assignment.role)}</span>` : ''}
            ${!assignment.shiftMatched ? '<span class="pill pill--warn">Turno da verificare</span>' : ''}
          </div></div></div>
          ${assignment.note ? `<p class="muted">${escapeHtml(assignment.note)}</p>` : ''}
          <div class="response-options">
            <label class="response-choice response-choice--yes"><input type="radio" name="response-${escapeHtml(assignment.id)}" value="confirmed" ${saved.response === 'confirmed' ? 'checked' : ''}><span>Confermo</span></label>
            <label class="response-choice response-choice--no"><input type="radio" name="response-${escapeHtml(assignment.id)}" value="declined" ${declined ? 'checked' : ''}><span>Non posso</span></label>
          </div>
          <label class="field decline-note" ${declined ? '' : 'hidden'}><span>Nota facoltativa</span><textarea maxlength="1000" data-decline-note placeholder="Se vuoi, indica il motivo o una nota utile">${escapeHtml(saved.note || '')}</textarea></label>
        </article>`;
    }).join('');
  }

  function renderAvailability() {
    const shifts = state.personState?.availabilityShifts?.length ? state.personState.availabilityShifts : state.cachedShifts;
    if (!shifts.length) {
      availabilityList.innerHTML = '<p class="muted">Nessun turno disponibile.</p>';
      return;
    }
    availabilityList.innerHTML = shifts.map((shift) => {
      const selected = state.availability.get(shift.id)?.selected || false;
      const note = state.availability.get(shift.id)?.note || '';
      return `
        <article class="availability-card${shift.assigned ? ' is-assigned' : ''}" data-shift-id="${escapeHtml(shift.id)}">
          <div class="availability-card__head"><div><h3>${escapeHtml(shift.day)} · ${escapeHtml(shift.shift)}</h3>${shift.assigned ? '<span class="pill">Già assegnato</span>' : ''}</div></div>
          <label class="check"><input type="checkbox" data-availability-check ${selected ? 'checked' : ''} ${shift.assigned ? 'disabled' : ''}><span>${shift.assigned ? 'Turno già coperto da una tua attività' : 'Sono disponibile anche in questo turno'}</span></label>
          <label class="field availability-note" ${selected && !shift.assigned ? '' : 'hidden'}><span>Nota facoltativa</span><textarea maxlength="1000" data-availability-note placeholder="Es. disponibile solo per alcune attività">${escapeHtml(note)}</textarea></label>
        </article>`;
    }).join('');
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
    const listAssignments = (items, declinedMode) => items.length
      ? `<ul class="summary-list">${items.map((a) => {
          const response = state.responses.get(a.id) || {};
          return `<li><strong>${escapeHtml(a.day)} · ${escapeHtml(a.shift)}</strong> — ${escapeHtml(a.activity)}${a.role ? ` · ${escapeHtml(a.role)}` : ''}${declinedMode && response.note ? `<br><small>Nota: ${escapeHtml(response.note)}</small>` : ''}</li>`;
        }).join('')}</ul>`
      : '<p class="summary-empty">Nessuna.</p>';

    summary.innerHTML = `
      <section class="summary-section"><h3>Compilato da</h3><p>${escapeHtml(state.actorName)}</p></section>
      <section class="summary-section"><h3>Persona selezionata</h3><p><strong>${escapeHtml(selectedName)}</strong>${state.selectedPerson?.person_code ? ` · codice ${escapeHtml(state.selectedPerson.person_code)}` : ''}</p></section>
      <section class="summary-section"><h3>Attività confermate</h3>${listAssignments(confirmed, false)}</section>
      <section class="summary-section"><h3>Attività non disponibili</h3>${listAssignments(declined, true)}</section>
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
      state.manualPersonName = String(manualInput.value || '').trim();
      if (!state.selectedPerson && state.manualPersonName.length < 2) {
        personSelection.textContent = 'Seleziona una persona oppure inseriscila manualmente.';
        return;
      }
      if (!state.selectedPerson) {
        state.personState = { assignments: [], availabilityShifts: state.cachedShifts };
        renderAssignments(); renderAvailability();
      }
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
      submissionCode.textContent = body.submission?.id ? `Riferimento: ${body.submission.id}` : '';
      setStatus(submitStatus, '');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      if (error.status === 401) { clearSession(); showAccess('La sessione è scaduta. Riapri il link ricevuto.'); return; }
      setStatus(submitStatus, error.message, 'error');
    } finally { submitButton.disabled = false; }
  }

  function restart() {
    state.step = 1; state.actorName = ''; state.selectedPerson = null; state.manualPersonName = ''; state.personState = null;
    state.responses = new Map(); state.availability = new Map(); state.clientSubmissionId = crypto.randomUUID();
    actorInput.value = ''; personSearch.value = ''; manualInput.value = ''; manualField.hidden = true; personSelection.textContent = '';
    success.hidden = true; document.querySelector('.stepper').hidden = false; renderPeople(); showStep(1);
  }

  personSearch?.addEventListener('input', renderPeople);
  personResults?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-person-id]'); if (!button) return;
    const person = state.people.find((row) => row.id === button.dataset.personId); if (!person) return;
    selectPerson(person).catch((error) => { personSelection.textContent = error.message; });
  });
  manualToggle?.addEventListener('click', useManualPerson);
  manualInput?.addEventListener('input', () => { state.manualPersonName = manualInput.value.trim(); personSelection.textContent = state.manualPersonName ? `Inserimento manuale: ${state.manualPersonName}` : ''; });

  assignmentList?.addEventListener('change', (event) => {
    const card = event.target.closest('[data-assignment-id]'); if (!card) return;
    const assignmentId = card.dataset.assignmentId;
    if (event.target.matches('input[type="radio"]')) {
      const current = state.responses.get(assignmentId) || {};
      state.responses.set(assignmentId, { ...current, response: event.target.value });
      const note = card.querySelector('.decline-note'); note.hidden = event.target.value !== 'declined';
      if (event.target.value !== 'declined') { state.responses.set(assignmentId, { response: event.target.value, note: '' }); const area = card.querySelector('[data-decline-note]'); if (area) area.value = ''; }
    }
  });
  assignmentList?.addEventListener('input', (event) => {
    if (!event.target.matches('[data-decline-note]')) return;
    const card = event.target.closest('[data-assignment-id]');
    const assignmentId = card.dataset.assignmentId;
    const current = state.responses.get(assignmentId) || { response: 'declined' };
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
  document.querySelector('[data-restart]')?.addEventListener('click', restart);

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

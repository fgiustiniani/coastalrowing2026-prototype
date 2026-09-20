(() => {
  const API = '/api/volunteers-admin';
  const SESSION_KEY = 'coastal2026-admin-session';
  const login = document.querySelector('[data-admin-login]');
  const loginForm = document.querySelector('[data-login-form]');
  const loginStatus = document.querySelector('[data-login-status]');
  const dashboard = document.querySelector('[data-dashboard]');
  const inviteStatus = document.querySelector('[data-invite-status]');
  const kpis = document.querySelector('[data-kpis]');
  const assignmentTable = document.querySelector('[data-assignment-table]');
  const assignmentFilter = document.querySelector('[data-assignment-filter]');
  const personReport = document.querySelector('[data-person-report]');
  const activityReport = document.querySelector('[data-activity-report]');
  const editor = document.querySelector('[data-assignment-editor]');
  const editorTitle = document.querySelector('[data-editor-title]');
  const editorForm = document.querySelector('[data-assignment-form]');
  const editorStatus = document.querySelector('[data-editor-status]');
  const rawShift = document.querySelector('[data-raw-shift]');
  const auditDialog = document.querySelector('[data-audit-dialog]');
  const auditTitle = document.querySelector('[data-audit-title]');
  const auditList = document.querySelector('[data-audit-list]');

  if (!loginForm || !dashboard) return;

  let credentials = null;
  let snapshot = null;

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

  function storedCredentials() {
    try {
      const value = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
      return value?.username && value?.password ? value : null;
    } catch { return null; }
  }

  function saveCredentials(value) {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(value)); } catch {}
  }

  function clearCredentials() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
  }

  function authorization() {
    return credentials ? `Basic ${btoa(`${credentials.username}:${credentials.password}`)}` : '';
  }

  function setStatus(node, text = '', kind = '') {
    if (!node) return;
    node.textContent = text;
    node.className = `status${kind ? ` is-${kind}` : ''}`;
  }

  async function api(url = API, options = {}) {
    const headers = { authorization: authorization(), ...(options.headers || {}) };
    const response = await fetch(url, { ...options, headers, cache: 'no-store' });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(body.error || 'Operazione non riuscita.');
      error.status = response.status;
      throw error;
    }
    return body;
  }

  const formatDateTime = (value) => {
    if (!value) return '—';
    try {
      return new Intl.DateTimeFormat('it-IT', {
        timeZone: 'Europe/Rome', dateStyle: 'short', timeStyle: 'short'
      }).format(new Date(value));
    } catch { return String(value); }
  };

  function responseBadge(value) {
    if (value === 'confirmed') return '<span class="status-badge is-confirmed">Confermata</span>';
    if (value === 'declined') return '<span class="status-badge is-declined">Non può</span>';
    return '<span class="status-badge is-pending">Da rispondere</span>';
  }

  function showLogin(message = '') {
    credentials = null;
    login.hidden = false;
    dashboard.hidden = true;
    if (message) setStatus(loginStatus, message, 'error');
  }

  function showDashboard() {
    login.hidden = true;
    dashboard.hidden = false;
  }

  function renderKpis() {
    const assignments = snapshot?.assignments || [];
    const assignedPeople = new Set(assignments.map((row) => row.personId)).size;
    const confirmed = assignments.filter((row) => row.currentResponse === 'confirmed').length;
    const declined = assignments.filter((row) => row.currentResponse === 'declined').length;
    const pending = assignments.length - confirmed - declined;
    kpis.innerHTML = [
      ['Persone assegnate', assignedPeople], ['Assegnazioni', assignments.length],
      ['Confermate', confirmed], ['Non disponibili', declined], ['Da rispondere', pending]
    ].map(([label, value]) => `<div class="kpi"><strong>${value}</strong><span>${label}</span></div>`).join('');
  }

  function filteredAssignments() {
    const q = String(assignmentFilter?.value || '').trim().toLocaleLowerCase('it-IT');
    if (!q) return snapshot?.assignments || [];
    return (snapshot?.assignments || []).filter((row) => [row.personName, row.personCode, row.day, row.shift, row.activity, row.role, row.requestedProfile]
      .join(' ').toLocaleLowerCase('it-IT').includes(q));
  }

  function renderAssignments() {
    const rows = filteredAssignments();
    if (!rows.length) {
      assignmentTable.innerHTML = '<p class="empty-state">Nessuna assegnazione corrisponde alla ricerca.</p>';
      return;
    }
    assignmentTable.innerHTML = `<table class="admin-table"><thead><tr><th>Persona</th><th>Turno</th><th>Attività</th><th>Ruolo</th><th>Risposta</th><th>Azioni</th></tr></thead><tbody>${rows.map((row) => `
      <tr>
        <td><strong>${escapeHtml(row.personName)}</strong><small>${row.personCode ? `Cod. ${escapeHtml(row.personCode)}` : 'Senza codice'}</small></td>
        <td>${escapeHtml(row.day)} · ${escapeHtml(row.shift)}${row.shiftMatched ? '' : '<small class="warning-text">Turno non standard</small>'}</td>
        <td><strong>${escapeHtml(row.activity)}</strong>${row.requestedProfile ? `<small>${escapeHtml(row.requestedProfile)}</small>` : ''}</td>
        <td>${escapeHtml(row.role || '—')}</td>
        <td>${responseBadge(row.currentResponse)}${row.currentActorName ? `<small>da ${escapeHtml(row.currentActorName)} · ${escapeHtml(formatDateTime(row.currentResponseAt))}</small>` : ''}${row.currentNote ? `<small>Nota: ${escapeHtml(row.currentNote)}</small>` : ''}</td>
        <td><div class="row-actions"><button type="button" data-edit-assignment="${row.id}">Modifica</button><button type="button" data-deactivate-assignment="${row.id}">Disattiva</button><button type="button" data-audit-person="${row.personId}" data-person-name="${escapeHtml(row.personName)}">Storico</button></div></td>
      </tr>`).join('')}</tbody></table>`;
  }

  function renderPersonReport() {
    const assignments = snapshot?.assignments || [];
    const byPerson = new Map();
    for (const row of assignments) {
      if (!byPerson.has(row.personId)) byPerson.set(row.personId, { id: row.personId, name: row.personName, code: row.personCode, rows: [] });
      byPerson.get(row.personId).rows.push(row);
    }
    const personById = new Map((snapshot?.people || []).map((row) => [row.id, row]));
    const report = [...byPerson.values()].sort((a, b) => a.name.localeCompare(b.name, 'it'));
    personReport.innerHTML = report.length ? `<table class="admin-table"><thead><tr><th>Persona</th><th>Confermate</th><th>Non può</th><th>Da rispondere</th><th>Disponibilità aggiuntive</th><th></th></tr></thead><tbody>${report.map((item) => {
      const confirmed = item.rows.filter((row) => row.currentResponse === 'confirmed').length;
      const declined = item.rows.filter((row) => row.currentResponse === 'declined').length;
      const pending = item.rows.length - confirmed - declined;
      const latest = personById.get(item.id)?.latestSubmission;
      const availability = latest?.availability || [];
      return `<tr><td><strong>${escapeHtml(item.name)}</strong><small>${item.code ? `Cod. ${escapeHtml(item.code)}` : 'Senza codice'}</small></td><td>${confirmed}</td><td>${declined}</td><td>${pending}</td><td>${availability.length ? availability.map((a) => `<span class="availability-pill">${escapeHtml(a.day)} ${escapeHtml(a.shift)}${a.note ? ` · ${escapeHtml(a.note)}` : ''}</span>`).join('') : '—'}${latest ? `<small>ultimo invio: ${escapeHtml(formatDateTime(latest.createdAt))} · ${escapeHtml(latest.actorName)}</small>` : ''}</td><td><button class="table-link" type="button" data-audit-person="${item.id}" data-person-name="${escapeHtml(item.name)}">Storico</button></td></tr>`;
    }).join('')}</tbody></table>` : '<p class="empty-state">Nessuna assegnazione presente.</p>';
  }

  function renderActivityReport() {
    const groups = new Map();
    for (const row of snapshot?.assignments || []) {
      const key = `${row.activity}|${row.day}|${row.shift}`;
      if (!groups.has(key)) groups.set(key, { activity: row.activity, day: row.day, shift: row.shift, rows: [] });
      groups.get(key).rows.push(row);
    }
    const report = [...groups.values()].sort((a, b) => `${a.day} ${a.shift} ${a.activity}`.localeCompare(`${b.day} ${b.shift} ${b.activity}`, 'it'));
    activityReport.innerHTML = report.length ? `<table class="admin-table"><thead><tr><th>Attività</th><th>Turno</th><th>Persone</th><th>Confermate</th><th>Non può</th><th>Da rispondere</th></tr></thead><tbody>${report.map((item) => {
      const confirmed = item.rows.filter((row) => row.currentResponse === 'confirmed').length;
      const declined = item.rows.filter((row) => row.currentResponse === 'declined').length;
      return `<tr><td><strong>${escapeHtml(item.activity)}</strong></td><td>${escapeHtml(item.day)} · ${escapeHtml(item.shift)}</td><td>${item.rows.length}<small>${item.rows.map((row) => escapeHtml(row.personName)).join(' · ')}</small></td><td>${confirmed}</td><td>${declined}</td><td>${item.rows.length - confirmed - declined}</td></tr>`;
    }).join('')}</tbody></table>` : '<p class="empty-state">Nessuna attività presente.</p>';
  }

  function renderAll() {
    renderKpis(); renderAssignments(); renderPersonReport(); renderActivityReport();
  }

  async function loadSnapshot() {
    snapshot = await api();
    renderAll();
  }

  function populateEditor(assignment = null) {
    editorForm.reset();
    const personSelect = editorForm.elements.personId;
    const shiftSelect = editorForm.elements.shiftId;
    personSelect.innerHTML = '<option value="">Seleziona…</option>' + (snapshot?.people || [])
      .filter((person) => person.selectable)
      .map((person) => `<option value="${person.id}">${escapeHtml(person.display_name)}${person.person_code ? ` · ${escapeHtml(person.person_code)}` : ''}</option>`).join('');
    shiftSelect.innerHTML = '<option value="">Turno non standard…</option>' + (snapshot?.shifts || [])
      .map((shift) => `<option value="${shift.id}">${escapeHtml(shift.day_label)} · ${escapeHtml(shift.shift_label)}</option>`).join('');

    editorForm.elements.assignmentId.value = assignment?.id || '';
    personSelect.value = assignment?.personId || '';
    shiftSelect.value = assignment?.shiftId || '';
    editorForm.elements.rawDay.value = assignment && !assignment.shiftMatched ? assignment.day : '';
    editorForm.elements.rawShift.value = assignment && !assignment.shiftMatched ? assignment.shift : '';
    editorForm.elements.activity.value = assignment?.activity || '';
    editorForm.elements.role.value = assignment?.role || '';
    editorForm.elements.requestedProfile.value = assignment?.requestedProfile || '';
    editorForm.elements.note.value = assignment?.note || '';
    rawShift.hidden = Boolean(shiftSelect.value);
    editorTitle.textContent = assignment ? 'Modifica assegnazione' : 'Nuova assegnazione';
    setStatus(editorStatus);
    editor.hidden = false;
    editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function closeEditor() { editor.hidden = true; setStatus(editorStatus); }

  async function showAudit(personId, personName) {
    const result = await api(`${API}?view=audit&personId=${encodeURIComponent(personId)}`);
    auditTitle.textContent = `Storico · ${personName}`;
    const rows = result.audit || [];
    auditList.innerHTML = rows.length ? `<div class="audit-list">${rows.map((row) => `
      <article class="audit-item"><div><strong>${escapeHtml(row.action_type)}</strong><span>${escapeHtml(formatDateTime(row.created_at))}</span></div><p><strong>Operatore:</strong> ${escapeHtml(row.actor_name || '—')}</p>${row.note ? `<p><strong>Nota:</strong> ${escapeHtml(row.note)}</p>` : ''}<details><summary>Dettaglio modifica</summary><pre>${escapeHtml(JSON.stringify({ precedente: row.previous_value, nuovo: row.new_value }, null, 2))}</pre></details></article>`).join('')}</div>` : '<p class="empty-state">Nessun evento registrato.</p>';
    auditDialog.showModal();
  }

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    credentials = { username: loginForm.elements.username.value.trim(), password: loginForm.elements.password.value };
    setStatus(loginStatus, 'Accesso…');
    try {
      await loadSnapshot(); saveCredentials(credentials); showDashboard(); setStatus(loginStatus);
    } catch (error) {
      clearCredentials(); showLogin(error.message);
    }
  });

  async function copyVolunteerLink() {
    const button = document.querySelector('[data-copy-volunteer-link]');
    if (button) button.disabled = true;
    setStatus(inviteStatus, 'Generazione link…');
    try {
      const body = await api(`${API}?view=invite`);
      if (!body.accessUrl) throw new Error('Link non disponibile.');
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(body.accessUrl);
      } else {
        const area = document.createElement('textarea');
        area.value = body.accessUrl;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        const copied = document.execCommand('copy');
        area.remove();
        if (!copied) throw new Error('Copia automatica non disponibile.');
      }
      setStatus(inviteStatus, 'Link volontari copiato negli appunti.', 'success');
    } catch (error) {
      setStatus(inviteStatus, error.message, 'error');
    } finally {
      if (button) button.disabled = false;
    }
  }

  document.querySelector('[data-copy-volunteer-link]')?.addEventListener('click', copyVolunteerLink);
  document.querySelector('[data-refresh]')?.addEventListener('click', () => loadSnapshot().catch((error) => alert(error.message)));
  document.querySelector('[data-logout]')?.addEventListener('click', () => { clearCredentials(); showLogin(); });
  document.querySelector('[data-new-assignment]')?.addEventListener('click', () => populateEditor());
  document.querySelectorAll('[data-editor-close],[data-editor-cancel]').forEach((button) => button.addEventListener('click', closeEditor));
  assignmentFilter?.addEventListener('input', renderAssignments);
  editorForm.elements.shiftId.addEventListener('change', () => { rawShift.hidden = Boolean(editorForm.elements.shiftId.value); });

  assignmentTable?.addEventListener('click', async (event) => {
    const edit = event.target.closest('[data-edit-assignment]');
    const deactivate = event.target.closest('[data-deactivate-assignment]');
    const audit = event.target.closest('[data-audit-person]');
    if (edit) {
      const assignment = snapshot.assignments.find((row) => row.id === edit.dataset.editAssignment);
      if (assignment) populateEditor(assignment);
    } else if (deactivate) {
      const assignment = snapshot.assignments.find((row) => row.id === deactivate.dataset.deactivateAssignment);
      if (!assignment || !confirm(`Disattivare l’assegnazione “${assignment.activity}” di ${assignment.personName}? Lo storico rimarrà disponibile.`)) return;
      try {
        await api(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'deactivate-assignment', assignmentId: assignment.id }) });
        await loadSnapshot();
      } catch (error) { alert(error.message); }
    } else if (audit) {
      try { await showAudit(audit.dataset.auditPerson, audit.dataset.personName || 'Persona'); }
      catch (error) { alert(error.message); }
    }
  });

  personReport?.addEventListener('click', async (event) => {
    const audit = event.target.closest('[data-audit-person]');
    if (!audit) return;
    try { await showAudit(audit.dataset.auditPerson, audit.dataset.personName || 'Persona'); }
    catch (error) { alert(error.message); }
  });

  editorForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const shiftId = editorForm.elements.shiftId.value || null;
    const rawDay = editorForm.elements.rawDay.value.trim();
    const rawShiftValue = editorForm.elements.rawShift.value.trim();
    if (!shiftId && (!rawDay || !rawShiftValue)) {
      setStatus(editorStatus, 'Per un turno non standard indica sia giorno sia fascia oraria.', 'error');
      return;
    }
    const payload = {
      action: 'save-assignment', assignmentId: editorForm.elements.assignmentId.value || null,
      personId: editorForm.elements.personId.value, shiftId,
      rawDay: shiftId ? null : rawDay, rawShift: shiftId ? null : rawShiftValue,
      activity: editorForm.elements.activity.value.trim(), role: editorForm.elements.role.value.trim(),
      requestedProfile: editorForm.elements.requestedProfile.value.trim(), note: editorForm.elements.note.value.trim()
    };
    setStatus(editorStatus, 'Salvataggio…');
    try {
      await api(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      await loadSnapshot(); closeEditor();
    } catch (error) { setStatus(editorStatus, error.message, 'error'); }
  });

  document.querySelectorAll('[data-audit-close]').forEach((button) => button.addEventListener('click', () => auditDialog.close()));
  auditDialog?.addEventListener('click', (event) => { if (event.target === auditDialog) auditDialog.close(); });

  credentials = storedCredentials();
  if (credentials) {
    loadSnapshot().then(showDashboard).catch(() => { clearCredentials(); showLogin('La sessione amministrativa non è più valida.'); });
  }
})();
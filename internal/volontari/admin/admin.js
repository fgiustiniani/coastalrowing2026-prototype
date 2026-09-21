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
  const assignmentTypeFilter = document.querySelector('[data-assignment-type-filter]');
  const assignmentSort = document.querySelector('[data-assignment-sort]');
  const assignmentPersonFilter = document.querySelector('[data-assignment-person-filter]');
  const assignmentShiftFilter = document.querySelector('[data-assignment-shift-filter]');
  const assignmentActivityFilter = document.querySelector('[data-assignment-activity-filter]');
  const assignmentResponseFilter = document.querySelector('[data-assignment-response-filter]');
  const assignmentWarningFilter = document.querySelector('[data-assignment-warning-filter]');
  const availabilityFilterStatus = document.querySelector('[data-availability-filter-status]');
  const personReport = document.querySelector('[data-person-report]');
  const personReportPersonFilter = document.querySelector('[data-person-report-person-filter]');
  const personReportResponseFilter = document.querySelector('[data-person-report-response-filter]');
  const activityReport = document.querySelector('[data-activity-report]');
  const activityReportActivityFilter = document.querySelector('[data-activity-report-activity-filter]');
  const activityReportPersonFilter = document.querySelector('[data-activity-report-person-filter]');
  const activityReportShiftFilter = document.querySelector('[data-activity-report-shift-filter]');
  const shiftBoardReport = document.querySelector('[data-shift-board-report]');
  const shiftBoardPersonFilter = document.querySelector('[data-shift-board-person-filter]');
  const shiftBoardActivityFilter = document.querySelector('[data-shift-board-activity-filter]');
  const shiftBoardShiftFilter = document.querySelector('[data-shift-board-shift-filter]');
  const activityCatalog = document.querySelector('[data-activity-catalog]');
  const raceProgram = document.querySelector('[data-race-program]');
  const raceProgramStatus = document.querySelector('[data-race-program-status]');
  const racePersonFilter = document.querySelector('[data-race-person-filter]');
  const raceCrewFilter = document.querySelector('[data-race-crew-filter]');
  const detailDialog = document.querySelector('[data-detail-dialog]');
  const detailTitle = document.querySelector('[data-detail-title]');
  const detailContent = document.querySelector('[data-detail-content]');
  const personActivitiesDialog = document.querySelector('[data-person-activities-dialog]');
  const personActivitiesTitle = document.querySelector('[data-person-activities-title]');
  const personActivitiesContent = document.querySelector('[data-person-activities-content]');
  const responsibleDialog = document.querySelector('[data-responsible-dialog]');
  const responsibleTitle = document.querySelector('[data-responsible-title]');
  const responsibleSummary = document.querySelector('[data-responsible-summary]');
  const responsibleContent = document.querySelector('[data-responsible-content]');
  const responsibleStatus = document.querySelector('[data-responsible-status]');
  const auditDialog = document.querySelector('[data-audit-dialog]');
  const auditTitle = document.querySelector('[data-audit-title]');
  const auditList = document.querySelector('[data-audit-list]');

  if (!loginForm || !dashboard) return;

  let credentials = null;
  let snapshot = null;
  let newAssignmentOpen = false;
  let newActivityOpen = false;
  let newRaceEntryOpen = false;
  let detailTargetRow = null;

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

  function setButtonBusy(button, label) {
    if (!button) return () => {};
    const originalHtml = button.innerHTML;
    const originalDisabled = button.disabled;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.classList.add('is-busy');
    button.innerHTML = `<span class="button-spinner" aria-hidden="true"></span><span>${escapeHtml(label)}</span>`;
    return () => {
      if (!button.isConnected) return;
      button.innerHTML = originalHtml;
      button.disabled = originalDisabled;
      button.removeAttribute('aria-busy');
      button.classList.remove('is-busy');
    };
  }

  async function withButtonBusy(button, label, operation) {
    const restore = setButtonBusy(button, label);
    try {
      return await operation();
    } finally {
      restore();
    }
  }

  function withBriefButtonBusy(button, label, operation) {
    setButtonBusy(button, label);
    window.setTimeout(operation, 120);
  }

  function setRowBusy(rowNode, active, exceptButton = null) {
    if (!rowNode) return;
    rowNode.classList.toggle('is-busy', active);
    rowNode.querySelectorAll('button, select, input').forEach((control) => {
      if (control === exceptButton) return;
      if (active) {
        control.dataset.wasDisabled = control.disabled ? '1' : '0';
        control.disabled = true;
      } else if (control.dataset.wasDisabled !== undefined) {
        control.disabled = control.dataset.wasDisabled === '1';
        delete control.dataset.wasDisabled;
      }
    });
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

  function responsibleBadge(label = 'Responsabile') {
    return `<span class="responsible-badge" title="Responsabile dell’attività in questo turno">★ ${escapeHtml(label)}</span>`;
  }

  function prettifyActivityName(value) {
    return String(value || '').trim()
      .replace(/^(Gestione barche in spiaggia|Barche noleggiate)-\s*/i, '$1 - ');
  }

  function displayActivity(row) {
    const activity = String(row?.activity || '').trim();
    const role = String(row?.role || '').trim();
    if (activity.toLocaleLowerCase('it-IT') === 'gestione barche in spiaggia' && role) return `${activity} - ${role}`;
    if (activity.toLocaleLowerCase('it-IT') === 'piloti gommoni' && /^Pilota gommone /i.test(role)) return role;
    return prettifyActivityName(activity);
  }

  function assignablePeople() {
    return (snapshot?.people || []).filter((person) =>
      person.active !== false
      && person.selectable !== false
      && person.source_type !== 'external'
    );
  }

  function personOptions(selectedId, includeCurrent = true) {
    const options = assignablePeople().map((person) => ({ id: person.id, label: person.display_name, code: person.person_code || '' }));
    const current = (snapshot?.people || []).find((person) => person.id === selectedId);
    if (includeCurrent && current && !options.some((person) => person.id === current.id)) {
      options.unshift({ id: current.id, label: current.display_name, code: current.person_code || '' });
    }
    return '<option value="">Seleziona…</option>' + options
      .sort((a, b) => a.label.localeCompare(b.label, 'it'))
      .map((person) => `<option value="${escapeHtml(person.id)}" ${person.id === selectedId ? 'selected' : ''}>${escapeHtml(person.label)}</option>`)
      .join('');
  }

  function assignmentCatalogValue(row) {
    const activities = snapshot?.activities || [];
    const exact = (value) => activities.find((activity) => String(activity.name).toLocaleLowerCase('it-IT') === String(value).toLocaleLowerCase('it-IT'))?.name || '';
    const activity = String(row?.activity || '').trim();
    const role = String(row?.role || '').trim();
    if (activity.toLocaleLowerCase('it-IT') === 'gestione barche in spiaggia' && role) return exact(`${activity}-${role}`);
    if (activity.toLocaleLowerCase('it-IT') === 'piloti gommoni' && role) return exact(role);
    if (activity.toLocaleLowerCase('it-IT') === 'spostamento barche via mare') return exact('Barche noleggiate-trasporto via mare');
    if (activity.toLocaleLowerCase('it-IT') === 'supporto sitemazione barche') return exact('Barche noleggiate-sistemazioe in spiaggia');
    return exact(activity);
  }

  function activityOptions(row = null) {
    const active = [...(snapshot?.activities || [])].sort((a, b) => a.name.localeCompare(b.name, 'it'));
    const selected = row ? assignmentCatalogValue(row) : '';
    const options = active.map((activity) => `<option value="${escapeHtml(activity.name)}" ${activity.name === selected ? 'selected' : ''}>${escapeHtml(prettifyActivityName(activity.name))}</option>`);
    if (row && !selected) {
      options.unshift(`<option value="" selected>Seleziona dall’anagrafica… (precedente: ${escapeHtml(displayActivity(row))})</option>`);
    } else {
      options.unshift('<option value="">Seleziona…</option>');
    }
    return options.join('');
  }

  function shiftOptions(row = null) {
    const options = (snapshot?.shifts || []).map((shift) =>
      `<option value="${escapeHtml(shift.id)}" ${row?.shiftId === shift.id ? 'selected' : ''}>${escapeHtml(shift.day_label)} · ${escapeHtml(shift.shift_label)}</option>`
    );
    if (row && !row.shiftMatched) {
      options.unshift(`<option value="raw" selected>Non standard: ${escapeHtml(row.day)} · ${escapeHtml(row.shift)}</option>`);
    } else {
      options.unshift('<option value="">Seleziona…</option>');
    }
    return options.join('');
  }

  function localDateKey(value) {
    if (!value) return '';
    try {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit'
      }).formatToParts(new Date(value));
      const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
      return `${map.year}-${map.month}-${map.day}`;
    } catch { return ''; }
  }

  function assignmentWarningDetails(candidate) {
    const warnings = [];
    const assignments = snapshot?.assignments || [];
    if (!candidate?.personId) return warnings;

    const sameShift = assignments.filter((row) => {
      if (row.id === candidate.id || row.personId !== candidate.personId) return false;
      if (candidate.shiftId) return row.shiftId === candidate.shiftId;
      return !row.shiftId && shiftFilterKey(row) === shiftFilterKey(candidate);
    });
    if (sameShift.length) warnings.push({ type: 'duplicate', text: 'Più assegnazioni nello stesso turno' });

    if (candidate.shiftId && snapshot?.raceProgramAvailable) {
      const shifts = (snapshot?.shifts || []).map((shift) => ({
        ...shift,
        startMs: Date.parse(shift.starts_at),
        endMs: Date.parse(shift.ends_at),
        dateKey: localDateKey(shift.starts_at)
      }));
      const assignedShift = shifts.find((shift) => shift.id === candidate.shiftId);
      if (assignedShift) {
        for (const race of (snapshot?.raceProgram || []).filter((item) => item.personId === candidate.personId && item.raceDate === assignedShift.dateKey)) {
          if (!race.raceTime) {
            warnings.push({ type: 'race', text: `Gara: ${race.crewLabel} · orario individuale da completare` });
            continue;
          }
          const raceMs = Date.parse(`${race.raceDate}T${race.raceTime}:00+02:00`);
          if (!Number.isFinite(raceMs)) continue;
          const dayShifts = shifts.filter((shift) => shift.dateKey === race.raceDate).sort((a, b) => a.startMs - b.startMs);
          const coinciding = dayShifts.find((shift) => shift.startMs <= raceMs && raceMs < shift.endMs) || null;
          const preceding = [...dayShifts].filter((shift) => shift.endMs <= raceMs).sort((a, b) => b.endMs - a.endMs)[0] || null;
          if (assignedShift.id === coinciding?.id || assignedShift.id === preceding?.id) {
            warnings.push({ type: 'race', text: `Gara: ${race.crewLabel} · ${race.raceTime}` });
          }
        }
      }
    }

    const seen = new Set();
    return warnings.filter((warning) => {
      const key = `${warning.type}|${warning.text}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function warningHtml(warnings) {
    if (!warnings?.length) return '<span class="warning-none">—</span>';
    return `<div class="warning-stack">${warnings.map((warning) =>
      `<span class="warning-badge${warning.type === 'race' ? ' warning-badge--race' : ''}">⚠ ${escapeHtml(warning.text)}</span>`
    ).join('')}</div>`;
  }

  function candidateFromRowNode(rowNode) {
    const assignmentId = rowNode?.dataset.assignmentId || '';
    const current = assignmentId ? (snapshot?.assignments || []).find((row) => row.id === assignmentId) : null;
    const personId = rowNode?.querySelector('[data-inline-person]')?.value || current?.personId || '';
    const shiftValue = rowNode?.querySelector('[data-inline-shift]')?.value || '';
    if (shiftValue === 'raw') {
      return { id: assignmentId || null, personId, shiftId: null, day: current?.day || '', shift: current?.shift || '' };
    }
    const selectedShift = (snapshot?.shifts || []).find((shift) => shift.id === shiftValue);
    return {
      id: assignmentId || null,
      personId,
      shiftId: shiftValue || null,
      day: selectedShift?.day_label || '',
      shift: selectedShift?.shift_label || ''
    };
  }

  function refreshRowWarnings(rowNode) {
    const cell = rowNode?.querySelector('[data-warning-cell]');
    if (!cell) return;
    cell.innerHTML = warningHtml(assignmentWarningDetails(candidateFromRowNode(rowNode)));
  }

  function shiftFilterKey(row) {
    return `${row.day || ''}|||${row.shift || ''}`;
  }

  function unassignedAvailabilityRows() {
    const assignments = snapshot?.assignments || [];
    const assignedKeys = new Set(
      assignments
        .filter((row) => row.personId && row.shiftId)
        .map((row) => `${row.personId}|${row.shiftId}`)
    );
    const rows = [];
    for (const person of snapshot?.people || []) {
      const availability = person.latestSubmission?.availability || [];
      for (const item of availability) {
        if (!item.shiftId) continue;
        const key = `${person.id}|${item.shiftId}`;
        if (assignedKeys.has(key)) continue;
        rows.push({
          id: `availability:${person.id}:${item.shiftId}`,
          isAvailability: true,
          personId: person.id,
          personCode: person.person_code || '',
          personName: person.display_name,
          shiftId: item.shiftId,
          day: item.day || '',
          shift: item.shift || '',
          shiftMatched: true,
          activity: '',
          role: '',
          requestedProfile: '',
          note: item.note || '',
          currentResponse: null,
          currentNote: '',
          currentResponseAt: null,
          currentActorName: ''
        });
      }
    }
    const orderByShift = new Map((snapshot?.shifts || []).map((shift) => [shift.id, shift.sort_order ?? 9999]));
    return rows.sort((a, b) =>
      (orderByShift.get(a.shiftId) ?? 9999) - (orderByShift.get(b.shiftId) ?? 9999)
      || a.personName.localeCompare(b.personName, 'it')
    );
  }

  function allAssignmentRows() {
    return [...unassignedAvailabilityRows(), ...(snapshot?.assignments || [])];
  }

  function assignmentShiftOrder(row) {
    if (row?.shiftId) {
      const shift = (snapshot?.shifts || []).find((item) => item.id === row.shiftId);
      if (shift) return Number.isFinite(Number(shift.sort_order)) ? Number(shift.sort_order) : 9998;
    }
    return 9999;
  }

  function sortAssignmentRows(rows) {
    const mode = assignmentSort?.value || 'shift';
    const byShift = (a, b) => {
      const order = assignmentShiftOrder(a) - assignmentShiftOrder(b);
      if (order) return order;
      return `${a.day || ''} ${a.shift || ''}`.localeCompare(`${b.day || ''} ${b.shift || ''}`, 'it');
    };
    const byPerson = (a, b) => String(a.personName || '').localeCompare(String(b.personName || ''), 'it');

    return [...rows].sort((a, b) => mode === 'person'
      ? byPerson(a, b) || byShift(a, b) || displayActivity(a).localeCompare(displayActivity(b), 'it')
      : byShift(a, b) || byPerson(a, b) || displayActivity(a).localeCompare(displayActivity(b), 'it')
    );
  }

  function selectedFilterValues(select) {
    if (!select) return [];
    return [...new Set([...select.selectedOptions]
      .map((option) => option.value)
      .filter((value) => value && value !== 'all'))];
  }

  function filterMatches(values, value) {
    return !values.length || values.includes(String(value ?? ''));
  }

  function setSelectOptions(select, options, allLabel) {
    if (!select) return;
    const current = new Set(selectedFilterValues(select));
    select.innerHTML = `<option value="">${escapeHtml(allLabel)}</option>` + options
      .map((item) => `<option value="${escapeHtml(item.value)}">${escapeHtml(item.label)}</option>`).join('');
    [...select.options].forEach((option) => {
      option.selected = current.has(option.value);
    });
  }

  function populateFilters() {
    const assignments = snapshot?.assignments || [];
    const assignmentRows = allAssignmentRows();
    const people = [...new Map(assignmentRows.map((row) => [row.personId, { value: row.personId, label: row.personName }])).values()]
      .sort((a, b) => a.label.localeCompare(b.label, 'it'));
    const shifts = [...new Map(assignmentRows.map((row) => [shiftFilterKey(row), {
      value: shiftFilterKey(row), label: `${row.day} · ${row.shift}`
    }])).values()].sort((a, b) => a.label.localeCompare(b.label, 'it'));
    const activities = [...new Set(assignments.map((row) => displayActivity(row)).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'it'))
      .map((value) => ({ value, label: value }));

    setSelectOptions(assignmentPersonFilter, people, 'Tutte');
    setSelectOptions(assignmentShiftFilter, shifts, 'Tutti');
    setSelectOptions(assignmentActivityFilter, activities, 'Tutte');
    const reportPeople = [...new Map((snapshot?.people || [])
      .filter((person) => person.latestSubmission || assignments.some((row) => row.personId === person.id))
      .map((person) => [person.id, { value: person.id, label: person.display_name }])).values()]
      .sort((a, b) => a.label.localeCompare(b.label, 'it'));
    setSelectOptions(personReportPersonFilter, reportPeople, 'Tutte');
    setSelectOptions(activityReportActivityFilter, activities, 'Tutte');
    setSelectOptions(shiftBoardActivityFilter, activities, 'Tutte');

    const assignedPeople = [...new Map(assignments.map((row) => [row.personId, { value: row.personId, label: row.personName }])).values()]
      .sort((a, b) => a.label.localeCompare(b.label, 'it'));
    setSelectOptions(activityReportPersonFilter, assignedPeople, 'Tutte');
    setSelectOptions(shiftBoardPersonFilter, assignedPeople, 'Tutte');

    const reportShifts = [...(snapshot?.shifts || [])]
      .sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999))
      .map((shift) => ({ value: shift.id, label: `${shift.day_label} · ${shift.shift_label}` }));
    setSelectOptions(activityReportShiftFilter, reportShifts, 'Tutti');
    setSelectOptions(shiftBoardShiftFilter, reportShifts, 'Tutti');

    const racePeople = [...new Map((snapshot?.raceProgram || []).map((row) => [row.personId, { value: row.personId, label: row.personName }])).values()]
      .sort((a, b) => a.label.localeCompare(b.label, 'it'));
    setSelectOptions(racePersonFilter, racePeople, 'Tutte');
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

  function respondedAssignedPeople() {
    const assignedIds = new Set((snapshot?.assignments || []).map((row) => row.personId));
    return (snapshot?.people || [])
      .filter((person) => assignedIds.has(person.id) && person.latestSubmission)
      .sort((a, b) => String(a.display_name || '').localeCompare(String(b.display_name || ''), 'it'));
  }

  function renderKpis() {
    const assignments = snapshot?.assignments || [];
    const assignedPeople = new Set(assignments.map((row) => row.personId)).size;
    const respondedPeople = respondedAssignedPeople();
    const unassignedAvailability = unassignedAvailabilityRows();
    const confirmed = assignments.filter((row) => row.currentResponse === 'confirmed').length;
    const declined = assignments.filter((row) => row.currentResponse === 'declined').length;
    const pending = assignments.length - confirmed - declined;
    kpis.innerHTML = `
      <article class="kpi kpi--summary">
        <div class="kpi__main"><strong>${assignedPeople}</strong><span>persone assegnate</span></div>
        <p class="kpi__detail">di cui <button type="button" class="kpi__link" data-show-responded>${respondedPeople.length}</button> hanno risposto</p>
        <p class="kpi__detail"><button type="button" class="kpi__link" data-show-unassigned-availability>${new Set(unassignedAvailability.map((row) => row.personId)).size}</button> persone con ${unassignedAvailability.length} disponibilità da assegnare</p>
      </article>
      <article class="kpi kpi--summary">
        <div class="kpi__main"><strong>${assignments.length}</strong><span>attività assegnate</span></div>
        <div class="kpi__breakdown">
          <span><strong>${confirmed}</strong> confermate</span>
          <span><strong>${declined}</strong> rifiutate</span>
          <span><strong>${pending}</strong> senza risposta</span>
        </div>
      </article>`;
  }

  function filteredAssignments() {
    const types = selectedFilterValues(assignmentTypeFilter);
    const personIds = selectedFilterValues(assignmentPersonFilter);
    const shifts = selectedFilterValues(assignmentShiftFilter);
    const activities = selectedFilterValues(assignmentActivityFilter);
    const responses = selectedFilterValues(assignmentResponseFilter);
    const warningFilters = selectedFilterValues(assignmentWarningFilter);

    const rows = allAssignmentRows().filter((row) => {
      const rowType = row.isAvailability ? 'availability' : 'assigned';
      if (!filterMatches(types, rowType)) return false;

      const rowResponse = row.currentResponse || 'pending';
      const warnings = assignmentWarningDetails(row);
      const warningMatch = !warningFilters.length || warningFilters.some((warning) =>
        (warning === 'any' && warnings.length > 0)
        || (warning === 'none' && warnings.length === 0)
        || warnings.some((item) => item.type === warning)
      );

      return filterMatches(personIds, row.personId)
        && filterMatches(shifts, shiftFilterKey(row))
        && (!activities.length || (!row.isAvailability && activities.includes(displayActivity(row))))
        && (!responses.length || (!row.isAvailability && responses.includes(rowResponse)))
        && warningMatch;
    });

    return sortAssignmentRows(rows);
  }

  function responsibilityGroupRows(row) {
    if (!row || !row.shiftId) return [];
    return (snapshot?.assignments || [])
      .filter((item) =>
        item.shiftId === row.shiftId
        && (
          (row.activityId && item.activityId === row.activityId)
          || (!row.activityId && displayActivity(item) === displayActivity(row))
        )
      )
      .sort((a, b) => String(a.personName || '').localeCompare(String(b.personName || ''), 'it'));
  }

  function responsibleForGroup(row) {
    return responsibilityGroupRows(row).find((item) => item.isResponsible) || null;
  }

  function assignmentRowHtml(row, isNew = false) {
    const isAvailability = Boolean(row?.isAvailability);
    const personId = row?.personId || '';
    const activityLabel = row && !isAvailability ? displayActivity(row) : '';
    const responseHtml = isAvailability
      ? '<span class="status-badge is-availability">Disponibilità</span>'
      : (isNew ? '—' : `${responseBadge(row.currentResponse)}${row.currentActorName ? `<small>da ${escapeHtml(row.currentActorName)} · ${escapeHtml(formatDateTime(row.currentResponseAt))}</small>` : ''}${row.currentNote ? `<small>Nota: ${escapeHtml(row.currentNote)}</small>` : ''}`);
    const assignmentId = row && !isAvailability ? row.id : '';
    const warnings = row ? assignmentWarningDetails(row) : [];
    const rowClass = [
      isNew ? 'is-new-row' : '',
      isAvailability ? 'is-availability-row' : '',
      row?.isResponsible ? 'is-responsible-row' : ''
    ].filter(Boolean).join(' ');

    const shiftCell = isAvailability
      ? `<input type="hidden" data-inline-shift value="${escapeHtml(row.shiftId)}">
         <button class="inline-shift-link" type="button" data-show-shift-activities="${escapeHtml(row.shiftId)}">${escapeHtml(row.day)} · ${escapeHtml(row.shift)}</button>
         <small class="availability-source-label">Disponibilità indicata dal volontario</small>`
      : (isNew
        ? `<select class="inline-select" data-inline-shift>${shiftOptions(row)}</select>`
        : `<div class="inline-display-row" data-shift-display>
             <button class="inline-shift-link" type="button" data-show-shift-activities="${escapeHtml(row.shiftId || '')}">${escapeHtml(row.day)} · ${escapeHtml(row.shift)}</button>
             <button class="inline-edit-button" type="button" data-edit-shift aria-label="Cambia turno" title="Cambia turno">✎</button>
           </div>
           <select class="inline-select" data-inline-shift hidden>${shiftOptions(row)}</select>
           ${!row.shiftMatched ? '<small class="warning-text">Turno non standard: seleziona un turno dall’anagrafica se vuoi modificarlo.</small>' : ''}`);

    const activityCell = (isAvailability || isNew)
      ? `<select class="inline-select inline-select--activity" data-inline-activity>${activityOptions(null)}</select>`
      : `<div class="inline-display-row" data-activity-display>
           <button class="inline-activity-link" type="button" data-show-activity="${escapeHtml(activityLabel)}">${escapeHtml(activityLabel)}</button>
           <button class="inline-edit-button" type="button" data-edit-activity aria-label="Cambia attività" title="Cambia attività">✎</button>
         </div>
         <select class="inline-select inline-select--activity" data-inline-activity hidden>${activityOptions(row)}</select>`;

    const personCell = isAvailability
      ? `<input type="hidden" data-inline-person value="${escapeHtml(row.personId)}">
         <button class="inline-name-link" type="button" data-show-person="${escapeHtml(row.personId)}">${escapeHtml(row.personName)}</button>
         ${row.note ? `<small class="availability-source-note">Nota disponibilità: ${escapeHtml(row.note)}</small>` : ''}`
      : (isNew
        ? `<select class="inline-select inline-select--person" data-inline-person>${personOptions(personId)}</select>`
        : `<div class="inline-display-row" data-person-display>
             <button class="inline-name-link" type="button" data-show-person="${escapeHtml(row.personId)}">${escapeHtml(row.personName)}</button>
             <button class="inline-edit-button" type="button" data-edit-person aria-label="Cambia persona" title="Cambia persona">✎</button>
           </div>
           <select class="inline-select inline-select--person" data-inline-person hidden>${personOptions(personId)}</select>`);

    const groupResponsible = (!isNew && !isAvailability) ? responsibleForGroup(row) : null;
    const responsibleCell = (!isNew && !isAvailability)
      ? `<button type="button" class="responsible-field ${groupResponsible ? 'is-active' : ''}" data-open-responsible="${escapeHtml(row.id)}" title="Scegli il responsabile per questa attività e turno">${groupResponsible ? `★ ${escapeHtml(groupResponsible.personName)}` : 'Seleziona responsabile'}</button>`
      : '<span class="responsibility-unavailable">—</span>';

    return `
      <tr data-assignment-row data-assignment-id="${escapeHtml(assignmentId)}" ${isAvailability ? `data-availability-key="${escapeHtml(row.id)}"` : ''} class="${rowClass}">
        <td>${shiftCell}</td>
        <td class="inline-activity-cell"><div class="inline-controls">${activityCell}</div></td>
        <td class="inline-person-cell"><div class="inline-controls">${personCell}</div></td>
        <td class="responsible-cell">${responsibleCell}</td>
        <td class="warning-cell" data-warning-cell>${warningHtml(warnings)}</td>
        <td>${responseHtml}</td>
        <td>
          <div class="row-actions">
            <button type="button" data-save-inline-assignment>Salva</button>
            <button type="button" data-cancel-inline-assignment>Annulla</button>
            ${(!isNew && !isAvailability) ? `<button class="is-danger" type="button" data-delete-assignment="${escapeHtml(row.id)}">Elimina</button><button type="button" data-audit-person="${escapeHtml(row.personId)}" data-person-name="${escapeHtml(row.personName)}">Storico</button>` : ''}
          </div>
          <small class="row-save-status" data-row-status></small>
        </td>
      </tr>`;
  }

  function renderAssignments() {
    const rows = filteredAssignments();
    const type = assignmentTypeFilter?.value || 'all';
    const onlyAvailability = type === 'availability';
    if (availabilityFilterStatus) availabilityFilterStatus.hidden = !onlyAvailability;

    const body = [
      ...(newAssignmentOpen && !onlyAvailability ? [assignmentRowHtml(null, true)] : []),
      ...rows.map((row) => assignmentRowHtml(row, false))
    ].join('');

    if (!body) {
      assignmentTable.innerHTML = onlyAvailability
        ? '<p class="empty-state">Non ci sono disponibilità da assegnare che corrispondono ai filtri.</p>'
        : '<p class="empty-state">Nessuna assegnazione corrisponde ai filtri.</p>';
      return;
    }

    assignmentTable.innerHTML = `<table class="admin-table"><thead><tr><th>Turno</th><th>Attività</th><th>Persona</th><th>Responsabile</th><th>Warning</th><th>Risposta</th><th>Azioni</th></tr></thead><tbody>${body}</tbody></table>`;
  }

  function personReportRows() {
    const assignments = snapshot?.assignments || [];
    const peopleRows = snapshot?.people || [];
    const byPerson = new Map();

    for (const person of peopleRows) {
      if (person.latestSubmission) {
        byPerson.set(person.id, {
          id: person.id,
          name: person.display_name,
          code: person.person_code || '',
          rows: []
        });
      }
    }

    for (const row of assignments) {
      if (!byPerson.has(row.personId)) {
        byPerson.set(row.personId, {
          id: row.personId,
          name: row.personName,
          code: row.personCode,
          rows: []
        });
      }
      byPerson.get(row.personId).rows.push(row);
    }

    const personById = new Map(peopleRows.map((row) => [row.id, row]));
    return [...byPerson.values()].map((item) => {
      const confirmed = item.rows.filter((row) => row.currentResponse === 'confirmed').length;
      const declined = item.rows.filter((row) => row.currentResponse === 'declined').length;
      const latest = personById.get(item.id)?.latestSubmission || null;
      const availability = latest?.availability || [];
      const notes = item.rows
        .filter((row) => String(row.currentNote || '').trim())
        .map((row) => `${displayActivity(row)}: ${String(row.currentNote).trim()}`);
      const sortedRows = [...item.rows].sort((a, b) => {
        const shiftA = (snapshot?.shifts || []).find((shift) => shift.id === a.shiftId)?.sort_order ?? 9999;
        const shiftB = (snapshot?.shifts || []).find((shift) => shift.id === b.shiftId)?.sort_order ?? 9999;
        return shiftA - shiftB || displayActivity(a).localeCompare(displayActivity(b), 'it');
      });
      return {
        ...item,
        confirmed,
        declined,
        answered: Boolean(latest),
        notes: notes.join('; '),
        availability,
        activities: sortedRows.map((row) => `${row.day}-${row.shift} ${displayActivity(row)}${row.isResponsible ? ' · ★ Responsabile' : ''}`),
        activitiesText: sortedRows.map((row) => `${row.day}-${row.shift} ${displayActivity(row)}${row.isResponsible ? ' · ★ Responsabile' : ''}`).join('\n'),
        availabilityText: availability.map((a) => `${a.day} ${a.shift}${a.note ? ` - ${a.note}` : ''}`).join('\n'),
        latest
      };
    }).sort((a, b) => a.name.localeCompare(b.name, 'it'));
  }

  function filteredPersonReportRows() {
    const personIds = selectedFilterValues(personReportPersonFilter);
    const answers = selectedFilterValues(personReportResponseFilter);
    return personReportRows().filter((item) =>
      filterMatches(personIds, item.id)
      && filterMatches(answers, item.answered ? 'yes' : 'no')
    );
  }

  function renderPersonReport() {
    const report = filteredPersonReportRows();
    personReport.innerHTML = report.length ? `<table class="admin-table person-report-table"><thead><tr><th>Persona</th><th>Attività</th><th>Confermate</th><th>Non può</th><th>Ha risposto</th><th>Note</th><th>Disponibilità aggiuntive</th><th></th></tr></thead><tbody>${report.map((item) => {
      const availability = item.availability || [];
      return `<tr>
        <td><strong>${escapeHtml(item.name)}</strong></td>
        <td class="people-cell">${item.activities?.length ? `<div class="activity-report-list">${item.activities.map((activity) => `<div class="activity-report-line">${escapeHtml(activity)}</div>`).join('')}</div>` : '—'}</td>
        <td>${item.confirmed}</td>
        <td>${item.declined}</td>
        <td><span class="${item.answered ? 'answer-yes' : 'answer-no'}">${item.answered ? 'Sì' : 'No'}</span>${item.latest ? `<small>ultimo invio: ${escapeHtml(formatDateTime(item.latest.createdAt))} · ${escapeHtml(item.latest.actorName)}</small>` : ''}</td>
        <td class="notes-cell">${item.notes ? escapeHtml(item.notes) : '—'}</td>
        <td class="availability-report-cell">${availability.length ? `<div class="availability-report-list">${availability.map((a) => `<div class="availability-report-line"><strong>${escapeHtml(a.day)} · ${escapeHtml(a.shift)}</strong>${a.note ? `<small>${escapeHtml(a.note)}</small>` : ''}</div>`).join('')}</div>` : '—'}</td>
        <td><button class="table-link" type="button" data-audit-person="${item.id}" data-person-name="${escapeHtml(item.name)}">Storico</button></td>
      </tr>`;
    }).join('')}</tbody></table>` : '<p class="empty-state">Nessuna persona corrisponde ai filtri.</p>';
  }

  function reportAssignmentRows({ personIds = [], activities = [], shiftIds = [] } = {}) {
    return (snapshot?.assignments || []).filter((row) =>
      filterMatches(personIds, row.personId)
      && filterMatches(activities, displayActivity(row))
      && filterMatches(shiftIds, row.shiftId)
    );
  }

  function groupedReportRows(rows) {
    const groups = new Map();
    for (const row of rows) {
      const activityLabel = displayActivity(row);
      const key = `${row.shiftId || shiftFilterKey(row)}|${activityLabel}`;
      if (!groups.has(key)) {
        groups.set(key, {
          activity: activityLabel,
          day: row.day,
          shift: row.shift,
          shiftId: row.shiftId || '',
          rows: []
        });
      }
      groups.get(key).rows.push(row);
    }

    return [...groups.values()].map((item) => {
      const peopleMap = new Map();
      for (const row of item.rows) {
        const current = peopleMap.get(row.personId) || { id: row.personId, name: row.personName, isResponsible: false };
        current.isResponsible = current.isResponsible || row.isResponsible === true;
        peopleMap.set(row.personId, current);
      }
      const people = [...peopleMap.values()]
        .sort((a, b) => a.name.localeCompare(b.name, 'it'));
      const responsible = people.find((person) => person.isResponsible) || null;
      return {
        ...item,
        people,
        responsible,
        responsibleName: responsible?.name || '',
        peopleCount: people.length,
        peopleText: people.map((person) => `${person.isResponsible ? '★ ' : ''}${person.name}`).join('; '),
        pending: item.rows.filter((row) => !row.currentResponse).length
      };
    }).sort((a, b) =>
      assignmentShiftOrder(a) - assignmentShiftOrder(b)
      || a.activity.localeCompare(b.activity, 'it')
    );
  }

  function filteredActivityReportRows() {
    const personIds = selectedFilterValues(activityReportPersonFilter);
    const activities = selectedFilterValues(activityReportActivityFilter);
    const shiftIds = selectedFilterValues(activityReportShiftFilter);
    return groupedReportRows(reportAssignmentRows({ personIds, activities, shiftIds }));
  }

  function renderActivityReport() {
    const report = filteredActivityReportRows();
    activityReport.innerHTML = report.length ? `<table class="admin-table activity-report-table"><thead><tr><th>Giorno e turno</th><th>Attività</th><th>N. persone</th><th>Persone</th><th>Responsabile</th><th>Da rispondere</th></tr></thead><tbody>${report.map((item) =>
      `<tr><td class="report-shift-cell"><strong>${escapeHtml(item.day)} · ${escapeHtml(item.shift)}</strong></td><td class="report-activity-cell">${escapeHtml(item.activity)}</td><td>${item.peopleCount}</td><td class="report-people-cell">${escapeHtml(item.peopleText)}</td><td>${item.responsibleName ? responsibleBadge(item.responsibleName) : '—'}</td><td>${item.pending}</td></tr>`
    ).join('')}</tbody></table>` : '<p class="empty-state">Nessuna attività corrisponde ai filtri.</p>';
  }

  function shiftBoardGroups() {
    const personIds = selectedFilterValues(shiftBoardPersonFilter);
    const activities = selectedFilterValues(shiftBoardActivityFilter);
    const shiftIds = selectedFilterValues(shiftBoardShiftFilter);
    const rows = reportAssignmentRows({ personIds, activities, shiftIds });
    const byShift = new Map();

    for (const row of rows) {
      const key = row.shiftId || shiftFilterKey(row);
      if (!byShift.has(key)) {
        byShift.set(key, {
          shiftId: row.shiftId || '',
          day: row.day,
          shift: row.shift,
          activities: new Map()
        });
      }
      const group = byShift.get(key);
      const label = displayActivity(row);
      if (!group.activities.has(label)) group.activities.set(label, new Map());
      const peopleMap = group.activities.get(label);
      const current = peopleMap.get(row.personId) || { name: row.personName, isResponsible: false };
      current.isResponsible = current.isResponsible || row.isResponsible === true;
      peopleMap.set(row.personId, current);
    }

    return [...byShift.values()]
      .map((group) => ({
        ...group,
        activities: [...group.activities.entries()]
          .map(([activityName, peopleMap]) => ({
            activity: activityName,
            people: [...peopleMap.values()].sort((a, b) => a.name.localeCompare(b.name, 'it'))
          }))
          .sort((a, b) => a.activity.localeCompare(b.activity, 'it'))
      }))
      .sort((a, b) => assignmentShiftOrder(a) - assignmentShiftOrder(b));
  }

  function renderShiftBoardReport() {
    const groups = shiftBoardGroups();
    shiftBoardReport.innerHTML = groups.length
      ? `<div class="shift-board">${groups.map((group) => `
          <article class="shift-board__column">
            <header class="shift-board__header">
              <strong>${escapeHtml(group.day)}</strong>
              <span>${escapeHtml(group.shift)}</span>
            </header>
            <div class="shift-board__activities">
              ${group.activities.map((item) => `
                <section class="shift-board__activity">
                  <strong>${escapeHtml(item.activity)}</strong>
                  <div class="shift-board__people">${item.people.map((person) => `<span class="${person.isResponsible ? 'is-responsible' : ''}">${person.isResponsible ? '★ ' : ''}${escapeHtml(person.name)}${person.isResponsible ? ' · Responsabile' : ''}</span>`).join('')}</div>
                </section>`).join('')}
            </div>
          </article>`).join('')}</div>`
      : '<p class="empty-state">Nessun turno corrisponde ai filtri.</p>';
  }

  function xmlEscape(value) {
    return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  }

  function downloadBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportExcel(filename, sheetName, columns, rows) {
    const header = columns.map((column) => `<Cell ss:StyleID="Header"><Data ss:Type="String">${xmlEscape(column.label)}</Data></Cell>`).join('');
    const body = rows.map((row) => `<Row>${columns.map((column) =>
      `<Cell><Data ss:Type="String">${xmlEscape(row[column.key] ?? '')}</Data></Cell>`
    ).join('')}</Row>`).join('');
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Top" ss:WrapText="1"/><Font ss:FontName="Arial" ss:Size="10"/></Style>
  <Style ss:ID="Header"><Font ss:FontName="Arial" ss:Size="10" ss:Bold="1"/><Interior ss:Color="#EAF2F4" ss:Pattern="Solid"/></Style>
 </Styles>
 <Worksheet ss:Name="${xmlEscape(sheetName.slice(0, 31))}"><Table><Row>${header}</Row>${body}</Table></Worksheet>
</Workbook>`;
    downloadBlob(filename, new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' }));
  }

  function exportPdf(title, columns, rows, options = {}) {
    const popup = window.open('', '_blank');
    if (!popup) {
      alert('Il browser ha bloccato la finestra di esportazione PDF. Consenti i popup e riprova.');
      return;
    }
    const pageSize = options.pageSize || 'A4 landscape';
    const fontSize = options.fontSize || '8px';
    const tableHead = columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('');
    const tableBody = rows.map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(row[column.key] ?? '')}</td>`).join('')}</tr>`).join('');
    popup.document.write(`<!doctype html><html lang="it"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
      @page{size:${pageSize};margin:10mm}body{font-family:Arial,sans-serif;color:#173e4b;margin:0}h1{font-size:18px;margin:0 0 4px}.meta{font-size:9px;color:#60757d;margin:0 0 12px}
      table{width:100%;border-collapse:collapse;font-size:${fontSize};table-layout:fixed}th,td{border:1px solid #cfdcdf;padding:5px;text-align:left;vertical-align:top;white-space:pre-line;overflow-wrap:anywhere}th{background:#eaf2f4}tr:nth-child(even){background:#fafcfc}
    </style></head><body><h1>${escapeHtml(title)}</h1><p class="meta">Esportato il ${escapeHtml(formatDateTime(new Date().toISOString()))}</p><table><thead><tr>${tableHead}</tr></thead><tbody>${tableBody}</tbody></table><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),150));<\/script></body></html>`);
    popup.document.close();
  }

  function exportPersonReport(kind) {
    const rows = filteredPersonReportRows().map((item) => ({
      persona: item.name,
      codice: item.code || '',
      attivita: item.activitiesText || '',
      confermate: String(item.confirmed),
      nonPuo: String(item.declined),
      haRisposto: item.answered ? 'Sì' : 'No',
      note: item.notes || '',
      disponibilita: item.availabilityText || ''
    }));
    const commonColumns = [
      { key: 'persona', label: 'Persona' },
      { key: 'attivita', label: 'Attività' },
      { key: 'confermate', label: 'Confermate' }, { key: 'nonPuo', label: 'Non può' },
      { key: 'haRisposto', label: 'Ha risposto' }, { key: 'note', label: 'Note' },
      { key: 'disponibilita', label: 'Disponibilità aggiuntive' }
    ];
    if (kind === 'excel') {
      exportExcel('report-volontari-per-persona.xls', 'Per persona', [
        { key: 'persona', label: 'Persona' },
        { key: 'codice', label: 'Codice' },
        ...commonColumns.slice(1)
      ], rows);
    } else {
      exportPdf('Report volontari per persona', commonColumns, rows);
    }
  }

  function exportActivityReport(kind) {
    const rows = filteredActivityReportRows().map((item) => ({
      turno: `${item.day} · ${item.shift}`,
      attivita: item.activity,
      numeroPersone: String(item.peopleCount),
      persone: item.peopleText,
      responsabile: item.responsibleName || '',
      daRispondere: String(item.pending)
    }));
    const columns = [
      { key: 'turno', label: 'Giorno e turno' },
      { key: 'attivita', label: 'Attività' },
      { key: 'numeroPersone', label: 'N. persone' },
      { key: 'persone', label: 'Persone' },
      { key: 'responsabile', label: 'Responsabile' },
      { key: 'daRispondere', label: 'Da rispondere' }
    ];
    if (kind === 'excel') exportExcel('report-volontari-per-giorno-turno.xls', 'Giorno e turno', columns, rows);
    else exportPdf('Report volontari per giorno e turno', columns, rows);
  }

  function shiftBoardExportData() {
    const groups = shiftBoardGroups();
    const columns = groups.map((group, index) => ({
      key: `shift${index}`,
      label: `${group.day} · ${group.shift}`
    }));
    const maxRows = Math.max(0, ...groups.map((group) => group.activities.length));
    const rows = Array.from({ length: maxRows }, (_, rowIndex) => {
      const row = {};
      groups.forEach((group, index) => {
        const item = group.activities[rowIndex];
        row[`shift${index}`] = item
          ? `${item.activity}\n${item.people.map((person) => `${person.isResponsible ? '★ ' : ''}${person.name}`).join('; ')}`
          : '';
      });
      return row;
    });
    return { columns, rows };
  }

  function exportShiftBoardPdfByDay() {
    const groups = shiftBoardGroups();
    if (!groups.length) {
      alert('Nessun dato da esportare con i filtri correnti.');
      return;
    }

    const popup = window.open('', '_blank');
    if (!popup) {
      alert('Il browser ha bloccato la finestra di esportazione PDF. Consenti i popup e riprova.');
      return;
    }

    const byDay = new Map();
    for (const group of groups) {
      if (!byDay.has(group.day)) byDay.set(group.day, []);
      byDay.get(group.day).push(group);
    }

    const pages = [...byDay.entries()].map(([day, dayGroups]) => `
      <section class="day-page">
        <header class="page-header">
          <div>
            <h1>Report volontari - vista per turni</h1>
            <h2>${escapeHtml(day)}</h2>
          </div>
          <span>Esportato il ${escapeHtml(formatDateTime(new Date().toISOString()))}</span>
        </header>
        <div class="turn-grid" style="grid-template-columns:repeat(${dayGroups.length},minmax(0,1fr))">
          ${dayGroups.map((group) => `
            <article class="turn-column">
              <h3>${escapeHtml(group.shift)}</h3>
              ${group.activities.map((item) => `
                <section class="activity-block">
                  <strong>${escapeHtml(item.activity)}</strong>
                  <div class="people-list">${item.people.map((person) =>
                    `<span class="${person.isResponsible ? 'responsible' : ''}">${person.isResponsible ? '★ ' : ''}${escapeHtml(person.name)}${person.isResponsible ? ' · Responsabile' : ''}</span>`
                  ).join('')}</div>
                </section>`).join('')}
            </article>`).join('')}
        </div>
      </section>`).join('');

    popup.document.write(`<!doctype html><html lang="it"><head><meta charset="utf-8"><title>Report volontari - vista per turni</title><style>
      @page { size: A3 landscape; margin: 8mm; }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; font-family: Arial, sans-serif; color: #173e4b; }
      .day-page { break-after: page; page-break-after: always; width: 100%; }
      .day-page:last-child { break-after: auto; page-break-after: auto; }
      .page-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin: 0 0 8px; }
      h1 { margin: 0; font-size: 14px; }
      h2 { margin: 2px 0 0; font-size: 18px; }
      .page-header span { font-size: 6.5px; color: #60757d; white-space: nowrap; }
      .turn-grid { display: grid; gap: 6px; align-items: start; width: 100%; }
      .turn-column { border: 1px solid #cfdcdf; border-radius: 6px; overflow: hidden; min-width: 0; }
      .turn-column h3 { margin: 0; padding: 5px 6px; background: #eaf2f4; font-size: 9px; border-bottom: 1px solid #cfdcdf; }
      .activity-block { padding: 5px 6px; border-bottom: 1px solid #e2eaec; break-inside: avoid; page-break-inside: avoid; }
      .activity-block:last-child { border-bottom: 0; }
      .activity-block > strong { display: block; margin-bottom: 2px; font-size: 7px; line-height: 1.15; }
      .people-list { font-size: 6.2px; line-height: 1.2; }
      .people-list span { display: inline; }
      .people-list span + span::before { content: "; "; }
      .people-list .responsible { font-weight: 700; color: #725600; }
    </style></head><body>${pages}<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),150));<\/script></body></html>`);
    popup.document.close();
  }

  function exportShiftBoardReport(kind) {
    const { columns, rows } = shiftBoardExportData();
    if (!columns.length) {
      alert('Nessun dato da esportare con i filtri correnti.');
      return;
    }
    if (kind === 'excel') {
      exportExcel('report-volontari-vista-turni.xls', 'Vista turni', columns, rows);
    } else {
      exportShiftBoardPdfByDay();
    }
  }

  function renderActivityCatalog() {
    const rows = (snapshot?.activityCatalog || []).filter((item) => item.active);
    const body = [
      ...(newActivityOpen ? [`<tr class="is-new-row" data-activity-row data-activity-id=""><td><input class="name-input" data-activity-name maxlength="200" placeholder="Nuova attività"></td><td><div class="row-actions"><button type="button" data-save-activity>Salva</button><button type="button" data-cancel-new-activity>Annulla</button></div><small class="row-save-status" data-row-status></small></td></tr>`] : []),
      ...rows.map((item) => `<tr data-activity-row data-activity-id="${escapeHtml(item.id)}"><td><input class="name-input" data-activity-name maxlength="200" value="${escapeHtml(item.name)}"></td><td><div class="row-actions"><button type="button" data-save-activity>Salva</button><button class="is-danger" type="button" data-delete-activity>Elimina</button></div><small class="row-save-status" data-row-status></small></td></tr>`)
    ].join('');
    activityCatalog.innerHTML = body
      ? `<table class="admin-table catalog-table"><thead><tr><th>Attività</th><th>Azioni</th></tr></thead><tbody>${body}</tbody></table>`
      : '<p class="empty-state">Nessuna attività attiva.</p>';
  }

  function filteredRaceProgram() {
    const personIds = selectedFilterValues(racePersonFilter);
    const q = String(raceCrewFilter?.value || '').trim().toLocaleLowerCase('it-IT');
    return (snapshot?.raceProgram || []).filter((row) =>
      filterMatches(personIds, row.personId)
      && (!q || `${row.personName} ${row.personCode} ${row.crewLabel}`.toLocaleLowerCase('it-IT').includes(q))
    );
  }

  function raceRowHtml(row = null, isNew = false) {
    const personId = row?.personId || '';
    const person = (snapshot?.people || []).find((item) => item.id === personId);
    const code = person?.person_code || row?.personCode || '';
    return `<tr class="${isNew ? 'is-new-row' : ''}" data-race-row data-race-id="${escapeHtml(row?.id || '')}">
      <td><select class="person-select" data-race-person>${personOptions(personId)}</select></td>
      <td><span class="inline-code" data-race-code>${escapeHtml(code || '—')}</span></td>
      <td><input class="crew-input" data-race-crew maxlength="240" value="${escapeHtml(row?.crewLabel || '')}" placeholder="Equipaggio / categoria"></td>
      <td><input class="date-input" data-race-date type="date" value="${escapeHtml(row?.raceDate || '')}"></td>
      <td><input class="time-input" data-race-time type="time" value="${escapeHtml(row?.raceTime || '')}"></td>
      <td><div class="row-actions"><button type="button" data-save-race>Salva</button>${isNew ? '<button type="button" data-cancel-new-race>Annulla</button>' : '<button class="is-danger" type="button" data-delete-race>Elimina</button>'}</div><small class="row-save-status" data-row-status></small></td>
    </tr>`;
  }

  function renderRaceProgram() {
    if (!snapshot?.raceProgramAvailable) {
      setStatus(raceProgramStatus, 'Anagrafica non ancora inizializzata nel database: la migrazione è pronta ma non è stata applicata.', 'error');
      raceProgram.innerHTML = '<div class="catalog-unavailable">Il file Programma gare per org.xlsx è stato elaborato, ma la nuova tabella non è ancora stata creata nel database condiviso.</div>';
      return;
    }
    setStatus(raceProgramStatus, '');
    const rows = filteredRaceProgram();
    const body = [
      ...(newRaceEntryOpen ? [raceRowHtml(null, true)] : []),
      ...rows.map((row) => raceRowHtml(row, false))
    ].join('');
    raceProgram.innerHTML = body
      ? `<table class="admin-table race-table"><thead><tr><th>Persona</th><th>Codice</th><th>Equipaggio / categoria</th><th>Giorno gara</th><th>Ora gara</th><th>Azioni</th></tr></thead><tbody>${body}</tbody></table>`
      : '<p class="empty-state">Nessuna voce del programma corrisponde ai filtri.</p>';
  }

  function showPersonDetail(personId) {
    const person = (snapshot?.people || []).find((item) => item.id === personId);
    const rows = (snapshot?.assignments || []).filter((item) => item.personId === personId)
      .sort((a, b) => `${a.day} ${a.shift} ${displayActivity(a)}`.localeCompare(`${b.day} ${b.shift} ${displayActivity(b)}`, 'it'));
    detailTitle.textContent = person ? `${person.display_name} · ${person.person_code || 'senza codice'}` : 'Attività della persona';
    detailContent.innerHTML = rows.length
      ? `<table class="detail-table"><thead><tr><th>Turno</th><th>Attività</th><th>Risposta</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${escapeHtml(row.day)} · ${escapeHtml(row.shift)}</td><td>${escapeHtml(displayActivity(row))}</td><td>${responseBadge(row.currentResponse)}</td></tr>`).join('')}</tbody></table>`
      : '<p class="empty-state">Nessuna attività assegnata.</p>';
    detailDialog.showModal();
  }

  function showActivityDetail(activityLabel) {
    const rows = (snapshot?.assignments || []).filter((item) => displayActivity(item) === activityLabel);
    const groups = new Map();
    for (const row of rows) {
      const key = `${row.day} · ${row.shift}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row.personName);
    }
    detailTitle.textContent = activityLabel;
    const grouped = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0], 'it'));
    detailContent.innerHTML = grouped.length
      ? `<table class="detail-table"><thead><tr><th>Turno</th><th>Persone assegnate</th></tr></thead><tbody>${grouped.map(([turno, people]) => `<tr><td>${escapeHtml(turno)}</td><td>${escapeHtml([...new Set(people)].sort((a,b)=>a.localeCompare(b,'it')).join('; '))}</td></tr>`).join('')}</tbody></table>`
      : '<p class="empty-state">Nessuna persona assegnata.</p>';
    detailDialog.showModal();
  }

  function showShiftActivities(shiftId, rowNode) {
    const shift = (snapshot?.shifts || []).find((item) => item.id === shiftId);
    if (!shift) {
      alert('Turno non disponibile.');
      return;
    }

    detailTargetRow = rowNode || null;
    const assignedRows = (snapshot?.assignments || []).filter((row) => row.shiftId === shiftId);
    const groups = new Map();
    for (const row of assignedRows) {
      const label = displayActivity(row);
      const catalogValue = assignmentCatalogValue(row)
        || (snapshot?.activities || []).find((activity) => activity.name === row.activity)?.name
        || '';
      if (!groups.has(label)) groups.set(label, { label, catalogValue, people: [] });
      groups.get(label).people.push(row.personName);
      if (!groups.get(label).catalogValue && catalogValue) groups.get(label).catalogValue = catalogValue;
    }

    const grouped = [...groups.values()]
      .map((item) => ({ ...item, people: [...new Set(item.people)].sort((a, b) => a.localeCompare(b, 'it')) }))
      .sort((a, b) => a.label.localeCompare(b.label, 'it'));

    const usedCatalogValues = new Set(grouped.map((item) => item.catalogValue).filter(Boolean));
    const otherActivities = (snapshot?.activities || [])
      .filter((activity) => activity.active !== false && !usedCatalogValues.has(activity.name))
      .sort((a, b) => a.name.localeCompare(b.name, 'it'));

    detailTitle.textContent = `${shift.day_label} · ${shift.shift_label}`;
    const currentHtml = grouped.length
      ? `<table class="detail-table shift-activity-table"><thead><tr><th>Attività nel turno</th><th>Persone già assegnate</th><th></th></tr></thead><tbody>${grouped.map((item) => `
          <tr>
            <td><strong>${escapeHtml(item.label)}</strong></td>
            <td>${escapeHtml(item.people.join('; '))}</td>
            <td>${detailTargetRow && item.catalogValue ? `<button class="table-link" type="button" data-pick-shift-activity="${escapeHtml(item.catalogValue)}">Seleziona</button>` : ''}</td>
          </tr>`).join('')}</tbody></table>`
      : '<p class="empty-state">In questo turno non risultano ancora attività assegnate.</p>';

    const otherHtml = detailTargetRow && otherActivities.length
      ? `<details class="other-activities"><summary>Altre attività dell’anagrafica</summary><div class="other-activities__list">${otherActivities.map((activity) =>
          `<button class="table-link" type="button" data-pick-shift-activity="${escapeHtml(activity.name)}">${escapeHtml(prettifyActivityName(activity.name))}</button>`
        ).join('')}</div></details>`
      : '';

    detailContent.innerHTML = `
      <p class="intro detail-intro">Qui vedi come è già organizzato il turno. Puoi scegliere direttamente un’attività per la riga che stai compilando.</p>
      ${currentHtml}
      ${otherHtml}`;
    detailDialog.showModal();
  }

  function personActivitiesHtml(personId) {
    const rows = (snapshot?.assignments || [])
      .filter((item) => item.personId === personId)
      .sort((a, b) => {
        const shiftA = (snapshot?.shifts || []).find((shift) => shift.id === a.shiftId)?.sort_order ?? 9999;
        const shiftB = (snapshot?.shifts || []).find((shift) => shift.id === b.shiftId)?.sort_order ?? 9999;
        return shiftA - shiftB || displayActivity(a).localeCompare(displayActivity(b), 'it');
      });
    return rows.length
      ? `<table class="detail-table"><thead><tr><th>Turno</th><th>Attività</th><th>Risposta</th></tr></thead><tbody>${rows.map((row) =>
          `<tr><td>${escapeHtml(row.day)} · ${escapeHtml(row.shift)}</td><td>${escapeHtml(displayActivity(row))}</td><td>${responseBadge(row.currentResponse)}</td></tr>`
        ).join('')}</tbody></table>`
      : '<p class="empty-state">Nessuna attività assegnata.</p>';
  }

  function showPersonActivitiesPopup(personId) {
    const person = (snapshot?.people || []).find((item) => item.id === personId);
    if (!person || !personActivitiesDialog) return;
    const assignments = (snapshot?.assignments || []).filter((item) => item.personId === personId);
    const days = new Set(assignments.map((item) => item.day).filter(Boolean));
    personActivitiesTitle.textContent = person.display_name || 'Attività';
    personActivitiesContent.innerHTML = assignments.length
      ? `<p class="intro detail-intro"><strong>${assignments.length}</strong> attività già assegnate su <strong>${days.size}</strong> ${days.size === 1 ? 'giorno' : 'giorni'}.</p>${personActivitiesHtml(personId)}`
      : '<p class="empty-state">Non risultano attività già assegnate a questa persona.</p>';
    personActivitiesDialog.showModal();
  }

  function showRespondedPeople() {
    const people = respondedAssignedPeople();
    detailTargetRow = null;
    detailTitle.textContent = `Persone che hanno risposto · ${people.length}`;
    detailContent.innerHTML = people.length
      ? `<table class="detail-table"><thead><tr><th>Persona</th><th>Ultima risposta</th></tr></thead><tbody>${people.map((person) =>
          `<tr><td><button class="inline-name-link" type="button" data-open-person-activities="${escapeHtml(person.id)}">${escapeHtml(person.display_name)}</button></td><td>${escapeHtml(formatDateTime(person.latestSubmission?.createdAt))}</td></tr>`
        ).join('')}</tbody></table>`
      : '<p class="empty-state">Nessuna persona ha ancora risposto.</p>';
    detailDialog.showModal();
  }

  function showAvailabilityPeople() {
    const rows = unassignedAvailabilityRows();
    const groups = new Map();
    for (const row of rows) {
      if (!groups.has(row.personId)) groups.set(row.personId, { personId: row.personId, personName: row.personName, shifts: [] });
      groups.get(row.personId).shifts.push(`${row.day} · ${row.shift}`);
    }
    const people = [...groups.values()].sort((a, b) => a.personName.localeCompare(b.personName, 'it'));
    detailTargetRow = null;
    detailTitle.textContent = `Persone con disponibilità da assegnare · ${people.length}`;
    detailContent.innerHTML = people.length
      ? `<table class="detail-table"><thead><tr><th>Persona</th><th>Disponibilità da assegnare</th></tr></thead><tbody>${people.map((person) =>
          `<tr><td><button class="inline-name-link" type="button" data-open-person-activities="${escapeHtml(person.personId)}">${escapeHtml(person.personName)}</button></td><td>${person.shifts.map((shift) => `<div class="detail-line">${escapeHtml(shift)}</div>`).join('')}</td></tr>`
        ).join('')}</tbody></table>
        <div class="actions actions--end"><button class="button button--secondary" type="button" data-filter-unassigned-availability>Mostra nella tabella Assegnazioni</button></div>`
      : '<p class="empty-state">Non ci sono disponibilità da assegnare.</p>';
    detailDialog.showModal();
  }

  function renderAll() {
    renderKpis();
    renderAssignments();
    renderActivityCatalog();
    renderRaceProgram();
    renderPersonReport();
    renderActivityReport();
    renderShiftBoardReport();
  }

  async function loadSnapshot() {
    snapshot = await api();
    populateFilters();
    renderAll();
  }

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

  async function setAssignmentResponsible(assignmentId, isResponsible, button) {
    if (!snapshot?.responsibilityAvailable) {
      setStatus(responsibleStatus, 'La funzione responsabile non è ancora inizializzata nel database.', 'error');
      return false;
    }
    let success = false;
    await withButtonBusy(button, isResponsible ? 'Impostazione…' : 'Rimozione…', async () => {
      try {
        await api(API, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'set-assignment-responsible',
            assignmentId,
            isResponsible
          })
        });
        await loadSnapshot();
        success = true;
      } catch (error) {
        setStatus(responsibleStatus, error.message, 'error');
      }
    });
    return success;
  }

  function showResponsiblePopup(assignmentId) {
    const row = (snapshot?.assignments || []).find((item) => item.id === assignmentId);
    if (!row || !responsibleDialog) return;

    const groupRows = responsibilityGroupRows(row);
    const current = groupRows.find((item) => item.isResponsible) || null;

    responsibleTitle.textContent = displayActivity(row);
    responsibleSummary.textContent = `${row.day} · ${row.shift} — scegli una sola persona tra quelle già assegnate a questa attività.`;
    setStatus(responsibleStatus, snapshot?.responsibilityAvailable
      ? ''
      : 'La selezione è pronta, ma il salvataggio sarà disponibile dopo l’attivazione della migrazione responsabili.');

    const noneButton = `
      <button type="button"
        class="responsible-choice responsible-choice--none ${current ? '' : 'is-selected'}"
        data-clear-group-responsible="${escapeHtml(current?.id || '')}"
        ${snapshot?.responsibilityAvailable ? '' : 'disabled'}>
        <span class="responsible-choice__mark">${current ? '○' : '✓'}</span>
        <span><strong>Nessun responsabile</strong><small>Lascia l’attività senza responsabile</small></span>
      </button>`;

    responsibleContent.innerHTML = `
      <div class="responsible-choice-list">
        ${groupRows.map((item) => `
          <button type="button"
            class="responsible-choice ${item.isResponsible ? 'is-selected' : ''}"
            data-pick-group-responsible="${escapeHtml(item.id)}"
            ${snapshot?.responsibilityAvailable ? '' : 'disabled'}>
            <span class="responsible-choice__mark">${item.isResponsible ? '★' : '○'}</span>
            <span>
              <strong>${escapeHtml(item.personName)}</strong>
              <small>${item.isResponsible ? 'Responsabile attuale' : 'Assegnato a questa attività e turno'}</small>
            </span>
          </button>`).join('')}
        ${noneButton}
      </div>`;

    responsibleDialog.showModal();
  }

  async function saveInlineAssignment(rowNode) {
    const status = rowNode.querySelector('[data-row-status]');
    const assignmentId = rowNode.dataset.assignmentId || null;
    const current = assignmentId ? (snapshot?.assignments || []).find((row) => row.id === assignmentId) : null;
    const personId = rowNode.querySelector('[data-inline-person]')?.value || '';
    const shiftValue = rowNode.querySelector('[data-inline-shift]')?.value || '';
    const activity = rowNode.querySelector('[data-inline-activity]')?.value || '';

    if (!personId || !shiftValue || !activity) {
      status.textContent = 'Seleziona persona, turno e attività.';
      status.className = 'row-save-status is-error';
      return;
    }

    let shiftId = null;
    let rawDay = null;
    let rawShiftValue = null;
    if (shiftValue === 'raw') {
      if (!current || current.shiftMatched) {
        status.textContent = 'Seleziona un turno dall’elenco.';
        status.className = 'row-save-status is-error';
        return;
      }
      rawDay = current.day;
      rawShiftValue = current.shift;
    } else {
      shiftId = shiftValue;
    }

    status.textContent = 'Salvataggio…';
    status.className = 'row-save-status';
    try {
      await api(API, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'save-assignment',
          assignmentId,
          personId,
          shiftId,
          rawDay,
          rawShift: rawShiftValue,
          activity,
          role: null,
          requestedProfile: current?.requestedProfile || null,
          note: current?.note || null
        })
      });
      newAssignmentOpen = false;
      await loadSnapshot();
    } catch (error) {
      status.textContent = error.message;
      status.className = 'row-save-status is-error';
    }
  }

  document.querySelector('[data-copy-volunteer-link]')?.addEventListener('click', copyVolunteerLink);
  kpis?.addEventListener('click', (event) => {
    if (event.target.closest('[data-show-responded]')) {
      showRespondedPeople();
      return;
    }
    if (event.target.closest('[data-show-unassigned-availability]')) {
      showAvailabilityPeople();
    }
  });
  document.querySelector('[data-clear-availability-filter]')?.addEventListener('click', () => {
    if (assignmentTypeFilter) assignmentTypeFilter.value = 'all';
    renderAssignments();
  });
  document.querySelector('[data-refresh]')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    await withButtonBusy(button, 'Aggiornamento…', async () => {
      try {
        await loadSnapshot();
      } catch (error) {
        alert(error.message);
      }
    });
  });
  document.querySelector('[data-logout]')?.addEventListener('click', () => { clearCredentials(); showLogin(); });

  document.querySelector('[data-new-assignment]')?.addEventListener('click', () => {
    if (assignmentTypeFilter) assignmentTypeFilter.value = 'assigned';
    newAssignmentOpen = true;
    renderAssignments();
    assignmentTable?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
  document.querySelector('[data-new-activity]')?.addEventListener('click', () => {
    newActivityOpen = true;
    renderActivityCatalog();
  });
  document.querySelector('[data-new-race-entry]')?.addEventListener('click', () => {
    if (!snapshot?.raceProgramAvailable) {
      alert('Il programma gare non è ancora inizializzato nel database.');
      return;
    }
    newRaceEntryOpen = true;
    renderRaceProgram();
  });

  [assignmentTypeFilter, assignmentSort, assignmentPersonFilter, assignmentShiftFilter, assignmentActivityFilter, assignmentResponseFilter, assignmentWarningFilter]
    .forEach((filter) => filter?.addEventListener('change', renderAssignments));
  [personReportPersonFilter, personReportResponseFilter]
    .forEach((filter) => filter?.addEventListener('change', renderPersonReport));
  [activityReportPersonFilter, activityReportActivityFilter, activityReportShiftFilter]
    .forEach((filter) => filter?.addEventListener('change', renderActivityReport));
  [shiftBoardPersonFilter, shiftBoardActivityFilter, shiftBoardShiftFilter]
    .forEach((filter) => filter?.addEventListener('change', renderShiftBoardReport));
  racePersonFilter?.addEventListener('change', renderRaceProgram);
  raceCrewFilter?.addEventListener('input', renderRaceProgram);

  document.querySelector('[data-person-export-pdf]')?.addEventListener('click', () => exportPersonReport('pdf'));
  document.querySelector('[data-person-export-excel]')?.addEventListener('click', () => exportPersonReport('excel'));
  document.querySelector('[data-activity-export-pdf]')?.addEventListener('click', () => exportActivityReport('pdf'));
  document.querySelector('[data-activity-export-excel]')?.addEventListener('click', () => exportActivityReport('excel'));
  document.querySelector('[data-shift-board-export-pdf]')?.addEventListener('click', () => exportShiftBoardReport('pdf'));
  document.querySelector('[data-shift-board-export-excel]')?.addEventListener('click', () => exportShiftBoardReport('excel'));

  document.querySelectorAll('[data-collapse-target]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = document.getElementById(button.dataset.collapseTarget);
      if (!target) return;
      const collapsed = !target.hidden;
      target.hidden = collapsed;
      button.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      button.textContent = collapsed ? 'Espandi' : 'Comprimi';
    });
  });

  assignmentTable?.addEventListener('change', (event) => {
    const rowNode = event.target.closest('[data-assignment-row]');
    if (!rowNode) return;

    if (event.target.matches('[data-inline-shift]')) {
      const select = event.target;
      const shift = (snapshot?.shifts || []).find((item) => item.id === select.value);
      const display = rowNode.querySelector('[data-shift-display]');
      const button = display?.querySelector('[data-show-shift-activities]');
      if (shift && button) {
        button.textContent = `${shift.day_label} · ${shift.shift_label}`;
        button.dataset.showShiftActivities = shift.id;
      }
    }

    if (event.target.matches('[data-inline-person], [data-inline-shift]')) refreshRowWarnings(rowNode);

    if (event.target.matches('select[data-inline-person]') && event.target.value) {
      showPersonActivitiesPopup(event.target.value);
    }
  });

  assignmentTable?.addEventListener('click', async (event) => {
    const rowNode = event.target.closest('[data-assignment-row]');
    const save = event.target.closest('[data-save-inline-assignment]');
    const cancelEdit = event.target.closest('[data-cancel-inline-assignment]');
    const editShift = event.target.closest('[data-edit-shift]');
    const editPerson = event.target.closest('[data-edit-person]');
    const editActivity = event.target.closest('[data-edit-activity]');
    const shiftLink = event.target.closest('[data-show-shift-activities]');
    const responsible = event.target.closest('[data-open-responsible]');
    const remove = event.target.closest('[data-delete-assignment]');
    const audit = event.target.closest('[data-audit-person]');
    const person = event.target.closest('[data-show-person]');
    const activity = event.target.closest('[data-show-activity]');

    if (responsible && rowNode?.dataset.assignmentId) {
      showResponsiblePopup(responsible.dataset.openResponsible || rowNode.dataset.assignmentId);
    } else if (shiftLink && rowNode) {
      const shiftId = shiftLink.dataset.showShiftActivities;
      if (shiftId) showShiftActivities(shiftId, rowNode);
    } else if (editShift && rowNode) {
      const display = rowNode.querySelector('[data-shift-display]');
      const select = rowNode.querySelector('[data-inline-shift]');
      if (display) display.hidden = true;
      if (select) {
        select.hidden = false;
        select.focus();
      }
    } else if (editPerson && rowNode) {
      const display = rowNode.querySelector('[data-person-display]');
      const select = rowNode.querySelector('[data-inline-person]');
      if (display) display.hidden = true;
      if (select) {
        select.hidden = false;
        select.focus();
      }
    } else if (editActivity && rowNode) {
      const display = rowNode.querySelector('[data-activity-display]');
      const select = rowNode.querySelector('[data-inline-activity]');
      if (display) display.hidden = true;
      if (select) {
        select.hidden = false;
        select.focus();
      }
    } else if (save && rowNode) {
      setRowBusy(rowNode, true, save);
      try {
        await withButtonBusy(save, 'Salvataggio…', () => saveInlineAssignment(rowNode));
      } finally {
        if (rowNode.isConnected) setRowBusy(rowNode, false);
      }
    } else if (cancelEdit) {
      withBriefButtonBusy(cancelEdit, 'Annullamento…', () => {
        if (!rowNode?.dataset.assignmentId && !rowNode?.dataset.availabilityKey) newAssignmentOpen = false;
        renderAssignments();
      });
    } else if (person) {
      showPersonDetail(person.dataset.showPerson);
    } else if (activity) {
      showActivityDetail(activity.dataset.showActivity);
    } else if (remove) {
      const assignment = snapshot.assignments.find((row) => row.id === remove.dataset.deleteAssignment);
      if (!assignment || !confirm(`Eliminare l’assegnazione “${displayActivity(assignment)}” di ${assignment.personName}? Verrà rimossa dalla vista operativa, mentre lo storico resterà disponibile.`)) return;
      try {
        await api(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'deactivate-assignment', assignmentId: assignment.id }) });
        await loadSnapshot();
      } catch (error) { alert(error.message); }
    } else if (audit) {
      await withButtonBusy(audit, 'Caricamento…', async () => {
        try { await showAudit(audit.dataset.auditPerson, audit.dataset.personName || 'Persona'); }
        catch (error) { alert(error.message); }
      });
    }
  });

  activityCatalog?.addEventListener('click', async (event) => {
    const rowNode = event.target.closest('[data-activity-row]');
    if (!rowNode) return;
    const save = event.target.closest('[data-save-activity]');
    const remove = event.target.closest('[data-delete-activity]');
    const cancel = event.target.closest('[data-cancel-new-activity]');
    const status = rowNode.querySelector('[data-row-status]');

    if (cancel) {
      withBriefButtonBusy(cancel, 'Annullamento…', () => {
        newActivityOpen = false;
        renderActivityCatalog();
      });
      return;
    }
    if (save) {
      const name = rowNode.querySelector('[data-activity-name]')?.value.trim() || '';
      if (!name) {
        status.textContent = 'Indica il nome dell’attività.';
        status.className = 'row-save-status is-error';
        return;
      }
      setRowBusy(rowNode, true, save);
      try {
        await withButtonBusy(save, 'Salvataggio…', async () => {
          try {
            await api(API, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ action: 'save-activity', activityId: rowNode.dataset.activityId || null, name })
            });
            newActivityOpen = false;
            await loadSnapshot();
          } catch (error) {
            status.textContent = error.message;
            status.className = 'row-save-status is-error';
          }
        });
      } finally {
        if (rowNode.isConnected) setRowBusy(rowNode, false);
      }
      return;
    }
    if (remove) {
      const name = rowNode.querySelector('[data-activity-name]')?.value.trim() || 'questa attività';
      if (!confirm(`Eliminare “${name}” dall’anagrafica selezionabile? Le assegnazioni storiche resteranno leggibili.`)) return;
      try {
        await api(API, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'delete-activity', activityId: rowNode.dataset.activityId })
        });
        await loadSnapshot();
      } catch (error) { alert(error.message); }
    }
  });

  raceProgram?.addEventListener('change', (event) => {
    const select = event.target.closest('[data-race-person]');
    if (!select) return;
    const rowNode = select.closest('[data-race-row]');
    const person = (snapshot?.people || []).find((item) => item.id === select.value);
    const codeNode = rowNode?.querySelector('[data-race-code]');
    if (codeNode) codeNode.textContent = person?.person_code || '—';
  });

  raceProgram?.addEventListener('click', async (event) => {
    const rowNode = event.target.closest('[data-race-row]');
    if (!rowNode) return;
    const save = event.target.closest('[data-save-race]');
    const remove = event.target.closest('[data-delete-race]');
    const cancel = event.target.closest('[data-cancel-new-race]');
    const status = rowNode.querySelector('[data-row-status]');

    if (cancel) {
      withBriefButtonBusy(cancel, 'Annullamento…', () => {
        newRaceEntryOpen = false;
        renderRaceProgram();
      });
      return;
    }
    if (save) {
      const personId = rowNode.querySelector('[data-race-person]')?.value || '';
      const crewLabel = rowNode.querySelector('[data-race-crew]')?.value.trim() || '';
      const raceDate = rowNode.querySelector('[data-race-date]')?.value || null;
      const raceTime = rowNode.querySelector('[data-race-time]')?.value || null;
      if (!personId || !crewLabel) {
        status.textContent = 'Seleziona persona e indica equipaggio/categoria.';
        status.className = 'row-save-status is-error';
        return;
      }
      setRowBusy(rowNode, true, save);
      try {
        await withButtonBusy(save, 'Salvataggio…', async () => {
          try {
            await api(API, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ action: 'save-race-entry', entryId: rowNode.dataset.raceId || null, personId, crewLabel, raceDate, raceTime })
            });
            newRaceEntryOpen = false;
            await loadSnapshot();
          } catch (error) {
            status.textContent = error.message;
            status.className = 'row-save-status is-error';
          }
        });
      } finally {
        if (rowNode.isConnected) setRowBusy(rowNode, false);
      }
      return;
    }
    if (remove) {
      const crew = rowNode.querySelector('[data-race-crew]')?.value.trim() || 'questa voce';
      if (!confirm(`Eliminare “${crew}” dal programma gare organizzativo?`)) return;
      try {
        await api(API, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'delete-race-entry', entryId: rowNode.dataset.raceId })
        });
        await loadSnapshot();
      } catch (error) { alert(error.message); }
    }
  });

  personReport?.addEventListener('click', async (event) => {
    const audit = event.target.closest('[data-audit-person]');
    if (!audit) return;
    await withButtonBusy(audit, 'Caricamento…', async () => {
      try { await showAudit(audit.dataset.auditPerson, audit.dataset.personName || 'Persona'); }
      catch (error) { alert(error.message); }
    });
  });

  responsibleContent?.addEventListener('click', async (event) => {
    const pick = event.target.closest('[data-pick-group-responsible]');
    const clear = event.target.closest('[data-clear-group-responsible]');
    if (pick) {
      setStatus(responsibleStatus, '');
      const ok = await setAssignmentResponsible(pick.dataset.pickGroupResponsible, true, pick);
      if (ok) responsibleDialog.close();
      return;
    }
    if (clear) {
      const assignmentId = clear.dataset.clearGroupResponsible || '';
      if (!assignmentId) {
        responsibleDialog.close();
        return;
      }
      setStatus(responsibleStatus, '');
      const ok = await setAssignmentResponsible(assignmentId, false, clear);
      if (ok) responsibleDialog.close();
    }
  });

  document.querySelectorAll('[data-responsible-close]').forEach((button) =>
    button.addEventListener('click', () => responsibleDialog?.close())
  );
  responsibleDialog?.addEventListener('click', (event) => {
    if (event.target === responsibleDialog) responsibleDialog.close();
  });

  detailContent?.addEventListener('click', (event) => {
    const personLink = event.target.closest('[data-open-person-activities]');
    if (personLink) {
      showPersonActivitiesPopup(personLink.dataset.openPersonActivities);
      return;
    }

    const filterAvailability = event.target.closest('[data-filter-unassigned-availability]');
    if (filterAvailability) {
      if (assignmentTypeFilter) assignmentTypeFilter.value = 'availability';
      [assignmentPersonFilter, assignmentShiftFilter, assignmentActivityFilter, assignmentResponseFilter, assignmentWarningFilter]
        .forEach((filter) => { if (filter) filter.value = ''; });
      detailDialog.close();
      renderAssignments();
      assignmentTable?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const pick = event.target.closest('[data-pick-shift-activity]');
    if (!pick || !detailTargetRow) return;
    const value = pick.dataset.pickShiftActivity || '';
    const select = detailTargetRow.querySelector('[data-inline-activity]');
    if (!select || ![...select.options].some((option) => option.value === value)) return;

    select.value = value;
    const display = detailTargetRow.querySelector('[data-activity-display]');
    const displayButton = display?.querySelector('[data-show-activity]');
    if (displayButton) {
      const label = prettifyActivityName(value);
      displayButton.textContent = label;
      displayButton.dataset.showActivity = label;
    }
    const status = detailTargetRow.querySelector('[data-row-status]');
    if (status) {
      status.textContent = 'Attività selezionata dal turno. Premi Salva.';
      status.className = 'row-save-status is-ok';
    }
    detailDialog.close();
  });
  document.querySelectorAll('[data-detail-close]').forEach((button) => button.addEventListener('click', () => detailDialog.close()));
  detailDialog?.addEventListener('click', (event) => { if (event.target === detailDialog) detailDialog.close(); });
  detailDialog?.addEventListener('close', () => { detailTargetRow = null; });
  document.querySelectorAll('[data-person-activities-close]').forEach((button) => button.addEventListener('click', () => personActivitiesDialog?.close()));
  personActivitiesDialog?.addEventListener('click', (event) => { if (event.target === personActivitiesDialog) personActivitiesDialog.close(); });
    document.querySelectorAll('[data-audit-close]').forEach((button) => button.addEventListener('click', () => auditDialog.close()));
  auditDialog?.addEventListener('click', (event) => { if (event.target === auditDialog) auditDialog.close(); });

  credentials = storedCredentials();
  if (credentials) {
    loadSnapshot().then(showDashboard).catch(() => { clearCredentials(); showLogin('La sessione amministrativa non è più valida.'); });
  }
})();
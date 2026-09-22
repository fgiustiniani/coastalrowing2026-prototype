(() => {
  // Branch deploy trigger: 2026-09-21 requirements rollout
  const API = '/api/volunteers-admin';
  const SESSION_KEY = 'coastal2026-admin-session';
  const login = document.querySelector('[data-admin-login]');
  const loginForm = document.querySelector('[data-login-form]');
  const loginStatus = document.querySelector('[data-login-status]');
  const dashboard = document.querySelector('[data-dashboard]');
  const inviteStatus = document.querySelector('[data-invite-status]');
  const kpis = document.querySelector('[data-kpis]');
  const assignmentTable = document.querySelector('[data-assignment-table]');
  const assignmentBoard = document.querySelector('[data-assignment-board]');
  const assignmentBoardStatus = document.querySelector('[data-assignment-board-status]');
  const assignmentViewToggle = document.querySelector('[data-assignment-view-toggle]');
  const assignmentBoardExportPdf = document.querySelector('[data-assignment-board-export-pdf]');
  const assignmentFiltersToggle = document.querySelector('[data-assignment-filters-toggle]');
  const assignmentFiltersPanel = document.querySelector('[data-assignment-filters]');
  const assignmentListOnlyFields = Array.from(document.querySelectorAll('[data-assignment-list-only]'));
  const assignmentTypeFilter = document.querySelector('[data-assignment-type-filter]');
  const assignmentSort = document.querySelector('[data-assignment-sort]');
  const assignmentPersonFilter = document.querySelector('[data-assignment-person-filter]');
  const assignmentShiftFilter = document.querySelector('[data-assignment-shift-filter]');
  const assignmentActivityFilter = document.querySelector('[data-assignment-activity-filter]');
  const assignmentResponseFilter = document.querySelector('[data-assignment-response-filter]');
  const assignmentWarningFilter = document.querySelector('[data-assignment-warning-filter]');
  const assignmentCoverageFilter = document.querySelector('[data-assignment-coverage-filter]');
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
  const confirmationChanges = document.querySelector('[data-confirmation-changes]');
  const confirmationLinkStatus = document.querySelector('[data-confirmation-link-status]');
  const personCatalog = document.querySelector('[data-person-catalog]');
  const personCatalogSearch = document.querySelector('[data-person-catalog-search]');
  const personCatalogStatus = document.querySelector('[data-person-catalog-status]');
  const activityCatalog = document.querySelector('[data-activity-catalog]');
  const activityCatalogStatus = document.querySelector('[data-activity-catalog-status]');
  const activitySaveAll = document.querySelector('[data-save-all-activities]');
  const activityGroupCatalog = document.querySelector('[data-activity-group-catalog]');
  const activityGroupStatus = document.querySelector('[data-activity-group-status]');
  const requirementCatalog = document.querySelector('[data-requirement-catalog]');
  const requirementStatus = document.querySelector('[data-requirement-status]');
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
  const boardEditDialog = document.querySelector('[data-board-edit-dialog]');
  const boardEditTitle = document.querySelector('[data-board-edit-title]');
  const boardEditContent = document.querySelector('[data-board-edit-content]');
  const boardEditStatus = document.querySelector('[data-board-edit-status]');
  const boardEditSave = document.querySelector('[data-board-edit-save]');
  const boardEditDelete = document.querySelector('[data-board-edit-delete]');
  const boardEditHistory = document.querySelector('[data-board-edit-history]');
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
  let newPersonOpen = false;
  let newActivityOpen = false;
  let newActivityDraft = { name: '', groupId: '' };
  const activityDrafts = new Map();
  let newActivityGroupOpen = false;
  let newRequirementOpen = false;
  let newRaceEntryOpen = false;
  let detailTargetRow = null;
  let assignmentView = 'list';
  let boardDragState = null;
  let boardPointerDrag = null;
  let boardActivityDragState = null;
  let boardActivityPointerDrag = null;
  let boardGroupDragState = null;
  let boardGroupPointerDrag = null;
  let boardCollapsedGroups = new Set();
  let boardDragEndedAt = 0;
  let boardEditContext = null;
  let copyRequirementContext = null;
  try {
    assignmentView = sessionStorage.getItem('coastal2026-admin-assignment-view') === 'board' ? 'board' : 'list';
  } catch {}
  try {
    const storedCollapsed = JSON.parse(localStorage.getItem('coastal2026-admin-board-collapsed-groups') || '[]');
    boardCollapsedGroups = new Set(Array.isArray(storedCollapsed) ? storedCollapsed : []);
  } catch {}

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

  function closePersonSearchSelects(except = null) {
    document.querySelectorAll('.person-search-select.is-open').forEach((wrapper) => {
      if (wrapper === except) return;
      wrapper.classList.remove('is-open');
      const panel = wrapper.querySelector('.person-search-select__panel');
      if (panel) panel.hidden = true;
    });
  }

  function initSearchablePersonSelect(select) {
    if (!select || select.disabled || select.dataset.searchablePerson === 'true') return;
    select.dataset.searchablePerson = 'true';

    const wrapper = document.createElement('div');
    wrapper.className = 'person-search-select';
    select.parentNode.insertBefore(wrapper, select);
    wrapper.appendChild(select);
    select.classList.add('person-search-select__source');
    select.tabIndex = -1;

    const input = document.createElement('input');
    input.type = 'search';
    input.className = 'person-search-select__input';
    input.placeholder = 'Digita il nominativo…';
    input.autocomplete = 'off';
    input.setAttribute('aria-label', 'Cerca persona');

    const panel = document.createElement('div');
    panel.className = 'person-search-select__panel';
    panel.hidden = true;

    wrapper.prepend(input);
    wrapper.appendChild(panel);

    const selectedOption = () => [...select.options].find((option) => option.value === select.value) || null;
    const selectedLabel = () => select.value ? (selectedOption()?.textContent?.trim() || '') : '';
    let activeIndex = -1;

    const close = ({ restore = false } = {}) => {
      wrapper.classList.remove('is-open');
      panel.hidden = true;
      activeIndex = -1;
      if (restore) input.value = selectedLabel();
    };

    const choose = (value) => {
      const option = [...select.options].find((item) => item.value === value);
      if (!option) return;
      select.value = option.value;
      input.value = option.textContent.trim();
      close();
      select.dispatchEvent(new Event('change', { bubbles: true }));
    };

    const formatRaceDateShort = (value) => {
      const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
      return match ? `${match[3]}/${match[2]}` : String(value || '—');
    };

    const personAssignmentsHtml = (personId) => {
      const currentAssignmentId = boardEditContext?.kind === 'assignment' ? boardEditContext.id : '';
      const rows = (snapshot?.assignments || [])
        .filter((row) => row.personId === personId && row.id !== currentAssignmentId)
        .sort((a, b) => {
          const reqA = requirementForAssignment(a);
          const reqB = requirementForAssignment(b);
          return (reqA?.shiftSortOrder ?? 9999) - (reqB?.shiftSortOrder ?? 9999)
            || String(a.day || '').localeCompare(String(b.day || ''), 'it')
            || String(a.shift || '').localeCompare(String(b.shift || ''), 'it')
            || displayActivity(a).localeCompare(displayActivity(b), 'it');
        });

      if (!rows.length) {
        return '<span class="person-search-select__no-assignments">Nessun’altra assegnazione</span>';
      }

      return `<span class="person-search-select__assignments">${rows.map((row) => `
        <span class="person-search-select__assignment">
          <span class="person-search-select__assignment-when">${escapeHtml(row.day || '—')} · ${escapeHtml(row.shift || '—')}</span>
          <span class="person-search-select__assignment-activity">${escapeHtml(displayActivity(row))}</span>
        </span>`).join('')}</span>`;
    };

    const personRacesHtml = (personId) => {
      if (!snapshot?.raceProgramAvailable) return '';

      const rows = (snapshot?.raceProgram || [])
        .filter((race) => race.personId === personId)
        .sort((a, b) =>
          String(a.raceDate || '').localeCompare(String(b.raceDate || ''))
          || String(a.raceTime || '').localeCompare(String(b.raceTime || ''))
          || String(a.crewLabel || '').localeCompare(String(b.crewLabel || ''), 'it')
        );

      if (!rows.length) {
        return '<span class="person-search-select__no-races">Nessuna gara</span>';
      }

      return `<span class="person-search-select__races">${rows.map((race) => `
        <span class="person-search-select__race">
          <span class="person-search-select__race-label">GARA</span>
          <span class="person-search-select__race-when">${escapeHtml(formatRaceDateShort(race.raceDate))}${race.raceTime ? ` · ${escapeHtml(race.raceTime)}` : ' · orario da definire'}</span>
          <span class="person-search-select__race-crew">${escapeHtml(race.crewLabel || 'Equipaggio non indicato')}</span>
        </span>`).join('')}</span>`;
    };

    const render = (query = '') => {
      const normalized = normalizeFilterSearch(query);
      const options = [...select.options]
        .filter((option) => option.value)
        .filter((option) => {
          if (!normalized) return true;
          const haystack = normalizeFilterSearch(option.textContent);
          return normalized.split(/\s+/).filter(Boolean).every((token) => haystack.includes(token));
        });

      activeIndex = options.length ? 0 : -1;
      panel.innerHTML = options.length
        ? options.map((option, index) => `
            <button type="button"
              class="person-search-select__option ${index === activeIndex ? 'is-active' : ''}"
              data-person-search-value="${escapeHtml(option.value)}">
              <span class="person-search-select__name">${escapeHtml(option.textContent.trim())}</span>
              <span class="person-search-select__details">
                ${personAssignmentsHtml(option.value)}
                ${personRacesHtml(option.value)}
              </span>
            </button>`).join('')
        : '<p class="person-search-select__empty">Nessun nominativo corrispondente.</p>';

      wrapper.classList.add('is-open');
      panel.hidden = false;
    };

    const syncActive = () => {
      const options = [...panel.querySelectorAll('[data-person-search-value]')];
      options.forEach((option, index) => option.classList.toggle('is-active', index === activeIndex));
      options[activeIndex]?.scrollIntoView({ block: 'nearest' });
    };

    input.value = selectedLabel();

    input.addEventListener('focus', () => {
      input.select();
      closePersonSearchSelects(wrapper);
      render('');
    });

    input.addEventListener('input', () => {
      const selected = selectedOption();
      if (!selected || normalizeFilterSearch(input.value) !== normalizeFilterSearch(selected.textContent)) {
        if (select.value) {
          select.value = '';
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
      closePersonSearchSelects(wrapper);
      render(input.value);
    });

    input.addEventListener('keydown', (event) => {
      const options = [...panel.querySelectorAll('[data-person-search-value]')];
      if (event.key === 'ArrowDown' && options.length) {
        event.preventDefault();
        activeIndex = Math.min(activeIndex + 1, options.length - 1);
        syncActive();
      } else if (event.key === 'ArrowUp' && options.length) {
        event.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
        syncActive();
      } else if (event.key === 'Enter' && options.length && activeIndex >= 0) {
        event.preventDefault();
        choose(options[activeIndex].dataset.personSearchValue || '');
      } else if (event.key === 'Escape') {
        event.preventDefault();
        close({ restore: true });
      }
    });

    panel.addEventListener('mousedown', (event) => event.preventDefault());
    panel.addEventListener('click', (event) => {
      const option = event.target.closest('[data-person-search-value]');
      if (!option) return;
      choose(option.dataset.personSearchValue || '');
      input.focus();
      input.select();
    });
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

  function requirements() {
    return snapshot?.requirements || [];
  }

  function requirementById(id) {
    return requirements().find((item) => item.id === id) || null;
  }

  function requirementForPair(shiftId, activityId) {
    return requirements().find((item) => item.shiftId === shiftId && item.activityId === activityId) || null;
  }

  function requirementForAssignment(row) {
    if (!row?.shiftId || !row?.activityId) return null;
    return requirementForPair(row.shiftId, row.activityId);
  }

  function requirementLabel(requirement) {
    if (!requirement) return '—';
    return `${requirement.day || ''} · ${requirement.shift || ''} — ${prettifyActivityName(requirement.activity || '')}`;
  }

  function requirementOptions(selectedId = '', shiftId = '') {
    const rows = requirements()
      .filter((item) => !shiftId || item.shiftId === shiftId)
      .sort((a, b) =>
        (a.shiftSortOrder ?? 9999) - (b.shiftSortOrder ?? 9999)
        || String(a.activity || '').localeCompare(String(b.activity || ''), 'it')
      );
    return '<option value="">Seleziona turno e attività…</option>' + rows.map((item) =>
      `<option value="${escapeHtml(item.id)}" ${item.id === selectedId ? 'selected' : ''}>${escapeHtml(requirementLabel(item))} · ${item.assignedCount}/${item.requiredCount}</option>`
    ).join('');
  }

  function assignmentRequirementId(row) {
    return requirementForAssignment(row)?.id || '';
  }

  function requirementIsUncovered(requirement) {
    return Boolean(requirement) && Number(requirement.assignedCount || 0) < Number(requirement.requiredCount || 0);
  }

  function requirementGapRows() {
    return requirements()
      .filter(requirementIsUncovered)
      .map((requirement) => ({
        id: `requirement:${requirement.id}`,
        isRequirementGap: true,
        requirementId: requirement.id,
        shiftId: requirement.shiftId,
        day: requirement.day,
        shift: requirement.shift,
        shiftMatched: true,
        activityId: requirement.activityId,
        activity: requirement.activity,
        role: '',
        personId: '',
        personName: '',
        missingCount: Math.max(0, Number(requirement.requiredCount || 0) - Number(requirement.assignedCount || 0)),
        assignedCount: Number(requirement.assignedCount || 0),
        requiredCount: Number(requirement.requiredCount || 0),
        currentResponse: null
      }));
  }

  function activityGroups() {
    return [...(snapshot?.activityGroups || [])]
      .filter((group) => group.active !== false)
      .sort((a, b) =>
        Number(a.display_order ?? a.displayOrder ?? 0) - Number(b.display_order ?? b.displayOrder ?? 0)
        || String(a.name || '').localeCompare(String(b.name || ''), 'it')
      );
  }

  function activityGroupOptions(selectedId = '', { includeUngrouped = true } = {}) {
    return (includeUngrouped ? '<option value="">Senza gruppo</option>' : '<option value="">Seleziona gruppo…</option>')
      + activityGroups().map((group) =>
        `<option value="${escapeHtml(group.id)}" ${group.id === selectedId ? 'selected' : ''}>${escapeHtml(group.name)}</option>`
      ).join('');
  }

  function activityGroupById(id) {
    return activityGroups().find((group) => group.id === id) || null;
  }

  function boardGroupKey(shiftId, groupId) {
    return `${shiftId || 'shift'}|${groupId || '__ungrouped__'}`;
  }

  function boardGroupCollapsed(shiftId, groupId) {
    return boardCollapsedGroups.has(boardGroupKey(shiftId, groupId));
  }

  function persistBoardCollapsedGroups() {
    try {
      localStorage.setItem('coastal2026-admin-board-collapsed-groups', JSON.stringify([...boardCollapsedGroups]));
    } catch {}
  }

  function activityIdOptions(selectedId = '', { allowNew = false } = {}) {
    return '<option value="">Seleziona…</option>' + [...(snapshot?.activities || [])]
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'it'))
      .map((activity) => `<option value="${escapeHtml(activity.id)}" ${activity.id === selectedId ? 'selected' : ''}>${escapeHtml(prettifyActivityName(activity.name))}</option>`)
      .join('')
      + (allowNew ? '<option value="__new__">＋ Crea nuova attività…</option>' : '');
  }

  function shiftIdOptions(selectedId = '', { allowNew = false } = {}) {
    return '<option value="">Seleziona…</option>' + [...(snapshot?.shifts || [])]
      .sort((a, b) => Date.parse(a.starts_at || '') - Date.parse(b.starts_at || '') || (a.sort_order ?? 9999) - (b.sort_order ?? 9999))
      .map((shift) => `<option value="${escapeHtml(shift.id)}" ${shift.id === selectedId ? 'selected' : ''}>${escapeHtml(shift.day_label)} · ${escapeHtml(shift.shift_label)}</option>`)
      .join('')
      + (allowNew ? '<option value="__new__">＋ Crea nuovo turno…</option>' : '');
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

  function declinedResponsesForCandidate(candidate) {
    if (!candidate?.personId) return [];
    const declined = snapshot?.declinedAssignmentResponses || [];
    return declined.filter((row) => {
      if (row.personId !== candidate.personId) return false;

      if (candidate.shiftId && row.shiftId) {
        return row.shiftId === candidate.shiftId;
      }

      return String(row.day || '') === String(candidate.day || '')
        && String(row.shift || '') === String(candidate.shift || '');
    });
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

    const declinedInShift = declinedResponsesForCandidate(candidate);
    if (declinedInShift.length) {
      const activities = [...new Map(
        declinedInShift
          .map((row) => String(row.activity || 'Attività').trim())
          .filter(Boolean)
          .map((activity) => [activity.toLocaleLowerCase('it-IT'), activity])
      ).values()].sort((a, b) => a.localeCompare(b, 'it'));

      const shown = activities.slice(0, 3);
      const remainder = Math.max(0, activities.length - shown.length);
      warnings.push({
        type: 'declined',
        text: `Ha rifiutato in questo turno: ${shown.join(' · ')}${remainder ? ` · +${remainder} ${remainder === 1 ? 'altra attività' : 'altre attività'}` : ''}`
      });
    }

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
      `<span class="warning-badge${warning.type === 'race' ? ' warning-badge--race' : ''}${warning.type === 'declined' ? ' warning-badge--declined' : ''}">⚠ ${escapeHtml(warning.text)}</span>`
    ).join('')}</div>`;
  }

  function candidateFromRowNode(rowNode) {
    const assignmentId = rowNode?.dataset.assignmentId || '';
    const current = assignmentId ? (snapshot?.assignments || []).find((row) => row.id === assignmentId) : null;
    const personId = rowNode?.querySelector('[data-inline-person]')?.value || current?.personId || '';
    const requirementId = rowNode?.querySelector('[data-inline-requirement]')?.value || assignmentRequirementId(current);
    const requirement = requirementById(requirementId);
    return {
      id: assignmentId || null,
      personId,
      shiftId: requirement?.shiftId || current?.shiftId || null,
      day: requirement?.day || current?.day || '',
      shift: requirement?.shift || current?.shift || ''
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

  const multiFilterWidgets = new WeakMap();

  function selectedFilterValues(select) {
    if (!select) return [];
    return [...new Set([...select.selectedOptions]
      .map((option) => option.value)
      .filter((value) => value && value !== 'all'))];
  }

  function filterMatches(values, value) {
    return !values.length || values.includes(String(value ?? ''));
  }

  function filterAllOption(select) {
    return [...(select?.options || [])].find((option) => option.value === '' || option.value === 'all') || null;
  }

  function normalizeFilterSearch(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('it-IT')
      .trim();
  }

  function multiFilterOptionMatches(option, query) {
    if (!query) return true;
    const haystack = normalizeFilterSearch(option.textContent);
    const tokens = normalizeFilterSearch(query).split(/\s+/).filter(Boolean);
    return tokens.every((token) => haystack.includes(token));
  }

  function closeMultiFilters(except = null) {
    document.querySelectorAll('.multi-filter.is-open').forEach((wrapper) => {
      if (wrapper === except) return;
      wrapper.classList.remove('is-open');
      wrapper.querySelector('.multi-filter__button')?.setAttribute('aria-expanded', 'false');
      const panel = wrapper.querySelector('.multi-filter__panel');
      if (panel) panel.hidden = true;
    });
  }

  function syncMultiFilter(select, { focusSearch = false } = {}) {
    const widget = multiFilterWidgets.get(select);
    if (!widget) return;

    const values = selectedFilterValues(select);
    const selected = new Set(values);
    const allOption = filterAllOption(select);
    const allLabel = allOption?.textContent?.trim() || 'Tutti';
    const labels = [...select.options].filter((option) => selected.has(option.value)).map((option) => option.textContent.trim());
    const query = widget.search?.value || '';
    const visibleOptions = [...select.options]
      .map((option, index) => ({ option, index }))
      .filter(({ option }) => {
        const isAll = option.value === '' || option.value === 'all';
        return isAll ? !query : multiFilterOptionMatches(option, query);
      });

    widget.label.textContent = labels.length === 0 ? allLabel : labels.length === 1 ? labels[0] : `${labels.length} selezionati`;
    widget.button.title = labels.length > 1 ? labels.join(', ') : '';

    widget.options.innerHTML = visibleOptions.length
      ? visibleOptions.map(({ option, index }) => {
          const isAll = option.value === '' || option.value === 'all';
          const checked = isAll ? values.length === 0 : selected.has(option.value);
          return `<label class="multi-filter__option${isAll ? ' is-all' : ''}"><input type="checkbox" data-multi-filter-index="${index}" ${checked ? 'checked' : ''}><span>${escapeHtml(option.textContent)}</span></label>`;
        }).join('')
      : '<p class="multi-filter__empty">Nessun valore corrispondente.</p>';

    widget.options.querySelectorAll('[data-multi-filter-index]').forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        const option = select.options[Number(checkbox.dataset.multiFilterIndex)];
        if (!option) return;
        const isAll = option.value === '' || option.value === 'all';
        if (isAll) {
          [...select.options].forEach((item) => { item.selected = false; });
          option.selected = true;
        } else {
          option.selected = checkbox.checked;
          const sentinel = filterAllOption(select);
          if (sentinel) sentinel.selected = false;
          if (!selectedFilterValues(select).length && sentinel) sentinel.selected = true;
        }
        syncMultiFilter(select, { focusSearch: true });
        select.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });

    if (focusSearch && widget.search && !widget.panel.hidden) {
      requestAnimationFrame(() => {
        widget.search.focus();
        const end = widget.search.value.length;
        widget.search.setSelectionRange(end, end);
      });
    }
  }

  function setMultiFilterValues(select, values = []) {
    if (!select) return;
    const wanted = new Set((Array.isArray(values) ? values : [values]).filter(Boolean));
    [...select.options].forEach((option) => { option.selected = wanted.has(option.value); });
    const allOption = filterAllOption(select);
    if (!wanted.size && allOption) allOption.selected = true;
    syncMultiFilter(select);
  }

  function initMultiFilter(select) {
    if (!select || multiFilterWidgets.has(select)) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'multi-filter';
    select.parentNode.insertBefore(wrapper, select);
    wrapper.appendChild(select);
    select.classList.add('multi-filter__source');
    select.setAttribute('aria-hidden', 'true');
    select.tabIndex = -1;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'multi-filter__button';
    button.setAttribute('aria-expanded', 'false');
    button.innerHTML = '<span class="multi-filter__button-label"></span><span class="multi-filter__chevron" aria-hidden="true">⌄</span>';

    const panel = document.createElement('div');
    panel.className = 'multi-filter__panel';
    panel.hidden = true;

    const searchWrap = document.createElement('div');
    searchWrap.className = 'multi-filter__search-wrap';
    searchWrap.innerHTML = '<input class="multi-filter__search" type="search" autocomplete="off" placeholder="Digita per cercare…" aria-label="Cerca nei valori del filtro">';

    const options = document.createElement('div');
    options.className = 'multi-filter__options';

    panel.append(searchWrap, options);
    wrapper.append(button, panel);

    const search = searchWrap.querySelector('.multi-filter__search');
    multiFilterWidgets.set(select, {
      wrapper,
      button,
      label: button.querySelector('.multi-filter__button-label'),
      panel,
      search,
      options
    });

    const openFilter = (initialQuery = '') => {
      closeMultiFilters(wrapper);
      wrapper.classList.add('is-open');
      button.setAttribute('aria-expanded', 'true');
      panel.hidden = false;
      search.value = initialQuery;
      syncMultiFilter(select, { focusSearch: true });
    };

    button.addEventListener('click', (event) => {
      event.preventDefault();
      const opening = !wrapper.classList.contains('is-open');
      if (opening) openFilter('');
      else {
        wrapper.classList.remove('is-open');
        button.setAttribute('aria-expanded', 'false');
        panel.hidden = true;
      }
    });

    button.addEventListener('keydown', (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key.length === 1 && /\S/.test(event.key)) {
        event.preventDefault();
        openFilter(event.key);
      }
    });

    search.addEventListener('input', () => syncMultiFilter(select));
    search.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        wrapper.classList.remove('is-open');
        button.setAttribute('aria-expanded', 'false');
        panel.hidden = true;
        button.focus();
      }
    });

    syncMultiFilter(select);
  }

  function initMultiFilters() {
    document.querySelectorAll('.filter-grid select[multiple]').forEach(initMultiFilter);
  }

  function setSelectOptions(select, options, allLabel) {
    if (!select) return;
    const current = new Set(selectedFilterValues(select));
    select.innerHTML = `<option value="">${escapeHtml(allLabel)}</option>` + options
      .map((item) => `<option value="${escapeHtml(item.value)}">${escapeHtml(item.label)}</option>`).join('');
    [...select.options].forEach((option) => { option.selected = current.has(option.value); });
    const allOption = filterAllOption(select);
    if (!current.size && allOption) allOption.selected = true;
    syncMultiFilter(select);
  }

  function populateFilters() {
    const assignments = snapshot?.assignments || [];
    const assignmentRows = [...unassignedAvailabilityRows(), ...assignments];
    const people = [...new Map(assignmentRows.filter((row) => row.personId).map((row) => [row.personId, { value: row.personId, label: row.personName }])).values()]
      .sort((a, b) => a.label.localeCompare(b.label, 'it'));
    const shifts = [...new Map(requirements().map((row) => [`${row.day}|||${row.shift}`, {
      value: `${row.day}|||${row.shift}`, label: `${row.day} · ${row.shift}`
    }])).values()].sort((a, b) => a.label.localeCompare(b.label, 'it'));
    const activities = [...new Set(requirements().map((row) => prettifyActivityName(row.activity)).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'it'))
      .map((value) => ({ value, label: value }));

    setSelectOptions(assignmentPersonFilter, people, 'Tutte');
    setSelectOptions(assignmentShiftFilter, shifts, 'Tutti');
    setSelectOptions(assignmentActivityFilter, activities, 'Tutte');

    const reportActivities = [...new Set(assignments.map((row) => displayActivity(row)).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'it'))
      .map((value) => ({ value, label: value }));
    const reportPeople = [...new Map((snapshot?.people || [])
      .filter((person) => person.latestSubmission || assignments.some((row) => row.personId === person.id))
      .map((person) => [person.id, { value: person.id, label: person.display_name }])).values()]
      .sort((a, b) => a.label.localeCompare(b.label, 'it'));
    setSelectOptions(personReportPersonFilter, reportPeople, 'Tutte');
    setSelectOptions(activityReportActivityFilter, reportActivities, 'Tutte');
    setSelectOptions(shiftBoardActivityFilter, reportActivities, 'Tutte');

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
    const planned = requirements().reduce((sum, row) => sum + Number(row.requiredCount || 0), 0);
    const uncovered = requirements().filter(requirementIsUncovered).length;
    kpis.innerHTML = `
      <article class="kpi kpi--summary">
        <div class="kpi__main"><strong>${assignedPeople}</strong><span>persone assegnate</span></div>
        <p class="kpi__detail">di cui <button type="button" class="kpi__link" data-show-responded>${respondedPeople.length}</button> hanno risposto</p>
        <p class="kpi__detail"><button type="button" class="kpi__link" data-show-unassigned-availability>${new Set(unassignedAvailability.map((row) => row.personId)).size}</button> persone con ${unassignedAvailability.length} disponibilità da assegnare</p>
      </article>
      <article class="kpi kpi--summary kpi--requirements">
        <div class="kpi__main"><strong>${planned}</strong><span>attività previste</span></div>
        <p class="kpi__detail">di cui <strong>${assignments.length}</strong> assegnate</p>
        <div class="kpi__breakdown">
          <span>di cui <strong>${confirmed}</strong> confermate</span>
          <span><strong>${declined}</strong> rifiutate</span>
          <span><strong>${pending}</strong> senza risposta</span>
        </div>
        <p class="kpi__detail kpi__detail--alert"><strong>${uncovered}</strong> coppie turno-attività ancora scoperte</p>
      </article>`;
  }

  function filteredAssignments() {
    const types = selectedFilterValues(assignmentTypeFilter);
    const personIds = selectedFilterValues(assignmentPersonFilter);
    const shifts = selectedFilterValues(assignmentShiftFilter);
    const activities = selectedFilterValues(assignmentActivityFilter);
    const responses = selectedFilterValues(assignmentResponseFilter);
    const warningFilters = selectedFilterValues(assignmentWarningFilter);
    const coverageFilters = selectedFilterValues(assignmentCoverageFilter);

    const coverageMatches = (requirement) => {
      if (!coverageFilters.length) return true;
      if (!requirement) return false;
      const uncovered = requirementIsUncovered(requirement);
      return coverageFilters.some((value) =>
        (value === 'uncovered' && uncovered) || (value === 'covered' && !uncovered)
      );
    };

    const baseRows = [...unassignedAvailabilityRows(), ...(snapshot?.assignments || [])].filter((row) => {
      const rowType = row.isAvailability ? 'availability' : 'assigned';
      if (!filterMatches(types, rowType)) return false;

      const requirement = row.isAvailability ? null : requirementForAssignment(row);
      if (!row.isAvailability && !coverageMatches(requirement)) return false;
      if (row.isAvailability && coverageFilters.length) return false;

      const rowResponse = row.currentResponse || 'pending';
      const warnings = assignmentWarningDetails(row);
      const warningMatch = !warningFilters.length || warningFilters.some((warning) =>
        (warning === 'any' && warnings.length > 0)
        || (warning === 'none' && warnings.length === 0)
        || warnings.some((item) => item.type === warning)
      );

      return filterMatches(personIds, row.personId)
        && filterMatches(shifts, shiftFilterKey(row))
        && (!activities.length || (!row.isAvailability && activities.includes(prettifyActivityName(row.activity))))
        && (!responses.length || (!row.isAvailability && responses.includes(rowResponse)))
        && warningMatch;
    });

    const gapRows = requirementGapRows().filter((row) => {
      if (types.length && !types.includes('assigned')) return false;
      if (personIds.length || responses.length || warningFilters.length) return false;
      const requirement = requirementById(row.requirementId);
      if (!coverageMatches(requirement)) return false;
      return filterMatches(shifts, shiftFilterKey(row))
        && (!activities.length || activities.includes(prettifyActivityName(row.activity)));
    });

    return sortAssignmentRows([...baseRows, ...gapRows]);
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
    if (row?.isRequirementGap) {
      return `
        <tr data-assignment-row data-requirement-gap="${escapeHtml(row.requirementId)}" class="is-requirement-gap-row">
          <td><strong>${escapeHtml(row.day)}</strong><small>${escapeHtml(row.shift)}</small></td>
          <td><strong>${escapeHtml(prettifyActivityName(row.activity))}</strong></td>
          <td><span class="coverage-gap"><strong>Mancano ${row.missingCount}</strong><small>${row.assignedCount}/${row.requiredCount} assegnati</small></span></td>
          <td>—</td><td>—</td><td><span class="status-badge is-declined">Scoperta</span></td>
          <td><div class="row-actions"><button type="button" data-add-person-requirement="${escapeHtml(row.requirementId)}">Aggiungi persona</button></div></td>
        </tr>`;
    }

    const isAvailability = Boolean(row?.isAvailability);
    const personId = row?.personId || '';
    const assignmentId = row && !isAvailability ? row.id : '';
    const selectedRequirementId = row && !isAvailability ? assignmentRequirementId(row) : '';
    const selectedRequirement = requirementById(selectedRequirementId);
    const responseHtml = isAvailability
      ? '<span class="status-badge is-availability">Disponibilità</span>'
      : (isNew ? '—' : `${responseBadge(row.currentResponse)}${row.currentActorName ? `<small>da ${escapeHtml(row.currentActorName)} · ${escapeHtml(formatDateTime(row.currentResponseAt))}</small>` : ''}${row.currentNote ? `<small>Nota: ${escapeHtml(row.currentNote)}</small>` : ''}`);
    const warnings = row ? assignmentWarningDetails(row) : [];
    const rowClass = [
      isNew ? 'is-new-row' : '',
      isAvailability ? 'is-availability-row' : '',
      row?.isResponsible ? 'is-responsible-row' : ''
    ].filter(Boolean).join(' ');

    const requirementSelect = `<select class="inline-select inline-select--requirement" data-inline-requirement ${isAvailability ? '' : ''}>${requirementOptions(selectedRequirementId, isAvailability ? row.shiftId : '')}</select>`;

    const shiftCell = isAvailability
      ? `<button class="inline-shift-link" type="button" data-show-shift-activities="${escapeHtml(row.shiftId)}">${escapeHtml(row.day)} · ${escapeHtml(row.shift)}</button><small class="availability-source-label">Disponibilità indicata dal volontario</small>`
      : (isNew
        ? '<span class="muted-text">Seleziona la coppia →</span>'
        : `<div class="inline-display-row" data-requirement-display><button class="inline-shift-link" type="button" data-show-shift-activities="${escapeHtml(row.shiftId || '')}">${escapeHtml(row.day)} · ${escapeHtml(row.shift)}</button></div>`);

    const activityCell = (isAvailability || isNew)
      ? requirementSelect
      : `<div class="inline-display-row" data-activity-display>
           <button class="inline-activity-link" type="button" data-show-activity="${escapeHtml(prettifyActivityName(row.activity))}">${escapeHtml(prettifyActivityName(row.activity))}</button>
           <button class="inline-edit-button" type="button" data-edit-requirement aria-label="Cambia turno e attività" title="Cambia turno e attività">✎</button>
         </div>
         <div data-requirement-edit hidden>${requirementSelect}</div>
         ${selectedRequirement ? `<small class="coverage-inline">${selectedRequirement.assignedCount}/${selectedRequirement.requiredCount} assegnati</small>` : '<small class="warning-text">Coppia turno-attività non prevista</small>'}`;

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


  function filteredBoardAssignmentRows() {
    const types = selectedFilterValues(assignmentTypeFilter);
    const personIds = selectedFilterValues(assignmentPersonFilter);
    const responses = selectedFilterValues(assignmentResponseFilter);
    const warningFilters = selectedFilterValues(assignmentWarningFilter);

    return [...unassignedAvailabilityRows(), ...(snapshot?.assignments || [])].filter((row) => {
      const rowType = row.isAvailability ? 'availability' : 'assigned';
      if (!filterMatches(types, rowType)) return false;
      if (!filterMatches(personIds, row.personId)) return false;

      if (row.isAvailability) {
        return !responses.length && !warningFilters.length;
      }

      const rowResponse = row.currentResponse || 'pending';
      if (responses.length && !responses.includes(rowResponse)) return false;
      const warnings = assignmentWarningDetails(row);
      if (warningFilters.length && !warningFilters.some((warning) =>
        (warning === 'any' && warnings.length > 0)
        || (warning === 'none' && warnings.length === 0)
        || warnings.some((item) => item.type === warning)
      )) return false;
      return true;
    });
  }

  function boardResponseMeta(row) {
    if (row.isAvailability) return { className: 'is-availability', label: 'Disponibile', mark: '+' };
    if (row.currentResponse === 'confirmed') return { className: 'is-confirmed', label: 'Confermata', mark: '✓' };
    if (row.currentResponse === 'declined') return { className: 'is-declined', label: 'Non può', mark: '×' };
    return { className: 'is-pending', label: 'Da rispondere', mark: '•' };
  }

  function boardPersonCard(row) {
    const warnings = row.isAvailability ? [] : assignmentWarningDetails(row);
    const warningText = warnings.map((warning) => warning.text).join(' · ');
    const response = boardResponseMeta(row);
    const dragKind = row.isAvailability ? 'availability' : 'assignment';
    const dragId = row.id || '';
    const assignmentId = row.isAvailability ? '' : row.id;
    const responseLabel = row.currentResponse === 'confirmed'
      ? 'Confermata'
      : row.currentResponse === 'declined'
        ? 'Non può'
        : row.isAvailability
          ? 'Disponibile'
          : 'Da risp.';

    return `
      <div
        class="assignment-board__person ${row.isAvailability ? 'is-availability' : ''} ${row.isResponsible ? 'is-responsible' : ''} ${warnings.length ? 'has-warning' : ''}"
        draggable="true"
        data-board-drag-kind="${escapeHtml(dragKind)}"
        data-board-drag-id="${escapeHtml(dragId)}"
        ${assignmentId ? `data-board-assignment-id="${escapeHtml(assignmentId)}"` : ''}
        ${assignmentId ? `data-board-source-requirement-id="${escapeHtml(assignmentRequirementId(row))}"` : ''}>
        <div class="assignment-board__person-main">
          ${assignmentId ? `<span class="assignment-board__drag-handle" data-board-reorder-handle title="Trascina per cambiare posizione" aria-label="Trascina per cambiare posizione">⋮⋮</span>` : ''}
          <button type="button"
            class="assignment-board__person-name"
            data-board-person-open="${escapeHtml(row.personId)}"
            data-board-person-assignment-id="${escapeHtml(assignmentId)}"
            title="Vedi tutte le attività di ${escapeHtml(row.personName)}">
            ${escapeHtml(row.personName)}
          </button>
          <span class="assignment-board__response ${response.className}" title="${escapeHtml(response.label)}">${escapeHtml(response.mark)} ${escapeHtml(responseLabel)}</span>
          ${row.isResponsible ? '<span class="assignment-board__responsible-mark" title="Responsabile dell’attività in questo turno" aria-label="Responsabile">★</span>' : ''}
          ${row.note && row.isAvailability ? `<span class="assignment-board__note" title="${escapeHtml(row.note)}">N</span>` : ''}
          ${warnings.length ? `<span class="assignment-board__warning" tabindex="0" role="img" aria-label="Warning: ${escapeHtml(warningText)}" data-tooltip="${escapeHtml(warningText)}">⚠</span>` : ''}
          <button type="button"
            class="assignment-board__edit"
            data-board-edit-kind="${escapeHtml(dragKind)}"
            data-board-edit-id="${escapeHtml(dragId)}"
            aria-label="Modifica ${escapeHtml(row.personName)}"
            title="Modifica assegnazione">✎</button>
          ${assignmentId ? `<button type="button"
            class="assignment-board__delete"
            data-board-delete-assignment="${escapeHtml(assignmentId)}"
            aria-label="Elimina ${escapeHtml(row.personName)} dall’attività"
            title="Elimina assegnazione">×</button>` : ''}
        </div>
      </div>`;
  }

  function clearBoardActivityReorderMarkers() {
    assignmentBoard?.querySelectorAll('.is-activity-reorder-before, .is-activity-reorder-after, .is-activity-reorder-end, .is-activity-position-drop-target').forEach((node) => {
      node.classList.remove('is-activity-reorder-before', 'is-activity-reorder-after', 'is-activity-reorder-end', 'is-activity-position-drop-target');
    });
  }

  function clearBoardGroupReorderMarkers() {
    assignmentBoard?.querySelectorAll('.is-group-reorder-before, .is-group-reorder-after, .is-activity-group-drop-target').forEach((node) => {
      node.classList.remove('is-group-reorder-before', 'is-group-reorder-after', 'is-activity-group-drop-target');
    });
  }

  function autoScrollBoardDrag(clientX, clientY) {
    if (!assignmentBoard) return;

    const boardRect = assignmentBoard.getBoundingClientRect();
    const horizontalEdge = 80;
    if (clientX < boardRect.left + horizontalEdge) assignmentBoard.scrollLeft -= 22;
    else if (clientX > boardRect.right - horizontalEdge) assignmentBoard.scrollLeft += 22;

    const verticalEdge = Math.min(110, Math.max(70, window.innerHeight * 0.12));
    if (clientY < verticalEdge) {
      const speed = Math.max(10, Math.round((verticalEdge - clientY) / verticalEdge * 34));
      window.scrollBy({ top: -speed, left: 0, behavior: 'auto' });
    } else if (clientY > window.innerHeight - verticalEdge) {
      const speed = Math.max(10, Math.round((clientY - (window.innerHeight - verticalEdge)) / verticalEdge * 34));
      window.scrollBy({ top: speed, left: 0, behavior: 'auto' });
    }
  }

  function boardActivityDropContext(element, shiftId) {
    const column = element?.closest?.('[data-board-shift-column]');
    if (!column || column.dataset.boardShiftColumn !== shiftId) return null;

    const positionTarget = element.closest('[data-board-position-target]');
    if (positionTarget) {
      return {
        column,
        groupId: '',
        targetGroup: null,
        targetContainer: null,
        targetBox: null,
        paletteTarget: null,
        positionTarget,
        targetRequirementId: positionTarget.dataset.boardTargetRequirementId || '',
        placeAfter: positionTarget.dataset.boardPlaceAfter === 'true',
        canDropAtEnd: positionTarget.dataset.boardDropAtEnd === 'true'
      };
    }

    const paletteTarget = element.closest('[data-board-group-drop-target]');
    if (paletteTarget) {
      return {
        column,
        groupId: paletteTarget.dataset.boardGroupId || '',
        targetGroup: null,
        targetContainer: null,
        targetBox: null,
        paletteTarget,
        positionTarget: null
      };
    }

    const targetBox = element.closest('.assignment-board__activity[data-board-requirement-id]');
    const targetContainer = element.closest('[data-board-activity-container]');
    const targetGroup = element.closest('[data-board-activity-group]');
    if (!targetBox && !targetContainer && !targetGroup) return null;

    const groupId = targetContainer
      ? (targetContainer.dataset.boardGroupId || '')
      : targetGroup
        ? (targetGroup.dataset.boardGroupId || '')
        : (targetBox?.dataset.boardGroupId || '');

    return {
      column,
      groupId,
      targetGroup,
      targetContainer,
      targetBox,
      paletteTarget: null,
      positionTarget: null
    };
  }

  function boardShiftBlocks(shiftRequirements) {
    const ordered = [...shiftRequirements].sort((a, b) =>
      Number(a.displayOrder || 0) - Number(b.displayOrder || 0)
      || String(a.activity || '').localeCompare(String(b.activity || ''), 'it')
    );
    const grouped = new Map();
    const positionsByGroup = new Map();

    ordered.forEach((requirement, index) => {
      const groupId = requirement.activityGroupId || '';
      if (!groupId) return;
      if (!grouped.has(groupId)) {
        grouped.set(groupId, {
          type: 'group',
          groupId,
          group: activityGroupById(groupId) || { id: groupId, name: 'Gruppo' },
          requirements: []
        });
        positionsByGroup.set(groupId, []);
      }
      grouped.get(groupId).requirements.push(requirement);
      positionsByGroup.get(groupId).push(index);
    });

    const seenGroups = new Set();
    const rawBlocks = [];
    const rawGroupOrder = [];
    for (const requirement of ordered) {
      const groupId = requirement.activityGroupId || '';
      if (!groupId) {
        rawBlocks.push({ type: 'activity', requirement });
        continue;
      }
      if (seenGroups.has(groupId)) continue;
      seenGroups.add(groupId);
      rawGroupOrder.push(groupId);
      rawBlocks.push(grouped.get(groupId));
    }

    const expectedGroupOrder = activityGroups()
      .map((group) => group.id)
      .filter((groupId) => grouped.has(groupId));
    const groupsAreContiguous = [...positionsByGroup.values()].every((positions) =>
      positions.every((position, index) => index === 0 || position === positions[index - 1] + 1)
    );
    const groupOrderMatches = rawGroupOrder.length === expectedGroupOrder.length
      && rawGroupOrder.every((groupId, index) => groupId === expectedGroupOrder[index]);

    if (groupsAreContiguous && groupOrderMatches) return rawBlocks;

    // Compatibilità con l'ordine precedente: finché il turno non è stato
    // riordinato nel nuovo flusso misto, manteniamo gruppi e attività singole
    // nella stessa disposizione che l'utente vedeva già.
    const legacyBlocks = expectedGroupOrder.map((groupId) => grouped.get(groupId));
    legacyBlocks.push(...ordered
      .filter((requirement) => !requirement.activityGroupId)
      .map((requirement) => ({ type: 'activity', requirement })));
    return legacyBlocks;
  }

  function boardBlockRequirementIds(block) {
    if (!block) return [];
    if (block.type === 'group') return block.requirements.map((item) => item.id);
    return block.requirement?.id ? [block.requirement.id] : [];
  }

  function boardShiftRequirementIds(shiftId) {
    return boardShiftBlocks(requirements().filter((row) => row.shiftId === shiftId))
      .flatMap(boardBlockRequirementIds);
  }

  function boardActivityGroupIds() {
    return activityGroups().map((group) => group.id);
  }

  async function reorderBoardActivityGroup(draggedId, targetGroupId, placeAfter = false) {
    if (!draggedId || !targetGroupId || draggedId === targetGroupId) return;
    const ids = boardActivityGroupIds();
    if (!ids.includes(draggedId) || !ids.includes(targetGroupId)) return;

    const nextGroups = ids.filter((id) => id !== draggedId);
    const targetIndex = nextGroups.indexOf(targetGroupId);
    nextGroups.splice(targetIndex + (placeAfter ? 1 : 0), 0, draggedId);

    const shiftOrders = [];
    for (const shift of (snapshot?.shifts || [])) {
      const shiftRequirements = requirements().filter((row) => row.shiftId === shift.id);
      const blocks = boardShiftBlocks(shiftRequirements);
      const sourceIndex = blocks.findIndex((block) => block.type === 'group' && block.groupId === draggedId);
      const destinationIndex = blocks.findIndex((block) => block.type === 'group' && block.groupId === targetGroupId);
      if (sourceIndex < 0 || destinationIndex < 0) continue;

      const nextBlocks = [...blocks];
      const [sourceBlock] = nextBlocks.splice(sourceIndex, 1);
      const currentTargetIndex = nextBlocks.findIndex((block) => block.type === 'group' && block.groupId === targetGroupId);
      nextBlocks.splice(currentTargetIndex + (placeAfter ? 1 : 0), 0, sourceBlock);

      const requirementIds = nextBlocks.flatMap(boardBlockRequirementIds);
      const currentIds = shiftRequirementIds(shift.id);
      if (!requirementIds.every((id, index) => id === currentIds[index])) {
        shiftOrders.push({ shiftId: shift.id, requirementIds });
      }
    }

    const groupOrderChanged = !nextGroups.every((id, index) => id === ids[index]);
    if (!groupOrderChanged && !shiftOrders.length) return;

    assignmentBoard?.classList.add('is-saving');
    setStatus(assignmentBoardStatus, 'Salvataggio ordine gruppi…');
    try {
      for (const item of shiftOrders) {
        await api(API, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'reorder-requirements',
            shiftId: item.shiftId,
            requirementIds: item.requirementIds
          })
        });
      }
      if (groupOrderChanged) {
        await api(API, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'reorder-activity-groups',
            groupIds: nextGroups
          })
        });
      }
      await loadSnapshot();
      setStatus(assignmentBoardStatus, 'Ordine gruppi aggiornato.', 'success');
    } catch (error) {
      setStatus(assignmentBoardStatus, error.message, 'error');
    } finally {
      assignmentBoard?.classList.remove('is-saving');
    }
  }

  async function setBoardActivityGroup(activityId, groupId) {
    const activity = (snapshot?.activityCatalog || []).find((item) => item.id === activityId);
    if (!activity) {
      setStatus(assignmentBoardStatus, 'Attività non più disponibile. Aggiorna la pagina.', 'error');
      return false;
    }
    if ((activity.group_id || '') === (groupId || '')) return true;

    const targetName = groupId ? (activityGroupById(groupId)?.name || 'gruppo') : 'Senza gruppo';
    assignmentBoard?.classList.add('is-saving');
    setStatus(assignmentBoardStatus, `Spostamento di ${prettifyActivityName(activity.name)} in ${targetName}…`);
    try {
      await api(API, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'set-activity-group',
          activityId,
          groupId: groupId || null
        })
      });
      await loadSnapshot();
      setStatus(assignmentBoardStatus, `${prettifyActivityName(activity.name)} spostata in ${targetName}.`, 'success');
      return true;
    } catch (error) {
      setStatus(assignmentBoardStatus, error.message, 'error');
      return false;
    } finally {
      assignmentBoard?.classList.remove('is-saving');
    }
  }

  async function moveBoardActivity(drag, targetGroupId, targetRequirementId = '', placeAfter = false, canDropAtEnd = false) {
    if (!drag?.id || !drag.activityId) return;
    const groupChanged = (targetGroupId || '') !== (drag.sourceGroupId || '');

    if (groupChanged) {
      const moved = await setBoardActivityGroup(drag.activityId, targetGroupId || '');
      if (!moved) return;
    }

    if (targetRequirementId === drag.id) return;
    if (!targetRequirementId && !canDropAtEnd) return;
    await reorderBoardRequirement(drag.id, targetRequirementId || '', placeAfter);
  }

  function shiftRequirementIds(shiftId) {
    return requirements()
      .filter((row) => row.shiftId === shiftId)
      .sort((a, b) =>
        Number(a.displayOrder || 0) - Number(b.displayOrder || 0)
        || String(a.activity || '').localeCompare(String(b.activity || ''), 'it')
      )
      .map((row) => row.id);
  }

  async function reorderBoardRequirement(draggedId, targetRequirementId = '', placeAfter = false) {
    const dragged = requirementById(draggedId);
    if (!dragged) return;

    const ids = boardShiftRequirementIds(dragged.shiftId);
    if (!ids.includes(draggedId)) return;

    const next = ids.filter((id) => id !== draggedId);
    if (targetRequirementId && next.includes(targetRequirementId)) {
      const targetIndex = next.indexOf(targetRequirementId);
      next.splice(targetIndex + (placeAfter ? 1 : 0), 0, draggedId);
    } else {
      next.push(draggedId);
    }

    if (next.every((id, index) => id === ids[index])) return;

    assignmentBoard?.classList.add('is-saving');
    setStatus(assignmentBoardStatus, 'Salvataggio ordine attività…');
    try {
      await api(API, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'reorder-requirements',
          shiftId: dragged.shiftId,
          requirementIds: next
        })
      });
      await loadSnapshot();
      setStatus(assignmentBoardStatus, 'Ordine attività aggiornato.', 'success');
    } catch (error) {
      setStatus(assignmentBoardStatus, error.message, 'error');
    } finally {
      assignmentBoard?.classList.remove('is-saving');
    }
  }

  function clearBoardReorderMarkers() {
    assignmentBoard?.querySelectorAll('.is-reorder-before, .is-reorder-after, .is-reorder-end').forEach((node) => {
      node.classList.remove('is-reorder-before', 'is-reorder-after', 'is-reorder-end');
    });
  }

  function boardPairAssignmentIds(requirementId) {
    const requirement = requirementById(requirementId);
    if (!requirement) return [];
    return (snapshot?.assignments || [])
      .filter((row) => row.shiftId === requirement.shiftId && row.activityId === requirement.activityId)
      .sort((a, b) =>
        Number(a.displayOrder || 0) - Number(b.displayOrder || 0)
        || String(a.personName || '').localeCompare(String(b.personName || ''), 'it')
      )
      .map((row) => row.id);
  }

  async function reorderBoardAssignment(draggedId, requirementId, targetAssignmentId = '', placeAfter = false) {
    const requirement = requirementById(requirementId);
    if (!requirement) return;

    const ids = boardPairAssignmentIds(requirementId);
    if (!ids.includes(draggedId)) return;

    const next = ids.filter((id) => id !== draggedId);
    if (targetAssignmentId && next.includes(targetAssignmentId)) {
      const targetIndex = next.indexOf(targetAssignmentId);
      next.splice(targetIndex + (placeAfter ? 1 : 0), 0, draggedId);
    } else {
      next.push(draggedId);
    }

    if (next.every((id, index) => id === ids[index])) return;

    assignmentBoard?.classList.add('is-saving');
    setStatus(assignmentBoardStatus, 'Salvataggio nuovo ordine…');
    try {
      await api(API, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'reorder-assignments',
          shiftId: requirement.shiftId,
          activityId: requirement.activityId,
          assignmentIds: next
        })
      });
      await loadSnapshot();
      setStatus(assignmentBoardStatus, 'Ordine aggiornato.', 'success');
    } catch (error) {
      setStatus(assignmentBoardStatus, error.message, 'error');
    } finally {
      assignmentBoard?.classList.remove('is-saving');
    }
  }

  function boardCanDrop(dragged, targetRequirementId) {
    if (!dragged) return false;
    const requirement = requirementById(targetRequirementId);
    if (!requirement) return false;
    if (dragged.kind !== 'availability') return true;
    const availability = unassignedAvailabilityRows().find((row) => row.id === dragged.id);
    return Boolean(availability && availability.shiftId === requirement.shiftId);
  }

  function filteredBoardRequirements() {
    const selectedPeople = selectedFilterValues(assignmentPersonFilter);
    const selectedShifts = selectedFilterValues(assignmentShiftFilter);
    const selectedActivities = selectedFilterValues(assignmentActivityFilter);
    const coverageFilters = selectedFilterValues(assignmentCoverageFilter);
    const matchingAssignments = selectedPeople.length
      ? filteredBoardAssignmentRows().filter((row) => !row.isAvailability)
      : [];

    return requirements().filter((requirement) => {
      const shiftKey = `${requirement.day || ''}|||${requirement.shift || ''}`;
      if (selectedShifts.length && !selectedShifts.includes(shiftKey)) return false;
      if (selectedActivities.length && !selectedActivities.includes(prettifyActivityName(requirement.activity))) return false;
      if (selectedPeople.length && !matchingAssignments.some((row) =>
        row.shiftId === requirement.shiftId && row.activityId === requirement.activityId
      )) return false;
      if (coverageFilters.length) {
        const uncovered = requirementIsUncovered(requirement);
        if (!coverageFilters.some((value) =>
          (value === 'uncovered' && uncovered) || (value === 'covered' && !uncovered)
        )) return false;
      }
      return true;
    });
  }

  function renderAssignmentBoard() {
    if (!assignmentBoard) return;
    const rows = filteredBoardAssignmentRows();
    const visibleRequirements = filteredBoardRequirements();
    const visibleShiftIds = new Set(visibleRequirements.map((row) => row.shiftId));
    const shifts = [...(snapshot?.shifts || [])]
      .filter((shift) => visibleShiftIds.has(shift.id))
      .sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999));

    const groups = activityGroups().map((group) => ({
      id: group.id,
      name: group.name,
      displayOrder: Number(group.display_order ?? group.displayOrder ?? 0)
    }));

    const renderActivityBox = (requirement) => {
      const people = rows.filter((row) =>
        !row.isAvailability
        && row.shiftId === requirement.shiftId
        && row.activityId === requirement.activityId
      ).sort((a, b) =>
        Number(a.displayOrder || 0) - Number(b.displayOrder || 0)
        || String(a.personName || '').localeCompare(String(b.personName || ''), 'it')
      );
      const uncovered = requirementIsUncovered(requirement);
      const missing = Math.max(0, Number(requirement.requiredCount || 0) - Number(requirement.assignedCount || 0));

      return `
        <section class="assignment-board__activity ${uncovered ? 'is-uncovered' : 'is-covered'}"
          data-board-drop
          data-board-requirement-id="${escapeHtml(requirement.id)}"
          data-board-activity-id="${escapeHtml(requirement.activityId || '')}"
          data-board-group-id="${escapeHtml(requirement.activityGroupId || '')}">
          <header class="assignment-board__activity-head">
            <span class="assignment-board__activity-drag-handle"
              data-board-activity-drag-handle
              data-board-requirement-id="${escapeHtml(requirement.id)}"
              title="Trascina per riordinare o spostare l’attività in un altro gruppo"
              aria-label="Trascina per riordinare o spostare l’attività in un altro gruppo">⋮⋮</span>
            <strong>${escapeHtml(prettifyActivityName(requirement.activity))}</strong>
            <span class="assignment-board__activity-actions">
              <span class="assignment-board__activity-count ${uncovered ? 'is-uncovered' : ''}" title="Assegnati / previsti">${requirement.assignedCount}/${requirement.requiredCount}</span>
              <button type="button"
                class="assignment-board__copy-from"
                data-board-copy-from
                data-board-requirement-id="${escapeHtml(requirement.id)}"
                aria-label="Copia persone da un’altra coppia turno-attività"
                title="Copia persone da un’altra coppia turno-attività">Copia da</button>
              <button type="button"
                class="assignment-board__add-person"
                data-board-add-person
                data-board-requirement-id="${escapeHtml(requirement.id)}"
                aria-label="Aggiungi persona a ${escapeHtml(prettifyActivityName(requirement.activity))}"
                title="Aggiungi persona">＋</button>
            </span>
          </header>
          ${uncovered ? `<div class="assignment-board__coverage-warning">Mancano ${missing} ${missing === 1 ? 'persona' : 'persone'}</div>` : ''}
          <div class="assignment-board__people">
            ${people.length ? people.map(boardPersonCard).join('') : '<span class="assignment-board__drop-hint">Nessuna persona assegnata</span>'}
          </div>
        </section>`;
    };

    const columns = shifts.map((shift) => {
      const shiftRequirements = visibleRequirements
        .filter((item) => item.shiftId === shift.id)
        .sort((a, b) =>
          Number(a.displayOrder || 0) - Number(b.displayOrder || 0)
          || String(a.activity || '').localeCompare(String(b.activity || ''), 'it')
        );
      const availability = rows.filter((row) => row.isAvailability && row.shiftId === shift.id);

      const blocks = boardShiftBlocks(shiftRequirements);
      const renderPositionTarget = (targetRequirementId = '', placeAfter = false, dropAtEnd = false) => `
        <div class="assignment-board__position-drop-target"
          data-board-position-target
          data-board-target-requirement-id="${escapeHtml(targetRequirementId)}"
          data-board-place-after="${placeAfter ? 'true' : 'false'}"
          data-board-drop-at-end="${dropAtEnd ? 'true' : 'false'}">
          <span>Rilascia qui per posizionare l’attività</span>
        </div>`;

      const renderGroupBlock = (block) => {
        const group = block.group;
        const groupRequirements = block.requirements;
        const collapsed = boardGroupCollapsed(shift.id, group.id);
        const groupKey = boardGroupKey(shift.id, group.id);
        return `
          <section class="assignment-board__activity-group ${collapsed ? 'is-collapsed' : ''}"
            data-board-activity-group
            data-board-group-id="${escapeHtml(group.id)}"
            data-board-group-key="${escapeHtml(groupKey)}"
            data-board-shift-id="${escapeHtml(shift.id)}">
            <header class="assignment-board__activity-group-head">
              <span class="assignment-board__group-drag-handle"
                draggable="true"
                data-board-group-drag-handle
                data-board-group-id="${escapeHtml(group.id)}"
                title="Trascina per spostare il gruppo in alto o in basso"
                aria-label="Trascina per spostare il gruppo in alto o in basso">⋮⋮</span>
              <button type="button"
                class="assignment-board__group-toggle"
                data-board-group-toggle="${escapeHtml(groupKey)}"
                aria-expanded="${collapsed ? 'false' : 'true'}"
                title="${collapsed ? 'Espandi gruppo' : 'Comprimi gruppo'}">
                <span class="assignment-board__group-chevron" aria-hidden="true">${collapsed ? '▸' : '▾'}</span>
                <strong>${escapeHtml(group.name)}</strong>
              </button>
              <span class="assignment-board__group-count">${groupRequirements.length}</span>
            </header>
            <div class="assignment-board__group-body"
              data-board-group-body
              data-board-activity-container
              data-board-group-id="${escapeHtml(group.id)}"
              ${collapsed ? 'hidden' : ''}>
              ${groupRequirements.map(renderActivityBox).join('')}
            </div>
          </section>`;
      };

      const mixedHtml = blocks.map((block) => {
        const ids = boardBlockRequirementIds(block);
        const beforeTarget = renderPositionTarget(ids[0] || '', false, false);
        const content = block.type === 'group'
          ? renderGroupBlock(block)
          : renderActivityBox(block.requirement);
        return `${beforeTarget}${content}`;
      }).join('') + renderPositionTarget(
        blocks.length ? boardBlockRequirementIds(blocks[blocks.length - 1]).slice(-1)[0] || '' : '',
        true,
        true
      );

      const groupDropPalette = `
        <div class="assignment-board__group-drop-palette" data-board-group-drop-palette>
          <span class="assignment-board__group-drop-label">Sposta nel gruppo:</span>
          ${groups.map((group) => `
            <div class="assignment-board__group-drop-target"
              data-board-group-drop-target
              data-board-group-id="${escapeHtml(group.id)}">${escapeHtml(group.name)}</div>`
          ).join('')}
          <div class="assignment-board__group-drop-target assignment-board__group-drop-target--ungrouped"
            data-board-group-drop-target
            data-board-group-id="">Senza gruppo</div>
        </div>`;

      return `
        <article class="assignment-board__column" data-board-shift-column="${escapeHtml(shift.id)}">
          <header class="assignment-board__header">
            <strong>${escapeHtml(shift.day_label)}</strong>
            <span>${escapeHtml(shift.shift_label)}</span>
          </header>
          <div class="assignment-board__activities">
            ${groupDropPalette}
            ${mixedHtml}
          </div>
          <section class="assignment-board__availability">
            <header><strong>Disponibili da assegnare</strong><span>${availability.length}</span></header>
            <div class="assignment-board__availability-people">
              ${availability.length ? availability.map(boardPersonCard).join('') : '<span class="assignment-board__availability-empty">Nessuna disponibilità libera</span>'}
            </div>
          </section>
        </article>`;
    }).join('');

    assignmentBoard.innerHTML = `
      <div class="assignment-board__help">
        <strong>Gestione a schede</strong>
        <span>Ogni turno mostra solo le attività realmente previste. I gruppi si comprimono indipendentemente per turno; trascina un’attività su un altro gruppo per riclassificarla in tutti i turni.</span>
      </div>
      <div class="assignment-board">${columns || '<p class="empty-state">Nessuna attività prevista corrisponde ai filtri.</p>'}</div>`;
  }

  function copySourceRequirements(targetRequirement) {
    if (!targetRequirement) return [];

    const assignmentCountByPair = new Map();
    for (const row of (snapshot?.assignments || [])) {
      if (!row.shiftId || !row.activityId) continue;
      const key = `${row.shiftId}|${row.activityId}`;
      assignmentCountByPair.set(key, (assignmentCountByPair.get(key) || 0) + 1);
    }

    return requirements()
      .filter((item) => item.id !== targetRequirement.id)
      .map((item) => ({
        ...item,
        sourceAssignedCount: assignmentCountByPair.get(`${item.shiftId}|${item.activityId}`) || 0
      }))
      .filter((item) => item.sourceAssignedCount > 0)
      .sort((a, b) =>
        (a.shiftSortOrder ?? 9999) - (b.shiftSortOrder ?? 9999)
        || Number(a.displayOrder || 0) - Number(b.displayOrder || 0)
        || String(a.activity || '').localeCompare(String(b.activity || ''), 'it')
      );
  }

  function copySourceRequirementOptions(targetRequirement, selectedSourceId = '') {
    const sources = copySourceRequirements(targetRequirement);
    return '<option value="">Seleziona turno e attività…</option>' + sources.map((item) =>
      `<option value="${escapeHtml(item.id)}" ${item.id === selectedSourceId ? 'selected' : ''}>${escapeHtml(item.day)} · ${escapeHtml(item.shift)} — ${escapeHtml(prettifyActivityName(item.activity))} · ${item.sourceAssignedCount} ${item.sourceAssignedCount === 1 ? 'persona' : 'persone'}</option>`
    ).join('');
  }

  function copySourcePeople(targetRequirement, sourceRequirement) {
    if (!targetRequirement || !sourceRequirement) return [];

    const targetPeople = new Set(
      (snapshot?.assignments || [])
        .filter((row) => row.shiftId === targetRequirement.shiftId && row.activityId === targetRequirement.activityId)
        .map((row) => row.personId)
    );

    return (snapshot?.assignments || [])
      .filter((row) => row.shiftId === sourceRequirement.shiftId && row.activityId === sourceRequirement.activityId)
      .sort((a, b) =>
        Number(a.displayOrder || 0) - Number(b.displayOrder || 0)
        || String(a.personName || '').localeCompare(String(b.personName || ''), 'it')
      )
      .map((row) => {
        const warnings = assignmentWarningDetails({
          id: null,
          personId: row.personId,
          shiftId: targetRequirement.shiftId,
          day: targetRequirement.day,
          shift: targetRequirement.shift
        });
        return {
          row,
          alreadyAssigned: targetPeople.has(row.personId),
          warnings
        };
      });
  }

  function renderCopyFromDialog(targetRequirement, selectedSourceId = '') {
    const sources = copySourceRequirements(targetRequirement);

    if (!selectedSourceId) {
      selectedSourceId = sources.find((item) => item.activityId === targetRequirement.activityId)?.id
        || sources[0]?.id
        || '';
    }

    const sourceRequirement = sources.find((item) => item.id === selectedSourceId) || null;
    const people = copySourcePeople(targetRequirement, sourceRequirement);
    const selectable = people.filter((item) => !item.alreadyAssigned);
    const availableCount = new Set(selectable.map((item) => item.row.personId)).size;

    detailTitle.textContent = `Copia persone · ${prettifyActivityName(targetRequirement.activity)}`;

    if (!sources.length) {
      detailContent.innerHTML = `
        <p class="intro detail-intro">Destinazione: <strong>${escapeHtml(targetRequirement.day)} · ${escapeHtml(targetRequirement.shift)} — ${escapeHtml(prettifyActivityName(targetRequirement.activity))}</strong>.</p>
        <p class="empty-state">Non ci sono altre coppie turno-attività con persone assegnate da cui copiare.</p>`;
      return;
    }

    detailContent.innerHTML = `
      <div class="copy-from-dialog">
        <p class="intro detail-intro">
          Destinazione: <strong>${escapeHtml(targetRequirement.day)} · ${escapeHtml(targetRequirement.shift)} — ${escapeHtml(prettifyActivityName(targetRequirement.activity))}</strong>.
        </p>

        <label class="field copy-from-source-field">
          <span>Copia da turno-attività</span>
          <select data-copy-source-requirement-select>
            ${copySourceRequirementOptions(targetRequirement, sourceRequirement?.id || '')}
          </select>
        </label>

        ${sourceRequirement ? `
          <section class="copy-from-group">
            <header class="copy-from-group__header">
              <div>
                <strong>${escapeHtml(sourceRequirement.day)} · ${escapeHtml(sourceRequirement.shift)}</strong>
                <span>${escapeHtml(prettifyActivityName(sourceRequirement.activity))} · ${people.length} ${people.length === 1 ? 'persona' : 'persone'}</span>
              </div>
              ${selectable.length ? `<label class="copy-from-select-all"><input type="checkbox" data-copy-source-all="${escapeHtml(sourceRequirement.id)}"> <span>Tutti</span></label>` : ''}
            </header>
            <div class="copy-from-people">
              ${people.map(({ row, alreadyAssigned, warnings }) => {
                const warningText = warnings.map((warning) => warning.text).join(' · ');
                return `
                  <label class="copy-from-person ${alreadyAssigned ? 'is-already-assigned' : ''}">
                    <input type="checkbox"
                      data-copy-person
                      data-copy-source-requirement="${escapeHtml(sourceRequirement.id)}"
                      value="${escapeHtml(row.personId)}"
                      ${alreadyAssigned ? 'disabled' : ''}>
                    <span class="copy-from-person__name">${escapeHtml(row.personName)}</span>
                    ${warnings.length ? `<span class="copy-from-person__warning" title="${escapeHtml(warningText)}">⚠ ${escapeHtml(warningText)}</span>` : ''}
                    ${alreadyAssigned ? '<span class="copy-from-person__already">Già assegnato</span>' : ''}
                  </label>`;
              }).join('')}
            </div>
          </section>
        ` : '<p class="empty-state">Seleziona una coppia turno-attività da cui copiare.</p>'}

        <p class="status" data-copy-from-status aria-live="polite"></p>
        <div class="copy-from-actions">
          <span data-copy-from-count>0 selezionati</span>
          <button class="button button--primary" type="button" data-copy-from-save ${availableCount ? '' : 'disabled'}>Copia selezionati</button>
        </div>
      </div>`;
  }


  function refreshCopyFromCount() {
    const selected = new Set(
      [...(detailContent?.querySelectorAll('[data-copy-person]:checked') || [])]
        .map((input) => input.value)
        .filter(Boolean)
    );
    const countNode = detailContent?.querySelector('[data-copy-from-count]');
    const save = detailContent?.querySelector('[data-copy-from-save]');
    if (countNode) countNode.textContent = `${selected.size} ${selected.size === 1 ? 'selezionato' : 'selezionati'}`;
    if (save) save.disabled = selected.size === 0;
  }

  function showCopyFromRequirement(requirementId) {
    const targetRequirement = requirementById(requirementId);
    if (!targetRequirement || !detailDialog) return;
    copyRequirementContext = requirementId;
    detailTargetRow = null;
    renderCopyFromDialog(targetRequirement);
    detailDialog.showModal();
  }

  async function copyPeopleToRequirement(button) {
    const targetRequirement = requirementById(copyRequirementContext);
    const statusNode = detailContent?.querySelector('[data-copy-from-status]');
    if (!targetRequirement) {
      setStatus(statusNode, 'Attività di destinazione non più disponibile.', 'error');
      return;
    }

    const selectedPersonIds = [...new Set(
      [...(detailContent?.querySelectorAll('[data-copy-person]:checked') || [])]
        .map((input) => input.value)
        .filter(Boolean)
    )];

    if (!selectedPersonIds.length) {
      setStatus(statusNode, 'Seleziona almeno una persona.', 'error');
      return;
    }

    await withButtonBusy(button, 'Copiando…', async () => {
      let copied = 0;
      const errors = [];

      for (const personId of selectedPersonIds) {
        const person = (snapshot?.people || []).find((item) => item.id === personId);
        try {
          await api(API, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              action: 'save-assignment',
              assignmentId: null,
              personId,
              requirementId: targetRequirement.id,
              requestedProfile: null,
              note: null
            })
          });
          copied += 1;
        } catch (error) {
          errors.push(`${person?.display_name || 'Persona'}: ${error.message}`);
        }
      }

      await loadSnapshot();

      if (!errors.length) {
        detailDialog.close();
        setStatus(assignmentBoardStatus, `${copied} ${copied === 1 ? 'persona copiata' : 'persone copiate'} in ${prettifyActivityName(targetRequirement.activity)} · ${targetRequirement.day} ${targetRequirement.shift}.`, 'success');
        return;
      }

      const sourceRequirementId = detailContent?.querySelector('[data-copy-source-requirement-select]')?.value || '';
      copyRequirementContext = targetRequirement.id;
      renderCopyFromDialog(requirementById(targetRequirement.id) || targetRequirement, sourceRequirementId);
      const refreshedStatus = detailContent?.querySelector('[data-copy-from-status]');
      setStatus(
        refreshedStatus,
        `${copied} copiate. ${errors.length} non copiate: ${errors.join(' · ')}`,
        copied ? 'error' : 'error'
      );
    });
  }

  function setAssignmentView(nextView, { render = true } = {}) {
    assignmentView = nextView === 'board' ? 'board' : 'list';
    try { sessionStorage.setItem('coastal2026-admin-assignment-view', assignmentView); } catch {}

    const isBoard = assignmentView === 'board';
    if (assignmentViewToggle) {
      assignmentViewToggle.textContent = isBoard ? 'Vista elenco' : 'Vista schede';
      assignmentViewToggle.setAttribute('aria-pressed', isBoard ? 'true' : 'false');
      assignmentViewToggle.classList.toggle('is-active', isBoard);
    }
    assignmentListOnlyFields.forEach((field) => { field.hidden = isBoard; });
    if (assignmentTable) assignmentTable.hidden = isBoard;
    if (assignmentBoard) assignmentBoard.hidden = !isBoard;
    if (assignmentBoardStatus) assignmentBoardStatus.hidden = !isBoard;
    if (render) renderAssignments();
  }

  async function moveBoardItem(dragged, targetRequirementId) {
    const requirement = requirementById(targetRequirementId);
    if (!dragged || !requirement) return;

    let current = null;
    let personId = '';
    let assignmentId = null;
    let sourceName = '';

    if (dragged.kind === 'assignment') {
      current = (snapshot?.assignments || []).find((row) => row.id === dragged.id);
      if (!current) {
        setStatus(assignmentBoardStatus, 'Assegnazione non più disponibile. Aggiorna la pagina.', 'error');
        return;
      }
      personId = current.personId;
      assignmentId = current.id;
      sourceName = current.personName;
      if (assignmentRequirementId(current) === requirement.id) {
        setStatus(assignmentBoardStatus, 'Il nominativo è già in questa attività e turno.');
        return;
      }
    } else {
      const availability = unassignedAvailabilityRows().find((row) => row.id === dragged.id);
      if (!availability) {
        setStatus(assignmentBoardStatus, 'Disponibilità non più presente. Aggiorna la pagina.', 'error');
        return;
      }
      if (availability.shiftId !== requirement.shiftId) {
        setStatus(assignmentBoardStatus, 'La disponibilità può essere assegnata solo nel turno indicato dal volontario.', 'error');
        return;
      }
      personId = availability.personId;
      sourceName = availability.personName;
    }

    setStatus(assignmentBoardStatus, `Salvataggio spostamento di ${sourceName}…`);
    assignmentBoard?.classList.add('is-saving');
    try {
      await api(API, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'save-assignment',
          assignmentId,
          personId,
          requirementId: requirement.id,
          requestedProfile: current?.requestedProfile || null,
          note: current?.note || null
        })
      });
      await loadSnapshot();
      setStatus(assignmentBoardStatus, `${sourceName} spostato e salvato.`, 'success');
    } catch (error) {
      setStatus(assignmentBoardStatus, error.message, 'error');
    } finally {
      assignmentBoard?.classList.remove('is-saving');
    }
  }

  async function updateBoardResponsible(assignmentId, isResponsible, button, statusNode = assignmentBoardStatus) {
    const row = (snapshot?.assignments || []).find((item) => item.id === assignmentId);
    if (!row) return false;
    if (!snapshot?.responsibilityAvailable) {
      setStatus(statusNode, 'La funzione responsabile non è disponibile.', 'error');
      return false;
    }

    const restore = setButtonBusy(button, isResponsible ? 'Impostazione…' : 'Rimozione…');
    setStatus(statusNode, isResponsible
      ? `Impostazione di ${row.personName} come responsabile…`
      : `Rimozione di ${row.personName} come responsabile…`);
    try {
      await api(API, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'set-assignment-responsible',
          assignmentId: row.id,
          isResponsible
        })
      });
      await loadSnapshot();
      setStatus(statusNode, isResponsible
        ? `${row.personName} impostato come responsabile.`
        : `Responsabile rimosso per ${displayActivity(row)}.`, 'success');
      return true;
    } catch (error) {
      setStatus(statusNode, error.message, 'error');
      return false;
    } finally {
      restore();
    }
  }

  function boardEditSource() {
    if (!boardEditContext) return null;
    if (boardEditContext.kind === 'assignment') {
      return (snapshot?.assignments || []).find((row) => row.id === boardEditContext.id) || null;
    }
    if (boardEditContext.kind === 'availability') {
      return unassignedAvailabilityRows().find((row) => row.id === boardEditContext.id) || null;
    }
    if (boardEditContext.kind === 'new') {
      const requirement = requirementById(boardEditContext.requirementId);
      if (!requirement) return null;
      return {
        id: null,
        personId: '',
        personName: '',
        shiftId: requirement.shiftId,
        day: requirement.day,
        shift: requirement.shift,
        shiftMatched: true,
        activityId: requirement.activityId,
        activity: requirement.activity,
        role: '',
        requestedProfile: '',
        note: '',
        currentResponse: null,
        isResponsible: false,
        requirementId: requirement.id
      };
    }
    return null;
  }

  function boardEditCandidate() {
    const source = boardEditSource();
    if (!source || !boardEditContent) return null;
    const personId = boardEditContent.querySelector('[data-board-edit-person]')?.value || source.personId || '';
    const requirementId = boardEditContent.querySelector('[data-board-edit-requirement]')?.value || assignmentRequirementId(source) || source.requirementId || '';
    const requirement = requirementById(requirementId);
    return {
      id: boardEditContext?.kind === 'assignment' ? source.id : null,
      personId,
      shiftId: requirement?.shiftId || source.shiftId || null,
      day: requirement?.day || source.day || '',
      shift: requirement?.shift || source.shift || ''
    };
  }

  function refreshBoardEditWarnings() {
    const node = boardEditContent?.querySelector('[data-board-edit-warnings]');
    if (!node) return;
    const candidate = boardEditCandidate();
    node.innerHTML = candidate ? warningHtml(assignmentWarningDetails(candidate)) : '<span class="warning-none">—</span>';
  }
  function refreshBoardEditPersonActivities() {
    const node = boardEditContent?.querySelector('[data-board-edit-person-activities]');
    if (!node) return;

    const personId = boardEditContent?.querySelector('[data-board-edit-person]')?.value || '';
    if (!personId) {
      node.innerHTML = '<span class="board-edit-person-activities__empty">Seleziona una persona per vedere le altre attività assegnate.</span>';
      return;
    }

    const currentAssignmentId = boardEditContext?.kind === 'assignment' ? boardEditContext.id : '';
    const rows = (snapshot?.assignments || [])
      .filter((row) => row.personId === personId && row.id !== currentAssignmentId)
      .sort((a, b) => {
        const reqA = requirementForAssignment(a);
        const reqB = requirementForAssignment(b);
        return (reqA?.shiftSortOrder ?? 9999) - (reqB?.shiftSortOrder ?? 9999)
          || String(a.day || '').localeCompare(String(b.day || ''), 'it')
          || String(a.shift || '').localeCompare(String(b.shift || ''), 'it')
          || displayActivity(a).localeCompare(displayActivity(b), 'it');
      });

    if (!rows.length) {
      node.innerHTML = '<span class="board-edit-person-activities__empty">Nessun’altra attività assegnata.</span>';
      return;
    }

    node.innerHTML = `
      <div class="board-edit-person-activities__list">
        ${rows.map((row) => `
          <div class="board-edit-person-activities__item">
            <div class="board-edit-person-activities__when">
              <strong>${escapeHtml(row.day || '—')}</strong>
              <span>${escapeHtml(row.shift || '—')}</span>
            </div>
            <div class="board-edit-person-activities__what">
              <strong>${escapeHtml(displayActivity(row))}</strong>
              <div class="board-edit-person-activities__meta">
                ${row.isResponsible ? responsibleBadge('Responsabile') : ''}
                ${responseBadge(row.currentResponse)}
              </div>
            </div>
          </div>`).join('')}
      </div>`;
  }


  function openBoardAddPerson(requirementId) {
    boardEditContext = { kind: 'new', requirementId };
    const source = boardEditSource();
    const requirement = requirementById(requirementId);
    if (!source || !requirement || !boardEditDialog) return;

    boardEditTitle.textContent = `Aggiungi persona · ${prettifyActivityName(requirement.activity)}`;
    setStatus(boardEditStatus, '');

    boardEditContent.innerHTML = `
      <div class="board-edit-grid">
        <label class="field"><span>Persona</span>
          <select data-board-edit-person>${personOptions('')}</select>
        </label>
        <label class="field field--wide"><span>Turno + attività</span>
          <select data-board-edit-requirement>${requirementOptions(requirement.id)}</select>
        </label>
        <div class="board-edit-info field--wide">
          <div><span>Copertura</span><strong>${requirement.assignedCount}/${requirement.requiredCount}</strong></div>
          <div><span>Responsabile</span>—</div>
        </div>
        <div class="board-edit-warning field--wide">
          <span>Warning</span>
          <div data-board-edit-warnings><span class="warning-none">—</span></div>
        </div>
        <div class="board-edit-person-activities field--wide">
          <span>Senza gruppo assegnate</span>
          <div data-board-edit-person-activities></div>
        </div>
      </div>`;

    if (boardEditDelete) boardEditDelete.hidden = true;
    if (boardEditHistory) boardEditHistory.hidden = true;
    initSearchablePersonSelect(boardEditContent?.querySelector('[data-board-edit-person]'));
    refreshBoardEditWarnings();
    refreshBoardEditPersonActivities();
    boardEditDialog.showModal();
    window.setTimeout(() => boardEditContent?.querySelector('.person-search-select__input, [data-board-edit-person]')?.focus(), 0);
  }

  function openBoardEdit(kind, id) {
    boardEditContext = { kind, id };
    const source = boardEditSource();
    if (!source || !boardEditDialog) return;

    const isAvailability = kind === 'availability';
    const selectedRequirementId = isAvailability ? '' : assignmentRequirementId(source);
    const response = isAvailability ? '<span class="status-badge is-availability">Disponibilità</span>' : responseBadge(source.currentResponse);
    boardEditTitle.textContent = isAvailability ? `Assegna ${source.personName}` : `Modifica ${source.personName}`;
    setStatus(boardEditStatus, '');

    boardEditContent.innerHTML = `
      <div class="board-edit-grid">
        <label class="field"><span>Persona</span>
          <select data-board-edit-person ${isAvailability ? 'disabled' : ''}>${personOptions(source.personId)}</select>
        </label>
        <label class="field field--wide"><span>Turno + attività</span>
          <select data-board-edit-requirement>${requirementOptions(selectedRequirementId, isAvailability ? source.shiftId : '')}</select>
        </label>
        <div class="board-edit-info field--wide">
          <div><span>Risposta</span>${response}</div>
          <div><span>Responsabile</span>${!isAvailability && source.isResponsible ? responsibleBadge(source.personName) : '—'}</div>
        </div>
        <div class="board-edit-warning field--wide">
          <span>Warning</span>
          <div data-board-edit-warnings></div>
        </div>
        <div class="board-edit-person-activities field--wide">
          <span>Senza gruppo assegnate</span>
          <div data-board-edit-person-activities></div>
        </div>
      </div>`;

    if (boardEditDelete) boardEditDelete.hidden = isAvailability;
    if (boardEditHistory) boardEditHistory.hidden = isAvailability;
    initSearchablePersonSelect(boardEditContent?.querySelector('[data-board-edit-person]'));
    refreshBoardEditWarnings();
    refreshBoardEditPersonActivities();
    boardEditDialog.showModal();
  }

  async function saveBoardEdit() {
    const source = boardEditSource();
    if (!source || !boardEditContent) return;
    const isAvailability = boardEditContext?.kind === 'availability';
    const isNew = boardEditContext?.kind === 'new';
    const personId = boardEditContent.querySelector('[data-board-edit-person]')?.value || '';
    const requirementId = boardEditContent.querySelector('[data-board-edit-requirement]')?.value || '';

    if (!personId || !requirementId) {
      setStatus(boardEditStatus, 'Seleziona persona e coppia turno-attività.', 'error');
      return;
    }

    await withButtonBusy(boardEditSave, 'Salvataggio…', async () => {
      try {
        await api(API, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'save-assignment',
            assignmentId: (isAvailability || isNew) ? null : source.id,
            personId,
            requirementId,
            requestedProfile: (isAvailability || isNew) ? null : (source.requestedProfile || null),
            note: source.note || null
          })
        });
        const selectedPerson = (snapshot?.people || []).find((person) => person.id === personId);
        const personName = selectedPerson?.display_name || source.personName || 'Persona';
        boardEditDialog.close();
        boardEditContext = null;
        await loadSnapshot();
        setStatus(assignmentBoardStatus, `${personName}: assegnazione salvata.`, 'success');
      } catch (error) {
        setStatus(boardEditStatus, error.message, 'error');
      }
    });
  }

  async function deleteBoardAssignment(assignmentId, button) {
    const assignment = (snapshot?.assignments || []).find((row) => row.id === assignmentId);
    if (!assignment) return;
    if (!confirm(`Eliminare l’assegnazione “${displayActivity(assignment)}” di ${assignment.personName}? Verrà rimossa dalla vista operativa, mentre lo storico resterà disponibile.`)) return;

    await withButtonBusy(button, '…', async () => {
      try {
        await api(API, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'deactivate-assignment', assignmentId: assignment.id })
        });
        const personName = assignment.personName;
        await loadSnapshot();
        setStatus(assignmentBoardStatus, `${personName}: assegnazione eliminata.`, 'success');
      } catch (error) {
        setStatus(assignmentBoardStatus, error.message, 'error');
      }
    });
  }

  async function deleteBoardEdit() {
    if (boardEditContext?.kind !== 'assignment') return;
    const source = boardEditSource();
    if (!source) return;
    if (!confirm(`Eliminare l’assegnazione “${displayActivity(source)}” di ${source.personName}? Verrà rimossa dalla vista operativa, mentre lo storico resterà disponibile.`)) return;

    await withButtonBusy(boardEditDelete, 'Eliminazione…', async () => {
      try {
        await api(API, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'deactivate-assignment', assignmentId: source.id })
        });
        const personName = source.personName;
        boardEditDialog.close();
        boardEditContext = null;
        await loadSnapshot();
        setStatus(assignmentBoardStatus, `${personName}: assegnazione eliminata.`, 'success');
      } catch (error) {
        setStatus(boardEditStatus, error.message, 'error');
      }
    });
  }


  function activeAssignmentFilterCount() {
    return [
      assignmentPersonFilter,
      assignmentShiftFilter,
      assignmentActivityFilter,
      assignmentResponseFilter,
      assignmentWarningFilter,
      assignmentCoverageFilter
    ].reduce((total, filter) => total + selectedFilterValues(filter).length, 0);
  }

  function updateAssignmentFiltersToggle() {
    if (!assignmentFiltersToggle) return;
    const count = activeAssignmentFilterCount();
    assignmentFiltersToggle.textContent = count ? `Filtri (${count})` : 'Filtri';
  }

  function renderAssignments() {
    const rows = filteredAssignments();
    const types = selectedFilterValues(assignmentTypeFilter);
    const onlyAvailability = types.length === 1 && types[0] === 'availability';
    const isBoard = assignmentView === 'board';

    if (availabilityFilterStatus) availabilityFilterStatus.hidden = isBoard || !onlyAvailability;
    if (assignmentTable) assignmentTable.hidden = isBoard;
    if (assignmentBoard) assignmentBoard.hidden = !isBoard;
    if (assignmentBoardStatus) assignmentBoardStatus.hidden = !isBoard;
    if (assignmentBoardExportPdf) assignmentBoardExportPdf.hidden = !isBoard;
    updateAssignmentFiltersToggle();
    assignmentListOnlyFields.forEach((field) => { field.hidden = isBoard; });
    if (assignmentViewToggle) {
      assignmentViewToggle.textContent = isBoard ? 'Vista elenco' : 'Vista schede';
      assignmentViewToggle.setAttribute('aria-pressed', isBoard ? 'true' : 'false');
      assignmentViewToggle.classList.toggle('is-active', isBoard);
    }

    if (isBoard) {
      renderAssignmentBoard();
      return;
    }

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

  function assignmentBoardPdfGroups() {
    const rows = filteredBoardAssignmentRows().filter((row) => !row.isAvailability);
    const visibleRequirements = filteredBoardRequirements();
    const visibleShiftIds = new Set(visibleRequirements.map((row) => row.shiftId));
    const shifts = [...(snapshot?.shifts || [])]
      .filter((shift) => visibleShiftIds.has(shift.id))
      .sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999));

    const groups = activityGroups();

    return shifts.map((shift) => {
      const shiftRequirements = visibleRequirements
        .filter((item) => item.shiftId === shift.id)
        .sort((a, b) =>
          Number(a.displayOrder || 0) - Number(b.displayOrder || 0)
          || String(a.activity || '').localeCompare(String(b.activity || ''), 'it')
        );
      const orderedRequirements = [
        ...groups.flatMap((group) =>
          shiftRequirements.filter((item) => (item.activityGroupId || '') === group.id)
        ),
        ...shiftRequirements.filter((item) => !item.activityGroupId)
      ];

      return {
        shiftId: shift.id,
        day: shift.day_label,
        shift: shift.shift_label,
        activities: orderedRequirements.map((requirement) => ({
          activity: prettifyActivityName(requirement.activity),
          groupName: requirement.activityGroupId ? (activityGroupById(requirement.activityGroupId)?.name || '') : '',
          assignedCount: Number(requirement.assignedCount || 0),
          requiredCount: Number(requirement.requiredCount || 0),
          uncovered: requirementIsUncovered(requirement),
          people: rows
            .filter((row) => row.shiftId === requirement.shiftId && row.activityId === requirement.activityId)
            .sort((a, b) =>
              Number(b.isResponsible === true) - Number(a.isResponsible === true)
              || Number(a.displayOrder || 0) - Number(b.displayOrder || 0)
              || String(a.personName || '').localeCompare(String(b.personName || ''), 'it')
            )
            .map((row) => ({
              name: row.personName,
              isResponsible: row.isResponsible === true
            }))
        }))
      };
    });
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

  function exportShiftBoardPdfByDay(groups = shiftBoardGroups(), options = {}) {
    const title = options.title || 'Report volontari - vista per turni';
    const showGroups = options.showGroups === true;
    const singleTurnPerPage = options.singleTurnPerPage === true;
    const pageSize = options.pageSize || 'A3 landscape';
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

    const renderPdfPeople = (item) => item.people.length
      ? item.people.map((person) =>
          `<span class="${person.isResponsible ? 'responsible' : ''}">${escapeHtml(person.name)}</span>`
        ).join('')
      : '<span class="empty-people">Nessuno assegnato</span>';

    const renderPdfActivity = (item) => `
      <section class="activity-block">
        <div class="activity-title-row">
          <strong>${escapeHtml(item.activity)}</strong>
          <span class="staffing-badge ${item.uncovered ? 'is-understaffed' : 'is-covered'}">${item.assignedCount}/${item.requiredCount} assegnati · ${item.uncovered ? 'SOTTO STAFFATA' : 'COPERTA'}</span>
        </div>
        <div class="people-list">${renderPdfPeople(item)}</div>
      </section>`;

    const renderPdfActivities = (activities) => {
      if (!showGroups) return activities.map(renderPdfActivity).join('');

      const groupedActivities = new Map();
      for (const item of activities) {
        const groupName = item.groupName || 'Senza gruppo';
        if (!groupedActivities.has(groupName)) groupedActivities.set(groupName, []);
        groupedActivities.get(groupName).push(item);
      }

      return [...groupedActivities.entries()].map(([groupName, items]) => `
        <section class="pdf-activity-group">
          <h4>${escapeHtml(groupName)}</h4>
          ${items.map(renderPdfActivity).join('')}
        </section>`).join('');
    };

    const renderPdfPage = (day, dayGroups) => `
      <section class="day-page">
        <header class="page-header">
          <div>
            <h1>${escapeHtml(title)}</h1>
            <h2>${escapeHtml(day)}</h2>
          </div>
          <span>Esportato il ${escapeHtml(formatDateTime(new Date().toISOString()))}</span>
        </header>
        ${showGroups ? `<div class="pdf-legend"><span class="responsible legend-sample">Nome persona</span><span>= responsabile</span><span class="staffing-badge is-covered">3/3 assegnati · COPERTA</span><span class="staffing-badge is-understaffed">2/3 assegnati · SOTTO STAFFATA</span></div>` : ''}
        <div class="turn-grid" style="grid-template-columns:repeat(${dayGroups.length},minmax(0,1fr))">
          ${dayGroups.map((group) => `
            <article class="turn-column">
              <h3>${escapeHtml(group.shift)}</h3>
              ${renderPdfActivities(group.activities)}
            </article>`).join('')}
        </div>
      </section>`;

    const pages = singleTurnPerPage
      ? groups.map((group) => renderPdfPage(group.day, [group])).join('')
      : [...byDay.entries()].map(([day, dayGroups]) => renderPdfPage(day, dayGroups)).join('');

    popup.document.write(`<!doctype html><html lang="it"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
      @page { size: ${pageSize}; margin: 8mm; }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; font-family: Arial, sans-serif; color: #173e4b; }
      .day-page { break-after: page; page-break-after: always; width: 100%; }
      .day-page:last-child { break-after: auto; page-break-after: auto; }
      .page-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin: 0 0 10px; }
      h1 { margin: 0; font-size: ${showGroups ? '17pt' : '14px'}; }
      h2 { margin: 2px 0 0; font-size: ${showGroups ? '15pt' : '18px'}; }
      .page-header span { font-size: ${showGroups ? '11pt' : '6.5px'}; color: #60757d; white-space: nowrap; }
      .turn-grid { display: grid; gap: 8px; align-items: start; width: 100%; }
      .turn-column { border: 1px solid #cfdcdf; border-radius: 7px; overflow: hidden; min-width: 0; }
      .turn-column h3 { margin: 0; padding: 7px 8px; background: #eaf2f4; font-size: ${showGroups ? '14pt' : '9px'}; border-bottom: 1px solid #cfdcdf; }
      .pdf-activity-group { margin: 0; padding: 0; border-bottom: 2px solid #c3d2d5; break-inside: avoid; page-break-inside: avoid; }
      .pdf-activity-group:last-child { border-bottom: 0; }
      .pdf-legend { display: flex; align-items: center; gap: 6px 10px; flex-wrap: wrap; margin: 0 0 9px; padding: 6px 8px; border: 1px solid #d6e1e3; border-radius: 6px; background: #f8fbfb; font-size: ${showGroups ? '11pt' : '7px'}; }
      .legend-sample { white-space: nowrap; }
      .pdf-activity-group h4 { margin: 0; padding: 6px 8px; background: #dce7e9; color: #24464e; font-size: ${showGroups ? '12pt' : '10.5px'}; line-height: 1.2; text-transform: uppercase; letter-spacing: .025em; }
      .activity-block { padding: ${showGroups ? '7px 8px' : '5px 6px'}; border-bottom: 1px solid #e2eaec; break-inside: avoid; page-break-inside: avoid; }
      .activity-block:last-child { border-bottom: 0; }
      .activity-title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 4px; }
      .activity-title-row > strong { min-width: 0; font-size: ${showGroups ? '12pt' : '7px'}; line-height: 1.25; }
      .staffing-badge { display: inline-block; flex: 0 0 auto; padding: 2px 5px; border: 1px solid; border-radius: 4px; font-size: ${showGroups ? '11pt' : '6.2px'}; font-weight: 800; white-space: nowrap; }
      .staffing-badge.is-covered { border-color: #87b99a; background: #e9f6ed; color: #255f38; }
      .staffing-badge.is-understaffed { border-color: #df9d96; background: #fdeceb; color: #8d3028; }
      .people-list { font-size: ${showGroups ? '11pt' : '6.2px'}; line-height: 1.45; }
      .people-list span { display: inline; }
      .people-list span + span::before { content: "; "; color: #60757d; font-weight: 400; }
      .people-list .responsible, .pdf-legend .responsible { display: inline-block; margin: 1px 0; padding: 1px 4px; border: 1px solid #d0aa35; border-radius: 4px; background: #fff1b8; color: #5b4300; font-weight: 800; }
      .empty-people { color: #7b8a8e; font-style: italic; }
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

  function personCatalogRows() {
    const q = normalizeFilterSearch(personCatalogSearch?.value || '');
    return [...(snapshot?.people || [])]
      .filter((person) => person.active !== false)
      .filter((person) => {
        if (!q) return true;
        return normalizeFilterSearch(
          `${person.person_code || ''} ${person.surname || ''} ${person.given_name || ''} ${person.display_name || ''}`
        ).includes(q);
      })
      .sort((a, b) =>
        String(a.surname || a.display_name || '').localeCompare(String(b.surname || b.display_name || ''), 'it')
        || String(a.given_name || '').localeCompare(String(b.given_name || ''), 'it')
        || String(a.display_name || '').localeCompare(String(b.display_name || ''), 'it')
      );
  }

  function personCatalogRowHtml(person = null, isNew = false) {
    return `
      <tr class="${isNew ? 'is-new-row' : ''}" data-person-catalog-row data-person-id="${escapeHtml(person?.id || '')}">
        <td><input class="code-input" data-person-code maxlength="40" value="${escapeHtml(person?.person_code || '')}" placeholder="Codice"></td>
        <td><input class="name-input" data-person-surname maxlength="100" value="${escapeHtml(person?.surname || '')}" placeholder="Cognome"></td>
        <td><input class="name-input" data-person-given-name maxlength="100" value="${escapeHtml(person?.given_name || '')}" placeholder="Nome"></td>
        <td><input class="name-input" data-person-display-name maxlength="160" value="${escapeHtml(person?.display_name || '')}" placeholder="Nominativo visualizzato"></td>
        <td><label class="catalog-check"><input type="checkbox" data-person-selectable ${person?.selectable !== false ? 'checked' : ''}><span>Sì</span></label></td>
        <td><span class="source-badge">${escapeHtml(person?.source_type || (isNew ? 'manual' : '—'))}</span></td>
        <td>
          <div class="row-actions">
            <button type="button" data-save-person>Salva</button>
            ${isNew
              ? '<button type="button" data-cancel-new-person>Annulla</button>'
              : '<button class="is-danger" type="button" data-delete-person>Elimina</button>'}
          </div>
          <small class="row-save-status" data-row-status></small>
        </td>
      </tr>`;
  }

  function renderPersonCatalog() {
    if (!personCatalog) return;
    const rows = personCatalogRows();
    const body = [
      ...(newPersonOpen ? [personCatalogRowHtml(null, true)] : []),
      ...rows.map((person) => personCatalogRowHtml(person, false))
    ].join('');

    personCatalog.innerHTML = body
      ? `<table class="admin-table person-catalog-table">
          <thead><tr><th>Codice</th><th>Cognome</th><th>Nome</th><th>Nominativo</th><th>Selezionabile</th><th>Origine</th><th>Azioni</th></tr></thead>
          <tbody>${body}</tbody>
        </table>`
      : '<p class="empty-state">Nessuna persona attiva.</p>';
  }

  function renderActivityGroupCatalog() {
    if (!activityGroupCatalog) return;
    const groups = activityGroups();
    const activityCountByGroup = new Map();
    for (const activity of (snapshot?.activityCatalog || []).filter((item) => item.active)) {
      if (!activity.group_id) continue;
      activityCountByGroup.set(activity.group_id, (activityCountByGroup.get(activity.group_id) || 0) + 1);
    }

    const body = [
      ...(newActivityGroupOpen ? [`
        <tr class="is-new-row" data-activity-group-row data-activity-group-id="">
          <td><input class="name-input" data-activity-group-name maxlength="120" placeholder="Nome gruppo"></td>
          <td>—</td>
          <td><div class="row-actions"><button type="button" data-save-activity-group>Salva</button><button type="button" data-cancel-new-activity-group>Annulla</button></div><small class="row-save-status" data-row-status></small></td>
        </tr>`] : []),
      ...groups.map((group) => `
        <tr data-activity-group-row data-activity-group-id="${escapeHtml(group.id)}">
          <td><input class="name-input" data-activity-group-name maxlength="120" value="${escapeHtml(group.name)}"></td>
          <td><span class="coverage-count">${activityCountByGroup.get(group.id) || 0}</span></td>
          <td><div class="row-actions"><button type="button" data-save-activity-group>Salva</button><button class="is-danger" type="button" data-delete-activity-group>Elimina</button></div><small class="row-save-status" data-row-status></small></td>
        </tr>`)
    ].join('');

    activityGroupCatalog.innerHTML = body
      ? `<table class="admin-table catalog-table activity-group-table"><thead><tr><th>Gruppo</th><th>Attività</th><th>Azioni</th></tr></thead><tbody>${body}</tbody></table>`
      : '<p class="empty-state">Nessun gruppo creato. Le attività vengono mostrate in “Senza gruppo”.</p>';
  }

  function activityRowDraft(rowNode) {
    return {
      name: rowNode?.querySelector('[data-activity-name]')?.value.trim() || '',
      groupId: rowNode?.querySelector('[data-activity-group]')?.value || ''
    };
  }

  function syncActivityRowDraft(rowNode) {
    if (!rowNode) return;
    const draft = activityRowDraft(rowNode);
    const activityId = rowNode.dataset.activityId || '';

    if (!activityId) {
      if (newActivityOpen) newActivityDraft = draft;
      return;
    }

    const dirty = draft.name !== (rowNode.dataset.initialName || '')
      || draft.groupId !== (rowNode.dataset.initialGroupId || '');
    if (dirty) activityDrafts.set(activityId, draft);
    else activityDrafts.delete(activityId);
  }

  function captureActivityCatalogDrafts() {
    if (!activityCatalog) return;
    activityCatalog.querySelectorAll('[data-activity-row]').forEach(syncActivityRowDraft);
  }

  function activityRowIsDirty(rowNode) {
    if (!rowNode?.dataset.activityId) return false;
    const draft = activityRowDraft(rowNode);
    return draft.name !== (rowNode.dataset.initialName || '')
      || draft.groupId !== (rowNode.dataset.initialGroupId || '');
  }

  function updateActivityBulkSaveState() {
    if (!activitySaveAll || !activityCatalog) return;
    const dirtyRows = [...activityCatalog.querySelectorAll('[data-activity-row][data-activity-id]')]
      .filter((row) => row.dataset.activityId && activityRowIsDirty(row));
    activitySaveAll.disabled = dirtyRows.length === 0;
    activitySaveAll.textContent = dirtyRows.length
      ? `Salva tutte le modifiche (${dirtyRows.length})`
      : 'Salva tutte le modifiche';
  }

  function refreshActivityRowDirtyState(rowNode) {
    if (!rowNode) return;
    syncActivityRowDraft(rowNode);
    if (!rowNode.dataset.activityId) return;
    const dirty = activityRowIsDirty(rowNode);
    rowNode.classList.toggle('is-dirty-row', dirty);
    const status = rowNode.querySelector('[data-row-status]');
    if (status && !status.classList.contains('is-error') && !status.classList.contains('is-ok')) {
      status.textContent = dirty ? 'Modifica non salvata' : '';
    }
    updateActivityBulkSaveState();
  }

  function renderActivityCatalog() {
    if (!activityCatalog) return;
    captureActivityCatalogDrafts();
    const rows = (snapshot?.activityCatalog || []).filter((item) => item.active);
    const body = [
      ...(newActivityOpen ? [`<tr class="is-new-row" data-activity-row data-activity-id=""><td><input class="name-input" data-activity-name maxlength="200" placeholder="Nuova attività"></td><td><select class="inline-select" data-activity-group>${activityGroupOptions('')}</select></td><td><div class="row-actions"><button type="button" data-save-activity>Salva</button><button type="button" data-cancel-new-activity>Annulla</button></div><small class="row-save-status" data-row-status></small></td></tr>`] : []),
      ...rows.map((item) => `<tr data-activity-row data-activity-id="${escapeHtml(item.id)}" data-initial-name="${escapeHtml(item.name)}" data-initial-group-id="${escapeHtml(item.group_id || '')}"><td><input class="name-input" data-activity-name maxlength="200" value="${escapeHtml(item.name)}"></td><td><select class="inline-select" data-activity-group>${activityGroupOptions(item.group_id || '')}</select></td><td><div class="row-actions"><button type="button" data-save-activity>Salva</button><button class="is-danger" type="button" data-delete-activity>Elimina</button></div><small class="row-save-status" data-row-status></small></td></tr>`)
    ].join('');
    activityCatalog.innerHTML = body
      ? `<table class="admin-table catalog-table activity-catalog-table"><thead><tr><th>Attività</th><th>Gruppo</th><th>Azioni</th></tr></thead><tbody>${body}</tbody></table>`
      : '<p class="empty-state">Nessuna attività attiva.</p>';

    const renderedRows = [...activityCatalog.querySelectorAll('[data-activity-row]')];
    for (const rowNode of renderedRows) {
      const activityId = rowNode.dataset.activityId || '';
      if (!activityId) {
        if (!newActivityOpen) continue;
        const nameField = rowNode.querySelector('[data-activity-name]');
        const groupField = rowNode.querySelector('[data-activity-group]');
        if (nameField) nameField.value = newActivityDraft.name || '';
        if (groupField) {
          groupField.value = newActivityDraft.groupId || '';
          newActivityDraft.groupId = groupField.value || '';
        }
        continue;
      }

      const draft = activityDrafts.get(activityId);
      if (!draft) continue;
      const nameField = rowNode.querySelector('[data-activity-name]');
      const groupField = rowNode.querySelector('[data-activity-group]');
      if (nameField) nameField.value = draft.name;
      if (groupField) {
        groupField.value = draft.groupId;
        draft.groupId = groupField.value || '';
      }

      const dirty = activityRowIsDirty(rowNode);
      if (!dirty) {
        activityDrafts.delete(activityId);
        continue;
      }
      rowNode.classList.add('is-dirty-row');
      const status = rowNode.querySelector('[data-row-status]');
      if (status) status.textContent = 'Modifica non salvata';
    }

    updateActivityBulkSaveState();
  }

  function requirementRowHtml(row = null, isNew = false) {
    const requirementId = row?.id || '';
    const coverage = row ? `${row.assignedCount}/${row.requiredCount}` : '—';
    const uncovered = row ? requirementIsUncovered(row) : false;
    return `
      <tr class="${isNew ? 'is-new-row' : ''} ${uncovered ? 'is-requirement-uncovered' : ''}" data-requirement-row data-requirement-id="${escapeHtml(requirementId)}">
        <td class="planning-choice-cell">
          <select class="inline-select planning-select" data-requirement-shift>${shiftIdOptions(row?.shiftId || '', { allowNew: true })}</select>
          <div class="planning-new-fields planning-new-shift" data-new-shift-fields hidden>
            <label><span>Data</span><input type="date" data-new-shift-date></label>
            <label><span>Da</span><input type="time" data-new-shift-start></label>
            <label><span>A</span><input type="time" data-new-shift-end></label>
            <small>Il nuovo turno sarà interno all’organizzazione e non comparirà automaticamente tra le disponibilità dei volontari.</small>
          </div>
        </td>
        <td class="planning-choice-cell">
          <select class="inline-select planning-select" data-requirement-activity>${activityIdOptions(row?.activityId || '', { allowNew: true })}</select>
          <div class="planning-new-fields planning-new-activity" data-new-activity-fields hidden>
            <label><span>Nuova attività</span><input type="text" maxlength="200" data-new-activity-name placeholder="Nome attività"></label>
          </div>
        </td>
        <td><input class="count-input" data-requirement-count type="number" min="1" max="999" step="1" value="${escapeHtml(row?.requiredCount || 1)}"></td>
        <td><span class="coverage-count ${uncovered ? 'is-uncovered' : 'is-covered'}">${escapeHtml(coverage)}</span></td>
        <td><div class="row-actions">
          <button type="button" data-save-requirement>Salva</button>
          ${isNew ? '<button type="button" data-cancel-new-requirement>Annulla</button>' : '<button class="is-danger" type="button" data-delete-requirement>Elimina abbinamento</button>'}
        </div><small class="row-save-status" data-row-status></small></td>
      </tr>`;
  }

  function refreshRequirementNewFields(rowNode) {
    if (!rowNode) return;
    const shiftChoice = rowNode.querySelector('[data-requirement-shift]')?.value || '';
    const activityChoice = rowNode.querySelector('[data-requirement-activity]')?.value || '';
    const shiftFields = rowNode.querySelector('[data-new-shift-fields]');
    const activityFields = rowNode.querySelector('[data-new-activity-fields]');
    if (shiftFields) shiftFields.hidden = shiftChoice !== '__new__';
    if (activityFields) activityFields.hidden = activityChoice !== '__new__';
    if (shiftChoice === '__new__') {
      rowNode.querySelector('[data-new-shift-date]')?.setAttribute('required', '');
      rowNode.querySelector('[data-new-shift-start]')?.setAttribute('required', '');
      rowNode.querySelector('[data-new-shift-end]')?.setAttribute('required', '');
    } else {
      rowNode.querySelector('[data-new-shift-date]')?.removeAttribute('required');
      rowNode.querySelector('[data-new-shift-start]')?.removeAttribute('required');
      rowNode.querySelector('[data-new-shift-end]')?.removeAttribute('required');
    }
    if (activityChoice === '__new__') rowNode.querySelector('[data-new-activity-name]')?.setAttribute('required', '');
    else rowNode.querySelector('[data-new-activity-name]')?.removeAttribute('required');
  }

  function renderRequirementCatalog() {
    if (!requirementCatalog) return;
    if (!snapshot?.requirementsAvailable) {
      setStatus(requirementStatus, 'Anagrafica pianificazione non disponibile nel database.', 'error');
      requirementCatalog.innerHTML = '<p class="empty-state">La pianificazione non è ancora inizializzata.</p>';
      return;
    }
    const rows = requirements();
    const body = [
      ...(newRequirementOpen ? [requirementRowHtml(null, true)] : []),
      ...rows.map((row) => requirementRowHtml(row, false))
    ].join('');
    requirementCatalog.innerHTML = body
      ? `<table class="admin-table requirements-table planning-table"><thead><tr><th>Turno</th><th>Attività</th><th>Persone previste</th><th>Assegnate / previste</th><th>Azioni</th></tr></thead><tbody>${body}</tbody></table>`
      : '<p class="empty-state">Nessun abbinamento attività-turno attivo.</p>';

    requirementCatalog.querySelectorAll('[data-requirement-row]').forEach(refreshRequirementNewFields);
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
    const rows = requirements()
      .filter((item) => item.shiftId === shiftId)
      .sort((a, b) => String(a.activity || '').localeCompare(String(b.activity || ''), 'it'));

    detailTitle.textContent = `${shift.day_label} · ${shift.shift_label}`;
    const currentHtml = rows.length
      ? `<table class="detail-table shift-activity-table"><thead><tr><th>Attività prevista</th><th>Copertura</th><th></th></tr></thead><tbody>${rows.map((item) => `
          <tr class="${requirementIsUncovered(item) ? 'is-requirement-uncovered' : ''}">
            <td><strong>${escapeHtml(prettifyActivityName(item.activity))}</strong></td>
            <td>${item.assignedCount}/${item.requiredCount}${requirementIsUncovered(item) ? ` · mancano ${item.requiredCount - item.assignedCount}` : ''}</td>
            <td>${detailTargetRow ? `<button class="table-link" type="button" data-pick-shift-requirement="${escapeHtml(item.id)}">Seleziona</button>` : ''}</td>
          </tr>`).join('')}</tbody></table>`
      : '<p class="empty-state">In questo turno non risultano attività previste.</p>';

    detailContent.innerHTML = `
      <p class="intro detail-intro">Qui vedi le coppie turno-attività previste e la relativa copertura.</p>
      ${currentHtml}`;
    detailDialog.showModal();
  }


  function personActivityWarningHtml(row) {
    const warnings = assignmentWarningDetails(row);
    return warnings.length ? warningHtml(warnings) : '<span class="warning-none">—</span>';
  }

  function personMoveCandidate(rowNode, row) {
    const requirementId = rowNode?.querySelector('[data-person-move-requirement]')?.value || assignmentRequirementId(row);
    const requirement = requirementById(requirementId);
    return {
      id: row.id,
      personId: row.personId,
      shiftId: requirement?.shiftId || row.shiftId || null,
      day: requirement?.day || row.day || '',
      shift: requirement?.shift || row.shift || ''
    };
  }

  function refreshPersonMoveWarning(rowNode, row) {
    const warningNode = rowNode?.querySelector('[data-person-row-warning]');
    if (!warningNode || !row) return;
    warningNode.innerHTML = personActivityWarningHtml(personMoveCandidate(rowNode, row));
  }

  function personActivitiesHtml(personId, selectedAssignmentId = '') {
    const rows = (snapshot?.assignments || [])
      .filter((item) => item.personId === personId)
      .sort((a, b) => {
        const reqA = requirementForAssignment(a);
        const reqB = requirementForAssignment(b);
        return (reqA?.shiftSortOrder ?? 9999) - (reqB?.shiftSortOrder ?? 9999)
          || displayActivity(a).localeCompare(displayActivity(b), 'it');
      });

    return rows.length
      ? `<div class="person-activities-table-wrap"><table class="detail-table person-activities-table">
          <thead><tr><th>Turno + attività</th><th>Ruolo</th><th>Risposta</th><th>Warning</th><th></th></tr></thead>
          <tbody>${rows.map((row) => `
            <tr class="${row.id === selectedAssignmentId ? 'is-selected-assignment' : ''}" data-person-assignment-row="${escapeHtml(row.id)}">
              <td>
                <select class="person-activity-move-select" data-person-move-requirement>
                  ${requirementOptions(assignmentRequirementId(row))}
                </select>
              </td>
              <td>${row.isResponsible ? responsibleBadge('Responsabile') : '—'}</td>
              <td>${responseBadge(row.currentResponse)}</td>
              <td class="person-activity-warning" data-person-row-warning>${personActivityWarningHtml(row)}</td>
              <td><button class="table-link" type="button" data-person-move-assignment="${escapeHtml(row.id)}">Sposta</button></td>
            </tr>`).join('')}</tbody>
        </table></div>`
      : '<p class="empty-state">Nessuna attività assegnata.</p>';
  }

  function personAddActivityForm(personId, defaultRequirementId = '') {
    const requirement = requirementById(defaultRequirementId);
    const candidate = requirement ? { id: null, personId, shiftId: requirement.shiftId } : null;
    return `
      <div class="person-add-activity" data-person-add-activity-form hidden>
        <div class="person-add-activity__grid person-add-activity__grid--pair">
          <label class="field"><span>Turno + attività</span>
            <select data-person-add-requirement>${requirementOptions(defaultRequirementId)}</select>
          </label>
          <div class="person-add-activity__warning">
            <span>Warning</span>
            <div data-person-add-warning>${candidate ? personActivityWarningHtml(candidate) : '<span class="warning-none">—</span>'}</div>
          </div>
          <div class="person-add-activity__actions">
            <button class="button button--secondary" type="button" data-person-add-cancel>Annulla</button>
            <button class="button button--primary" type="button" data-person-add-save>Aggiungi</button>
          </div>
        </div>
        <p class="status" data-person-add-status aria-live="polite"></p>
      </div>`;
  }

  function showPersonActivitiesPopup(personId, selectedAssignmentId = '') {
    const person = (snapshot?.people || []).find((item) => item.id === personId);
    if (!person || !personActivitiesDialog) return;
    const assignments = (snapshot?.assignments || []).filter((item) => item.personId === personId);
    const days = new Set(assignments.map((item) => item.day).filter(Boolean));
    const selected = selectedAssignmentId
      ? assignments.find((item) => item.id === selectedAssignmentId) || null
      : null;

    personActivitiesTitle.textContent = person.display_name || 'Attività';
    const selectedControls = selected
      ? `<div class="person-activity-selected">
          <div>
            <span class="eyebrow">Attività selezionata</span>
            <strong>${escapeHtml(selected.day)} · ${escapeHtml(selected.shift)} — ${escapeHtml(displayActivity(selected))}</strong>
            <div class="person-activity-selected__warning">${personActivityWarningHtml(selected)}</div>
          </div>
          <button class="button ${selected.isResponsible ? 'button--secondary' : 'button--primary'}" type="button"
            data-person-responsible-assignment="${escapeHtml(selected.id)}"
            data-person-responsible-next="${selected.isResponsible ? 'false' : 'true'}"
            ${snapshot?.responsibilityAvailable ? '' : 'disabled'}>
            ${selected.isResponsible ? 'Togli responsabile' : 'Rendi responsabile'}
          </button>
        </div>
        <p class="status" data-person-activities-status aria-live="polite"></p>`
      : '<p class="status" data-person-activities-status aria-live="polite"></p>';

    const intro = assignments.length
      ? `<p class="intro detail-intro"><strong>${assignments.length}</strong> attività già assegnate su <strong>${days.size}</strong> ${days.size === 1 ? 'giorno' : 'giorni'}.</p>`
      : '<p class="empty-state">Non risultano attività già assegnate a questa persona.</p>';

    const selectedRequirementId = selected ? assignmentRequirementId(selected) : '';
    personActivitiesContent.dataset.personId = personId;
    personActivitiesContent.dataset.selectedAssignmentId = selectedAssignmentId || '';
    personActivitiesContent.innerHTML = `
      ${selectedControls}
      <div class="person-activities-toolbar">
        <button class="button button--primary" type="button" data-person-add-activity-open>＋ Aggiungi un'altra attività</button>
      </div>
      ${personAddActivityForm(personId, selectedRequirementId)}
      ${intro}
      ${personActivitiesHtml(personId, selectedAssignmentId)}`;
    personActivitiesDialog.showModal();
  }

  async function movePersonAssignmentFromPopup(assignmentId, button) {
    const row = (snapshot?.assignments || []).find((item) => item.id === assignmentId);
    const rowNode = button?.closest('[data-person-assignment-row]');
    const requirementId = rowNode?.querySelector('[data-person-move-requirement]')?.value || '';
    const statusNode = personActivitiesContent?.querySelector('[data-person-activities-status]');
    if (!row || !requirementId) return;

    if (requirementId === assignmentRequirementId(row)) {
      setStatus(statusNode, 'Turno e attività sono già quelli attuali.');
      return;
    }

    await withButtonBusy(button, 'Spostamento…', async () => {
      try {
        const result = await api(API, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'save-assignment',
            assignmentId: row.id,
            personId: row.personId,
            requirementId,
            requestedProfile: row.requestedProfile || null,
            note: row.note || null
          })
        });
        const personId = row.personId;
        await loadSnapshot();
        showPersonActivitiesPopup(personId, result?.assignment?.id || '');
        setStatus(personActivitiesContent?.querySelector('[data-person-activities-status]'), 'Turno/attività aggiornati e salvati.', 'success');
      } catch (error) {
        setStatus(statusNode, error.message, 'error');
      }
    });
  }

  function refreshPersonAddWarning() {
    const personId = personActivitiesContent?.dataset.personId || '';
    const requirementId = personActivitiesContent?.querySelector('[data-person-add-requirement]')?.value || '';
    const requirement = requirementById(requirementId);
    const warningNode = personActivitiesContent?.querySelector('[data-person-add-warning]');
    if (!warningNode) return;
    if (!personId || !requirement) {
      warningNode.innerHTML = '<span class="warning-none">—</span>';
      return;
    }
    warningNode.innerHTML = personActivityWarningHtml({ id: null, personId, shiftId: requirement.shiftId });
  }

  async function addPersonActivityFromPopup(button) {
    const personId = personActivitiesContent?.dataset.personId || '';
    const requirementId = personActivitiesContent?.querySelector('[data-person-add-requirement]')?.value || '';
    const statusNode = personActivitiesContent?.querySelector('[data-person-add-status]');
    if (!personId || !requirementId) {
      setStatus(statusNode, 'Seleziona una coppia turno-attività.', 'error');
      return;
    }

    await withButtonBusy(button, 'Aggiunta…', async () => {
      try {
        const result = await api(API, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'save-assignment',
            assignmentId: null,
            personId,
            requirementId,
            requestedProfile: null,
            note: null
          })
        });
        await loadSnapshot();
        showPersonActivitiesPopup(personId, result?.assignment?.id || '');
        setStatus(personActivitiesContent?.querySelector('[data-person-activities-status]'), 'Nuova attività aggiunta.', 'success');
      } catch (error) {
        setStatus(statusNode, error.message, 'error');
      }
    });
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
        ).join('')}</tbody></table>`
      : '<p class="empty-state">Non ci sono disponibilità da assegnare.</p>';
    detailDialog.showModal();
  }

  function formatChangeActivity(value) {
    if (!value) return '—';
    const activity = prettifyActivityName(value.activity || '');
    const role = String(value.role || '').trim();
    const activityKey = activity.toLocaleLowerCase('it-IT');
    const roleKey = role.toLocaleLowerCase('it-IT');
    const roleAlreadyIncluded = role && activityKey.includes(roleKey);
    return role && !roleAlreadyIncluded ? `${activity} · ${role}` : activity;
  }

  function formatChangeAssignment(value) {
    if (!value) return '—';
    return `${value.day || '—'} · ${value.shift || '—'} — ${formatChangeActivity(value)}`;
  }

  function confirmationChangeLabel(change) {
    if (change.type === 'added') return 'Aggiunta';
    if (change.type === 'removed') return 'Rimossa';
    if (change.type === 'reassigned') return 'Riassegnata';
    if (change.type === 'responsibility') return change.label || 'Responsabile modificato';
    return 'Modificata';
  }

  function confirmationChangeClass(change) {
    if (change.type === 'added') return 'is-added';
    if (change.type === 'removed') return 'is-removed';
    if (change.type === 'responsibility') return 'is-responsibility';
    return 'is-modified';
  }

  function confirmationChangeDetail(change) {
    if (change.type === 'added') {
      return `<div class="confirmation-change__after"><span>Ora</span><strong>${escapeHtml(formatChangeAssignment(change.after))}</strong></div>`;
    }
    if (change.type === 'removed') {
      return `<div class="confirmation-change__before"><span>Confermato</span><strong>${escapeHtml(formatChangeAssignment(change.before))}</strong></div>
        <div class="confirmation-change__arrow">→</div>
        <div class="confirmation-change__after"><span>Ora</span><strong>Rimossa</strong></div>`;
    }
    if (change.type === 'responsibility') {
      return `<div class="confirmation-change__after"><span>Attività</span><strong>${escapeHtml(formatChangeAssignment(change.after))}</strong></div>`;
    }
    return `<div class="confirmation-change__before"><span>Confermato</span><strong>${escapeHtml(formatChangeAssignment(change.before))}</strong></div>
      <div class="confirmation-change__arrow">→</div>
      <div class="confirmation-change__after"><span>Ora</span><strong>${escapeHtml(formatChangeAssignment(change.after))}</strong></div>`;
  }

  function renderConfirmationChanges() {
    if (!confirmationChanges) return;
    const groups = snapshot?.postConfirmationChanges || [];
    if (!groups.length) {
      confirmationChanges.innerHTML = '<p class="empty-state">Nessuna modifica successiva all’ultima conferma dei volontari.</p>';
      return;
    }

    confirmationChanges.innerHTML = `<div class="confirmation-change-list">${groups.map((group) => `
      <article class="confirmation-change-card">
        <header class="confirmation-change-card__header">
          <div>
            <strong>${escapeHtml(group.personName)}</strong>
            <span>Ultima conferma: ${escapeHtml(formatDateTime(group.submittedAt))} · ${group.changes.length} modific${group.changes.length === 1 ? 'a' : 'he'}</span>
          </div>
          <button class="button button--secondary" type="button"
            data-copy-review-link="${escapeHtml(group.personId)}">Copia link per revisione</button>
        </header>
        <div class="confirmation-change-card__changes">
          ${group.changes.map((change) => `
            <div class="confirmation-change ${confirmationChangeClass(change)}">
              <span class="confirmation-change__badge">${escapeHtml(confirmationChangeLabel(change))}</span>
              <div class="confirmation-change__detail">${confirmationChangeDetail(change)}</div>
              ${change.changedAt ? `<time>${escapeHtml(formatDateTime(change.changedAt))}</time>` : ''}
            </div>`).join('')}
        </div>
      </article>`).join('')}</div>`;
  }

  function renderAll() {
    renderKpis();
    renderAssignments();
    renderConfirmationChanges();
    renderPersonCatalog();
    renderActivityGroupCatalog();
    renderActivityCatalog();
    renderRequirementCatalog();
    renderRaceProgram();
    renderPersonReport();
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

  async function writeClipboard(textValue) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(textValue);
      return;
    }
    const area = document.createElement('textarea');
    area.value = textValue;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand('copy');
    area.remove();
    if (!copied) throw new Error('Copia automatica non disponibile.');
  }

  async function copyReviewLink(personId, button) {
    await withButtonBusy(button, 'Copiando…', async () => {
      setStatus(confirmationLinkStatus, 'Generazione link…');
      try {
        const body = await api(`${API}?view=invite`);
        if (!body.accessUrl) throw new Error('Link non disponibile.');
        const reviewUrl = new URL(body.accessUrl, location.origin);
        reviewUrl.searchParams.set('person', personId);
        await writeClipboard(reviewUrl.toString());
        setStatus(confirmationLinkStatus, 'Link copiato. Puoi incollarlo nel messaggio WhatsApp.', 'success');
      } catch (error) {
        setStatus(confirmationLinkStatus, error.message, 'error');
      }
    });
  }

  async function copyVolunteerLink() {
    const button = document.querySelector('[data-copy-volunteer-link]');
    if (button) button.disabled = true;
    setStatus(inviteStatus, 'Generazione link…');
    try {
      const body = await api(`${API}?view=invite`);
      if (!body.accessUrl) throw new Error('Link non disponibile.');
      await writeClipboard(body.accessUrl);
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
    const requirementId = rowNode.querySelector('[data-inline-requirement]')?.value || '';

    if (!personId || !requirementId) {
      status.textContent = 'Seleziona persona e coppia turno-attività.';
      status.className = 'row-save-status is-error';
      return;
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
          requirementId,
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
    setMultiFilterValues(assignmentTypeFilter, []);
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

  assignmentViewToggle?.addEventListener('click', () => {
    setAssignmentView(assignmentView === 'board' ? 'list' : 'board');
  });

  assignmentFiltersToggle?.addEventListener('click', () => {
    if (!assignmentFiltersPanel) return;
    const open = !assignmentFiltersPanel.classList.contains('is-open');
    assignmentFiltersPanel.classList.toggle('is-open', open);
    assignmentFiltersToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  document.querySelector('[data-go-person-report]')?.addEventListener('click', () => {
    const section = document.querySelector('[data-person-report-section]');
    const content = document.getElementById('person-report-content');
    const collapse = document.querySelector('[data-collapse-target="person-report-content"]');
    if (content) content.hidden = false;
    if (collapse) {
      collapse.setAttribute('aria-expanded', 'true');
      collapse.textContent = 'Comprimi';
    }
    renderPersonReport();
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  assignmentBoardExportPdf?.addEventListener('click', () => {
    exportShiftBoardPdfByDay(assignmentBoardPdfGroups(), {
      title: 'Report volontari - gestione a schede',
      showGroups: true,
      singleTurnPerPage: true,
      pageSize: 'A4 landscape'
    });
  });

  document.querySelector('[data-new-person]')?.addEventListener('click', () => {
    newPersonOpen = true;
    renderPersonCatalog();
  });
  document.querySelector('[data-new-activity-group]')?.addEventListener('click', () => {
    newActivityGroupOpen = true;
    renderActivityGroupCatalog();
  });
  document.querySelector('[data-new-activity]')?.addEventListener('click', () => {
    newActivityOpen = true;
    renderActivityCatalog();
  });
  document.querySelector('[data-new-requirement]')?.addEventListener('click', () => {
    if (!snapshot?.requirementsAvailable) {
      alert('L’anagrafica esigenze non è disponibile nel database.');
      return;
    }
    newRequirementOpen = true;
    renderRequirementCatalog();
  });
  document.querySelector('[data-new-race-entry]')?.addEventListener('click', () => {
    if (!snapshot?.raceProgramAvailable) {
      alert('Il programma gare non è ancora inizializzato nel database.');
      return;
    }
    newRaceEntryOpen = true;
    renderRaceProgram();
  });

  [assignmentTypeFilter, assignmentSort, assignmentPersonFilter, assignmentShiftFilter, assignmentActivityFilter, assignmentResponseFilter, assignmentWarningFilter, assignmentCoverageFilter]
    .forEach((filter) => filter?.addEventListener('change', renderAssignments));
  [personReportPersonFilter, personReportResponseFilter]
    .forEach((filter) => filter?.addEventListener('change', renderPersonReport));
  racePersonFilter?.addEventListener('change', renderRaceProgram);
  raceCrewFilter?.addEventListener('input', renderRaceProgram);
  personCatalogSearch?.addEventListener('input', renderPersonCatalog);

  document.querySelector('[data-person-export-pdf]')?.addEventListener('click', () => exportPersonReport('pdf'));
  document.querySelector('[data-person-export-excel]')?.addEventListener('click', () => exportPersonReport('excel'));

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
    if (event.target.matches('[data-inline-person], [data-inline-requirement]')) refreshRowWarnings(rowNode);
    if (event.target.matches('select[data-inline-person]') && event.target.value) {
      showPersonActivitiesPopup(event.target.value);
    }
  });

  assignmentTable?.addEventListener('click', async (event) => {
    const rowNode = event.target.closest('[data-assignment-row]');
    const save = event.target.closest('[data-save-inline-assignment]');
    const cancelEdit = event.target.closest('[data-cancel-inline-assignment]');
    const editRequirement = event.target.closest('[data-edit-requirement]');
    const editPerson = event.target.closest('[data-edit-person]');
    const shiftLink = event.target.closest('[data-show-shift-activities]');
    const responsible = event.target.closest('[data-open-responsible]');
    const remove = event.target.closest('[data-delete-assignment]');
    const audit = event.target.closest('[data-audit-person]');
    const person = event.target.closest('[data-show-person]');
    const activity = event.target.closest('[data-show-activity]');
    const addGap = event.target.closest('[data-add-person-requirement]');

    if (addGap) {
      openBoardAddPerson(addGap.dataset.addPersonRequirement || '');
    } else if (responsible && rowNode?.dataset.assignmentId) {
      showResponsiblePopup(responsible.dataset.openResponsible || rowNode.dataset.assignmentId);
    } else if (shiftLink && rowNode) {
      const shiftId = shiftLink.dataset.showShiftActivities;
      if (shiftId) showShiftActivities(shiftId, rowNode);
    } else if (editRequirement && rowNode) {
      const display = rowNode.querySelector('[data-activity-display]');
      const edit = rowNode.querySelector('[data-requirement-edit]');
      if (display) display.hidden = true;
      if (edit) {
        edit.hidden = false;
        edit.querySelector('[data-inline-requirement]')?.focus();
      }
    } else if (editPerson && rowNode) {
      const display = rowNode.querySelector('[data-person-display]');
      const select = rowNode.querySelector('[data-inline-person]');
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

  assignmentBoard?.addEventListener('pointerdown', (event) => {
    const handle = event.target.closest('[data-board-group-drag-handle]');
    if (!handle || event.pointerType === 'mouse') return;
    const groupId = handle.dataset.boardGroupId || '';
    const column = handle.closest('[data-board-shift-column]');
    const groupNode = handle.closest('[data-board-activity-group]');
    if (!groupId || !column || !groupNode) return;

    boardGroupPointerDrag = {
      pointerId: event.pointerId,
      id: groupId,
      shiftId: column.dataset.boardShiftColumn || '',
      targetGroupId: '',
      placeAfter: false
    };
    groupNode.classList.add('is-group-dragging');
    try { handle.setPointerCapture(event.pointerId); } catch {}
    event.preventDefault();
  });

  assignmentBoard?.addEventListener('pointermove', (event) => {
    if (!boardGroupPointerDrag || boardGroupPointerDrag.pointerId !== event.pointerId) return;
    event.preventDefault();
    autoScrollBoardDrag(event.clientX, event.clientY);
    clearBoardGroupReorderMarkers();

    const element = document.elementFromPoint(event.clientX, event.clientY);
    const column = element?.closest?.('[data-board-shift-column]');
    if (!column || column.dataset.boardShiftColumn !== boardGroupPointerDrag.shiftId) {
      boardGroupPointerDrag.targetGroupId = '';
      return;
    }

    const targetGroup = element.closest('[data-board-activity-group]');
    const targetGroupId = targetGroup?.dataset.boardGroupId || '';
    if (!targetGroup || !targetGroupId || targetGroupId === boardGroupPointerDrag.id) {
      boardGroupPointerDrag.targetGroupId = targetGroupId === boardGroupPointerDrag.id ? targetGroupId : '';
      return;
    }

    const rect = targetGroup.getBoundingClientRect();
    const placeAfter = event.clientY > rect.top + rect.height / 2;
    boardGroupPointerDrag.targetGroupId = targetGroupId;
    boardGroupPointerDrag.placeAfter = placeAfter;
    targetGroup.classList.add(placeAfter ? 'is-group-reorder-after' : 'is-group-reorder-before');
  });

  const finishGroupPointerReorder = async (event, cancelled = false) => {
    if (!boardGroupPointerDrag || boardGroupPointerDrag.pointerId !== event.pointerId) return;
    const drag = { ...boardGroupPointerDrag };
    boardGroupPointerDrag = null;
    assignmentBoard?.querySelectorAll(`[data-board-activity-group][data-board-group-id="${CSS.escape(drag.id)}"]`).forEach((node) => node.classList.remove('is-group-dragging'));
    clearBoardGroupReorderMarkers();
    boardDragEndedAt = Date.now();

    if (cancelled || !drag.targetGroupId || drag.targetGroupId === drag.id) return;
    await reorderBoardActivityGroup(drag.id, drag.targetGroupId, drag.placeAfter);
  };

  assignmentBoard?.addEventListener('pointerup', (event) => { void finishGroupPointerReorder(event, false); });
  assignmentBoard?.addEventListener('pointercancel', (event) => { void finishGroupPointerReorder(event, true); });

  assignmentBoard?.addEventListener('pointerdown', (event) => {
    const handle = event.target.closest('[data-board-activity-drag-handle]');
    if (!handle) return;
    const requirementId = handle.dataset.boardRequirementId || '';
    const requirement = requirementById(requirementId);
    const box = handle.closest('.assignment-board__activity');
    if (!requirement || !box) return;

    boardActivityPointerDrag = {
      pointerId: event.pointerId,
      id: requirement.id,
      activityId: requirement.activityId,
      sourceGroupId: requirement.activityGroupId || '',
      shiftId: requirement.shiftId,
      hasTargetGroup: false,
      targetGroupId: null,
      targetRequirementId: '',
      placeAfter: false,
      canDropAtEnd: false
    };
    box.classList.add('is-activity-dragging');
    assignmentBoard.classList.add('is-activity-drag-mode');
    try { handle.setPointerCapture(event.pointerId); } catch {}
    event.preventDefault();
  });

  assignmentBoard?.addEventListener('pointermove', (event) => {
    if (!boardActivityPointerDrag || boardActivityPointerDrag.pointerId !== event.pointerId) return;
    event.preventDefault();
    autoScrollBoardDrag(event.clientX, event.clientY);
    clearBoardActivityReorderMarkers();
    clearBoardGroupReorderMarkers();

    const element = document.elementFromPoint(event.clientX, event.clientY);
    const target = boardActivityDropContext(element, boardActivityPointerDrag.shiftId);
    if (!target) {
      boardActivityPointerDrag.hasTargetGroup = false;
      boardActivityPointerDrag.targetGroupId = null;
      boardActivityPointerDrag.targetRequirementId = '';
      boardActivityPointerDrag.canDropAtEnd = false;
      return;
    }

    boardActivityPointerDrag.hasTargetGroup = true;
    boardActivityPointerDrag.targetGroupId = target.groupId;

    if (target.positionTarget) {
      boardActivityPointerDrag.targetGroupId = '';
      boardActivityPointerDrag.targetRequirementId = target.targetRequirementId || '';
      boardActivityPointerDrag.placeAfter = target.placeAfter === true;
      boardActivityPointerDrag.canDropAtEnd = target.canDropAtEnd === true;
      target.positionTarget.classList.add('is-activity-position-drop-target');
      return;
    }

    const targetBox = target.targetBox;
    const targetRequirementId = targetBox?.dataset.boardRequirementId || '';
    if (targetRequirementId === boardActivityPointerDrag.id) {
      boardActivityPointerDrag.targetRequirementId = boardActivityPointerDrag.id;
      boardActivityPointerDrag.canDropAtEnd = false;
      return;
    }

    if (targetBox) {
      const rect = targetBox.getBoundingClientRect();
      boardActivityPointerDrag.targetRequirementId = targetRequirementId;
      boardActivityPointerDrag.placeAfter = event.clientY > rect.top + rect.height / 2;
      boardActivityPointerDrag.canDropAtEnd = false;
    } else if (target.targetContainer) {
      boardActivityPointerDrag.targetRequirementId = '';
      boardActivityPointerDrag.placeAfter = false;
      boardActivityPointerDrag.canDropAtEnd = true;
    } else {
      boardActivityPointerDrag.targetRequirementId = '';
      boardActivityPointerDrag.placeAfter = false;
      boardActivityPointerDrag.canDropAtEnd = false;
    }

    if (target.groupId !== boardActivityPointerDrag.sourceGroupId) {
      (target.paletteTarget || target.targetGroup || target.targetContainer || target.targetBox)?.classList.add('is-activity-group-drop-target');
      return;
    }

    if (targetBox) {
      targetBox.classList.add(boardActivityPointerDrag.placeAfter ? 'is-activity-reorder-after' : 'is-activity-reorder-before');
    } else if (target.targetContainer) {
      target.targetContainer.classList.add('is-activity-reorder-end');
    }
  });

  const finishActivityPointerReorder = async (event, cancelled = false) => {
    if (!boardActivityPointerDrag || boardActivityPointerDrag.pointerId !== event.pointerId) return;
    const drag = { ...boardActivityPointerDrag };
    boardActivityPointerDrag = null;
    assignmentBoard?.querySelector(`.assignment-board__activity[data-board-requirement-id="${CSS.escape(drag.id)}"]`)?.classList.remove('is-activity-dragging');
    assignmentBoard?.classList.remove('is-activity-drag-mode');
    clearBoardActivityReorderMarkers();
    clearBoardGroupReorderMarkers();
    boardDragEndedAt = Date.now();

    if (cancelled || !drag.hasTargetGroup) return;
    await moveBoardActivity(
      drag,
      drag.targetGroupId || '',
      drag.targetRequirementId || '',
      drag.placeAfter,
      drag.canDropAtEnd
    );
  };

  assignmentBoard?.addEventListener('pointerup', (event) => { void finishActivityPointerReorder(event, false); });
  assignmentBoard?.addEventListener('pointercancel', (event) => { void finishActivityPointerReorder(event, true); });

  assignmentBoard?.addEventListener('pointerdown', (event) => {
    const handle = event.target.closest('[data-board-reorder-handle]');
    if (!handle || event.pointerType === 'mouse') return;
    const card = handle.closest('[data-board-assignment-id]');
    if (!card) return;
    const requirementId = card.dataset.boardSourceRequirementId || '';
    if (!requirementId) return;

    boardPointerDrag = {
      pointerId: event.pointerId,
      id: card.dataset.boardAssignmentId || '',
      requirementId,
      targetAssignmentId: '',
      placeAfter: false,
      canDropAtEnd: false
    };
    card.classList.add('is-dragging');
    try { handle.setPointerCapture(event.pointerId); } catch {}
    event.preventDefault();
  });

  assignmentBoard?.addEventListener('pointermove', (event) => {
    if (!boardPointerDrag || boardPointerDrag.pointerId !== event.pointerId) return;
    event.preventDefault();
    autoScrollBoardDrag(event.clientX, event.clientY);
    clearBoardReorderMarkers();

    const element = document.elementFromPoint(event.clientX, event.clientY);
    const dropzone = element?.closest?.('[data-board-drop]');
    if (!dropzone || dropzone.dataset.boardRequirementId !== boardPointerDrag.requirementId) {
      boardPointerDrag.targetAssignmentId = '';
      boardPointerDrag.canDropAtEnd = false;
      return;
    }

    const targetCard = element.closest('[data-board-assignment-id]');
    if (targetCard?.dataset.boardAssignmentId === boardPointerDrag.id) {
      boardPointerDrag.targetAssignmentId = boardPointerDrag.id;
      boardPointerDrag.canDropAtEnd = false;
      return;
    }

    if (targetCard) {
      const rect = targetCard.getBoundingClientRect();
      const placeAfter = event.clientY > rect.top + rect.height / 2;
      boardPointerDrag.targetAssignmentId = targetCard.dataset.boardAssignmentId || '';
      boardPointerDrag.placeAfter = placeAfter;
      boardPointerDrag.canDropAtEnd = false;
      targetCard.classList.add(placeAfter ? 'is-reorder-after' : 'is-reorder-before');
      return;
    }

    boardPointerDrag.targetAssignmentId = '';
    boardPointerDrag.placeAfter = false;
    boardPointerDrag.canDropAtEnd = true;
    dropzone.querySelector('.assignment-board__people')?.classList.add('is-reorder-end');
  });

  const finishPointerReorder = async (event, cancelled = false) => {
    if (!boardPointerDrag || boardPointerDrag.pointerId !== event.pointerId) return;
    const drag = { ...boardPointerDrag };
    boardPointerDrag = null;
    assignmentBoard?.querySelector(`[data-board-assignment-id="${CSS.escape(drag.id)}"]`)?.classList.remove('is-dragging');
    clearBoardReorderMarkers();
    boardDragEndedAt = Date.now();

    if (cancelled || drag.targetAssignmentId === drag.id) return;
    if (!drag.targetAssignmentId && !drag.canDropAtEnd) return;
    await reorderBoardAssignment(
      drag.id,
      drag.requirementId,
      drag.targetAssignmentId || '',
      drag.placeAfter
    );
  };

  assignmentBoard?.addEventListener('pointerup', (event) => { void finishPointerReorder(event, false); });
  assignmentBoard?.addEventListener('pointercancel', (event) => { void finishPointerReorder(event, true); });

  assignmentBoard?.addEventListener('dragstart', (event) => {
    const groupHandle = event.target.closest('[data-board-group-drag-handle]');
    if (groupHandle) {
      const groupId = groupHandle.dataset.boardGroupId || '';
      const column = groupHandle.closest('[data-board-shift-column]');
      const groupNode = groupHandle.closest('[data-board-activity-group]');
      if (!groupId || !column || !groupNode) return;
      boardGroupDragState = {
        id: groupId,
        shiftId: column.dataset.boardShiftColumn || ''
      };
      groupNode.classList.add('is-group-dragging');
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', groupId);
      setStatus(assignmentBoardStatus, '');
      return;
    }

    const activityHandle = event.target.closest('[data-board-activity-drag-handle]');
    if (activityHandle) {
      const requirement = requirementById(activityHandle.dataset.boardRequirementId || '');
      const box = activityHandle.closest('.assignment-board__activity');
      if (!requirement || !box) return;
      boardActivityDragState = {
        id: requirement.id,
        activityId: requirement.activityId,
        sourceGroupId: requirement.activityGroupId || '',
        shiftId: requirement.shiftId
      };
      box.classList.add('is-activity-dragging');
      assignmentBoard.classList.add('is-activity-drag-mode');
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', requirement.id);
      setStatus(assignmentBoardStatus, '');
      return;
    }

    const card = event.target.closest('[data-board-drag-kind]');
    if (!card) return;
    boardDragState = {
      kind: card.dataset.boardDragKind,
      id: card.dataset.boardDragId,
      sourceRequirementId: card.dataset.boardSourceRequirementId || ''
    };
    card.classList.add('is-dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', card.dataset.boardDragId || '');
    setStatus(assignmentBoardStatus, '');
  });

  assignmentBoard?.addEventListener('dragover', (event) => {
    if (boardGroupDragState || boardActivityDragState || boardDragState) {
      autoScrollBoardDrag(event.clientX, event.clientY);
    }

    if (boardGroupDragState) {
      const column = event.target.closest('[data-board-shift-column]');
      if (!column || column.dataset.boardShiftColumn !== boardGroupDragState.shiftId) {
        event.dataTransfer.dropEffect = 'none';
        return;
      }

      const targetGroup = event.target.closest('[data-board-activity-group]');
      const targetGroupId = targetGroup?.dataset.boardGroupId || '';
      if (!targetGroup || !targetGroupId || targetGroupId === boardGroupDragState.id) {
        event.dataTransfer.dropEffect = 'none';
        return;
      }

      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      clearBoardGroupReorderMarkers();
      const rect = targetGroup.getBoundingClientRect();
      const after = event.clientY > rect.top + rect.height / 2;
      targetGroup.classList.add(after ? 'is-group-reorder-after' : 'is-group-reorder-before');
      return;
    }

    if (boardActivityDragState) {
      const target = boardActivityDropContext(event.target, boardActivityDragState.shiftId);
      if (!target) {
        event.dataTransfer.dropEffect = 'none';
        return;
      }

      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      clearBoardActivityReorderMarkers();
      clearBoardGroupReorderMarkers();

      if (target.groupId !== (boardActivityDragState.sourceGroupId || '')) {
        (target.paletteTarget || target.targetGroup || target.targetContainer || target.targetBox)?.classList.add('is-activity-group-drop-target');
        return;
      }

      const targetBox = target.targetBox;
      const draggedBox = assignmentBoard.querySelector(`.assignment-board__activity[data-board-requirement-id="${CSS.escape(boardActivityDragState.id)}"]`);
      if (targetBox && targetBox !== draggedBox) {
        const rect = targetBox.getBoundingClientRect();
        const after = event.clientY > rect.top + rect.height / 2;
        targetBox.classList.add(after ? 'is-activity-reorder-after' : 'is-activity-reorder-before');
      } else if (!targetBox && target.targetContainer) {
        target.targetContainer.classList.add('is-activity-reorder-end');
      }
      return;
    }

    const dropzone = event.target.closest('[data-board-drop]');
    if (!dropzone || !boardDragState) return;
    const targetRequirementId = dropzone.dataset.boardRequirementId || '';
    const allowed = boardCanDrop(boardDragState, targetRequirementId);
    if (!allowed) {
      event.dataTransfer.dropEffect = 'none';
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    clearBoardReorderMarkers();

    const sameRequirement = boardDragState.kind === 'assignment'
      && boardDragState.sourceRequirementId
      && boardDragState.sourceRequirementId === targetRequirementId;

    if (sameRequirement) {
      const targetCard = event.target.closest('[data-board-assignment-id]');
      const draggedCard = assignmentBoard.querySelector(`[data-board-assignment-id="${CSS.escape(boardDragState.id)}"]`);
      if (targetCard && targetCard !== draggedCard) {
        const rect = targetCard.getBoundingClientRect();
        const after = event.clientY > rect.top + rect.height / 2;
        targetCard.classList.add(after ? 'is-reorder-after' : 'is-reorder-before');
      } else if (!targetCard) {
        dropzone.querySelector('.assignment-board__people')?.classList.add('is-reorder-end');
      }
    } else {
      assignmentBoard.querySelectorAll('.is-drop-target').forEach((node) => {
        if (node !== dropzone) node.classList.remove('is-drop-target');
      });
      dropzone.classList.add('is-drop-target');
    }
  });

  assignmentBoard?.addEventListener('dragleave', (event) => {
    const dropzone = event.target.closest('[data-board-drop]');
    if (dropzone && (!event.relatedTarget || !dropzone.contains(event.relatedTarget))) {
      dropzone.classList.remove('is-drop-target');
    }
  });

  assignmentBoard?.addEventListener('drop', async (event) => {
    if (boardGroupDragState) {
      const dragged = { ...boardGroupDragState };
      const column = event.target.closest('[data-board-shift-column]');
      const targetGroup = event.target.closest('[data-board-activity-group]');
      const targetGroupId = targetGroup?.dataset.boardGroupId || '';
      if (!column || column.dataset.boardShiftColumn !== dragged.shiftId || !targetGroupId || targetGroupId === dragged.id) return;

      event.preventDefault();
      const rect = targetGroup.getBoundingClientRect();
      const placeAfter = event.clientY > rect.top + rect.height / 2;
      clearBoardGroupReorderMarkers();
      await reorderBoardActivityGroup(dragged.id, targetGroupId, placeAfter);
      return;
    }

    if (boardActivityDragState) {
      const dragged = { ...boardActivityDragState };
      const target = boardActivityDropContext(event.target, dragged.shiftId);
      if (!target) return;

      event.preventDefault();

      const targetBox = target.targetBox;
      if (targetBox?.dataset.boardRequirementId === dragged.id) {
        clearBoardActivityReorderMarkers();
        assignmentBoard.classList.remove('is-activity-drag-mode');
        return;
      }

      let targetRequirementId = '';
      let placeAfter = false;
      let canDropAtEnd = false;
      if (targetBox) {
        targetRequirementId = targetBox.dataset.boardRequirementId || '';
        const rect = targetBox.getBoundingClientRect();
        placeAfter = event.clientY > rect.top + rect.height / 2;
      } else if (target.targetContainer) {
        canDropAtEnd = true;
      }

      clearBoardActivityReorderMarkers();
      clearBoardGroupReorderMarkers();
      assignmentBoard.classList.remove('is-activity-drag-mode');
      await moveBoardActivity(dragged, target.groupId || '', targetRequirementId, placeAfter, canDropAtEnd);
      return;
    }

    const dropzone = event.target.closest('[data-board-drop]');
    if (!dropzone || !boardDragState) return;
    const dragged = { ...boardDragState };
    const targetRequirementId = dropzone.dataset.boardRequirementId || '';
    if (!boardCanDrop(dragged, targetRequirementId)) return;

    event.preventDefault();
    const sameRequirement = dragged.kind === 'assignment'
      && dragged.sourceRequirementId
      && dragged.sourceRequirementId === targetRequirementId;

    if (sameRequirement) {
      const targetCard = event.target.closest('[data-board-assignment-id]');
      let targetAssignmentId = '';
      let placeAfter = false;
      if (targetCard?.dataset.boardAssignmentId === dragged.id) {
        clearBoardReorderMarkers();
        return;
      }
      if (targetCard) {
        targetAssignmentId = targetCard.dataset.boardAssignmentId || '';
        const rect = targetCard.getBoundingClientRect();
        placeAfter = event.clientY > rect.top + rect.height / 2;
      }
      clearBoardReorderMarkers();
      await reorderBoardAssignment(dragged.id, targetRequirementId, targetAssignmentId, placeAfter);
      return;
    }

    dropzone.classList.remove('is-drop-target');
    clearBoardReorderMarkers();
    await moveBoardItem(dragged, targetRequirementId);
  });

  assignmentBoard?.addEventListener('dragend', (event) => {
    event.target.closest('[data-board-activity-group]')?.classList.remove('is-group-dragging');
    event.target.closest('.assignment-board__activity')?.classList.remove('is-activity-dragging');
    event.target.closest('[data-board-drag-kind]')?.classList.remove('is-dragging');
    assignmentBoard.querySelectorAll('.is-drop-target').forEach((node) => node.classList.remove('is-drop-target'));
    clearBoardActivityReorderMarkers();
    clearBoardGroupReorderMarkers();
    clearBoardReorderMarkers();
    assignmentBoard.classList.remove('is-activity-drag-mode');
    boardGroupDragState = null;
    boardActivityDragState = null;
    boardDragState = null;
    boardDragEndedAt = Date.now();
  });

  assignmentBoard?.addEventListener('click', (event) => {
    if (Date.now() - boardDragEndedAt < 300) return;

    const groupToggle = event.target.closest('[data-board-group-toggle]');
    if (groupToggle) {
      event.stopPropagation();
      const key = groupToggle.dataset.boardGroupToggle || '';
      const groupNode = groupToggle.closest('[data-board-activity-group]');
      const body = groupNode?.querySelector('[data-board-group-body]');
      const chevron = groupToggle.querySelector('.assignment-board__group-chevron');
      if (!key || !groupNode || !body) return;

      const collapsed = !groupNode.classList.contains('is-collapsed');
      groupNode.classList.toggle('is-collapsed', collapsed);
      body.hidden = collapsed;
      groupToggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      groupToggle.title = collapsed ? 'Espandi gruppo' : 'Comprimi gruppo';
      if (chevron) chevron.textContent = collapsed ? '▸' : '▾';

      if (collapsed) boardCollapsedGroups.add(key);
      else boardCollapsedGroups.delete(key);
      persistBoardCollapsedGroups();
      return;
    }

    const copyFrom = event.target.closest('[data-board-copy-from]');
    if (copyFrom) {
      event.stopPropagation();
      showCopyFromRequirement(copyFrom.dataset.boardRequirementId || '');
      return;
    }

    const addPerson = event.target.closest('[data-board-add-person]');
    if (addPerson) {
      event.stopPropagation();
      openBoardAddPerson(addPerson.dataset.boardRequirementId || '');
      return;
    }

    const remove = event.target.closest('[data-board-delete-assignment]');
    if (remove) {
      event.stopPropagation();
      deleteBoardAssignment(remove.dataset.boardDeleteAssignment || '', remove);
      return;
    }

    const edit = event.target.closest('[data-board-edit-kind]');
    if (edit) {
      event.stopPropagation();
      openBoardEdit(edit.dataset.boardEditKind, edit.dataset.boardEditId);
      return;
    }

    const person = event.target.closest('[data-board-person-open]');
    if (person) {
      event.stopPropagation();
      showPersonActivitiesPopup(
        person.dataset.boardPersonOpen,
        person.dataset.boardPersonAssignmentId || ''
      );
    }
  });

  personCatalog?.addEventListener('click', async (event) => {
    const rowNode = event.target.closest('[data-person-catalog-row]');
    if (!rowNode) return;

    const save = event.target.closest('[data-save-person]');
    const remove = event.target.closest('[data-delete-person]');
    const cancel = event.target.closest('[data-cancel-new-person]');
    const status = rowNode.querySelector('[data-row-status]');

    if (cancel) {
      newPersonOpen = false;
      renderPersonCatalog();
      return;
    }

    if (save) {
      const personCode = rowNode.querySelector('[data-person-code]')?.value.trim() || '';
      const surname = rowNode.querySelector('[data-person-surname]')?.value.trim() || '';
      const givenName = rowNode.querySelector('[data-person-given-name]')?.value.trim() || '';
      const displayName = rowNode.querySelector('[data-person-display-name]')?.value.trim()
        || [surname, givenName].filter(Boolean).join(' ').trim();
      const selectable = rowNode.querySelector('[data-person-selectable]')?.checked !== false;

      if (!displayName) {
        status.textContent = 'Indica il nominativo.';
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
              body: JSON.stringify({
                action: 'save-person',
                personId: rowNode.dataset.personId || null,
                personCode,
                surname,
                givenName,
                displayName,
                selectable
              })
            });
            newPersonOpen = false;
            await loadSnapshot();
            setStatus(personCatalogStatus, 'Persona salvata.', 'success');
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
      const personId = rowNode.dataset.personId || '';
      const name = rowNode.querySelector('[data-person-display-name]')?.value.trim() || 'questa persona';
      if (!confirm(`Eliminare “${name}” dall’anagrafica attiva? Lo storico resterà conservato.`)) return;

      try {
        await api(API, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'delete-person', personId })
        });
        await loadSnapshot();
        setStatus(personCatalogStatus, 'Persona eliminata dall’anagrafica attiva.', 'success');
      } catch (error) {
        alert(error.message);
      }
    }
  });

  activityGroupCatalog?.addEventListener('click', async (event) => {
    const rowNode = event.target.closest('[data-activity-group-row]');
    if (!rowNode) return;
    const save = event.target.closest('[data-save-activity-group]');
    const remove = event.target.closest('[data-delete-activity-group]');
    const cancel = event.target.closest('[data-cancel-new-activity-group]');
    const status = rowNode.querySelector('[data-row-status]');

    if (cancel) {
      newActivityGroupOpen = false;
      renderActivityGroupCatalog();
      return;
    }

    if (save) {
      const name = rowNode.querySelector('[data-activity-group-name]')?.value.trim() || '';
      if (!name) {
        status.textContent = 'Indica il nome del gruppo.';
        status.className = 'row-save-status is-error';
        return;
      }
      setRowBusy(rowNode, true, save);
      try {
        await withButtonBusy(save, 'Salvataggio…', async () => {
          try {
            const result = await api(API, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                action: 'save-activity-group',
                groupId: rowNode.dataset.activityGroupId || null,
                name
              })
            });
            newActivityGroupOpen = false;
            await loadSnapshot();
            setStatus(
              activityGroupStatus,
              result?.group?.existing ? 'Il gruppo esisteva già.' : 'Gruppo salvato.',
              'success'
            );
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
      const groupId = rowNode.dataset.activityGroupId || '';
      const group = activityGroupById(groupId);
      if (!group) return;
      if (!confirm(`Eliminare il gruppo “${group.name}”? Le attività non verranno eliminate e passeranno in “Senza gruppo”.`)) return;
      try {
        const result = await api(API, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'delete-activity-group', groupId })
        });
        boardCollapsedGroups = new Set(
          [...boardCollapsedGroups].filter((key) => !key.endsWith(`|${groupId}`))
        );
        persistBoardCollapsedGroups();
        await loadSnapshot();
        setStatus(activityGroupStatus, `Gruppo eliminato. ${result?.group?.activitiesUngrouped || 0} attività spostate in “Senza gruppo”.`, 'success');
      } catch (error) {
        alert(error.message);
      }
    }
  });

  activityCatalog?.addEventListener('input', (event) => {
    const rowNode = event.target.closest('[data-activity-row]');
    if (!rowNode || !event.target.matches('[data-activity-name]')) return;
    const status = rowNode.querySelector('[data-row-status]');
    if (status) status.className = 'row-save-status';
    refreshActivityRowDirtyState(rowNode);
  });

  activityCatalog?.addEventListener('change', (event) => {
    const rowNode = event.target.closest('[data-activity-row]');
    if (!rowNode || !event.target.matches('[data-activity-group]')) return;
    const status = rowNode.querySelector('[data-row-status]');
    if (status) status.className = 'row-save-status';
    refreshActivityRowDirtyState(rowNode);
  });

  activitySaveAll?.addEventListener('click', async () => {
    if (!activityCatalog) return;
    captureActivityCatalogDrafts();

    const rows = [...activityCatalog.querySelectorAll('[data-activity-row]')]
      .filter((row) => row.dataset.activityId && activityRowIsDirty(row));

    if (!rows.length) {
      updateActivityBulkSaveState();
      return;
    }

    const payloads = rows.map((rowNode) => ({
      rowNode,
      activityId: rowNode.dataset.activityId,
      name: rowNode.querySelector('[data-activity-name]')?.value.trim() || '',
      groupId: rowNode.querySelector('[data-activity-group]')?.value || null
    }));

    const invalid = payloads.find((item) => !item.name);
    if (invalid) {
      const status = invalid.rowNode.querySelector('[data-row-status]');
      if (status) {
        status.textContent = 'Indica il nome dell’attività.';
        status.className = 'row-save-status is-error';
      }
      invalid.rowNode.querySelector('[data-activity-name]')?.focus();
      return;
    }

    setStatus(activityCatalogStatus, `Salvataggio di ${payloads.length} modifiche…`);
    payloads.forEach((item) => setRowBusy(item.rowNode, true));
    try {
      await withButtonBusy(activitySaveAll, 'Salvataggio…', async () => {
        let saved = 0;
        const failures = [];

        for (const item of payloads) {
          const status = item.rowNode.querySelector('[data-row-status]');
          try {
            await api(API, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                action: 'save-activity',
                activityId: item.activityId,
                name: item.name,
                groupId: item.groupId
              })
            });
            item.rowNode.dataset.initialName = item.name;
            item.rowNode.dataset.initialGroupId = item.groupId || '';
            activityDrafts.delete(item.activityId);
            item.rowNode.classList.remove('is-dirty-row');
            if (status) {
              status.textContent = 'Salvata';
              status.className = 'row-save-status is-ok';
            }
            saved += 1;
          } catch (error) {
            failures.push({ item, error });
            if (status) {
              status.textContent = error.message;
              status.className = 'row-save-status is-error';
            }
          }
        }

        if (!failures.length) {
          await loadSnapshot();
          setStatus(activityCatalogStatus, `${saved} ${saved === 1 ? 'modifica salvata' : 'modifiche salvate'}.`, 'success');
        } else {
          updateActivityBulkSaveState();
          setStatus(
            activityCatalogStatus,
            `${saved} salvate, ${failures.length} non salvate. Correggi le righe evidenziate e riprova.`,
            'error'
          );
        }
      });
    } finally {
      payloads.forEach((item) => {
        if (item.rowNode.isConnected) setRowBusy(item.rowNode, false);
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
        newActivityDraft = { name: '', groupId: '' };
        renderActivityCatalog();
      });
      return;
    }
    if (save) {
      syncActivityRowDraft(rowNode);
      const activityId = rowNode.dataset.activityId || null;
      const name = rowNode.querySelector('[data-activity-name]')?.value.trim() || '';
      const groupId = rowNode.querySelector('[data-activity-group]')?.value || null;
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
              body: JSON.stringify({ action: 'save-activity', activityId, name, groupId })
            });
            if (activityId) {
              rowNode.dataset.initialName = name;
              rowNode.dataset.initialGroupId = groupId || '';
              activityDrafts.delete(activityId);
            } else {
              newActivityOpen = false;
              newActivityDraft = { name: '', groupId: '' };
            }
            await loadSnapshot();
            setStatus(activityCatalogStatus, 'Attività salvata.', 'success');
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
        activityDrafts.delete(rowNode.dataset.activityId);
        rowNode.remove();
        await loadSnapshot();
      } catch (error) { alert(error.message); }
    }
  });

  requirementCatalog?.addEventListener('change', (event) => {
    if (!event.target.matches('[data-requirement-shift], [data-requirement-activity]')) return;
    refreshRequirementNewFields(event.target.closest('[data-requirement-row]'));
  });

  requirementCatalog?.addEventListener('click', async (event) => {
    const rowNode = event.target.closest('[data-requirement-row]');
    if (!rowNode) return;
    const save = event.target.closest('[data-save-requirement]');
    const remove = event.target.closest('[data-delete-requirement]');
    const cancel = event.target.closest('[data-cancel-new-requirement]');
    const status = rowNode.querySelector('[data-row-status]');

    if (cancel) {
      newRequirementOpen = false;
      renderRequirementCatalog();
      return;
    }

    if (save) {
      const shiftChoice = rowNode.querySelector('[data-requirement-shift]')?.value || '';
      const activityChoice = rowNode.querySelector('[data-requirement-activity]')?.value || '';
      const requiredCount = Number(rowNode.querySelector('[data-requirement-count]')?.value || 0);
      const createShift = shiftChoice === '__new__';
      const createActivity = activityChoice === '__new__';
      const newShiftDate = rowNode.querySelector('[data-new-shift-date]')?.value || '';
      const newShiftStart = rowNode.querySelector('[data-new-shift-start]')?.value || '';
      const newShiftEnd = rowNode.querySelector('[data-new-shift-end]')?.value || '';
      const newActivityName = rowNode.querySelector('[data-new-activity-name]')?.value.trim() || '';

      if ((!shiftChoice || (!createShift && shiftChoice === '__new__'))
        || (!activityChoice || (!createActivity && activityChoice === '__new__'))
        || !Number.isInteger(requiredCount) || requiredCount < 1) {
        status.textContent = 'Seleziona turno, attività e un numero di persone valido.';
        status.className = 'row-save-status is-error';
        return;
      }
      if (createShift && (!newShiftDate || !newShiftStart || !newShiftEnd)) {
        status.textContent = 'Per il nuovo turno indica data, ora di inizio e ora di fine.';
        status.className = 'row-save-status is-error';
        return;
      }
      if (createShift && newShiftEnd <= newShiftStart) {
        status.textContent = 'L’ora di fine deve essere successiva all’ora di inizio.';
        status.className = 'row-save-status is-error';
        return;
      }
      if (createActivity && !newActivityName) {
        status.textContent = 'Indica il nome della nuova attività.';
        status.className = 'row-save-status is-error';
        return;
      }

      setRowBusy(rowNode, true, save);
      try {
        await withButtonBusy(save, 'Salvataggio…', async () => {
          try {
            const result = await api(API, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                action: 'save-requirement',
                requirementId: rowNode.dataset.requirementId || null,
                shiftId: createShift ? null : shiftChoice,
                newShiftDate: createShift ? newShiftDate : null,
                newShiftStart: createShift ? newShiftStart : null,
                newShiftEnd: createShift ? newShiftEnd : null,
                activityId: createActivity ? null : activityChoice,
                newActivityName: createActivity ? newActivityName : null,
                requiredCount
              })
            });

            newRequirementOpen = false;
            await loadSnapshot();

            const messages = ['Abbinamento salvato'];
            if (result?.planning?.shiftCreated) messages.push('nuovo turno creato');
            if (result?.planning?.activityCreated) messages.push('nuova attività creata');
            else if (result?.planning?.activityReactivated) messages.push('attività riattivata');
            if (result?.requirement?.movedAssignments) {
              messages.push(`${result.requirement.movedAssignments} assegnazioni spostate`);
            }
            setStatus(requirementStatus, messages.join(' · ') + '.', 'success');
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
      const requirement = requirementById(rowNode.dataset.requirementId || '');
      if (!requirement) return;
      if (!confirm(`Eliminare l’abbinamento “${requirementLabel(requirement)}”? È possibile solo se non ci sono persone assegnate.`)) return;
      try {
        await api(API, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'delete-requirement', requirementId: requirement.id })
        });
        await loadSnapshot();
        setStatus(requirementStatus, 'Abbinamento eliminato.', 'success');
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

  confirmationChanges?.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-copy-review-link]');
    if (!button) return;
    await copyReviewLink(button.dataset.copyReviewLink || '', button);
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

  detailContent?.addEventListener('click', async (event) => {
    const copySave = event.target.closest('[data-copy-from-save]');
    if (copySave) {
      await copyPeopleToRequirement(copySave);
      return;
    }

    const personLink = event.target.closest('[data-open-person-activities]');
    if (personLink) {
      showPersonActivitiesPopup(personLink.dataset.openPersonActivities);
      return;
    }

    const pick = event.target.closest('[data-pick-shift-requirement]');
    if (!pick || !detailTargetRow) return;
    const value = pick.dataset.pickShiftRequirement || '';
    const select = detailTargetRow.querySelector('[data-inline-requirement]');
    if (!select || ![...select.options].some((option) => option.value === value)) return;

    select.value = value;
    refreshRowWarnings(detailTargetRow);
    const status = detailTargetRow.querySelector('[data-row-status]');
    if (status) {
      status.textContent = 'Coppia turno-attività selezionata. Premi Salva.';
      status.className = 'row-save-status is-ok';
    }
    detailDialog.close();
  });
  detailContent?.addEventListener('change', (event) => {
    const sourceSelect = event.target.closest('[data-copy-source-requirement-select]');
    if (sourceSelect) {
      const targetRequirement = requirementById(copyRequirementContext);
      if (targetRequirement) renderCopyFromDialog(targetRequirement, sourceSelect.value || '');
      return;
    }

    const selectAll = event.target.closest('[data-copy-source-all]');
    if (selectAll) {
      const sourceRequirementId = selectAll.dataset.copySourceAll || '';
      detailContent.querySelectorAll(`[data-copy-person][data-copy-source-requirement="${CSS.escape(sourceRequirementId)}"]:not(:disabled)`).forEach((input) => {
        input.checked = selectAll.checked;
      });
      refreshCopyFromCount();
      return;
    }

    if (event.target.matches('[data-copy-person]')) {
      const sourceRequirementId = event.target.dataset.copySourceRequirement || '';
      const items = [...detailContent.querySelectorAll(`[data-copy-person][data-copy-source-requirement="${CSS.escape(sourceRequirementId)}"]:not(:disabled)`)];
      const selectAllForGroup = detailContent.querySelector(`[data-copy-source-all="${CSS.escape(sourceRequirementId)}"]`);
      if (selectAllForGroup) {
        selectAllForGroup.checked = Boolean(items.length) && items.every((input) => input.checked);
        selectAllForGroup.indeterminate = items.some((input) => input.checked) && !items.every((input) => input.checked);
      }
      refreshCopyFromCount();
    }
  });

  document.querySelectorAll('[data-detail-close]').forEach((button) => button.addEventListener('click', () => detailDialog.close()));
  detailDialog?.addEventListener('click', (event) => { if (event.target === detailDialog) detailDialog.close(); });
  detailDialog?.addEventListener('close', () => {
    detailTargetRow = null;
    copyRequirementContext = null;
  });
  personActivitiesContent?.addEventListener('click', async (event) => {
    const responsible = event.target.closest('[data-person-responsible-assignment]');
    if (responsible) {
      const assignmentId = responsible.dataset.personResponsibleAssignment || '';
      const next = responsible.dataset.personResponsibleNext === 'true';
      const row = (snapshot?.assignments || []).find((item) => item.id === assignmentId);
      if (!row) return;
      const statusNode = personActivitiesContent.querySelector('[data-person-activities-status]');
      const ok = await updateBoardResponsible(assignmentId, next, responsible, statusNode);
      if (ok) showPersonActivitiesPopup(row.personId, assignmentId);
      return;
    }

    const move = event.target.closest('[data-person-move-assignment]');
    if (move) {
      await movePersonAssignmentFromPopup(move.dataset.personMoveAssignment || '', move);
      return;
    }

    const openAdd = event.target.closest('[data-person-add-activity-open]');
    if (openAdd) {
      const form = personActivitiesContent.querySelector('[data-person-add-activity-form]');
      if (form) {
        form.hidden = false;
        openAdd.hidden = true;
        refreshPersonAddWarning();
        form.querySelector('[data-person-add-requirement]')?.focus();
      }
      return;
    }

    const cancelAdd = event.target.closest('[data-person-add-cancel]');
    if (cancelAdd) {
      const form = personActivitiesContent.querySelector('[data-person-add-activity-form]');
      const open = personActivitiesContent.querySelector('[data-person-add-activity-open]');
      if (form) form.hidden = true;
      if (open) open.hidden = false;
      setStatus(personActivitiesContent.querySelector('[data-person-add-status]'), '');
      return;
    }

    const saveAdd = event.target.closest('[data-person-add-save]');
    if (saveAdd) {
      await addPersonActivityFromPopup(saveAdd);
    }
  });

  personActivitiesContent?.addEventListener('change', (event) => {
    if (event.target.matches('[data-person-add-requirement]')) {
      refreshPersonAddWarning();
      return;
    }

    const rowNode = event.target.closest('[data-person-assignment-row]');
    if (rowNode && event.target.matches('[data-person-move-requirement]')) {
      const assignmentId = rowNode.dataset.personAssignmentRow || '';
      const row = (snapshot?.assignments || []).find((item) => item.id === assignmentId);
      if (row) refreshPersonMoveWarning(rowNode, row);
    }
  });

  document.querySelectorAll('[data-person-activities-close]').forEach((button) => button.addEventListener('click', () => personActivitiesDialog?.close()));
  personActivitiesDialog?.addEventListener('click', (event) => { if (event.target === personActivitiesDialog) personActivitiesDialog.close(); });

  boardEditContent?.addEventListener('change', (event) => {
    if (event.target.matches('[data-board-edit-person]')) {
      refreshBoardEditWarnings();
      refreshBoardEditPersonActivities();
      return;
    }
    if (event.target.matches('[data-board-edit-requirement]')) refreshBoardEditWarnings();
  });
  boardEditSave?.addEventListener('click', saveBoardEdit);
  boardEditDelete?.addEventListener('click', deleteBoardEdit);
  boardEditHistory?.addEventListener('click', async () => {
    const source = boardEditSource();
    if (!source) return;
    boardEditDialog?.close();
    boardEditContext = null;
    try { await showAudit(source.personId, source.personName || 'Persona'); }
    catch (error) { alert(error.message); }
  });
  document.querySelectorAll('[data-board-edit-close]').forEach((button) =>
    button.addEventListener('click', () => boardEditDialog?.close())
  );
  boardEditDialog?.addEventListener('click', (event) => { if (event.target === boardEditDialog) boardEditDialog.close(); });
  boardEditDialog?.addEventListener('close', () => {
    boardEditContext = null;
    setStatus(boardEditStatus, '');
  });
    document.querySelectorAll('[data-audit-close]').forEach((button) => button.addEventListener('click', () => auditDialog.close()));
  auditDialog?.addEventListener('click', (event) => { if (event.target === auditDialog) auditDialog.close(); });

  initMultiFilters();
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.multi-filter')) closeMultiFilters();
    if (!event.target.closest('.person-search-select')) closePersonSearchSelects();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMultiFilters();
      closePersonSearchSelects();
    }
  });

  credentials = storedCredentials();
  if (credentials) {
    loadSnapshot().then(showDashboard).catch(() => { clearCredentials(); showLogin('La sessione amministrativa non è più valida.'); });
  }
})();
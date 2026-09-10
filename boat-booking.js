(() => {
  const form = document.querySelector('[data-booking-form]');
  if (!form) return;

  const mode = form.dataset.mode === 'edit' ? 'edit' : 'create';
  const api = '/api/boat-bookings';
  const availabilityApi = '/api/boat-availability';

  const slots = [
    ['1300', '13:00–13:20'], ['1330', '13:30–13:50'], ['1400', '14:00–14:20'], ['1430', '14:30–14:50'],
    ['1500', '15:00–15:20'], ['1530', '15:30–15:50'], ['1600', '16:00–16:20'], ['1630', '16:30–16:50']
  ];
  const builders = ['LOVA', 'Swift'];
  const boatTypes = ['C1x', 'C2x', 'C4x+'];

  const status = form.querySelector('[data-booking-status]');
  const loading = document.querySelector('[data-booking-loading]');
  const formShell = document.querySelector('[data-booking-shell]');
  const success = document.querySelector('[data-booking-success]');
  const successText = success?.querySelector('[data-success-text]');
  const successLink = success?.querySelector('[data-success-link]');
  const successCode = success?.querySelector('[data-success-code]');
  const successBoats = success?.querySelector('[data-success-boats]');
  const closedNotice = document.querySelector('[data-booking-closed]');
  const closedText = closedNotice?.querySelector('[data-booking-closed-text]');
  const modeSwitch = form.querySelector('[data-mode-switch]');
  const slotFlow = form.querySelector('[data-slot-flow]');
  const boatFlow = form.querySelector('[data-boat-flow]');
  const slotSelect = form.querySelector('[name="slotCode"]');
  const builderFirst = form.querySelector('[data-builder-first]');
  const typeFirst = form.querySelector('[data-type-first]');
  const slotOptions = form.querySelector('[data-slot-options]');
  const inventoryPanel = form.querySelector('[data-inventory-panel]');
  const inventoryTitle = form.querySelector('[data-inventory-title]');
  const inventoryGrid = form.querySelector('[data-inventory-grid]');
  const submit = form.querySelector('[type="submit"]');

  const lookupForm = document.querySelector('[data-booking-lookup]');
  const lookupStatus = document.querySelector('[data-lookup-status]');
  const lookupResult = document.querySelector('[data-lookup-result]');

  let availability = [];
  let settings = { bookingOpen: true, bookingCutoffAt: null };
  let selectedSlot = '';
  let token = '';
  let desiredItems = new Map();
  let assignedNumbers = new Map();

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function setStatus(message = '', kind = '') {
    if (!status) return;
    status.textContent = message;
    status.className = `booking-status${kind ? ` is-${kind}` : ''}`;
  }

  function setLookupStatus(message = '', kind = '') {
    if (!lookupStatus) return;
    lookupStatus.textContent = message;
    lookupStatus.className = `booking-status${kind ? ` is-${kind}` : ''}`;
  }

  async function requestJson(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: { 'content-type': 'application/json', ...(options.headers || {}) }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.error || 'Operazione non riuscita.');
      error.code = payload.code;
      throw error;
    }
    return payload;
  }

  function slotLabel(code) {
    return slots.find(([slotCode]) => slotCode === code)?.[1] || code;
  }

  function rowFor(slotCode, builder, boatType) {
    return availability.find(
      (row) => row.slotCode === slotCode && row.builder === builder && row.boatType === boatType
    );
  }

  function itemKey(builder, boatType) {
    return `${builder}|${boatType}`;
  }

  function formatCutoff(value) {
    if (!value) return '';
    try {
      return new Intl.DateTimeFormat('it-IT', {
        timeZone: 'Europe/Rome',
        dateStyle: 'long',
        timeStyle: 'short'
      }).format(new Date(value));
    } catch {
      return value;
    }
  }

  function setFormDisabled(disabled) {
    form.querySelectorAll('input, select, button').forEach((element) => {
      element.disabled = disabled;
    });
  }

  function applySettings(nextSettings, canEdit = null) {
    settings = { ...settings, ...(nextSettings || {}) };
    const open = canEdit === null ? settings.bookingOpen !== false : Boolean(canEdit);

    if (open) {
      if (closedNotice) closedNotice.hidden = true;
      return;
    }

    if (closedNotice) {
      closedNotice.hidden = false;
      if (closedText) {
        const deadline = formatCutoff(settings.bookingCutoffAt);
        closedText.textContent = deadline
          ? `Le prenotazioni e le modifiche online si sono chiuse il ${deadline}. La prenotazione resta consultabile; per variazioni contatta l’organizzazione.`
          : 'Le prenotazioni e le modifiche online sono chiuse. La prenotazione resta consultabile; per variazioni contatta l’organizzazione.';
      }
    }

    setFormDisabled(true);
  }

  function snapshotQuantities() {
    inventoryGrid?.querySelectorAll('[data-qty]').forEach((select) => {
      const quantity = Number(select.value || 0);
      const key = itemKey(select.dataset.builder, select.dataset.boatType);
      if (quantity > 0) desiredItems.set(key, quantity);
      else desiredItems.delete(key);
    });
  }

  function setSelectedSlot(code, { scroll = false, preserveItems = false } = {}) {
    if (selectedSlot && selectedSlot !== code && !preserveItems) {
      desiredItems = new Map();
      assignedNumbers = new Map();
    } else {
      snapshotQuantities();
    }

    selectedSlot = code;
    if (slotSelect) slotSelect.value = code;
    renderInventory();
    renderBoatFirstSlots();

    if (scroll && inventoryPanel) {
      inventoryPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function renderInventory() {
    if (!inventoryGrid || !inventoryPanel) return;

    if (!selectedSlot) {
      inventoryPanel.hidden = true;
      inventoryGrid.innerHTML = '';
      return;
    }

    inventoryPanel.hidden = false;
    if (inventoryTitle) inventoryTitle.textContent = `Disponibilità ${slotLabel(selectedSlot)}`;

    inventoryGrid.innerHTML = builders.flatMap((builder) => boatTypes.map((boatType) => {
      const row = rowFor(selectedSlot, builder, boatType);
      const remaining = Math.max(0, Number(row?.remaining || 0));
      const key = itemKey(builder, boatType);
      const wanted = Math.min(Number(desiredItems.get(key) || 0), remaining);

      if (wanted > 0) desiredItems.set(key, wanted);
      else desiredItems.delete(key);

      const options = Array.from({ length: remaining + 1 }, (_, index) =>
        `<option value="${index}"${index === wanted ? ' selected' : ''}>${index}</option>`
      ).join('');

      const numbers = assignedNumbers.get(key) || [];
      const assignment = mode === 'edit' && numbers.length
        ? `<div class="inventory-assigned"><strong>Barche assegnate:</strong> ${numbers.map(escapeHtml).join(', ')}</div>`
        : '';

      return `
        <article class="inventory-card${remaining === 0 ? ' is-full' : ''}">
          <div class="inventory-card__top">
            <div class="inventory-card__name"><strong>${builder}</strong><small>${boatType}</small></div>
            <span class="inventory-remaining${remaining === 0 ? ' is-full' : ''}">${remaining === 0 ? 'COMPLETO' : `${remaining} disponibil${remaining === 1 ? 'e' : 'i'}`}</span>
          </div>
          ${assignment}
          <div class="inventory-qty">
            <label for="qty-${selectedSlot}-${builder}-${boatType.replace('+', 'plus')}">Quantità</label>
            <select id="qty-${selectedSlot}-${builder}-${boatType.replace('+', 'plus')}" data-qty data-builder="${builder}" data-boat-type="${boatType}" ${remaining === 0 ? 'disabled' : ''}>${options}</select>
          </div>
        </article>`;
    })).join('');

    if (settings.bookingOpen === false) setFormDisabled(true);
  }

  function renderBoatFirstSlots() {
    if (!slotOptions) return;

    const builder = builderFirst?.value || '';
    const boatType = typeFirst?.value || '';

    if (!builder || !boatType) {
      slotOptions.innerHTML = '<div class="booking-empty" style="grid-column:1/-1">Scegli cantiere e tipo di barca per vedere gli slot disponibili.</div>';
      return;
    }

    slotOptions.innerHTML = slots.map(([code, label]) => {
      const remaining = Math.max(0, Number(rowFor(code, builder, boatType)?.remaining || 0));
      return `<button class="slot-option${selectedSlot === code ? ' is-selected' : ''}" type="button" data-slot-choice="${code}" ${remaining === 0 || settings.bookingOpen === false ? 'disabled' : ''}>
        <strong>${label}</strong><span>${remaining === 0 ? 'COMPLETO' : `${remaining} disponibili`}</span>
      </button>`;
    }).join('');
  }

  function setStartMode(next) {
    modeSwitch?.querySelectorAll('[data-start-mode]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.startMode === next);
    });
    if (slotFlow) slotFlow.hidden = next !== 'slot';
    if (boatFlow) boatFlow.hidden = next !== 'boat';
    if (next === 'boat') renderBoatFirstSlots();
  }

  function fillBooking(booking) {
    form.elements.society.value = booking.society || '';
    form.elements.contactSurname.value = booking.contactSurname || '';
    form.elements.contactName.value = booking.contactName || '';
    form.elements.phone.value = booking.phone || '';
    form.elements.email.value = booking.email || '';

    selectedSlot = booking.slotCode || '';
    if (slotSelect) slotSelect.value = selectedSlot;

    desiredItems = new Map();
    assignedNumbers = new Map();

    for (const item of booking.items || []) {
      const key = itemKey(item.builder, item.boatType);
      desiredItems.set(key, Number(item.quantity));
      assignedNumbers.set(key, Array.isArray(item.boatNumbers) ? item.boatNumbers : []);
    }

    renderInventory();
    renderBoatFirstSlots();
  }

  function selectedItems() {
    snapshotQuantities();
    return Array.from(desiredItems.entries())
      .map(([key, quantity]) => {
        const [builder, boatType] = key.split('|');
        return { builder, boatType, quantity };
      })
      .filter((item) => item.quantity > 0);
  }

  function formPayload(action) {
    return {
      action,
      token: mode === 'edit' ? token : undefined,
      society: form.elements.society.value,
      contactSurname: form.elements.contactSurname.value,
      contactName: form.elements.contactName.value,
      phone: form.elements.phone.value,
      email: form.elements.email.value,
      slotCode: selectedSlot,
      items: selectedItems(),
      privacyAccepted: form.elements.privacyAccepted.checked,
      website: form.elements.website.value
    };
  }

  function boatsSummaryHtml(booking) {
    return (booking.items || []).map((item) => {
      const numbers = Array.isArray(item.boatNumbers) && item.boatNumbers.length
        ? `<span>Barche assegnate: <strong>${item.boatNumbers.map(escapeHtml).join(', ')}</strong></span>`
        : '';
      return `<li><strong>${escapeHtml(item.builder)} ${escapeHtml(item.boatType)}</strong> × ${Number(item.quantity)}${numbers}</li>`;
    }).join('');
  }

  function showSuccess(payload, updated = false) {
    if (!success) return;

    success.hidden = false;

    if (successText) {
      successText.textContent = payload.warning || (updated
        ? 'La prenotazione è stata aggiornata. Abbiamo inviato il riepilogo aggiornato via email.'
        : 'La prenotazione è confermata. Abbiamo inviato il riepilogo, il codice prenotazione e il link personale di modifica via email.');
    }

    if (successCode) {
      successCode.textContent = payload.booking?.bookingCode || '';
      successCode.closest('[data-success-code-wrap]')?.toggleAttribute('hidden', !payload.booking?.bookingCode);
    }

    if (successBoats) {
      successBoats.innerHTML = boatsSummaryHtml(payload.booking || {});
    }

    if (successLink) {
      if (payload.editLink && payload.canEdit !== false && settings.bookingOpen !== false) {
        successLink.href = payload.editLink;
        successLink.hidden = false;
      } else {
        successLink.hidden = true;
      }
    }

    success.classList.toggle('is-warning', Boolean(payload.warning));
    success.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function renderLookup(booking) {
    if (!lookupResult) return;

    lookupResult.hidden = false;
    lookupResult.innerHTML = `
      <div class="lookup-result__head">
        <div><small>Codice prenotazione</small><strong>${escapeHtml(booking.bookingCode)}</strong></div>
        <span class="booking-chip booking-chip--light">${escapeHtml(booking.slotLabel)}</span>
      </div>
      <div class="lookup-result__details">
        <p><strong>Società</strong><br>${escapeHtml(booking.society)}</p>
        <p><strong>Referente</strong><br>${escapeHtml(booking.contactSurname)} ${escapeHtml(booking.contactName)}</p>
        <p><strong>Telefono</strong><br>${escapeHtml(booking.phone)}</p>
        <p><strong>Email</strong><br>${escapeHtml(booking.email)}</p>
      </div>
      <div class="lookup-result__boats">
        <strong>Barche assegnate</strong>
        <ul>${boatsSummaryHtml(booking)}</ul>
      </div>`;
  }

  async function load() {
    try {
      if (mode === 'edit') {
        token = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('token') || '';
        if (!token) {
          throw new Error('Il link di modifica non contiene un token valido. Usa il link ricevuto via email.');
        }

        const payload = await requestJson(api, {
          method: 'POST',
          body: JSON.stringify({ action: 'get', token })
        });

        availability = payload.availability || [];
        settings = payload.settings || settings;
        fillBooking(payload.booking);

        if (modeSwitch) modeSwitch.hidden = true;
        if (slotFlow) slotFlow.hidden = false;

        applySettings(settings, payload.canEdit);
      } else {
        const payload = await requestJson(availabilityApi, { method: 'GET' });
        availability = payload.availability || [];
        settings = payload.settings || settings;
        applySettings(settings);
      }

      if (loading) loading.hidden = true;
      if (formShell) formShell.hidden = false;
      renderBoatFirstSlots();
    } catch (error) {
      if (loading) loading.textContent = error.message;
      setStatus(error.message, 'error');
    }
  }

  modeSwitch?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-start-mode]');
    if (!button || settings.bookingOpen === false) return;
    setStartMode(button.dataset.startMode);
  });

  slotSelect?.addEventListener('change', () => setSelectedSlot(slotSelect.value));
  builderFirst?.addEventListener('change', renderBoatFirstSlots);
  typeFirst?.addEventListener('change', renderBoatFirstSlots);

  slotOptions?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-slot-choice]');
    if (!button || button.disabled || settings.bookingOpen === false) return;

    const builder = builderFirst?.value || '';
    const boatType = typeFirst?.value || '';
    setSelectedSlot(button.dataset.slotChoice);

    if (builder && boatType && Number(rowFor(selectedSlot, builder, boatType)?.remaining || 0) > 0) {
      desiredItems.set(itemKey(builder, boatType), 1);
      renderInventory();
    }

    inventoryPanel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  inventoryGrid?.addEventListener('change', snapshotQuantities);

  lookupForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    setLookupStatus();
    if (lookupResult) lookupResult.hidden = true;

    const bookingCode = lookupForm.elements.bookingCode.value;
    const button = lookupForm.querySelector('button[type="submit"]');
    button.disabled = true;

    try {
      const payload = await requestJson(api, {
        method: 'POST',
        body: JSON.stringify({ action: 'lookup', bookingCode })
      });
      renderLookup(payload.booking);
      setLookupStatus('Prenotazione trovata.', 'ok');
    } catch (error) {
      setLookupStatus(error.message, 'error');
    } finally {
      button.disabled = false;
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus();

    if (settings.bookingOpen === false) {
      return setStatus('Le prenotazioni e le modifiche online sono chiuse.', 'error');
    }
    if (!selectedSlot) return setStatus('Seleziona uno slot.', 'error');
    if (!selectedItems().length) return setStatus('Seleziona almeno una barca.', 'error');

    submit.disabled = true;
    submit.textContent = mode === 'edit' ? 'Salvataggio…' : 'Prenotazione…';

    try {
      const payload = await requestJson(api, {
        method: 'POST',
        body: JSON.stringify(formPayload(mode === 'edit' ? 'update' : 'create'))
      });

      if (payload.availability) availability = payload.availability;
      if (payload.settings) settings = payload.settings;
      if (payload.booking) fillBooking(payload.booking);

      showSuccess(payload, mode === 'edit');
      setStatus(
        payload.warning || (mode === 'edit' ? 'Modifica salvata.' : 'Prenotazione confermata.'),
        payload.warning ? 'warning' : 'ok'
      );

      if (mode === 'create') {
        setFormDisabled(true);
      } else {
        applySettings(settings, payload.canEdit);
        renderInventory();
      }
    } catch (error) {
      setStatus(error.message, 'error');

      if (error.code === 'BOOKING_CLOSED') {
        settings.bookingOpen = false;
        applySettings(settings, false);
      }

      if (error.code === 'INSUFFICIENT_AVAILABILITY') {
        try {
          if (mode === 'edit') {
            const fresh = await requestJson(api, {
              method: 'POST',
              body: JSON.stringify({ action: 'get', token })
            });
            availability = fresh.availability || availability;
            settings = fresh.settings || settings;
            fillBooking(fresh.booking);
            applySettings(settings, fresh.canEdit);
          } else {
            const fresh = await requestJson(availabilityApi, { method: 'GET' });
            availability = fresh.availability || availability;
            settings = fresh.settings || settings;
            renderInventory();
            renderBoatFirstSlots();
            applySettings(settings);
          }
        } catch {}
      }
    } finally {
      if (settings.bookingOpen !== false && (mode === 'edit' || !form.querySelector(':disabled[name="society"]'))) {
        submit.disabled = false;
      }
      submit.textContent = mode === 'edit' ? 'Salva modifiche' : 'Conferma prenotazione';
    }
  });

  setStartMode('slot');
  load();
})();

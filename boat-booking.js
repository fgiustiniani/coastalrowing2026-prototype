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

  let availability = [];
  let selectedSlot = '';
  let startMode = 'slot';
  let token = '';
  let desiredItems = new Map();

  function setStatus(message = '', kind = '') {
    if (!status) return;
    status.textContent = message;
    status.className = `booking-status${kind ? ` is-${kind}` : ''}`;
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
    return availability.find((row) => row.slotCode === slotCode && row.builder === builder && row.boatType === boatType);
  }

  function itemKey(builder, boatType) {
    return `${builder}|${boatType}`;
  }

  function snapshotQuantities() {
    inventoryGrid?.querySelectorAll('[data-qty]').forEach((select) => {
      const quantity = Number(select.value || 0);
      const key = itemKey(select.dataset.builder, select.dataset.boatType);
      if (quantity > 0) desiredItems.set(key, quantity);
      else desiredItems.delete(key);
    });
  }

  function setSelectedSlot(code, { scroll = false } = {}) {
    snapshotQuantities();
    selectedSlot = code;
    if (slotSelect) slotSelect.value = code;
    renderInventory();
    renderBoatFirstSlots();
    if (scroll && inventoryPanel) inventoryPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      return `
        <article class="inventory-card${remaining === 0 ? ' is-full' : ''}">
          <div class="inventory-card__top">
            <div class="inventory-card__name"><strong>${builder}</strong><small>${boatType}</small></div>
            <span class="inventory-remaining${remaining === 0 ? ' is-full' : ''}">${remaining === 0 ? 'COMPLETO' : `${remaining} disponibil${remaining === 1 ? 'e' : 'i'}`}</span>
          </div>
          <div class="inventory-qty">
            <label for="qty-${selectedSlot}-${builder}-${boatType.replace('+','plus')}">Quantità</label>
            <select id="qty-${selectedSlot}-${builder}-${boatType.replace('+','plus')}" data-qty data-builder="${builder}" data-boat-type="${boatType}" ${remaining === 0 ? 'disabled' : ''}>${options}</select>
          </div>
        </article>`;
    })).join('');
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
      return `<button class="slot-option${selectedSlot === code ? ' is-selected' : ''}" type="button" data-slot-choice="${code}" ${remaining === 0 ? 'disabled' : ''}>
        <strong>${label}</strong><span>${remaining === 0 ? 'COMPLETO' : `${remaining} disponibili`}</span>
      </button>`;
    }).join('');
  }

  function setStartMode(next) {
    startMode = next;
    modeSwitch?.querySelectorAll('[data-start-mode]').forEach((button) => button.classList.toggle('is-active', button.dataset.startMode === next));
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
    desiredItems = new Map((booking.items || []).map((item) => [itemKey(item.builder, item.boatType), Number(item.quantity)]));
    renderInventory();
    renderBoatFirstSlots();
  }

  function selectedItems() {
    snapshotQuantities();
    return Array.from(desiredItems.entries()).map(([key, quantity]) => {
      const [builder, boatType] = key.split('|');
      return { builder, boatType, quantity };
    }).filter((item) => item.quantity > 0);
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

  function showSuccess(payload, updated = false) {
    if (!success) return;
    success.hidden = false;
    if (successText) {
      successText.textContent = payload.warning || (updated
        ? 'La prenotazione è stata aggiornata. Abbiamo inviato il riepilogo aggiornato via email.'
        : 'La prenotazione è confermata. Abbiamo inviato il riepilogo e il link personale di modifica via email.');
    }
    if (successLink) {
      if (payload.editLink) {
        successLink.href = payload.editLink;
        successLink.hidden = false;
      } else {
        successLink.hidden = true;
      }
    }
    success.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function load() {
    try {
      if (mode === 'edit') {
        token = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('token') || '';
        if (!token) throw new Error('Il link di modifica non contiene un token valido. Usa il link ricevuto via email.');
        const payload = await requestJson(api, { method: 'POST', body: JSON.stringify({ action: 'get', token }) });
        availability = payload.availability || [];
        fillBooking(payload.booking);
        if (modeSwitch) modeSwitch.hidden = true;
        if (slotFlow) slotFlow.hidden = false;
      } else {
        const payload = await requestJson(availabilityApi, { method: 'GET' });
        availability = payload.availability || [];
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
    if (!button) return;
    setStartMode(button.dataset.startMode);
  });

  slotSelect?.addEventListener('change', () => setSelectedSlot(slotSelect.value));
  builderFirst?.addEventListener('change', renderBoatFirstSlots);
  typeFirst?.addEventListener('change', renderBoatFirstSlots);
  slotOptions?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-slot-choice]');
    if (!button || button.disabled) return;
    setSelectedSlot(button.dataset.slotChoice, { scroll: true });
  });
  inventoryGrid?.addEventListener('change', snapshotQuantities);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus();
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
      if (payload.booking) fillBooking(payload.booking);
      showSuccess(payload, mode === 'edit');
      setStatus(payload.warning || (mode === 'edit' ? 'Modifica salvata.' : 'Prenotazione confermata.'), payload.warning ? 'warning' : 'ok');
      if (mode === 'create') {
        Array.from(form.elements).forEach((element) => { if (element.matches('input, select, button')) element.disabled = true; });
      } else {
        renderInventory();
      }
    } catch (error) {
      setStatus(error.message, 'error');
      if (error.code === 'INSUFFICIENT_AVAILABILITY' && mode === 'edit') {
        try {
          const fresh = await requestJson(api, { method: 'POST', body: JSON.stringify({ action: 'get', token }) });
          availability = fresh.availability || availability;
          fillBooking(fresh.booking);
        } catch {}
      }
    } finally {
      if (mode === 'edit' || !form.querySelector(':disabled[name="society"]')) submit.disabled = false;
      submit.textContent = mode === 'edit' ? 'Salva modifiche' : 'Conferma prenotazione';
    }
  });

  setStartMode('slot');
  load();
})();

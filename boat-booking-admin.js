(() => {
  const loginForm = document.querySelector('[data-admin-login]');
  const dashboard = document.querySelector('[data-admin-dashboard]');
  if (!loginForm || !dashboard) return;

  const api = '/api/boat-bookings-admin';
  const status = document.querySelector('[data-admin-status]');
  const loginStatus = document.querySelector('[data-login-status]');
  const matrix = document.querySelector('[data-admin-matrix]');
  const bookingsContainer = document.querySelector('[data-admin-bookings]');
  const slotsContainer = document.querySelector('[data-admin-slots]');
  const boatsContainer = document.querySelector('[data-boats-table]');
  const boatForm = document.querySelector('[data-boat-form]');
  const cutoffForm = document.querySelector('[data-cutoff-form]');
  const cutoffState = document.querySelector('[data-cutoff-state]');
  const societyFilter = document.querySelector('[data-filter-society]');
  const slotFilter = document.querySelector('[data-filter-slot]');
  const typeFilter = document.querySelector('[data-filter-type]');
  const builderFilter = document.querySelector('[data-filter-builder]');
  const refreshButton = document.querySelector('[data-admin-refresh]');
  const dialog = document.querySelector('[data-edit-dialog]');
  const editForm = document.querySelector('[data-edit-form]');
  const editInventory = document.querySelector('[data-edit-inventory]');

  const slots = [
    ['1400', '14:00–14:20'], ['1430', '14:30–14:50'], ['1500', '15:00–15:20'], ['1530', '15:30–15:50'],
    ['1600', '16:00–16:20'], ['1630', '16:30–16:50'], ['1700', '17:00–17:20'], ['1730', '17:30–17:50'],
    ['1800', '18:00–18:20']
  ];
  const builders = ['LOVA', 'Swift'];
  const boatTypes = ['C1x', 'C2x', 'C4x+'];

  let credentials = null;
  let data = { bookings: [], availability: [], boats: [], slots: [], settings: {} };
  let editing = null;
  let editingQuantities = new Map();

  function setText(node, message = '', kind = '') {
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

  async function adminRequest(action, payload = {}) {
    const response = await fetch(api, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: authHeader()
      },
      body: JSON.stringify({ action, ...payload })
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(body.error || 'Operazione non riuscita.');
      error.code = body.code;
      throw error;
    }
    return body;
  }

  function slotInfo(code) {
    return (data.slots || []).find((slot) => slot.code === code) || null;
  }

  function slotLabel(code) {
    return slotInfo(code)?.label || slots.find(([value]) => value === code)?.[1] || code;
  }

  function activeBookingsForSlot(code) {
    return (data.bookings || []).filter((booking) => booking.slotCode === code).length;
  }

  function availabilityRow(slotCode, builder, boatType) {
    return data.availability.find(
      (row) => row.slotCode === slotCode && row.builder === builder && row.boatType === boatType
    );
  }

  function itemKey(builder, boatType) {
    return `${builder}|${boatType}`;
  }

  function formatDate(value) {
    return value
      ? new Intl.DateTimeFormat('it-IT', {
          timeZone: 'Europe/Rome',
          dateStyle: 'short',
          timeStyle: 'short'
        }).format(new Date(value))
      : '—';
  }

  function toRomeLocalInput(value) {
    if (!value) return '';
    try {
      return new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Europe/Rome',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(new Date(value)).replace(' ', 'T');
    } catch {
      return '';
    }
  }

  function boatSummary(item) {
    const numbers = Array.isArray(item.boatNumbers) && item.boatNumbers.length
      ? ` — barche ${item.boatNumbers.map(escapeHtml).join(', ')}`
      : '';
    return `${escapeHtml(item.builder)} ${escapeHtml(item.boatType)} × ${Number(item.quantity)}${numbers}`;
  }

  function renderSlots() {
    if (!slotsContainer) return;

    const source = data.slots?.length
      ? data.slots
      : slots.map(([code, label], index) => ({ code, label, sortOrder: index + 1, active: true }));

    slotsContainer.innerHTML = source.map((slot) => {
      const bookingCount = activeBookingsForSlot(slot.code);
      const canClose = slot.active && bookingCount === 0;
      const nextActive = !slot.active;
      const actionDisabled = slot.active && !canClose;
      const actionTitle = actionDisabled
        ? 'Lo slot contiene prenotazioni attive: spostale o eliminale prima di chiuderlo.'
        : '';

      return `
        <div class="admin-slot${slot.active ? '' : ' is-inactive'}" data-slot-code="${escapeHtml(slot.code)}">
          <div class="admin-slot__time">
            <strong>${escapeHtml(slot.label || slotLabel(slot.code))}</strong>
            <small>Codice ${escapeHtml(slot.code)}</small>
          </div>
          <span class="admin-slot__state${slot.active ? '' : ' is-inactive'}">${slot.active ? 'Aperto' : 'Chiuso'}</span>
          <span class="admin-slot__count">${bookingCount} prenotazion${bookingCount === 1 ? 'e' : 'i'}</span>
          <div class="admin-slot__action">
            <button class="admin-button${slot.active ? ' admin-button--danger' : ' admin-button--primary'}" type="button" data-slot-action="toggle" data-next-active="${nextActive}" ${actionDisabled ? `disabled title="${escapeHtml(actionTitle)}"` : ''}>${slot.active ? 'Chiudi slot' : 'Riapri slot'}</button>
          </div>
        </div>`;
    }).join('');
  }

  function syncEditSlotOptions() {
    const select = editForm?.elements.slotCode;
    if (!select) return;

    Array.from(select.options).forEach((option) => {
      const info = slotInfo(option.value);
      if (!info) return;
      option.disabled = !info.active && option.value !== editing?.slotCode;
      option.textContent = `${info.label}${info.active ? '' : ' — chiuso'}`;
    });
  }

  function renderMatrix() {
    if (!matrix) return;
    const columns = builders.flatMap((builder) => boatTypes.map((boatType) => [builder, boatType]));

    matrix.innerHTML = `
      <table class="admin-matrix">
        <thead>
          <tr>
            <th>Slot</th>
            ${columns.map(([builder, type]) => `<th>${builder}<br><small>${type}</small></th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${slots.map(([code, label]) => {
            const info = slotInfo(code);
            const isInactive = info?.active === false;
            return `
            <tr>
              <th>${escapeHtml(info?.label || label)}${isInactive ? '<br><small>CHIUSO</small>' : ''}</th>
              ${columns.map(([builder, type]) => {
                const row = availabilityRow(code, builder, type) || { booked: 0, capacity: 0, remaining: 0 };
                const noBoats = Number(row.capacity) === 0;
                const full = !noBoats && Number(row.remaining) <= 0;
                return `<td class="admin-matrix__cell${full ? ' is-full' : ''}${noBoats ? ' is-empty' : ''}">
                  <strong>${row.booked}/${row.capacity}</strong>
                  <small>${isInactive ? 'SLOT CHIUSO' : noBoats ? 'NESSUNA BARCA' : full ? 'COMPLETO' : `${row.remaining} libere`}</small>
                </td>`;
              }).join('')}
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  }

  function renderCutoff() {
    if (!cutoffForm) return;

    const cutoff = data.settings?.bookingCutoffAt || null;
    cutoffForm.elements.cutoffLocal.value = toRomeLocalInput(cutoff);

    if (!cutoffState) return;

    if (!cutoff) {
      cutoffState.innerHTML = '<strong>Nessuna scadenza impostata</strong><span>Le prenotazioni online restano aperte.</span>';
      cutoffState.className = 'cutoff-state';
      return;
    }

    const open = data.settings?.bookingOpen !== false;
    cutoffState.innerHTML = `<strong>${open ? 'Prenotazioni aperte' : 'Prenotazioni chiuse'}</strong><span>Chiusura: ${formatDate(cutoff)}</span>`;
    cutoffState.className = `cutoff-state ${open ? 'is-open' : 'is-closed'}`;
  }

  function renderBoats() {
    if (!boatsContainer) return;

    if (!data.boats.length) {
      boatsContainer.innerHTML = '<div class="booking-empty">Nessuna barca censita. Aggiungi le barche disponibili usando il modulo qui sopra.</div>';
      return;
    }

    boatsContainer.innerHTML = `
      <div class="admin-boats-wrap">
        <table class="admin-boats-table">
          <thead><tr><th>Numero</th><th>Cantiere</th><th>Tipo</th><th>Stato</th><th>Azioni</th></tr></thead>
          <tbody>
            ${data.boats.map((boat) => `
              <tr data-boat-id="${boat.id}">
                <td><strong>${escapeHtml(boat.number)}</strong></td>
                <td>${escapeHtml(boat.builder)}</td>
                <td>${escapeHtml(boat.boatType)}</td>
                <td><span class="boat-state ${boat.active ? 'is-active' : 'is-inactive'}">${boat.active ? 'Attiva' : 'Non attiva'}</span></td>
                <td class="admin-boats-actions">
                  <button class="admin-button" type="button" data-boat-action="toggle" data-next-active="${boat.active ? 'false' : 'true'}">${boat.active ? 'Disattiva' : 'Attiva'}</button>
                  <button class="admin-button admin-button--danger" type="button" data-boat-action="delete" ${boat.active ? 'disabled title="Disattiva prima la barca"' : ''}>Elimina</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  function matchesFilters(booking) {
    const society = (societyFilter?.value || '').trim().toLowerCase();
    const slot = slotFilter?.value || '';
    const type = typeFilter?.value || '';
    const builder = builderFilter?.value || '';

    if (society && !booking.society.toLowerCase().includes(society)) return false;
    if (slot && booking.slotCode !== slot) return false;
    if (type && !(booking.items || []).some((item) => item.boatType === type)) return false;
    if (builder && !(booking.items || []).some((item) => item.builder === builder)) return false;
    return true;
  }

  function renderBookings() {
    const visible = data.bookings.filter(matchesFilters);

    if (!visible.length) {
      bookingsContainer.innerHTML = '<div class="booking-empty">Nessuna prenotazione corrisponde ai filtri.</div>';
      return;
    }

    bookingsContainer.innerHTML = visible.map((booking) => `
      <article class="admin-booking" data-booking-id="${booking.id}">
        <div class="admin-booking__head">
          <div>
            <div class="admin-booking__code">${escapeHtml(booking.bookingCode)}</div>
            <h3>${escapeHtml(booking.society)}</h3>
            <div class="admin-booking__meta">${slotLabel(booking.slotCode)} · creata ${formatDate(booking.createdAt)} · aggiornata ${formatDate(booking.updatedAt)}</div>
          </div>
          <div class="admin-booking__actions">
            <button class="admin-button" type="button" data-action="edit">Modifica</button>
            <button class="admin-button" type="button" data-action="resend">Reinvia email</button>
            <button class="admin-button admin-button--danger" type="button" data-action="delete">Elimina</button>
          </div>
        </div>

        <div class="admin-booking__details">
          <p><strong>Referente</strong><br>${escapeHtml(booking.contactSurname)} ${escapeHtml(booking.contactName)}</p>
          <p><strong>Telefono</strong><br>${escapeHtml(booking.phone)}</p>
          <p><strong>Email</strong><br>${escapeHtml(booking.email)}</p>
          <p><strong>Slot</strong><br>${slotLabel(booking.slotCode)}</p>
          <div class="admin-booking__boats">
            <strong>Barche assegnate</strong><br>
            ${(booking.items || []).map(boatSummary).join(' · ')}
          </div>
        </div>
      </article>`).join('');
  }

  function renderAll() {
    renderSlots();
    renderMatrix();
    renderCutoff();
    renderBoats();
    renderBookings();
    syncEditSlotOptions();
  }

  async function loadDashboard(message = '') {
    setText(status, 'Aggiornamento…');
    const payload = await adminRequest('list');
    data = payload;
    renderAll();
    const openSlots = (data.slots || []).filter((slot) => slot.active).length;
    setText(status, message || `${data.bookings.length} prenotazioni attive · ${data.boats.length} barche · ${openSlots}/${data.slots?.length || slots.length} slot aperti`, 'ok');
  }

  function editingItemQuantity(builder, boatType) {
    return Number(editingQuantities.get(itemKey(builder, boatType)) || 0);
  }

  function currentBookedQty(slotCode, builder, boatType) {
    if (!editing || editing.slotCode !== slotCode) return 0;
    const item = (editing.items || []).find(
      (entry) => entry.builder === builder && entry.boatType === boatType
    );
    return Number(item?.quantity || 0);
  }

  function currentBoatNumbers(builder, boatType) {
    if (!editing) return [];
    const item = (editing.items || []).find(
      (entry) => entry.builder === builder && entry.boatType === boatType
    );
    return item?.boatNumbers || [];
  }

  function renderEditInventory() {
    if (!editing || !editInventory) return;

    const slotCode = editForm.elements.slotCode.value;

    editInventory.innerHTML = builders.flatMap((builder) => boatTypes.map((boatType) => {
      const row = availabilityRow(slotCode, builder, boatType) || { remaining: 0 };
      const own = currentBookedQty(slotCode, builder, boatType);
      const max = Math.max(0, Number(row.remaining || 0) + own);
      const wanted = Math.min(editingItemQuantity(builder, boatType), max);
      editingQuantities.set(itemKey(builder, boatType), wanted);

      const options = Array.from({ length: max + 1 }, (_, index) =>
        `<option value="${index}"${index === wanted ? ' selected' : ''}>${index}</option>`
      ).join('');

      const numbers = currentBoatNumbers(builder, boatType);
      const assigned = numbers.length
        ? `<div class="inventory-assigned"><strong>Attuali:</strong> ${numbers.map(escapeHtml).join(', ')}</div>`
        : '';

      return `<article class="inventory-card${max === 0 ? ' is-full' : ''}">
        <div class="inventory-card__top">
          <div class="inventory-card__name"><strong>${builder}</strong><small>${boatType}</small></div>
          <span class="inventory-remaining${max === 0 ? ' is-full' : ''}">${max === 0 ? 'COMPLETO' : `${max} disponibili`}</span>
        </div>
        ${assigned}
        <div class="inventory-qty">
          <label>Quantità</label>
          <select data-edit-qty data-builder="${builder}" data-boat-type="${boatType}" ${max === 0 ? 'disabled' : ''}>${options}</select>
        </div>
      </article>`;
    })).join('');
  }

  function openEdit(booking) {
    editing = booking;
    editingQuantities = new Map(
      (booking.items || []).map((item) => [itemKey(item.builder, item.boatType), Number(item.quantity)])
    );

    editForm.elements.society.value = booking.society;
    editForm.elements.contactSurname.value = booking.contactSurname;
    editForm.elements.contactName.value = booking.contactName;
    editForm.elements.phone.value = booking.phone;
    editForm.elements.email.value = booking.email;
    syncEditSlotOptions();
    editForm.elements.slotCode.value = booking.slotCode;

    renderEditInventory();
    dialog.showModal();
  }

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    credentials = {
      username: loginForm.elements.username.value,
      password: loginForm.elements.password.value
    };

    setText(loginStatus, 'Accesso…');

    try {
      await adminRequest('login');
      loginForm.closest('.admin-login').hidden = true;
      dashboard.hidden = false;
      await loadDashboard();
    } catch (error) {
      credentials = null;
      setText(loginStatus, error.message, 'error');
    }
  });

  refreshButton?.addEventListener('click', () => {
    loadDashboard().catch((error) => setText(status, error.message, 'error'));
  });

  [societyFilter, slotFilter, typeFilter, builderFilter].forEach((input) => {
    input?.addEventListener('input', renderBookings);
    input?.addEventListener('change', renderBookings);
  });

  cutoffForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = cutoffForm.querySelector('button[type="submit"]');
    button.disabled = true;

    try {
      const payload = await adminRequest('setcutoff', {
        cutoffLocal: cutoffForm.elements.cutoffLocal.value
      });
      data.settings = payload.settings || data.settings;
      renderCutoff();
      setText(status, 'Termine prenotazioni aggiornato.', 'ok');
    } catch (error) {
      setText(status, error.message, 'error');
    } finally {
      button.disabled = false;
    }
  });

  cutoffForm?.querySelector('[data-clear-cutoff]')?.addEventListener('click', async () => {
    const button = cutoffForm.querySelector('[data-clear-cutoff]');
    button.disabled = true;

    try {
      const payload = await adminRequest('setcutoff', { cutoffLocal: '' });
      data.settings = payload.settings || data.settings;
      renderCutoff();
      setText(status, 'Scadenza rimossa: prenotazioni aperte senza termine.', 'ok');
    } catch (error) {
      setText(status, error.message, 'error');
    } finally {
      button.disabled = false;
    }
  });

  slotsContainer?.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-slot-action="toggle"]');
    if (!button || button.disabled) return;

    const row = button.closest('[data-slot-code]');
    const code = row?.dataset.slotCode || '';
    const slot = slotInfo(code);
    if (!slot) return;

    const nextActive = button.dataset.nextActive === 'true';
    if (!nextActive && !confirm(`Chiudere lo slot ${slot.label}? Non sarà più selezionabile per nuove prenotazioni.`)) return;

    button.disabled = true;
    try {
      const payload = await adminRequest('toggleslot', { code, active: nextActive });
      data.slots = payload.slots || data.slots;
      data.availability = payload.availability || data.availability;
      renderSlots();
      renderMatrix();
      syncEditSlotOptions();
      setText(status, nextActive ? `Slot ${slot.label} riaperto.` : `Slot ${slot.label} chiuso.`, 'ok');
    } catch (error) {
      setText(status, error.message, 'error');
    } finally {
      button.disabled = false;
    }
  });

  boatForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = boatForm.querySelector('button[type="submit"]');
    button.disabled = true;

    try {
      const payload = await adminRequest('addboat', {
        number: boatForm.elements.number.value,
        builder: boatForm.elements.builder.value,
        boatType: boatForm.elements.boatType.value
      });

      data.boats = payload.boats || data.boats;
      data.availability = payload.availability || data.availability;
      boatForm.reset();
      renderBoats();
      renderMatrix();
      setText(status, 'Barca aggiunta all’anagrafica.', 'ok');
    } catch (error) {
      setText(status, error.message, 'error');
    } finally {
      button.disabled = false;
    }
  });

  boatsContainer?.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-boat-action]');
    if (!button) return;

    const row = button.closest('[data-boat-id]');
    const boat = data.boats.find((item) => item.id === row?.dataset.boatId);
    if (!boat) return;

    button.disabled = true;

    try {
      if (button.dataset.boatAction === 'toggle') {
        const payload = await adminRequest('toggleboat', {
          id: boat.id,
          active: button.dataset.nextActive === 'true'
        });
        data.boats = payload.boats || data.boats;
        data.availability = payload.availability || data.availability;
        renderBoats();
        renderMatrix();
        setText(status, boat.active ? 'Barca disattivata.' : 'Barca attivata.', 'ok');
      }

      if (button.dataset.boatAction === 'delete') {
        if (!confirm(`Eliminare definitivamente la barca ${boat.number}?`)) return;
        const payload = await adminRequest('deleteboat', { id: boat.id });
        data.boats = payload.boats || data.boats;
        data.availability = payload.availability || data.availability;
        renderBoats();
        renderMatrix();
        setText(status, 'Barca eliminata.', 'ok');
      }
    } catch (error) {
      setText(status, error.message, 'error');
    } finally {
      button.disabled = false;
    }
  });

  bookingsContainer?.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;

    const article = button.closest('[data-booking-id]');
    const booking = data.bookings.find((item) => item.id === article?.dataset.bookingId);
    if (!booking) return;

    const action = button.dataset.action;

    if (action === 'edit') {
      openEdit(booking);
      return;
    }

    if (action === 'delete') {
      if (!confirm(`Eliminare la prenotazione ${booking.bookingCode} di ${booking.society}? Le barche torneranno subito disponibili.`)) return;
      button.disabled = true;

      try {
        const payload = await adminRequest('delete', { id: booking.id });
        await loadDashboard(payload.warning || 'Prenotazione eliminata.');
      } catch (error) {
        setText(status, error.message, 'error');
      } finally {
        button.disabled = false;
      }
    }

    if (action === 'resend') {
      button.disabled = true;

      try {
        await adminRequest('resend', { id: booking.id });
        setText(status, 'Email di riepilogo inviata.', 'ok');
      } catch (error) {
        setText(status, error.message, 'error');
      } finally {
        button.disabled = false;
      }
    }
  });

  editForm?.elements.slotCode?.addEventListener('change', () => {
    editingQuantities = new Map();
    renderEditInventory();
  });

  editInventory?.addEventListener('change', (event) => {
    const select = event.target.closest('[data-edit-qty]');
    if (!select) return;
    editingQuantities.set(
      itemKey(select.dataset.builder, select.dataset.boatType),
      Number(select.value)
    );
  });

  document.querySelectorAll('[data-dialog-close]').forEach((button) => {
    button.addEventListener('click', () => dialog.close());
  });

  editForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!editing) return;

    const items = Array.from(editingQuantities.entries())
      .map(([key, quantity]) => {
        const [builder, boatType] = key.split('|');
        return { builder, boatType, quantity };
      })
      .filter((item) => item.quantity > 0);

    if (!items.length) return setText(status, 'Seleziona almeno una barca.', 'error');

    const submit = editForm.querySelector('[type="submit"]');
    submit.disabled = true;

    try {
      const payload = await adminRequest('update', {
        id: editing.id,
        society: editForm.elements.society.value,
        contactSurname: editForm.elements.contactSurname.value,
        contactName: editForm.elements.contactName.value,
        phone: editForm.elements.phone.value,
        email: editForm.elements.email.value,
        slotCode: editForm.elements.slotCode.value,
        items
      });

      dialog.close();
      await loadDashboard(payload.warning || 'Prenotazione aggiornata.');
    } catch (error) {
      setText(status, error.message, 'error');
    } finally {
      submit.disabled = false;
    }
  });
})();

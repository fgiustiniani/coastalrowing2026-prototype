(() => {
  const loginForm = document.querySelector('[data-admin-login]');
  const dashboard = document.querySelector('[data-admin-dashboard]');
  if (!loginForm || !dashboard) return;

  const api = '/api/boat-bookings-admin';
  const status = document.querySelector('[data-admin-status]');
  const loginStatus = document.querySelector('[data-login-status]');
  const matrix = document.querySelector('[data-admin-matrix]');
  const bookingsContainer = document.querySelector('[data-admin-bookings]');
  const capacityContainer = document.querySelector('[data-capacity-grid]');
  const societyFilter = document.querySelector('[data-filter-society]');
  const slotFilter = document.querySelector('[data-filter-slot]');
  const typeFilter = document.querySelector('[data-filter-type]');
  const refreshButton = document.querySelector('[data-admin-refresh]');
  const dialog = document.querySelector('[data-edit-dialog]');
  const editForm = document.querySelector('[data-edit-form]');
  const editInventory = document.querySelector('[data-edit-inventory]');

  const slots = [
    ['1300', '13:00–13:20'], ['1330', '13:30–13:50'], ['1400', '14:00–14:20'], ['1430', '14:30–14:50'],
    ['1500', '15:00–15:20'], ['1530', '15:30–15:50'], ['1600', '16:00–16:20'], ['1630', '16:30–16:50']
  ];
  const builders = ['LOVA', 'Swift'];
  const boatTypes = ['C1x', 'C2x', 'C4x+'];

  let credentials = null;
  let data = { bookings: [], availability: [] };
  let editing = null;
  let editingQuantities = new Map();

  function setText(node, message = '', kind = '') {
    if (!node) return;
    node.textContent = message;
    node.className = `booking-status${kind ? ` is-${kind}` : ''}`;
  }

  function authHeader() {
    return credentials ? `Basic ${btoa(`${credentials.username}:${credentials.password}`)}` : '';
  }

  async function adminRequest(action, payload = {}) {
    const response = await fetch(api, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: authHeader() },
      body: JSON.stringify({ action, ...payload })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || 'Operazione non riuscita.');
    return body;
  }

  function slotLabel(code) { return slots.find(([value]) => value === code)?.[1] || code; }
  function availabilityRow(slotCode, builder, boatType) { return data.availability.find((row) => row.slotCode === slotCode && row.builder === builder && row.boatType === boatType); }
  function itemKey(builder, boatType) { return `${builder}|${boatType}`; }
  function formatDate(value) { return value ? new Intl.DateTimeFormat('it-IT', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '—'; }
  function escapeHtml(value) { return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;'); }

  function renderMatrix() {
    const columns = builders.flatMap((builder) => boatTypes.map((boatType) => [builder, boatType]));
    matrix.innerHTML = `
      <table class="admin-matrix">
        <thead><tr><th>Slot</th>${columns.map(([builder, type]) => `<th>${builder}<br><small>${type}</small></th>`).join('')}</tr></thead>
        <tbody>${slots.map(([code, label]) => `<tr><th>${label}</th>${columns.map(([builder, type]) => {
          const row = availabilityRow(code, builder, type) || { booked: 0, capacity: 0, remaining: 0 };
          const full = Number(row.remaining) <= 0;
          return `<td class="admin-matrix__cell${full ? ' is-full' : ''}"><strong>${row.booked}/${row.capacity}</strong><small>${full ? 'COMPLETO' : `${row.remaining} libere`}</small></td>`;
        }).join('')}</tr>`).join('')}</tbody>
      </table>`;
  }

  function renderCapacity() {
    capacityContainer.innerHTML = builders.flatMap((builder) => boatTypes.map((boatType) => {
      const first = availabilityRow('1300', builder, boatType);
      return `<form class="capacity-row" data-capacity-form data-builder="${builder}" data-boat-type="${boatType}">
        <div><label>Cantiere</label><strong>${builder}</strong></div>
        <div><label>Tipo</label><strong>${boatType}</strong></div>
        <div><label>Max</label><input name="capacity" type="number" min="0" max="99" value="${first?.capacity ?? 4}" required></div>
        <div style="grid-column:1/-1"><label>Applica a</label><select name="slotCode"><option value="">Tutti gli slot</option>${slots.map(([code,label]) => `<option value="${code}">${label}</option>`).join('')}</select></div>
        <button class="admin-button admin-button--primary" type="submit">Aggiorna</button>
      </form>`;
    })).join('');
  }

  function matchesFilters(booking) {
    const society = (societyFilter.value || '').trim().toLowerCase();
    const slot = slotFilter.value;
    const type = typeFilter.value;
    if (society && !booking.society.toLowerCase().includes(society)) return false;
    if (slot && booking.slotCode !== slot) return false;
    if (type && !(booking.items || []).some((item) => item.boatType === type)) return false;
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
          <div><h3>${escapeHtml(booking.society)}</h3><div class="admin-booking__meta">${slotLabel(booking.slotCode)} · creata ${formatDate(booking.createdAt)} · aggiornata ${formatDate(booking.updatedAt)}</div></div>
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
          <div class="admin-booking__boats"><strong>Barche</strong><br>${(booking.items || []).map((item) => `${escapeHtml(item.builder)} ${escapeHtml(item.boatType)} × ${item.quantity}`).join(' · ')}</div>
        </div>
      </article>`).join('');
  }

  function renderAll() { renderMatrix(); renderCapacity(); renderBookings(); }

  async function loadDashboard(message = '') {
    setText(status, 'Aggiornamento…');
    const payload = await adminRequest('list');
    data = payload;
    renderAll();
    setText(status, message || `${data.bookings.length} prenotazioni attive`, 'ok');
  }

  function editingItemQuantity(builder, boatType) {
    return Number(editingQuantities.get(itemKey(builder, boatType)) || 0);
  }

  function currentBookedQtyForCapacity(slotCode, builder, boatType) {
    if (!editing || editing.slotCode !== slotCode) return 0;
    const item = (editing.items || []).find((entry) => entry.builder === builder && entry.boatType === boatType);
    return Number(item?.quantity || 0);
  }

  function renderEditInventory() {
    if (!editing || !editInventory) return;
    const slotCode = editForm.elements.slotCode.value;
    editInventory.innerHTML = builders.flatMap((builder) => boatTypes.map((boatType) => {
      const row = availabilityRow(slotCode, builder, boatType) || { remaining: 0 };
      const own = currentBookedQtyForCapacity(slotCode, builder, boatType);
      const max = Math.max(0, Number(row.remaining || 0) + own);
      const wanted = Math.min(editingItemQuantity(builder, boatType), max);
      editingQuantities.set(itemKey(builder, boatType), wanted);
      const options = Array.from({ length: max + 1 }, (_, index) => `<option value="${index}"${index === wanted ? ' selected' : ''}>${index}</option>`).join('');
      return `<article class="inventory-card${max === 0 ? ' is-full' : ''}"><div class="inventory-card__top"><div class="inventory-card__name"><strong>${builder}</strong><small>${boatType}</small></div><span class="inventory-remaining${max === 0 ? ' is-full' : ''}">${max === 0 ? 'COMPLETO' : `${max} disponibili`}</span></div><div class="inventory-qty"><label>Quantità</label><select data-edit-qty data-builder="${builder}" data-boat-type="${boatType}" ${max === 0 ? 'disabled' : ''}>${options}</select></div></article>`;
    })).join('');
  }

  function openEdit(booking) {
    editing = booking;
    editingQuantities = new Map((booking.items || []).map((item) => [itemKey(item.builder, item.boatType), Number(item.quantity)]));
    editForm.elements.society.value = booking.society;
    editForm.elements.contactSurname.value = booking.contactSurname;
    editForm.elements.contactName.value = booking.contactName;
    editForm.elements.phone.value = booking.phone;
    editForm.elements.email.value = booking.email;
    editForm.elements.slotCode.value = booking.slotCode;
    renderEditInventory();
    dialog.showModal();
  }

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const username = loginForm.elements.username.value;
    const password = loginForm.elements.password.value;
    credentials = { username, password };
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

  refreshButton?.addEventListener('click', () => loadDashboard().catch((error) => setText(status, error.message, 'error')));
  [societyFilter, slotFilter, typeFilter].forEach((input) => input?.addEventListener('input', renderBookings));
  [slotFilter, typeFilter].forEach((input) => input?.addEventListener('change', renderBookings));

  capacityContainer?.addEventListener('change', (event) => {
    const select = event.target.closest('select[name="slotCode"]');
    if (!select) return;
    const form = select.closest('[data-capacity-form]');
    const input = form?.elements.capacity;
    if (!form || !input) return;
    const slotCode = select.value || '1300';
    const row = availabilityRow(slotCode, form.dataset.builder, form.dataset.boatType);
    if (row) input.value = row.capacity;
  });

  capacityContainer?.addEventListener('submit', async (event) => {
    const form = event.target.closest('[data-capacity-form]');
    if (!form) return;
    event.preventDefault();
    const button = form.querySelector('button');
    button.disabled = true;
    try {
      const payload = await adminRequest('setcapacity', {
        builder: form.dataset.builder,
        boatType: form.dataset.boatType,
        capacity: Number(form.elements.capacity.value),
        slotCode: form.elements.slotCode.value
      });
      data.availability = payload.availability || data.availability;
      renderAll();
      setText(status, 'Disponibilità aggiornata.', 'ok');
    } catch (error) {
      setText(status, error.message, 'error');
    } finally { button.disabled = false; }
  });

  bookingsContainer?.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const article = button.closest('[data-booking-id]');
    const booking = data.bookings.find((item) => item.id === article?.dataset.bookingId);
    if (!booking) return;
    const action = button.dataset.action;
    if (action === 'edit') return openEdit(booking);
    if (action === 'delete') {
      if (!confirm(`Eliminare la prenotazione di ${booking.society}? Le barche torneranno subito disponibili.`)) return;
      button.disabled = true;
      try {
        const payload = await adminRequest('delete', { id: booking.id });
        await loadDashboard(payload.warning || 'Prenotazione eliminata.');
      } catch (error) { setText(status, error.message, 'error'); }
      finally { button.disabled = false; }
    }
    if (action === 'resend') {
      button.disabled = true;
      try {
        await adminRequest('resend', { id: booking.id });
        setText(status, 'Email di riepilogo inviata.', 'ok');
      } catch (error) { setText(status, error.message, 'error'); }
      finally { button.disabled = false; }
    }
  });

  editForm?.elements.slotCode?.addEventListener('change', () => {
    editingQuantities = new Map();
    renderEditInventory();
  });
  editInventory?.addEventListener('change', (event) => {
    const select = event.target.closest('[data-edit-qty]');
    if (!select) return;
    editingQuantities.set(itemKey(select.dataset.builder, select.dataset.boatType), Number(select.value));
  });
  document.querySelectorAll('[data-dialog-close]').forEach((button) => button.addEventListener('click', () => dialog.close()));

  editForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!editing) return;
    const items = Array.from(editingQuantities.entries()).map(([key, quantity]) => {
      const [builder, boatType] = key.split('|');
      return { builder, boatType, quantity };
    }).filter((item) => item.quantity > 0);
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
    } catch (error) { setText(status, error.message, 'error'); }
    finally { submit.disabled = false; }
  });
})();

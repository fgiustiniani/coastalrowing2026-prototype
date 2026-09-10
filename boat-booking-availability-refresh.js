(() => {
  const slotSelect = document.querySelector('[data-booking-form][data-mode="create"] [name="slotCode"]');
  const inventoryGrid = document.querySelector('[data-booking-form][data-mode="create"] [data-inventory-grid]');
  if (!slotSelect || !inventoryGrid) return;

  const availabilityApi = '/api/boat-availability';
  let refreshId = 0;

  function setBusy(busy) {
    inventoryGrid.setAttribute('aria-busy', busy ? 'true' : 'false');
    inventoryGrid.querySelectorAll('[data-qty]').forEach((select) => {
      if (busy) {
        select.dataset.wasDisabled = select.disabled ? 'true' : 'false';
        select.disabled = true;
      } else if (select.dataset.wasDisabled !== 'true') {
        select.disabled = false;
      }
      if (!busy) delete select.dataset.wasDisabled;
    });
  }

  function updateInventory(rows, slotCode) {
    inventoryGrid.querySelectorAll('[data-qty]').forEach((select) => {
      const builder = select.dataset.builder;
      const boatType = select.dataset.boatType;
      const row = rows.find((item) =>
        item.slotCode === slotCode && item.builder === builder && item.boatType === boatType
      );
      const remaining = Math.max(0, Number(row?.remaining || 0));
      const currentQuantity = Math.min(Math.max(0, Number(select.value || 0)), remaining);

      select.innerHTML = Array.from({ length: remaining + 1 }, (_, quantity) =>
        `<option value="${quantity}"${quantity === currentQuantity ? ' selected' : ''}>${quantity}</option>`
      ).join('');
      select.disabled = remaining === 0;

      const card = select.closest('.inventory-card');
      const badge = card?.querySelector('.inventory-remaining');
      card?.classList.toggle('is-full', remaining === 0);
      if (badge) {
        badge.classList.toggle('is-full', remaining === 0);
        badge.textContent = remaining === 0
          ? 'COMPLETO'
          : `${remaining} disponibil${remaining === 1 ? 'e' : 'i'}`;
      }
    });
  }

  async function refreshAvailability() {
    const slotCode = slotSelect.value;
    if (!slotCode) return;

    const requestId = ++refreshId;
    setBusy(true);

    try {
      const response = await fetch(`${availabilityApi}?t=${Date.now()}`, {
        method: 'GET',
        headers: { accept: 'application/json' },
        cache: 'no-store'
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Impossibile aggiornare la disponibilità.');
      if (requestId !== refreshId || slotSelect.value !== slotCode) return;

      updateInventory(Array.isArray(payload.availability) ? payload.availability : [], slotCode);
    } catch (error) {
      console.error('Errore aggiornamento disponibilità per slot:', error);
    } finally {
      if (requestId === refreshId && slotSelect.value === slotCode) setBusy(false);
    }
  }

  slotSelect.addEventListener('change', () => {
    // Il listener principale ridisegna prima le card per il nuovo slot;
    // il microtask successivo rilegge dal server la disponibilità aggiornata.
    queueMicrotask(refreshAvailability);
  });
})();

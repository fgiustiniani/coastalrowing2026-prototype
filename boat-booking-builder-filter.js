(() => {
  const form = document.querySelector('[data-booking-form][data-mode="create"]');
  if (!form) return;

  const inventoryGrid = form.querySelector('[data-inventory-grid]');
  const inventoryPanel = form.querySelector('[data-inventory-panel]');
  const builderFirst = form.querySelector('[data-builder-first]');
  const typeChoices = Array.from(form.querySelectorAll('[data-boat-type-choice]'));
  const boatSlotSelect = form.querySelector('[data-boat-slot-select]');
  const mainSlotSelect = form.querySelector('[name="slotCode"]');
  const compatibilityType = form.querySelector('[data-type-first]');
  const modeSwitch = form.querySelector('[data-mode-switch]');
  const emptyMessage = form.querySelector('[data-boat-filter-empty]');

  if (!inventoryGrid || !inventoryPanel || !builderFirst || !typeChoices.length || !boatSlotSelect || !mainSlotSelect || !modeSwitch) return;

  function isBoatFirstMode() {
    return Boolean(modeSwitch.querySelector('[data-start-mode="boat"].is-active'));
  }

  function selectedTypes() {
    return typeChoices.filter((input) => input.checked).map((input) => input.value);
  }

  function syncCompatibilityType() {
    if (!compatibilityType) return;
    compatibilityType.value = selectedTypes()[0] || '';
  }

  function updateSlotControl() {
    const ready = Boolean(builderFirst.value && selectedTypes().length);
    boatSlotSelect.disabled = mainSlotSelect.disabled || !ready;
    if (!ready) boatSlotSelect.value = '';
  }

  function syncMainSlot(code) {
    if (mainSlotSelect.value === code) return;
    mainSlotSelect.value = code;
    mainSlotSelect.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function clearQuantitiesOutsideSelection() {
    if (!isBoatFirstMode()) return;

    const builder = builderFirst.value || '';
    const types = new Set(selectedTypes());
    let changed = false;

    inventoryGrid.querySelectorAll('[data-qty]').forEach((select) => {
      const keep = select.dataset.builder === builder && types.has(select.dataset.boatType);
      if (!keep && Number(select.value || 0) !== 0) {
        select.value = '0';
        changed = true;
      }
    });

    if (changed) inventoryGrid.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function applyInventoryFilter() {
    const cards = Array.from(inventoryGrid.querySelectorAll('.inventory-card'));

    if (!isBoatFirstMode()) {
      cards.forEach((card) => { card.hidden = false; });
      if (emptyMessage) emptyMessage.hidden = true;
      return;
    }

    const builder = builderFirst.value || '';
    const types = new Set(selectedTypes());
    const slotChosen = Boolean(boatSlotSelect.value);
    let visible = 0;

    cards.forEach((card) => {
      const select = card.querySelector('[data-qty]');
      if (!select) return;

      const matches = slotChosen &&
        select.dataset.builder === builder &&
        types.has(select.dataset.boatType) &&
        !card.classList.contains('is-full');

      card.hidden = !matches;
      if (matches) visible += 1;
    });

    if (emptyMessage) {
      emptyMessage.hidden = !slotChosen || visible > 0;
      if (slotChosen && visible === 0) {
        emptyMessage.textContent = 'Nessuna delle tipologie selezionate è disponibile in questo slot. Prova un altro orario.';
      }
    }
  }

  function refreshBoatFlow() {
    syncCompatibilityType();
    updateSlotControl();
    clearQuantitiesOutsideSelection();
    applyInventoryFilter();
  }

  modeSwitch.addEventListener('click', (event) => {
    const button = event.target.closest('[data-start-mode]');
    if (!button) return;

    queueMicrotask(() => {
      if (button.dataset.startMode === 'boat') {
        boatSlotSelect.value = mainSlotSelect.value || '';
        if (!builderFirst.value || !selectedTypes().length) {
          boatSlotSelect.value = '';
          syncMainSlot('');
        }
      }
      refreshBoatFlow();
    });
  });

  builderFirst.addEventListener('change', () => {
    boatSlotSelect.value = '';
    syncMainSlot('');
    refreshBoatFlow();
  });

  typeChoices.forEach((input) => {
    input.addEventListener('change', () => {
      if (!selectedTypes().length) {
        boatSlotSelect.value = '';
        syncMainSlot('');
      }
      refreshBoatFlow();
    });
  });

  boatSlotSelect.addEventListener('change', () => {
    syncMainSlot(boatSlotSelect.value);
    queueMicrotask(applyInventoryFilter);
  });

  mainSlotSelect.addEventListener('change', () => {
    if (isBoatFirstMode() && boatSlotSelect.value !== mainSlotSelect.value) {
      boatSlotSelect.value = mainSlotSelect.value;
    }
    queueMicrotask(applyInventoryFilter);
  });

  const observer = new MutationObserver(() => queueMicrotask(applyInventoryFilter));
  observer.observe(inventoryGrid, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

  refreshBoatFlow();
})();

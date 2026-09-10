(() => {
  const form = document.querySelector('[data-booking-form][data-mode="create"]');
  if (!form) return;

  const slotSelect = form.querySelector('[name="slotCode"]');
  const inventoryGrid = form.querySelector('[data-inventory-grid]');
  const filterInputs = Array.from(form.querySelectorAll('[data-boat-filter]'));
  const clearButton = form.querySelector('[data-clear-boat-filters]');
  const filterSummary = form.querySelector('[data-boat-filter-summary]');
  const filterMenu = form.querySelector('[data-boat-filter-menu]');
  const emptyMessage = form.querySelector('[data-boat-filter-empty]');
  if (!slotSelect || !inventoryGrid || !filterInputs.length) return;

  const availabilityApi = '/api/boat-availability';
  let availability = [];
  let requestId = 0;

  const slotOptions = Array.from(slotSelect.options).filter((option) => option.value);
  slotOptions.forEach((option) => {
    option.dataset.baseLabel = option.textContent.trim();
  });

  function key(builder, boatType) {
    return `${builder}|${boatType}`;
  }

  function selectedPairs() {
    return filterInputs
      .filter((input) => input.checked)
      .map((input) => ({
        builder: input.dataset.builder || '',
        boatType: input.dataset.boatType || '',
        key: key(input.dataset.builder || '', input.dataset.boatType || '')
      }));
  }

  function rowFor(slotCode, builder, boatType) {
    return availability.find((row) =>
      row.slotCode === slotCode && row.builder === builder && row.boatType === boatType
    );
  }

  function remainingFor(slotCode, builder, boatType) {
    return Math.max(0, Number(rowFor(slotCode, builder, boatType)?.remaining || 0));
  }

  function slotMatchesFilters(slotCode, pairs) {
    // Il backend restituisce disponibilità solo per gli slot attivi. In assenza
    // di filtri, quindi, la presenza di almeno una riga identifica uno slot aperto.
    const slotIsActive = availability.some((row) => row.slotCode === slotCode);
    if (!slotIsActive) return false;
    if (!pairs.length) return true;

    // Il filtro serve a trovare slot utili: basta che almeno una delle coppie
    // selezionate abbia disponibilità nello slot.
    return pairs.some((pair) => remainingFor(slotCode, pair.builder, pair.boatType) > 0);
  }

  function setFilterSummary(pairs) {
    if (clearButton) clearButton.hidden = pairs.length === 0;
    if (filterMenu) filterMenu.classList.toggle('has-selection', pairs.length > 0);
    if (!filterSummary) return;

    if (!pairs.length) {
      filterSummary.textContent = 'Nessun filtro';
      return;
    }

    filterSummary.textContent = pairs.length === 1
      ? '1 barca selezionata'
      : `${pairs.length} barche selezionate`;
  }

  function updateSlotOptions({ resetInvalidSelection = true } = {}) {
    const pairs = selectedPairs();
    setFilterSummary(pairs);

    let selectedStillValid = true;
    slotOptions.forEach((option) => {
      const available = slotMatchesFilters(option.value, pairs);
      option.disabled = !available;
      option.textContent = `${option.dataset.baseLabel}${!available ? ' — non disponibile' : ''}`;
      if (option.value === slotSelect.value && !available) selectedStillValid = false;
    });

    if (resetInvalidSelection && slotSelect.value && !selectedStillValid) {
      slotSelect.value = '';
      slotSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function resetHiddenQuantities() {
    let changed = false;
    inventoryGrid.querySelectorAll('.inventory-card[hidden] [data-qty]').forEach((select) => {
      if (Number(select.value || 0) > 0) {
        select.value = '0';
        changed = true;
      }
    });

    if (changed) {
      inventoryGrid.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function updateInventoryCards() {
    const pairs = selectedPairs();
    const selectedKeys = new Set(pairs.map((pair) => pair.key));
    const slotCode = slotSelect.value;
    let visibleCount = 0;
    let availableVisibleCount = 0;

    inventoryGrid.querySelectorAll('.inventory-card').forEach((card) => {
      const select = card.querySelector('[data-qty]');
      if (!select) return;

      const builder = select.dataset.builder || '';
      const boatType = select.dataset.boatType || '';
      const pairKey = key(builder, boatType);
      const remaining = slotCode ? remainingFor(slotCode, builder, boatType) : 0;

      if (slotCode && availability.length) {
        const currentQuantity = Math.min(Math.max(0, Number(select.value || 0)), remaining);
        select.innerHTML = Array.from({ length: remaining + 1 }, (_, quantity) =>
          `<option value="${quantity}"${quantity === currentQuantity ? ' selected' : ''}>${quantity}</option>`
        ).join('');
        select.disabled = remaining === 0;

        const badge = card.querySelector('.inventory-remaining');
        card.classList.toggle('is-full', remaining === 0);
        if (badge) {
          badge.classList.toggle('is-full', remaining === 0);
          badge.textContent = remaining === 0
            ? 'COMPLETO'
            : `${remaining} disponibil${remaining === 1 ? 'e' : 'i'}`;
        }
      }

      // Se il filtro è attivo mostriamo tutte le coppie selezionate, anche quelle
      // esaurite nello slot scelto: restano visibili in grigio con badge COMPLETO.
      const visible = !pairs.length || selectedKeys.has(pairKey);
      card.hidden = !visible;
      if (visible) {
        visibleCount += 1;
        if (remaining > 0) availableVisibleCount += 1;
      }
    });

    resetHiddenQuantities();

    if (emptyMessage) {
      const showEmpty = Boolean(slotCode && pairs.length && visibleCount > 0 && availableVisibleCount === 0);
      emptyMessage.hidden = !showEmpty;
      emptyMessage.textContent = showEmpty
        ? 'Nessuna delle barche filtrate è disponibile in questo slot. Scegli un altro orario o modifica il filtro.'
        : '';
    }
  }

  async function refreshAvailability({ resetInvalidSelection = true } = {}) {
    const currentRequest = ++requestId;
    inventoryGrid.setAttribute('aria-busy', 'true');

    try {
      const response = await fetch(`${availabilityApi}?t=${Date.now()}`, {
        method: 'GET',
        headers: { accept: 'application/json' },
        cache: 'no-store'
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Impossibile aggiornare la disponibilità.');
      if (currentRequest !== requestId) return;

      availability = Array.isArray(payload.availability) ? payload.availability : [];
      updateSlotOptions({ resetInvalidSelection });
      updateInventoryCards();
    } catch (error) {
      console.error('Errore aggiornamento filtri disponibilità:', error);
    } finally {
      if (currentRequest === requestId) inventoryGrid.setAttribute('aria-busy', 'false');
    }
  }

  filterInputs.forEach((input) => {
    input.addEventListener('change', () => {
      refreshAvailability({ resetInvalidSelection: true });
    });
  });

  clearButton?.addEventListener('click', () => {
    filterInputs.forEach((input) => { input.checked = false; });
    refreshAvailability({ resetInvalidSelection: false });
  });

  slotSelect.addEventListener('change', () => {
    queueMicrotask(() => refreshAvailability({ resetInvalidSelection: false }));
  });

  const observer = new MutationObserver(() => {
    updateInventoryCards();
  });
  observer.observe(inventoryGrid, { childList: true });

  document.addEventListener('click', (event) => {
    if (!filterMenu?.open || filterMenu.contains(event.target)) return;
    filterMenu.open = false;
  });

  setFilterSummary([]);
  refreshAvailability({ resetInvalidSelection: false });
})();

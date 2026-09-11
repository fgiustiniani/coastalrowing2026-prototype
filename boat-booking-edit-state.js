(() => {
  const form = document.querySelector('[data-booking-form][data-mode="edit"]');
  if (!form) return;

  const slotSelect = form.querySelector('[name="slotCode"]');
  const inventoryGrid = form.querySelector('[data-inventory-grid]');
  if (!slotSelect || !inventoryGrid) return;

  let originalSlot = '';
  let originalItems = new Map();
  let captured = false;
  let restoring = false;
  let originalSlotNotice = null;

  function keyFor(select) {
    return `${select.dataset.builder || ''}|${select.dataset.boatType || ''}`;
  }

  function showOriginalSlot() {
    if (!originalSlot) return;

    const originalOption = Array.from(slotSelect.options).find((option) => option.value === originalSlot);
    const originalLabel = originalOption?.dataset.originalLabel || originalOption?.textContent || originalSlot;

    if (originalOption && !originalOption.dataset.originalLabel) {
      originalOption.dataset.originalLabel = originalLabel;
      originalOption.textContent = `${originalLabel} — slot originario`;
    }

    if (!originalSlotNotice) {
      originalSlotNotice = document.createElement('div');
      originalSlotNotice.className = 'inventory-assigned';
      originalSlotNotice.setAttribute('role', 'note');
      originalSlotNotice.setAttribute('aria-live', 'polite');
      slotSelect.insertAdjacentElement('afterend', originalSlotNotice);
    }

    originalSlotNotice.textContent = '';
    const strong = document.createElement('strong');
    strong.textContent = 'Slot originario: ';
    originalSlotNotice.append(strong, document.createTextNode(originalLabel));
  }

  function captureOriginalState() {
    if (captured || !slotSelect.value) return;

    const items = new Map();
    inventoryGrid.querySelectorAll('.inventory-card').forEach((card) => {
      const select = card.querySelector('[data-qty]');
      const assignment = card.querySelector('.inventory-assigned');
      if (!select || !assignment) return;

      items.set(keyFor(select), {
        quantity: Number(select.value || 0),
        assignmentHtml: assignment.innerHTML
      });
    });

    if (!items.size) return;

    originalSlot = slotSelect.value;
    originalItems = items;
    captured = true;
    showOriginalSlot();
  }

  function restoreOriginalState() {
    if (!captured || slotSelect.value !== originalSlot) return;

    restoring = true;
    try {
      inventoryGrid.querySelectorAll('.inventory-card').forEach((card) => {
        const select = card.querySelector('[data-qty]');
        if (!select) return;

        const saved = originalItems.get(keyFor(select));
        if (!saved) return;

        const max = Math.max(...Array.from(select.options).map((option) => Number(option.value || 0)));
        select.value = String(Math.min(saved.quantity, Number.isFinite(max) ? max : saved.quantity));

        if (!card.querySelector('.inventory-assigned')) {
          const assignment = document.createElement('div');
          assignment.className = 'inventory-assigned';
          assignment.innerHTML = saved.assignmentHtml;
          const quantityBlock = card.querySelector('.inventory-qty');
          card.insertBefore(assignment, quantityBlock || null);
        }
      });
    } finally {
      restoring = false;
    }
  }

  const observer = new MutationObserver(() => {
    if (restoring) return;
    captureOriginalState();
    restoreOriginalState();
  });

  observer.observe(inventoryGrid, { childList: true, subtree: true });

  slotSelect.addEventListener('change', () => {
    queueMicrotask(restoreOriginalState);
  });
})();

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

  function keyFor(select) {
    return `${select.dataset.builder || ''}|${select.dataset.boatType || ''}`;
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

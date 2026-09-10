(() => {
  const form = document.querySelector('[data-booking-form][data-mode="create"]');
  if (!form) return;

  const inventoryGrid = form.querySelector('[data-inventory-grid]');
  const builderFirst = form.querySelector('[data-builder-first]');
  const modeSwitch = form.querySelector('[data-mode-switch]');
  if (!inventoryGrid || !builderFirst || !modeSwitch) return;

  function isBoatFirstMode() {
    return Boolean(modeSwitch.querySelector('[data-start-mode="boat"].is-active'));
  }

  function applyBuilderFilter() {
    const selectedBuilder = builderFirst.value || '';
    const shouldFilter = isBoatFirstMode() && selectedBuilder;

    inventoryGrid.querySelectorAll('.inventory-card').forEach((card) => {
      const select = card.querySelector('[data-qty]');
      if (!select) return;

      card.hidden = Boolean(shouldFilter && select.dataset.builder !== selectedBuilder);
    });
  }

  modeSwitch.addEventListener('click', () => queueMicrotask(applyBuilderFilter));
  builderFirst.addEventListener('change', applyBuilderFilter);

  const observer = new MutationObserver(applyBuilderFilter);
  observer.observe(inventoryGrid, { childList: true });

  applyBuilderFilter();
})();

(() => {
  const root = document.querySelector('[data-logistics-map]');
  if (!root) return;

  const viewport = root.querySelector('[data-logistics-viewport]');
  const stage = root.querySelector('[data-logistics-stage]');
  const status = root.querySelector('[data-logistics-status]');
  const hotspots = Array.from(root.querySelectorAll('[data-logistics-point]'));
  const zoomInButton = root.querySelector('[data-logistics-zoom-in]');
  const zoomOutButton = root.querySelector('[data-logistics-zoom-out]');
  const resetButton = root.querySelector('[data-logistics-reset]');
  const legendButton = root.querySelector('[data-logistics-legend]');

  const MIN_SCALE = 1;
  const MAX_SCALE = 4;
  const STEP = 1.35;

  let scale = 1;
  let tx = 0;
  let ty = 0;
  let dragging = false;
  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let startTx = 0;
  let startTy = 0;

  function dimensions() {
    const rect = viewport.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }

  function clampTranslation(nextTx, nextTy, nextScale = scale) {
    const { width, height } = dimensions();
    const minX = width - width * nextScale;
    const minY = height - height * nextScale;

    return {
      x: Math.min(0, Math.max(minX, nextTx)),
      y: Math.min(0, Math.max(minY, nextTy))
    };
  }

  function render() {
    const clamped = clampTranslation(tx, ty, scale);
    tx = clamped.x;
    ty = clamped.y;
    stage.style.transform = `matrix(${scale}, 0, 0, ${scale}, ${tx}, ${ty})`;
    viewport.classList.toggle('is-zoomed', scale > 1.001);

    if (zoomOutButton) zoomOutButton.disabled = scale <= MIN_SCALE + 0.001;
    if (zoomInButton) zoomInButton.disabled = scale >= MAX_SCALE - 0.001;
  }

  function clearActivePoint() {
    hotspots.forEach((button) => button.setAttribute('aria-pressed', 'false'));
  }

  function announce(message) {
    if (status) status.textContent = message;
  }

  function setScale(nextScale, centerX, centerY) {
    const bounded = Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale));
    const { width, height } = dimensions();
    const cx = Number.isFinite(centerX) ? centerX : width / 2;
    const cy = Number.isFinite(centerY) ? centerY : height / 2;

    const mapX = (cx - tx) / scale;
    const mapY = (cy - ty) / scale;

    tx = cx - mapX * bounded;
    ty = cy - mapY * bounded;
    scale = bounded;

    if (scale <= MIN_SCALE + 0.001) {
      scale = 1;
      tx = 0;
      ty = 0;
    }

    render();
  }

  function resetMap(message = 'Mappa completa.') {
    scale = 1;
    tx = 0;
    ty = 0;
    clearActivePoint();
    render();
    announce(message);
  }

  function focusNormalized(x, y, targetScale, message) {
    const { width, height } = dimensions();
    scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, targetScale));
    tx = width / 2 - x * width * scale;
    ty = height / 2 - y * height * scale;
    render();
    announce(message);
  }

  function focusPoint(button) {
    const x = Number(button.dataset.mapX);
    const y = Number(button.dataset.mapY);
    const number = button.dataset.logisticsPoint;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;

    clearActivePoint();
    button.setAttribute('aria-pressed', 'true');
    focusNormalized(x, y, 2.45, `Punto ${number} selezionato. Usa “Legenda” per leggere la descrizione completa.`);
  }

  hotspots.forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      focusPoint(button);
    });
  });

  zoomInButton?.addEventListener('click', () => {
    clearActivePoint();
    setScale(scale * STEP);
    announce(`Zoom ${Math.round(scale * 100)}%.`);
  });

  zoomOutButton?.addEventListener('click', () => {
    clearActivePoint();
    setScale(scale / STEP);
    announce(`Zoom ${Math.round(scale * 100)}%.`);
  });

  resetButton?.addEventListener('click', () => resetMap());

  legendButton?.addEventListener('click', () => {
    clearActivePoint();
    focusNormalized(0.67, 0.48, 1.75, 'Legenda della mappa.');
  });

  viewport.addEventListener('wheel', (event) => {
    event.preventDefault();
    clearActivePoint();
    const rect = viewport.getBoundingClientRect();
    const factor = event.deltaY < 0 ? 1.14 : 1 / 1.14;
    setScale(scale * factor, event.clientX - rect.left, event.clientY - rect.top);
    announce(`Zoom ${Math.round(scale * 100)}%.`);
  }, { passive: false });

  viewport.addEventListener('dblclick', (event) => {
    event.preventDefault();
    clearActivePoint();
    const rect = viewport.getBoundingClientRect();
    setScale(scale < 2 ? 2 : Math.min(MAX_SCALE, scale * 1.35), event.clientX - rect.left, event.clientY - rect.top);
    announce(`Zoom ${Math.round(scale * 100)}%.`);
  });

  viewport.addEventListener('pointerdown', (event) => {
    if (scale <= 1.001 || event.button !== 0) return;
    dragging = true;
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    startTx = tx;
    startTy = ty;
    viewport.classList.add('is-dragging');
    viewport.setPointerCapture?.(pointerId);
  });

  viewport.addEventListener('pointermove', (event) => {
    if (!dragging || event.pointerId !== pointerId) return;
    tx = startTx + event.clientX - startX;
    ty = startTy + event.clientY - startY;
    render();
  });

  function endDrag(event) {
    if (!dragging || (event && event.pointerId !== pointerId)) return;
    dragging = false;
    viewport.classList.remove('is-dragging');
    if (pointerId !== null) {
      try {
        viewport.releasePointerCapture?.(pointerId);
      } catch (_) {
        // Il puntatore può essere già stato rilasciato dal browser.
      }
    }
    pointerId = null;
  }

  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);
  viewport.addEventListener('lostpointercapture', () => endDrag());

  viewport.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();

    if (key === '+' || key === '=') {
      event.preventDefault();
      clearActivePoint();
      setScale(scale * STEP);
      announce(`Zoom ${Math.round(scale * 100)}%.`);
      return;
    }

    if (key === '-') {
      event.preventDefault();
      clearActivePoint();
      setScale(scale / STEP);
      announce(`Zoom ${Math.round(scale * 100)}%.`);
      return;
    }

    if (key === '0' || key === 'r') {
      event.preventDefault();
      resetMap();
      return;
    }

    if (key === 'l') {
      event.preventDefault();
      clearActivePoint();
      focusNormalized(0.67, 0.48, 1.75, 'Legenda della mappa.');
      return;
    }

    if (scale <= 1.001 || !['arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(key)) return;

    event.preventDefault();
    const amount = 42;
    if (key === 'arrowleft') tx += amount;
    if (key === 'arrowright') tx -= amount;
    if (key === 'arrowup') ty += amount;
    if (key === 'arrowdown') ty -= amount;
    render();
  });

  window.addEventListener('resize', render);
  render();
})();

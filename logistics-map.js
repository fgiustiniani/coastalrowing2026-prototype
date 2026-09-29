(() => {
  const root = document.querySelector('[data-logistics-map]');
  if (!root) return;

  const viewport = root.querySelector('[data-logistics-viewport]');
  const stage = root.querySelector('[data-logistics-stage]');
  const status = root.querySelector('[data-logistics-status]');
  const hotspots = Array.from(root.querySelectorAll('[data-logistics-point]'));
  const legendHotspots = Array.from(root.querySelectorAll('[data-logistics-legend-point]'));
  const zoomInButton = root.querySelector('[data-logistics-zoom-in]');
  const zoomOutButton = root.querySelector('[data-logistics-zoom-out]');
  const resetButton = root.querySelector('[data-logistics-reset]');
  const legendButton = root.querySelector('[data-logistics-legend]');
  const selection = root.querySelector('[data-logistics-selection]');
  const selectionNumber = root.querySelector('[data-logistics-selection-number]');
  const selectionTitle = root.querySelector('[data-logistics-selection-title]');
  const selectionNote = root.querySelector('[data-logistics-selection-note]');
  const directionsLink = root.querySelector('[data-logistics-directions]');

  if (!viewport || !stage) return;

  const MIN_SCALE = 1;
  const MAX_SCALE = 4;
  const STEP = 1.35;
  const EVENT_ACCESS = 'Società Canottieri Pesaro, Calata Caio Duilio 101, Pesaro';
  const INTERNAL_NOTE = 'Google Maps porta all’accesso stradale dell’area evento; il punto esatto è evidenziato sulla mappa.';

  const pointData = {
    '1': { label: 'Parcheggio autovetture', destination: 'Parcheggio Villa Marina, Pesaro' },
    '2': { label: 'Area imbarcazioni', destination: EVENT_ACCESS, note: INTERNAL_NOTE },
    '3': { label: 'Remoergometri', destination: EVENT_ACCESS, note: INTERNAL_NOTE },
    '4': { label: 'Spogliatoi', destination: EVENT_ACCESS, note: INTERNAL_NOTE },
    '5': { label: 'Area premiazioni', destination: EVENT_ACCESS, note: INTERNAL_NOTE },
    '6': { label: 'Riunione capitani', destination: EVENT_ACCESS, note: INTERNAL_NOTE },
    '7': { label: 'Punto ristoro', destination: 'RistoranTino, Viale Trieste 296, Pesaro' },
    '8': { label: 'Soccorso', destination: EVENT_ACCESS, note: INTERNAL_NOTE },
    '9': { label: 'Servizi', destination: EVENT_ACCESS, note: INTERNAL_NOTE },
    '10': { label: 'Food truck e maxischermo', destination: EVENT_ACCESS, note: INTERNAL_NOTE },
    '11': { label: 'Giudici e Segreteria gare', destination: EVENT_ACCESS, note: INTERNAL_NOTE },
    '12': { label: 'Parcheggio carrelli', destination: 'Strada Tra I Due Porti 48, Pesaro' },
    '13': { label: 'Carico/Scarico imbarcazioni', destination: EVENT_ACCESS },
    '14': { label: 'Stand', destination: EVENT_ACCESS, note: INTERNAL_NOTE }
  };

  let scale = 1;
  let tx = 0;
  let ty = 0;
  let dragging = false;
  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let startTx = 0;
  let startTy = 0;
  let dragMoved = false;
  let lastDragEnd = -Infinity;

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

  function announce(message) {
    if (status) status.textContent = message;
  }

  function mapsDirectionsUrl(destination) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`;
  }

  function mapHotspot(number) {
    return hotspots.find((button) => button.dataset.logisticsPoint === String(number));
  }

  function legendHotspot(number) {
    return legendHotspots.find((button) => button.dataset.logisticsTarget === String(number));
  }

  function hideSelection() {
    if (selection) selection.hidden = true;
  }

  function clearActivePoint({ hideCard = true } = {}) {
    hotspots.forEach((button) => button.setAttribute('aria-pressed', 'false'));
    legendHotspots.forEach((button) => button.setAttribute('aria-pressed', 'false'));
    if (hideCard) hideSelection();
  }

  function showSelection(number) {
    const data = pointData[String(number)];
    if (!data || !selection) return;

    if (selectionNumber) selectionNumber.textContent = String(number);
    if (selectionTitle) selectionTitle.textContent = data.label;

    if (selectionNote) {
      selectionNote.textContent = data.note || '';
      selectionNote.hidden = !data.note;
    }

    if (directionsLink) {
      directionsLink.href = mapsDirectionsUrl(data.destination);
      directionsLink.setAttribute('aria-label', `Apri Google Maps con indicazioni per ${data.label}`);
    }

    selection.hidden = false;
  }

  function activatePoint(number) {
    const mapButton = mapHotspot(number);
    const legendButtonForPoint = legendHotspot(number);
    if (!mapButton) return null;

    clearActivePoint({ hideCard: false });
    mapButton.setAttribute('aria-pressed', 'true');
    legendButtonForPoint?.setAttribute('aria-pressed', 'true');
    showSelection(number);
    return mapButton;
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

    activatePoint(number);
    const label = pointData[number]?.label || `Punto ${number}`;
    focusNormalized(x, y, 2.45, `${label} selezionato.`);
  }

  function selectFromLegend(button) {
    const number = button.dataset.logisticsTarget;
    const mapButton = activatePoint(number);
    if (!mapButton) return;

    scale = 1;
    tx = 0;
    ty = 0;
    render();

    const label = pointData[number]?.label || `Punto ${number}`;
    announce(`${label} evidenziato sulla mappa.`);
  }

  hotspots.forEach((button) => {
    button.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
    });

    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      focusPoint(button);
    });
  });

  legendHotspots.forEach((button) => {
    button.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
    });

    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      selectFromLegend(button);
    });
  });

  zoomInButton?.addEventListener('click', () => {
    setScale(scale * STEP);
    announce(`Zoom ${Math.round(scale * 100)}%.`);
  });

  zoomOutButton?.addEventListener('click', () => {
    setScale(scale / STEP);
    announce(`Zoom ${Math.round(scale * 100)}%.`);
  });

  resetButton?.addEventListener('click', () => resetMap());

  legendButton?.addEventListener('click', () => {
    focusNormalized(0.775, 0.415, 1.75, 'Legenda della mappa.');
  });

  viewport.addEventListener('wheel', (event) => {
    event.preventDefault();
    const rect = viewport.getBoundingClientRect();
    const factor = event.deltaY < 0 ? 1.14 : 1 / 1.14;
    setScale(scale * factor, event.clientX - rect.left, event.clientY - rect.top);
    announce(`Zoom ${Math.round(scale * 100)}%.`);
  }, { passive: false });

  viewport.addEventListener('dblclick', (event) => {
    event.preventDefault();
    const rect = viewport.getBoundingClientRect();
    setScale(scale < 2 ? 2 : Math.min(MAX_SCALE, scale * 1.35), event.clientX - rect.left, event.clientY - rect.top);
    announce(`Zoom ${Math.round(scale * 100)}%.`);
  });

  viewport.addEventListener('pointerdown', (event) => {
    if (event.target.closest?.('[data-logistics-point], [data-logistics-legend-point]')) return;
    if (scale <= 1.001 || event.button !== 0) return;
    dragging = true;
    dragMoved = false;
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
    if (Math.hypot(event.clientX - startX, event.clientY - startY) > 6) {
      dragMoved = true;
    }
    tx = startTx + event.clientX - startX;
    ty = startTy + event.clientY - startY;
    render();
  });

  function endDrag(event) {
    if (!dragging || (event && event.pointerId !== pointerId)) return;
    dragging = false;
    if (dragMoved) lastDragEnd = performance.now();
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

  viewport.addEventListener('click', (event) => {
    if (event.target.closest?.('[data-logistics-point], [data-logistics-legend-point]')) return;
    if (performance.now() - lastDragEnd < 250) return;

    const rect = viewport.getBoundingClientRect();
    let nearestButton = null;
    let nearestDistance = Infinity;

    hotspots.forEach((button) => {
      const x = Number(button.dataset.mapX);
      const y = Number(button.dataset.mapY);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;

      const screenX = rect.left + tx + x * rect.width * scale;
      const screenY = rect.top + ty + y * rect.height * scale;
      const distance = Math.hypot(event.clientX - screenX, event.clientY - screenY);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestButton = button;
      }
    });

    const hitRadius = 46 * Math.min(1.65, Math.max(1, scale));
    if (nearestButton && nearestDistance <= hitRadius) {
      focusPoint(nearestButton);
    }
  });

  viewport.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();

    if (key === '+' || key === '=') {
      event.preventDefault();
      setScale(scale * STEP);
      announce(`Zoom ${Math.round(scale * 100)}%.`);
      return;
    }

    if (key === '-') {
      event.preventDefault();
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
      focusNormalized(0.775, 0.415, 1.75, 'Legenda della mappa.');
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
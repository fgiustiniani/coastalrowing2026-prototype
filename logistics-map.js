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
  const popover = root.querySelector('[data-logistics-popover]');
  const popoverTitle = root.querySelector('[data-logistics-popover-title]');
  const popoverClose = root.querySelector('[data-logistics-popover-close]');
  const directionsLink = root.querySelector('[data-logistics-directions]');

  if (!viewport || !stage) return;

  const MIN_SCALE = 1;
  const MAX_SCALE = 4;
  const STEP = 1.35;

  const pointData = {
    '1': { label: 'Parcheggio autovetture', href: 'https://maps.app.goo.gl/mgaSRyb9ETSPAWWn8' },
    '2': { label: 'Area imbarcazioni', href: 'https://maps.app.goo.gl/8ouoP92AmxmiMSpV9' },
    '3': { label: 'Remoergometri', href: 'https://maps.app.goo.gl/gnsDZq8upJsce1rUA' },
    '4': { label: 'Spogliatoi', href: 'https://maps.app.goo.gl/Q9oqx5rz3vjTvsRQ8' },
    '5': { label: 'Area premiazioni', href: 'https://maps.app.goo.gl/TysJzh64PogUqsWE7' },
    '6': { label: 'Riunione capitani', href: 'https://maps.app.goo.gl/DGfSHpoN7i3Wt4RC7' },
    '7': { label: 'Punto ristoro', href: 'https://maps.app.goo.gl/DGfSHpoN7i3Wt4RC7' },
    '8': { label: 'Soccorso', href: 'https://maps.app.goo.gl/9geUCNftSE8A1F6h6' },
    '9': { label: 'Servizi', href: 'https://maps.app.goo.gl/Pc8ofT7eu1EyEWMEA' },
    '10': { label: 'Food truck e maxischermo', href: 'https://maps.app.goo.gl/Sv7j2GNW8ATJ5t3U6' },
    '11': { label: 'Giudici e Segreteria gare', href: 'https://maps.app.goo.gl/oWVCbN2UQYbQTa9b7' },
    '12': { label: 'Parcheggio carrelli', href: 'https://maps.app.goo.gl/z9TCStLaTCEJsKgJA' },
    '13': { label: 'Carico/Scarico imbarcazioni', href: 'https://maps.app.goo.gl/bBBGfXqxEwEJKKPU8' },
    '14': { label: 'Stand', href: 'https://maps.app.goo.gl/dGQSvVoBD2UCh7CQ9' },
    'water': { label: 'Water refill', href: 'https://maps.app.goo.gl/BpdJzzSwQpwoyeGV8' }
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
  let activePoint = null;

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

  function mapHotspot(number) {
    return hotspots.find((button) => button.dataset.logisticsPoint === String(number));
  }

  function legendHotspot(number) {
    return legendHotspots.find((button) => button.dataset.logisticsTarget === String(number));
  }

  function setHover(number, hovered) {
    mapHotspot(number)?.classList.toggle('is-hovered', hovered);
    legendHotspot(number)?.classList.toggle('is-hovered', hovered);
  }

  function updatePopoverPosition() {
    if (!popover || popover.hidden || !activePoint) return;

    const button = mapHotspot(activePoint);
    if (!button) return;

    const x = Number(button.dataset.mapX);
    const y = Number(button.dataset.mapY);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;

    const { width, height } = dimensions();
    const screenX = tx + x * width * scale;
    const screenY = ty + y * height * scale;
    const halfWidth = Math.min(150, Math.max(90, width / 2 - 10));
    const clampedX = Math.max(halfWidth, Math.min(width - halfWidth, screenX));
    const clampedY = Math.max(10, Math.min(height - 10, screenY));

    popover.style.left = `${clampedX}px`;
    popover.style.top = `${clampedY}px`;
    popover.classList.toggle('logistics-map-interactive__popover--below', screenY < 100);
  }

  function render() {
    const clamped = clampTranslation(tx, ty, scale);
    tx = clamped.x;
    ty = clamped.y;
    stage.style.transform = `matrix(${scale}, 0, 0, ${scale}, ${tx}, ${ty})`;
    viewport.classList.toggle('is-zoomed', scale > 1.001);

    if (zoomOutButton) zoomOutButton.disabled = scale <= MIN_SCALE + 0.001;
    if (zoomInButton) zoomInButton.disabled = scale >= MAX_SCALE - 0.001;
    updatePopoverPosition();
  }

  function announce(message) {
    if (status) status.textContent = message;
  }

  function closePopover(clearSelection = false) {
    if (popover) popover.hidden = true;
    if (clearSelection) {
      activePoint = null;
      hotspots.forEach((button) => button.setAttribute('aria-pressed', 'false'));
      legendHotspots.forEach((button) => button.setAttribute('aria-pressed', 'false'));
    }
  }

  function clearActivePoint() {
    activePoint = null;
    hotspots.forEach((button) => button.setAttribute('aria-pressed', 'false'));
    legendHotspots.forEach((button) => button.setAttribute('aria-pressed', 'false'));
    closePopover();
  }

  function showPopover(number) {
    const data = pointData[String(number)];
    if (!data || !popover) return;

    activePoint = String(number);
    if (popoverTitle) popoverTitle.textContent = data.label;

    if (directionsLink) {
      directionsLink.href = data.href;
      directionsLink.setAttribute('aria-label', `Portami a ${data.label} con Google Maps`);
    }

    popover.hidden = false;
    updatePopoverPosition();
  }

  function activatePoint(number) {
    const mapButton = mapHotspot(number);
    if (!mapButton) return;

    hotspots.forEach((button) => button.setAttribute('aria-pressed', String(button === mapButton)));
    legendHotspots.forEach((button) => button.setAttribute('aria-pressed', String(button === legendHotspot(number))));
    showPopover(number);

    const label = pointData[String(number)]?.label || `Punto ${number}`;
    announce(`${label} selezionato.`);
  }

  function bindHover(button, number) {
    button.addEventListener('mouseenter', () => setHover(number, true));
    button.addEventListener('mouseleave', () => setHover(number, false));
    button.addEventListener('focus', () => setHover(number, true));
    button.addEventListener('blur', () => setHover(number, false));
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
    clearActivePoint();
    render();
    announce(message);
  }

  hotspots.forEach((button) => {
    const number = button.dataset.logisticsPoint;
    bindHover(button, number);

    button.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
    });

    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      activatePoint(number);
    });
  });

  legendHotspots.forEach((button) => {
    const number = button.dataset.logisticsTarget;
    bindHover(button, number);

    button.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
    });

    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      activatePoint(number);
    });
  });

  popoverClose?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    closePopover(true);
    announce('Selezione chiusa.');
  });

  directionsLink?.addEventListener('click', (event) => {
    event.stopPropagation();
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
    if (event.target.closest?.('[data-logistics-point], [data-logistics-legend-point], [data-logistics-popover]')) return;
    event.preventDefault();
    const rect = viewport.getBoundingClientRect();
    setScale(scale < 2 ? 2 : Math.min(MAX_SCALE, scale * 1.35), event.clientX - rect.left, event.clientY - rect.top);
    announce(`Zoom ${Math.round(scale * 100)}%.`);
  });

  viewport.addEventListener('pointerdown', (event) => {
    if (event.target.closest?.('[data-logistics-point], [data-logistics-legend-point], [data-logistics-popover]')) return;
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
    if (event.target.closest?.('[data-logistics-point], [data-logistics-legend-point], [data-logistics-popover]')) return;
    if (performance.now() - lastDragEnd < 250) return;

    const rect = viewport.getBoundingClientRect();
    let nearestButton = null;
    let nearestDistance = Infinity;

    hotspots.forEach((button) => {
      const x = Number(button.dataset.mapX);
      const y = Number(button.dataset.mapY);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;

      const screenX = tx + x * rect.width * scale;
      const screenY = ty + y * rect.height * scale;
      const distance = Math.hypot(event.clientX - rect.left - screenX, event.clientY - rect.top - screenY);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestButton = button;
      }
    });

    const hitRadius = 42 * Math.min(1.65, Math.max(1, scale));
    if (nearestButton && nearestDistance <= hitRadius) {
      activatePoint(nearestButton.dataset.logisticsPoint);
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
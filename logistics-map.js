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
  const passDownloadLink = root.querySelector('[data-logistics-pass-download]');
  const fullscreenOpenButton = root.querySelector('[data-logistics-fullscreen-open]');
  const fullscreen = root.querySelector('[data-logistics-fullscreen]');
  const fullscreenHost = root.querySelector('[data-logistics-fullscreen-host]');
  const fullscreenCloseButton = root.querySelector('[data-logistics-fullscreen-close]');

  if (!viewport || !stage) return;

  const MIN_SCALE = 1;
  const MAX_SCALE = 4;
  const STEP = 1.35;

  const pointData = {
     '1': { label: 'Parcheggio autovetture', href: '/api/walking-directions?point=1', passHref: 'assets/downloads/Parcheggio.pdf' },
     '2': { label: 'Area imbarcazioni', href: '/api/walking-directions?point=2' },
     '3': { label: 'Remoergometri', href: '/api/walking-directions?point=3' },
     '4': { label: 'Spogliatoi', href: '/api/walking-directions?point=4' },
     '5': { label: 'Area premiazioni', href: '/api/walking-directions?point=5' },
     '6': { label: 'Riunione capitani', href: '/api/walking-directions?point=6' },
     '7': { label: 'Punto ristoro', href: '/api/walking-directions?point=7' },
     '8': { label: 'Soccorso', href: '/api/walking-directions?point=8' },
     '9': { label: 'Servizi', href: '/api/walking-directions?point=9' },
     '10': { label: 'Food truck e maxischermo', href: '/api/walking-directions?point=10' },
     '11': { label: 'Giudici e Segreteria gare', href: '/api/walking-directions?point=11' },
     '12': { label: 'Parcheggio carrelli', href: '/api/walking-directions?point=12' },
     '13': { label: 'Carico/Scarico imbarcazioni', href: '/api/walking-directions?point=13' },
     '14': { label: 'Stand', href: '/api/walking-directions?point=14' },
     'water': { label: 'Water refill', href: '/api/walking-directions?point=water' },
    'ingresso': { label: 'Ingresso campo gara', href: '/api/walking-directions?point=ingresso' }
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
  let fullscreenOpen = false;
  let pinchStartDistance = 0;
  let pinchStartScale = 1;
  let pinchMapX = 0;
  let pinchMapY = 0;
  let lastPinchEnd = -Infinity;
  const viewportHome = viewport.parentNode;
  const viewportHomeNextSibling = viewport.nextSibling;

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
    stage.style.setProperty('--hotspot-inverse-scale', String(1 / scale));
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

  function clearTransientHighlights() {
    [...hotspots, ...legendHotspots].forEach((button) => {
      button.classList.remove('is-hovered');
      if (button === document.activeElement && typeof button.blur === 'function') {
        button.blur();
      }
    });
  }

  function clearActivePoint() {
    activePoint = null;
    clearTransientHighlights();
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

    if (passDownloadLink) {
      const hasPass = Boolean(data.passHref);
      passDownloadLink.hidden = !hasPass;
      if (hasPass) {
        passDownloadLink.href = data.passHref;
        passDownloadLink.setAttribute('aria-label', 'Scarica il pass per il parcheggio autovetture');
      }
      popover.classList.toggle('logistics-map-interactive__popover--with-pass', hasPass);
    }

    popover.hidden = false;
    updatePopoverPosition();
  }

  function activatePoint(number) {
    const mapButton = mapHotspot(number);
    if (!mapButton) return;

    clearTransientHighlights();
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

  function openFullscreenMap() {
    if (!fullscreen || !fullscreenHost || fullscreenOpen) return;

    scale = 1;
    tx = 0;
    ty = 0;
    pinchStartDistance = 0;
    clearActivePoint();

    fullscreenOpen = true;
    fullscreen.hidden = false;
    document.body.classList.add('logistics-map-fullscreen-open');
    fullscreenHost.appendChild(viewport);

    window.requestAnimationFrame(() => {
      render();
      fullscreenCloseButton?.focus();
    });
  }

  function closeFullscreenMap() {
    if (!fullscreen || !fullscreenOpen) return;

    fullscreenOpen = false;
    scale = 1;
    tx = 0;
    ty = 0;
    pinchStartDistance = 0;
    clearActivePoint();

    if (viewportHomeNextSibling && viewportHomeNextSibling.parentNode === viewportHome) {
      viewportHome.insertBefore(viewport, viewportHomeNextSibling);
    } else {
      viewportHome.appendChild(viewport);
    }

    fullscreen.hidden = true;
    document.body.classList.remove('logistics-map-fullscreen-open');

    window.requestAnimationFrame(() => {
      render();
      fullscreenOpenButton?.focus();
    });
  }

  function touchDistance(touchA, touchB) {
    return Math.hypot(touchB.clientX - touchA.clientX, touchB.clientY - touchA.clientY);
  }

  function touchCenter(touchA, touchB) {
    const rect = viewport.getBoundingClientRect();
    return {
      x: ((touchA.clientX + touchB.clientX) / 2) - rect.left,
      y: ((touchA.clientY + touchB.clientY) / 2) - rect.top
    };
  }

  function isTouchFullscreen() {
    return fullscreenOpen && window.matchMedia?.('(pointer: coarse)').matches;
  }

  function nearestFullscreenTarget(clientX, clientY) {
    const rect = viewport.getBoundingClientRect();
    let nearestNumber = null;
    let nearestDistance = Infinity;

    hotspots.forEach((button) => {
      const x = Number(button.dataset.mapX);
      const y = Number(button.dataset.mapY);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;

      const centerX = rect.left + tx + x * rect.width * scale;
      const centerY = rect.top + ty + y * rect.height * scale;
      const distance = Math.hypot(clientX - centerX, clientY - centerY);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestNumber = button.dataset.logisticsPoint || null;
      }
    });

    legendHotspots.forEach((button) => {
      const x = parseFloat(button.style.getPropertyValue('--legend-x')) / 100;
      const y = parseFloat(button.style.getPropertyValue('--legend-y')) / 100;
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;

      const centerX = rect.left + tx + x * rect.width * scale;
      const centerY = rect.top + ty + y * rect.height * scale;
      const distance = Math.hypot(clientX - centerX, clientY - centerY);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestNumber = button.dataset.logisticsTarget || null;
      }
    });

    return { number: nearestNumber, distance: nearestDistance };
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

  function nearestLegendButton(event) {
    let nearest = null;
    let nearestDistance = Infinity;

    legendHotspots.forEach((button) => {
      const rect = button.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const distance = Math.hypot(event.clientX - centerX, event.clientY - centerY);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = button;
      }
    });

    return nearest;
  }

  legendHotspots.forEach((button) => {
    const number = button.dataset.logisticsTarget;
    bindHover(button, number);

    button.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
    });

    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const nearest = nearestLegendButton(event) || button;
      activatePoint(nearest.dataset.logisticsTarget);
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

  passDownloadLink?.addEventListener('click', (event) => {
    event.stopPropagation();
  });

  fullscreenOpenButton?.addEventListener('click', openFullscreenMap);
  fullscreenCloseButton?.addEventListener('click', closeFullscreenMap);

  viewport.addEventListener('touchstart', (event) => {
    if (event.touches.length !== 2) return;

    event.preventDefault();
    const [touchA, touchB] = event.touches;
    const center = touchCenter(touchA, touchB);

    pinchStartDistance = touchDistance(touchA, touchB);
    pinchStartScale = scale;
    pinchMapX = (center.x - tx) / scale;
    pinchMapY = (center.y - ty) / scale;
    dragging = false;
    pointerId = null;
    viewport.classList.remove('is-dragging');
  }, { passive: false });

  viewport.addEventListener('touchmove', (event) => {
    if (event.touches.length !== 2 || pinchStartDistance <= 0) return;

    event.preventDefault();
    const [touchA, touchB] = event.touches;
    const center = touchCenter(touchA, touchB);
    const ratio = touchDistance(touchA, touchB) / pinchStartDistance;
    const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, pinchStartScale * ratio));

    scale = nextScale;
    tx = center.x - pinchMapX * scale;
    ty = center.y - pinchMapY * scale;
    render();
    announce(`Zoom ${Math.round(scale * 100)}%.`);
  }, { passive: false });

  viewport.addEventListener('touchend', (event) => {
    if (event.touches.length < 2 && pinchStartDistance > 0) {
      pinchStartDistance = 0;
      lastPinchEnd = performance.now();
    }
  }, { passive: true });

  viewport.addEventListener('touchcancel', () => {
    if (pinchStartDistance > 0) lastPinchEnd = performance.now();
    pinchStartDistance = 0;
  }, { passive: true });

  viewport.addEventListener('click', (event) => {
    if (!isTouchFullscreen()) return;
    if (event.target.closest?.('[data-logistics-popover]')) return;

    if (
      performance.now() - lastDragEnd < 320 ||
      performance.now() - lastPinchEnd < 320
    ) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    const hit = nearestFullscreenTarget(event.clientX, event.clientY);
    const hitRadius = 48;

    event.preventDefault();
    event.stopPropagation();

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    clearTransientHighlights();

    if (hit.number && hit.distance <= hitRadius) {
      activatePoint(hit.number);
    } else {
      closePopover(true);
      announce('Selezione chiusa.');
    }
  }, true);

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

    closePopover(true);
    announce('Selezione chiusa.');
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && fullscreenOpen) {
      event.preventDefault();
      closeFullscreenMap();
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
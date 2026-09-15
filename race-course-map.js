(() => {
  'use strict';

  const root = document.querySelector('[data-race-course-map]');
  if (!root) return;

  const canvas = root.querySelector('[data-race-map-canvas]');
  const overlay = root.querySelector('[data-race-map-overlay]');
  const hotspotLayer = root.querySelector('[data-race-hotspots]');
  const popover = root.querySelector('[data-race-popover]');
  const activeLabel = root.querySelector('[data-race-active-label]');
  const pointRows = [...root.querySelectorAll('[data-race-point]')];
  const routeButtons = [...root.querySelectorAll('[data-race-route]')];
  const pdfLink = root.querySelector('[data-race-pdf-download]');
  const routeDataScope = root.closest('#campo-gara') || document;
  const routeTemplates = new Map(
    [...routeDataScope.querySelectorAll('template[data-race-route-data]')]
      .map((template) => [template.dataset.raceRouteData, template])
  );

  if (!canvas || !overlay || !hotspotLayer || !popover || !pointRows.length || !routeButtons.length) return;

  const svgNamespace = 'http://www.w3.org/2000/svg';
  const mapWidth = 1200;
  const mapHeight = 675;
  const routeDistanceLabels = {
    master: [
      { from: 0, to: 1, label: '1.150 m' },
      { from: 1, to: 2, label: '650 m' },
      { from: 2, to: 3, label: '550 m' },
      { from: 3, to: 4, label: '650 m' }
    ],
    pr3: [
      { from: 0, to: 1, label: '690 m' },
      { from: 1, to: 2, label: '290 m' },
      { from: 2, to: 3, label: '670 m' }
    ],
    senior: [
      { from: 0, to: 1, label: '1.150 m' },
      { from: 1, to: 2, label: '650 m' },
      { from: 2, to: 3, label: '875 m' },
      { from: 3, to: 4, label: '750 m' },
      { from: 4, to: 6, label: '1.375 m' },
      { from: 6, to: 7, label: '550 m' },
      { from: 7, to: 8, label: '650 m' }
    ]
  };

  // Calibrazione affine ottenuta dai marker georeferenziati presenti nell'SVG di base.
  function mapPoint(lat, lng) {
    return {
      x: (19882.1931463125 * lng) - (27746.857828965 * lat) + 962285.949316965,
      y: (-19805.1019611225 * lng) - (27683.7751549425 * lat) + 1472144.657960408
    };
  }

  function routeCoordinates(routeId) {
    const template = routeTemplates.get(routeId);
    if (!template) return [];

    return [...template.content.querySelectorAll('[data-lat][data-lng]')]
      .map((node) => mapPoint(Number(node.dataset.lat), Number(node.dataset.lng)))
      .filter(({ x, y }) => Number.isFinite(x) && Number.isFinite(y));
  }

  function copyText(text, button) {
    const done = () => {
      if (!button) return;
      const original = button.textContent;
      button.textContent = 'Copiato';
      window.setTimeout(() => { button.textContent = original; }, 1300);
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text, done) {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    try { document.execCommand('copy'); done(); } catch (_) { /* no-op */ }
    area.remove();
  }

  function closePopover() {
    popover.hidden = true;
    hotspotLayer.querySelectorAll('[aria-expanded="true"]')
      .forEach((button) => button.setAttribute('aria-expanded', 'false'));
  }

  function openPopover(row, button, point) {
    hotspotLayer.querySelectorAll('[aria-expanded="true"]')
      .forEach((item) => item.setAttribute('aria-expanded', 'false'));
    button.setAttribute('aria-expanded', 'true');

    const lat = Number(row.dataset.lat).toFixed(6);
    const lng = Number(row.dataset.lng).toFixed(6);
    const coords = `${lat}, ${lng}`;
    const title = popover.querySelector('[data-race-popover-title]');
    const coordinateText = popover.querySelector('[data-race-popover-coordinates]');
    const note = popover.querySelector('[data-race-popover-note]');
    const copyButton = popover.querySelector('[data-race-popover-copy]');

    title.textContent = row.dataset.label;
    coordinateText.textContent = coords;
    note.textContent = row.dataset.note || '';
    note.hidden = !row.dataset.note;
    copyButton.dataset.copyCoordinates = coords;

    popover.style.left = `${(point.x / mapWidth) * 100}%`;
    popover.style.top = `${(point.y / mapHeight) * 100}%`;
    popover.classList.toggle('race-course-map__popover--left', point.x > mapWidth * 0.72);
    popover.classList.toggle('race-course-map__popover--right', point.x < mapWidth * 0.22);
    popover.classList.toggle('race-course-map__popover--above', point.y > mapHeight * 0.62);
    popover.hidden = false;
  }

  function createHotspots() {
    pointRows.forEach((row) => {
      if (row.dataset.pointId === 'reference') return;

      const lat = Number(row.dataset.lat);
      const lng = Number(row.dataset.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const point = mapPoint(lat, lng);
      const button = document.createElement('button');
      const isSupplementary = row.dataset.pointId === '2B';
      button.type = 'button';
      button.className = `race-course-map__hotspot${isSupplementary ? ' race-course-map__hotspot--supplementary' : ''}`;
      button.style.left = `${(point.x / mapWidth) * 100}%`;
      button.style.top = `${(point.y / mapHeight) * 100}%`;
      button.setAttribute('aria-label', `${row.dataset.label}: mostra coordinate`);
      button.setAttribute('aria-expanded', 'false');
      button.title = `${row.dataset.label} - mostra coordinate`;
      button.textContent = isSupplementary ? row.dataset.markerLabel : '';
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        openPopover(row, button, point);
      });
      button.addEventListener('mouseenter', () => openPopover(row, button, point));
      button.addEventListener('focus', () => openPopover(row, button, point));
      hotspotLayer.appendChild(button);
    });
  }

  function drawRoute(button) {
    const routeId = button.dataset.raceRoute;
    const points = routeCoordinates(routeId);
    if (!points.length) return;

    overlay.querySelectorAll('[data-active-route-line]').forEach((node) => node.remove());
    const pointList = points.map(({ x, y }) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
    const color = button.dataset.routeColor || '#26c6da';

    const shadow = document.createElementNS(svgNamespace, 'polyline');
    shadow.dataset.activeRouteLine = 'shadow';
    shadow.setAttribute('points', pointList);
    shadow.setAttribute('class', 'race-course-map__route-line race-course-map__route-line--shadow');
    overlay.appendChild(shadow);

    const line = document.createElementNS(svgNamespace, 'polyline');
    line.dataset.activeRouteLine = 'main';
    line.setAttribute('points', pointList);
    line.setAttribute('class', 'race-course-map__route-line');
    line.style.stroke = color;
    overlay.appendChild(line);

    points.slice(1, -1).forEach(({ x, y }) => {
      const turn = document.createElementNS(svgNamespace, 'circle');
      turn.dataset.activeRouteLine = 'turn';
      turn.setAttribute('cx', x.toFixed(2));
      turn.setAttribute('cy', y.toFixed(2));
      turn.setAttribute('r', '6');
      turn.setAttribute('class', 'race-course-map__route-turn');
      turn.style.fill = color;
      overlay.appendChild(turn);
    });

    (routeDistanceLabels[routeId] || []).forEach(({ from, to, label }) => {
      const start = points[from];
      const end = points[to];
      if (!start || !end) return;

      const middleX = (start.x + end.x) / 2;
      const middleY = (start.y + end.y) / 2;
      let angle = Math.atan2(end.y - start.y, end.x - start.x) * (180 / Math.PI);
      if (angle > 90 || angle < -90) angle += 180;

      const distance = document.createElementNS(svgNamespace, 'text');
      distance.dataset.activeRouteLine = 'distance';
      distance.setAttribute('class', 'race-course-map__route-distance');
      distance.setAttribute('x', '0');
      distance.setAttribute('y', '-13');
      distance.setAttribute('transform', `translate(${middleX.toFixed(2)} ${middleY.toFixed(2)}) rotate(${angle.toFixed(2)})`);
      distance.textContent = label;
      overlay.appendChild(distance);
    });
  }

  function clearRoute() {
    routeButtons.forEach((item) => item.setAttribute('aria-pressed', 'false'));
    overlay.querySelectorAll('[data-active-route-line]').forEach((node) => node.remove());
    closePopover();

    if (activeLabel) {
      activeLabel.textContent = '';
      activeLabel.hidden = true;
    }
    if (pdfLink) {
      pdfLink.href = pdfLink.dataset.defaultPdf;
      pdfLink.setAttribute('aria-label', 'Scarica PDF - campo gara completo');
    }
  }

  function activateRoute(button) {
    if (button.getAttribute('aria-pressed') === 'true') {
      clearRoute();
      return;
    }

    routeButtons.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    drawRoute(button);
    closePopover();

    const label = button.dataset.routeLabel || button.textContent.trim();
    if (activeLabel) {
      activeLabel.textContent = label;
      activeLabel.hidden = false;
    }
    if (pdfLink) {
      pdfLink.href = button.dataset.pdf;
      pdfLink.setAttribute('aria-label', `Scarica PDF - ${label}`);
    }
  }

  routeButtons.forEach((button) => {
    button.style.setProperty('--route-color', button.dataset.routeColor || '#26c6da');
    button.addEventListener('click', () => activateRoute(button));
  });

  root.addEventListener('click', (event) => {
    const copyButton = event.target.closest('[data-copy-coordinates]');
    if (copyButton) {
      copyText(copyButton.dataset.copyCoordinates, copyButton);
      return;
    }
    if (!event.target.closest('[data-race-popover]')) closePopover();
  });

  popover.querySelector('[data-race-popover-close]').addEventListener('click', closePopover);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closePopover();
  });

  createHotspots();
  const initialRoute = routeButtons.find((button) => button.getAttribute('aria-pressed') === 'true');
  if (initialRoute) {
    initialRoute.setAttribute('aria-pressed', 'false');
    activateRoute(initialRoute);
  } else {
    clearRoute();
  }
})();

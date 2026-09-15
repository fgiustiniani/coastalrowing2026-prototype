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
  const earthLink = root.querySelector('[data-race-earth]');
  const kmlLink = root.querySelector('[data-race-kml-download]');
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
    const mapsLink = popover.querySelector('[data-race-popover-maps]');

    title.textContent = row.dataset.label;
    coordinateText.textContent = coords;
    note.textContent = row.dataset.note || '';
    note.hidden = !row.dataset.note;
    copyButton.dataset.copyCoordinates = coords;
    mapsLink.href = `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}`;

    popover.style.left = `${(point.x / mapWidth) * 100}%`;
    popover.style.top = `${(point.y / mapHeight) * 100}%`;
    popover.classList.toggle('race-course-map__popover--left', point.x > mapWidth * 0.72);
    popover.classList.toggle('race-course-map__popover--right', point.x < mapWidth * 0.22);
    popover.classList.toggle('race-course-map__popover--above', point.y > mapHeight * 0.62);
    popover.hidden = false;
  }

  function createHotspots() {
    pointRows.forEach((row) => {
      const lat = Number(row.dataset.lat);
      const lng = Number(row.dataset.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const point = mapPoint(lat, lng);
      const button = document.createElement('button');
      const isSupplementary = ['2B', 'reference'].includes(row.dataset.pointId);
      button.type = 'button';
      button.className = `race-course-map__hotspot${isSupplementary ? ' race-course-map__hotspot--supplementary' : ''}`;
      button.style.left = `${(point.x / mapWidth) * 100}%`;
      button.style.top = `${(point.y / mapHeight) * 100}%`;
      button.setAttribute('aria-label', `${row.dataset.label}: mostra coordinate`);
      button.setAttribute('aria-expanded', 'false');
      button.title = `${row.dataset.label} - mostra coordinate`;
      button.textContent = isSupplementary
        ? (row.dataset.pointId === 'reference' ? 'R' : row.dataset.markerLabel)
        : '';
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
  }

  function activateRoute(button) {
    routeButtons.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    drawRoute(button);
    closePopover();

    const label = button.dataset.routeLabel || button.textContent.trim();
    if (activeLabel) activeLabel.textContent = label;

    if (earthLink) {
      earthLink.href = button.dataset.kml;
      earthLink.setAttribute('aria-label', `Apri ${label} in Google Earth`);
    }
    if (kmlLink) {
      kmlLink.href = button.dataset.kml;
      kmlLink.setAttribute('aria-label', `Scarica KML - ${label}`);
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
  activateRoute(routeButtons.find((button) => button.getAttribute('aria-pressed') === 'true') || routeButtons[0]);
})();

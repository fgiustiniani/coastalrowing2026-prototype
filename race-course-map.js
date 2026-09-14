(() => {
  'use strict';

  const root = document.querySelector('[data-race-course-map]');
  if (!root || !window.L) return;

  const canvas = root.querySelector('[data-race-map-canvas]');
  const pointRows = [...root.querySelectorAll('[data-race-point]')];
  const routeButtons = [...root.querySelectorAll('[data-race-route]')];
  const earthLink = root.querySelector('[data-race-earth]');
  const downloadLink = root.querySelector('[data-race-kml-download]');
  const routeTemplates = new Map(
    [...root.querySelectorAll('template[data-race-route-data]')]
      .map((template) => [template.dataset.raceRouteData, template])
  );

  if (!canvas || !pointRows.length || !routeButtons.length) return;

  const map = L.map(canvas, {
    scrollWheelZoom: false,
    zoomControl: true
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  const allBounds = [];
  let routeLayer = null;

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

  function popupNode(row) {
    const lat = row.dataset.lat;
    const lng = row.dataset.lng;
    const coords = `${lat}, ${lng}`;
    const node = document.createElement('div');
    node.className = 'race-course-map__popup';

    const title = document.createElement('strong');
    title.textContent = row.dataset.label;
    node.appendChild(title);

    const coordText = document.createElement('span');
    coordText.className = 'race-course-map__popup-coords';
    coordText.textContent = coords;
    node.appendChild(coordText);

    if (row.dataset.note) {
      const note = document.createElement('p');
      note.className = 'race-course-map__popup-note';
      note.textContent = row.dataset.note;
      node.appendChild(note);
    }

    const actions = document.createElement('div');
    actions.className = 'race-course-map__popup-actions';

    const copy = document.createElement('button');
    copy.type = 'button';
    copy.textContent = 'Copia coordinate';
    copy.addEventListener('click', () => copyText(coords, copy));
    actions.appendChild(copy);

    const maps = document.createElement('a');
    maps.href = `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}`;
    maps.target = '_blank';
    maps.rel = 'noopener noreferrer';
    maps.textContent = 'Apri punto';
    actions.appendChild(maps);

    node.appendChild(actions);
    return node;
  }

  pointRows.forEach((row) => {
    const lat = Number(row.dataset.lat);
    const lng = Number(row.dataset.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const isReference = row.dataset.pointId === 'reference';
    const markerLabel = isReference ? 'R' : row.dataset.markerLabel;
    const icon = L.divIcon({
      className: '',
      html: `<span class="race-course-map__marker${isReference ? ' race-course-map__marker--reference' : ''}">${markerLabel}</span>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -15]
    });

    L.marker([lat, lng], { icon, title: row.dataset.label })
      .addTo(map)
      .bindPopup(() => popupNode(row), { maxWidth: 310 });

    allBounds.push([lat, lng]);
  });

  root.addEventListener('click', (event) => {
    const button = event.target.closest('[data-copy-coordinates]');
    if (!button) return;
    copyText(button.dataset.copyCoordinates, button);
  });

  function routeCoordinates(routeId) {
    const template = routeTemplates.get(routeId);
    if (!template) return [];
    return [...template.content.querySelectorAll('[data-lat][data-lng]')]
      .map((node) => [Number(node.dataset.lat), Number(node.dataset.lng)])
      .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));
  }

  function activateRoute(button, { fit = true } = {}) {
    const routeId = button.dataset.raceRoute;
    const coords = routeCoordinates(routeId);
    if (!coords.length) return;

    routeButtons.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));

    if (routeLayer) routeLayer.remove();
    routeLayer = L.polyline(coords, {
      color: '#0b6b88',
      weight: 5,
      opacity: 0.9,
      lineJoin: 'round'
    }).addTo(map);

    const kml = button.dataset.kml;
    const label = button.dataset.routeLabel || button.textContent.trim();
    if (earthLink) {
      earthLink.href = kml;
      earthLink.setAttribute('aria-label', `Apri ${label} in Google Earth`);
    }
    if (downloadLink) {
      downloadLink.href = kml;
      downloadLink.download = '';
      downloadLink.setAttribute('aria-label', `Scarica KML - ${label}`);
    }

    if (fit) {
      map.fitBounds(L.latLngBounds(coords), { padding: [42, 42], maxZoom: 15 });
    }
  }

  routeButtons.forEach((button) => {
    button.addEventListener('click', () => activateRoute(button));
  });

  if (allBounds.length) {
    map.fitBounds(L.latLngBounds(allBounds), { padding: [32, 32], maxZoom: 15 });
  }

  activateRoute(routeButtons.find((button) => button.getAttribute('aria-pressed') === 'true') || routeButtons[0], { fit: false });

  window.setTimeout(() => map.invalidateSize(), 0);
})();

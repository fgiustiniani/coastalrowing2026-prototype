(() => {
  const section = document.querySelector('.city-food');
  if (!section) return;

  const filterButtons = Array.from(section.querySelectorAll('[data-food-filter]'));
  const viewButtons = Array.from(section.querySelectorAll('[data-food-view]'));
  const cards = Array.from(section.querySelectorAll('.food-place'));
  const listView = section.querySelector('[data-food-list]');
  const mapView = section.querySelector('[data-food-map-view]');
  const countLabel = section.querySelector('[data-food-count]');
  const emptyState = section.querySelector('[data-food-empty]');
  const mapStatus = section.querySelector('[data-food-map-status]');
  const mapElement = section.querySelector('#food-map');
  const mapLegend = section.querySelector('.food-map-legend');
  const locateButton = section.querySelector('[data-food-locate]');
  const locateLabel = section.querySelector('[data-food-locate-label]');
  const locationStatus = section.querySelector('[data-food-location-status]');
  const detailDialog = section.querySelector('[data-food-detail-dialog]');
  const detailClose = section.querySelector('[data-food-detail-close]');
  const detailName = section.querySelector('[data-food-detail-name]');
  const detailTypes = section.querySelector('[data-food-detail-types]');
  const detailAddress = section.querySelector('[data-food-detail-address]');
  const detailSite = section.querySelector('[data-food-detail-site]');
  const detailMaps = section.querySelector('[data-food-detail-maps]');

  if (!cards.length) return;

  const CATEGORY_ICONS = {
    ristorante: 'assets/icons/food/ristorante.svg',
    pizzeria: 'assets/icons/food/pizzeria.svg',
    'lounge-bistrot': 'assets/icons/food/lounge-bistrot.svg',
    gelateria: 'assets/icons/food/gelateria.svg',
    piadineria: 'assets/icons/food/piadineria.svg',
    pub: 'assets/icons/food/pub.svg'
  };

  const CLUB = {
    name: 'Società Canottieri Pesaro',
    address: 'Calata Caio Duilio 101, Pesaro',
    mapsUrl: 'https://maps.app.goo.gl/hVLey2a4q3Aj1V1XA',
    logoUrl: 'assets/logos/canottieri-pesaro-logo_DEPOSITATO.png',
    fallbackLat: 43.92285,
    fallbackLng: 12.90655,
    cacheKey: 'coastal-club-location-v1'
  };

  const selectedCategories = new Set();
  const categoryCounts = new Map();

  const getCardCategories = (card) => String(card.dataset.categories || '')
    .split(/\s+/)
    .filter(Boolean);

  const getPlaceName = (card) => {
    const link = card.querySelector('.food-place__name-link');
    return link?.textContent.replace('↗', '').trim() || 'Locale';
  };

  const getCategoryLabels = (card) => Array.from(card.querySelectorAll('.food-place__category'))
    .map((item) => item.textContent.trim())
    .filter(Boolean);

  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[character]));

  cards.forEach((card) => {
    getCardCategories(card)
      .forEach((category) => categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1));
  });

  filterButtons.forEach((button) => {
    const category = button.dataset.foodFilter;
    if (category && category !== 'all' && !categoryCounts.has(category)) {
      button.disabled = true;
      button.setAttribute('aria-disabled', 'true');
    }
  });

  const cardMatchesFilters = (card) => {
    if (!selectedCategories.size) return true;
    const categories = new Set(getCardCategories(card));
    return Array.from(selectedCategories).some((category) => categories.has(category));
  };

  const visibleCards = () => cards.filter((card) => !card.hidden);

  const updateCount = () => {
    if (!countLabel) return;
    const count = visibleCards().length;
    countLabel.textContent = `${count} ${count === 1 ? 'locale' : 'locali'}`;
  };

  let map = null;
  const markers = new Map();
  let clubMarker = null;
  let clubLatLng = null;
  let userMarker = null;
  let userAccuracyCircle = null;
  let userLatLng = null;

  const fitMapToVisiblePoints = () => {
    if (!map) return;

    const points = Array.from(markers.values())
      .filter(({ marker }) => map.hasLayer(marker))
      .map(({ marker }) => marker.getLatLng());

    if (clubLatLng) points.push(clubLatLng);
    if (userLatLng) points.push(userLatLng);

    if (points.length === 1) {
      map.setView(points[0], 16);
      return;
    }

    if (points.length > 1) {
      map.fitBounds(window.L.latLngBounds(points).pad(0.18), { maxZoom: 16 });
    }
  };

  const updateMapMarkers = () => {
    if (!map) return;

    markers.forEach(({ marker, card }) => {
      const shouldShow = !card.hidden;
      const isOnMap = map.hasLayer(marker);
      if (shouldShow && !isOnMap) marker.addTo(map);
      if (!shouldShow && isOnMap) map.removeLayer(marker);
    });

    fitMapToVisiblePoints();
  };

  const applyFilters = () => {
    cards.forEach((card) => {
      card.hidden = !cardMatchesFilters(card);
    });

    const allButton = filterButtons.find((button) => button.dataset.foodFilter === 'all');
    if (allButton) {
      const allActive = selectedCategories.size === 0;
      allButton.classList.toggle('is-active', allActive);
      allButton.setAttribute('aria-pressed', String(allActive));
    }

    filterButtons
      .filter((button) => button.dataset.foodFilter !== 'all')
      .forEach((button) => {
        const active = selectedCategories.has(button.dataset.foodFilter);
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', String(active));
      });

    updateCount();
    if (emptyState) emptyState.hidden = visibleCards().length !== 0;
    updateMapMarkers();
  };

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (button.disabled) return;
      const category = button.dataset.foodFilter;

      if (category === 'all') {
        selectedCategories.clear();
      } else if (selectedCategories.has(category)) {
        selectedCategories.delete(category);
      } else {
        selectedCategories.add(category);
      }

      applyFilters();
    });
  });

  const openPlaceDetail = (card, addressElement) => {
    if (!detailDialog) return;

    const website = card.querySelector('.food-place__name-link');
    const categories = getCategoryLabels(card);
    const address = addressElement.querySelector('.food-place__address-label')?.textContent.trim() || '';

    if (detailName) detailName.textContent = getPlaceName(card);
    if (detailTypes) detailTypes.textContent = categories.join(' · ');
    if (detailAddress) detailAddress.textContent = address;

    if (detailSite) {
      if (website?.href) {
        detailSite.href = website.href;
        detailSite.hidden = false;
      } else {
        detailSite.removeAttribute('href');
        detailSite.hidden = true;
      }
    }

    if (detailMaps) detailMaps.href = addressElement.href;

    if (detailDialog.open) detailDialog.close();
    detailDialog.showModal();
  };

  detailClose?.addEventListener('click', () => detailDialog?.close());
  detailDialog?.addEventListener('click', (event) => {
    if (event.target === detailDialog) detailDialog.close();
  });

  const createPlaceMarker = (card, addressElement, lat, lng) => {
    const name = getPlaceName(card);
    const address = addressElement.querySelector('.food-place__address-label')?.textContent.trim() || '';
    const categories = getCardCategories(card).filter((category) => CATEGORY_ICONS[category]);
    const categoryLabels = getCategoryLabels(card);
    const iconWidth = categories.length > 1 ? 68 : 44;
    const iconImages = categories
      .map((category) => `<img src="${CATEGORY_ICONS[category]}" alt="">`)
      .join('');

    const icon = window.L.divIcon({
      className: 'food-map-marker-wrapper',
      html: `<span class="food-map-marker food-map-marker--icons" aria-hidden="true">${iconImages}</span>`,
      iconSize: [iconWidth, 44],
      iconAnchor: [iconWidth / 2, 22]
    });

    const marker = window.L.marker([lat, lng], {
      icon,
      keyboard: true,
      riseOnHover: true,
      title: `${name} — ${address}`,
      alt: name
    });

    marker.on('click', () => openPlaceDetail(card, addressElement));

    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      const hoverDetail = `
        <div style="min-width:190px;max-width:250px;padding:3px 2px;line-height:1.35;">
          <strong style="display:block;color:#102235;font-size:1rem;margin-bottom:3px;">${escapeHtml(name)}</strong>
          <span style="display:block;color:#1f6387;font-size:.76rem;font-weight:800;margin-bottom:5px;">${escapeHtml(categoryLabels.join(' · '))}</span>
          <span style="display:block;color:#516170;font-size:.82rem;">${escapeHtml(address)}</span>
          <span style="display:block;color:#6f7d89;font-size:.72rem;margin-top:6px;">Clicca per aprire il dettaglio</span>
        </div>`;

      marker.bindTooltip(hoverDetail, {
        direction: 'top',
        offset: [0, -18],
        opacity: 1,
        interactive: false,
        className: 'food-map-hover-card'
      });
    }

    return marker;
  };

  const addClubLegend = () => {
    if (!mapLegend || mapLegend.querySelector('[data-club-map-key]')) return;

    const item = document.createElement('span');
    item.className = 'food-map-legend__item';
    item.setAttribute('data-club-map-key', '');

    const key = document.createElement('span');
    key.setAttribute('aria-hidden', 'true');
    key.style.cssText = 'display:inline-grid;place-items:center;width:28px;height:28px;min-width:28px;border:2px solid #153e62;border-radius:999px;background:#fff;overflow:hidden;';

    const image = document.createElement('img');
    image.src = CLUB.logoUrl;
    image.alt = '';
    image.style.cssText = 'display:block;width:24px;height:24px;max-width:24px;max-height:24px;object-fit:contain;';
    key.appendChild(image);

    const label = document.createTextNode('Canottieri Pesaro');
    item.append(key, label);
    mapLegend.appendChild(item);
  };

  const createClubMarker = (lat, lng) => {
    const icon = window.L.divIcon({
      className: 'food-map-marker-wrapper',
      html: `<span aria-hidden="true" style="display:grid;place-items:center;width:48px;height:48px;border:3px solid #153e62;border-radius:999px;background:#fff;box-shadow:0 4px 12px rgba(4,17,31,.28);overflow:hidden;"><img src="${CLUB.logoUrl}" alt="" style="display:block!important;width:40px!important;height:40px!important;max-width:40px!important;max-height:40px!important;object-fit:contain!important;"></span>`,
      iconSize: [50, 50],
      iconAnchor: [25, 25]
    });

    const marker = window.L.marker([lat, lng], {
      icon,
      keyboard: true,
      riseOnHover: true,
      zIndexOffset: 500,
      title: `${CLUB.name} — ${CLUB.address}`,
      alt: CLUB.name
    });

    marker.on('click', () => window.open(CLUB.mapsUrl, '_blank', 'noopener,noreferrer'));
    return marker;
  };

  const setClubPosition = (lat, lng) => {
    if (!map || !Number.isFinite(lat) || !Number.isFinite(lng)) return;

    clubLatLng = window.L.latLng(lat, lng);
    if (!clubMarker) {
      clubMarker = createClubMarker(lat, lng).addTo(map);
    } else {
      clubMarker.setLatLng(clubLatLng);
    }
    fitMapToVisiblePoints();
  };

  const resolveClubPosition = async () => {
    let cached = null;
    try {
      cached = JSON.parse(window.localStorage.getItem(CLUB.cacheKey) || 'null');
    } catch {
      cached = null;
    }

    if (cached && Number.isFinite(Number(cached.lat)) && Number.isFinite(Number(cached.lng))) {
      setClubPosition(Number(cached.lat), Number(cached.lng));
      return;
    }

    setClubPosition(CLUB.fallbackLat, CLUB.fallbackLng);

    try {
      const endpoint = new URL('https://nominatim.openstreetmap.org/search');
      endpoint.searchParams.set('format', 'jsonv2');
      endpoint.searchParams.set('limit', '1');
      endpoint.searchParams.set('countrycodes', 'it');
      endpoint.searchParams.set('accept-language', 'it');
      endpoint.searchParams.set('q', `${CLUB.name}, ${CLUB.address}, Italy`);

      const response = await fetch(endpoint, { headers: { Accept: 'application/json' } });
      if (!response.ok) return;

      const results = await response.json();
      if (!Array.isArray(results) || !results.length) return;

      const lat = Number(results[0].lat);
      const lng = Number(results[0].lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      try {
        window.localStorage.setItem(CLUB.cacheKey, JSON.stringify({ lat, lng }));
      } catch {
        // La mappa funziona anche se lo storage non è disponibile.
      }

      setClubPosition(lat, lng);
    } catch {
      // Mantiene la coordinata di fallback se il geocoding non è disponibile.
    }
  };

  const initMap = () => {
    if (map) return true;

    if (!mapElement || !window.L) {
      if (mapStatus) {
        mapStatus.hidden = false;
        mapStatus.textContent = 'La mappa non è disponibile. Usa i link Google Maps presenti nell’elenco.';
      }
      return false;
    }

    map = window.L.map(mapElement, {
      scrollWheelZoom: true,
      zoomControl: false
    }).setView([43.9155, 12.9152], 15);

    window.L.control.zoom({ position: 'topleft' }).addTo(map);

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    addClubLegend();
    resolveClubPosition();

    const addressElements = Array.from(section.querySelectorAll('.food-place__address[data-lat][data-lng]'));
    let invalidLocations = 0;

    addressElements.forEach((addressElement) => {
      const card = addressElement.closest('.food-place');
      const lat = Number(addressElement.dataset.lat);
      const lng = Number(addressElement.dataset.lng);

      if (!card || !Number.isFinite(lat) || !Number.isFinite(lng)) {
        invalidLocations += 1;
        return;
      }

      const marker = createPlaceMarker(card, addressElement, lat, lng);
      markers.set(addressElement.dataset.locationId || `${lat},${lng}`, { marker, card });
    });

    updateMapMarkers();

    if (mapStatus) {
      if (invalidLocations === 0 && markers.size > 0) {
        mapStatus.textContent = '';
        mapStatus.hidden = true;
      } else {
        mapStatus.hidden = false;
        mapStatus.textContent = invalidLocations
          ? `${invalidLocations} ${invalidLocations === 1 ? 'sede non è disponibile' : 'sedi non sono disponibili'} sulla mappa. I link Google Maps restano disponibili nell’elenco.`
          : 'Nessuna sede è disponibile sulla mappa. Usa i link Google Maps presenti nell’elenco.';
      }
    }

    return true;
  };

  const refreshMapLayout = () => {
    if (!map || mapView?.hidden) return;
    map.invalidateSize({ pan: false });
    updateMapMarkers();
  };

  const scheduleMapRefresh = () => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        refreshMapLayout();
      });
    });
    window.setTimeout(refreshMapLayout, 220);
  };

  const showMapAfterLayout = () => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        initMap();
        refreshMapLayout();
        window.setTimeout(refreshMapLayout, 220);
      });
    });
  };

  const setView = (view) => {
    const showMap = view === 'map';
    if (listView) listView.hidden = showMap;
    if (mapView) mapView.hidden = !showMap;

    viewButtons.forEach((button) => {
      const active = button.dataset.foodView === view;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    if (showMap) {
      if (mapStatus) mapStatus.hidden = false;
      showMapAfterLayout();
    }
  };

  const showUserPosition = (position) => {
    if (!map && !initMap()) return;

    const lat = Number(position.coords.latitude);
    const lng = Number(position.coords.longitude);
    const accuracy = Number(position.coords.accuracy);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    userLatLng = window.L.latLng(lat, lng);

    if (!userMarker) {
      userMarker = window.L.circleMarker(userLatLng, {
        radius: 8,
        weight: 4,
        color: '#ffffff',
        fillColor: '#1565c0',
        fillOpacity: 1,
        className: 'food-user-position'
      }).bindPopup('<strong>La mia posizione</strong>');
      userMarker.addTo(map);
    } else {
      userMarker.setLatLng(userLatLng);
    }

    if (userAccuracyCircle) map.removeLayer(userAccuracyCircle);
    if (Number.isFinite(accuracy) && accuracy > 0) {
      userAccuracyCircle = window.L.circle(userLatLng, {
        radius: accuracy,
        weight: 1,
        color: '#1565c0',
        opacity: 0.45,
        fillColor: '#1565c0',
        fillOpacity: 0.08,
        interactive: false
      }).addTo(map);
    }

    fitMapToVisiblePoints();
    userMarker.openPopup();

    if (locationStatus) locationStatus.textContent = 'Posizione individuata.';
    if (locateLabel) locateLabel.textContent = 'Aggiorna posizione';
    if (locateButton) locateButton.disabled = false;
  };

  const handleLocationError = (error) => {
    let message = 'Non è stato possibile rilevare la posizione.';
    if (error?.code === 1) message = 'Permesso alla posizione non concesso.';
    if (error?.code === 2) message = 'Posizione non disponibile.';
    if (error?.code === 3) message = 'Tempo scaduto durante la ricerca della posizione.';

    if (locationStatus) locationStatus.textContent = message;
    if (locateLabel) locateLabel.textContent = 'Riprova la mia posizione';
    if (locateButton) locateButton.disabled = false;
  };

  const locateUser = () => {
    if (!navigator.geolocation) {
      if (locationStatus) locationStatus.textContent = 'La geolocalizzazione non è supportata da questo browser.';
      return;
    }

    if (!map && !initMap()) return;

    if (locateButton) locateButton.disabled = true;
    if (locateLabel) locateLabel.textContent = 'Ricerca posizione…';
    if (locationStatus) locationStatus.textContent = 'Il browser potrebbe chiederti il permesso di usare la posizione.';

    navigator.geolocation.getCurrentPosition(showUserPosition, handleLocationError, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 60000
    });
  };

  viewButtons.forEach((button) => {
    button.addEventListener('click', () => setView(button.dataset.foodView || 'list'));
  });

  locateButton?.addEventListener('click', locateUser);

  window.addEventListener('resize', scheduleMapRefresh);
  window.addEventListener('orientationchange', () => window.setTimeout(scheduleMapRefresh, 250));

  applyFilters();
})();

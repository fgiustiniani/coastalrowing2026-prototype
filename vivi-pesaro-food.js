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

  if (!cards.length) return;

  const selectedCategories = new Set();
  const categoryCounts = new Map();

  cards.forEach((card) => {
    String(card.dataset.categories || '')
      .split(/\s+/)
      .filter(Boolean)
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
    const categories = new Set(String(card.dataset.categories || '').split(/\s+/).filter(Boolean));
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

  const updateMapMarkers = () => {
    if (!map) return;

    markers.forEach(({ marker, card }) => {
      const shouldShow = !card.hidden;
      const isOnMap = map.hasLayer(marker);
      if (shouldShow && !isOnMap) marker.addTo(map);
      if (!shouldShow && isOnMap) map.removeLayer(marker);
    });

    const visibleMarkers = Array.from(markers.values())
      .filter(({ marker }) => map.hasLayer(marker))
      .map(({ marker }) => marker);

    if (visibleMarkers.length) {
      const group = window.L.featureGroup(visibleMarkers);
      map.fitBounds(group.getBounds().pad(0.2), { maxZoom: 16 });
    }
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

  const buildPopup = (card, addressElement) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'food-map-popup';

    const title = document.createElement('strong');
    title.textContent = card.querySelector('.food-place__name')?.textContent.trim() || 'Locale';

    const categories = document.createElement('span');
    categories.className = 'food-map-popup__categories';
    categories.textContent = Array.from(card.querySelectorAll('.food-place__category'))
      .map((item) => item.textContent.trim())
      .join(' · ');

    const address = document.createElement('span');
    address.className = 'food-map-popup__address';
    address.textContent = addressElement.querySelector('.food-place__address-label')?.textContent.trim() || '';

    const actions = document.createElement('div');
    actions.className = 'food-map-popup__actions';

    const website = card.querySelector('.food-place__name-link');
    if (website?.href) {
      const websiteLink = document.createElement('a');
      websiteLink.href = website.href;
      websiteLink.target = '_blank';
      websiteLink.rel = 'noopener noreferrer';
      websiteLink.textContent = 'Visita il sito';
      actions.appendChild(websiteLink);
    }

    const mapLink = document.createElement('a');
    mapLink.href = addressElement.href;
    mapLink.target = '_blank';
    mapLink.rel = 'noopener noreferrer';
    mapLink.textContent = 'Apri su Google Maps';
    actions.appendChild(mapLink);

    wrapper.append(title, categories, address, actions);
    return wrapper;
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

    map = window.L.map(mapElement, { scrollWheelZoom: false }).setView([43.9155, 12.9152], 15);
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

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

      const marker = window.L.marker([lat, lng]);
      marker.bindPopup(buildPopup(card, addressElement));
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
      initMap();
      window.requestAnimationFrame(() => {
        map?.invalidateSize();
        updateMapMarkers();
      });
    }
  };

  viewButtons.forEach((button) => {
    button.addEventListener('click', () => setView(button.dataset.foodView || 'list'));
  });

  applyFilters();
})();

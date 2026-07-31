import('./mobile-nav.js').catch(() => {});

(() => {
  const nav = document.querySelector('.site-nav');
  if (!nav) return;

  const isPageUrl = (value, pageName) => {
    try {
      const url = new URL(value, window.location.href);
      const escapedName = pageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`(?:^|/)${escapedName}(?:\\.html)?/?$`).test(url.pathname);
    } catch {
      return false;
    }
  };

  const isHomeUrl = (value) => {
    try {
      const url = new URL(value, window.location.href);
      return /(?:^|\/)index(?:\.html)?\/?$/.test(url.pathname) || url.pathname === '/';
    } catch {
      return false;
    }
  };

  const currentUrl = window.location.href;
  const submenuItems = Array.from(nav.querySelectorAll('.site-nav__item--has-submenu'));

  document.querySelectorAll('a[target="_blank"]').forEach((link) => {
    const relValues = new Set(
      String(link.getAttribute('rel') || '')
        .split(/\s+/)
        .filter(Boolean)
    );
    relValues.add('noopener');
    relValues.add('noreferrer');
    link.setAttribute('rel', Array.from(relValues).join(' '));
  });

  const closeSubmenu = (item) => {
    const toggle = item.querySelector('.site-nav__submenu-toggle');
    item.classList.remove('is-open');
    toggle?.setAttribute('aria-expanded', 'false');
  };

  const closeAllSubmenus = (except = null) => {
    submenuItems.forEach((item) => {
      if (item !== except) closeSubmenu(item);
    });
  };

  const updateCurrentSubmenuLink = () => {
    submenuItems.forEach((item) => {
      const mainLink = item.querySelector(':scope > a');
      if (!mainLink) return;

      let pageName = '';
      try {
        pageName = new URL(mainLink.href, window.location.href)
          .pathname
          .split('/')
          .filter(Boolean)
          .pop()
          ?.replace(/\.html$/i, '') || '';
      } catch {
        return;
      }

      item.querySelectorAll('.site-nav__submenu a').forEach((link) => {
        const target = new URL(link.href, window.location.href);
        const isCurrent =
          Boolean(window.location.hash) &&
          isPageUrl(currentUrl, pageName) &&
          target.hash === window.location.hash;

        if (isCurrent) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    });
  };

  submenuItems.forEach((item) => {
    const toggle = item.querySelector('.site-nav__submenu-toggle');
    const submenu = item.querySelector('.site-nav__submenu');
    if (!toggle || !submenu) return;

    toggle.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();

      const willOpen = !item.classList.contains('is-open');
      closeAllSubmenus(item);
      item.classList.toggle('is-open', willOpen);
      toggle.setAttribute('aria-expanded', String(willOpen));
    });

    submenu.addEventListener('click', () => closeSubmenu(item));
  });

  document.addEventListener('click', (event) => {
    submenuItems.forEach((item) => {
      if (!item.contains(event.target)) closeSubmenu(item);
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;

    const openItem = submenuItems.find((item) => item.classList.contains('is-open'));
    if (!openItem) return;

    const toggle = openItem.querySelector('.site-nav__submenu-toggle');
    closeSubmenu(openItem);
    toggle?.focus();
  });

  if (isPageUrl(currentUrl, 'vivi-pesaro')) {
    const resourceCards = Array.from(document.querySelectorAll('.city-resource-card'));
    const cultureCard = resourceCards.find((card) =>
      card.querySelector('small')?.textContent.trim().toLowerCase() === 'città e cultura'
    );
    const natureCard = resourceCards.find((card) =>
      card.querySelector('small')?.textContent.trim().toLowerCase() === 'natura e panorami'
    );

    if (cultureCard) cultureCard.id = 'citta-cultura';
    if (natureCard) natureCard.id = 'natura-panorami';

    const foodSection = document.querySelector('.city-food');
    if (foodSection) foodSection.id = 'dove-mangiare';

    const hashTarget = window.location.hash ? document.querySelector(window.location.hash) : null;
    if (hashTarget) window.requestAnimationFrame(() => hashTarget.scrollIntoView());
  }

  updateCurrentSubmenuLink();
  window.addEventListener('hashchange', updateCurrentSubmenuLink);

  const backHomeLabel = document.querySelector('.back-home span');
  if (backHomeLabel) backHomeLabel.textContent = 'Vai su';

  if (isPageUrl(currentUrl, 'info-gare')) {
    const trainCard = Array.from(document.querySelectorAll('#arrivare .arrival-grid article')).find((card) =>
      card.querySelector('small')?.textContent.trim().toLowerCase() === 'treno'
    );

    if (trainCard) {
      let routeLink = trainCard.querySelector('.arrival-map-link');
      if (!routeLink) {
        routeLink = document.createElement('a');
        routeLink.className = 'arrival-map-link';
        routeLink.target = '_blank';
        routeLink.rel = 'noopener noreferrer';
        routeLink.setAttribute('aria-label', 'Apri Google Maps con il percorso a piedi dalla stazione di Pesaro alla Società Canottieri Pesaro');
        routeLink.innerHTML = '<img src="assets/logos/mappa.svg" alt=""><span>Apri il percorso</span>';
        trainCard.appendChild(routeLink);
      }

      routeLink.href = 'https://www.google.com/maps/dir/Stazione+di+Pesaro,+piazza+G.Falcone+P.Borsellino,+61121+Pesaro+PU/Calata+Caio+Duilio,+101,+61121+Pesaro+PU/@43.9148173,12.8943013,3297m/data=!3m2!1e3!4b1!4m14!4m13!1m5!1m1!1s0x132d1994225de05b:0x692c1144b78eaf35!2m2!1d12.9049832!2d43.9061687!1m5!1m1!1s0x132d192f0890c497:0x299aefba818e487c!2m2!1d12.9067438!2d43.9234356!3e2?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D';
    }
  }

  if (isHomeUrl(currentUrl)) {
    const paths = document.querySelector('.paths');
    const updates = document.querySelector('.updates');
    if (paths && updates) paths.insertAdjacentElement('afterend', updates);

    const partners = document.querySelector('.partners');
    const partnerSections = partners?.querySelector('.partner-sections');
    const partnershipBand = document.querySelector('.partnership-band');
    if (partners && partnerSections && partnershipBand) {
      partnerSections.insertAdjacentElement('afterend', partnershipBand);
    }
  }
})();

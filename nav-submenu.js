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

  const existingPartnerLink = Array.from(nav.querySelectorAll('a')).find((link) => {
    try {
      const url = new URL(link.href, currentUrl);
      return isHomeUrl(url.href) && url.hash === '#sponsor';
    } catch {
      return false;
    }
  });

  if (!existingPartnerLink) {
    const partnerLink = document.createElement('a');
    partnerLink.href = 'index.html#sponsor';
    partnerLink.textContent = 'Partner e sponsor';

    const faqLink = Array.from(nav.querySelectorAll('a')).find((link) => isPageUrl(link.href, 'faq'));
    nav.insertBefore(partnerLink, faqLink || null);
  }

  const addSubmenu = (pageName, ariaLabel, sections) => {
    const pageLink = Array.from(nav.querySelectorAll('a')).find((link) => {
      const href = link.getAttribute('href') || link.href || '';
      return isPageUrl(href, pageName);
    });

    if (!pageLink || pageLink.closest('.site-nav__item--has-submenu')) return;

    const item = document.createElement('div');
    item.className = 'site-nav__item site-nav__item--has-submenu';
    pageLink.replaceWith(item);
    item.appendChild(pageLink);

    const toggle = document.createElement('button');
    toggle.className = 'site-nav__submenu-toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', `Mostra le sezioni di ${ariaLabel}`);
    toggle.innerHTML = '<span aria-hidden="true">▾</span>';

    const submenu = document.createElement('div');
    submenu.className = 'site-nav__submenu';
    submenu.setAttribute('aria-label', `Sezioni di ${ariaLabel}`);

    const currentPageMatches = isPageUrl(currentUrl, pageName);

    sections.forEach(([label, id]) => {
      const link = document.createElement('a');
      link.href = `${pageName}.html#${id}`;
      link.textContent = label;
      if (currentPageMatches && window.location.hash === `#${id}`) {
        link.setAttribute('aria-current', 'location');
      }
      submenu.appendChild(link);
    });

    item.append(toggle, submenu);

    const closeMenu = () => {
      item.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    };

    toggle.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const open = item.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });

    submenu.addEventListener('click', closeMenu);

    document.addEventListener('click', (event) => {
      if (!item.contains(event.target)) closeMenu();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && item.classList.contains('is-open')) {
        closeMenu();
        toggle.focus();
      }
    });
  };

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
  }

  addSubmenu('info-gare', 'Info per chi gareggia', [
    ['Programma e documenti', 'programma'],
    ['Campo gara', 'campo-gara'],
    ['Logistica e parco barche', 'logistica'],
    ['Accrediti e segreteria', 'segreteria'],
    ['Ospitalità', 'ospitalita'],
    ['Come arrivare', 'arrivare']
  ]);

  addSubmenu('vivi-pesaro', 'Vivi Pesaro', [
    ['Città e cultura', 'citta-cultura'],
    ['Natura e panorami', 'natura-panorami'],
    ['Dove mangiare', 'dove-mangiare']
  ]);

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

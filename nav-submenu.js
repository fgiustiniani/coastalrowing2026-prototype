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

  const currentUrl = window.location.href;

  if (!Array.from(nav.querySelectorAll('a')).some((link) => isPageUrl(link.href, 'diventa-partner'))) {
    const partnerLink = document.createElement('a');
    partnerLink.href = 'diventa-partner.html';
    partnerLink.textContent = 'Diventa partner';
    if (isPageUrl(currentUrl, 'diventa-partner')) partnerLink.setAttribute('aria-current', 'page');

    const faqLink = Array.from(nav.querySelectorAll('a')).find((link) => isPageUrl(link.href, 'faq'));
    nav.insertBefore(partnerLink, faqLink || null);
  }

  const infoLink = Array.from(nav.querySelectorAll('a')).find((link) => {
    const href = link.getAttribute('href') || link.href || '';
    return isPageUrl(href, 'info-gare');
  });

  if (infoLink && !infoLink.closest('.site-nav__item--has-submenu')) {
    const sections = [
      ['Programma e documenti', 'programma'],
      ['Campo gara', 'campo-gara'],
      ['Logistica e parco barche', 'logistica'],
      ['Accrediti e segreteria', 'segreteria'],
      ['Ospitalità', 'ospitalita'],
      ['Come arrivare', 'arrivare']
    ];

    const item = document.createElement('div');
    item.className = 'site-nav__item site-nav__item--has-submenu';
    infoLink.replaceWith(item);
    item.appendChild(infoLink);

    const toggle = document.createElement('button');
    toggle.className = 'site-nav__submenu-toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Mostra le sezioni di Info per chi gareggia');
    toggle.innerHTML = '<span aria-hidden="true">▾</span>';

    const submenu = document.createElement('div');
    submenu.className = 'site-nav__submenu';
    submenu.setAttribute('aria-label', 'Sezioni di Info per chi gareggia');

    const currentPageIsInfo = isPageUrl(currentUrl, 'info-gare');

    sections.forEach(([label, id]) => {
      const link = document.createElement('a');
      link.href = `info-gare.html#${id}`;
      link.textContent = label;
      if (currentPageIsInfo && window.location.hash === `#${id}`) {
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
      if (event.key === 'Escape') {
        closeMenu();
        toggle.focus();
      }
    });
  }

  const backHomeLabel = document.querySelector('.back-home span');
  if (backHomeLabel) backHomeLabel.textContent = 'Vai su';

  if (isPageUrl(currentUrl, 'info-gare')) {
    const trainCard = Array.from(document.querySelectorAll('#arrivare .arrival-grid article')).find((card) =>
      card.querySelector('small')?.textContent.trim().toLowerCase() === 'treno'
    );

    if (trainCard && !trainCard.querySelector('.arrival-map-link')) {
      const routeLink = document.createElement('a');
      routeLink.className = 'arrival-map-link';
      routeLink.href = 'https://www.google.com/maps/dir/?api=1&origin=Stazione+di+Pesaro%2C+Pesaro&destination=Calata+Caio+Duilio+101%2C+Pesaro';
      routeLink.target = '_blank';
      routeLink.rel = 'noopener noreferrer';
      routeLink.setAttribute('aria-label', 'Apri Google Maps con il percorso dalla stazione di Pesaro alla Società Canottieri Pesaro');
      routeLink.innerHTML = '<img src="assets/logos/mappa.svg" alt=""><span>Apri il percorso</span>';
      trainCard.appendChild(routeLink);
    }
  }
})();

(() => {
  const nav = document.querySelector('.site-nav');
  if (!nav) return;

  const infoLink = Array.from(nav.querySelectorAll('a')).find((link) => {
    const href = link.getAttribute('href') || '';
    return href === 'info-gare.html' || href.startsWith('info-gare.html#');
  });

  if (!infoLink || infoLink.closest('.site-nav__item--has-submenu')) return;

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

  const currentPageIsInfo = /(^|\/)info-gare\.html$/.test(window.location.pathname);

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
})();

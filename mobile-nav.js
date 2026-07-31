(() => {
  if (!document.querySelector('link[data-mobile-nav-styles]')) {
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = 'mobile-nav.css';
    stylesheet.dataset.mobileNavStyles = '';
    document.head.appendChild(stylesheet);
  }

  const nav = document.querySelector('.site-nav');
  const header = nav?.closest('.site-header');
  if (!nav || !header || header.querySelector('.site-nav__mobile-toggle')) return;

  if (!nav.id) nav.id = 'site-nav-main';

  const toggle = document.createElement('button');
  toggle.className = 'site-nav__mobile-toggle';
  toggle.type = 'button';
  toggle.setAttribute('aria-controls', nav.id);
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Apri il menu di navigazione');
  toggle.innerHTML = '<span></span><span></span><span></span>';
  header.insertBefore(toggle, nav);

  const closeMenu = () => {
    header.classList.remove('is-menu-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Apri il menu di navigazione');
  };

  toggle.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    const open = header.classList.toggle('is-menu-open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Chiudi il menu di navigazione' : 'Apri il menu di navigazione');
  });

  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeMenu();
  });

  document.addEventListener('click', (event) => {
    if (!header.contains(event.target)) closeMenu();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && header.classList.contains('is-menu-open')) {
      closeMenu();
      toggle.focus();
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 820) closeMenu();
  });
})();

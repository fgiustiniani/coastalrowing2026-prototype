(() => {
  const ticker = document.querySelector('[data-news-ticker]');
  if (!ticker) return;

  const style = document.createElement('style');
  style.textContent = `
    .news-ticker{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:stretch;min-height:48px;background:#e9b949;color:#102f35;border-top:1px solid rgba(16,47,53,.12);box-shadow:0 7px 18px rgba(0,0,0,.09);position:relative;z-index:8}
    .news-ticker[hidden]{display:none}
    .news-ticker__label{display:flex;align-items:center;padding:0 18px;background:#173f45;color:#fff;font-size:.72rem;font-weight:900;letter-spacing:.09em;text-transform:uppercase;white-space:nowrap}
    .news-ticker__viewport{min-width:0;overflow:hidden}
    .news-ticker__link{display:flex;align-items:center;gap:13px;width:100%;min-height:48px;padding:7px 16px;color:inherit;text-decoration:none;transition:opacity .22s ease,transform .22s ease}
    .news-ticker__link.is-changing{opacity:0;transform:translateY(5px)}
    .news-ticker__date{flex:0 0 auto;font-size:.72rem;font-weight:750;white-space:nowrap;opacity:.78}
    .news-ticker__text-window{min-width:0;flex:1;overflow:hidden;white-space:nowrap}
    .news-ticker__text{display:inline-block;white-space:nowrap;font-size:.91rem;will-change:transform}
    .news-ticker__text.is-scrolling{animation:newsTickerScroll var(--ticker-duration,18s) linear infinite alternate}
    .news-ticker:hover .news-ticker__text.is-scrolling,.news-ticker:focus-within .news-ticker__text.is-scrolling{animation-play-state:paused}
    .news-ticker__title{font-weight:850}
    .news-ticker__summary{font-weight:550}
    .news-ticker__read{flex:0 0 auto;font-size:.78rem;font-weight:850;white-space:nowrap}
    .news-ticker__controls{display:flex;align-items:stretch;border-left:1px solid rgba(16,47,53,.16)}
    .news-ticker__controls button{width:38px;border:0;border-left:1px solid rgba(16,47,53,.12);background:transparent;color:#173f45;font:700 1.35rem/1 system-ui;cursor:pointer}
    .news-ticker__controls button:hover,.news-ticker__controls button:focus-visible{background:rgba(255,255,255,.28);outline:none}
    .site-nav__news-badge{display:inline-flex;align-items:center;margin-left:5px;padding:2px 6px;border-radius:999px;background:#e9b949;color:#173f45;font-size:.52rem;font-weight:900;line-height:1;letter-spacing:.05em;text-transform:uppercase;vertical-align:middle}
    .site-nav__news-badge[hidden]{display:none}
    @keyframes newsTickerScroll{from{transform:translateX(0)}to{transform:translateX(calc(-1 * var(--ticker-distance,0px)))}}
    @media(max-width:760px){.news-ticker{grid-template-columns:auto minmax(0,1fr)}.news-ticker__label{padding:0 11px;font-size:.62rem}.news-ticker__link{gap:8px;padding:6px 10px}.news-ticker__date,.news-ticker__read{display:none}.news-ticker__text{font-size:.8rem}.news-ticker__summary,.news-ticker__separator{display:none}.news-ticker__controls{display:none}.site-nav__news-badge{font-size:0;width:7px;height:7px;padding:0;margin-left:4px;background:#e9b949}}
    @media(prefers-reduced-motion:reduce){.news-ticker__link{transition:none}.news-ticker__text.is-scrolling{animation:none}}
  `;
  document.head.appendChild(style);

  const link = ticker.querySelector('[data-news-ticker-link]');
  const dateNode = ticker.querySelector('[data-news-ticker-date]');
  const titleNode = ticker.querySelector('[data-news-ticker-title]');
  const summaryNode = ticker.querySelector('[data-news-ticker-summary]');
  const textWindow = ticker.querySelector('.news-ticker__text-window');
  const textTrack = ticker.querySelector('[data-news-ticker-text]');
  const previousButton = ticker.querySelector('[data-news-ticker-prev]');
  const nextButton = ticker.querySelector('[data-news-ticker-next]');
  const newsBadge = document.querySelector('[data-news-badge]');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isGitHubPages = window.location.hostname.endsWith('github.io');

  let items = [];
  let currentIndex = 0;
  let timer = null;

  const formatDate = (value) => {
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' }).format(date);
  };

  const configureTextScroll = () => {
    if (!textWindow || !textTrack) return;

    textTrack.classList.remove('is-scrolling');
    textTrack.style.removeProperty('--ticker-distance');
    textTrack.style.removeProperty('--ticker-duration');

    if (reduceMotion) return;

    window.requestAnimationFrame(() => {
      const distance = Math.max(0, textTrack.scrollWidth - textWindow.clientWidth);
      if (distance < 12) return;

      const duration = Math.max(12, Math.min(30, distance / 24));
      textTrack.style.setProperty('--ticker-distance', `${distance}px`);
      textTrack.style.setProperty('--ticker-duration', `${duration}s`);
      textTrack.classList.add('is-scrolling');
    });
  };

  const stopRotation = () => {
    if (timer) window.clearInterval(timer);
    timer = null;
  };

  const startRotation = () => {
    stopRotation();
    if (reduceMotion || items.length < 2) return;
    timer = window.setInterval(() => showItem(currentIndex + 1), 6000);
  };

  const updateContent = (item) => {
    if (dateNode) {
      dateNode.dateTime = item.date || '';
      dateNode.textContent = formatDate(item.date || '');
    }
    if (titleNode) titleNode.textContent = item.title || 'Ultimo aggiornamento';
    if (summaryNode) summaryNode.textContent = item.summary || '';
    if (link) link.href = 'faq.html#news';
    configureTextScroll();
  };

  const showItem = (requestedIndex, immediate = false) => {
    if (!items.length || !link) return;
    currentIndex = (requestedIndex + items.length) % items.length;
    const item = items[currentIndex];

    if (immediate || reduceMotion) {
      updateContent(item);
      return;
    }

    link.classList.add('is-changing');
    window.setTimeout(() => {
      updateContent(item);
      link.classList.remove('is-changing');
    }, 220);
  };

  previousButton?.addEventListener('click', () => {
    showItem(currentIndex - 1);
    startRotation();
  });

  nextButton?.addEventListener('click', () => {
    showItem(currentIndex + 1);
    startRotation();
  });

  ticker.addEventListener('mouseenter', stopRotation);
  ticker.addEventListener('mouseleave', startRotation);
  ticker.addEventListener('focusin', stopRotation);
  ticker.addEventListener('focusout', startRotation);
  window.addEventListener('resize', configureTextScroll);

  async function loadNews() {
    if (isGitHubPages) return;

    try {
      const response = await fetch('/api/news', {
        headers: { accept: 'application/json' },
        cache: 'no-store'
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !Array.isArray(result.news)) return;

      items = result.news
        .filter((item) => item && item.title)
        .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
        .slice(0, 3);

      if (!items.length) return;
      ticker.hidden = false;
      if (newsBadge) newsBadge.hidden = false;
      showItem(0, true);

      const controls = ticker.querySelector('.news-ticker__controls');
      if (controls) controls.hidden = items.length < 2;
      startRotation();
    } catch {
      ticker.hidden = true;
      if (newsBadge) newsBadge.hidden = true;
    }
  }

  loadNews();
})();

(() => {
  const hero = document.querySelector('[data-event-hero]');
  if (!hero) return;

  const endpoint = '/api/event-state';
  const pollingMs = 30000;
  const parkingPdf = 'assets/downloads/Parcheggio.pdf';

  const photo = hero.querySelector('[data-event-photo]');
  const video = hero.querySelector('[data-event-video]');
  const iframe = hero.querySelector('[data-event-youtube]');
  const content = hero.querySelector('.hero__content');
  const stamps = hero.querySelector('[data-event-stamps]');
  const action = hero.querySelector('[data-event-action]');
  const actionLabel = hero.querySelector('[data-event-action-label]');
  const parkingIcon = hero.querySelector('[data-event-parking-icon]');
  const liveIcon = hero.querySelector('[data-event-live-icon]');
  const liveStatus = hero.querySelector('[data-event-live-status]');
  const status = hero.querySelector('[data-event-status]');
  const statusDetail = hero.querySelector('[data-event-status-detail]');
  const modeCard = hero.querySelector('[data-event-mode-card]');
  const modeKicker = hero.querySelector('[data-event-mode-kicker]');
  const modeTitle = hero.querySelector('[data-event-mode-title]');
  const modeCopy = hero.querySelector('[data-event-mode-copy]');
  const modePrimary = hero.querySelector('[data-event-mode-primary]');
  const modeSecondary = hero.querySelector('[data-event-mode-secondary]');

  const streams = {
    sabato: {
      id: 'SUP06-ZePvk',
      url: 'https://www.youtube.com/watch?v=SUP06-ZePvk',
      label: 'In diretta · Sabato 3 ottobre'
    },
    domenica: {
      id: 'XartJQ5lG5I',
      url: 'https://www.youtube.com/watch?v=XartJQ5lG5I',
      label: 'In diretta · Domenica 4 ottobre'
    }
  };

  let currentStateKey = '';
  let currentStreamKey = '';

  function setVisible(element, visible) {
    if (!element) return;
    element.hidden = !visible;
  }

  function stopVideo() {
    if (iframe && iframe.hasAttribute('src')) iframe.removeAttribute('src');
  }

  function resetHeroClasses() {
    hero.classList.remove('is-live', 'is-pause', 'is-post');
  }

  function configureMainAction({ visible, href = '#', label = '', parking = false, youtube = false, download = false }) {
    if (!action) return;

    setVisible(action, visible);
    if (!visible) return;

    action.href = href;
    action.setAttribute('target', '_blank');
    action.setAttribute('rel', 'noopener noreferrer');
    if (download) action.setAttribute('download', '');
    else action.removeAttribute('download');

    if (actionLabel) actionLabel.textContent = label;
    setVisible(parkingIcon, parking);
    setVisible(liveIcon, youtube);
  }

  function configureModeCard({ visible, kicker = '', title = '', copy = '', primary, secondary }) {
    setVisible(modeCard, visible);
    if (!visible) return;

    if (modeKicker) modeKicker.textContent = kicker;
    if (modeTitle) modeTitle.textContent = title;
    if (modeCopy) modeCopy.textContent = copy;

    if (modePrimary) {
      setVisible(modePrimary, Boolean(primary));
      if (primary) {
        modePrimary.href = primary.href;
        modePrimary.textContent = primary.label;
        if (primary.external) {
          modePrimary.target = '_blank';
          modePrimary.rel = 'noopener noreferrer';
        } else {
          modePrimary.removeAttribute('target');
          modePrimary.removeAttribute('rel');
        }
      }
    }

    if (modeSecondary) {
      setVisible(modeSecondary, Boolean(secondary));
      if (secondary) {
        modeSecondary.href = secondary.href;
        modeSecondary.textContent = secondary.label;
        if (secondary.external) {
          modeSecondary.target = '_blank';
          modeSecondary.rel = 'noopener noreferrer';
        } else {
          modeSecondary.removeAttribute('target');
          modeSecondary.removeAttribute('rel');
        }
      }
    }
  }

  function showPre() {
    resetHeroClasses();
    setVisible(photo, true);
    setVisible(video, false);
    setVisible(content, true);
    setVisible(stamps, true);
    setVisible(liveStatus, false);
    configureModeCard({ visible: false });
    stopVideo();

    configureMainAction({
      visible: true,
      href: parkingPdf,
      label: 'Scarica il pass parcheggio',
      parking: true,
      download: true
    });
  }

  function showLive(streamKey) {
    const stream = streams[streamKey] || streams.sabato;

    resetHeroClasses();
    hero.classList.add('is-live');
    setVisible(photo, false);
    setVisible(video, true);
    setVisible(content, false);
    setVisible(stamps, false);
    setVisible(liveStatus, true);
    configureModeCard({ visible: false });

    const expectedSrc = `https://www.youtube-nocookie.com/embed/${stream.id}?autoplay=1&mute=1&playsinline=1&controls=1&rel=0&modestbranding=1`;
    if (iframe && iframe.src !== expectedSrc) {
      iframe.src = expectedSrc;
      iframe.title = stream.label;
    }

    if (status) status.textContent = stream.label;
    if (statusDetail) statusDetail.textContent = 'Autoplay senza audio · attiva l’audio dal player';

    configureMainAction({
      visible: true,
      href: stream.url,
      label: 'Apri su YouTube',
      youtube: true
    });
  }

  function showPause() {
    resetHeroClasses();
    hero.classList.add('is-pause');
    setVisible(photo, true);
    setVisible(video, false);
    setVisible(content, false);
    setVisible(stamps, false);
    setVisible(liveStatus, false);
    stopVideo();

    configureMainAction({ visible: false });
    configureModeCard({
      visible: true,
      kicker: 'Pausa gare',
      title: 'La diretta riprenderà a breve',
      copy: 'Nel frattempo puoi consultare il programma delle attività e gli aggiornamenti del campo gara.',
      primary: { href: 'info-gare.html#programma', label: 'Programma gare' }
    });
  }

  function showPost() {
    resetHeroClasses();
    hero.classList.add('is-post');
    setVisible(photo, true);
    setVisible(video, false);
    setVisible(content, false);
    setVisible(stamps, true);
    setVisible(liveStatus, false);
    stopVideo();

    configureMainAction({ visible: false });
    configureModeCard({
      visible: true,
      kicker: 'Campionati Italiani Coastal Rowing 2026',
      title: 'Rivedi le gare',
      copy: 'Le dirette delle due giornate restano disponibili su YouTube.',
      primary: { href: streams.sabato.url, label: 'Rivedi sabato', external: true },
      secondary: { href: streams.domenica.url, label: 'Rivedi domenica', external: true }
    });
  }

  function applyConfig(config) {
    const state = ['pre', 'live', 'pause', 'post'].includes(config?.state) ? config.state : 'pre';
    const stream = ['sabato', 'domenica'].includes(config?.stream) ? config.stream : 'sabato';

    if (state === currentStateKey && (state !== 'live' || stream === currentStreamKey)) return;

    currentStateKey = state;
    currentStreamKey = stream;
    document.documentElement.dataset.eventView = state;
    document.documentElement.dataset.eventStream = stream;

    if (state === 'live') showLive(stream);
    else if (state === 'pause') showPause();
    else if (state === 'post') showPost();
    else showPre();
  }

  async function loadState() {
    try {
      const response = await fetch(endpoint, {
        headers: { accept: 'application/json' },
        cache: 'no-store'
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Stato evento non disponibile.');
      applyConfig(result);
    } catch (_) {
      if (!currentStateKey) applyConfig({ state: 'pre', stream: 'sabato' });
    }
  }

  applyConfig({ state: 'pre', stream: 'sabato' });
  loadState();
  window.setInterval(loadState, pollingMs);
})();

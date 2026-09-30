(() => {
  const hero = document.querySelector('[data-event-hero]');
  if (!hero) return;

  const photo = hero.querySelector('[data-event-photo]');
  const video = hero.querySelector('[data-event-video]');
  const iframe = hero.querySelector('[data-event-youtube]');
  const action = hero.querySelector('[data-event-action]');
  const actionLabel = hero.querySelector('[data-event-action-label]');
  const parkingIcon = hero.querySelector('[data-event-parking-icon]');
  const liveIcon = hero.querySelector('[data-event-live-icon]');
  const liveStatus = hero.querySelector('[data-event-live-status]');
  const status = hero.querySelector('[data-event-status]');
  const statusDetail = hero.querySelector('[data-event-status-detail]');

  const parkingPdf = 'assets/downloads/Parcheggio.pdf';
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

  function romeParts(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Rome',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(date);

    return Object.fromEntries(
      parts
        .filter((part) => part.type !== 'literal')
        .map((part) => [part.type, Number(part.value)])
    );
  }

  function scheduledState() {
    const now = romeParts();
    const ymd = now.year * 10000 + now.month * 100 + now.day;
    const minutes = now.hour * 60 + now.minute;
    const startMinutes = 7 * 60 + 45;

    if (ymd < 20261003) return 'pre';
    if (ymd === 20261003 && minutes < startMinutes) return 'pre';
    if (ymd === 20261003) return 'sabato';
    if (ymd === 20261004 && minutes < startMinutes) return 'pre';
    if (ymd === 20261004) return 'domenica';
    return 'post';
  }

  function requestedState() {
    const requested = new URLSearchParams(window.location.search).get('eventView');
    return ['pre', 'sabato', 'domenica', 'post'].includes(requested) ? requested : null;
  }

  function showPhoto() {
    hero.classList.remove('is-live');
    if (photo) photo.hidden = false;
    if (video) video.hidden = true;
    if (iframe) iframe.removeAttribute('src');
    if (liveStatus) liveStatus.hidden = true;

    if (action) {
      action.href = parkingPdf;
      action.setAttribute('download', '');
      action.setAttribute('target', '_blank');
    }
    if (actionLabel) actionLabel.textContent = 'Scarica il pass parcheggio';
    if (parkingIcon) parkingIcon.hidden = false;
    if (liveIcon) liveIcon.hidden = true;
  }

  function showStream(day) {
    const stream = streams[day];
    if (!stream) return showPhoto();

    hero.classList.add('is-live');
    if (photo) photo.hidden = true;
    if (video) video.hidden = false;
    if (liveStatus) liveStatus.hidden = false;

    if (iframe) {
      iframe.src = `https://www.youtube-nocookie.com/embed/${stream.id}?rel=0&modestbranding=1`;
      iframe.title = stream.label;
    }

    if (status) status.textContent = stream.label;
    if (statusDetail) statusDetail.textContent = 'Campionati Italiani Coastal Rowing 2026';

    if (action) {
      action.href = stream.url;
      action.removeAttribute('download');
      action.setAttribute('target', '_blank');
    }
    if (actionLabel) actionLabel.textContent = 'Apri su YouTube';
    if (parkingIcon) parkingIcon.hidden = true;
    if (liveIcon) liveIcon.hidden = false;
  }

  const state = requestedState() || scheduledState();
  document.documentElement.dataset.eventView = state;

  if (state === 'sabato' || state === 'domenica') {
    showStream(state);
  } else {
    showPhoto();
  }
})();

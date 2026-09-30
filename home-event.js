(() => {
  const hero = document.querySelector('[data-event-hero]');
  if (!hero) return;

  const photo = hero.querySelector('[data-event-photo]');
  const video = hero.querySelector('[data-event-video]');
  const iframe = hero.querySelector('[data-event-youtube]');
  const action = hero.querySelector('[data-event-action]');
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

  function showPhoto(state) {
    hero.classList.remove('is-live');
    if (photo) photo.hidden = false;
    if (video) video.hidden = true;
    if (iframe) iframe.removeAttribute('src');

    if (status) status.textContent = state === 'post' ? 'Pesaro 2026' : 'Pesaro';
    if (statusDetail) statusDetail.textContent = state === 'post' ? 'Campionati Italiani Coastal Rowing' : '3–4 ottobre 2026';

    if (action) {
      action.href = parkingPdf;
      action.textContent = 'Scarica il pass parcheggio';
      action.setAttribute('download', '');
      action.setAttribute('target', '_blank');
    }
  }

  function showStream(day) {
    const stream = streams[day];
    if (!stream) return showPhoto('pre');

    hero.classList.add('is-live');
    if (photo) photo.hidden = true;
    if (video) video.hidden = false;

    if (iframe) {
      iframe.src = `https://www.youtube-nocookie.com/embed/${stream.id}?rel=0&modestbranding=1`;
      iframe.title = stream.label;
    }

    if (status) status.textContent = stream.label;
    if (statusDetail) statusDetail.textContent = 'Campionati Italiani Coastal Rowing 2026';

    if (action) {
      action.href = stream.url;
      action.textContent = 'Apri su YouTube';
      action.removeAttribute('download');
      action.setAttribute('target', '_blank');
    }
  }

  const state = requestedState() || scheduledState();
  document.documentElement.dataset.eventView = state;

  if (state === 'sabato' || state === 'domenica') {
    showStream(state);
  } else {
    showPhoto(state);
  }
})();

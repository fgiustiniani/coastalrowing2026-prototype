(() => {
  const hero = document.querySelector('[data-event-hero]');
  if (!hero) return;

  const parkingPass = document.querySelector('[data-event-pass]');
  const photo = hero.querySelector('[data-event-photo]');
  const video = hero.querySelector('[data-event-video]');
  const iframe = hero.querySelector('[data-event-youtube]');
  const youtubeLink = hero.querySelector('[data-event-youtube-link]');
  const liveLabel = hero.querySelector('[data-event-live-label]');
  const mediaBadge = hero.querySelector('[data-event-media-badge]');

  const streams = {
    sabato: {
      id: 'SUP06-ZePvk',
      url: 'https://www.youtube.com/watch?v=SUP06-ZePvk',
      label: 'Diretta YouTube · Sabato 3 ottobre'
    },
    domenica: {
      id: 'XartJQ5lG5I',
      url: 'https://www.youtube.com/watch?v=XartJQ5lG5I',
      label: 'Diretta YouTube · Domenica 4 ottobre'
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

    if (ymd < 20261003 || (ymd === 20261003 && minutes < startMinutes)) {
      return 'pre';
    }

    if (ymd === 20261003) {
      return 'sabato';
    }

    if (ymd === 20261004 && minutes < startMinutes) {
      return 'between';
    }

    if (ymd === 20261004) {
      return 'domenica';
    }

    return 'post';
  }

  function requestedState() {
    const requested = new URLSearchParams(window.location.search).get('eventView');
    return ['pre', 'sabato', 'domenica', 'post'].includes(requested) ? requested : null;
  }

  function showPhoto() {
    if (photo) photo.hidden = false;
    if (video) video.hidden = true;
    if (iframe) iframe.removeAttribute('src');
    if (mediaBadge) mediaBadge.textContent = 'Pesaro · 3–4 ottobre';
  }

  function showStream(day) {
    const stream = streams[day];
    if (!stream) {
      showPhoto();
      return;
    }

    if (photo) photo.hidden = true;
    if (video) video.hidden = false;

    if (iframe) {
      iframe.src = `https://www.youtube-nocookie.com/embed/${stream.id}?rel=0&modestbranding=1`;
      iframe.title = stream.label;
    }

    if (youtubeLink) youtubeLink.href = stream.url;
    if (liveLabel) liveLabel.textContent = stream.label;
  }

  const state = requestedState() || scheduledState();
  document.documentElement.dataset.eventView = state;

  if (parkingPass) {
    parkingPass.hidden = state !== 'pre';
  }

  if (state === 'sabato' || state === 'domenica') {
    showStream(state);
  } else {
    showPhoto();
  }
})();

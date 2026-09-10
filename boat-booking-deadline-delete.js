(() => {
  const form = document.querySelector('[data-booking-form]');
  if (!form) return;

  const mode = form.dataset.mode === 'edit' ? 'edit' : 'create';
  const api = '/api/boat-bookings';
  const availabilityApi = '/api/boat-availability';
  const hero = document.querySelector('.booking-hero');
  const bookingStatus = form.querySelector('[data-booking-status]');
  const submitButton = form.querySelector('button[type="submit"]');
  const shell = document.querySelector('[data-booking-shell]');

  let token = '';
  let booking = null;
  let settings = { bookingOpen: true, bookingCutoffAt: null };

  function formatCutoff(value) {
    if (!value) return '';
    try {
      return new Intl.DateTimeFormat('it-IT', {
        timeZone: 'Europe/Rome',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(value));
    } catch {
      return value;
    }
  }

  function ensureDeadlineBox() {
    let box = document.querySelector('[data-booking-deadline-info]');
    if (box) return box;

    box = document.createElement('section');
    box.className = 'booking-deadline-info';
    box.dataset.bookingDeadlineInfo = '';
    box.setAttribute('aria-live', 'polite');
    box.innerHTML = '<strong>Termine prenotazioni</strong><span data-booking-deadline-text>Caricamento…</span>';

    if (hero) hero.insertAdjacentElement('afterend', box);
    return box;
  }

  const deadlineBox = ensureDeadlineBox();
  const deadlineText = deadlineBox.querySelector('[data-booking-deadline-text]');

  function renderDeadline() {
    const cutoff = formatCutoff(settings.bookingCutoffAt);
    if (!deadlineText) return;

    if (!cutoff) {
      deadlineText.textContent = 'La data e l’ora di chiusura non sono ancora state definite dall’organizzazione.';
      deadlineBox.classList.remove('is-closed');
      return;
    }

    deadlineText.textContent = settings.bookingOpen === false
      ? `Le prenotazioni e le modifiche online si sono chiuse ${cutoff} (ora italiana).`
      : `Prenotazioni, modifiche e cancellazioni online fino a ${cutoff} (ora italiana).`;
    deadlineBox.classList.toggle('is-closed', settings.bookingOpen === false);
  }

  function setStatus(message, kind = '') {
    if (!bookingStatus) return;
    bookingStatus.textContent = message || '';
    bookingStatus.className = `booking-status${kind ? ` is-${kind}` : ''}`;
  }

  async function requestJson(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: { 'content-type': 'application/json', ...(options.headers || {}) }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.error || 'Operazione non riuscita.');
      error.code = payload.code;
      throw error;
    }
    return payload;
  }

  let deleteButton = null;

  function ensureDeleteButton() {
    if (mode !== 'edit') return null;
    if (deleteButton) return deleteButton;

    const actions = form.querySelector('.booking-actions');
    if (!actions) return null;

    deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'button booking-delete-button';
    deleteButton.textContent = 'Elimina prenotazione';
    deleteButton.disabled = true;
    actions.insertBefore(deleteButton, bookingStatus || null);
    return deleteButton;
  }

  function setDeleteAvailability() {
    const button = ensureDeleteButton();
    if (!button) return;
    button.disabled = settings.bookingOpen === false || !booking;
    button.title = settings.bookingOpen === false
      ? 'Il termine per modifiche e cancellazioni online è scaduto.'
      : '';
  }

  function showDeleted(payload) {
    form.hidden = true;

    let result = document.querySelector('[data-booking-delete-success]');
    if (!result) {
      result = document.createElement('section');
      result.className = 'booking-success booking-delete-success';
      result.dataset.bookingDeleteSuccess = '';
      form.insertAdjacentElement('afterend', result);
    }

    const code = payload.bookingCode || booking?.bookingCode || '';
    result.innerHTML = `
      <h2>Prenotazione eliminata</h2>
      <p>${payload.warning || 'La prenotazione è stata eliminata e le barche assegnate sono tornate disponibili.'}</p>
      ${code ? `<p class="booking-success__code"><span>Codice prenotazione</span><strong>${String(code).replace(/[&<>"']/g, '')}</strong></p>` : ''}
      <p>Abbiamo inviato una comunicazione di annullamento all’indirizzo email del referente.</p>`;
    result.hidden = false;
    result.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function deleteBooking() {
    if (!deleteButton || deleteButton.disabled || !booking) return;

    const code = booking.bookingCode || '';
    const confirmed = window.confirm(
      `Vuoi davvero eliminare la prenotazione${code ? ` ${code}` : ''}?\n\nLe barche assegnate verranno liberate. L’operazione non può essere annullata.`
    );
    if (!confirmed) return;

    const originalText = deleteButton.textContent;
    deleteButton.disabled = true;
    if (submitButton) submitButton.disabled = true;
    deleteButton.textContent = 'Eliminazione…';
    setStatus();

    try {
      const payload = await requestJson(api, {
        method: 'POST',
        body: JSON.stringify({ action: 'delete', token })
      });
      showDeleted(payload);
    } catch (error) {
      setStatus(error.message, 'error');
      if (error.code === 'BOOKING_CLOSED') {
        settings.bookingOpen = false;
        renderDeadline();
      }
      deleteButton.disabled = settings.bookingOpen === false;
      if (submitButton && settings.bookingOpen !== false) submitButton.disabled = false;
    } finally {
      deleteButton.textContent = originalText;
    }
  }

  async function loadInfo() {
    try {
      let payload;
      if (mode === 'edit') {
        token = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('token') || '';
        if (!token) return;
        payload = await requestJson(api, {
          method: 'POST',
          body: JSON.stringify({ action: 'get', token })
        });
        booking = payload.booking || null;
      } else {
        payload = await requestJson(availabilityApi, { method: 'GET' });
      }

      settings = { ...settings, ...(payload.settings || {}) };
      renderDeadline();
      setDeleteAvailability();
    } catch (error) {
      if (deadlineText) deadlineText.textContent = 'Non è stato possibile caricare il termine delle prenotazioni.';
      console.error('Errore caricamento termine prenotazioni:', error);
    }
  }

  ensureDeleteButton()?.addEventListener('click', deleteBooking);
  renderDeadline();
  loadInfo();
})();

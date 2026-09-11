(() => {
  const lookupForm = document.querySelector('[data-booking-lookup]');
  const lookupResult = document.querySelector('[data-lookup-result]');
  if (!lookupForm || !lookupResult) return;

  const api = '/api/boat-bookings';
  const lookupStatus = document.querySelector('[data-lookup-status]');
  const formShell = document.querySelector('[data-booking-shell]');
  const closedNotice = document.querySelector('[data-booking-closed]');
  const loading = document.querySelector('[data-booking-loading]');
  const codeInput = lookupForm.elements.bookingCode;

  let currentPayload = null;

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function setStatus(message = '', kind = '') {
    if (!lookupStatus) return;
    lookupStatus.textContent = message;
    lookupStatus.className = `booking-status${kind ? ` is-${kind}` : ''}`;
  }

  function hideCreation() {
    if (formShell) {
      formShell.hidden = true;
      formShell.style.display = 'none';
    }
    if (closedNotice) {
      closedNotice.hidden = true;
      closedNotice.style.display = 'none';
    }
    if (loading) loading.hidden = true;
  }

  function restoreCreation() {
    if (formShell) formShell.style.removeProperty('display');
    if (closedNotice) closedNotice.style.removeProperty('display');
  }

  function boatsSummaryHtml(booking) {
    return (booking.items || []).map((item) => {
      const numbers = Array.isArray(item.boatNumbers) && item.boatNumbers.length
        ? `<span>Barche assegnate: <strong>${item.boatNumbers.map(escapeHtml).join(', ')}</strong></span>`
        : '';
      return `<li><strong>${escapeHtml(item.builder)} ${escapeHtml(item.boatType)}</strong> × ${Number(item.quantity)}${numbers}</li>`;
    }).join('');
  }

  function tokenFromEditLink(editLink) {
    if (!editLink) return '';
    try {
      const url = new URL(editLink, window.location.href);
      return new URLSearchParams(url.hash.replace(/^#/, '')).get('token') || '';
    } catch {
      return '';
    }
  }

  function renderBooking(payload) {
    currentPayload = payload;
    const booking = payload.booking || {};
    const canEdit = payload.canEdit !== false && payload.editLink;
    const editAction = canEdit
      ? `<div class="booking-actions" style="margin-top:18px">
          <a class="button button--primary" href="${escapeHtml(payload.editLink)}">Modifica prenotazione</a>
          <button class="button booking-delete-button" type="button" data-delete-booking>Elimina prenotazione</button>
        </div>`
      : '<div class="booking-status is-warning" style="margin-top:18px">Le modifiche online sono chiuse.</div>';

    lookupResult.hidden = false;
    lookupResult.innerHTML = `
      <div class="lookup-result__head">
        <div><small>Codice prenotazione</small><strong>${escapeHtml(booking.bookingCode)}</strong></div>
        <span class="booking-chip booking-chip--light">${escapeHtml(booking.slotLabel)}</span>
      </div>
      <div class="lookup-result__details">
        <p><strong>Società</strong><br>${escapeHtml(booking.society)}</p>
        <p><strong>Referente</strong><br>${escapeHtml(booking.contactSurname)} ${escapeHtml(booking.contactName)}</p>
        <p><strong>Telefono</strong><br>${escapeHtml(booking.phone)}</p>
        <p><strong>Email</strong><br>${escapeHtml(booking.email)}</p>
      </div>
      <div class="lookup-result__boats">
        <strong>Barche assegnate</strong>
        <ul>${boatsSummaryHtml(booking)}</ul>
      </div>
      ${editAction}`;
  }

  function renderDeleted(bookingCode, warning = '') {
    currentPayload = null;
    lookupResult.hidden = false;
    lookupResult.innerHTML = `
      <div class="booking-success booking-delete-success" style="margin-top:0">
        <h2>Prenotazione eliminata</h2>
        <p>${escapeHtml(warning || 'La prenotazione è stata eliminata e le barche assegnate sono tornate disponibili.')}</p>
        ${bookingCode ? `<p class="booking-success__code"><span>Codice prenotazione</span><strong>${escapeHtml(bookingCode)}</strong></p>` : ''}
        <p>Abbiamo inviato una comunicazione di annullamento all’indirizzo email del referente.</p>
      </div>`;
    setStatus('Prenotazione eliminata.', 'ok');
    history.replaceState(null, '', `${location.pathname}${location.search}`);
  }

  async function deleteCurrentBooking(button) {
    if (!currentPayload?.editLink || currentPayload.canEdit === false) return;

    const token = tokenFromEditLink(currentPayload.editLink);
    if (!token) {
      setStatus('Non è stato possibile recuperare il link personale di modifica.', 'error');
      return;
    }

    const bookingCode = currentPayload.booking?.bookingCode || '';
    const confirmed = window.confirm(
      `Vuoi davvero eliminare la prenotazione${bookingCode ? ` ${bookingCode}` : ''}?\n\nLe barche assegnate verranno liberate. L’operazione non può essere annullata.`
    );
    if (!confirmed) return;

    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Eliminazione…';
    setStatus();

    try {
      const response = await fetch(api, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'delete', token })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Operazione non riuscita.');

      renderDeleted(payload.bookingCode || bookingCode, payload.warning || '');
    } catch (error) {
      button.disabled = false;
      button.textContent = originalText;
      setStatus(error.message, 'error');
    }
  }

  async function lookupBooking(rawCode, { updateHash = true } = {}) {
    const bookingCode = String(rawCode || '').trim();
    if (!bookingCode) return;

    setStatus();
    lookupResult.hidden = true;
    hideCreation();

    const button = lookupForm.querySelector('button[type="submit"]');
    if (button) button.disabled = true;

    try {
      const response = await fetch(api, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'lookup', bookingCode })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Operazione non riuscita.');

      renderBooking(payload);
      setStatus('Prenotazione trovata.', 'ok');
      if (codeInput) codeInput.value = payload.booking?.bookingCode || bookingCode;

      if (updateHash && payload.booking?.bookingCode) {
        history.replaceState(null, '', `${location.pathname}${location.search}#code=${encodeURIComponent(payload.booking.bookingCode)}`);
      }
    } catch (error) {
      currentPayload = null;
      restoreCreation();
      setStatus(error.message, 'error');
    } finally {
      if (button) button.disabled = false;
    }
  }

  lookupResult.addEventListener('click', (event) => {
    const button = event.target.closest('[data-delete-booking]');
    if (!button) return;
    deleteCurrentBooking(button);
  });

  lookupForm.addEventListener('submit', (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    lookupBooking(codeInput?.value || '');
  }, true);

  const directCode = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('code');
  if (directCode) {
    if (codeInput) codeInput.value = directCode;
    hideCreation();
    lookupBooking(directCode, { updateHash: false });
  }
})();

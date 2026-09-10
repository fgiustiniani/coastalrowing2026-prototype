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

  function renderBooking(payload) {
    const booking = payload.booking || {};
    const editAction = payload.canEdit !== false && payload.editLink
      ? `<div class="booking-actions" style="margin-top:18px"><a class="button button--primary" href="${escapeHtml(payload.editLink)}">Modifica prenotazione</a></div>`
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
      restoreCreation();
      setStatus(error.message, 'error');
    } finally {
      if (button) button.disabled = false;
    }
  }

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

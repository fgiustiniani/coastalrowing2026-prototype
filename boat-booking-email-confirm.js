(() => {
  const form = document.querySelector('[data-booking-form]');
  if (!form || !form.elements.email || !form.elements.emailConfirm) return;

  const status = form.querySelector('[data-booking-status]');
  const originalFetch = window.fetch.bind(window);

  // Manteniamo email e conferma email nella stessa colonna e affianchiamo
  // la privacy alla conferma, sia in creazione sia in modifica.
  const grid = form.querySelector('.booking-grid');
  const emailField = form.elements.email.closest('.booking-field');
  const phoneField = form.elements.phone?.closest('.booking-field');
  const emailConfirmField = form.elements.emailConfirm.closest('.booking-field');
  const privacy = form.querySelector('.booking-privacy');

  if (grid && emailField && phoneField && emailConfirmField && privacy) {
    grid.insertBefore(emailField, phoneField);
    grid.appendChild(emailConfirmField);
    privacy.classList.add('booking-privacy--grid');
    grid.appendChild(privacy);

    if (!document.querySelector('style[data-booking-contact-layout]')) {
      const style = document.createElement('style');
      style.dataset.bookingContactLayout = 'true';
      style.textContent = `
        .booking-privacy--grid {
          align-self: center;
          margin: 24px 0 0;
          min-height: 48px;
        }
        @media (max-width: 700px) {
          .booking-privacy--grid {
            margin-top: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  function normalized(value) {
    return String(value || '').trim().toLowerCase();
  }

  function showError(message) {
    if (status) {
      status.textContent = message;
      status.className = 'booking-status is-error';
    }
    form.elements.emailConfirm.setAttribute('aria-invalid', 'true');
    form.elements.emailConfirm.focus();
  }

  function clearError() {
    form.elements.emailConfirm.removeAttribute('aria-invalid');
  }

  form.elements.email.addEventListener('input', clearError);
  form.elements.emailConfirm.addEventListener('input', clearError);

  form.addEventListener('submit', (event) => {
    const email = normalized(form.elements.email.value);
    const emailConfirm = normalized(form.elements.emailConfirm.value);

    if (!emailConfirm) {
      event.preventDefault();
      event.stopImmediatePropagation();
      showError('Ripeti l’indirizzo email nel campo di conferma.');
      return;
    }

    if (email !== emailConfirm) {
      event.preventDefault();
      event.stopImmediatePropagation();
      showError('Gli indirizzi email non coincidono.');
      return;
    }

    clearError();
  }, true);

  window.fetch = (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url || '';
    if (url.includes('/api/boat-bookings') && typeof init.body === 'string') {
      try {
        const payload = JSON.parse(init.body);
        if (payload.action === 'create' || payload.action === 'update') {
          payload.emailConfirm = form.elements.emailConfirm.value;
          init = { ...init, body: JSON.stringify(payload) };
        }
      } catch {
        // La richiesta originale viene comunque inoltrata.
      }
    }

    return originalFetch(input, init);
  };
})();

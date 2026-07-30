(() => {
  const endpoint = '/api/partnership';
  const fallbackEmail = String(
    document.documentElement.dataset.partnershipEmail || 'f.giustiniani@canottieripesaro.it'
  ).trim();

  function updateContactEmail(email) {
    document.querySelectorAll('[data-partnership-email-link]').forEach((link) => {
      link.href = `mailto:${email}`;
      const emailText = link.querySelector('[data-partnership-email-text]');
      if (emailText) emailText.textContent = email;
    });
  }

  updateContactEmail(fallbackEmail);

  fetch(endpoint, { headers: { accept: 'application/json' } })
    .then((response) => (response.ok ? response.json() : null))
    .then((data) => {
      const configuredEmail = String(data?.contactEmail || '').trim();
      if (configuredEmail) updateContactEmail(configuredEmail);
    })
    .catch(() => {
      // Su GitHub Pages la funzione non è disponibile: resta visibile l'indirizzo di fallback.
    });

  const form = document.getElementById('partnership-form');
  const status = document.getElementById('partnership-form-status');
  const submitButton = form?.querySelector('button[type="submit"]');

  if (!form || !status || !submitButton) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!form.reportValidity()) return;

    const data = new FormData(form);
    const payload = {
      azienda: String(data.get('azienda') || '').trim(),
      nome: String(data.get('nome') || '').trim(),
      email: String(data.get('email') || '').trim(),
      telefono: String(data.get('telefono') || '').trim(),
      interesse: String(data.get('interesse') || '').trim(),
      messaggio: String(data.get('messaggio') || '').trim(),
      website: String(data.get('website') || '').trim()
    };

    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Invio in corso…';
    status.textContent = 'Stiamo inviando la richiesta.';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || 'Non è stato possibile inviare la richiesta.');
      }

      status.textContent = `Richiesta inviata correttamente. Una copia è stata inviata a ${payload.email}.`;
      form.reset();
    } catch (error) {
      status.textContent = error instanceof Error
        ? error.message
        : 'Non è stato possibile inviare la richiesta. Riprova più tardi.';
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = originalButtonText;
    }
  });
})();

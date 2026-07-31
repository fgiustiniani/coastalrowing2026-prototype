(() => {
  const endpoint = '/api/partnership';
  const fallbackEmail = String(
    document.documentElement.dataset.partnershipEmail || 'f.giustiniani@canottieripesaro.it'
  ).trim();
  const isGitHubPages = window.location.hostname.endsWith('github.io');

  const interestSelect = document.querySelector('select[name="interesse"]');
  if (interestSelect) {
    const subjectInput = document.createElement('input');
    subjectInput.type = 'text';
    subjectInput.name = 'oggetto';
    subjectInput.maxLength = 180;
    subjectInput.required = true;
    subjectInput.placeholder = 'Es. Richiesta informazioni sulla partnership';

    const label = interestSelect.closest('label');
    const labelText = label?.querySelector('span');
    if (labelText) labelText.textContent = 'Oggetto *';

    interestSelect.replaceWith(subjectInput);
  }

  function updateContactEmail(email) {
    document.querySelectorAll('[data-partnership-email-link]').forEach((link) => {
      link.href = `mailto:${email}`;
    });
  }

  function buildFormSubmitPayload(payload) {
    return {
      _subject: `Richiesta partnership - ${payload.oggetto}`,
      _template: 'table',
      _cc: payload.email,
      _replyto: payload.email,
      _url: window.location.href,
      email: payload.email,
      Tipologia: 'Richiesta partnership',
      Azienda: payload.azienda,
      Nome: payload.nome,
      Telefono: payload.telefono || 'Non indicato',
      Oggetto: payload.oggetto,
      Messaggio: payload.messaggio || 'Nessun messaggio aggiuntivo.'
    };
  }

  async function sendViaFormSubmit(payload) {
    const response = await fetch(`https://formsubmit.co/ajax/${fallbackEmail}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json'
      },
      body: JSON.stringify(buildFormSubmitPayload(payload))
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.success === false) {
      throw new Error(result.message || 'Non è stato possibile inviare la richiesta.');
    }

    return result;
  }

  async function sendViaNetlify(payload) {
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

    return result;
  }

  updateContactEmail(fallbackEmail);

  if (!isGitHubPages) {
    fetch(endpoint, { headers: { accept: 'application/json' } })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        const configuredEmail = String(data?.contactEmail || '').trim();
        if (configuredEmail) updateContactEmail(configuredEmail);
      })
      .catch(() => {
        // Resta attivo l'indirizzo di fallback configurato nella pagina.
      });
  }

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
      oggetto: String(data.get('oggetto') || '').trim(),
      messaggio: String(data.get('messaggio') || '').trim(),
      website: String(data.get('website') || '').trim()
    };

    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Invio in corso…';
    status.textContent = 'Stiamo inviando la richiesta.';

    try {
      if (isGitHubPages) {
        await sendViaFormSubmit(payload);
        status.textContent = `Richiesta inviata. Una copia è stata indirizzata a ${payload.email}. Al primo test potrebbe essere necessario confermare l’attivazione ricevuta dall’organizzazione.`;
      } else {
        await sendViaNetlify(payload);
        status.textContent = `Richiesta inviata correttamente. Una copia è stata inviata a ${payload.email}.`;
      }
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
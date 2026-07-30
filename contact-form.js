(() => {
  const endpoint = '/api/contact';
  const fallbackEmail = String(
    document.documentElement.dataset.contactEmail || 'f.giustiniani@canottieripesaro.it'
  ).trim();
  const isGitHubPages = window.location.hostname.endsWith('github.io');
  const dialog = document.getElementById('contact-dialog');
  const openButton = document.querySelector('[data-open-contact-form]');
  const closeButton = dialog?.querySelector('[data-close-contact-form]');
  const form = document.getElementById('contact-form');
  const status = document.getElementById('contact-form-status');
  const submitButton = form?.querySelector('button[type="submit"]');

  if (!dialog || !openButton || !closeButton || !form || !status || !submitButton) return;

  function buildFormSubmitPayload(payload) {
    return {
      _subject: `Contatto dal sito - ${payload.oggetto}`,
      _template: 'table',
      _cc: payload.email,
      _replyto: payload.email,
      _url: window.location.href,
      email: payload.email,
      Tipologia: 'Contatto dal sito',
      Nome: payload.nome,
      Cognome: payload.cognome,
      Oggetto: payload.oggetto,
      Messaggio: payload.messaggio
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
      throw new Error(result.message || 'Non è stato possibile inviare il messaggio.');
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
      throw new Error(result.error || 'Non è stato possibile inviare il messaggio.');
    }

    return result;
  }

  openButton.addEventListener('click', () => {
    status.textContent = '';
    dialog.showModal();
    window.setTimeout(() => form.querySelector('input[name="nome"]')?.focus(), 50);
  });

  closeButton.addEventListener('click', () => dialog.close());

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!form.reportValidity()) return;

    const data = new FormData(form);
    const payload = {
      nome: String(data.get('nome') || '').trim(),
      cognome: String(data.get('cognome') || '').trim(),
      email: String(data.get('email') || '').trim(),
      oggetto: String(data.get('oggetto') || '').trim(),
      messaggio: String(data.get('messaggio') || '').trim(),
      website: String(data.get('website') || '').trim()
    };

    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Invio in corso…';
    status.textContent = 'Stiamo inviando il messaggio.';

    try {
      if (isGitHubPages) {
        await sendViaFormSubmit(payload);
        status.textContent = `Messaggio inviato. Una copia è stata indirizzata a ${payload.email}. Al primo test potrebbe essere necessario confermare l’attivazione ricevuta da ${fallbackEmail}.`;
      } else {
        await sendViaNetlify(payload);
        status.textContent = `Messaggio inviato correttamente. Una copia è stata inviata a ${payload.email}.`;
      }
      form.reset();
    } catch (error) {
      status.textContent = error instanceof Error
        ? error.message
        : 'Non è stato possibile inviare il messaggio. Riprova più tardi.';
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = originalButtonText;
    }
  });
})();
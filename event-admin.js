(() => {
  const endpoint = '/api/event-state';
  const current = document.querySelector('[data-event-admin-current]');
  const updated = document.querySelector('[data-event-admin-updated]');
  const loginForm = document.querySelector('[data-event-admin-login]');
  const controls = document.querySelector('[data-event-admin-controls]');
  const loginStatus = document.querySelector('[data-event-admin-login-status]');
  const status = document.querySelector('[data-event-admin-status]');
  const saveButton = document.querySelector('[data-event-admin-save]');
  const logoutButton = document.querySelector('[data-event-admin-logout]');
  const streamField = document.querySelector('[data-event-admin-stream]');

  let credentials = null;
  let config = { state: 'pre', stream: 'sabato', updatedAt: null };

  const labels = {
    pre: 'Pre-gara',
    live: 'Live',
    pause: 'Pausa',
    post: 'Post-gara'
  };

  function authHeader() {
    if (!credentials) return {};
    return {
      authorization: `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`
    };
  }

  function formatUpdatedAt(value) {
    if (!value) return 'Nessuna modifica amministrativa ancora salvata in questo contesto.';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return `Ultimo aggiornamento: ${new Intl.DateTimeFormat('it-IT', {
      timeZone: 'Europe/Rome',
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date)}`;
  }

  function renderConfig(next) {
    config = {
      state: ['pre','live','pause','post'].includes(next?.state) ? next.state : 'pre',
      stream: ['sabato','domenica'].includes(next?.stream) ? next.stream : 'sabato',
      updatedAt: next?.updatedAt || null
    };

    if (current) {
      current.textContent = config.state === 'live'
        ? `${labels[config.state]} · ${config.stream}`
        : labels[config.state];
    }
    if (updated) updated.textContent = formatUpdatedAt(config.updatedAt);

    controls?.querySelectorAll('input[name="state"]').forEach((input) => {
      input.checked = input.value === config.state;
    });
    const streamSelect = controls?.querySelector('select[name="stream"]');
    if (streamSelect) streamSelect.value = config.stream;
  }

  async function loadConfig() {
    const response = await fetch(endpoint, {
      headers: { accept: 'application/json' },
      cache: 'no-store'
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Stato evento non disponibile.');
    renderConfig(result);
  }

  async function sendAdminRequest(payload) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        ...authHeader()
      },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Operazione non riuscita.');
    return result;
  }

  loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!loginForm.reportValidity()) return;

    const data = new FormData(loginForm);
    credentials = {
      username: String(data.get('username') || ''),
      password: String(data.get('password') || '')
    };

    const button = loginForm.querySelector('button[type="submit"]');
    if (button) {
      button.disabled = true;
      button.textContent = 'Accesso…';
    }
    if (loginStatus) loginStatus.textContent = 'Verifica delle credenziali.';

    try {
      const result = await sendAdminRequest({ action: 'login' });
      renderConfig(result);
      loginForm.hidden = true;
      controls.hidden = false;
      if (loginStatus) loginStatus.textContent = '';
      if (status) status.textContent = 'Accesso effettuato.';
    } catch (error) {
      credentials = null;
      if (loginStatus) loginStatus.textContent = error instanceof Error ? error.message : 'Accesso non riuscito.';
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = 'Accedi';
      }
    }
  });

  controls?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!controls.reportValidity()) return;

    const data = new FormData(controls);
    const payload = {
      action: 'set',
      state: String(data.get('state') || ''),
      stream: String(data.get('stream') || '')
    };

    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent = 'Salvataggio…';
    }
    if (status) status.textContent = 'Aggiornamento della home in corso.';

    try {
      const result = await sendAdminRequest(payload);
      renderConfig(result);
      if (status) status.textContent = 'Stato salvato. La home si aggiornerà entro circa 30 secondi.';
    } catch (error) {
      if (status) status.textContent = error instanceof Error ? error.message : 'Salvataggio non riuscito.';
    } finally {
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = 'Salva stato';
      }
    }
  });

  logoutButton?.addEventListener('click', () => {
    credentials = null;
    controls.hidden = true;
    loginForm.hidden = false;
    loginForm.reset();
    if (status) status.textContent = '';
    if (loginStatus) loginStatus.textContent = 'Sessione amministrativa chiusa.';
  });

  controls?.querySelectorAll('input[name="state"]').forEach((input) => {
    input.addEventListener('change', () => {
      if (!streamField) return;
      streamField.classList.toggle('is-live-selected', input.value === 'live' && input.checked);
    });
  });

  loadConfig().catch((error) => {
    if (current) current.textContent = 'Non disponibile';
    if (updated) updated.textContent = error instanceof Error ? error.message : 'Stato evento non disponibile.';
  });
})();

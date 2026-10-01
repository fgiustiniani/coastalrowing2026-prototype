(() => {
  const eventEndpoint = '/api/event-state';
  const newsEndpoint = '/api/news';

  const current = document.querySelector('[data-event-admin-current]');
  const updated = document.querySelector('[data-event-admin-updated]');
  const loginForm = document.querySelector('[data-event-admin-login]');
  const controls = document.querySelector('[data-event-admin-controls]');
  const loginStatus = document.querySelector('[data-event-admin-login-status]');
  const status = document.querySelector('[data-event-admin-status]');
  const saveButton = document.querySelector('[data-event-admin-save]');
  const logoutButton = document.querySelector('[data-event-admin-logout]');
  const streamField = document.querySelector('[data-event-admin-stream]');

  const newsPanel = document.querySelector('[data-event-admin-news-panel]');
  const newsForm = document.querySelector('[data-event-news-form]');
  const newsList = document.querySelector('[data-event-news-list]');
  const newsStatus = document.querySelector('[data-event-news-status]');
  const newsSubmit = document.querySelector('[data-event-news-submit]');
  const newsCancel = document.querySelector('[data-event-news-cancel]');

  let credentials = null;
  let config = { state: 'pre', stream: 'sabato', updatedAt: null };
  let newsItems = [];

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

  async function sendRequest(endpoint, payload) {
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

  function formatNewsDate(value) {
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  }

  function todayRome() {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Rome',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
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
    const response = await fetch(eventEndpoint, {
      headers: { accept: 'application/json' },
      cache: 'no-store'
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Stato evento non disponibile.');
    renderConfig(result);
  }

  function resetNewsEditor() {
    newsForm?.reset();
    const id = newsForm?.querySelector('input[name="id"]');
    const date = newsForm?.querySelector('input[name="date"]');
    const linkUrl = newsForm?.querySelector('input[name="linkUrl"]');
    const linkLabel = newsForm?.querySelector('input[name="linkLabel"]');
    if (id) id.value = '';
    if (date) date.value = todayRome();
    if (linkUrl) linkUrl.value = '';
    if (linkLabel) linkLabel.value = '';
    if (newsSubmit) newsSubmit.textContent = 'Pubblica news';
    newsCancel?.setAttribute('hidden', '');
    if (newsStatus) newsStatus.textContent = '';
  }

  function startEditingNews(item) {
    if (!newsForm) return;
    const fields = {
      id: item.id || '',
      title: item.title || '',
      date: item.date || '',
      summary: item.summary || '',
      body: item.body || '',
      linkUrl: item.linkUrl || '',
      linkLabel: item.linkLabel || ''
    };
    Object.entries(fields).forEach(([name, value]) => {
      const input = newsForm.querySelector(`[name="${name}"]`);
      if (input) input.value = value;
    });
    if (newsSubmit) newsSubmit.textContent = 'Salva modifiche';
    newsCancel?.removeAttribute('hidden');
    if (newsStatus) newsStatus.textContent = `Stai modificando “${item.title || 'News'}”.`;
    newsForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function deleteNews(item) {
    if (!credentials) return;
    if (!window.confirm(`Eliminare definitivamente la news “${item.title || ''}”?`)) return;

    try {
      const result = await sendRequest(newsEndpoint, { action: 'delete', id: item.id });
      renderNews(result.news);
      resetNewsEditor();
      if (newsStatus) newsStatus.textContent = 'News eliminata.';
    } catch (error) {
      if (newsStatus) newsStatus.textContent = error instanceof Error ? error.message : 'Eliminazione non riuscita.';
    }
  }

  function renderNews(items) {
    newsItems = Array.isArray(items) ? items : [];
    if (!newsList) return;
    newsList.replaceChildren();

    if (newsItems.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'event-admin-status';
      empty.textContent = 'Nessuna news pubblicata in questo contesto.';
      newsList.appendChild(empty);
      return;
    }

    newsItems.forEach((item) => {
      const article = document.createElement('article');
      article.className = 'news-row';

      const content = document.createElement('div');
      content.className = 'news-row__open';

      const time = document.createElement('time');
      time.dateTime = item.date || '';
      time.textContent = formatNewsDate(item.date || '');

      const copy = document.createElement('span');
      copy.className = 'news-row__content';

      const title = document.createElement('strong');
      title.className = 'news-row__title';
      title.textContent = item.title || '';

      const summary = document.createElement('span');
      summary.className = 'news-row__summary';
      summary.textContent = item.summary || '';

      copy.append(title, summary);
      content.append(time, copy);

      const actions = document.createElement('div');
      actions.className = 'news-row__admin-actions';

      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'news-row__admin-button';
      edit.textContent = 'Modifica';
      edit.addEventListener('click', () => startEditingNews(item));

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'news-row__admin-button news-row__admin-button--danger';
      remove.textContent = 'Elimina';
      remove.addEventListener('click', () => deleteNews(item));

      actions.append(edit, remove);
      article.append(content, actions);
      newsList.appendChild(article);
    });
  }

  async function loadNews() {
    if (!newsList) return;
    try {
      const response = await fetch(newsEndpoint, {
        headers: { accept: 'application/json' },
        cache: 'no-store'
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Non è stato possibile caricare le news.');
      renderNews(result.news);
    } catch (error) {
      newsList.replaceChildren();
      const message = document.createElement('p');
      message.className = 'event-admin-status';
      message.textContent = error instanceof Error ? error.message : 'Non è stato possibile caricare le news.';
      newsList.appendChild(message);
    }
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
      const [eventResult] = await Promise.all([
        sendRequest(eventEndpoint, { action: 'login' }),
        sendRequest(newsEndpoint, { action: 'login' })
      ]);
      renderConfig(eventResult);
      loginForm.hidden = true;
      controls.hidden = false;
      if (newsPanel) newsPanel.hidden = false;
      resetNewsEditor();
      await loadNews();
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
      const result = await sendRequest(eventEndpoint, payload);
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

  newsForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!newsForm.reportValidity()) return;

    const data = new FormData(newsForm);
    const id = String(data.get('id') || '').trim();
    const payload = {
      action: id ? 'update' : 'create',
      id,
      title: String(data.get('title') || '').trim(),
      date: String(data.get('date') || '').trim(),
      summary: String(data.get('summary') || '').trim(),
      body: String(data.get('body') || '').trim(),
      linkUrl: String(data.get('linkUrl') || '').trim(),
      linkLabel: String(data.get('linkLabel') || '').trim()
    };

    if (newsSubmit) {
      newsSubmit.disabled = true;
      newsSubmit.textContent = id ? 'Salvataggio…' : 'Pubblicazione…';
    }
    if (newsStatus) newsStatus.textContent = id ? 'Salvataggio delle modifiche.' : 'Pubblicazione in corso.';

    try {
      const result = await sendRequest(newsEndpoint, payload);
      renderNews(result.news);
      resetNewsEditor();
      if (newsStatus) newsStatus.textContent = id ? 'News modificata correttamente.' : 'News pubblicata correttamente.';
    } catch (error) {
      if (newsStatus) newsStatus.textContent = error instanceof Error ? error.message : 'Operazione non riuscita.';
    } finally {
      if (newsSubmit) {
        newsSubmit.disabled = false;
        if (newsSubmit.textContent === 'Salvataggio…' || newsSubmit.textContent === 'Pubblicazione…') {
          newsSubmit.textContent = id ? 'Salva modifiche' : 'Pubblica news';
        }
      }
    }
  });

  newsCancel?.addEventListener('click', resetNewsEditor);

  logoutButton?.addEventListener('click', () => {
    credentials = null;
    controls.hidden = true;
    if (newsPanel) newsPanel.hidden = true;
    loginForm.hidden = false;
    loginForm.reset();
    resetNewsEditor();
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

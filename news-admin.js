(() => {
  const endpoint = '/api/news';
  const list = document.getElementById('news-list');
  const dialog = document.getElementById('news-admin-dialog');
  const openButton = document.querySelector('[data-open-news-admin]');
  const closeButton = dialog?.querySelector('[data-close-news-admin]');
  const loginForm = document.getElementById('news-login-form');
  const editorForm = document.getElementById('news-editor-form');
  const loginStatus = document.getElementById('news-login-status');
  const editorStatus = document.getElementById('news-editor-status');
  const dateInput = editorForm?.querySelector('input[name="date"]');

  if (!list) return;

  let credentials = null;

  function formatDate(value) {
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  }

  function createEmptyState(message = 'Le news saranno pubblicate qui appena disponibili.') {
    const card = document.createElement('article');
    card.className = 'news-empty';

    const status = document.createElement('span');
    status.className = 'news-empty__status';
    status.textContent = 'In aggiornamento';

    const title = document.createElement('h3');
    title.textContent = 'Ultimi aggiornamenti';

    const copy = document.createElement('p');
    copy.textContent = message;

    card.append(status, title, copy);
    return card;
  }

  function renderNews(items) {
    list.replaceChildren();

    if (!Array.isArray(items) || items.length === 0) {
      list.appendChild(createEmptyState());
      return;
    }

    items.forEach((item) => {
      const article = document.createElement('article');
      article.className = 'news-card';

      const time = document.createElement('time');
      time.dateTime = item.date || '';
      time.textContent = formatDate(item.date || '');

      const title = document.createElement('h3');
      title.textContent = item.title || '';

      const summary = document.createElement('p');
      summary.className = 'news-card__summary';
      summary.textContent = item.summary || '';

      article.append(time, title, summary);

      if (item.body) {
        const body = document.createElement('p');
        body.className = 'news-card__body';
        body.textContent = item.body;
        article.appendChild(body);
      }

      list.appendChild(article);
    });
  }

  async function loadNews() {
    try {
      const response = await fetch(endpoint, {
        headers: { accept: 'application/json' },
        cache: 'no-store'
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Non è stato possibile caricare le news.');
      renderNews(result.news);
    } catch (error) {
      list.replaceChildren(createEmptyState(
        error instanceof Error ? error.message : 'Non è stato possibile caricare le news.'
      ));
    }
  }

  function authHeader() {
    if (!credentials) return {};
    return {
      authorization: `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`
    };
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
    if (!response.ok) {
      throw new Error(result.error || 'Operazione non riuscita.');
    }
    return result;
  }

  function resetDialog() {
    credentials = null;
    loginForm?.reset();
    editorForm?.reset();
    loginForm?.removeAttribute('hidden');
    editorForm?.setAttribute('hidden', '');
    if (loginStatus) loginStatus.textContent = '';
    if (editorStatus) editorStatus.textContent = '';
    if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
  }

  openButton?.addEventListener('click', () => {
    resetDialog();
    dialog?.showModal();
    window.setTimeout(() => loginForm?.querySelector('input[name="username"]')?.focus(), 50);
  });

  closeButton?.addEventListener('click', () => dialog?.close());

  dialog?.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  dialog?.addEventListener('close', resetDialog);

  loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!loginForm.reportValidity()) return;

    const formData = new FormData(loginForm);
    credentials = {
      username: String(formData.get('username') || ''),
      password: String(formData.get('password') || '')
    };

    const submitButton = loginForm.querySelector('button[type="submit"]');
    const originalText = submitButton?.textContent || '';
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Accesso…';
    }
    if (loginStatus) loginStatus.textContent = 'Verifica delle credenziali.';

    try {
      await sendAdminRequest({ action: 'login' });
      loginForm.setAttribute('hidden', '');
      editorForm?.removeAttribute('hidden');
      if (loginStatus) loginStatus.textContent = '';
      if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
      window.setTimeout(() => editorForm?.querySelector('input[name="title"]')?.focus(), 50);
    } catch (error) {
      credentials = null;
      if (loginStatus) {
        loginStatus.textContent = error instanceof Error ? error.message : 'Accesso non riuscito.';
      }
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    }
  });

  editorForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!editorForm.reportValidity()) return;

    const formData = new FormData(editorForm);
    const payload = {
      action: 'create',
      title: String(formData.get('title') || '').trim(),
      date: String(formData.get('date') || '').trim(),
      summary: String(formData.get('summary') || '').trim(),
      body: String(formData.get('body') || '').trim()
    };

    const submitButton = editorForm.querySelector('button[type="submit"]');
    const originalText = submitButton?.textContent || '';
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Pubblicazione…';
    }
    if (editorStatus) editorStatus.textContent = 'Pubblicazione della news in corso.';

    try {
      const result = await sendAdminRequest(payload);
      renderNews(result.news);
      editorForm.reset();
      if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
      if (editorStatus) editorStatus.textContent = 'News pubblicata correttamente.';
    } catch (error) {
      if (editorStatus) {
        editorStatus.textContent = error instanceof Error ? error.message : 'Pubblicazione non riuscita.';
      }
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    }
  });

  loadNews();
})();

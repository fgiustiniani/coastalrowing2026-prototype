(() => {
  const endpoint = '/api/news';
  const list = document.getElementById('news-list');
  const adminDialog = document.getElementById('news-admin-dialog');
  const detailDialog = document.getElementById('news-detail-dialog');
  const openAdminButton = document.querySelector('[data-open-news-admin]');
  const closeAdminButton = adminDialog?.querySelector('[data-close-news-admin]');
  const closeDetailButton = detailDialog?.querySelector('[data-close-news-detail]');
  const loginForm = document.getElementById('news-login-form');
  const editorForm = document.getElementById('news-editor-form');
  const loginStatus = document.getElementById('news-login-status');
  const editorStatus = document.getElementById('news-editor-status');
  const dateInput = editorForm?.querySelector('input[name="date"]');
  const idInput = editorForm?.querySelector('input[name="id"]');
  const submitButton = editorForm?.querySelector('[data-news-submit]');
  const cancelEditButton = editorForm?.querySelector('[data-cancel-news-edit]');
  const isGitHubPages = window.location.hostname.endsWith('github.io');

  if (!list) return;

  let credentials = null;
  let newsItems = [];

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

  function openDetail(item) {
    if (!detailDialog) return;

    const date = document.getElementById('news-detail-date');
    const title = document.getElementById('news-detail-title');
    const summary = document.getElementById('news-detail-summary');
    const body = document.getElementById('news-detail-body');

    if (date) {
      date.dateTime = item.date || '';
      date.textContent = formatDate(item.date || '');
    }
    if (title) title.textContent = item.title || '';
    if (summary) summary.textContent = item.summary || '';
    if (body) {
      body.textContent = item.body || '';
      body.hidden = !item.body;
    }

    detailDialog.showModal();
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
    if (!response.ok) throw new Error(result.error || 'Operazione non riuscita.');
    return result;
  }

  function resetEditor() {
    editorForm?.reset();
    if (idInput) idInput.value = '';
    if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
    if (submitButton) submitButton.textContent = 'Pubblica news';
    cancelEditButton?.setAttribute('hidden', '');
    if (editorStatus) editorStatus.textContent = '';
  }

  function showEditor() {
    loginForm?.setAttribute('hidden', '');
    editorForm?.removeAttribute('hidden');
  }

  function showLogin() {
    loginForm?.removeAttribute('hidden');
    editorForm?.setAttribute('hidden', '');
  }

  function startEditing(item) {
    if (!credentials || !editorForm || !adminDialog) return;

    showEditor();
    const titleInput = editorForm.querySelector('input[name="title"]');
    const summaryInput = editorForm.querySelector('textarea[name="summary"]');
    const bodyInput = editorForm.querySelector('textarea[name="body"]');

    if (idInput) idInput.value = item.id || '';
    if (titleInput) titleInput.value = item.title || '';
    if (dateInput) dateInput.value = item.date || '';
    if (summaryInput) summaryInput.value = item.summary || '';
    if (bodyInput) bodyInput.value = item.body || '';
    if (submitButton) submitButton.textContent = 'Salva modifiche';
    cancelEditButton?.removeAttribute('hidden');
    if (editorStatus) editorStatus.textContent = `Stai modificando “${item.title || 'News'}”.`;

    if (!adminDialog.open) adminDialog.showModal();
    window.setTimeout(() => titleInput?.focus(), 50);
  }

  async function deleteNews(item) {
    if (!credentials) return;
    const confirmed = window.confirm(`Eliminare definitivamente la news “${item.title || ''}”?`);
    if (!confirmed) return;

    try {
      const result = await sendAdminRequest({ action: 'delete', id: item.id });
      renderNews(result.news);
      resetEditor();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Eliminazione non riuscita.');
    }
  }

  function createAdminActions(item) {
    const actions = document.createElement('div');
    actions.className = 'news-row__admin-actions';

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'news-row__admin-button';
    editButton.textContent = 'Modifica';
    editButton.addEventListener('click', (event) => {
      event.stopPropagation();
      startEditing(item);
    });

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'news-row__admin-button news-row__admin-button--danger';
    deleteButton.textContent = 'Elimina';
    deleteButton.addEventListener('click', (event) => {
      event.stopPropagation();
      deleteNews(item);
    });

    actions.append(editButton, deleteButton);
    return actions;
  }

  function renderNews(items) {
    newsItems = Array.isArray(items) ? items : [];
    list.replaceChildren();

    if (newsItems.length === 0) {
      list.appendChild(createEmptyState());
      return;
    }

    newsItems.forEach((item) => {
      const article = document.createElement('article');
      article.className = 'news-row';

      const openButton = document.createElement('button');
      openButton.type = 'button';
      openButton.className = 'news-row__open';
      openButton.setAttribute('aria-label', `Leggi la news: ${item.title || ''}`);

      const time = document.createElement('time');
      time.dateTime = item.date || '';
      time.textContent = formatDate(item.date || '');

      const content = document.createElement('span');
      content.className = 'news-row__content';

      const title = document.createElement('strong');
      title.className = 'news-row__title';
      title.textContent = item.title || '';

      const summary = document.createElement('span');
      summary.className = 'news-row__summary';
      summary.textContent = item.summary || '';

      const arrow = document.createElement('span');
      arrow.className = 'news-row__arrow';
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '→';

      content.append(title, summary);
      openButton.append(time, content, arrow);
      openButton.addEventListener('click', () => openDetail(item));
      article.appendChild(openButton);

      if (credentials) article.appendChild(createAdminActions(item));
      list.appendChild(article);
    });
  }

  async function loadNews() {
    if (isGitHubPages) {
      openAdminButton?.setAttribute('hidden', '');
      list.replaceChildren(createEmptyState(
        'Le news sono disponibili sul sito ufficiale dei Campionati.'
      ));
      return;
    }

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

  function openAdminDialog() {
    if (!adminDialog) return;

    if (credentials) {
      showEditor();
      resetEditor();
    } else {
      showLogin();
      loginForm?.reset();
      if (loginStatus) loginStatus.textContent = '';
    }

    adminDialog.showModal();
  }

  openAdminButton?.addEventListener('click', openAdminDialog);
  closeAdminButton?.addEventListener('click', () => adminDialog?.close());
  closeDetailButton?.addEventListener('click', () => detailDialog?.close());
  cancelEditButton?.addEventListener('click', resetEditor);

  adminDialog?.addEventListener('click', (event) => {
    if (event.target === adminDialog) adminDialog.close();
  });

  detailDialog?.addEventListener('click', (event) => {
    if (event.target === detailDialog) detailDialog.close();
  });

  loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!loginForm.reportValidity()) return;

    const formData = new FormData(loginForm);
    credentials = {
      username: String(formData.get('username') || ''),
      password: String(formData.get('password') || '')
    };

    const loginButton = loginForm.querySelector('button[type="submit"]');
    const originalText = loginButton?.textContent || '';
    if (loginButton) {
      loginButton.disabled = true;
      loginButton.textContent = 'Accesso…';
    }
    if (loginStatus) loginStatus.textContent = 'Verifica delle credenziali.';

    try {
      await sendAdminRequest({ action: 'login' });
      showEditor();
      resetEditor();
      renderNews(newsItems);
      if (loginStatus) loginStatus.textContent = '';
      if (editorStatus) editorStatus.textContent = 'Accesso effettuato. Ora puoi pubblicare, modificare o eliminare le news.';
      window.setTimeout(() => editorForm?.querySelector('input[name="title"]')?.focus(), 50);
    } catch (error) {
      credentials = null;
      if (loginStatus) loginStatus.textContent = error instanceof Error ? error.message : 'Accesso non riuscito.';
    } finally {
      if (loginButton) {
        loginButton.disabled = false;
        loginButton.textContent = originalText;
      }
    }
  });

  editorForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!editorForm.reportValidity()) return;

    const formData = new FormData(editorForm);
    const id = String(formData.get('id') || '').trim();
    const payload = {
      action: id ? 'update' : 'create',
      id,
      title: String(formData.get('title') || '').trim(),
      date: String(formData.get('date') || '').trim(),
      summary: String(formData.get('summary') || '').trim(),
      body: String(formData.get('body') || '').trim()
    };

    const idleText = id ? 'Salva modifiche' : 'Pubblica news';
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = id ? 'Salvataggio…' : 'Pubblicazione…';
    }
    if (editorStatus) editorStatus.textContent = id ? 'Salvataggio delle modifiche.' : 'Pubblicazione della news in corso.';

    let completed = false;
    try {
      const result = await sendAdminRequest(payload);
      renderNews(result.news);
      resetEditor();
      completed = true;
      if (editorStatus) editorStatus.textContent = id ? 'News modificata correttamente.' : 'News pubblicata correttamente.';
    } catch (error) {
      if (editorStatus) editorStatus.textContent = error instanceof Error ? error.message : 'Operazione non riuscita.';
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        if (!completed) submitButton.textContent = idleText;
      }
    }
  });

  loadNews();
})();
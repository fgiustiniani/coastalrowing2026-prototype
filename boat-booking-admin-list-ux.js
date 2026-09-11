(() => {
  const container = document.querySelector('[data-admin-bookings]');
  if (!container) return;

  const status = document.querySelector('[data-admin-status]');
  let pendingResendArticle = null;
  let pendingDeleteArticle = null;
  let pendingDeleteButton = null;

  const style = document.createElement('style');
  style.textContent = `
    .admin-booking h3 {
      font-size: clamp(1.3rem, 2vw, 1.55rem);
      line-height: 1.2;
      margin-top: 7px;
      margin-bottom: 7px;
    }

    .admin-booking__code-link {
      appearance: none;
      border: 0;
      background: transparent;
      padding: 0;
      margin: 0;
      color: #0b6478;
      font: inherit;
      font-weight: 800;
      text-decoration: underline;
      text-decoration-thickness: 1px;
      text-underline-offset: 3px;
      cursor: pointer;
    }

    .admin-booking__code-link:hover,
    .admin-booking__code-link:focus-visible {
      color: #074b5b;
    }

    .admin-booking__code-link:focus-visible {
      outline: 2px solid currentColor;
      outline-offset: 4px;
      border-radius: 3px;
    }

    .admin-booking__actions {
      align-items: flex-start;
      justify-content: flex-end;
    }

    .admin-booking__delete-icon {
      appearance: none;
      width: 42px;
      height: 42px;
      display: inline-grid;
      place-items: center;
      border: 0;
      border-radius: 50%;
      background: transparent;
      color: #b42318;
      cursor: pointer;
      padding: 8px;
    }

    .admin-booking__delete-icon:hover,
    .admin-booking__delete-icon:focus-visible {
      background: #fff0ee;
      color: #8f1d14;
    }

    .admin-booking__delete-icon:focus-visible {
      outline: 2px solid currentColor;
      outline-offset: 2px;
    }

    .admin-booking__delete-icon svg {
      width: 21px;
      height: 21px;
      display: block;
    }

    .admin-booking.is-deleting {
      opacity: .62;
      transition: opacity 160ms ease;
    }

    .admin-booking__delete-icon.is-busy {
      cursor: wait;
    }

    .admin-booking__delete-icon.is-busy svg {
      display: none;
    }

    .admin-booking__delete-icon.is-busy::after {
      content: "";
      width: 19px;
      height: 19px;
      border: 2px solid rgba(180, 35, 24, .24);
      border-top-color: currentColor;
      border-radius: 50%;
      animation: admin-delete-spin .7s linear infinite;
    }

    .admin-delete-feedback {
      align-self: center;
      color: #7b3a33;
      font-size: .82rem;
      font-weight: 700;
      white-space: nowrap;
    }

    .admin-delete-feedback.is-error {
      color: #b42318;
      white-space: normal;
    }

    @keyframes admin-delete-spin {
      to { transform: rotate(360deg); }
    }

    .admin-email-label {
      display: inline-flex;
      align-items: baseline;
      gap: 8px;
      flex-wrap: wrap;
    }

    .admin-email-resend {
      appearance: none;
      border: 0;
      background: transparent;
      padding: 0;
      color: #0b6478;
      font: inherit;
      font-size: .82rem;
      font-weight: 700;
      text-decoration: underline;
      text-underline-offset: 2px;
      cursor: pointer;
    }

    .admin-email-resend:hover,
    .admin-email-resend:focus-visible {
      color: #074b5b;
    }

    .admin-email-resend:disabled {
      opacity: .55;
      cursor: wait;
    }

    .admin-email-feedback {
      display: block;
      margin-top: 5px;
      font-size: .82rem;
      line-height: 1.3;
      font-weight: 700;
    }

    .admin-email-feedback.is-pending { color: #64757b; }
    .admin-email-feedback.is-ok { color: #245d38; }
    .admin-email-feedback.is-error { color: #b42318; }

    .admin-section-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      flex-wrap: wrap;
    }

    .admin-original-slot-note {
      display: block;
      margin-top: 7px;
      color: #0b6478;
      font-size: .88rem;
      font-weight: 800;
    }

    @media (max-width: 640px) {
      .admin-booking__actions {
        width: auto !important;
        display: flex !important;
        grid-template-columns: none !important;
      }

      .admin-section-actions {
        width: 100%;
        justify-content: stretch;
      }

      .admin-section-actions .admin-button {
        flex: 1 1 150px;
      }
    }
  `;
  document.head.appendChild(style);

  const trashSvg = `
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 10v6M14 10v6" />
    </svg>`;

  function patchAdminSections() {
    const secondary = document.querySelector('.admin-secondary-sections');
    if (secondary) {
      const sections = Array.from(secondary.querySelectorAll(':scope > details'));
      const slotSection = sections.find((details) => details.querySelector(':scope > summary')?.textContent.trim() === 'Slot orari');
      const settingsSection = sections.find((details) => details.querySelector(':scope > summary')?.textContent.trim() === 'Impostazioni prenotazioni');
      const boatsSection = sections.find((details) => details.querySelector(':scope > summary')?.textContent.trim() === 'Anagrafica barche');

      if (slotSection) slotSection.hidden = true;
      if (settingsSection && boatsSection && settingsSection.nextElementSibling !== boatsSection) {
        secondary.insertBefore(settingsSection, boatsSection);
      }
    }

    const heading = document.querySelector('.admin-bookings-card .admin-section-heading');
    const refresh = document.querySelector('[data-admin-refresh]');
    const exportButton = heading?.querySelector('[data-export-bookings-pdf]');
    if (heading && refresh && exportButton && !heading.querySelector('[data-admin-section-actions]')) {
      const actions = document.createElement('div');
      actions.className = 'admin-section-actions';
      actions.dataset.adminSectionActions = '';
      heading.appendChild(actions);
      actions.append(refresh, exportButton);
    }
  }

  function feedbackFor(article) {
    return article?.querySelector('.admin-email-feedback') || null;
  }

  function setEmailFeedback(article, message, kind = '') {
    const feedback = feedbackFor(article);
    if (!feedback) return;
    feedback.textContent = message;
    feedback.className = `admin-email-feedback${kind ? ` is-${kind}` : ''}`;
  }

  function deleteFeedbackFor(article) {
    let feedback = article?.querySelector('.admin-delete-feedback') || null;
    if (!feedback && article) {
      feedback = document.createElement('span');
      feedback.className = 'admin-delete-feedback';
      feedback.setAttribute('aria-live', 'polite');
      article.querySelector('.admin-booking__actions')?.prepend(feedback);
    }
    return feedback;
  }

  function setDeleteFeedback(article, message, kind = '') {
    const feedback = deleteFeedbackFor(article);
    if (!feedback) return;
    feedback.textContent = message;
    feedback.className = `admin-delete-feedback${kind ? ` is-${kind}` : ''}`;
  }

  function clearDeletePending({ keepFeedback = false } = {}) {
    pendingDeleteArticle?.classList.remove('is-deleting');
    pendingDeleteButton?.classList.remove('is-busy');
    pendingDeleteButton?.removeAttribute('aria-busy');
    if (!keepFeedback) pendingDeleteArticle?.querySelector('.admin-delete-feedback')?.remove();
    pendingDeleteArticle = null;
    pendingDeleteButton = null;
  }

  function setOriginalSlotNote(article) {
    const dialog = document.querySelector('[data-edit-dialog]');
    const slotSelect = dialog?.querySelector('[data-edit-form] [name="slotCode"]');
    if (!dialog || !slotSelect || !dialog.open) return;

    const slotParagraph = Array.from(article.querySelectorAll('.admin-booking__details > p')).find((paragraph) =>
      paragraph.querySelector('strong')?.textContent.trim().toLowerCase() === 'slot'
    );
    const originalSlot = slotParagraph
      ? slotParagraph.textContent.replace(/^\s*Slot\s*/i, '').trim()
      : article.querySelector('.admin-booking__meta')?.textContent.split('·')[0]?.trim() || '';

    const field = slotSelect.closest('.booking-field');
    if (!field || !originalSlot) return;

    let note = field.querySelector('[data-admin-original-slot]');
    if (!note) {
      note = document.createElement('span');
      note.className = 'admin-original-slot-note';
      note.dataset.adminOriginalSlot = '';
      field.appendChild(note);
    }
    note.textContent = `Slot originario: ${originalSlot}`;
  }

  function patchBooking(article) {
    if (!article || article.dataset.compactActions === 'true') return;

    const code = article.querySelector('.admin-booking__code');
    if (code && !code.matches('button')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `${code.className} admin-booking__code-link`;
      button.dataset.action = 'edit';
      button.setAttribute('aria-label', `Modifica prenotazione ${code.textContent.trim()}`);
      button.title = 'Apri modifica prenotazione';
      button.textContent = code.textContent;
      code.replaceWith(button);
    } else if (code) {
      code.classList.add('admin-booking__code-link');
      code.dataset.action = 'edit';
    }

    article.querySelectorAll('.admin-booking__actions [data-action="edit"], .admin-booking__actions [data-action="resend"]').forEach((button) => button.remove());

    const deleteButton = article.querySelector('.admin-booking__actions [data-action="delete"]');
    if (deleteButton) {
      deleteButton.className = 'admin-booking__delete-icon';
      deleteButton.innerHTML = trashSvg;
      deleteButton.setAttribute('aria-label', 'Elimina prenotazione');
      deleteButton.title = 'Elimina prenotazione';
    }

    const emailParagraph = Array.from(article.querySelectorAll('.admin-booking__details > p')).find((paragraph) =>
      paragraph.querySelector('strong')?.textContent.trim().toLowerCase() === 'email'
    );

    if (emailParagraph && !emailParagraph.querySelector('[data-action="resend"]')) {
      const label = emailParagraph.querySelector('strong');
      const wrapper = document.createElement('span');
      wrapper.className = 'admin-email-label';
      label.replaceWith(wrapper);
      wrapper.appendChild(label);

      const resend = document.createElement('button');
      resend.type = 'button';
      resend.className = 'admin-email-resend';
      resend.dataset.action = 'resend';
      resend.textContent = 'Reinvia email';
      resend.setAttribute('aria-label', 'Reinvia email di riepilogo');
      wrapper.appendChild(resend);

      const feedback = document.createElement('span');
      feedback.className = 'admin-email-feedback';
      feedback.setAttribute('aria-live', 'polite');
      emailParagraph.appendChild(feedback);

      resend.addEventListener('click', () => {
        pendingResendArticle = article;
        setEmailFeedback(article, 'Invio in corso…', 'pending');
      });
    }

    article.dataset.compactActions = 'true';
  }

  function patchAll() {
    patchAdminSections();
    container.querySelectorAll('.admin-booking').forEach(patchBooking);
  }

  const observer = new MutationObserver(() => patchAll());
  observer.observe(container, { childList: true, subtree: true });

  container.addEventListener('click', (event) => {
    const actionButton = event.target.closest('[data-action]');
    if (!actionButton) return;
    const article = actionButton.closest('.admin-booking');
    if (!article) return;

    if (actionButton.dataset.action === 'edit') {
      queueMicrotask(() => setOriginalSlotNote(article));
      return;
    }

    if (actionButton.dataset.action === 'delete') {
      queueMicrotask(() => {
        if (!actionButton.disabled || !article.isConnected) return;
        pendingDeleteArticle = article;
        pendingDeleteButton = actionButton;
        article.classList.add('is-deleting');
        actionButton.classList.add('is-busy');
        actionButton.setAttribute('aria-busy', 'true');
        setDeleteFeedback(article, 'Eliminazione in corso…');
      });
    }
  });

  if (status) {
    const statusObserver = new MutationObserver(() => {
      if (pendingResendArticle && !document.body.contains(pendingResendArticle)) {
        pendingResendArticle = null;
      }

      if (pendingDeleteArticle && !document.body.contains(pendingDeleteArticle)) {
        clearDeletePending();
      }

      const message = status.textContent.trim();
      if (!message) return;

      if (pendingResendArticle) {
        if (status.classList.contains('is-ok')) {
          setEmailFeedback(pendingResendArticle, 'Email reinviata correttamente.', 'ok');
          pendingResendArticle = null;
        } else if (status.classList.contains('is-error')) {
          setEmailFeedback(pendingResendArticle, `Invio non riuscito: ${message}`, 'error');
          pendingResendArticle = null;
        }
      }

      if (pendingDeleteArticle && status.classList.contains('is-error')) {
        pendingDeleteArticle.classList.remove('is-deleting');
        pendingDeleteButton?.classList.remove('is-busy');
        pendingDeleteButton?.removeAttribute('aria-busy');
        setDeleteFeedback(pendingDeleteArticle, `Eliminazione non riuscita: ${message}`, 'error');
        pendingDeleteArticle = null;
        pendingDeleteButton = null;
      }
    });
    statusObserver.observe(status, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  }

  patchAll();
})();

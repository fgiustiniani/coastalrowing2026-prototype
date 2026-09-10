(() => {
  const container = document.querySelector('[data-admin-bookings]');
  if (!container) return;

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

    @media (max-width: 640px) {
      .admin-booking__actions {
        width: auto !important;
        display: flex !important;
        grid-template-columns: none !important;
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
    }

    article.dataset.compactActions = 'true';
  }

  function patchAll() {
    container.querySelectorAll('.admin-booking').forEach(patchBooking);
  }

  const observer = new MutationObserver(() => patchAll());
  observer.observe(container, { childList: true, subtree: true });
  patchAll();
})();

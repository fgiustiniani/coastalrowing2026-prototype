(() => {
  function createEventLogo(extraClass = '') {
    const logo = document.createElement('img');
    logo.className = `section-event-logo ${extraClass}`.trim();
    logo.src = 'assets/logos/SCP-Campionati2026-logo-orizzontale.svg';
    logo.alt = 'Campionati Italiani Coastal Rowing 2026 - Pesaro';
    return logo;
  }

  function brandSectionHeading(selector, extraClass = '') {
    const heading = document.querySelector(selector);
    if (!heading || heading.querySelector('.section-event-logo')) return;

    const copy = document.createElement('div');
    copy.className = 'section-heading__copy';
    while (heading.firstChild) copy.appendChild(heading.firstChild);

    heading.classList.add('section-heading--branded');
    heading.append(copy, createEventLogo(extraClass));
  }

  function makeLogoCardClickable(container, url, label) {
    if (!container || container.tagName === 'A') return;

    const link = document.createElement('a');
    link.className = container.className;
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', label);

    while (container.firstChild) link.appendChild(container.firstChild);
    container.replaceWith(link);
  }

  function enhanceHomeBranding() {
    brandSectionHeading('.paths > .section-heading');
    brandSectionHeading('.partners > .section-heading');

    const updatesContent = document.querySelector('.updates__content');
    if (updatesContent && !updatesContent.querySelector('.section-event-logo')) {
      const copy = document.createElement('div');
      copy.className = 'updates__content-copy';
      while (updatesContent.firstChild) copy.appendChild(updatesContent.firstChild);
      updatesContent.classList.add('updates__content--branded');
      updatesContent.append(copy, createEventLogo('section-event-logo--dark'));
    }

    const partnershipBand = document.querySelector('.partnership-band');
    const partnershipButton = partnershipBand?.querySelector(':scope > .button');
    if (partnershipBand && partnershipButton && !partnershipBand.querySelector(':scope > .section-event-logo')) {
      partnershipBand.insertBefore(createEventLogo('section-event-logo--band'), partnershipButton);
    }

    const dialogHeading = document.querySelector('.contact-dialog__heading');
    if (dialogHeading && !dialogHeading.querySelector('.contact-dialog__logo')) {
      const logo = document.createElement('img');
      logo.className = 'contact-dialog__logo';
      logo.src = 'assets/logos/SCP-Campionati2026-logo-orizzontale.svg';
      logo.alt = 'Campionati Italiani Coastal Rowing 2026 - Pesaro';
      dialogHeading.prepend(logo);
    }

    const ficSection = document.querySelector('.partner-section--fic');
    const ficHeading = ficSection?.querySelector('.partner-section__heading');
    const ficTitle = ficHeading?.querySelector('h3');
    const ficCard = ficSection?.querySelector('.partner-logo--fic-main');
    const ficImage = ficCard?.querySelector('img');

    if (ficHeading && ficTitle && ficImage && !ficHeading.querySelector('.fic-title-logo')) {
      const titleRow = document.createElement('div');
      titleRow.className = 'partner-section__title-row';
      ficTitle.replaceWith(titleRow);
      titleRow.appendChild(ficTitle);

      const ficLink = document.createElement('a');
      ficLink.className = 'fic-title-logo';
      ficLink.href = 'https://www.canottaggio.org/';
      ficLink.target = '_blank';
      ficLink.rel = 'noopener noreferrer';
      ficLink.setAttribute('aria-label', 'Federazione Italiana Canottaggio');
      ficLink.appendChild(ficImage.cloneNode(true));
      titleRow.appendChild(ficLink);
      ficCard.remove();
    }

    const ficLinks = {
      Concept2: 'https://www.concept2.it/',
      Filippi: 'https://www.filippiboats.com/',
      ProAction: 'https://www.proaction.it/',
      S74: 'https://www.seventyfour.eu/6-federazione-italiana-canottaggio',
      Suzuki: 'https://marine.suzuki.it/'
    };

    ficSection?.querySelectorAll('.partner-logo').forEach((card) => {
      const image = card.querySelector('img');
      const url = image ? ficLinks[image.alt] : null;
      if (url) makeLogoCardClickable(card, url, image.alt);
    });

    const eventSections = document.querySelectorAll('.partner-section');
    const eventPartnerSection = eventSections[1];
    const eventSponsorSection = eventSections[2];

    const eventPartnerTitle = eventPartnerSection?.querySelector('.partner-section__heading h3');
    if (eventPartnerTitle) eventPartnerTitle.textContent = 'Partner e patrocini';

    const marcheCard = eventPartnerSection?.querySelector('.partner-logo');
    makeLogoCardClickable(marcheCard, 'https://www.regione.marche.it/', 'Regione Marche');

    eventSponsorSection?.querySelectorAll('.partner-logo').forEach((card) => {
      const image = card.querySelector('img');
      makeLogoCardClickable(card, 'https://bagnitino.it/', image?.alt || 'Bagni Tino');
    });
  }

  enhanceHomeBranding();

  const endpoint = '/api/contact';
  let recipientEmail = String(
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

  function updateRecipientEmail(email) {
    const nextEmail = String(email || '').trim();
    if (!nextEmail) return;

    recipientEmail = nextEmail;
    document.querySelectorAll('[data-contact-email-text]').forEach((element) => {
      element.textContent = recipientEmail;
    });
  }

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
    const response = await fetch(`https://formsubmit.co/ajax/${recipientEmail}`, {
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

  updateRecipientEmail(recipientEmail);

  if (!isGitHubPages) {
    fetch(endpoint, { headers: { accept: 'application/json' } })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => updateRecipientEmail(data?.contactEmail))
      .catch(() => {
        // Resta attivo l'indirizzo configurato nell'attributo data-contact-email.
      });
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
        status.textContent = `Messaggio inviato. Una copia è stata indirizzata a ${payload.email}. Al primo test potrebbe essere necessario confermare l’attivazione ricevuta da ${recipientEmail}.`;
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
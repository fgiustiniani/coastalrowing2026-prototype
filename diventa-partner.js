(() => {
  const form = document.getElementById('partnership-form');
  const status = document.getElementById('partnership-form-status');

  if (!form || !status) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!form.reportValidity()) return;

    const data = new FormData(form);
    const azienda = String(data.get('azienda') || '').trim();
    const nome = String(data.get('nome') || '').trim();
    const email = String(data.get('email') || '').trim();
    const telefono = String(data.get('telefono') || '').trim();
    const interesse = String(data.get('interesse') || '').trim();
    const messaggio = String(data.get('messaggio') || '').trim();

    const subject = `Richiesta partnership - ${azienda}`;
    const body = [
      'Richiesta di informazioni sulle opportunità di partnership',
      '',
      `Azienda: ${azienda}`,
      `Nome e cognome: ${nome}`,
      `Email: ${email}`,
      `Telefono: ${telefono || 'Non indicato'}`,
      `Interesse: ${interesse}`,
      '',
      'Messaggio:',
      messaggio || 'Nessun messaggio aggiuntivo.'
    ].join('\n');

    status.textContent = 'Si aprirà il programma di posta con la richiesta già compilata.';
    window.location.href = `mailto:info@canottieripesaro.it?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
})();

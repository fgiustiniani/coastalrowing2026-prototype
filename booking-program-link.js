(() => {
  const pathname = window.location.pathname.toLowerCase();
  if (!pathname.endsWith('/info-gare.html') && !pathname.endsWith('/info-gare') && pathname !== '/info-gare.html') return;

  const details = document.querySelector('.event-program--activities > li:first-child .event-program__details');
  if (!details || details.querySelector('[data-boat-booking-program]')) return;

  const item = document.createElement('li');
  item.dataset.boatBookingProgram = 'true';
  item.innerHTML = '<strong>ore 14.00 – 18.00:</strong> barche a disposizione per le prove su prenotazione. <a href="prenotazione-barche.html"><strong>Prenota le barche per le prove →</strong></a>';
  details.insertBefore(item, details.firstChild);
})();

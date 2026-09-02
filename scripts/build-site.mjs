import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('../', import.meta.url));
const distDir = join(rootDir, 'dist');
const partialsDir = join(rootDir, 'src', 'partials');

const headerTemplate = await readFile(join(partialsDir, 'header.html'), 'utf8');
const footerTemplate = await readFile(join(partialsDir, 'footer.html'), 'utf8');

const pageKeys = new Map([
  ['index.html', 'home'],
  ['info-gare.html', 'info-gare'],
  ['vivi-pesaro.html', 'vivi-pesaro'],
  ['sostenibilita.html', 'sostenibilita'],
  ['proteggere-il-mare.html', 'sostenibilita'],
  ['accogliere-tutti.html', 'sostenibilita'],
  ['nutrire-il-futuro.html', 'sostenibilita'],
  ['diventa-partner.html', 'partner'],
  ['faq.html', 'faq'],
  ['contatti.html', 'contatti']
]);

const pageModels = new Map([
  ['index.html', 'home'],
  ['info-gare.html', 'operational'],
  ['faq.html', 'operational'],
  ['contatti.html', 'operational'],
  ['privacy-policy.html', 'operational'],
  ['vivi-pesaro.html', 'editorial'],
  ['sostenibilita.html', 'editorial'],
  ['proteggere-il-mare.html', 'editorial'],
  ['accogliere-tutti.html', 'editorial'],
  ['nutrire-il-futuro.html', 'editorial'],
  ['diventa-partner.html', 'editorial']
]);

const sharedStylesheets = ['page-system.css', 'visual-cleanup.css', 'mobile-polish.css', 'interaction-fixes.css'];

const excludedEntries = new Set([
  '.git',
  '.github',
  '.vscode',
  'dist',
  'node_modules',
  'src',
  'scripts',
  'netlify',
  'package.json',
  'package-lock.json',
  'netlify.toml',
  'README.md',
  'EMAIL_SETUP.md'
]);

const headerPattern = /<header\b(?=[^>]*\bclass=(["'])[^"']*\bsite-header\b[^"']*\1)[^>]*>[\s\S]*?<\/header>/i;
const footerPattern = /<footer\b(?=[^>]*\bclass=(["'])[^"']*\bsite-footer\b[^"']*\1)[^>]*>[\s\S]*?<\/footer>/i;
const bodyPattern = /<body([^>]*)>/i;

function renderHeader(fileName) {
  const currentPage = pageKeys.get(fileName) || '';

  return headerTemplate.replace(/\{\{CURRENT:([^}]+)\}\}/g, (_, pageKey) =>
    pageKey === currentPage ? ' aria-current="page"' : ''
  );
}

function addPageModel(fileName, source) {
  const model = pageModels.get(fileName);
  if (!model) return source;

  const modelClasses = `page-model page-model--${model}`;

  return source.replace(bodyPattern, (_, attributes = '') => {
    const classPattern = /\bclass=(["'])(.*?)\1/i;

    if (classPattern.test(attributes)) {
      const updatedAttributes = attributes.replace(classPattern, (_classMatch, quote, classes) => {
        const classList = new Set(String(classes).split(/\s+/).filter(Boolean));
        modelClasses.split(' ').forEach((className) => classList.add(className));
        return `class=${quote}${Array.from(classList).join(' ')}${quote}`;
      });
      return `<body${updatedAttributes}>`;
    }

    return `<body${attributes} class="${modelClasses}">`;
  });
}

function addSharedStyles(source) {
  return sharedStylesheets.reduce((output, stylesheet) => {
    if (output.includes(`href="${stylesheet}"`)) return output;
    return output.replace(/<\/head>/i, `  <link rel="stylesheet" href="${stylesheet}">\n</head>`);
  }, source);
}

function addPageAssets(fileName, source) {
  if (fileName !== 'faq.html') return source;

  let output = source;
  if (!output.includes('href="faq-accordion.css"')) {
    output = output.replace(/<\/head>/i, '  <link rel="stylesheet" href="faq-accordion.css">\n</head>');
  }
  if (!output.includes('src="faq-content.js"')) {
    output = output.replace(/<\/body>/i, '  <script src="faq-content.js" defer></script>\n</body>');
  }
  return output;
}

function applyHomeContentFixes(fileName, source) {
  if (fileName !== 'index.html') return source;

  const regionLogo = '<a class="partner-logo" href="https://www.regione.marche.it/" target="_blank" rel="noopener noreferrer"><img src="assets/logos/logo-regione-marche.svg" alt="Regione Marche"></a>';
  const volontarxLogo = '<a class="partner-logo" href="https://www.comune.pesaro.pu.it/cultura/volontarx/" target="_blank" rel="noopener noreferrer"><img src="assets/logos/VolontarX.svg" alt="VolontarX"></a>';
  const oldSponsorSection = `          <article class="partner-section">
            <div class="partner-section__heading"><h3>Sponsor Evento</h3></div>
            <div class="partner-logos">
              <a class="partner-logo" href="https://bagnitino.it/" target="_blank" rel="noopener noreferrer"><img src="assets/logos/Ristorantino.svg" alt="Ristorantino"></a>
              <a class="partner-logo" href="https://bagnitino.it/" target="_blank" rel="noopener noreferrer"><img src="assets/logos/LOGO-BAGNI-TINO.jpeg" alt="Bagni Tino"></a>
              <div class="logo-placeholder">Sezione in aggiornamento</div>
            </div>
          </article>`;
  const sponsorAndTechnicalPartners = `          <article class="partner-section" hidden aria-hidden="true">
            <div class="partner-section__heading"><h3>Sponsor</h3></div>
            <div class="partner-logos"></div>
          </article>

          <article class="partner-section">
            <div class="partner-section__heading"><h3>Partner tecnici</h3></div>
            <div class="partner-logos">
              <a class="partner-logo" href="https://bagnitino.it/" target="_blank" rel="noopener noreferrer"><img src="assets/logos/partners/Ristorantino.svg" alt="Ristorantino"></a>
              <a class="partner-logo" href="https://bagnitino.it/" target="_blank" rel="noopener noreferrer"><img src="assets/logos/partners/LOGO-BAGNI-TINO.jpeg" alt="Bagni Tino"></a>
              <div class="partner-logo"><img src="assets/logos/partners/Music store.svg" alt="Music Store"></div>
            </div>
          </article>`;

  let output = source;
  if (!output.includes('assets/logos/VolontarX.svg')) {
    output = output.replace(regionLogo, `${regionLogo}\n              ${volontarxLogo}`);
  }

  return output
    .replace('<div class="partner-section__heading"><h3>Partner e patrocini</h3></div>', '<div class="partner-section__heading"><h3>Partner istituzionali e Patrocini</h3></div>')
    .replace(oldSponsorSection, sponsorAndTechnicalPartners);
}

function applyPageContentFixes(fileName, source) {
  if (fileName !== 'info-gare.html') return source;

  const helpBand = `      <section class="help-band help-band--contacts" aria-labelledby="help-title">
        <img class="section-event-logo section-event-logo--dark help-band__event-logo help-band__event-logo--top" src="assets/logos/SCP-Campionati2026-logo-orizzontale.svg" alt="Campionati Italiani Coastal Rowing 2026 - Pesaro">
        <div class="help-band__brand">
          <p class="eyebrow">Serve aiuto?</p>
          <h2 id="help-title">Hai bisogno di informazioni<br>organizzative?</h2>
          <div class="help-band__info-row">
            <div class="help-band__info-copy">
              <p>Il nostro staff è a disposizione per le informazioni locali relative alla partecipazione all’evento.</p>
            </div>
            <a class="help-band__logo-link" href="https://www.canottieripesaro.it" target="_blank" rel="noopener noreferrer" aria-label="Visita il sito della Società Canottieri Pesaro">
              <img src="assets/logos/canottieri-pesaro-logo_DEPOSITATO.png" alt="Società Canottieri Pesaro">
            </a>
          </div>
        </div>
        <div class="help-band__actions help-band__actions--contacts">
          <a class="button button--primary icon-button" href="contatti.html"><span class="inline-icon" aria-hidden="true"><img src="assets/logos/whatsapp-logo.svg" alt=""></span>Scrivici su WhatsApp</a>
          <a class="button button--secondary-light icon-button" href="mailto:info@canottieripesaro.it"><span class="inline-icon" aria-hidden="true"><img src="assets/logos/mail-logo.svg" alt=""></span>Mandaci una mail</a>
          <div class="wa-group-promo wa-group-promo--help-actions">
            <div class="wa-group-promo__copy">
              <a href="https://chat.whatsapp.com/FHTtZCB8LHTAaDnprjLY78?s=sh&p=i&ilr=0&amv=1" target="_blank" rel="noopener noreferrer"><span class="inline-icon" aria-hidden="true"><img src="assets/logos/whatsapp-logo.svg" alt=""></span>Iscriviti al gruppo WhatsApp</a>
              <span class="wa-group-promo__note">per ricevere info<br>in tempo reale</span>
            </div>
            <a class="wa-group-promo__qr-link" href="https://chat.whatsapp.com/FHTtZCB8LHTAaDnprjLY78?s=sh&p=i&ilr=0&amv=1" target="_blank" rel="noopener noreferrer" aria-label="Iscriviti al gruppo WhatsApp dei Campionati">
              <img class="wa-group-promo__qr" src="assets/images/gruppo-wa.png" alt="QR code per iscriversi al gruppo WhatsApp dei Campionati">
            </a>
          </div>
        </div>
      </section>`;

  const mapLink = (href) => `<a class="event-program__map-link" href="${href}" target="_blank" rel="noopener noreferrer"><img src="assets/logos/mappa.svg" alt=""><span>Apri su Google Maps</span></a>`;

  const activityProgram = `            <ul class="event-program event-program--activities">
              <li>
                <strong>Venerdì 02/10/2026</strong>
                <ul class="event-program__details">
                  <li><strong>ore 15.00 – 17.00:</strong> accredito equipaggi presso Segreteria Gare ${mapLink('https://maps.app.goo.gl/quXGvciRXoJ5uhHT8')}</li>
                  <li><strong>ore 17.30:</strong> meeting Capitani presso la sede della Canottieri Pesaro in Calata Caio Duilio 101 ${mapLink('https://maps.app.goo.gl/LcJoWwYg3U4TrYb8A')}</li>
                </ul>
              </li>
              <li>
                <strong>Sabato 03/10/2026</strong>
                <ul class="event-program__details">
                  <li><strong>dalle 8.00:</strong> eventuali fasi eliminatorie su percorso da circa mt. 3000</li>
                  <li><strong>a seguire:</strong> finali MASTER su percorso da circa mt 3000 e, finali PR3 II su percorso da circa mt 1.700, finali UNDER 19, UNDER 23 su percorso da circa mt. 6000</li>
                  <li><strong>ore 17.30:</strong> premiazioni</li>
                </ul>
              </li>
              <li>
                <strong>Domenica 04/10/2026</strong>
                <ul class="event-program__details">
                  <li><strong>dalle 8.00:</strong> prosieguo delle finali MASTER, finali SENIOR ed eventuali recuperi delle gare del giorno precedente</li>
                  <li><strong>a seguire:</strong> premiazioni (tra le 13.00 e le 16.00 in funzione della necessità di eventuali recuperi)</li>
                </ul>
              </li>
            </ul>`;

  return source
    .replace('assets/logos/APA-Hotels.jpg', 'assets/logos/apa-logo.svg')
    .replace('Invia la scheda entro il 5 agosto 2026', 'Invia la scheda entro il 5 settembre 2026')
    .replace('<span class="quick-links__label">Programma e documenti</span>', '<span class="quick-links__label">Programma</span>')
    .replace('<span class="quick-links__label">Campo gara</span>', '<span class="quick-links__label">Campo gare</span>')
    .replace('<span class="quick-links__label">Logistica e parco barche</span>', '<span class="quick-links__label">Logistica a terra</span>')
    .replace('<h2 id="programma-title">Programma e documenti ufficiali</h2>', '<h2 id="programma-title">Programma delle attività</h2>')
    .replace(/            <ul class="event-program">[\s\S]*?            <\/ul>/, activityProgram)
    .replaceAll('assets/maps/mappa-campo-gara.svg', 'assets/maps/mappa-campo-gara.svg?v=2')
    .replaceAll('assets/maps/mappa-logistica-evento.svg?v=2', 'assets/maps/mappa-logistica-evento.svg?v=3')
    .replace('            <span>Schema indicativo · configurazione in fase di definizione</span>\n            <a class="race-map__logistics-link" href="#logistica">', '            <a class="race-map__logistics-link" href="#logistica">')
    .replace('          <div class="race-map__actions">\n            <a class="race-map__logistics-link" href="#logistica">', '          <div class="race-map__actions race-map__actions--end">\n            <a class="race-map__logistics-link" href="#logistica">')
    .replace('            <span>Schema indicativo · disposizione delle aree soggetta a variazioni</span>\n            <a class="race-map__logistics-link" href="assets/maps/mappa-logistica-evento.svg?v=3"', '            <a class="race-map__logistics-link" href="assets/maps/mappa-logistica-evento.svg?v=3"')
    .replace('          <div class="race-map__actions">\n            <a class="race-map__logistics-link" href="assets/maps/mappa-logistica-evento.svg?v=3"', '          <div class="race-map__actions race-map__actions--end">\n            <a class="race-map__logistics-link" href="assets/maps/mappa-logistica-evento.svg?v=3"')
    .replace(/      <section class="help-band help-band--contacts"[\s\S]*?      <\/section>/, helpBand);
}

function buildPage(fileName, source) {
  if (!headerPattern.test(source)) {
    throw new Error(`Header non trovato in ${fileName}`);
  }
  if (!footerPattern.test(source)) {
    throw new Error(`Footer non trovato in ${fileName}`);
  }
  if (!bodyPattern.test(source)) {
    throw new Error(`Elemento body non trovato in ${fileName}`);
  }

  let output = source
    .replace(headerPattern, renderHeader(fileName))
    .replace(footerPattern, footerTemplate);

  output = addPageModel(fileName, output);
  output = addSharedStyles(output);
  output = addPageAssets(fileName, output);
  output = applyHomeContentFixes(fileName, output);
  output = applyPageContentFixes(fileName, output);
  return output;
}

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });

const rootEntries = await readdir(rootDir, { withFileTypes: true });

for (const entry of rootEntries) {
  if (excludedEntries.has(entry.name) || entry.name.startsWith('.')) continue;
  if (entry.isFile() && extname(entry.name).toLowerCase() === '.html') continue;

  await cp(join(rootDir, entry.name), join(distDir, entry.name), {
    recursive: entry.isDirectory()
  });
}

const htmlFiles = rootEntries
  .filter((entry) => entry.isFile() && extname(entry.name).toLowerCase() === '.html')
  .map((entry) => entry.name)
  .sort();

for (const fileName of htmlFiles) {
  const source = await readFile(join(rootDir, fileName), 'utf8');
  const output = buildPage(fileName, source);
  await writeFile(join(distDir, fileName), output, 'utf8');
}

console.log(`Build completata: ${htmlFiles.length} pagine generate in dist/.`);

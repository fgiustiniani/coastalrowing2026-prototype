# Configurazione invio email dei moduli

Il sito utilizza due modalità di invio:

- su **Netlify** i moduli inviano tramite funzioni server e SMTP;
- su **GitHub Pages** i moduli usano temporaneamente FormSubmit via AJAX, così possono essere testati senza aprire il programma di posta dell'utente.

## Modulo partnership

La pagina `diventa-partner.html` invia i dati alla Netlify Function disponibile su `/api/partnership`.

Variabili Netlify:

- `PARTNERSHIP_RECIPIENT`: destinatario principale delle richieste. Valore iniziale consigliato: `f.giustiniani@canottieripesaro.it`
- `PARTNERSHIP_FROM_EMAIL`: indirizzo mittente; normalmente deve coincidere con `SMTP_USER`
- `PARTNERSHIP_FROM_NAME`: facoltativo. Valore suggerito: `Campionati Italiani Coastal Rowing 2026`

## Modulo contatti della home

Il link email nella sezione **Rimani aggiornato** apre un modulo con nome, cognome, email, oggetto e messaggio. In produzione il modulo invia alla Netlify Function disponibile su `/api/contact`.

Variabili Netlify:

- `CONTACT_RECIPIENT`: destinatario principale. Valore iniziale: `info@canottieripesaro.it`
- `CONTACT_FROM_EMAIL`: facoltativo; se assente viene usato `PARTNERSHIP_FROM_EMAIL` oppure `SMTP_USER`
- `CONTACT_FROM_NAME`: facoltativo; se assente viene usato `PARTNERSHIP_FROM_NAME`

## Variabili SMTP comuni

Aprire **Site configuration → Environment variables** e impostare:

- `SMTP_HOST`: server SMTP della casella usata per l'invio
- `SMTP_PORT`: normalmente `465` oppure `587`
- `SMTP_SECURE`: `true` per SSL/TLS diretto, normalmente con porta `465`; `false` per STARTTLS, normalmente con porta `587`
- `SMTP_USER`: nome utente SMTP, generalmente l'indirizzo email completo
- `SMTP_PASS`: password della casella o password specifica per applicazioni

Le credenziali SMTP non devono essere inserite nei file del repository.

## Comportamento

- ogni richiesta viene inviata al destinatario configurato;
- l'indirizzo inserito dall'utente viene aggiunto in copia (`CC`);
- lo stesso indirizzo viene impostato come `Reply-To`;
- entrambi i moduli includono un campo honeypot contro gli invii automatici.

## Test su GitHub Pages

Su GitHub Pages l'invio passa da FormSubmit senza aprire Outlook, Gmail o altre applicazioni esterne.

Al primo invio verso ciascun destinatario, FormSubmit manda una mail di attivazione alla casella dell'organizzazione. È necessario aprirla e confermare il modulo. Le richieste inviate prima della conferma vengono conservate temporaneamente dal servizio e recapitate dopo l'attivazione.

Destinatari di test attuali:

- partnership: `f.giustiniani@canottieripesaro.it`
- contatti home: `info@canottieripesaro.it`

Quando il sito sarà pubblicato su Netlify, verranno usate automaticamente le funzioni server invece di FormSubmit.
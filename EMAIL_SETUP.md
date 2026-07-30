# Configurazione invio email del modulo partnership

Il modulo `diventa-partner.html` invia i dati alla Netlify Function disponibile su `/api/partnership`.

## Variabili da configurare su Netlify

Aprire **Site configuration → Environment variables** e impostare:

- `PARTNERSHIP_RECIPIENT`: destinatario principale delle richieste. Valore iniziale consigliato: `f.giustiniani@canottieripesaro.it`
- `SMTP_HOST`: server SMTP della casella usata per l'invio
- `SMTP_PORT`: porta SMTP, normalmente `465` oppure `587`
- `SMTP_SECURE`: `true` per connessione SSL/TLS diretta, normalmente con porta `465`; `false` per STARTTLS, normalmente con porta `587`
- `SMTP_USER`: nome utente SMTP, generalmente l'indirizzo email completo
- `SMTP_PASS`: password della casella o password specifica per applicazioni
- `PARTNERSHIP_FROM_EMAIL`: indirizzo mittente; normalmente deve coincidere con `SMTP_USER`
- `PARTNERSHIP_FROM_NAME`: facoltativo. Valore suggerito: `Campionati Italiani Coastal Rowing 2026`

Le credenziali SMTP non devono essere inserite nei file del repository.

## Comportamento

- La richiesta viene inviata a `PARTNERSHIP_RECIPIENT`.
- L'indirizzo inserito dall'utente nel form viene aggiunto in copia (`CC`).
- Lo stesso indirizzo viene impostato come `Reply-To`.
- Il destinatario visualizzato nella pagina viene letto dalla stessa funzione, quindi cambia automaticamente quando viene modificata `PARTNERSHIP_RECIPIENT`.
- È presente un campo honeypot per bloccare una parte degli invii automatici.

## Test

Dopo aver configurato le variabili, eseguire un nuovo deploy Netlify e inviare una richiesta di prova dalla pagina `diventa-partner.html`.

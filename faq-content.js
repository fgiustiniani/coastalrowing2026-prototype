(() => {
  const placeholder = document.querySelector('.faq-placeholder');
  if (!placeholder) return;

  const groups = [
    {
      title: 'Gare e documenti ufficiali',
      items: [
        {
          q: 'Dove trovo il bando di regata e il programma ufficiale?',
          a: 'Il bando di regata, il programma ufficiale, le iscrizioni e i risultati saranno pubblicati sul sito della Federazione Italiana Canottaggio, nella sezione <a href="https://www.canottaggio.org/attivita-remiera/bandi-di-regata/" target="_blank" rel="noopener noreferrer">Bandi di regata</a>.'
        },
        {
          q: 'Dove saranno pubblicati gli orari delle gare?',
          a: 'Gli orari definitivi saranno indicati nel programma gare ufficiale pubblicato sul sito della Federazione Italiana Canottaggio, nella sezione <a href="https://www.canottaggio.org/attivita-remiera/bandi-di-regata/" target="_blank" rel="noopener noreferrer">Bandi di regata</a>.'
        },
        {
          q: 'È prevista una riunione dei capitani?',
          a: 'Sì. Orario, sede e modalità della riunione saranno pubblicati nella sezione <a href="info-gare.html#segreteria">Info per chi gareggia → Accrediti e segreteria gare</a>.'
        }
      ]
    },
    {
      title: 'Arrivo e accreditamento',
      items: [
        {
          q: 'Dove si trova la segreteria gare?',
          a: 'La segreteria gare sarà allestita presso la sede della Società Canottieri Pesaro, in Calata Caio Duilio 101. Consulta la sezione <a href="info-gare.html#segreteria">Accrediti e segreteria gare</a>.'
        },
        {
          q: 'Quali saranno gli orari della segreteria?',
          a: 'Gli orari di apertura saranno pubblicati nella sezione <a href="info-gare.html#segreteria">Info per chi gareggia → Accrediti e segreteria gare</a>.'
        },
        {
          q: 'Dove si ritirano gli accrediti e il welcome kit?',
          a: 'Gli accrediti e il welcome kit potranno essere ritirati presso la segreteria gare.'
        },
        {
          q: 'Quando saranno disponibili le imbarcazioni per le prove?',
          a: 'La disponibilità delle imbarcazioni per le prove è prevista indicativamente per venerdì 2 ottobre 2026. Orari e modalità di prenotazione sono ancora in fase di definizione e saranno comunicati nella sezione <a href="info-gare.html#programma">Programma e documenti ufficiali</a>.'
        }
      ]
    },
    {
      title: 'Logistica di società e atleti',
      items: [
        {
          q: 'Dove si trovano il parco barche e le aree di rimessaggio?',
          a: 'Il parco barche e le aree di rimessaggio saranno collocati presso il campo gara, secondo quanto indicato nella <a href="info-gare.html#logistica">mappa logistica dell’evento</a>.'
        },
        {
          q: 'Dove possono accedere i carrelli delle società?',
          a: 'I carrelli delle società potranno accedere al parcheggio adiacente alla sede della Società Canottieri Pesaro, seguendo i percorsi indicati nella <a href="info-gare.html#logistica">mappa logistica</a>.'
        },
        {
          q: 'Sono previsti parcheggi riservati per società e accompagnatori?',
          a: 'Sì. Saranno previste aree di parcheggio dedicate, indicate nella <a href="info-gare.html#logistica">mappa logistica</a>. Per accedere sarà necessario esporre l’apposito pass, rilasciato su richiesta dall’organizzazione.'
        },
        {
          q: 'Dove si trovano spogliatoi e servizi igienici?',
          a: 'Spogliatoi e servizi igienici saranno disponibili nell’area dell’evento, nelle posizioni indicate nella <a href="info-gare.html#logistica">mappa logistica</a>.'
        },
        {
          q: 'Sarà disponibile un’area riscaldamento con remoergometri?',
          a: 'Sì. L’area riscaldamento con remoergometri sarà allestita presso il campo gara e sarà indicata nella <a href="info-gare.html#logistica">mappa logistica</a>.'
        },
        {
          q: 'Dove si trova l’area medica?',
          a: 'L’area medica sarà collocata presso il campo gara, nella posizione indicata nella <a href="info-gare.html#logistica">mappa logistica</a>.'
        },
        {
          q: 'Le mappe logistiche sono definitive?',
          a: 'La mappa rappresenta l’organizzazione prevista dell’evento. Potranno essere apportate variazioni per esigenze operative, di sicurezza o legate alle prescrizioni delle autorità competenti. Eventuali aggiornamenti saranno pubblicati sul sito.'
        }
      ]
    },
    {
      title: 'Ospitalità',
      items: [
        {
          q: 'Sono previste strutture alberghiere convenzionate?',
          a: 'Sì. Sono disponibili strutture alberghiere convenzionate tramite APA Hotels Pesaro. Tariffe e informazioni sono pubblicate nella sezione <a href="info-gare.html#ospitalita">Info per chi gareggia → Ospitalità</a>.'
        },
        {
          q: 'Come si prenotano gli hotel convenzionati?',
          a: 'La prenotazione deve essere effettuata tramite APA Hotels Pesaro, seguendo le istruzioni e utilizzando i moduli disponibili nella sezione <a href="info-gare.html#ospitalita">Ospitalità</a>.'
        },
        {
          q: 'Qual è la scadenza per la prenotazione alberghiera?',
          a: 'La scadenza indicata è il 5 settembre 2026. Dopo tale data è comunque possibile contattare APA Hotels Pesaro per verificare eventuali disponibilità residue, tramite i recapiti riportati nella sezione <a href="info-gare.html#ospitalita">Ospitalità</a>.'
        }
      ]
    },
    {
      title: 'Come arrivare',
      items: [
        {
          q: 'Come si raggiunge il campo gara in auto?',
          a: 'Indicazioni stradali, accessi e parcheggi sono riportati nella sezione <a href="info-gare.html#arrivare">Info per chi gareggia → Come arrivare</a>.'
        },
        {
          q: 'Dove possono parcheggiare autobus e pulmini?',
          a: 'Gli autobus potranno utilizzare gli stalli situati lungo la <a href="https://maps.app.goo.gl/wQRcdKZLYaZo831b6" target="_blank" rel="noopener noreferrer">Strada tra i due porti</a>. Auto e pulmini potranno utilizzare le aree indicate nella <a href="info-gare.html#logistica">mappa logistica</a>, nel rispetto delle autorizzazioni e dei pass eventualmente richiesti.'
        },
        {
          q: 'Quanto dista la stazione ferroviaria dall’area dell’evento?',
          a: 'La stazione ferroviaria di Pesaro dista circa 3 km dall’area dell’evento ed è raggiungibile in circa 30 minuti a piedi, in taxi o con i mezzi pubblici.'
        },
        {
          q: 'Sono previste modifiche temporanee alla viabilità?',
          a: 'Sì. Nei giorni dell’evento saranno previste limitazioni alla circolazione e modifiche agli accessi nelle aree vicine alla sede della Società Canottieri Pesaro. Le disposizioni definitive saranno comunicate prima della manifestazione.'
        }
      ]
    },
    {
      title: 'Pubblico e accompagnatori',
      items: [
        {
          q: 'L’accesso del pubblico è gratuito?',
          a: 'Sì. L’accesso alle aree aperte al pubblico sarà gratuito.'
        },
        {
          q: 'Da dove si possono seguire le gare?',
          a: 'Le gare potranno essere seguite dalla spiaggia, dal molo adiacente alla sede della Società Canottieri Pesaro e da Piazzale della Libertà. È inoltre prevista l’installazione di un maxischermo nei pressi della Canottieri.'
        },
        {
          q: 'Ci saranno aree ristoro?',
          a: 'Sì. Saranno disponibili il ristorante dei Bagni Tino, nell’area del campo gara, e alcuni food truck nei pressi della sede della Società Canottieri Pesaro.'
        },
        {
          q: 'È prevista una diretta streaming?',
          a: 'Sì. Il collegamento alla diretta streaming sarà pubblicato sul sito non appena disponibile.'
        }
      ]
    },
    {
      title: 'Comunicazioni e contatti',
      items: [
        {
          q: 'Come posso ricevere gli aggiornamenti dell’organizzazione?',
          a: 'È possibile ricevere gli aggiornamenti iscrivendosi al <a href="https://whatsapp.com/channel/0029Vb8eNr47IUYM2sHaTx15" target="_blank" rel="noopener noreferrer">canale WhatsApp ufficiale dei Campionati</a>.'
        },
        {
          q: 'Esiste un canale WhatsApp dei Campionati?',
          a: 'Sì. <a href="https://whatsapp.com/channel/0029Vb8eNr47IUYM2sHaTx15" target="_blank" rel="noopener noreferrer">Iscriviti direttamente al canale WhatsApp ufficiale dei Campionati</a>.'
        },
        {
          q: 'Come posso contattare l’organizzazione?',
          a: 'È possibile contattare l’organizzazione utilizzando i recapiti e il modulo presenti nella pagina <a href="contatti.html">Contatti</a>.'
        },
        {
          q: 'Come posso segnalare un’esigenza particolare?',
          a: 'È possibile segnalare esigenze organizzative, logistiche o di accessibilità contattando la segreteria gare attraverso i recapiti indicati nella pagina <a href="contatti.html">Contatti</a>.'
        }
      ]
    },
    {
      title: 'Sponsor ed espositori',
      items: [
        {
          q: 'Come si diventa sponsor o partner dell’evento?',
          a: 'Per conoscere le opportunità di sponsorizzazione, partnership o presenza espositiva è possibile consultare la pagina <a href="diventa-partner.html">Partner e sponsor</a> e contattare la Società Canottieri Pesaro attraverso il relativo modulo.'
        }
      ]
    }
  ];

  const markup = groups.map((group) => `
    <section class="faq-group" aria-labelledby="faq-${group.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}">
      <h3 id="faq-${group.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}">${group.title}</h3>
      <div class="faq-accordion">
        ${group.items.map((item) => `
          <details class="faq-item">
            <summary>${item.q}</summary>
            <div class="faq-item__answer"><p>${item.a}</p></div>
          </details>
        `).join('')}
      </div>
    </section>
  `).join('');

  const container = document.createElement('div');
  container.className = 'faq-groups';
  container.innerHTML = markup;
  placeholder.replaceWith(container);
})();

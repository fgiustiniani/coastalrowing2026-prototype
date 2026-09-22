
(() => {
  const container = document.querySelector('[data-society-region-chart]');
  const dialog = document.querySelector('[data-society-chart-dialog]');
  const openButton = document.querySelector('[data-society-chart-open]');
  const exportButton = document.querySelector('[data-society-chart-export]');
  const closeButtons = document.querySelectorAll('[data-society-chart-close]');
  const modeButtons = Array.from(document.querySelectorAll('[data-society-chart-mode]'));
  const titleNode = document.querySelector('[data-society-chart-title]');
  const descriptionNode = document.querySelector('[data-society-chart-description]');
  const legendNode = document.querySelector('[data-society-chart-legend]');
  if (!container || !dialog || !openButton) return;

  const SVG_NS = 'http://www.w3.org/2000/svg';
  let chartMode = 'societies';

  function getData() {
    return window.societyAdmin?.getData?.() || {};
  }

  function chartRows() {
    const data = getData();
    const rows = data.rows || [];
    const historicByRegion = new Map(
      (data.historical2025ByRegion || []).map((item) => [String(item.region || ''), item])
    );
    const grouped = new Map();

    rows.forEach((row) => {
      const region = String(row.region || 'Non indicata');
      const current = grouped.get(region) || {
        region,
        total: 0,
        registered: 0,
        rentalMailNotRegistered: 0,
        registered2025: 0,
        athletes2026: 0,
        athletes2026Known: false,
        athletes2025: 0,
        societies2025: 0
      };

      current.total += 1;
      if (row.status === 'registered') current.registered += 1;
      if (row.rentalMailReceived && row.status !== 'registered') current.rentalMailNotRegistered += 1;
      if (row.registered2025) current.registered2025 += 1;

      const physicalAthletes = Number(row.registrationSnapshot?.physicalAthletes);
      if (row.status === 'registered' && Number.isFinite(physicalAthletes)) {
        current.athletes2026 += physicalAthletes;
        current.athletes2026Known = true;
      }
      grouped.set(region, current);
    });

    historicByRegion.forEach((historic, region) => {
      const current = grouped.get(region) || {
        region,
        total: 0,
        registered: 0,
        rentalMailNotRegistered: 0,
        registered2025: 0,
        athletes2026: 0,
        athletes2026Known: false,
        athletes2025: 0,
        societies2025: 0
      };
      current.athletes2025 = Number(historic.athletes || 0);
      current.societies2025 = Number(historic.societies || 0);
      grouped.set(region, current);
    });

    return Array.from(grouped.values())
      .map((row) => ({
        ...row,
        societies2025: row.societies2025 || row.registered2025
      }))
      .sort((a, b) =>
        a.region.localeCompare(b.region, 'it-IT', { sensitivity: 'base' })
      );
  }

  function svgEl(name, attrs = {}, text = '') {
    const node = document.createElementNS(SVG_NS, name);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
    if (text !== '') node.textContent = text;
    return node;
  }

  function appendSummaryBoxes(svg, margin, rows, { athleteMode = false } = {}) {
    const data = getData();
    const summary = data.summary || {};
    const currentSocieties = summary.registered ?? rows.reduce((sum, row) => sum + row.registered, 0);
    const historicSocieties = summary.registered2025 ?? rows.reduce((sum, row) => sum + row.registered2025, 0);
    const currentAthletes = summary.athletes2026 ?? '—';
    const historicRegisteredAthletes = summary.athletes2025 ?? 445;
    const boxWidth = 184;
    const gap = 12;
    const startX = margin.left;

    [
      {
        x: startX,
        year: '2026',
        societies: currentSocieties,
        athletes: currentAthletes,
        athleteLabel: 'atleti iscritti',
        fill: '#f0f8f4',
        stroke: '#bcdac9',
        title: '#245d38'
      },
      {
        x: startX + boxWidth + gap,
        year: '2025',
        societies: historicSocieties,
        athletes: historicRegisteredAthletes,
        athleteLabel: 'atleti iscritti',
        fill: '#f1f6fa',
        stroke: '#c4d5e2',
        title: '#365f80'
      }
    ].forEach((item) => {
      const primaryLabel = athleteMode
        ? `${item.year} · ${item.athletes} ${item.athleteLabel}`
        : `${item.year} · ${item.societies} società`;
      const secondaryLabel = athleteMode
        ? `${item.societies} società iscritte`
        : `${item.athletes} ${item.athleteLabel}`;

      svg.appendChild(svgEl('rect', {
        x: item.x, y: 12, width: boxWidth, height: 62, rx: 8,
        fill: item.fill, stroke: item.stroke, 'stroke-width': 1
      }));
      svg.appendChild(svgEl('text', {
        x: item.x + 12, y: 35, fill: item.title, 'font-size': 13, 'font-weight': 850
      }, primaryLabel));
      svg.appendChild(svgEl('text', {
        x: item.x + 12, y: 57, fill: '#52666c', 'font-size': 11.5, 'font-weight': 750
      }, secondaryLabel));
    });
  }

  function appendGrid(svg, width, margin, plotHeight, yMax) {
    const gridSteps = 5;
    for (let i = 0; i <= gridSteps; i += 1) {
      const value = Math.round((yMax / gridSteps) * i);
      const y = margin.top + plotHeight - (value / yMax) * plotHeight;
      svg.appendChild(svgEl('line', {
        x1: margin.left, y1: y, x2: width - margin.right, y2: y,
        stroke: i === 0 ? '#9eb0b6' : '#e3eaec',
        'stroke-width': i === 0 ? 1.2 : 1
      }));
      svg.appendChild(svgEl('text', {
        x: margin.left - 9, y: y + 4,
        'text-anchor': 'end', fill: '#62757c', 'font-size': 11
      }, String(value)));
    }
  }

  function appendRegionLabel(svg, center, baseY, region) {
    svg.appendChild(svgEl('text', {
      x: center,
      y: baseY + 34,
      'text-anchor': 'end',
      fill: '#405a63',
      'font-size': 10.5,
      transform: `rotate(-48 ${center} ${baseY + 34})`
    }, region));
  }

  function buildSocietyChart() {
    const rows = chartRows();
    if (!rows.length) return null;

    const data = getData();
    const hasRegistrationData = data.ficAvailable === true;
    const width = Math.max(1120, rows.length * 64 + 110);
    const height = 530;
    const margin = { top: 92, right: 24, bottom: 150, left: 48 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const maxValue = Math.max(
      1,
      ...rows.flatMap((row) => [
        hasRegistrationData ? row.registered + row.rentalMailNotRegistered : 0,
        row.registered2025
      ])
    );
    const yMax = Math.ceil(maxValue / 5) * 5 || 5;
    const groupWidth = plotWidth / rows.length;
    const barWidth = Math.min(22, groupWidth * 0.28);

    const svg = svgEl('svg', {
      viewBox: `0 0 ${width} ${height}`,
      role: 'img',
      'aria-label': 'Società iscritte e società con mail di noleggio non ancora iscritte, per regione'
    });
    svg.appendChild(svgEl('rect', { x: 0, y: 0, width, height, fill: '#ffffff' }));
    appendSummaryBoxes(svg, margin, rows);

    if (!hasRegistrationData) {
      svg.appendChild(svgEl('text', {
        x: margin.left,
        y: 91,
        fill: '#8a5b1e',
        'font-size': 10.5,
        'font-weight': 750
      }, 'Dati di iscrizione 2026 non disponibili: il grafico regionale non può essere aggiornato.'));
    }

    appendGrid(svg, width, margin, plotHeight, yMax);

    rows.forEach((row, index) => {
      const center = margin.left + groupWidth * index + groupWidth / 2;
      const currentX = center - barWidth - 3;
      const historicX = center + 3;
      const registered = hasRegistrationData ? row.registered : 0;
      const mailNotRegistered = hasRegistrationData ? row.rentalMailNotRegistered : 0;
      const registeredHeight = (registered / yMax) * plotHeight;
      const mailNotRegisteredHeight = (mailNotRegistered / yMax) * plotHeight;
      const stackedHeight = registeredHeight + mailNotRegisteredHeight;
      const historicHeight = (row.registered2025 / yMax) * plotHeight;
      const baseY = margin.top + plotHeight;

      if (registeredHeight > 0) {
        svg.appendChild(svgEl('rect', {
          x: currentX,
          y: baseY - registeredHeight,
          width: barWidth,
          height: registeredHeight,
          rx: mailNotRegisteredHeight > 0 ? 0 : 3,
          fill: '#2f8f6b'
        }));
        svg.appendChild(svgEl('text', {
          x: currentX + barWidth / 2,
          y: registeredHeight >= 18
            ? baseY - registeredHeight / 2 + 3
            : baseY - registeredHeight - 4,
          'text-anchor': 'middle',
          fill: registeredHeight >= 18 ? '#ffffff' : '#245d38',
          'font-size': 9.5,
          'font-weight': 850
        }, String(registered)));
      }

      if (mailNotRegisteredHeight > 0) {
        svg.appendChild(svgEl('rect', {
          x: currentX,
          y: baseY - stackedHeight,
          width: barWidth,
          height: mailNotRegisteredHeight,
          rx: 3,
          fill: '#e58b2a'
        }));
        svg.appendChild(svgEl('text', {
          x: currentX + barWidth / 2,
          y: mailNotRegisteredHeight >= 18
            ? baseY - registeredHeight - mailNotRegisteredHeight / 2 + 3
            : baseY - stackedHeight - 4,
          'text-anchor': 'middle',
          fill: mailNotRegisteredHeight >= 18 ? '#ffffff' : '#b56610',
          'font-size': 9.5,
          'font-weight': 850
        }, String(mailNotRegistered)));
      }

      if (row.registered2025 > 0) {
        svg.appendChild(svgEl('rect', {
          x: historicX,
          y: baseY - historicHeight,
          width: barWidth,
          height: historicHeight,
          rx: 3,
          fill: '#497aa3'
        }));
        svg.appendChild(svgEl('text', {
          x: historicX + barWidth / 2,
          y: Math.max(margin.top + 11, baseY - historicHeight - 7),
          'text-anchor': 'middle',
          fill: '#365f80',
          'font-size': 10,
          'font-weight': 800
        }, String(row.registered2025)));
      }

      svg.appendChild(svgEl('text', {
        x: currentX + barWidth / 2,
        y: baseY + 14,
        'text-anchor': 'middle',
        fill: '#52666c',
        'font-size': 8.5,
        'font-weight': 700
      }, '2026'));

      svg.appendChild(svgEl('text', {
        x: historicX + barWidth / 2,
        y: baseY + 14,
        'text-anchor': 'middle',
        fill: '#52666c',
        'font-size': 8.5,
        'font-weight': 700
      }, '2025'));

      appendRegionLabel(svg, center, baseY, row.region);
    });

    return svg;
  }

  function buildAthleteChart() {
    const allRows = chartRows();
    const rows = allRows.filter((row) =>
      row.registered > 0 || row.societies2025 > 0 || row.athletes2026 > 0 || row.athletes2025 > 0
    );
    if (!rows.length) return null;

    const data = getData();
    const historicalRegisteredAthletes =
      data.summary?.athletes2025 ?? data.historical2025RegisteredAthletes ?? 445;
    const historicalProgramAthletes =
      data.summary?.athletes2025Program ??
      data.historical2025ProgramAthletes ??
      rows.reduce((sum, row) => sum + row.athletes2025, 0);
    const has2026 = rows.some((row) => row.athletes2026Known);
    const has2025 = data.historical2025Available === true;
    const width = Math.max(1120, rows.length * 72 + 110);
    const height = 540;
    const margin = { top: 112, right: 24, bottom: 150, left: 48 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const numericValues = rows.flatMap((row) => [
      has2026 ? row.athletes2026 : 0,
      has2025 ? row.athletes2025 : 0
    ]);
    const maxValue = Math.max(1, ...numericValues);
    const step = maxValue <= 25 ? 5 : maxValue <= 60 ? 10 : 20;
    const yMax = Math.ceil(maxValue / step) * step || step;
    const groupWidth = plotWidth / rows.length;
    const barWidth = Math.min(24, groupWidth * 0.3);

    const svg = svgEl('svg', {
      viewBox: `0 0 ${width} ${height}`,
      role: 'img',
      'aria-label': 'Atleti 2026 e atleti presenti nel programma gare 2025 per regione'
    });
    svg.appendChild(svgEl('rect', { x: 0, y: 0, width, height, fill: '#ffffff' }));
    appendSummaryBoxes(svg, margin, allRows, { athleteMode: true });

    const notes = [];
    if (!has2026) notes.push('2026: carica un file HTML aggiornato per il dettaglio atleti per regione.');
    if (has2025) {
      notes.push(`2025: il totale FIC è ${historicalRegisteredAthletes} atleti iscritti; la distribuzione regionale disponibile dal programma gare riguarda ${historicalProgramAthletes} atleti unici.`);
    } else {
      notes.push('2025: dettaglio regionale non disponibile.');
    }
    svg.appendChild(svgEl('text', {
      x: margin.left,
      y: 91,
      fill: '#8a5b1e',
      'font-size': 10.5,
      'font-weight': 750
    }, notes.join(' ')));

    appendGrid(svg, width, margin, plotHeight, yMax);

    rows.forEach((row, index) => {
      const center = margin.left + groupWidth * index + groupWidth / 2;
      const currentX = center - barWidth - 4;
      const historicX = center + 4;
      const currentHeight = has2026 ? (row.athletes2026 / yMax) * plotHeight : 0;
      const historicHeight = has2025 ? (row.athletes2025 / yMax) * plotHeight : 0;
      const baseY = margin.top + plotHeight;

      if (has2026 && row.athletes2026 > 0) {
        svg.appendChild(svgEl('rect', {
          x: currentX,
          y: baseY - currentHeight,
          width: barWidth,
          height: currentHeight,
          rx: 3,
          fill: '#2f8f6b'
        }));
      }
      svg.appendChild(svgEl('text', {
        x: currentX + barWidth / 2,
        y: has2026 && row.athletes2026 > 0
          ? Math.max(margin.top + 11, baseY - currentHeight - 7)
          : baseY - 7,
        'text-anchor': 'middle',
        fill: '#245d38',
        'font-size': 9.5,
        'font-weight': 850
      }, has2026 ? `${row.athletes2026} (${row.registered})` : `— (${row.registered})`));

      if (has2025 && row.athletes2025 > 0) {
        svg.appendChild(svgEl('rect', {
          x: historicX,
          y: baseY - historicHeight,
          width: barWidth,
          height: historicHeight,
          rx: 3,
          fill: '#497aa3'
        }));
      }
      svg.appendChild(svgEl('text', {
        x: historicX + barWidth / 2,
        y: has2025 && row.athletes2025 > 0
          ? Math.max(margin.top + 11, baseY - historicHeight - 7)
          : baseY - 7,
        'text-anchor': 'middle',
        fill: '#365f80',
        'font-size': 9.5,
        'font-weight': 850
      }, has2025 ? `${row.athletes2025} (${row.societies2025})` : `— (${row.societies2025})`));

      svg.appendChild(svgEl('text', {
        x: currentX + barWidth / 2,
        y: baseY + 14,
        'text-anchor': 'middle',
        fill: '#52666c',
        'font-size': 8.5,
        'font-weight': 700
      }, '2026'));
      svg.appendChild(svgEl('text', {
        x: historicX + barWidth / 2,
        y: baseY + 14,
        'text-anchor': 'middle',
        fill: '#52666c',
        'font-size': 8.5,
        'font-weight': 700
      }, '2025'));

      appendRegionLabel(svg, center, baseY, row.region);
    });

    return svg;
  }

  function updateModeUi() {
    modeButtons.forEach((button) => {
      const active = button.dataset.societyChartMode === chartMode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    if (chartMode === 'athletes') {
      if (titleNode) titleNode.textContent = 'Atleti per regione';
      if (descriptionNode) {
        descriptionNode.textContent = 'Confronto regionale: 2026 = “Atleti Fisici” dall’ultimo HTML caricato; 2025 = atleti unici presenti nel programma gare definitivo. I box in alto riportano i totali degli atleti iscritti; tra parentesi sopra le colonne è indicato il numero di società.';
      }
      if (legendNode) {
        legendNode.innerHTML =
          '<span><i class="society-chart-legend__swatch is-registered"></i> Atleti 2026</span>' +
          '<span><i class="society-chart-legend__swatch is-2025"></i> Atleti nel programma gare 2025</span>';
      }
    } else {
      if (titleNode) titleNode.textContent = 'Società per regione';
      if (descriptionNode) {
        descriptionNode.textContent = 'La colonna 2026 mostra in verde tutte le società che risultano iscritte, indipendentemente dall’invio della mail; sopra, in arancione, le società che hanno inviato una mail di noleggio ma non risultano iscritte. La colonna 2025 mostra le società iscritte nello storico.';
      }
      if (legendNode) {
        legendNode.innerHTML =
          '<span><i class="society-chart-legend__swatch is-registered"></i> Iscritte 2026</span>' +
          '<span><i class="society-chart-legend__swatch is-rental-mail"></i> Mail noleggio ricevuta, ma non ancora iscritta</span>' +
          '<span><i class="society-chart-legend__swatch is-2025"></i> Iscritte 2025</span>';
      }
    }
  }

  function renderChart() {
    updateModeUi();
    const svg = chartMode === 'athletes' ? buildAthleteChart() : buildSocietyChart();
    if (!svg) {
      container.innerHTML = '<div class="society-empty">Dati non disponibili per il grafico.</div>';
      return;
    }
    container.replaceChildren(svg);
  }

  function fileStamp() {
    const parts = new Intl.DateTimeFormat('it-IT', {
      timeZone: 'Europe/Rome',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(new Date());
    const get = (type) => parts.find((part) => part.type === type)?.value || '';
    return `${get('year')}${get('month')}${get('day')}-${get('hour')}${get('minute')}`;
  }

  function concatBytes(parts) {
    const total = parts.reduce((sum, part) => sum + part.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    parts.forEach((part) => {
      out.set(part, offset);
      offset += part.length;
    });
    return out;
  }

  function textBytes(value) {
    return new TextEncoder().encode(value);
  }

  function jpegBytesFromDataUrl(dataUrl) {
    const base64 = dataUrl.split(',')[1] || '';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function svgToJpeg(svg) {
    return new Promise((resolve, reject) => {
      const viewBox = String(svg.getAttribute('viewBox') || '').split(/\s+/).map(Number);
      const width = Number(viewBox[2] || 1120);
      const height = Number(viewBox[3] || 530);
      const scale = 2;
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(width * scale);
      canvas.height = Math.ceil(height * scale);
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Canvas non disponibile.'));
        return;
      }

      const svgText = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const image = new Image();

      image.onload = () => {
        context.scale(scale, scale);
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        URL.revokeObjectURL(url);
        resolve({
          jpegBytes: jpegBytesFromDataUrl(canvas.toDataURL('image/jpeg', 0.94)),
          imageWidth: canvas.width,
          imageHeight: canvas.height
        });
      };

      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Impossibile convertire il grafico.'));
      };
      image.src = url;
    });
  }

  function pdfWithJpegPages(pages) {
    const pageWidth = 841.89;
    const pageHeight = 595.28;
    const margin = 28;
    const titleSpace = 42;
    const objects = [];
    const addObject = (bytes) => {
      objects.push(bytes);
      return objects.length;
    };
    const addTextObject = (content) => addObject(textBytes(content));

    const catalogId = addTextObject('');
    const pagesId = addTextObject('');
    const fontId = addTextObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
    const pageIds = [];

    pages.forEach((item) => {
      const availableWidth = pageWidth - margin * 2;
      const availableHeight = pageHeight - margin * 2 - titleSpace;
      const scale = Math.min(availableWidth / item.imageWidth, availableHeight / item.imageHeight);
      const drawWidth = item.imageWidth * scale;
      const drawHeight = item.imageHeight * scale;
      const x = (pageWidth - drawWidth) / 2;
      const y = margin + (availableHeight - drawHeight) / 2;

      const imageHeader = textBytes(
        `<< /Type /XObject /Subtype /Image /Width ${item.imageWidth} /Height ${item.imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${item.jpegBytes.length} >>\nstream\n`
      );
      const imageId = addObject(concatBytes([
        imageHeader,
        item.jpegBytes,
        textBytes('\nendstream')
      ]));

      const content = [
        `BT /F1 15 Tf 28 554 Td (${item.title}) Tj ET`,
        `q ${drawWidth.toFixed(2)} 0 0 ${drawHeight.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm /Im${imageId} Do Q`
      ].join('\n');
      const contentBytes = textBytes(content);
      const contentId = addTextObject(`<< /Length ${contentBytes.length} >>\nstream\n${content}\nendstream`);
      const pageId = addTextObject(
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontId} 0 R >> /XObject << /Im${imageId} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`
      );
      pageIds.push(pageId);
    });

    objects[catalogId - 1] = textBytes(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
    objects[pagesId - 1] = textBytes(
      `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`
    );

    const header = textBytes('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    const chunks = [header];
    const offsets = [0];
    let position = header.length;

    objects.forEach((object, index) => {
      offsets.push(position);
      const prefix = textBytes(`${index + 1} 0 obj\n`);
      const suffix = textBytes('\nendobj\n');
      chunks.push(prefix, object, suffix);
      position += prefix.length + object.length + suffix.length;
    });

    const xrefOffset = position;
    let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i <= objects.length; i += 1) {
      xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    }
    xref += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    chunks.push(textBytes(xref));

    return new Blob(chunks, { type: 'application/pdf' });
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  async function exportPdf() {
    const societySvg = buildSocietyChart();
    const athleteSvg = buildAthleteChart();
    if (!societySvg || !athleteSvg) return;

    exportButton.disabled = true;
    try {
      const [societiesPage, athletesPage] = await Promise.all([
        svgToJpeg(societySvg),
        svgToJpeg(athleteSvg)
      ]);
      const pdf = pdfWithJpegPages([
        { ...societiesPage, title: 'Societa per regione - Campionati Italiani Coastal Rowing 2026' },
        { ...athletesPage, title: 'Atleti per regione - 2026 iscritti / 2025: 445 FIC, 384 programma gare' }
      ]);
      downloadBlob(pdf, `grafici-iscrizioni-coastal-2026-${fileStamp()}.pdf`);
    } catch (error) {
      console.error('Errore esportazione grafici:', error);
      window.alert('Non è stato possibile esportare i grafici.');
    } finally {
      exportButton.disabled = false;
    }
  }

  modeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      chartMode = button.dataset.societyChartMode === 'athletes' ? 'athletes' : 'societies';
      renderChart();
    });
  });

  openButton.addEventListener('click', () => {
    renderChart();
    dialog.showModal();
  });

  closeButtons.forEach((button) => {
    button.addEventListener('click', () => dialog.close());
  });

  exportButton?.addEventListener('click', exportPdf);

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  window.addEventListener('society-admin:updated', () => {
    if (dialog.open) renderChart();
  });
})();

(() => {
  const container = document.querySelector('[data-society-region-chart]');
  const dialog = document.querySelector('[data-society-chart-dialog]');
  const openButton = document.querySelector('[data-society-chart-open]');
  const exportButton = document.querySelector('[data-society-chart-export]');
  const closeButtons = document.querySelectorAll('[data-society-chart-close]');
  if (!container || !dialog || !openButton) return;

  const SVG_NS = 'http://www.w3.org/2000/svg';

  function chartRows() {
    const rows = window.societyAdmin?.getData?.()?.rows || [];
    const grouped = new Map();

    rows.forEach((row) => {
      const region = String(row.region || 'Non indicata');
      const current = grouped.get(region) || { region, total: 0, registered: 0, registered2025: 0 };
      current.total += 1;
      if (row.status === 'registered') current.registered += 1;
      if (row.registered2025) current.registered2025 += 1;
      grouped.set(region, current);
    });

    return Array.from(grouped.values()).sort((a, b) =>
      a.region.localeCompare(b.region, 'it-IT', { sensitivity: 'base' })
    );
  }

  function svgEl(name, attrs = {}, text = '') {
    const node = document.createElementNS(SVG_NS, name);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
    if (text) node.textContent = text;
    return node;
  }

  function renderChart() {
    const rows = chartRows();
    if (!rows.length) {
      container.innerHTML = '<div class="society-empty">Dati non disponibili per il grafico.</div>';
      return;
    }

    const width = Math.max(1120, rows.length * 64 + 110);
    const height = 470;
    const margin = { top: 28, right: 24, bottom: 150, left: 48 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const maxValue = Math.max(1, ...rows.flatMap((row) => [row.total, row.registered2025]));
    const yMax = Math.ceil(maxValue / 5) * 5 || 5;
    const groupWidth = plotWidth / rows.length;
    const barWidth = Math.min(22, groupWidth * 0.28);

    const svg = svgEl('svg', {
      viewBox: `0 0 ${width} ${height}`,
      role: 'img',
      'aria-label': 'Confronto per regione tra iscritte 2026, totale società FIC e iscritte 2025'
    });

    svg.appendChild(svgEl('rect', { x: 0, y: 0, width, height, fill: '#ffffff' }));

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

    rows.forEach((row, index) => {
      const center = margin.left + groupWidth * index + groupWidth / 2;
      const currentX = center - barWidth - 3;
      const historicX = center + 3;
      const registeredHeight = (row.registered / yMax) * plotHeight;
      const totalHeight = (row.total / yMax) * plotHeight;
      const remainingHeight = Math.max(0, totalHeight - registeredHeight);
      const historicHeight = (row.registered2025 / yMax) * plotHeight;
      const baseY = margin.top + plotHeight;

      // Colonna 2026 impilata: iscritte + parte restante fino al totale FIC.
      if (row.registered > 0) {
        svg.appendChild(svgEl('rect', {
          x: currentX,
          y: baseY - registeredHeight,
          width: barWidth,
          height: registeredHeight,
          rx: remainingHeight > 0 ? 0 : 3,
          fill: '#2f8f6b'
        }));
      }

      if (remainingHeight > 0) {
        svg.appendChild(svgEl('rect', {
          x: currentX,
          y: baseY - totalHeight,
          width: barWidth,
          height: remainingHeight,
          rx: 3,
          fill: '#b7c8ce'
        }));
      }

      // Colonna separata: società iscritte nel 2025.
      if (row.registered2025 > 0) {
        svg.appendChild(svgEl('rect', {
          x: historicX,
          y: baseY - historicHeight,
          width: barWidth,
          height: historicHeight,
          rx: 3,
          fill: '#497aa3'
        }));
      }

      if (row.registered > 0) {
        svg.appendChild(svgEl('text', {
          x: currentX + barWidth / 2,
          y: registeredHeight >= 15 ? baseY - registeredHeight / 2 + 3 : baseY - registeredHeight - 4,
          'text-anchor': 'middle',
          fill: registeredHeight >= 15 ? '#ffffff' : '#245d38',
          'font-size': 9.5,
          'font-weight': 800
        }, String(row.registered)));
      }

      svg.appendChild(svgEl('text', {
        x: currentX + barWidth / 2,
        y: Math.max(margin.top + 11, baseY - totalHeight - 7),
        'text-anchor': 'middle',
        fill: '#52666c',
        'font-size': 10,
        'font-weight': 800
      }, String(row.total)));

      if (row.registered2025 > 0) {
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

      svg.appendChild(svgEl('text', {
        x: center,
        y: baseY + 34,
        'text-anchor': 'end',
        fill: '#405a63',
        'font-size': 10.5,
        transform: `rotate(-48 ${center} ${baseY + 34})`
      }, row.region));
    });

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

  function pdfWithJpeg(jpegBytes, imageWidth, imageHeight) {
    const pageWidth = 841.89;
    const pageHeight = 595.28;
    const margin = 28;
    const titleSpace = 42;
    const availableWidth = pageWidth - margin * 2;
    const availableHeight = pageHeight - margin * 2 - titleSpace;
    const scale = Math.min(availableWidth / imageWidth, availableHeight / imageHeight);
    const drawWidth = imageWidth * scale;
    const drawHeight = imageHeight * scale;
    const x = (pageWidth - drawWidth) / 2;
    const y = margin + (availableHeight - drawHeight) / 2;

    const objects = [];
    const addTextObject = (content) => {
      objects.push(textBytes(content));
      return objects.length;
    };
    const catalogId = addTextObject('');
    const pagesId = addTextObject('');
    const pageId = addTextObject('');
    const imageHeader = textBytes(
      `<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`
    );
    const imageFooter = textBytes('\nendstream');
    objects.push(concatBytes([imageHeader, jpegBytes, imageFooter]));
    const imageId = objects.length;

    const content = [
      'BT /F1 15 Tf 28 554 Td (Iscrizioni per regione - Campionati Italiani Coastal Rowing 2026) Tj ET',
      `q ${drawWidth.toFixed(2)} 0 0 ${drawHeight.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm /Im1 Do Q`
    ].join('\n');
    const contentBytes = textBytes(content);
    const contentId = addTextObject(`<< /Length ${contentBytes.length} >>\nstream\n${content}\nendstream`);
    const fontId = addTextObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');

    objects[catalogId - 1] = textBytes(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
    objects[pagesId - 1] = textBytes(`<< /Type /Pages /Kids [${pageId} 0 R] /Count 1 >>`);
    objects[pageId - 1] = textBytes(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontId} 0 R >> /XObject << /Im1 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`
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

  function exportPdf() {
    const svg = container.querySelector('svg');
    if (!svg) return;

    exportButton.disabled = true;
    const viewBox = svg.viewBox.baseVal;
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewBox.width * scale);
    canvas.height = Math.ceil(viewBox.height * scale);
    const context = canvas.getContext('2d');
    if (!context) {
      exportButton.disabled = false;
      return;
    }

    const svgText = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      context.scale(scale, scale);
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, viewBox.width, viewBox.height);
      context.drawImage(image, 0, 0, viewBox.width, viewBox.height);
      URL.revokeObjectURL(url);

      const jpegBytes = jpegBytesFromDataUrl(canvas.toDataURL('image/jpeg', 0.94));
      const pdf = pdfWithJpeg(jpegBytes, canvas.width, canvas.height);
      downloadBlob(pdf, `iscrizioni-per-regione-coastal-2026-${fileStamp()}.pdf`);
      exportButton.disabled = false;
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      exportButton.disabled = false;
    };

    image.src = url;
  }

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

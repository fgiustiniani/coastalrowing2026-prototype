(() => {
  const container = document.querySelector('[data-society-region-chart]');
  const exportButton = document.querySelector('[data-society-chart-export]');
  if (!container) return;

  const SVG_NS = 'http://www.w3.org/2000/svg';

  function chartRows() {
    const rows = window.societyAdmin?.getData?.()?.rows || [];
    const grouped = new Map();

    rows.forEach((row) => {
      const region = String(row.region || 'Non indicata');
      const current = grouped.get(region) || { region, total: 0, registered: 0 };
      current.total += 1;
      if (row.status === 'registered') current.registered += 1;
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
    const maxValue = Math.max(1, ...rows.map((row) => row.total));
    const yMax = Math.ceil(maxValue / 5) * 5 || 5;
    const groupWidth = plotWidth / rows.length;
    const barWidth = Math.min(20, groupWidth * 0.28);

    const svg = svgEl('svg', {
      viewBox: `0 0 ${width} ${height}`,
      role: 'img',
      'aria-label': 'Società iscritte e totale società FIC per regione'
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
      const registeredHeight = (row.registered / yMax) * plotHeight;
      const totalHeight = (row.total / yMax) * plotHeight;
      const baseY = margin.top + plotHeight;

      svg.appendChild(svgEl('rect', {
        x: center - barWidth - 2,
        y: baseY - registeredHeight,
        width: barWidth,
        height: registeredHeight,
        rx: 3,
        fill: '#2f8f6b'
      }));

      svg.appendChild(svgEl('rect', {
        x: center + 2,
        y: baseY - totalHeight,
        width: barWidth,
        height: totalHeight,
        rx: 3,
        fill: '#b7c8ce'
      }));

      svg.appendChild(svgEl('text', {
        x: center - barWidth / 2 - 2,
        y: Math.max(margin.top + 11, baseY - registeredHeight - 6),
        'text-anchor': 'middle',
        fill: '#245d38',
        'font-size': 10,
        'font-weight': 800
      }, String(row.registered)));

      svg.appendChild(svgEl('text', {
        x: center + barWidth / 2 + 2,
        y: Math.max(margin.top + 11, baseY - totalHeight - 6),
        'text-anchor': 'middle',
        fill: '#52666c',
        'font-size': 10,
        'font-weight': 800
      }, String(row.total)));

      const label = svgEl('text', {
        x: center,
        y: baseY + 18,
        'text-anchor': 'end',
        fill: '#405a63',
        'font-size': 10.5,
        transform: `rotate(-48 ${center} ${baseY + 18})`
      }, row.region);
      svg.appendChild(label);
    });

    container.replaceChildren(svg);
  }

  function fileStamp() {
    const d = new Date();
    const pad = (value) => String(value).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  }

  function exportPng() {
    const svg = container.querySelector('svg');
    if (!svg) return;

    const viewBox = svg.viewBox.baseVal;
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewBox.width * scale);
    canvas.height = Math.ceil(viewBox.height * scale);
    const context = canvas.getContext('2d');
    if (!context) return;

    const serializer = new XMLSerializer();
    const svgText = serializer.serializeToString(svg);
    const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      context.scale(scale, scale);
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, viewBox.width, viewBox.height);
      context.drawImage(image, 0, 0, viewBox.width, viewBox.height);
      URL.revokeObjectURL(url);

      canvas.toBlob((png) => {
        if (!png) return;
        const pngUrl = URL.createObjectURL(png);
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = `iscrizioni-per-regione-coastal-2026-${fileStamp()}.png`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(pngUrl), 1500);
      }, 'image/png');
    };

    image.onerror = () => URL.revokeObjectURL(url);
    image.src = url;
  }

  window.addEventListener('society-admin:updated', renderChart);
  exportButton?.addEventListener('click', exportPng);

  if (window.societyAdmin?.getData?.()) renderChart();
})();

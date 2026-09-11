from pathlib import Path

html_path = Path('vivi-pesaro.html')
js_path = Path('vivi-pesaro-food.js')
css_path = Path('vivi-pesaro.css')

html = html_path.read_text(encoding='utf-8')
js = js_path.read_text(encoding='utf-8')
css = css_path.read_text(encoding='utf-8')

legend_replacements = {
    '<span class="food-map-legend__item"><span class="food-map-key">R</span>Ristorante</span>': '<span class="food-map-legend__item"><img class="food-map-legend__icon" src="assets/icons/food/ristorante.svg" alt="">Ristorante</span>',
    '<span class="food-map-legend__item"><span class="food-map-key">P</span>Pizzeria</span>': '<span class="food-map-legend__item"><img class="food-map-legend__icon" src="assets/icons/food/pizzeria.svg" alt="">Pizzeria</span>',
    '<span class="food-map-legend__item"><span class="food-map-key">L</span>Lounge / Bistrot</span>': '<span class="food-map-legend__item"><img class="food-map-legend__icon" src="assets/icons/food/lounge-bistrot.svg" alt="">Lounge / Bistrot</span>',
    '<span class="food-map-legend__item"><span class="food-map-key">G</span>Gelateria</span>': '<span class="food-map-legend__item"><img class="food-map-legend__icon" src="assets/icons/food/gelateria.svg" alt="">Gelateria</span>',
    '<span class="food-map-legend__item"><span class="food-map-key food-map-key--pub">PIA</span>Piadineria</span>': '<span class="food-map-legend__item"><img class="food-map-legend__icon" src="assets/icons/food/piadineria.svg" alt="">Piadineria</span>',
    '<span class="food-map-legend__item"><span class="food-map-key food-map-key--pub">PUB</span>Pub</span>': '<span class="food-map-legend__item"><img class="food-map-legend__icon" src="assets/icons/food/pub.svg" alt="">Pub</span>',
}
for old, new in legend_replacements.items():
    if old not in html:
        raise SystemExit(f'Voce legenda non trovata: {old}')
    html = html.replace(old, new, 1)

html = html.replace(
    'Tocca un indicatore sulla mappa per aprire il dettaglio del locale.',
    'Passa con il mouse o tocca un indicatore sulla mappa per aprire il dettaglio del locale.'
)

codes_block = """  const CATEGORY_CODES = {
    ristorante: 'R',
    pizzeria: 'P',
    'lounge-bistrot': 'L',
    gelateria: 'G',
    piadineria: 'PIA',
    pub: 'PUB'
  };
"""
icons_block = """  const CATEGORY_ICONS = {
    ristorante: 'assets/icons/food/ristorante.svg',
    pizzeria: 'assets/icons/food/pizzeria.svg',
    'lounge-bistrot': 'assets/icons/food/lounge-bistrot.svg',
    gelateria: 'assets/icons/food/gelateria.svg',
    piadineria: 'assets/icons/food/piadineria.svg',
    pub: 'assets/icons/food/pub.svg'
  };
"""
if codes_block not in js:
    raise SystemExit('Blocco CATEGORY_CODES non trovato')
js = js.replace(codes_block, icons_block, 1)

marker_code_block = """  const getMarkerCode = (card) => {
    const codes = getCardCategories(card)
      .map((category) => CATEGORY_CODES[category])
      .filter(Boolean);
    return codes.length ? codes.join('/') : '•';
  };

"""
if marker_code_block not in js:
    raise SystemExit('Funzione getMarkerCode non trovata')
js = js.replace(marker_code_block, '', 1)

old_marker = """  const createPlaceMarker = (card, addressElement, lat, lng) => {
    const name = getPlaceName(card);
    const address = addressElement.querySelector('.food-place__address-label')?.textContent.trim() || '';
    const code = getMarkerCode(card);
    const iconWidth = Math.max(40, 22 + code.length * 8);

    const icon = window.L.divIcon({
      className: 'food-map-marker-wrapper',
      html: `<span class=\"food-map-marker\" aria-hidden=\"true\">${code}</span>`,
      iconSize: [iconWidth, 40],
      iconAnchor: [iconWidth / 2, 20]
    });

    const marker = window.L.marker([lat, lng], {
      icon,
      keyboard: true,
      riseOnHover: true,
      title: `${name} — ${address}`,
      alt: name
    });

    marker.on('click', () => openPlaceDetail(card, addressElement));

    return marker;
  };
"""
new_marker = """  const createPlaceMarker = (card, addressElement, lat, lng) => {
    const name = getPlaceName(card);
    const address = addressElement.querySelector('.food-place__address-label')?.textContent.trim() || '';
    const categories = getCardCategories(card).filter((category) => CATEGORY_ICONS[category]);
    const iconWidth = categories.length > 1 ? 68 : 44;
    const iconImages = categories
      .map((category) => `<img src=\"${CATEGORY_ICONS[category]}\" alt=\"\">`)
      .join('');

    const icon = window.L.divIcon({
      className: 'food-map-marker-wrapper',
      html: `<span class=\"food-map-marker food-map-marker--icons\" aria-hidden=\"true\">${iconImages}</span>`,
      iconSize: [iconWidth, 44],
      iconAnchor: [iconWidth / 2, 22]
    });

    const marker = window.L.marker([lat, lng], {
      icon,
      keyboard: true,
      riseOnHover: true,
      title: `${name} — ${address}`,
      alt: name
    });

    marker.on('click', () => openPlaceDetail(card, addressElement));
    marker.on('mouseover', () => {
      if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && !detailDialog?.open) {
        openPlaceDetail(card, addressElement);
      }
    });

    return marker;
  };
"""
if old_marker not in js:
    raise SystemExit('Funzione createPlaceMarker non trovata')
js = js.replace(old_marker, new_marker, 1)

legend_item_rule = ".food-map-legend__item { display: inline-flex; align-items: center; gap: 6px; color: var(--muted); font-size: .78rem; font-weight: 750; }\n"
legend_icon_rule = legend_item_rule + ".food-map-legend__icon { display: block; width: 25px; height: 25px; min-width: 25px; object-fit: contain; }\n"
if legend_item_rule not in css:
    raise SystemExit('Regola legenda non trovata')
css = css.replace(legend_item_rule, legend_icon_rule, 1)

old_marker_css = """.food-map-marker {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 36px;
  padding: 0 7px;
  border: 3px solid #153e62;
  border-radius: 999px;
  background: #4fa9ca;
  color: #fff;
  box-shadow: 0 4px 10px rgba(4,17,31,.24);
  font-size: .72rem;
  font-weight: 900;
  line-height: 1;
  letter-spacing: .01em;
  white-space: nowrap;
}
.food-map-marker-wrapper:hover .food-map-marker,
.food-map-marker-wrapper:focus .food-map-marker { transform: scale(1.08); }
"""
new_marker_css = """.food-map-marker {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-width: 40px;
  height: 40px;
  padding: 5px 6px;
  border: 2px solid #153e62;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 4px 10px rgba(4,17,31,.24);
  line-height: 1;
  white-space: nowrap;
}
.food-map-marker--icons img {
  display: block !important;
  width: 25px !important;
  height: 25px !important;
  min-width: 25px !important;
  max-width: 25px !important;
  max-height: 25px !important;
  object-fit: contain !important;
}
.food-map-marker-wrapper:hover .food-map-marker,
.food-map-marker-wrapper:focus .food-map-marker { transform: scale(1.08); }
"""
if old_marker_css not in css:
    raise SystemExit('CSS marker non trovato')
css = css.replace(old_marker_css, new_marker_css, 1)

html_path.write_text(html, encoding='utf-8')
js_path.write_text(js, encoding='utf-8')
css_path.write_text(css, encoding='utf-8')

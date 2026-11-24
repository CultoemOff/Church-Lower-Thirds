// Drawings for the setup assistant: where to click in OBS Studio. They are schematic on
// purpose (boxes and labels, no screenshots), so they stay right across OBS versions and
// languages; every label goes through the translator handed in as `t`.

const C = {
  window: '#1c212b',
  panel: '#272d39',
  line: '#3b4354',
  bar: '#4a5367',
  text: '#dfe4ec',
  muted: '#8e98aa',
  mark: '#f0a52a',
  blue: '#4f7cff',
  field: '#151922',
};
const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
  );
const text = (x, y, s, { size = 12, fill = C.text, weight = 500, anchor = 'start' } = {}) =>
  `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${esc(s)}</text>`;
const rect = (x, y, w, h, { fill = C.panel, stroke = C.line, r = 6, width = 1 } = {}) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"/>`;
/** Where to look: an amber outline around the thing to click. */
const mark = (x, y, w, h, r = 8) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${C.mark}22" stroke="${C.mark}" stroke-width="2.5"/>`;
/** A numbered step bubble. */
const step = (x, y, n) =>
  `<circle cx="${x}" cy="${y}" r="11" fill="${C.mark}"/>` +
  text(x, y + 4.5, n, { size: 13, fill: '#231500', weight: 800, anchor: 'middle' });
/** A stand-in for a label we do not need to spell out. */
const blank = (x, y, w) =>
  `<rect x="${x}" y="${y}" width="${w}" height="7" rx="3.5" fill="${C.bar}"/>`;
const pointer = (x, y) =>
  `<path d="M${x} ${y}l0 17 4.500-4 3 7 3-1.300-3-7 6 0z" fill="#fff" stroke="#111" stroke-width="1.200" stroke-linejoin="round"/>`;
const frame = (w, h, body, label) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}" font-family="system-ui, 'Segoe UI', Roboto, sans-serif">${body}</svg>`;

/** The window of the program, with its menu bar, the picture and the panels at the bottom. */
function shell(t, inner, { menu = false } = {}) {
  const menus = [34, 30, 28].map((w, i) => blank(16 + i * 44, 13, w)).join('');
  return (
    rect(0.5, 0.5, 559, 319, { fill: C.window, r: 10 }) +
    `<path d="M0.500 30h559" stroke="${C.line}"/>` +
    menus +
    text(152, 20.5, 'Docks', { size: 12, fill: menu ? C.mark : C.text, weight: menu ? 800 : 500 }) +
    blank(202, 13, 34) +
    blank(246, 13, 30) +
    inner
  );
}
/** Scenes, sources and mixer panels along the bottom. */
function panels(t, y = 206) {
  return (
    rect(12, y, 130, 102) +
    text(22, y + 18, t('Cenas'), { size: 11, fill: C.muted, weight: 700 }) +
    blank(22, y + 32, 70) +
    rect(150, y, 170, 102) +
    text(160, y + 18, t('Fontes'), { size: 11, fill: C.muted, weight: 700 }) +
    rect(328, y, 220, 102) +
    blank(338, y + 12, 60) +
    [0, 1].map((i) => rect(338, y + 34 + i * 26, 200, 10, { fill: C.field, r: 5 })).join('')
  );
}
const picture = (x, y, w, h) =>
  rect(x, y, w, h, { fill: '#0e1118', r: 4 }) +
  // Someone on camera, in the simplest shapes.
  `<circle cx="${x + w / 2}" cy="${y + h * 0.36}" r="${h * 0.15}" fill="#3a4357"/>` +
  `<path d="M${x + w / 2 - h * 0.34} ${y + h}c0-${h * 0.42} ${h * 0.68}-${h * 0.42} ${h * 0.68} 0z" fill="#3a4357"/>`;

/** 1. Menu Docks → Custom browser docks. */
export function guideDockMenu(t) {
  const item = t('Docks de navegador personalizados');
  return frame(
    560,
    320,
    shell(t, picture(100, 42, 360, 152) + panels(t), { menu: true }) +
      mark(142, 5, 54, 22) +
      rect(140, 32, 300, 92, { fill: '#2f3644', r: 7 }) +
      blank(154, 48, 110) +
      blank(154, 66, 86) +
      mark(146, 86, 288, 30, 6) +
      text(156, 106, `${item}…`, { size: 12.5, weight: 700 }) +
      step(128, 16, 1) +
      step(452, 101, 2) +
      pointer(398, 98),
    `${t('Docks')} → ${item}`,
  );
}

/** 2. The dialog: a name and the address of the control panel. */
export function guideDockDialog(t, url) {
  return frame(
    560,
    230,
    rect(0.5, 0.5, 559, 229, { fill: C.window, r: 10 }) +
      text(18, 26, t('Docks de navegador personalizados'), { size: 13, weight: 700 }) +
      `<path d="M0.500 40h559" stroke="${C.line}"/>` +
      text(22, 64, t('Nome'), { size: 11, fill: C.muted, weight: 700 }) +
      text(212, 64, 'URL', { size: 11, fill: C.muted, weight: 700 }) +
      rect(16, 74, 184, 34, { fill: C.field }) +
      text(26, 96, 'Church Lower Thirds', { size: 12.5 }) +
      rect(206, 74, 338, 34, { fill: C.field }) +
      text(216, 96, url, { size: 12.5 }) +
      mark(13, 71, 190, 40) +
      mark(203, 71, 344, 40) +
      step(30, 128, 1) +
      step(220, 128, 2) +
      rect(16, 116 + 30, 528, 34, { fill: C.field }) +
      rect(404, 190, 140, 28, { fill: C.blue, stroke: C.blue }) +
      text(474, 208.5, t('Aplicar'), { size: 12.5, fill: '#fff', weight: 700, anchor: 'middle' }) +
      step(388, 204, 3),
    t('Docks de navegador personalizados'),
  );
}

/** 3. Sources → + → Browser. */
export function guideAddSource(t) {
  return frame(
    560,
    320,
    shell(t, picture(100, 42, 360, 152) + panels(t)) +
      // The + button at the foot of the sources panel.
      rect(158, 282, 22, 20, { fill: C.field, r: 5 }) +
      text(169, 297, '+', { size: 16, weight: 700, anchor: 'middle' }) +
      mark(154, 278, 30, 28, 7) +
      step(140, 270, 1) +
      rect(190, 150, 220, 142, { fill: '#2f3644', r: 7 }) +
      blank(204, 168, 120) +
      blank(204, 190, 150) +
      blank(204, 212, 70) +
      mark(196, 228, 208, 30, 6) +
      text(206, 248, t('Navegador'), { size: 12.5, weight: 700 }) +
      blank(204, 272, 60) +
      step(422, 243, 2) +
      pointer(360, 240),
    `${t('Fontes')} → + → ${t('Navegador')}`,
  );
}

/** 4. Properties of the browser source: address, width and height. */
export function guideSourceProps(t, url, width, height) {
  const field = (y, label, value, n) =>
    text(22, y + 21, label, { size: 12, fill: C.muted, weight: 600 }) +
    rect(150, y, 394, 32, { fill: C.field }) +
    text(160, y + 21, value, { size: 12.5 }) +
    mark(147, y - 3, 400, 38) +
    step(134, y + 16, n);
  return frame(
    560,
    250,
    rect(0.5, 0.5, 559, 249, { fill: C.window, r: 10 }) +
      text(18, 26, `${t('Propriedades')}: Church Lower Thirds`, { size: 13, weight: 700 }) +
      `<path d="M0.500 40h559" stroke="${C.line}"/>` +
      field(58, 'URL', url, 1) +
      field(106, t('Largura'), width, 2) +
      field(154, t('Altura'), height, 3) +
      rect(444, 206, 100, 28, { fill: C.blue, stroke: C.blue }) +
      text(494, 224.5, 'OK', { size: 12.5, fill: '#fff', weight: 700, anchor: 'middle' }),
    `${t('Propriedades')}: URL, ${t('Largura')}, ${t('Altura')}`,
  );
}

/** 5. The graphics source sits above the camera in the list; the result on the picture. */
export function guideOrder(t) {
  const row = (y, name, on) =>
    rect(160, y, 150, 26, { fill: on ? '#33405e' : C.field, stroke: on ? C.blue : C.line, r: 5 }) +
    `<circle cx="173" cy="${y + 13}" r="4" fill="none" stroke="${C.muted}" stroke-width="1.500"/>` +
    text(186, y + 17.5, name, { size: 11.5, weight: on ? 700 : 500 });
  return frame(
    560,
    320,
    shell(
      t,
      picture(100, 42, 360, 152) +
        // The name bar, over the camera.
        `<rect x="118" y="150" width="150" height="20" rx="4" fill="${C.blue}"/>` +
        `<rect x="118" y="170" width="104" height="13" rx="3" fill="#0f172a"/>` +
        `<rect x="126" y="157" width="80" height="6" rx="3" fill="#fff"/>` +
        panels(t),
    ) +
      row(232, 'Church Lower Thirds', true) +
      row(262, t('Câmera'), false) +
      mark(156, 228, 158, 34, 7) +
      step(326, 245, 1) +
      `<path d="M300 152c36 6 44 40 30 80" fill="none" stroke="${C.mark}" stroke-width="2" stroke-dasharray="5 4"/>`,
    t('A fonte de navegador precisa estar por cima das câmeras, na cena que está no ar.'),
  );
}

/** 6. Where the control panel ends up: docked beside the picture. */
export function guideDocked(t) {
  const tabs = [0, 1, 2].map((i) =>
    rect(402 + i * 50, 66, 44, 16, { fill: i ? C.field : C.blue, r: 8 }),
  );
  const buttons = [0, 1, 2].map((i) => rect(402, 92 + i * 30, 146, 22, { fill: C.field, r: 6 }));
  return frame(
    560,
    320,
    shell(
      t,
      picture(12, 42, 372, 152) +
        rect(392, 38, 162, 160) +
        text(402, 56, 'Church Lower Thirds', { size: 10.5, fill: C.muted, weight: 700 }) +
        tabs.join('') +
        buttons.join('') +
        panels(t),
    ) + mark(389, 35, 168, 166, 9),
    t('O painel'),
  );
}

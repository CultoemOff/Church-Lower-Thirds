// Shared by the overlay and the settings page: turns the saved look into CSS values.

export function rgba(hex, alpha = 1) {
  const h = /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#000000';
  const n = parseInt(h.slice(1), 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${Math.round(alpha * 1000) / 1000})`;
}

/** A Fill ({type, a, b, angle}) as a CSS background; `opacity` is 0-100. */
export function fillCss(fill, opacity = 100) {
  const alpha = Math.max(0, Math.min(100, opacity)) / 100;
  if (!fill) return 'transparent';
  if (fill.type !== 'gradient') return rgba(fill.a, alpha);
  return `linear-gradient(${Number(fill.angle) || 0}deg, ${rgba(fill.a, alpha)}, ${rgba(fill.b, alpha)})`;
}

/** drop-shadow() filter for the chosen effect; glow uses the element's accent color. */
export function shadowCss(kind, strength = 60, glow = '#ffffff') {
  const s = Math.max(0, Math.min(100, strength)) / 100;
  if (kind === 'soft')
    return `drop-shadow(0 ${10 + 14 * s}px ${18 + 26 * s}px ${rgba('#000000', 0.25 + 0.5 * s)})`;
  if (kind === 'hard')
    return `drop-shadow(${5 + 5 * s}px ${5 + 5 * s}px 0 ${rgba('#000000', 0.3 + 0.5 * s)})`;
  if (kind === 'glow')
    return `drop-shadow(0 0 ${8 + 14 * s}px ${rgba(glow, 0.45 + 0.5 * s)}) drop-shadow(0 0 ${24 + 40 * s}px ${rgba(glow, 0.2 + 0.4 * s)})`;
  return 'none';
}

/** Black or white, whichever reads better over the color (for text on the accent). */
export function onColor(hex) {
  const n = parseInt((/^#[0-9a-f]{6}$/i.test(hex) ? hex : '#000000').slice(1), 16);
  const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.62 ? '#111827' : '#ffffff';
}

/**
 * The date of the corner badge: the day of the week, the date, or both, in the chosen
 * style (short "ter, 24 nov", long "terça-feira, 24 de novembro", numeric "24/11/2026").
 */
export function dateText(now, locale, { showDate, showWeekday, dateStyle }) {
  if (!showDate && !showWeekday) return '';
  const long = dateStyle === 'long',
    day = { short: { day: '2-digit', month: 'short' }, long: { day: 'numeric', month: 'long' } }[
      dateStyle
    ] || { day: '2-digit', month: '2-digit', year: 'numeric' };
  const text = now.toLocaleDateString(locale, {
    ...(showWeekday ? { weekday: long || !showDate ? 'long' : 'short' } : {}),
    ...(showDate ? day : {}),
  });
  // Abbreviations come with a dot in some languages ("ter., 24 de nov."): cleaner without.
  return long ? text : text.replace(/\./g, '');
}

export const fontCss = (font) =>
  (font ? `"${String(font).replace(/["\\]/g, '')}", ` : '') +
  'system-ui, "Segoe UI", Roboto, sans-serif';

export function qrUrl(kind, text, { round = false, stamp = '', dark = '' } = {}) {
  const p = new URLSearchParams({ kind: kind === 'giving' ? 'giving' : 'text', margin: '1' });
  if (kind !== 'giving') p.set('text', text || '');
  if (round) p.set('round', '1');
  // The dots in a color of the card instead of black (only a dark one still scans).
  if (/^#[0-9a-f]{6}$/i.test(dark)) p.set('dark', dark);
  if (stamp) p.set('v', stamp);
  return `/api/qr.svg?${p}`;
}

/** A color dark enough to draw a QR code with on white ('' when it is not). */
export function qrInk(hex) {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || '');
  if (!m) return '';
  const [r, g, b] = m.slice(1).map((v) => parseInt(v, 16));
  return 0.299 * r + 0.587 * g + 0.114 * b < 70 ? hex : '';
}

export const THEMED_ELEMENTS = ['lower', 'top', 'ticker', 'card', 'agenda', 'social'];
/** What the global theme decides for an element that follows it. */
export const THEMED_KEYS = [
  'fill',
  'fill2',
  'accent',
  'text',
  'text1',
  'text2',
  'font',
  'radius',
  'opacity',
  'shadow',
  'shadowStrength',
];
/**
 * The look an element really uses: its own settings when it was switched to its own
 * appearance, otherwise the global theme (main color on the name bar, background color on
 * everything else, one accent and one font for all).
 */
export function themed(config, el) {
  const e = config[el],
    t = config.theme;
  if (!t || e.custom || !THEMED_ELEMENTS.includes(el)) return e;
  const shared = {
    accent: t.accent,
    font: '',
    radius: t.radius,
    opacity: t.opacity,
    shadow: t.shadow,
    shadowStrength: t.shadowStrength,
  };
  if (el === 'lower')
    return { ...e, ...shared, fill: t.main, fill2: t.surface, text1: t.text1, text2: t.text2 };
  return {
    ...e,
    ...shared,
    fill: t.surface,
    text: t.text1,
    ...('text2' in e ? { text2: t.text2 } : {}),
  };
}

/**
 * The church's contribution QR: generated (PIX, SEPA transfer or a link), the image the
 * bank or app gave the church, or none when only the bank details are shown.
 */
export function givingQr(config, options) {
  const g = config.giving;
  // A payment app works by phone number or code; its QR, when the church has one, is an image.
  if (g.method === 'image' || g.method === 'app') return g.image;
  if (g.method === 'text') return '';
  return qrUrl('giving', '', options);
}

/** Text beside that QR: the bank details typed in the settings, or what the QR stands for. */
export function givingText(config) {
  const g = config.giving;
  if (g.details) return g.details;
  if (g.method === 'pix') return config.pix.mode === 'key' ? config.pix.key : '';
  if (g.method === 'app') return [g.app.name, g.app.id].filter(Boolean).join(': ');
  if (g.method === 'sepa')
    return g.sepa.iban
      .replace(/\s+/g, '')
      .toUpperCase()
      .replace(/(.{4})(?=.)/g, '$1 ');
  if (g.method === 'link') return g.link.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return '';
}

/** Short tag for lists: what kind of contribution QR the church uses. */
export const givingTag = (config) =>
  ({ pix: 'PIX', sepa: 'SEPA', link: 'QR', image: 'QR', text: 'TXT' })[config.giving.method] ||
  config.giving.app.name.slice(0, 10).toUpperCase() ||
  'QR';
/** What the offering is called on buttons: PIX in Brazil, the local app elsewhere. */
export const givingName = (config) =>
  config.giving.method === 'pix'
    ? 'PIX'
    : config.giving.method === 'app' && config.giving.app.name
      ? config.giving.app.name
      : '';

export const LOWER_TEMPLATES = [
  'classic',
  'glass',
  'ribbon',
  'minimal',
  'pill',
  'split',
  'underline',
  'neon',
  'news',
  'stack',
  'liquid',
  'plaque',
  'youth',
  'kids',
  'floral',
];
export const TOP_TEMPLATES = ['bar', 'pills', 'stack', 'liquid', 'youth', 'kids', 'floral'];
export const CARD_TEMPLATES = [
  'vertical',
  'horizontal',
  'ticket',
  'frame',
  'liquid',
  'plaque',
  'youth',
  'kids',
  'floral',
];
export const ANIMATIONS = [
  'slide',
  'rise',
  'fade',
  'wipe',
  'zoom',
  'blur',
  'bounce',
  'flip',
  'drop',
  'unfold',
  'glide',
];
export const SHADOWS = ['none', 'soft', 'hard', 'glow'];
export const TICKER_TEMPLATES = ['full', 'floating', 'minimal', 'liquid'];
export const AGENDA_TEMPLATES = ['card', 'banner', 'center', 'liquid'];
export const SOCIAL_TEMPLATES = ['pill', 'card', 'liquid', 'plaque', 'youth', 'kids', 'floral'];
// Drawings of the themed models (flowers, stars, notes, Christmas, Easter…). They are our
// own shapes, drawn here so they can take the colors of the theme. Paint classes: a = the
// accent color, y = gold, g / gd = greens, r = red, w = white, k = dark, b = brown,
// s = sky, p = pink, o = orange; ink* = lines. Every set has a big drawing (200x170, for
// the corner of the name plate and of the card) and a small one (100x100).
const art = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${body}</svg>`;
const big = (body) => art(200, 170, body);
const small = (body) => art(100, 100, body);
const n2 = (v) => Math.round(v * 100) / 100;
const flower = (x, y, r, turn = 0, cls = 'a pt') =>
  `<g transform="translate(${x} ${y}) rotate(${turn})">` +
  [0, 72, 144, 216, 288]
    .map(
      (a) =>
        `<ellipse class="${cls}" cy="${n2(-r * 0.56)}" rx="${n2(r * 0.37)}" ry="${n2(r * 0.5)}" transform="rotate(${a})"/>`,
    )
    .join('') +
  `<circle class="y" r="${n2(r * 0.21)}"/></g>`;
const leaf = (x, y, len, turn, cls = 'g') =>
  `<path class="${cls}" transform="translate(${x} ${y}) rotate(${turn})" d="M0 0C${n2(len * 0.3)} ${n2(-len * 0.34)} ${n2(len * 0.74)} ${n2(-len * 0.3)} ${len} 0C${n2(len * 0.74)} ${n2(len * 0.3)} ${n2(len * 0.3)} ${n2(len * 0.34)} 0 0Z"/>`;
/** A star with `points` tips; `inner` is how deep the valleys go (0-1). */
const star = (x, y, r, turn = 0, cls = 'a', points = 5, inner = 0.46) =>
  `<polygon class="${cls}" transform="translate(${x} ${y}) rotate(${turn})" points="${Array.from(
    { length: points * 2 },
    (_, i) => {
      const d = i % 2 ? r * inner : r,
        a = (Math.PI / points) * i - Math.PI / 2;
      return `${n2(Math.cos(a) * d)},${n2(Math.sin(a) * d)}`;
    },
  ).join(' ')}"/>`;
const lily = (x, y, r, turn = 0) =>
  `<g transform="translate(${x} ${y}) rotate(${turn})">` +
  [0, 60, 120, 180, 240, 300].map((a) => leaf(0, 0, r, a - 90, 'w pt')).join('') +
  `<circle class="y" r="${n2(r * 0.16)}"/></g>`;
const notePair = (x, y, k = 1) =>
  `<g transform="translate(${x} ${y}) scale(${k})"><ellipse class="a" rx="12" ry="8.5" transform="rotate(-22)"/>` +
  '<ellipse class="a" cx="42" cy="-10" rx="12" ry="8.5" transform="rotate(-22 42 -10)"/>' +
  '<path class="a" d="M9-4h4v-50H9zM51-14h4v-50h-4zM9-54l46-10v12L9-42z"/></g>';
const note = (x, y, k = 1) =>
  `<g transform="translate(${x} ${y}) scale(${k})"><ellipse class="a" rx="12" ry="8.5" transform="rotate(-22)"/>` +
  '<path class="a" d="M9-4h4v-48H9zM13-52c14 5 21 15 15 30-2-9-8-13-15-15z"/></g>';
const bars = (x, bottom, heights, w = 11, gap = 7) =>
  heights
    .map(
      (hgt, i) =>
        `<rect class="a" x="${x + i * (w + gap)}" y="${bottom - hgt}" width="${w}" height="${hgt}" rx="${w / 2}"/>`,
    )
    .join('');
/** The manger: a trough on crossed legs, hay and the child wrapped in cloths. */
const manger = (x, y, k = 1, gold = false) => {
  const wood = gold ? 'y' : 'b';
  return (
    `<g transform="translate(${x} ${y}) scale(${k})">` +
    `<rect class="${wood}" x="-4" y="-8" width="8" height="52" rx="3" transform="rotate(38 0 18)"/>` +
    `<rect class="${wood}" x="-4" y="-8" width="8" height="52" rx="3" transform="rotate(-38 0 18)"/>` +
    `<path class="${gold ? 'yd' : 'y'} in" d="M-34-4l6-11 6 8 6-12 6 10 6-11 6 10 6-11 6 10 6-9 6 16z"/>` +
    `<path class="${wood}" d="M-38-4h76l-9 22h-58z"/>` +
    '<ellipse class="w" cx="4" cy="-14" rx="21" ry="9"/><circle class="n" cx="-17" cy="-18" r="8.5"/></g>'
  );
};
/** The star of Bethlehem: four long rays and four short ones. */
const guideStar = (x, y, r) =>
  star(x, y, r, 0, 'y', 4, 0.2) + star(x, y, r * 0.52, 45, 'y', 4, 0.3);
/** The empty tomb: the stone rolled aside and light coming out. */
const tomb = (x, y, k = 1) =>
  `<g transform="translate(${x} ${y}) scale(${k})">` +
  '<path class="tn" d="M-76 44C-76-10-42-44 0-44s76 34 76 88z"/>' +
  '<path class="k in" d="M-26 44V8a22 22 0 0 1 44 0v36z"/><path class="y in" d="M-18 44V10a14 14 0 0 1 28 0v34z"/>' +
  '<circle class="st" cx="40" cy="20" r="26"/></g>';
const cross = (x, y, k = 1) =>
  `<g transform="translate(${x} ${y}) scale(${k})">` +
  '<path class="inky" d="M0-58v-12M-34-44l-9-9M34-44l9-9M-48-12h-12M48-12h12"/>' +
  '<path class="y" d="M-7-44H7v24h20v14H7v48H-7v-48h-20v-14h20z"/></g>';

// The sun and the pyramids of the cantata "Natal no Egito" (Igreja Cristã da Trindade, 2026),
// with the exact outlines and colors of its artwork: the disc cut along the pyramids, the
// rays, the small pyramid and the big one.
const EGYPT_SHAPES =
  '<path fill="#dea123" d="M197.3 104.25C198.34 98.86 198.89 93.31 198.89 87.62C198.89 39.23 159.66 0 111.26 0C62.87 0 23.64 39.23 23.64 87.62L23.64 88.03L83.73 41.52L130.37 77.64L146.67 65.03Z"/>' +
  '<path fill="#fff" class="in" d="M112.66 0.86L113.72 64.74L111.63 63.13ZM141.04 6.25L126.49 74.64L124.47 73.07ZM165.55 18.85L143.23 67.69L139.9 70.27ZM183.17 37.55L183.23 37.65L157.01 73.04L155.74 72.06ZM194.05 58.84L194.12 59.06L168.56 81.99L167.44 81.12ZM198.39 78.28L198.43 78.63L179.42 90.4L178.48 89.67ZM198.31 97.71L198.25 98.2L192.43 100.47L191.8 99.98ZM112.66 0.86L113.72 64.75L111.63 63.13ZM95.23 50.43L93.29 48.92L83.82 4.4ZM74.47 48.69L73.51 49.44L58.81 17.44ZM59.69 60.13L58.8 60.82L40.35 36.15L40.42 36.05ZM45.79 70.89L45.04 71.48L29.09 57.17L29.17 56.96ZM32.29 81.34L31.76 81.75L24.28 77.13L24.32 76.78Z"/>' +
  '<path fill="#793b13" d="M115.17 106.33L200 106.33L146.67 65.03L109.05 94.15L109.48 94.99L146.65 66.37L166.25 105.44L114.72 105.44Z"/>' +
  '<path fill="#793b13" d="M0 106.33L2.23 106.33L52.43 67.67L52.44 67.69L83.69 43.63L101.7 79.51L101.71 79.51L115.17 106.33L167.42 106.33L83.73 41.52Z"/>';
const EGYPT = art(200, 106.33, EGYPT_SHAPES);
// The complete logo: the same sun and pyramids, the lettering (outlines of the glyphs of the
// artwork file, placed as the file places them; the typeface is Khepri, a commercial font
// that is not shipped here), the gold line and the line under it. The lettering (.lgt) and
// the small line (.lgs) keep their colors on a light plate and take the text color on a dark one.
const EGYPT_LOGO = art(
  300,
  189.24,
  `<g transform="translate(30.7) scale(1.19)">${EGYPT_SHAPES}</g>` +
    '<path class="lgt" d="M25.68 130V165.71H17.96V162.93L7.71 147.04V165.71H-0.01V130H7.71V132.82L17.96 148.67V130ZM45.65 147.98V137.6Q45.65 137.15 45.33 136.87Q45 136.58 44.51 136.58H35.36V146.79H41.16Q43.24 146.79 44.12 147.06Q45 147.32 45.65 147.98ZM49.37 129.92Q50.96 129.92 52.11 131.07Q53.25 132.21 53.25 133.8V165.67H45.65V159.58V160.15Q45.65 158.35 45.33 157.01Q45 155.66 44.53 154.94Q44.06 154.23 43.41 153.8Q42.75 153.37 42.24 153.25Q41.73 153.13 41.16 153.13H35.36V165.67H27.76V133.64Q27.76 132.09 28.85 131.01Q29.93 129.92 31.44 129.92ZM80.74 130V136.7H71.88V165.71H64.12V136.7H55.25V130ZM100.72 147.98V137.6Q100.72 137.15 100.39 136.87Q100.06 136.58 99.57 136.58H90.42V146.79H96.23Q98.31 146.79 99.19 147.06Q100.06 147.32 100.72 147.98ZM104.44 129.92Q106.03 129.92 107.17 131.07Q108.32 132.21 108.32 133.8V165.67H100.72V159.58V160.15Q100.72 158.35 100.39 157.01Q100.06 155.66 99.6 154.94Q99.13 154.23 98.47 153.8Q97.82 153.37 97.31 153.25Q96.8 153.13 96.23 153.13H90.42V165.67H82.83V133.64Q82.83 132.09 83.91 131.01Q84.99 129.92 86.5 129.92ZM118.04 158.8H133.44V165.67H110.69H110.32V129.92H118.04ZM157.98 136.62V159.02H153.13V157.28L146.7 147.31V159.02H141.86V136.62H146.7V138.39L153.13 148.33V136.62ZM170.48 154.05V141.62Q170.48 141.31 170.28 141.11Q170.07 140.9 169.77 140.9H164.74Q164.44 140.9 164.23 141.11Q164.03 141.31 164.03 141.62V154.05Q164.03 154.33 164.23 154.54Q164.44 154.74 164.74 154.74H169.77Q170.07 154.74 170.28 154.54Q170.48 154.33 170.48 154.05ZM172.89 136.62Q173.87 136.62 174.56 137.31Q175.25 138.01 175.25 138.98V156.66Q175.25 157.3 174.93 157.85Q174.61 158.41 174.07 158.73Q173.53 159.05 172.89 159.05H161.62Q160.64 159.05 159.95 158.35Q159.26 157.66 159.26 156.66V138.98Q159.26 138.01 159.95 137.31Q160.64 136.62 161.62 136.62ZM185.6 139.89V129.92H207.66V136.79H193.2V140.38Q193.2 141.89 194.26 142.95Q195.32 144.02 196.84 144.02H204.31V151.57H196.84Q195.32 151.57 194.26 152.63Q193.2 153.7 193.2 155.21V158.8H207.66V165.67H185.6V155.7Q185.6 150.51 189.07 147.81Q185.6 145.08 185.6 139.89ZM235.23 140.67H227.64V137.89Q227.64 137.44 227.31 137.11Q226.98 136.79 226.49 136.79H218.49Q218 136.79 217.67 137.11Q217.34 137.44 217.34 137.89V157.7Q217.34 158.15 217.67 158.48Q218 158.8 218.49 158.8H227.64Q227.64 157.74 227.59 156.86Q227.55 155.98 227.47 155.29Q227.39 154.6 227.31 154.06Q227.23 153.53 227 153.15Q226.78 152.76 226.66 152.49Q226.53 152.23 226.19 152.04Q225.84 151.86 225.61 151.78Q225.39 151.7 224.9 151.65Q224.41 151.61 224.1 151.59Q223.8 151.57 223.14 151.57H221.47V143.98H223.63Q229.6 144.1 232.41 146.98Q235.23 149.86 235.23 155.7V165.67H213.5Q211.95 165.67 210.85 164.56Q209.74 163.46 209.74 161.91V133.68Q209.74 132.13 210.85 131.03Q211.95 129.92 213.5 129.92H231.48Q233.03 129.92 234.13 131.03Q235.23 132.13 235.23 133.68ZM237.23 129.92H244.96V165.67H237.23ZM272.49 130V136.7H263.62V165.71H255.86V136.7H247V130ZM292.42 157.78V137.97Q292.42 137.48 292.09 137.15Q291.77 136.83 291.28 136.83H283.27Q282.78 136.83 282.45 137.15Q282.13 137.48 282.13 137.97V157.78Q282.13 158.23 282.45 158.56Q282.78 158.88 283.27 158.88H291.28Q291.77 158.88 292.09 158.56Q292.42 158.23 292.42 157.78ZM296.26 130Q297.81 130 298.92 131.11Q300.02 132.21 300.02 133.76V161.95Q300.02 162.97 299.51 163.85Q299 164.73 298.14 165.24Q297.28 165.75 296.26 165.75H278.29Q276.74 165.75 275.63 164.64Q274.53 163.54 274.53 161.95V133.76Q274.53 132.21 275.63 131.11Q276.74 130 278.29 130Z"/>' +
    '<rect fill="#dea123" x="0" y="169.85" width="300" height="3.48"/>' +
    '<path class="lgs" d="M76.82 181.62Q76.75 180.99 76.45 180.41Q76.16 179.82 75.65 179.37Q75.14 178.91 74.41 178.65Q73.68 178.39 72.76 178.39Q71.7 178.39 70.84 178.76Q69.98 179.13 69.38 179.81Q68.79 180.5 68.47 181.44Q68.15 182.39 68.15 183.53Q68.15 184.91 68.52 185.92Q68.88 186.93 69.51 187.56Q70.13 188.18 70.92 188.49Q71.72 188.79 72.6 188.79Q73.06 188.79 73.65 188.68Q74.23 188.57 74.92 188.19Q75.61 187.81 76.16 187Q76.72 186.19 76.91 184.9H75.62Q75.47 185.71 75.14 186.25Q74.81 186.79 74.4 187.09Q74 187.39 73.59 187.5Q73.19 187.61 72.8 187.61Q71.91 187.61 71.28 187.3Q70.64 186.99 70.26 186.44Q69.87 185.89 69.7 185.14Q69.53 184.4 69.53 183.49Q69.53 181.62 70.44 180.6Q71.36 179.57 72.76 179.57Q73.17 179.57 73.59 179.66Q74 179.74 74.39 179.97Q74.78 180.19 75.08 180.6Q75.39 181 75.52 181.62ZM87.52 185.65 88.49 188.53H89.95L86.38 178.65H84.86L81.15 188.53H82.52L83.56 185.65ZM83.97 184.47 85.55 180.12H85.58L87.04 184.47ZM101.2 186.63H101.17L96.24 178.65H94.65V188.53H95.95V180.55H95.97L100.99 188.53H102.49V178.65H101.2ZM107.21 179.84H110.55V188.53H111.89V179.84H115.23V178.65H107.21ZM123.81 185.65 124.79 188.53H126.24L122.67 178.65H121.16L117.44 188.53H118.82L119.85 185.65ZM120.26 184.47 121.84 180.12H121.87L123.33 184.47ZM128.44 179.84H131.79V188.53H133.12V179.84H136.46V178.65H128.44ZM145.04 185.65 146.02 188.53H147.48L143.9 178.65H142.39L138.68 188.53H140.05L141.08 185.65ZM141.49 184.47 143.08 180.12H143.1L144.56 184.47ZM157.54 178.65H156.21V188.53H157.54ZM171.53 181.62Q171.46 180.99 171.17 180.41Q170.87 179.82 170.36 179.37Q169.85 178.91 169.12 178.65Q168.39 178.39 167.47 178.39Q166.41 178.39 165.55 178.76Q164.7 179.13 164.1 179.81Q163.5 180.5 163.18 181.44Q162.87 182.39 162.87 183.53Q162.87 184.91 163.23 185.92Q163.6 186.93 164.22 187.56Q164.85 188.18 165.64 188.49Q166.43 188.79 167.31 188.79Q167.78 188.79 168.36 188.68Q168.94 188.57 169.63 188.19Q170.32 187.81 170.88 187Q171.43 186.19 171.63 184.9H170.33Q170.18 185.71 169.85 186.25Q169.52 186.79 169.12 187.09Q168.71 187.39 168.31 187.5Q167.9 187.61 167.51 187.61Q166.62 187.61 165.99 187.3Q165.36 186.99 164.97 186.44Q164.59 185.89 164.41 185.14Q164.24 184.4 164.24 183.49Q164.24 181.62 165.16 180.6Q166.07 179.57 167.47 179.57Q167.89 179.57 168.3 179.66Q168.71 179.74 169.1 179.97Q169.49 180.19 169.8 180.6Q170.1 181 170.24 181.62ZM175.86 179.84H179.2V188.53H180.54V179.84H183.88V178.65H175.86ZM193.19 182.32V182.3Q193.22 181.9 193.28 181.55Q193.34 181.2 193.53 180.82Q193.71 180.44 194.11 180.19Q194.51 179.95 195.14 179.95Q195.65 179.95 196.02 180.1Q196.39 180.26 196.62 180.52Q196.85 180.77 196.95 181.07Q197.05 181.38 197.05 181.69Q197.05 182.15 196.93 182.47Q196.81 182.79 196.59 183.03Q196.37 183.27 196.09 183.46Q195.82 183.64 195.35 183.91L195.28 183.95L194 184.69Q192.94 185.31 192.37 186.21Q191.79 187.11 191.73 188.53H198.35V187.39H193.09Q193.15 186.99 193.52 186.5Q193.89 186.01 194.76 185.53L195.76 184.98Q196.42 184.63 196.85 184.35Q197.27 184.06 197.62 183.69Q197.96 183.33 198.15 182.85Q198.35 182.37 198.35 181.75Q198.35 180.43 197.47 179.63Q197.05 179.26 196.5 179.06Q195.95 178.86 195.32 178.86Q194.81 178.86 194.27 178.98Q193.73 179.09 193.2 179.45Q192.68 179.81 192.33 180.52Q191.98 181.22 191.98 182.32ZM208.35 183.82Q208.35 185.68 207.84 186.69Q207.34 187.7 206.32 187.7Q205.31 187.7 204.8 186.69Q204.3 185.68 204.3 183.82Q204.3 181.97 204.8 180.96Q205.31 179.95 206.32 179.95Q207.34 179.95 207.84 180.96Q208.35 181.97 208.35 183.82ZM209.64 183.82Q209.64 182.97 209.5 182.12Q209.36 181.28 209 180.54Q208.63 179.79 207.97 179.33Q207.31 178.86 206.32 178.86Q205.33 178.86 204.67 179.33Q204.01 179.79 203.66 180.54Q203.3 181.28 203.15 182.12Q203.01 182.97 203.01 183.82Q203.01 184.68 203.15 185.52Q203.3 186.37 203.66 187.11Q204.01 187.85 204.67 188.32Q205.33 188.79 206.32 188.79Q207.31 188.79 207.97 188.32Q208.63 187.85 209 187.11Q209.36 186.37 209.5 185.52Q209.64 184.68 209.64 183.82ZM215.44 182.32V182.3Q215.47 181.9 215.53 181.55Q215.59 181.2 215.78 180.82Q215.96 180.44 216.36 180.19Q216.76 179.95 217.39 179.95Q217.9 179.95 218.27 180.1Q218.65 180.26 218.87 180.52Q219.1 180.77 219.2 181.07Q219.31 181.38 219.31 181.69Q219.31 182.15 219.18 182.47Q219.06 182.79 218.84 183.03Q218.62 183.27 218.34 183.46Q218.07 183.64 217.6 183.91L217.53 183.95L216.25 184.69Q215.19 185.31 214.62 186.21Q214.04 187.11 213.98 188.53H220.6V187.39H215.35Q215.4 186.99 215.77 186.5Q216.14 186.01 217.01 185.53L218.01 184.98Q218.67 184.63 219.1 184.35Q219.53 184.06 219.87 183.69Q220.21 183.33 220.41 182.85Q220.6 182.37 220.6 181.75Q220.6 180.43 219.72 179.63Q219.31 179.26 218.76 179.06Q218.21 178.86 217.57 178.86Q217.06 178.86 216.52 178.98Q215.98 179.09 215.46 179.45Q214.93 179.81 214.58 180.52Q214.23 181.22 214.23 182.32ZM231.67 181.43Q231.63 180.73 231.35 180.23Q231.08 179.73 230.66 179.42Q230.24 179.12 229.77 178.99Q229.3 178.86 228.85 178.86Q227.82 178.86 227.12 179.34Q226.42 179.82 226.01 180.59Q225.6 181.36 225.44 182.25Q225.27 183.14 225.27 184.03Q225.27 185.06 225.44 185.9Q225.6 186.74 226.02 187.39Q226.48 188.11 227.17 188.45Q227.85 188.79 228.51 188.79Q229.46 188.79 229.99 188.55Q230.53 188.32 230.95 187.85Q231.45 187.32 231.66 186.75Q231.88 186.18 231.88 185.43Q231.88 184.61 231.59 184.02Q231.3 183.42 230.84 183.06Q230.38 182.7 229.85 182.53Q229.33 182.37 228.85 182.37Q227.96 182.37 227.39 182.72Q226.83 183.07 226.55 183.55L226.53 183.52Q226.53 183.05 226.63 182.46Q226.73 181.87 226.99 181.29Q227.24 180.72 227.7 180.33Q228.16 179.95 228.82 179.95Q229.57 179.95 229.96 180.34Q230.36 180.74 230.49 181.43ZM226.69 185.56Q226.69 184.65 227.21 184.05Q227.72 183.45 228.67 183.45Q229.21 183.45 229.59 183.64Q229.96 183.82 230.2 184.13Q230.43 184.44 230.53 184.79Q230.62 185.13 230.62 185.49Q230.62 186.48 230.11 187.09Q229.59 187.7 228.73 187.7Q227.74 187.7 227.21 187.06Q226.69 186.42 226.69 185.56Z"/>',
);
export const DECORS = [
  'flowers',
  'stars',
  'spark',
  'notes',
  'band',
  'xmas',
  'xmaskids',
  'easter',
  'easterkids',
  'egypt',
];
const SPARK =
  '<path class="ink" d="M50 6v30M50 64v30M6 50h30M64 50h30M19 19l20 20M61 61l20 20M81 19L61 39M39 61L19 81"/>';
export const DECOR = {
  flowers: {
    big: big(
      leaf(96, 96, 78, -152) +
        leaf(100, 100, 70, 62) +
        leaf(104, 92, 74, -18) +
        leaf(92, 104, 56, 118) +
        flower(84, 86, 50, 8) +
        flower(150, 54, 30, 30) +
        flower(146, 126, 22, -12),
    ),
    small: small(leaf(46, 58, 46, -160) + leaf(52, 60, 42, 40) + flower(50, 50, 34, 10)),
  },
  stars: {
    big: big(
      star(70, 82, 54, -12) +
        star(152, 42, 23, 14, 'w') +
        '<circle class="w" cx="24" cy="26" r="9"/><circle class="a" cx="112" cy="16" r="8"/>',
    ),
    small: small(star(50, 52, 44, -10)),
  },
  spark: { big: small(SPARK), small: small(SPARK) },
  notes: {
    big: big(
      [-13, 0, 13]
        .map(
          (d) =>
            `<path class="line" transform="translate(0 ${d})" d="M6 104C56 62 104 134 194 78"/>`,
        )
        .join('') +
        notePair(40, 122, 1.15) +
        note(140, 100, 1.15) +
        star(172, 30, 18, 0, 'y', 4, 0.26),
    ),
    small: small(notePair(18, 78, 1.25)),
  },
  band: {
    big: big(
      bars(18, 156, [44, 82, 120, 66, 98, 54, 30], 14, 9) +
        '<path class="y" d="M176 6l-34 62h22l-12 50 44-68h-24z"/>',
    ),
    small: small(bars(12, 90, [34, 62, 84, 48, 70])),
  },
  // In the big drawings, what goes below the top edge of the plate stays on the left:
  // further right it would cover the logo.
  xmas: {
    big: big(
      guideStar(84, 34, 32) +
        star(152, 42, 11, 0, 'y', 4, 0.26) +
        star(22, 56, 9, 0, 'y', 4, 0.26) +
        '<path class="inky" d="M26 112L84 70l58 42"/>' +
        manger(84, 132, 0.82, true),
    ),
    small: small(guideStar(50, 50, 46)),
  },
  xmaskids: {
    big: big(
      star(78, 36, 34, 0, 'y', 8, 0.52) +
        star(150, 30, 13, 10, 'w') +
        '<circle class="w" cx="24" cy="50" r="7"/><circle class="w" cx="182" cy="56" r="5"/>' +
        manger(78, 118, 1.2),
    ),
    small: small(star(50, 28, 25, 0, 'y', 8, 0.52) + manger(50, 70, 0.72)),
  },
  easter: {
    big: big(
      leaf(84, 104, 76, -158) +
        leaf(88, 108, 70, 70) +
        leaf(90, 100, 64, 150) +
        lily(70, 96, 50, 12) +
        lily(124, 132, 28, 40) +
        cross(152, 76, 0.86),
    ),
    small: small(cross(50, 62, 0.86)),
  },
  easterkids: {
    big: big(
      '<circle class="y" cx="146" cy="36" r="21"/>' +
        '<path class="inky" d="M146 6V2M171 11l4-4M121 11l-4-4M178 36h6"/>' +
        '<path class="b" d="M66 16h10v11h11v10H76v24H66V37H55V27h11z"/>' +
        tomb(74, 114, 0.9),
    ),
    small: small(tomb(50, 56, 0.6)),
  },
  egypt: { big: EGYPT_LOGO, small: EGYPT },
};
// The drawing each decorated model shows when the theme does not pick another.
const USUAL_DECOR = { floral: 'flowers', kids: 'stars', youth: 'spark' };
/** Which drawing a model shows ('' = none): the theme's choice or the usual one of the model. */
export function decorName(config, template) {
  const usual = USUAL_DECOR[template],
    pick = config.theme?.decor;
  if (!usual || pick === 'none') return '';
  return DECOR[pick] ? pick : usual;
}
/** The drawing(s) of an element, as SVG ('' = none). */
export function decorFor(config, el, template) {
  const name = decorName(config, template);
  if (!name) return '';
  const set = DECOR[name];
  // The block model only has room for a small mark, and none on the corner badge.
  if (template === 'youth') return el === 'top' ? '' : set.small;
  if (el === 'card') return set.big + set.small;
  return el === 'lower' ? set.big : set.small;
}

export const NETWORKS = [
  ['instagram', 'Instagram'],
  ['youtube', 'YouTube'],
  ['facebook', 'Facebook'],
  ['tiktok', 'TikTok'],
  ['whatsapp', 'WhatsApp'],
  ['x', 'X'],
  ['site', 'Site'],
  ['address', 'Endereço'],
  ['phone', 'Telefone'],
  ['email', 'E-mail'],
  ['other', 'Outra'],
];
// Generic line icons (camera, play, people…), not the networks' own logos: those are
// trademarks. A church can upload its own image for each network in the settings.
const icon = (d) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
export const SOCIAL_ICONS = {
  instagram: icon(
    '<path d="M4 8.500h3l1.500-2.500h7L17 8.500h3v10.500H4z"/><circle cx="12" cy="13.500" r="3.300"/>',
  ),
  youtube: icon(
    '<circle cx="12" cy="12" r="9"/><path d="M10 8.500v7l6-3.500z" fill="currentColor"/>',
  ),
  facebook: icon(
    '<circle cx="9" cy="9" r="3"/><path d="M3.500 19c.400-3 2.600-4.800 5.500-4.800s5.100 1.800 5.500 4.800"/><circle cx="17" cy="8" r="2.300"/><path d="M16.500 13.300c2.200.200 3.700 1.600 4 3.700"/>',
  ),
  tiktok: icon(
    '<path d="M9.500 17.500V5l9-1.800v11.300"/><circle cx="7" cy="17.500" r="2.500"/><circle cx="16" cy="14.500" r="2.500"/>',
  ),
  whatsapp: icon(
    '<path d="M4 19.500l1.300-4A7.800 7.800 0 1 1 8.600 18.600z"/><path d="M9 10h6M9 13.300h4"/>',
  ),
  x: icon(
    '<path d="M4 6h10a3 3 0 0 1 3 3v3a3 3 0 0 1-3 3H10l-4 3.500V15H4z"/><path d="M19.500 8.500v5"/>',
  ),
  site: icon(
    '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  ),
  address: icon(
    '<path d="M12 21s-6.500-5.600-6.500-10.500a6.500 6.500 0 0 1 13 0C18.500 15.400 12 21 12 21z"/><circle cx="12" cy="10.500" r="2.300"/>',
  ),
  phone: icon(
    '<path d="M6.500 3.500h3l1.500 4-2 1.500a11 11 0 0 0 6 6l1.500-2 4 1.500v3a2 2 0 0 1-2.200 2A16 16 0 0 1 4.500 5.700a2 2 0 0 1 2-2.200z"/>',
  ),
  email: icon('<rect x="3.500" y="5.500" width="17" height="13" rx="2"/><path d="M4 7l8 6 8-6"/>'),
  other: icon(
    '<circle cx="12" cy="12" r="3.600"/><path d="M15.600 8.400v5a2.400 2.400 0 0 0 4.900 0V12a8.500 8.500 0 1 0-3.300 6.700"/>',
  ),
};

// The eye of the OBS sources list: open = the category is in use, crossed = switched off.
export const EYE = icon(
  '<path d="M2.500 12c1.200-2.400 4.600-6 9.500-6s8.300 3.600 9.500 6c-1.200 2.400-4.600 6-9.500 6s-8.300-3.600-9.500-6z"/><circle cx="12" cy="12" r="3"/>',
);
export const EYE_OFF = icon(
  '<path d="M3 3l18 18"/><path d="M10.600 6.100A9.600 9.600 0 0 1 12 6c4.900 0 8.300 3.600 9.500 6-.500 1-1.400 2.200-2.600 3.300M6.300 7.700C4.400 9 3.100 10.700 2.500 12c1.200 2.400 4.600 6 9.500 6 1.300 0 2.500-.300 3.600-.700"/><path d="M9.900 9.900a3 3 0 0 0 4.200 4.200"/>',
);

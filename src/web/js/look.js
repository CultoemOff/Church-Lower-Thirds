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
const EGYPT = art(
  200,
  106.33,
  '<path fill="#dea123" d="M197.3 104.25C198.34 98.86 198.89 93.31 198.89 87.62C198.89 39.23 159.66 0 111.26 0C62.87 0 23.64 39.23 23.64 87.62L23.64 88.03L83.73 41.52L130.37 77.64L146.67 65.03Z"/>' +
    '<path fill="#fff" class="in" d="M112.66 0.86L113.72 64.74L111.63 63.13ZM141.04 6.25L126.49 74.64L124.47 73.07ZM165.55 18.85L143.23 67.69L139.9 70.27ZM183.17 37.55L183.23 37.65L157.01 73.04L155.74 72.06ZM194.05 58.84L194.12 59.06L168.56 81.99L167.44 81.12ZM198.39 78.28L198.43 78.63L179.42 90.4L178.48 89.67ZM198.31 97.71L198.25 98.2L192.43 100.47L191.8 99.98ZM112.66 0.86L113.72 64.75L111.63 63.13ZM95.23 50.43L93.29 48.92L83.82 4.4ZM74.47 48.69L73.51 49.44L58.81 17.44ZM59.69 60.13L58.8 60.82L40.35 36.15L40.42 36.05ZM45.79 70.89L45.04 71.48L29.09 57.17L29.17 56.96ZM32.29 81.34L31.76 81.75L24.28 77.13L24.32 76.78Z"/>' +
    '<path fill="#793b13" d="M115.17 106.33L200 106.33L146.67 65.03L109.05 94.15L109.48 94.99L146.65 66.37L166.25 105.44L114.72 105.44Z"/>' +
    '<path fill="#793b13" d="M0 106.33L2.23 106.33L52.43 67.67L52.44 67.69L83.69 43.63L101.7 79.51L101.71 79.51L115.17 106.33L167.42 106.33L83.73 41.52Z"/>',
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
  egypt: { big: EGYPT, small: EGYPT },
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

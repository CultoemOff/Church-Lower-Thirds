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

export function qrUrl(kind, text, { round = false, stamp = '' } = {}) {
  const p = new URLSearchParams({ kind: kind === 'giving' ? 'giving' : 'text', margin: '1' });
  if (kind !== 'giving') p.set('text', text || '');
  if (round) p.set('round', '1');
  if (stamp) p.set('v', stamp);
  return `/api/qr.svg?${p}`;
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
  if (g.method === 'image') return g.image;
  if (g.method === 'text') return '';
  return qrUrl('giving', '', options);
}

/** Text beside that QR: the bank details typed in the settings, or what the QR stands for. */
export function givingText(config) {
  const g = config.giving;
  if (g.details) return g.details;
  if (g.method === 'pix') return config.pix.mode === 'key' ? config.pix.key : '';
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
  'QR';

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
];
export const TOP_TEMPLATES = ['bar', 'pills', 'stack', 'liquid'];
export const CARD_TEMPLATES = ['vertical', 'horizontal', 'ticket', 'frame', 'liquid'];
export const ANIMATIONS = ['slide', 'rise', 'fade', 'wipe', 'zoom', 'blur', 'bounce', 'flip'];
export const SHADOWS = ['none', 'soft', 'hard', 'glow'];
export const TICKER_TEMPLATES = ['full', 'floating', 'minimal', 'liquid'];
export const AGENDA_TEMPLATES = ['card', 'banner', 'center', 'liquid'];
export const SOCIAL_TEMPLATES = ['pill', 'card', 'liquid'];
export const NETWORKS = [
  ['instagram', 'Instagram'],
  ['youtube', 'YouTube'],
  ['facebook', 'Facebook'],
  ['tiktok', 'TikTok'],
  ['whatsapp', 'WhatsApp'],
  ['x', 'X'],
  ['site', 'Site'],
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

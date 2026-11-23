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
  const p = new URLSearchParams({ kind: kind === 'pix' ? 'pix' : 'text', margin: '1' });
  if (kind !== 'pix') p.set('text', text || '');
  if (round) p.set('round', '1');
  if (stamp) p.set('v', stamp);
  return `/api/qr.svg?${p}`;
}

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
export const TOP_TEMPLATES = ['full', 'large', 'slim', 'floating', 'islands', 'tab'];
export const CARD_TEMPLATES = ['vertical', 'horizontal', 'ticket', 'frame'];
export const ANIMATIONS = ['slide', 'rise', 'fade', 'wipe', 'zoom', 'blur', 'bounce', 'flip'];
export const SHADOWS = ['none', 'soft', 'hard', 'glow'];

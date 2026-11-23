import { randomBytes } from 'node:crypto';

/** A color for a shape: one color, or a two-color gradient at an angle. */
export interface Fill {
  type: 'solid' | 'gradient';
  a: string;
  b: string;
  angle: number;
}
const fill = (a: string, b = a, angle = 90): Fill => ({
  type: a === b ? 'solid' : 'gradient',
  a,
  b,
  angle,
});

export interface LowerItem {
  id: string;
  line1: string;
  line2: string;
  logo: boolean;
  qr: 'none' | 'pix' | 'url';
  qrText: string;
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
const CORNERS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

export const newId = () => randomBytes(5).toString('hex');

export function defaults() {
  return {
    brand: {
      name: 'Nome da Igreja',
      logo: '',
      /** Font of every element that does not choose its own ('' = system font) */
      font: '',
    },
    pix: {
      mode: 'key',
      key: '',
      name: '',
      city: '',
      amount: '',
      txid: '',
      payload: '',
      /** Text shown beside the QR, e.g. "CNPJ 12.345.678/0001-90" ('' = the key) */
      display: '',
    },
    lower: {
      template: 'classic',
      fill: fill('#2463eb', '#4f46e5', 100),
      fill2: fill('#0f172a'),
      accent: fill('#fbbf24', '#f59e0b', 180),
      text1: '#ffffff',
      text2: '#e2e8f0',
      font: '',
      weight1: 800,
      weight2: 500,
      uppercase: false,
      size: 100,
      radius: 14,
      opacity: 100,
      shadow: 'soft',
      shadowStrength: 60,
      animation: 'slide',
      duration: 700,
      position: 'left',
      marginX: 90,
      marginY: 90,
      autoHide: 0,
      items: [
        {
          id: 'exemplo1',
          line1: 'Pr. João Silva',
          line2: 'Pastor presidente',
          logo: true,
          qr: 'none',
          qrText: '',
        },
        {
          id: 'exemplo2',
          line1: 'Dízimos e ofertas',
          line2: 'Aponte a câmera do celular para o QR Code',
          logo: false,
          qr: 'pix',
          qrText: '',
        },
      ] as LowerItem[],
    },
    top: {
      template: 'full',
      fill: fill('#0f172a', '#1e293b', 90),
      accent: fill('#2463eb', '#22d3ee', 90),
      text: '#ffffff',
      text2: '#cbd5e1',
      font: '',
      weight: 700,
      size: 100,
      radius: 18,
      opacity: 92,
      shadow: 'soft',
      shadowStrength: 50,
      animation: 'slide',
      duration: 700,
      margin: 28,
      showLogo: true,
      showName: true,
      showClock: true,
      clock12h: false,
      clockSeconds: false,
      showDate: false,
      showMessages: true,
      messages: ['Seja bem-vindo!', 'Culto ao vivo', 'Inscreva-se no canal e ative o sininho'],
      order: 'sequence',
      interval: 8,
      showQr: false,
      qr: 'pix',
      qrText: '',
    },
    card: {
      template: 'vertical',
      fill: fill('#ffffff'),
      accent: fill('#2463eb', '#7c3aed', 135),
      text: '#0f172a',
      text2: '#475569',
      font: '',
      weight: 800,
      size: 100,
      radius: 22,
      opacity: 100,
      shadow: 'soft',
      shadowStrength: 60,
      animation: 'rise',
      duration: 700,
      position: 'bottom-right',
      marginX: 70,
      marginY: 70,
      title: 'Dízimos e ofertas',
      subtitle: 'Aponte a câmera do celular',
      showKey: true,
      showLogo: true,
      qr: 'pix',
      qrText: '',
      qrRound: false,
      autoHide: 0,
    },
    bug: {
      position: 'top-right',
      size: 150,
      opacity: 90,
      marginX: 60,
      // Below a full-width top bar, so the two can be on air together.
      marginY: 130,
      shadow: 'soft',
      shadowStrength: 40,
      animation: 'fade',
      duration: 600,
    },
  };
}
export type Config = ReturnType<typeof defaults>;
export type ElementName = 'lower' | 'top' | 'card' | 'bug';
export const ELEMENTS: ElementName[] = ['lower', 'top', 'card', 'bug'];

export interface Live {
  lower: { on: boolean; item: string };
  top: { on: boolean };
  card: { on: boolean };
  bug: { on: boolean };
}
export const liveDefaults = (): Live => ({
  lower: { on: false, item: '' },
  top: { on: false },
  card: { on: false },
  bug: { on: false },
});

const HEX = /^#[0-9a-f]{6}$/i;
/** Number limits by field name; anything else keeps its type and is otherwise free. */
const RANGES: Record<string, [number, number]> = {
  size: [40, 250],
  radius: [0, 80],
  opacity: [0, 100],
  shadowStrength: [0, 100],
  duration: [100, 3000],
  marginX: [0, 900],
  marginY: [0, 500],
  margin: [0, 300],
  autoHide: [0, 3600],
  interval: [2, 600],
  weight: [100, 900],
  weight1: [100, 900],
  weight2: [100, 900],
  angle: [0, 360],
};
const CHOICES: Record<string, string[]> = {
  'lower.template': LOWER_TEMPLATES,
  'top.template': TOP_TEMPLATES,
  'card.template': CARD_TEMPLATES,
  animation: ANIMATIONS,
  shadow: SHADOWS,
  'lower.position': ['left', 'center', 'right'],
  'card.position': [...CORNERS, 'center-left', 'center-right', 'center'],
  'bug.position': CORNERS,
  'pix.mode': ['key', 'payload'],
  order: ['sequence', 'random'],
  qr: ['pix', 'url'],
  type: ['solid', 'gradient'],
};
const text = (v: unknown, max: number) =>
  String(v ?? '')
    .replace(/[\u0000-\u0008\u000b-\u001f]/g, '')
    .slice(0, max);

function cleanItem(raw: unknown): LowerItem | undefined {
  if (!raw || typeof raw !== 'object') return;
  const r = raw as Record<string, unknown>;
  const line1 = text(r.line1, 120).trim(),
    line2 = text(r.line2, 160).trim();
  if (!line1 && !line2) return;
  return {
    id: typeof r.id === 'string' && /^[a-z0-9]{4,20}$/i.test(r.id) ? r.id : newId(),
    line1,
    line2,
    logo: r.logo !== false,
    qr: r.qr === 'pix' || r.qr === 'url' ? r.qr : 'none',
    qrText: text(r.qrText, 600).trim(),
  };
}

/** Keeps only known fields with the right type and range; everything else falls back. */
function clean(def: unknown, raw: unknown, path: string, key: string): unknown {
  if (path === 'lower.items') {
    const seen = new Set<string>();
    return (Array.isArray(raw) ? raw : (def as unknown[]))
      .slice(0, 200)
      .map(cleanItem)
      .filter((i): i is LowerItem => !!i && !seen.has(i.id) && !!seen.add(i.id));
  }
  if (path === 'top.messages')
    return (Array.isArray(raw) ? raw : (def as unknown[]))
      .slice(0, 60)
      .map((m) => text(m, 200).trim())
      .filter(Boolean);
  if (def && typeof def === 'object') {
    const out: Record<string, unknown> = {},
      r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    for (const [k, v] of Object.entries(def)) out[k] = clean(v, r[k], path ? `${path}.${k}` : k, k);
    return out;
  }
  if (typeof def === 'boolean') return typeof raw === 'boolean' ? raw : def;
  if (typeof def === 'number') {
    const n = Number(raw);
    if (raw == null || raw === '' || !Number.isFinite(n)) return def;
    const [min, max] = RANGES[key] || [-1e6, 1e6];
    return Math.min(max, Math.max(min, Math.round(n)));
  }
  const choices = CHOICES[path] || CHOICES[key];
  if (choices) return choices.includes(String(raw)) ? String(raw) : def;
  if (typeof def === 'string' && HEX.test(def)) return HEX.test(String(raw)) ? String(raw) : def;
  if (key === 'logo')
    return /^\/media\/[a-f0-9]{16}\.(png|jpe?g|webp|gif|svg)$/.test(String(raw)) ? String(raw) : '';
  if (key === 'font')
    return text(raw, 80)
      .replace(/["';{}<>\\]/g, '')
      .trim();
  return typeof raw === 'string' ? text(raw, path === 'pix.payload' ? 1000 : 300) : def;
}

export function cleanConfig(raw: unknown): Config {
  return clean(defaults(), raw, '', '') as Config;
}

export function cleanLive(raw: unknown, config: Config): Live {
  const d = liveDefaults(),
    r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Live>;
  const item = String(r.lower?.item ?? '');
  return {
    lower: {
      on: !!r.lower?.on && config.lower.items.some((i) => i.id === item),
      item: config.lower.items.some((i) => i.id === item) ? item : d.lower.item,
    },
    top: { on: !!r.top?.on },
    card: { on: !!r.card?.on },
    bug: { on: !!r.bug?.on },
  };
}

/** Which lower third a command means: an id, a 1-based position, or next / prev. */
export function resolveItem(config: Config, live: Live, ref: string | undefined) {
  const items = config.lower.items;
  if (!items.length) return undefined;
  const current = items.findIndex((i) => i.id === live.lower.item);
  if (!ref) return items[Math.max(0, current)];
  if (ref === 'next') return items[(current + 1) % items.length];
  if (ref === 'prev') return items[(current - 1 + items.length) % items.length];
  const byId = items.find((i) => i.id === ref);
  if (byId) return byId;
  const n = Number(ref);
  return Number.isInteger(n) && n >= 1 && n <= items.length ? items[n - 1] : undefined;
}

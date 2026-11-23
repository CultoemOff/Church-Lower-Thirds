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
  'liquid',
];
export const TOP_TEMPLATES = ['full', 'large', 'slim', 'floating', 'islands', 'tab', 'liquid'];
export const CARD_TEMPLATES = ['vertical', 'horizontal', 'ticket', 'frame', 'liquid'];
export const TICKER_TEMPLATES = ['full', 'floating', 'minimal', 'liquid'];
export const AGENDA_TEMPLATES = ['card', 'banner', 'center', 'liquid'];
export const SOCIAL_TEMPLATES = ['pill', 'card', 'liquid'];
export const NETWORKS = [
  'instagram',
  'youtube',
  'facebook',
  'tiktok',
  'whatsapp',
  'x',
  'site',
  'other',
];
/** One day of the church's week: "Domingo" + its services, one per line. */
export interface AgendaDay {
  id: string;
  day: string;
  lines: string;
}
export interface SocialItem {
  id: string;
  network: string;
  label: string;
  handle: string;
  /** Optional image the church uploads to use instead of the built-in generic icon */
  icon: string;
}
/** A QR card saved in the dock to show again with one click. */
export interface SavedCard {
  id: string;
  title: string;
  subtitle: string;
  qr: 'pix' | 'url';
  qrText: string;
}
export const ANIMATIONS = ['slide', 'rise', 'fade', 'wipe', 'zoom', 'blur', 'bounce', 'flip'];
export const SHADOWS = ['none', 'soft', 'hard', 'glow'];
const CORNERS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
const PLACES = [...CORNERS, 'top-center', 'bottom-center', 'center-left', 'center-right', 'center'];

export const newId = () => randomBytes(5).toString('hex');

export function defaults() {
  return {
    brand: {
      name: 'Nome da Igreja',
      logo: '',
      /** Font of every element that does not choose its own ('' = system font) */
      font: '',
    },
    /** How long names and the QR card stay on screen, in seconds (0 = until hidden). */
    timing: { autoHide: 0 },
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
      /** Name typed in the dock and shown at once, without saving it to the list */
      quick: { id: 'quick', line1: '', line2: '', logo: true, qr: 'none', qrText: '' } as LowerItem,
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
      /** A message typed in the dock: shown alone until cleared ('' = rotate the list) */
      pinned: '',
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
      saved: [] as SavedCard[],
    },
    ticker: {
      template: 'full',
      fill: fill('#0f172a', '#1e293b', 90),
      accent: fill('#2463eb', '#22d3ee', 90),
      text: '#ffffff',
      font: '',
      weight: 600,
      size: 100,
      radius: 18,
      opacity: 92,
      shadow: 'soft',
      shadowStrength: 40,
      animation: 'slide',
      duration: 700,
      margin: 28,
      /** Pixels per second */
      speed: 110,
      showLabel: true,
      label: 'Avisos',
      showLogo: false,
      showClock: false,
      separator: '•',
      messages: [
        'Culto de celebração aos domingos, às 18h',
        'Estudo bíblico às quartas, às 19h30',
        'Siga a igreja nas redes sociais',
      ],
      pinned: '',
    },
    agenda: {
      template: 'card',
      fill: fill('#0f172a', '#1e293b', 160),
      accent: fill('#2463eb', '#22d3ee', 90),
      text: '#ffffff',
      text2: '#cbd5e1',
      font: '',
      weight: 800,
      size: 100,
      radius: 24,
      opacity: 94,
      shadow: 'soft',
      shadowStrength: 60,
      animation: 'rise',
      duration: 700,
      position: 'center-right',
      marginX: 80,
      marginY: 80,
      title: 'Programação',
      showLogo: true,
      /** Seconds each day stays on screen */
      seconds: 7,
      /** false: leaves the screen after the last day */
      loop: false,
      days: [
        { id: 'dia1', day: 'Domingo', lines: '9h · Escola Bíblica\n18h · Culto de Celebração' },
        { id: 'dia2', day: 'Quarta-feira', lines: '19h30 · Estudo Bíblico' },
        { id: 'dia3', day: 'Sábado', lines: '19h30 · Culto de Jovens' },
      ] as AgendaDay[],
    },
    social: {
      template: 'pill',
      fill: fill('#ffffff'),
      accent: fill('#db2777', '#f59e0b', 45),
      text: '#0f172a',
      text2: '#475569',
      font: '',
      weight: 800,
      size: 100,
      radius: 22,
      opacity: 100,
      shadow: 'soft',
      shadowStrength: 60,
      animation: 'bounce',
      duration: 800,
      position: 'bottom-right',
      marginX: 80,
      marginY: 90,
      prefix: 'Siga-nos no',
      items: [
        { id: 'rede1', network: 'instagram', label: 'Instagram', handle: '@suaigreja', icon: '' },
        { id: 'rede2', network: 'youtube', label: 'YouTube', handle: '@suaigreja', icon: '' },
      ] as SocialItem[],
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
export type ElementName = 'lower' | 'top' | 'card' | 'bug' | 'ticker' | 'agenda' | 'social';
export const ELEMENTS: ElementName[] = [
  'lower',
  'top',
  'card',
  'bug',
  'ticker',
  'agenda',
  'social',
];

export interface Live {
  lower: { on: boolean; item: string };
  top: { on: boolean };
  card: { on: boolean };
  bug: { on: boolean };
  ticker: { on: boolean };
  agenda: { on: boolean };
  social: { on: boolean; item: string };
}
export const liveDefaults = (): Live => ({
  lower: { on: false, item: '' },
  top: { on: false },
  card: { on: false },
  bug: { on: false },
  ticker: { on: false },
  agenda: { on: false },
  social: { on: false, item: '' },
});

const HEX = /^#[0-9a-f]{6}$/i;
const MEDIA = /^\/media\/[a-f0-9]{16}\.(png|jpe?g|webp|gif|svg)$/;
const id = (v: unknown) => (typeof v === 'string' && /^[a-z0-9]{4,20}$/i.test(v) ? v : newId());
/** A list of records: each cleaned by `one`, empty ones dropped, ids unique. */
function list<T extends { id: string }>(
  raw: unknown,
  def: unknown,
  max: number,
  one: (r: Record<string, unknown>) => T | undefined,
) {
  const seen = new Set<string>();
  return (Array.isArray(raw) ? raw : (def as unknown[]))
    .slice(0, max)
    .map((r) => (r && typeof r === 'object' ? one(r as Record<string, unknown>) : undefined))
    .filter((r): r is T => !!r && !seen.has(r.id) && !!seen.add(r.id));
}
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
  speed: [20, 600],
  seconds: [2, 120],
  weight: [100, 900],
  weight1: [100, 900],
  weight2: [100, 900],
  angle: [0, 360],
};
const CHOICES: Record<string, string[]> = {
  'lower.template': LOWER_TEMPLATES,
  'top.template': TOP_TEMPLATES,
  'card.template': CARD_TEMPLATES,
  'ticker.template': TICKER_TEMPLATES,
  'agenda.template': AGENDA_TEMPLATES,
  'social.template': SOCIAL_TEMPLATES,
  animation: ANIMATIONS,
  shadow: SHADOWS,
  'lower.position': ['left', 'center', 'right'],
  'card.position': PLACES,
  'agenda.position': PLACES,
  'social.position': PLACES,
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

function cleanItem(raw: unknown, allowEmpty = false): LowerItem | undefined {
  if (!raw || typeof raw !== 'object') return;
  const r = raw as Record<string, unknown>;
  const line1 = text(r.line1, 120).trim(),
    line2 = text(r.line2, 160).trim();
  if (!line1 && !line2 && !allowEmpty) return;
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
      .map((i) => cleanItem(i))
      .filter((i): i is LowerItem => !!i && !seen.has(i.id) && !!seen.add(i.id));
  }
  if (path === 'lower.quick')
    return { ...(cleanItem(raw, true) ?? (def as LowerItem)), id: 'quick' };
  if (path === 'card.saved') {
    const seen = new Set<string>();
    return (Array.isArray(raw) ? raw : [])
      .slice(0, 60)
      .map((r): SavedCard | undefined => {
        if (!r || typeof r !== 'object') return;
        const c: SavedCard = {
          id: typeof r.id === 'string' && /^[a-z0-9]{4,20}$/i.test(r.id) ? r.id : newId(),
          title: text(r.title, 60).trim(),
          subtitle: text(r.subtitle, 90).trim(),
          qr: r.qr === 'url' ? 'url' : 'pix',
          qrText: text(r.qrText, 600).trim(),
        };
        return c.title || c.qrText ? c : undefined;
      })
      .filter((c): c is SavedCard => !!c && !seen.has(c.id) && !!seen.add(c.id));
  }
  if (path === 'agenda.days')
    return list<AgendaDay>(raw, def, 14, (r) => {
      const d = {
        id: id(r.id),
        day: text(r.day, 40).trim(),
        lines: text(r.lines, 400)
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean)
          .slice(0, 6)
          .join('\n'),
      };
      return d.day || d.lines ? d : undefined;
    });
  if (path === 'social.items')
    return list<SocialItem>(raw, def, 12, (r) => {
      const network = NETWORKS.includes(String(r.network)) ? String(r.network) : 'other';
      const handle = text(r.handle, 80).trim();
      return handle
        ? {
            id: id(r.id),
            network,
            label: text(r.label, 30).trim(),
            handle,
            icon: MEDIA.test(String(r.icon)) ? String(r.icon) : '',
          }
        : undefined;
    });
  if (path === 'top.messages' || path === 'ticker.messages')
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
  if (key === 'logo') return MEDIA.test(String(raw)) ? String(raw) : '';
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
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Live>;
  const item = String(r.lower?.item ?? '');
  const exists = !!findItem(config, item);
  return {
    lower: { on: !!r.lower?.on && exists, item: exists ? item : '' },
    top: { on: !!r.top?.on },
    card: { on: !!r.card?.on },
    bug: { on: !!r.bug?.on },
    ticker: { on: !!r.ticker?.on },
    agenda: { on: !!r.agenda?.on && config.agenda.days.length > 0 },
    social: (() => {
      const found = config.social.items.some((i) => i.id === r.social?.item);
      return { on: !!r.social?.on && found, item: found ? String(r.social?.item) : '' };
    })(),
  };
}

/** A saved name by id, or the one typed in the dock ("quick") while it has text. */
export function findItem(config: Config, id: string) {
  if (id === 'quick') {
    const q = config.lower.quick;
    return q.line1 || q.line2 ? q : undefined;
  }
  return config.lower.items.find((i) => i.id === id);
}

/** Which lower third a command means: an id, a 1-based position, or next / prev. */
export function resolveItem(config: Config, live: Live, ref: string | undefined) {
  const items = config.lower.items;
  if (ref === 'quick') return findItem(config, 'quick');
  if (!items.length) return undefined;
  const current = items.findIndex((i) => i.id === live.lower.item);
  if (!ref) return findItem(config, live.lower.item) ?? items[0];
  if (ref === 'next') return items[(current + 1) % items.length];
  if (ref === 'prev') return items[(current - 1 + items.length) % items.length];
  const byId = items.find((i) => i.id === ref);
  if (byId) return byId;
  const n = Number(ref);
  return Number.isInteger(n) && n >= 1 && n <= items.length ? items[n - 1] : undefined;
}

/** Which social network a command means: an id, a 1-based position, or the current one. */
export function resolveSocial(config: Config, live: Live, ref: string | undefined) {
  const items = config.social.items;
  if (!ref) return items.find((i) => i.id === live.social.item) ?? items[0];
  const n = Number(ref);
  return (
    items.find((i) => i.id === ref) ?? (Number.isInteger(n) && n >= 1 ? items[n - 1] : undefined)
  );
}

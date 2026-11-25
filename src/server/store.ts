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
  /** 'giving' = the church's contribution QR, whatever method is configured; 'url' = any link */
  qr: 'none' | 'giving' | 'url';
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
export const TICKER_TEMPLATES = ['full', 'floating', 'minimal', 'liquid'];
export const AGENDA_TEMPLATES = ['card', 'banner', 'center', 'liquid'];
export const COMMENT_TEMPLATES = ['bubble', 'card', 'liquid', 'youth', 'kids', 'floral'];
export const COUNTDOWN_TEMPLATES = ['card', 'bar', 'big', 'liquid'];
export const SOCIAL_TEMPLATES = ['pill', 'card', 'liquid', 'plaque', 'youth', 'kids', 'floral'];
export const NETWORKS = [
  'instagram',
  'youtube',
  'facebook',
  'tiktok',
  'whatsapp',
  'x',
  'site',
  'address',
  'phone',
  'email',
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
  /** Own phrase for this item ('' = the general text + the network's name) */
  text: string;
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
  /** giving = the church's main way; pixkey = another PIX key (qrText); url = a link or text */
  qr: 'giving' | 'pixkey' | 'url';
  qrText: string;
}
export interface SavedComment {
  id: string;
  user: string;
  text: string;
}
/**
 * One step of the order of service: what goes on screen at that moment. `ref` says which
 * saved name, offering, comment or network ('' where the element has only one content).
 */
export const STEP_KINDS = [
  'lower',
  'card',
  'comment',
  'social',
  'agenda',
  'countdown',
  'hide',
] as const;
export interface RundownStep {
  id: string;
  kind: (typeof STEP_KINDS)[number];
  ref: string;
  /** A reminder for the operator ("after the second song"), shown in the dock. */
  note: string;
}
const GIVING_METHODS = ['pix', 'app', 'sepa', 'link', 'image', 'text'];
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
const DECORS = [
  '',
  'none',
  'flowers',
  'rings',
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
const CORNERS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
const PLACES = [...CORNERS, 'top-center', 'bottom-center', 'center-left', 'center-right', 'center'];

/** Free placement: where the element was dragged to (top-left corner, 1920x1080 stage). */
const free = () => ({ free: false, x: 0, y: 0, vfree: false, vx: 0, vy: 0 });
export const LANGUAGES = ['pt-BR', 'pt-PT', 'es', 'en', 'it', 'de'];
const RESOLUTIONS = ['1280x720', '1920x1080', '2560x1440', '3840x2160'];
const VERTICAL_RESOLUTIONS = ['720x1280', '1080x1920', '1440x2560', '2160x3840'];

export const newId = () => randomBytes(5).toString('hex');

/**
 * A model the church made itself (usually with the help of an AI): a name and the CSS that
 * draws the elements it covers. An element on it has the template "custom".
 */
export type CustomModel = { id: string; name: string; css: string };
export const CUSTOM = 'custom';
const CUSTOM_ELEMENTS = [
  'lower',
  'top',
  'ticker',
  'card',
  'agenda',
  'social',
  'comment',
  'countdown',
] as const;
/** The elements a custom CSS draws: the ones some selector of it starts with. */
export function customCovers(css: string) {
  const plain = css.replace(/\/\*[\s\S]*?\*\//g, ' ');
  return CUSTOM_ELEMENTS.filter((el) =>
    new RegExp(`(^|[,{}])\\s*\\.(?:el\\.)?${el}(?![\\w-])`).test(plain),
  );
}

export function defaults() {
  return {
    brand: {
      name: 'Nome da Igreja',
      logo: '',
      /** Font of every element that does not choose its own ('' = system font) */
      font: '',
    },
    /** Language of the panels and of dates on screen: 'auto' follows the computer. */
    language: 'auto',
    /** Size typed in OBS for the browser sources (the graphics scale to any of them). */
    output: { horizontal: '1920x1080', vertical: '1080x1920' },
    /** Categories switched off here leave the OBS dock and cannot go on air. */
    enabled: {
      lower: true,
      top: true,
      ticker: true,
      card: true,
      agenda: true,
      social: true,
      comment: true,
      countdown: true,
      bug: true,
    },
    /** How long names and the QR card stay on screen, in seconds (0 = until hidden). */
    /** Seconds names, QR card, schedule and social stay on screen (0 = until hidden). */
    timing: { autoHide: 10 },
    /** The setup assistant opens by itself until the person finishes or closes it. */
    setupDone: false,
    /**
     * The global look. Every element follows it unless it is switched to its own
     * appearance (`custom`): main = the name bar, surface = the background of the corner
     * badge, bottom bar, card, schedule and social, accent = the details of all of them.
     */
    theme: {
      main: fill('#2463eb', '#4f46e5', 100),
      surface: fill('#0f172a', '#1e293b', 90),
      accent: fill('#fbbf24', '#f59e0b', 180),
      text1: '#ffffff',
      text2: '#e2e8f0',
      radius: 18,
      opacity: 94,
      shadow: 'soft',
      shadowStrength: 55,
      /** The drawing of the themed models: '' = the usual one of each model, 'none', or a set. */
      decor: '',
      /**
       * Liquid glass on any model: the plates become clear, blur what is behind them and
       * get a bright rim. The ready-made glass colors switch it on.
       */
      glass: false,
      /** The custom model in use ('' = none): its CSS draws the elements on "custom". */
      custom: '',
      /**
       * The ready-made colors the model in use suggested ('' = not known). While the theme
       * still has them, another model brings its own; colors chosen by the user stay.
       */
      suggested: '',
    },
    pix: {
      mode: 'key',
      key: '',
      name: '',
      city: '',
      amount: '',
      txid: '',
      payload: '',
    },
    /**
     * How people contribute. PIX only exists in Brazil; other countries have their own
     * phone-number apps (`app`: the church writes the app's name and the number, code or
     * e-mail that receives). The QR can also come from a SEPA transfer (euro area), any link
     * (giving page, payment service), or a QR image the bank or app gave the church; "text"
     * shows only the bank details, without a QR.
     */
    giving: {
      method: 'pix',
      link: '',
      image: '',
      app: { name: '', id: '' },
      sepa: { name: '', iban: '', bic: '', amount: '', reference: '' },
      /** Shown beside the QR, one item per line: bank, branch, account, IBAN, document… */
      details: '',
    },
    lower: {
      /** false = follows the global theme; true = uses the colors, font and effects below */
      custom: false,
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
      ...free(),
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
          qr: 'giving',
          qrText: '',
        },
      ] as LowerItem[],
    },
    // The corner badge: logo, church name, a message, "AO VIVO" and the time, each optional.
    top: {
      /** false = follows the global theme; true = uses the colors, font and effects below */
      custom: false,
      template: 'bar',
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
      position: 'top-left',
      marginX: 50,
      marginY: 40,
      ...free(),
      showLogo: true,
      showName: true,
      showLive: true,
      liveText: 'AO VIVO',
      showClock: true,
      clock12h: false,
      clockSeconds: false,
      showDate: false,
      showWeekday: false,
      /** short = "ter, 24 nov"; long = "terça-feira, 24 de novembro"; numeric = "24/11/2026" */
      dateStyle: 'short',
      showMessages: false,
      messages: ['Seja bem-vindo!', 'Culto ao vivo', 'Inscreva-se no canal e ative o sininho'],
      /** A message typed in the dock: shown alone until cleared ('' = rotate the list) */
      pinned: '',
      order: 'sequence',
      interval: 8,
    },
    card: {
      /** false = follows the global theme; true = uses the colors, font and effects below */
      custom: false,
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
      ...free(),
      title: 'Dízimos e ofertas',
      subtitle: 'Aponte a câmera do celular',
      showKey: true,
      showLogo: true,
      qr: 'giving',
      qrText: '',
      qrRound: false,
      saved: [] as SavedCard[],
    },
    ticker: {
      /** false = follows the global theme; true = uses the colors, font and effects below */
      custom: false,
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
      /** false = follows the global theme; true = uses the colors, font and effects below */
      custom: false,
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
      ...free(),
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
      /** false = follows the global theme; true = uses the colors, font and effects below */
      custom: false,
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
      ...free(),
      prefix: 'Siga-nos no',
      /** Showing all in sequence: seconds each one stays, the 01 / 03 counter, the time line */
      seconds: 8,
      counter: true,
      progress: true,
      items: [
        {
          id: 'rede1',
          network: 'instagram',
          label: 'Instagram',
          handle: '@suaigreja',
          text: '',
          icon: '',
        },
        {
          id: 'rede2',
          network: 'youtube',
          label: 'YouTube',
          handle: '@suaigreja',
          text: '',
          icon: '',
        },
      ] as SocialItem[],
    },
    /** A comment typed by hand (from the chat, a message…): who wrote it and what it says. */
    comment: {
      /** false = follows the global theme; true = uses the colors, font and effects below */
      custom: false,
      template: 'bubble',
      fill: fill('#0f172a', '#1e293b', 90),
      accent: fill('#fbbf24', '#f59e0b', 180),
      text: '#ffffff',
      text2: '#e2e8f0',
      font: '',
      weight: 700,
      size: 100,
      radius: 22,
      opacity: 96,
      shadow: 'soft',
      shadowStrength: 60,
      animation: 'rise',
      duration: 600,
      position: 'bottom-left',
      marginX: 90,
      marginY: 250,
      ...free(),
      showIcon: true,
      /** On air now: who wrote it and what was said */
      user: '',
      said: '',
      saved: [] as SavedComment[],
    },
    /** A countdown: "the service starts in 05:00". */
    countdown: {
      /** false = follows the global theme; true = uses the colors, font and effects below */
      custom: false,
      template: 'card',
      fill: fill('#0f172a', '#1e293b', 90),
      accent: fill('#fbbf24', '#f59e0b', 180),
      text: '#ffffff',
      text2: '#e2e8f0',
      font: '',
      weight: 800,
      size: 100,
      radius: 22,
      opacity: 96,
      shadow: 'soft',
      shadowStrength: 60,
      animation: 'rise',
      duration: 600,
      position: 'center',
      marginX: 90,
      marginY: 90,
      ...free(),
      title: 'O culto começa em',
      /** duration = counts `minutes` from the moment it is shown; clock = until `time` today */
      mode: 'duration',
      minutes: 5,
      time: '19:30',
      /** What takes the place of the numbers at zero ('' = stays at 00:00) */
      endText: 'Já vamos começar',
      /** Leaves by itself a few seconds after reaching zero */
      hideAtEnd: true,
    },
    /** The order of service: steps the operator walks through with "Next" in the dock. */
    rundown: [] as RundownStep[],
    bug: {
      position: 'top-right',
      size: 150,
      opacity: 90,
      marginX: 60,
      marginY: 50,
      ...free(),
      shadow: 'soft',
      shadowStrength: 40,
      animation: 'fade',
      duration: 600,
    },
    /**
     * Service profiles ("Perfil 1", "Natal"…): each one keeps a complete look (model,
     * colors, fonts, logo, places, what the badge shows). `profile` is the one in use; its
     * look is the configuration itself, and is put away into the list when another one is
     * chosen. Names, notices, schedule and giving are the same in every profile.
     */
    profile: 'padrao',
    profiles: [] as Profile[],
    /** Models made by the church; `theme.custom` says which one is in use. */
    customModels: [] as CustomModel[],
  };
}
export interface Profile {
  id: string;
  name: string;
  /**
   * What the profile holds. With `full`, everything that belongs to a church or an event:
   * its name and logo, the look, the names, offerings, texts, schedule, networks, the way
   * of giving and the order of service. Without it, only the look (profiles from before
   * this, and the ones that come in a shared file): the rest is taken from whatever is in
   * use the first time the profile is used, and from then on it is the profile's own.
   */
  look: Record<string, unknown>;
  full: boolean;
}
export type Config = ReturnType<typeof defaults>;
export type ElementName =
  'lower' | 'top' | 'card' | 'bug' | 'ticker' | 'agenda' | 'social' | 'comment' | 'countdown';
export const ELEMENTS: ElementName[] = [
  'lower',
  'top',
  'card',
  'bug',
  'ticker',
  'agenda',
  'social',
  'comment',
  'countdown',
];

export interface Live {
  /** pin: stays on screen when the global time ends, until hidden by hand */
  lower: { on: boolean; item: string; pin: boolean };
  top: { on: boolean };
  card: { on: boolean; pin: boolean };
  bug: { on: boolean };
  ticker: { on: boolean };
  agenda: { on: boolean; pin: boolean };
  social: { on: boolean; item: string; pin: boolean };
  comment: { on: boolean; pin: boolean };
  /** until: when it reaches zero (ms since 1970), set at the moment it is shown */
  countdown: { on: boolean; until: number };
  /** The step of the order of service that was run last ('' = none yet). */
  step: string;
}
/** Elements that leave by themselves, and so can be pinned. */
export const TIMED = ['lower', 'card', 'agenda', 'social', 'comment'] as const;
export const liveDefaults = (): Live => ({
  lower: { on: false, item: '', pin: false },
  top: { on: false },
  card: { on: false, pin: false },
  bug: { on: false },
  ticker: { on: false },
  agenda: { on: false, pin: false },
  social: { on: false, item: '', pin: false },
  comment: { on: false, pin: false },
  countdown: { on: false, until: 0 },
  step: '',
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
  x: [-400, 1900],
  y: [-300, 1060],
  vx: [-400, 1060],
  vy: [-300, 1900],
  weight: [100, 900],
  weight1: [100, 900],
  weight2: [100, 900],
  angle: [0, 360],
  minutes: [1, 600],
};
const CHOICES: Record<string, string[]> = {
  'lower.template': [...LOWER_TEMPLATES, CUSTOM],
  'top.template': [...TOP_TEMPLATES, CUSTOM],
  'card.template': [...CARD_TEMPLATES, CUSTOM],
  'ticker.template': [...TICKER_TEMPLATES, CUSTOM],
  'agenda.template': [...AGENDA_TEMPLATES, CUSTOM],
  'social.template': [...SOCIAL_TEMPLATES, CUSTOM],
  'comment.template': [...COMMENT_TEMPLATES, CUSTOM],
  'comment.position': PLACES,
  'countdown.template': [...COUNTDOWN_TEMPLATES, CUSTOM],
  'countdown.position': PLACES,
  'countdown.mode': ['duration', 'clock'],
  'card.qr': ['giving', 'pixkey', 'url'],
  animation: ANIMATIONS,
  shadow: SHADOWS,
  'top.dateStyle': ['short', 'long', 'numeric'],
  'theme.decor': DECORS,
  'lower.position': ['left', 'center', 'right'],
  'card.position': PLACES,
  'top.position': PLACES,
  'agenda.position': PLACES,
  'social.position': PLACES,
  'bug.position': CORNERS,
  'pix.mode': ['key', 'payload'],
  'giving.method': GIVING_METHODS,
  language: ['auto', ...LANGUAGES],
  horizontal: RESOLUTIONS,
  vertical: VERTICAL_RESOLUTIONS,
  order: ['sequence', 'random'],
  qr: ['giving', 'url'],
  type: ['solid', 'gradient'],
};
/** Stored by versions that only knew PIX. */
const qrKind = (v: unknown) => (v === 'pix' ? 'giving' : v);
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
    qr: qrKind(r.qr) === 'giving' ? 'giving' : r.qr === 'url' ? 'url' : 'none',
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
          qr: r.qr === 'url' || r.qr === 'pixkey' ? r.qr : 'giving',
          qrText: text(r.qrText, 600).trim(),
        };
        return c.title || c.qrText ? c : undefined;
      })
      .filter((c): c is SavedCard => !!c && !seen.has(c.id) && !!seen.add(c.id));
  }
  if (path === 'rundown')
    return list<RundownStep>(raw, def, 80, (r) => {
      const kind = STEP_KINDS.find((k) => k === r.kind);
      return kind
        ? { id: id(r.id), kind, ref: text(r.ref, 20).trim(), note: text(r.note, 80).trim() }
        : undefined;
    });
  if (path === 'comment.saved')
    return list<SavedComment>(raw, def, 60, (r) => {
      const c = { id: id(r.id), user: text(r.user, 60).trim(), text: text(r.text, 280).trim() };
      return c.text ? c : undefined;
    });
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
            text: text(r.text, 80).trim(),
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
  if (choices) {
    const value = String(key === 'qr' ? qrKind(raw) : raw);
    return choices.includes(value) ? value : def;
  }
  if (path === 'giving.image') return MEDIA.test(String(raw)) ? String(raw) : '';
  if (path === 'giving.details')
    return text(raw, 400)
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 6)
      .join('\n');
  if (typeof def === 'string' && HEX.test(def)) return HEX.test(String(raw)) ? String(raw) : def;
  if (key === 'logo') return MEDIA.test(String(raw)) ? String(raw) : '';
  if (key === 'font')
    return text(raw, 80)
      .replace(/["';{}<>\\]/g, '')
      .trim();
  const max = path === 'pix.payload' || path === 'giving.link' ? 1000 : 300;
  return typeof raw === 'string' ? text(raw, max) : def;
}

export function cleanConfig(raw: unknown): Config {
  const config = clean(defaults(), raw, '', '') as Config;
  // Versions that only knew PIX kept the text shown beside the QR in pix.display.
  const old = (raw as { pix?: { display?: unknown }; giving?: unknown } | null) ?? {};
  if (!old.giving && typeof old.pix?.display === 'string')
    config.giving.details = text(old.pix.display, 300).trim();
  // "Date under the time" used to bring the day of the week with it; now each has its switch.
  const top = (raw as { top?: { showDate?: unknown; showWeekday?: unknown } } | null)?.top;
  if (top?.showDate === true && top.showWeekday === undefined) config.top.showWeekday = true;
  const saved = raw as { profile?: unknown; profiles?: unknown } | null;
  config.profiles = (Array.isArray(saved?.profiles) ? saved.profiles : [])
    .slice(0, 30)
    .map((p): Profile | undefined => {
      if (!p || typeof p !== 'object') return;
      let name = text(p.name, 40).trim();
      if (!name) return;
      // The first profile used to be called "Culto padrão": untouched, it takes today's name.
      if (p.id === 'padrao' && name === 'Culto padrão') name = FIRST_PROFILE;
      return {
        id: typeof p.id === 'string' && /^[a-z0-9]{4,20}$/i.test(p.id) ? p.id : newId(),
        name,
        // Checked like the settings themselves.
        look: (p.full === true ? takeData : takeLook)(clean(defaults(), p.look, '', '') as Config),
        full: p.full === true,
      };
    })
    .filter((p, i, all): p is Profile => !!p && all.findIndex((o) => o?.id === p.id) === i);
  config.profile = typeof saved?.profile === 'string' ? saved.profile : '';
  const models = (raw as { customModels?: unknown } | null)?.customModels;
  config.customModels = (Array.isArray(models) ? models : [])
    .slice(0, 40)
    .map((m): CustomModel | undefined => {
      if (!m || typeof m !== 'object') return;
      const name = text(m.name, 40).trim(),
        // CSS and nothing else: no tag can start in it. The overlay still goes through it
        // rule by rule before using it (js/custom.js).
        css = typeof m.css === 'string' ? m.css.slice(0, 60000).replace(/[<\u0000]/g, '') : '';
      if (!name || !css.trim()) return;
      return { id: id(m.id), name, css };
    })
    .filter((m, i, all): m is CustomModel => !!m && all.findIndex((o) => o?.id === m.id) === i);
  // An element can only be on "custom" while the model in use draws it.
  const model = config.customModels.find((m) => m.id === config.theme.custom);
  if (!model) config.theme.custom = '';
  const covered: string[] = model ? customCovers(model.css) : [];
  const usual = defaults();
  for (const el of CUSTOM_ELEMENTS)
    if (config[el].template === CUSTOM && !covered.includes(el))
      config[el].template = usual[el].template;
  return withProfiles(config);
}

// ---- Service profiles ----
// The look is one part of a profile; these are the texts and lists of each element, which
// a shared file leaves out (they are the church's own).
const CONTENT: Record<ElementName, string[]> = {
  lower: ['items', 'quick'],
  top: ['messages', 'pinned', 'liveText', 'order', 'interval'],
  card: ['title', 'subtitle', 'qr', 'qrText', 'saved'],
  ticker: ['messages', 'pinned', 'label'],
  agenda: ['title', 'days'],
  social: ['items', 'prefix'],
  comment: ['user', 'said', 'saved'],
  countdown: ['title', 'mode', 'minutes', 'time', 'endText', 'hideAtEnd'],
  bug: [],
};
/** The look of a configuration: logo, font, theme and the appearance of every element. */
export function takeLook(config: Config): Profile['look'] {
  const look: Profile['look'] = {
    brand: { logo: config.brand.logo, font: config.brand.font },
    theme: structuredClone(config.theme),
  };
  for (const el of ELEMENTS)
    look[el] = structuredClone(
      Object.fromEntries(Object.entries(config[el]).filter(([k]) => !CONTENT[el].includes(k))),
    );
  return look;
}
// Everything a profile keeps apart from the others. What stays the same for the whole
// program: the language, the sizes of the OBS sources, the custom models (a library the
// profiles point at) and the list of profiles itself.
const PROFILE_PARTS = [
  'brand',
  'enabled',
  'timing',
  'theme',
  'pix',
  'giving',
  ...ELEMENTS,
  'rundown',
] as const;
/** All the data of the profile in use, as it is now. */
export function takeData(config: Config): Profile['look'] {
  return Object.fromEntries(PROFILE_PARTS.map((part) => [part, structuredClone(config[part])]));
}
/** Puts on what a profile holds; the parts it does not have stay as they are. */
function putLook(config: Config, look: Profile['look']) {
  const c = config as unknown as Record<string, unknown>;
  for (const part of PROFILE_PARTS) {
    const values = structuredClone(look[part]);
    if (Array.isArray(values)) c[part] = values;
    else if (values && typeof values === 'object') Object.assign(c[part] as object, values);
  }
}
/** The name the first profile starts with; the person renames it as they like. */
const FIRST_PROFILE = 'Perfil 1';
/** There is always at least one profile, and the one in use is one of them. */
function withProfiles(config: Config): Config {
  if (!config.profiles.length)
    config.profiles = [{ id: 'padrao', name: FIRST_PROFILE, look: takeData(config), full: true }];
  if (!config.profiles.some((p) => p.id === config.profile)) config.profile = config.profiles[0].id;
  return config;
}
/** Finds a profile by id, by name (any case) or by its position (1 = first). */
export function findProfile(config: Config, ref: string) {
  const r = ref.trim().toLowerCase();
  return (
    config.profiles.find((p) => p.id === ref) ||
    config.profiles.find((p) => p.name.toLowerCase() === r) ||
    (/^\d+$/.test(r) ? config.profiles[Number(r) - 1] : undefined)
  );
}
/** Changes to another profile: what is in use is put away first, then the other is put on. */
export function useProfile(config: Config, ref: string): Config {
  const target = findProfile(config, ref);
  if (!target) throw new Error('Profile not found');
  if (target.id === config.profile) return config;
  const next = structuredClone(config);
  const current = next.profiles.find((p) => p.id === next.profile);
  if (current) Object.assign(current, { look: takeData(next), full: true });
  putLook(next, next.profiles.find((p) => p.id === target.id)!.look);
  next.profile = target.id;
  return cleanConfig(next);
}
/** A new profile, a copy of everything in use, which becomes the one in use. */
export function addProfile(config: Config, name: unknown): Config {
  const clean = text(name, 40).trim();
  if (!clean) throw new Error('Type a name for the profile');
  if (config.profiles.length >= 30) throw new Error('Too many profiles');
  const next = structuredClone(config);
  const current = next.profiles.find((p) => p.id === next.profile);
  if (current) Object.assign(current, { look: takeData(next), full: true });
  const id = newId();
  next.profiles.push({ id, name: clean, look: takeData(next), full: true });
  next.profile = id;
  return cleanConfig(next);
}
/** Removes a profile; the last one stays, and removing the one in use moves to another. */
export function removeProfile(config: Config, ref: string): Config {
  const target = findProfile(config, ref);
  if (!target) throw new Error('Profile not found');
  if (config.profiles.length < 2) throw new Error('The last profile cannot be removed');
  let next = config;
  if (target.id === config.profile)
    next = useProfile(config, config.profiles.find((p) => p.id !== target.id)!.id);
  next = structuredClone(next);
  next.profiles = next.profiles.filter((p) => p.id !== target.id);
  return cleanConfig(next);
}

export function cleanLive(raw: unknown, config: Config): Live {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Live>;
  const item = String(r.lower?.item ?? '');
  const exists = !!findItem(config, item);
  const ok = config.enabled;
  return {
    lower: {
      on: ok.lower && !!r.lower?.on && exists,
      item: exists ? item : '',
      pin: !!r.lower?.pin,
    },
    top: { on: ok.top && !!r.top?.on },
    card: { on: ok.card && !!r.card?.on, pin: !!r.card?.pin },
    bug: { on: ok.bug && !!r.bug?.on },
    ticker: { on: ok.ticker && !!r.ticker?.on },
    agenda: {
      on: ok.agenda && !!r.agenda?.on && config.agenda.days.length > 0,
      pin: !!r.agenda?.pin,
    },
    social: (() => {
      // "all" = every item in sequence.
      const found =
        r.social?.item === ALL
          ? config.social.items.length > 0
          : config.social.items.some((i) => i.id === r.social?.item);
      return {
        on: ok.social && !!r.social?.on && found,
        item: found ? String(r.social?.item) : '',
        pin: !!r.social?.pin,
      };
    })(),
    comment: {
      on: ok.comment && !!r.comment?.on && !!config.comment.said.trim(),
      pin: !!r.comment?.pin,
    },
    countdown: {
      on: ok.countdown && !!r.countdown?.on,
      until: Number.isFinite(r.countdown?.until) ? Number(r.countdown?.until) : 0,
    },
    step: config.rundown.some((x) => x.id === r.step) ? String(r.step) : '',
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

/** In place of one item's id: all of them, one after the other. */
export const ALL = 'all';
/**
 * Which social network a command means: an id, a 1-based position, "all" (every one in
 * sequence) or the current one.
 */
export function resolveSocial(config: Config, live: Live, ref: string | undefined) {
  const items = config.social.items;
  const all = items.length ? ({ id: ALL } as SocialItem) : undefined;
  if (ref === ALL || (!ref && live.social.item === ALL)) return all;
  if (!ref) return items.find((i) => i.id === live.social.item) ?? items[0];
  const n = Number(ref);
  return (
    items.find((i) => i.id === ref) ?? (Number.isInteger(n) && n >= 1 ? items[n - 1] : undefined)
  );
}

/** Sample texts of a new installation, in the language chosen in the installer. */
const SAMPLES: Record<string, Record<string, unknown>> = {
  en: {
    church: 'Church Name',
    person: ['Pastor John Smith', 'Senior pastor'],
    giving: ['Tithes and offerings', 'Point your phone camera at the QR code'],
    top: ['Welcome!', 'Live service', 'Subscribe to the channel'],
    live: 'LIVE',
    card: ['Tithes and offerings', 'Point your phone camera'],
    ticker: [
      'Sunday celebration service at 6 pm',
      'Bible study on Wednesdays at 7:30 pm',
      'Follow the church on social media',
    ],
    label: 'Notices',
    agenda: 'Schedule',
    days: [
      ['Sunday', '9 am · Sunday School\n6 pm · Celebration Service'],
      ['Wednesday', '7:30 pm · Bible Study'],
      ['Saturday', '7:30 pm · Youth Service'],
    ],
    social: 'Follow us on',
    handle: '@yourchurch',
  },
  es: {
    church: 'Nombre de la Iglesia',
    person: ['Pr. Juan Silva', 'Pastor principal'],
    giving: ['Diezmos y ofrendas', 'Apunte la cámara del móvil al código QR'],
    top: ['¡Bienvenidos!', 'Culto en vivo', 'Suscríbase al canal'],
    live: 'EN VIVO',
    card: ['Diezmos y ofrendas', 'Apunte la cámara del móvil'],
    ticker: [
      'Culto de celebración los domingos a las 18 h',
      'Estudio bíblico los miércoles a las 19:30',
      'Siga a la iglesia en las redes sociales',
    ],
    label: 'Avisos',
    agenda: 'Programación',
    days: [
      ['Domingo', '9 h · Escuela Bíblica\n18 h · Culto de Celebración'],
      ['Miércoles', '19:30 · Estudio Bíblico'],
      ['Sábado', '19:30 · Culto de Jóvenes'],
    ],
    social: 'Síganos en',
    handle: '@suiglesia',
  },
  it: {
    church: 'Nome della Chiesa',
    person: ['Past. Giovanni Rossi', 'Pastore'],
    giving: ['Decime e offerte', 'Inquadra il codice QR con il telefono'],
    top: ['Benvenuti!', 'Culto in diretta', 'Iscriviti al canale'],
    live: 'IN DIRETTA',
    card: ['Decime e offerte', 'Inquadra con il telefono'],
    ticker: [
      'Culto di celebrazione la domenica alle 18',
      'Studio biblico il mercoledì alle 19:30',
      'Segui la chiesa sui social',
    ],
    label: 'Avvisi',
    agenda: 'Programma',
    days: [
      ['Domenica', '9:00 · Scuola Biblica\n18:00 · Culto di Celebrazione'],
      ['Mercoledì', '19:30 · Studio Biblico'],
      ['Sabato', '19:30 · Culto dei Giovani'],
    ],
    social: 'Seguici su',
    handle: '@latuachiesa',
  },
  de: {
    church: 'Name der Gemeinde',
    person: ['Pastor Johannes Schmidt', 'Hauptpastor'],
    giving: ['Zehnten und Spenden', 'Handykamera auf den QR-Code richten'],
    top: ['Herzlich willkommen!', 'Gottesdienst live', 'Kanal abonnieren'],
    live: 'LIVE',
    card: ['Zehnten und Spenden', 'Handykamera darauf richten'],
    ticker: [
      'Gottesdienst sonntags um 18 Uhr',
      'Bibelstunde mittwochs um 19:30 Uhr',
      'Folgt der Gemeinde in den sozialen Medien',
    ],
    label: 'Hinweise',
    agenda: 'Programm',
    days: [
      ['Sonntag', '9 Uhr · Sonntagsschule\n18 Uhr · Gottesdienst'],
      ['Mittwoch', '19:30 Uhr · Bibelstunde'],
      ['Samstag', '19:30 Uhr · Jugendgottesdienst'],
    ],
    social: 'Folgt uns auf',
    handle: '@eure_gemeinde',
  },
};

/** The configuration of a first run: defaults with the sample texts in `language`. */
/**
 * The everyday way of sending money by phone in the main country of each language, as a
 * starting point (the church can write any other name). German starts on the SEPA transfer,
 * whose QR code the banking apps there read.
 */
const LOCAL_GIVING: Record<string, { method: string; app: string }> = {
  'pt-PT': { method: 'app', app: 'MB WAY' },
  es: { method: 'app', app: 'Bizum' },
  it: { method: 'app', app: 'BANCOMAT Pay' },
  de: { method: 'sepa', app: 'Wero' },
  en: { method: 'link', app: 'Zelle' },
};
export const firstConfig = (language: string): Config => withProfiles(sampleConfig(language));
function sampleConfig(language: string): Config {
  const c = defaults();
  if (LANGUAGES.includes(language)) c.language = language;
  // PIX only exists in Brazil: each language starts from what its main country uses.
  const local = LOCAL_GIVING[language];
  if (local) Object.assign(c.giving, { method: local.method, app: { name: local.app, id: '' } });
  const t = SAMPLES[language] as Record<string, never> | undefined;
  if (!t) return c;
  const pair = (v: unknown) => v as [string, string];
  c.brand.name = t.church;
  [c.lower.items[0].line1, c.lower.items[0].line2] = pair(t.person);
  [c.lower.items[1].line1, c.lower.items[1].line2] = pair(t.giving);
  c.top.messages = t.top;
  c.top.liveText = t.live;
  [c.card.title, c.card.subtitle] = pair(t.card);
  c.ticker.messages = t.ticker;
  c.ticker.label = t.label;
  c.agenda.title = t.agenda;
  c.agenda.days = (t.days as [string, string][]).map(([day, lines], i) => ({
    id: `dia${i + 1}`,
    day,
    lines,
  }));
  c.social.prefix = t.social;
  for (const item of c.social.items) item.handle = t.handle;
  return cleanConfig(c);
}

/** When a countdown shown at `now` reaches zero. A time of day already past counts as zero. */
export function countdownEnd(c: Config['countdown'], now = new Date()) {
  if (c.mode !== 'clock') return now.getTime() + c.minutes * 60000;
  const m = /^(\d{1,2}):(\d{2})$/.exec(c.time);
  if (!m) return now.getTime();
  const at = new Date(now);
  at.setHours(Math.min(23, Number(m[1])), Math.min(59, Number(m[2])), 0, 0);
  return Math.max(at.getTime(), now.getTime());
}

/** What a step of the order of service shows, for the lists of the dock and the settings. */
export function stepTarget(config: Config, step: RundownStep) {
  if (step.kind === 'lower') return config.lower.items.find((i) => i.id === step.ref);
  if (step.kind === 'card') return config.card.saved.find((i) => i.id === step.ref);
  if (step.kind === 'comment') return config.comment.saved.find((i) => i.id === step.ref);
  if (step.kind === 'social')
    return step.ref === ALL ? { id: ALL } : config.social.items.find((i) => i.id === step.ref);
  return { id: '' };
}

// ---- Sharing: a custom model or a profile as a file, from one church to another ----
/** A name no entry of the list has yet: "Natal", then "Natal 2", "Natal 3"… */
function freeName(name: unknown, taken: string[], fallback: string) {
  const base = text(name, 34).trim() || fallback;
  const used = new Set(taken.map((n) => n.toLowerCase()));
  if (!used.has(base.toLowerCase())) return base;
  for (let n = 2; ; n++) if (!used.has(`${base} ${n}`.toLowerCase())) return `${base} ${n}`;
}
/** Adds a custom model that came in a file; says which id it got. */
export function importModel(config: Config, name: unknown, css: unknown): [Config, string] {
  if (typeof css !== 'string' || !customCovers(css).length)
    throw new Error('This file has no model in it');
  if (config.customModels.length >= 40) throw new Error('Too many custom models');
  const next = structuredClone(config);
  const id = newId();
  next.customModels.push({
    id,
    name: freeName(
      name,
      next.customModels.map((m) => m.name),
      'Modelo',
    ),
    css,
  });
  return [cleanConfig(next), id];
}
/**
 * Adds a profile that came in a file, with the custom model it uses (if any). It does not
 * become the one in use: the person chooses it when they want.
 */
export function importProfile(
  config: Config,
  file: { name?: unknown; look?: unknown; model?: { name?: unknown; css?: unknown } | null },
): Config {
  if (!file.look || typeof file.look !== 'object')
    throw new Error('This file has no profile in it');
  if (config.profiles.length >= 30) throw new Error('Too many profiles');
  let next = structuredClone(config);
  // Only the look travels: the names, texts and the way of giving are each church's own.
  const look = takeLook(clean(defaults(), file.look, '', '') as Config);
  // Its custom model comes along under a new id; without one, the look points at none.
  const theme = look.theme as { custom: string };
  theme.custom = '';
  if (file.model?.css) {
    const [withModel, id] = importModel(next, file.model.name, file.model.css);
    next = withModel;
    theme.custom = id;
  }
  next.profiles.push({
    id: newId(),
    name: freeName(
      file.name,
      next.profiles.map((p) => p.name),
      'Perfil',
    ),
    look,
    full: false,
  });
  return cleanConfig(next);
}
/** What a shared profile carries: its look as it is now, and the custom model it uses. */
export function exportProfile(config: Config, ref: string) {
  const p = findProfile(config, ref);
  if (!p) throw new Error('Profile not found');
  const look = takeLook(
    p.id === config.profile ? config : (clean(defaults(), p.look, '', '') as Config),
  );
  const id = (look.theme as { custom?: string } | undefined)?.custom;
  const model = config.customModels.find((m) => m.id === id);
  return { name: p.name, look, model: model ? { name: model.name, css: model.css } : null };
}

import {
  $,
  api,
  clientId,
  connect,
  friendly,
  h,
  renderVersion,
  theme,
  toast,
  toggleTheme,
} from './js/common.js';
import {
  AGENDA_TEMPLATES,
  ANIMATIONS,
  CARD_TEMPLATES,
  EYE,
  EYE_OFF,
  fillCss,
  LOWER_TEMPLATES,
  NETWORKS,
  SHADOWS,
  SOCIAL_TEMPLATES,
  TICKER_TEMPLATES,
  TOP_TEMPLATES,
} from './js/look.js';
import { BUNDLED_FONTS } from './js/fonts.js';
import { autoLocalize, LANGUAGES, t, useLanguage } from './js/i18n.js';

// Global settings, opened in the normal browser so the OBS dock can stay small.
// Every change is saved at once and shows in the preview and in OBS.
let config = null,
  live = null,
  page = localStorage.ltwPage || 'home',
  info = null,
  vertical = false,
  viewItem = '',
  saveTimer = 0,
  installedFonts = [],
  obsVertical = false;

const NAMES = {
  classic: 'Clássico',
  glass: 'Vidro',
  ribbon: 'Faixa inclinada',
  minimal: 'Só texto',
  pill: 'Cápsula',
  split: 'Bloco duplo',
  underline: 'Sublinhado',
  neon: 'Neon',
  news: 'Telejornal',
  stack: 'Cartões',
  liquid: 'Vidro líquido',
  bar: 'Barra',
  pills: 'Cápsulas',
  card: 'Cartão',
  banner: 'Faixa larga',
  center: 'Painel central',
  full: 'Barra cheia',
  large: 'Barra grande',
  slim: 'Barra fina',
  floating: 'Flutuante',
  islands: 'Ilhas',
  tab: 'Aba central',
  vertical: 'Cartão',
  horizontal: 'Deitado',
  ticket: 'Ingresso',
  frame: 'Moldura',
  slide: 'Deslizar',
  rise: 'Subir',
  fade: 'Esmaecer',
  wipe: 'Revelar',
  zoom: 'Zoom',
  blur: 'Desfoque',
  bounce: 'Quicar',
  flip: 'Girar',
  none: 'Sem sombra',
  soft: 'Suave',
  hard: 'Dura',
  glow: 'Brilho',
};
const svg = (d) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
// [id, name, group, what the page is for, icon]
const PAGES = [
  [
    'home',
    'Visão geral',
    '',
    'O que está no ar agora e os primeiros passos.',
    svg('<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z"/>'),
  ],
  [
    'brand',
    'Geral e PIX',
    'Igreja',
    'Nome, logo, idioma, temas, tempo na tela e a chave PIX.',
    svg('<path d="M12 3v5M9.500 5.500h5M6 21V11l6-3 6 3v10M4 21h16M10 21v-5h4v5"/>'),
  ],
  [
    'lower',
    'Nomes',
    'Elementos',
    'O lower third: nome e legenda de quem está falando.',
    svg('<rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 16.500h7M3 8h8"/>'),
  ],
  [
    'top',
    'Selo superior',
    'Elementos',
    'Selo num canto da tela com logo, nome, AO VIVO e horário.',
    svg(
      '<rect x="3" y="4" width="13" height="6" rx="3"/><circle cx="6.500" cy="7" r="1" fill="currentColor"/><path d="M3 20h18" opacity=".35"/>',
    ),
  ],
  [
    'ticker',
    'Barra inferior',
    'Elementos',
    'Texto rolando o tempo todo na parte de baixo.',
    svg(
      '<rect x="3" y="15" width="18" height="5" rx="2"/><path d="M7 17.500h3M13 17.500h5M3 9h18" opacity=".8"/>',
    ),
  ],
  [
    'card',
    'Cartão QR / PIX',
    'Elementos',
    'Cartão com o QR Code do PIX ou de um link.',
    svg(
      '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2v2h-2zM18 18h2v2h-2zM18 14h2M14 18v2"/>',
    ),
  ],
  [
    'agenda',
    'Agenda',
    'Elementos',
    'Dias e horários dos cultos, um dia de cada vez.',
    svg('<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8 3v4M16 3v4"/>'),
  ],
  [
    'social',
    'Redes sociais',
    'Elementos',
    '"Siga-nos no…" com o @ da igreja.',
    svg(
      '<circle cx="12" cy="12" r="3.600"/><path d="M15.600 8.400v5a2.400 2.400 0 0 0 4.900 0V12a8.500 8.500 0 1 0-3.300 6.700"/>',
    ),
  ],
  [
    'bug',
    'Logo',
    'Elementos',
    'O logo sozinho num canto da tela.',
    svg('<circle cx="12" cy="12" r="8"/><path d="M12 8v8M8 12h8"/>'),
  ],
  [
    'layout',
    'Posições na tela',
    'Tela',
    'Arraste cada elemento para o lugar e ajuste o tamanho.',
    svg(
      '<path d="M12 3v18M3 12h18M12 3l-2.500 2.500M12 3l2.500 2.500M12 21l-2.500-2.500M12 21l2.500-2.500M3 12l2.500-2.500M3 12l2.500 2.500M21 12l-2.500-2.500M21 12l-2.500 2.500"/>',
    ),
  ],
  [
    'obs',
    'OBS e atalhos',
    'Instalação',
    'Fontes de navegador, painel do OBS, resoluções e atalhos.',
    svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.500"/>'),
  ],
  [
    'backup',
    'Backup',
    'Instalação',
    'Salvar e restaurar tudo num arquivo.',
    svg('<path d="M12 4v11M7.500 10.500L12 15l4.500-4.500M5 19h14"/>'),
  ],
];
const ELEMENTS = ['lower', 'top', 'ticker', 'card', 'agenda', 'social', 'bug'];
const WEIGHTS = [
  [300, 'Leve'],
  [400, 'Normal'],
  [500, 'Médio'],
  [600, 'Seminegrito'],
  [700, 'Negrito'],
  [800, 'Extra negrito'],
  [900, 'Preto'],
];
const solid = (a) => ({ type: 'solid', a, b: a, angle: 90 });
const grad = (a, b, angle = 90) => ({ type: 'gradient', a, b, angle });
// Ready-made looks: main color, second color, accent, text on main, text on second.
const PALETTES = [
  [
    'Azul real',
    grad('#2463eb', '#4f46e5', 100),
    solid('#0f172a'),
    grad('#fbbf24', '#f59e0b', 180),
    '#ffffff',
    '#e2e8f0',
  ],
  [
    'Vinho e ouro',
    grad('#7f1d1d', '#b91c1c', 100),
    solid('#1c1917'),
    grad('#fde68a', '#d4a017', 135),
    '#ffffff',
    '#fde68a',
  ],
  [
    'Verde esperança',
    grad('#047857', '#10b981', 100),
    solid('#052e2b'),
    grad('#bef264', '#facc15', 135),
    '#ffffff',
    '#d1fae5',
  ],
  [
    'Roxo aurora',
    grad('#7c3aed', '#db2777', 110),
    solid('#1e1b4b'),
    grad('#22d3ee', '#a78bfa', 135),
    '#ffffff',
    '#ede9fe',
  ],
  [
    'Grafite',
    grad('#1f2937', '#111827', 180),
    solid('#374151'),
    solid('#ef4444'),
    '#ffffff',
    '#d1d5db',
  ],
  [
    'Claro',
    solid('#ffffff'),
    solid('#e5e7eb'),
    grad('#2463eb', '#22d3ee', 90),
    '#111827',
    '#374151',
  ],
  [
    'Pôr do sol',
    grad('#f97316', '#e11d48', 110),
    solid('#431407'),
    solid('#fde047'),
    '#ffffff',
    '#ffedd5',
  ],
  [
    'Oceano',
    grad('#0e7490', '#1d4ed8', 110),
    solid('#082f49'),
    grad('#67e8f9', '#34d399', 135),
    '#ffffff',
    '#cffafe',
  ],
];

// Complete looks: models, colors and font for every element at once.
const THEMES = [
  {
    name: 'Céu noturno',
    hint: 'Azul-noite translúcido, detalhes em azul-céu, cantos bem arredondados',
    swatch: 'linear-gradient(120deg, #020617, #0f172a 60%, #7dd3fc 60%)',
    font: 'Outfit',
    dark: grad('#020617', '#0f172a', 120),
    accent: grad('#7dd3fc', '#38bdf8', 90),
    t1: '#ffffff',
    t2: '#cbd5e1',
    opacity: 82,
    radius: 22,
    templates: {
      lower: 'glass',
      top: 'bar',
      ticker: 'floating',
      card: 'horizontal',
      agenda: 'card',
      social: 'pill',
    },
    light: { fill: solid('#ffffff'), text: '#020617', text2: '#334155' },
  },
  {
    name: 'Vidro líquido',
    hint: 'Vidro claro e arredondado, com brilho nas bordas',
    swatch: 'linear-gradient(135deg, #ffffffcc, #ffffff33 45%, #9ec5ff55 70%, #ffffffaa)',
    font: 'Inter',
    dark: solid('#ffffff'),
    accent: grad('#0a84ff', '#5ac8fa', 135),
    t1: '#ffffff',
    t2: '#f1f5f9',
    opacity: 100,
    radius: 26,
    templates: {
      lower: 'liquid',
      top: 'liquid',
      ticker: 'liquid',
      card: 'liquid',
      agenda: 'liquid',
      social: 'liquid',
    },
  },
];
function applyTheme(look) {
  const c = structuredClone;
  config.brand.font = look.font;
  for (const el of ['lower', 'top', 'ticker', 'card', 'agenda', 'social']) {
    const e = config[el],
      // The white card and pill keep dark text; everything else sits on the dark color.
      light = look.light && (el === 'card' || el === 'social') ? look.light : null;
    Object.assign(e, {
      template: look.templates[el],
      fill: c(light?.fill || look.dark),
      accent: c(look.accent),
      opacity: light ? 100 : look.opacity,
      radius: look.radius,
      font: '',
      shadow: 'soft',
    });
    if (el === 'lower') Object.assign(e, { fill2: c(look.dark), text1: look.t1, text2: look.t2 });
    else
      Object.assign(
        e,
        { text: light?.text || look.t1 },
        'text2' in e ? { text2: light?.text2 || look.t2 } : {},
      );
  }
  save();
  renderForm();
  toast(t('Tema "{name}" aplicado a todos os elementos.', { name: t(look.name) }));
}

const get = (path) => path.split('.').reduce((o, k) => o?.[k], config);
function set(path, value) {
  const keys = path.split('.'),
    last = keys.pop();
  keys.reduce((o, k) => o[k], config)[last] = value;
  save();
}
function save() {
  $('#saved').textContent = 'Salvando…';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const r = await api('/api/config', { method: 'PUT', body: config });
    $('#saved').textContent = r.error ? '' : 'Salvo';
    if (r.error) toast(friendly(r.error));
    else if (page === 'brand') checkPix();
  }, 250);
}

// ---------- Field builders ----------
const field = (label, control, { wide = false, tip = '' } = {}) =>
  h('div', { class: 'field' + (wide ? ' wide' : ''), title: tip }, h('span', {}, label), control);
const textInput = (path, label, { wide, tip, placeholder, max = 300 } = {}) =>
  field(
    label,
    h('input', {
      value: get(path),
      placeholder,
      maxlength: max,
      oninput: (e) => set(path, e.target.value),
    }),
    { wide, tip },
  );
const select = (path, label, options, { tip, rerender = false } = {}) =>
  field(
    label,
    h(
      'select',
      {
        onchange: (e) => {
          const raw = e.target.value;
          set(path, typeof get(path) === 'number' ? Number(raw) : raw);
          if (rerender) renderForm();
        },
      },
      options.map(([v, l]) =>
        h('option', { value: v, selected: String(get(path)) === String(v) }, l ?? NAMES[v] ?? v),
      ),
    ),
    { tip },
  );
const names = (list) => list.map((v) => [v, NAMES[v]]);
function check(path, label, { tip, rerender = false } = {}) {
  return h(
    'label',
    { class: 'field check', title: tip },
    h('input', {
      type: 'checkbox',
      checked: get(path),
      onchange: (e) => {
        set(path, e.target.checked);
        if (rerender) renderForm();
      },
    }),
    h('span', {}, label),
  );
}
function range(path, label, min, max, unit = '', { tip, step = 1 } = {}) {
  const out = h('output', {}, get(path) + unit);
  return field(
    label,
    h(
      'div',
      { class: 'rangeRow' },
      h('input', {
        type: 'range',
        min,
        max,
        step,
        value: get(path),
        oninput: (e) => {
          out.textContent = e.target.value + unit;
          set(path, Number(e.target.value));
        },
      }),
      out,
    ),
    { tip },
  );
}
const color = (path, label, { tip } = {}) =>
  field(
    label,
    h('input', { type: 'color', value: get(path), oninput: (e) => set(path, e.target.value) }),
    { tip },
  );
/** Fonts shipped with the app first, then every font installed on this computer. */
function font(path, label) {
  const value = get(path),
    bundled = new Set(BUNDLED_FONTS.map(([f]) => f));
  const sample = h(
    'span',
    { class: 'fontSample', style: `font-family:"${value}",system-ui` },
    value ? 'Aa Bb Cc 123' : '',
  );
  const groups = [...new Set(BUNDLED_FONTS.map(([, g]) => g))].map((g) =>
    h(
      'optgroup',
      { label: `${t('Fontes do programa')} · ${t(g)}` },
      BUNDLED_FONTS.filter(([, x]) => x === g).map(([f]) =>
        h('option', { value: f, selected: f === value }, f),
      ),
    ),
  );
  const installed = installedFonts.filter((f) => !bundled.has(f));
  const known = !value || bundled.has(value) || installed.includes(value);
  return field(
    label,
    h(
      'div',
      { class: 'fillRow' },
      h(
        'select',
        {
          style: 'flex:1;min-width:150px',
          onchange: (e) => {
            set(path, e.target.value);
            sample.style.fontFamily = `"${e.target.value}",system-ui`;
            sample.textContent = e.target.value ? 'Aa Bb Cc 123' : '';
          },
        },
        h(
          'option',
          { value: '', selected: !value },
          path === 'brand.font' ? 'Fonte do sistema' : 'Usar a fonte geral',
        ),
        known ? null : h('option', { value, selected: true }, value),
        ...groups,
        installed.length
          ? h(
              'optgroup',
              { label: 'Instaladas neste computador' },
              installed.map((f) => h('option', { value: f, selected: f === value }, f)),
            )
          : null,
      ),
      sample,
    ),
    {
      tip: 'Primeiro as fontes que vêm com o programa; depois, todas as instaladas neste computador.',
    },
  );
}
/** One color or a two-color gradient with an angle. */
function fill(path, label, { tip } = {}) {
  const box = h('div', { class: 'fill' });
  const draw = () => {
    const f = get(path),
      gradient = f.type === 'gradient';
    const change = (patch) => {
      set(path, { ...get(path), ...patch });
      draw();
    };
    const angleOut = h('output', {}, f.angle + '°');
    const swatch = h('div', { class: 'swatch', style: `background:${fillCss(f)}` });
    const live = (patch) => {
      Object.assign(get(path), patch);
      swatch.style.background = fillCss(get(path));
      save();
    };
    box.replaceChildren(
      h(
        'div',
        { class: 'fillRow' },
        h(
          'div',
          { class: 'seg' },
          h(
            'button',
            {
              type: 'button',
              class: gradient ? '' : 'active',
              onclick: () => change({ type: 'solid' }),
            },
            'Cor única',
          ),
          h(
            'button',
            {
              type: 'button',
              class: gradient ? 'active' : '',
              title: 'Duas cores que se misturam',
              onclick: () => change({ type: 'gradient', b: f.b === f.a ? '#7c3aed' : f.b }),
            },
            'Degradê',
          ),
        ),
        h('input', {
          type: 'color',
          value: f.a,
          title: gradient ? 'Cor inicial' : 'Cor',
          oninput: (e) => live({ a: e.target.value }),
        }),
        gradient
          ? h('input', {
              type: 'color',
              value: f.b,
              title: 'Cor final',
              oninput: (e) => live({ b: e.target.value }),
            })
          : null,
        swatch,
        gradient
          ? h(
              'div',
              { class: 'rangeRow', title: 'Direção do degradê' },
              h('input', {
                type: 'range',
                min: 0,
                max: 360,
                step: 5,
                value: f.angle,
                oninput: (e) => {
                  angleOut.textContent = e.target.value + '°';
                  live({ angle: Number(e.target.value) });
                },
              }),
              angleOut,
            )
          : null,
      ),
    );
  };
  draw();
  return field(label, box, { tip });
}
function chips(path, list) {
  return h(
    'div',
    { class: 'chips' },
    list.map((v) =>
      h(
        'button',
        {
          type: 'button',
          class: get(path) === v ? 'active' : '',
          onclick: () => {
            set(path, v);
            renderForm();
          },
        },
        NAMES[v],
      ),
    ),
  );
}
const card = (title, ...children) =>
  h('section', { class: 'card' }, h('h3', {}, title), ...children);
const grid = (...children) => h('div', { class: 'grid' }, ...children);
const hint = (text, cls = '') => h('p', { class: 'hint ' + cls }, text);
const POSITIONS = [
  ['top-left', 'Em cima, à esquerda'],
  ['top-right', 'Em cima, à direita'],
  ['bottom-left', 'Embaixo, à esquerda'],
  ['bottom-right', 'Embaixo, à direita'],
];
const PLACES = [
  ...POSITIONS,
  ['top-center', 'Em cima, no centro'],
  ['bottom-center', 'Embaixo, no centro'],
  ['center-left', 'No meio, à esquerda'],
  ['center-right', 'No meio, à direita'],
  ['center', 'No centro da tela'],
];
const place = (el) =>
  card(
    'Posição e tamanho',
    config[el].free || config[el].vfree
      ? h(
          'p',
          { class: 'hint' },
          'Este elemento foi arrastado para um lugar próprio na aba "Posições na tela". ',
          h(
            'button',
            {
              onclick: () => {
                config[el].vfree = false;
                set(`${el}.free`, false);
                renderForm();
              },
            },
            'Voltar ao lugar padrão',
          ),
        )
      : null,
    grid(
      select(`${el}.position`, 'Lugar na tela', PLACES),
      range(`${el}.size`, 'Tamanho', 50, 200, '%'),
      range(`${el}.marginX`, 'Distância da lateral', 0, 400, ' px'),
      range(`${el}.marginY`, 'Distância de cima / de baixo', 0, 400, ' px'),
    ),
  );
const colors = (el, labels = {}) =>
  card(
    'Cores e texto',
    grid(
      fill(`${el}.fill`, labels.fill || 'Cor de fundo'),
      fill(`${el}.accent`, 'Cor de destaque'),
      color(`${el}.text`, labels.text || 'Texto principal'),
      `text2` in config[el] ? color(`${el}.text2`, labels.text2 || 'Texto de apoio') : null,
      font(`${el}.font`, 'Fonte'),
      select(`${el}.weight`, 'Peso do texto', WEIGHTS),
    ),
  );
/** Rows with a remove button and an "add" button under them. */
function rows(path, blank, draw) {
  const items = get(path);
  return [
    h(
      'div',
      { class: 'rows' },
      items.map((item, i) => {
        const change = (patch) => {
          Object.assign(item, patch);
          save();
        };
        const move = (d) => {
          [items[i], items[i + d]] = [items[i + d], items[i]];
          save();
          renderForm();
        };
        return h(
          'div',
          { class: 'row wideRow' },
          ...draw(item, change),
          h(
            'div',
            { class: 'mini' },
            h('button', { title: 'Subir', disabled: i === 0, onclick: () => move(-1) }, '↑'),
            h(
              'button',
              { title: 'Descer', disabled: i === items.length - 1, onclick: () => move(1) },
              '↓',
            ),
            h(
              'button',
              {
                title: 'Remover',
                onclick: () => {
                  items.splice(i, 1);
                  save();
                  renderForm();
                },
              },
              '×',
            ),
          ),
        );
      }),
    ),
    h('div', { style: 'height:8px' }),
    h(
      'button',
      {
        class: 'primary',
        onclick: () => {
          items.push({ id: Math.random().toString(36).slice(2, 10), ...blank });
          save();
          renderForm();
        },
      },
      '+ Adicionar',
    ),
  ];
}
const effects = (el, { radius = true } = {}) =>
  card(
    'Efeitos e animação',
    grid(
      select(`${el}.animation`, 'Animação de entrada e saída', names(ANIMATIONS)),
      range(`${el}.duration`, 'Duração da animação', 200, 2000, ' ms', { step: 50 }),
      select(`${el}.shadow`, 'Sombra', names(SHADOWS), { tip: 'Brilho usa a cor de destaque.' }),
      range(`${el}.shadowStrength`, 'Força da sombra', 0, 100, '%'),
      el !== 'bug'
        ? range(`${el}.opacity`, 'Opacidade do fundo', 10, 100, '%', {
            tip: 'Menos de 100% deixa a imagem da câmera aparecer por trás.',
          })
        : null,
      radius ? range(`${el}.radius`, 'Cantos arredondados', 0, 60, ' px') : null,
    ),
  );
const qrChoice = (el) => [
  select(
    `${el}.qr`,
    'O QR Code leva para',
    [
      ['pix', 'PIX da igreja'],
      ['url', 'Um link (site, inscrição, redes sociais)'],
    ],
    { rerender: true },
  ),
  get(`${el}.qr`) === 'url'
    ? textInput(`${el}.qrText`, 'Link do QR Code', { placeholder: 'https://…', max: 600 })
    : null,
];

// ---------- Pages ----------
async function uploadLogo(file) {
  if (!file) return;
  const r = await api('/api/media', {
    method: 'POST',
    raw: file,
    type: file.type || 'application/octet-stream',
  });
  if (r.error) return toast(friendly(r.error));
  set('brand.logo', r.url);
  renderForm();
}
function applyPalette([, main, second, accent, t1, t2]) {
  const c = structuredClone;
  Object.assign(config.lower, {
    fill: c(main),
    fill2: c(second),
    accent: c(accent),
    text1: t1,
    text2: t2,
  });
  Object.assign(config.top, {
    fill: c(second.a === '#e5e7eb' ? main : second),
    accent: c(accent),
    text: second.a === '#e5e7eb' ? t1 : '#ffffff',
    text2: second.a === '#e5e7eb' ? t2 : '#cbd5e1',
  });
  Object.assign(config.card, { accent: c(main.a === '#ffffff' ? accent : main) });
  save();
  toast('Cores aplicadas ao lower third, à barra e ao cartão.');
}
async function checkPix() {
  const box = $('#pixCheck');
  if (!box) return;
  const r = await api('/api/pix');
  if (r.error)
    return box.replaceChildren(
      hint(
        config.pix.key || config.pix.payload
          ? friendly(r.error)
          : 'Preencha a chave para gerar o QR Code.',
        config.pix.key || config.pix.payload ? 'bad' : '',
      ),
    );
  box.replaceChildren(
    h(
      'div',
      { class: 'pixBox' },
      h('img', { src: `/api/qr.svg?kind=pix&v=${Date.now()}`, alt: 'QR Code do PIX' }),
      h(
        'div',
        {},
        hint(
          'Teste antes do culto: aponte o aplicativo do banco para este QR Code e confira o nome que aparece.',
        ),
        h('span', { class: 'hint' }, 'PIX copia e cola:'),
        h('code', { class: 'block' }, r.payload),
      ),
    ),
  );
}
const pages = {
  home: () => {
    const done = (ok, text, action, pageId) =>
      h(
        'div',
        { class: 'step' + (ok ? ' done' : '') },
        h('i', { class: 'mark' }, '✓'),
        h('span', {}, text),
        h('button', { onclick: () => go(pageId) }, action),
      );
    return [
      card(
        'No ar agora',
        h(
          'div',
          { class: 'tiles' },
          ELEMENTS.map((el) => {
            const on = !!live?.[el]?.on,
              enabled = config.enabled[el];
            if (!enabled)
              return h(
                'div',
                { class: 'tile disabled' },
                h(
                  'div',
                  { class: 'tileHead' },
                  h('b', {}, PAGES.find(([id]) => id === el)[1]),
                  eye(el),
                ),
                h('span', { class: 'state' }, h('i'), 'Desativada'),
                h(
                  'div',
                  { class: 'tileActions' },
                  h(
                    'button',
                    {
                      onclick: () => {
                        set(`enabled.${el}`, true);
                        renderNav();
                        renderForm();
                      },
                    },
                    'Ativar',
                  ),
                  h('button', { onclick: () => go(el) }, 'Ajustar'),
                ),
              );
            return h(
              'div',
              { class: 'tile' + (on ? ' on' : '') },
              h(
                'div',
                { class: 'tileHead' },
                h('b', {}, PAGES.find(([id]) => id === el)[1]),
                eye(el),
              ),
              h('span', { class: 'state' }, h('i'), on ? 'No ar' : 'Fora do ar'),
              h(
                'div',
                { class: 'tileActions' },
                h(
                  'button',
                  {
                    class: on ? '' : 'primary',
                    onclick: async () => {
                      const r = await api(`/api/live/${el}/toggle`, { method: 'POST' });
                      if (r.error) toast(friendly(r.error));
                    },
                  },
                  on ? 'Esconder' : 'Mostrar',
                ),
                h('button', { onclick: () => go(el) }, 'Ajustar'),
              ),
            );
          }),
        ),
        hint(
          'No dia a dia, quem mostra e esconde é o painel dentro do OBS. Aqui você confere e ajusta a aparência.',
        ),
        hint(
          'O olho desativa uma categoria que a igreja não usa: ela some do painel do OBS e não vai ao ar.',
        ),
      ),
      card(
        'Primeiros passos',
        h(
          'div',
          { class: 'steps2' },
          done(
            config.brand.name && config.brand.name !== 'Nome da Igreja',
            'Escreva o nome da igreja',
            'Abrir',
            'brand',
          ),
          done(!!config.brand.logo, 'Envie o logo da igreja', 'Abrir', 'brand'),
          done(!!(config.pix.key || config.pix.payload), 'Cadastre a chave PIX', 'Abrir', 'brand'),
          done(false, 'Adicione as fontes e o painel no OBS', 'Ver como', 'obs'),
          done(
            Object.values(config).some((e) => e?.free || e?.vfree),
            'Arraste os elementos para o lugar',
            'Abrir',
            'layout',
          ),
        ),
      ),
      info?.folder
        ? card(
            'Seus arquivos',
            h(
              'div',
              { class: 'copyRow' },
              h('code', { 'data-raw': '' }, info.folder),
              h(
                'button',
                { onclick: () => api('/api/open-folder', { method: 'POST' }) },
                'Abrir a pasta',
              ),
            ),
            hint(
              'Esta pasta guarda as configurações, os nomes, as imagens e os arquivos das fontes do OBS. Copie a pasta inteira para fazer backup.',
            ),
          )
        : null,
    ];
  },

  brand: () => [
    card(
      'Igreja',
      grid(
        textInput('brand.name', 'Nome da igreja', { max: 80 }),
        font('brand.font', 'Fonte geral'),
      ),
      h('div', { style: 'height:12px' }),
      h(
        'div',
        { class: 'logoBox' },
        h(
          'div',
          { class: 'logoThumb' },
          config.brand.logo ? h('img', { src: config.brand.logo, alt: '' }) : 'Sem logo',
        ),
        h(
          'div',
          {},
          h('input', {
            type: 'file',
            id: 'logoFile',
            class: 'hidden',
            accept: 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml',
            onchange: (e) => uploadLogo(e.target.files[0]),
          }),
          h(
            'button',
            { class: 'primary', onclick: () => $('#logoFile').click() },
            config.brand.logo ? 'Trocar logo' : 'Enviar logo',
          ),
          ' ',
          config.brand.logo
            ? h(
                'button',
                {
                  onclick: () => {
                    set('brand.logo', '');
                    renderForm();
                  },
                },
                'Remover',
              )
            : null,
          hint('PNG com fundo transparente fica melhor. Até 8 MB.'),
        ),
      ),
    ),
    card(
      'Temas',
      h(
        'div',
        { class: 'palettes' },
        THEMES.map((look) =>
          h(
            'button',
            { type: 'button', title: look.hint, onclick: () => applyTheme(look) },
            h('i', { style: `background:${look.swatch}` }),
            look.name,
          ),
        ),
      ),
      hint('Um tema troca o modelo, as cores e a fonte de todos os elementos de uma vez.'),
    ),
    card(
      'Tempo na tela',
      grid(
        range('timing.autoHide', 'Nomes, QR Code e redes saem sozinhos depois de', 0, 120, ' s', {
          tip: '0 = ficam na tela até você esconder. O mesmo tempo pode ser trocado no painel do OBS.',
        }),
      ),
    ),
    card(
      'Cores prontas',
      h(
        'div',
        { class: 'palettes' },
        PALETTES.map((p) =>
          h(
            'button',
            {
              type: 'button',
              title: 'Aplica estas cores a todos os elementos',
              onclick: () => applyPalette(p),
            },
            h('i', { style: `background:${fillCss(p[1])};border-bottom:6px solid ${p[3].a}` }),
            p[0],
          ),
        ),
      ),
      hint(
        'É só um ponto de partida: cada elemento tem as próprias cores, com degradê, na aba dele.',
      ),
    ),
    card(
      'PIX',
      grid(
        select(
          'pix.mode',
          'Como gerar o QR Code',
          [
            ['key', 'Pela chave PIX'],
            ['payload', 'Colar o "PIX copia e cola" do banco'],
          ],
          { rerender: true },
        ),
        ...(config.pix.mode === 'key'
          ? [
              textInput('pix.key', 'Chave PIX', {
                placeholder: 'CNPJ, e-mail, telefone ou chave aleatória',
                max: 80,
              }),
              textInput('pix.name', 'Nome do recebedor', {
                max: 25,
                tip: 'Como está na conta do banco, até 25 letras.',
              }),
              textInput('pix.city', 'Cidade', { max: 15 }),
              textInput('pix.amount', 'Valor fixo (opcional)', {
                placeholder: 'Vazio: quem doa escolhe',
                max: 14,
              }),
              textInput('pix.txid', 'Identificador (opcional)', {
                placeholder: 'Ex.: OFERTA',
                max: 25,
              }),
            ]
          : [
              field(
                'PIX copia e cola',
                h('textarea', {
                  rows: 3,
                  value: config.pix.payload,
                  oninput: (e) => set('pix.payload', e.target.value),
                }),
                { wide: true },
              ),
            ]),
        textInput('pix.display', 'Texto mostrado ao lado do QR Code', {
          placeholder: 'Ex.: CNPJ 12.345.678/0001-90',
          max: 60,
          tip: 'Vazio: mostra a chave.',
        }),
      ),
      h('div', { id: 'pixCheck' }),
    ),
  ],

  lower: () => [
    card('Modelo', chips('lower.template', LOWER_TEMPLATES)),
    card(
      'Nomes e textos',
      h(
        'div',
        { class: 'rows' },
        config.lower.items.map((item, i) => {
          const change = (patch) => {
            Object.assign(item, patch);
            save();
          };
          const move = (d) => {
            const list = config.lower.items;
            [list[i], list[i + d]] = [list[i + d], list[i]];
            save();
            renderForm();
          };
          return h(
            'div',
            { class: 'row' + (viewItem === item.id ? ' viewing' : '') },
            h('input', {
              value: item.line1,
              placeholder: 'Nome',
              maxlength: 120,
              oninput: (e) => change({ line1: e.target.value }),
            }),
            h('input', {
              value: item.line2,
              placeholder: 'Cargo ou texto',
              maxlength: 160,
              oninput: (e) => change({ line2: e.target.value }),
            }),
            h(
              'label',
              { class: 'check', title: 'Mostra o logo da igreja neste lower third' },
              h('input', {
                type: 'checkbox',
                checked: item.logo,
                onchange: (e) => change({ logo: e.target.checked }),
              }),
              h('span', {}, 'Logo'),
            ),
            h(
              'select',
              {
                title: 'QR Code neste lower third',
                onchange: (e) => {
                  change({ qr: e.target.value });
                  renderForm();
                },
              },
              [
                ['none', 'Sem QR'],
                ['pix', 'QR do PIX'],
                ['url', 'QR de link'],
              ].map(([v, l]) => h('option', { value: v, selected: item.qr === v }, l)),
            ),
            h(
              'div',
              { class: 'mini' },
              h(
                'button',
                {
                  title: 'Ver este na prévia',
                  onclick: () => {
                    viewItem = item.id;
                    renderForm();
                    setPreview();
                  },
                },
                'Ver',
              ),
              h(
                'button',
                { title: 'Subir na lista', disabled: i === 0, onclick: () => move(-1) },
                '↑',
              ),
              h(
                'button',
                {
                  title: 'Descer na lista',
                  disabled: i === config.lower.items.length - 1,
                  onclick: () => move(1),
                },
                '↓',
              ),
              h(
                'button',
                {
                  title: 'Remover',
                  onclick: () => {
                    config.lower.items.splice(i, 1);
                    save();
                    renderForm();
                  },
                },
                '×',
              ),
            ),
            item.qr === 'url'
              ? h('input', {
                  class: 'extra',
                  value: item.qrText,
                  placeholder: 'Link do QR Code: https://…',
                  maxlength: 600,
                  oninput: (e) => change({ qrText: e.target.value }),
                })
              : null,
          );
        }),
      ),
      h('div', { style: 'height:8px' }),
      h(
        'button',
        {
          class: 'primary',
          onclick: () => {
            config.lower.items.push({
              id: Math.random().toString(36).slice(2, 10),
              line1: 'Novo nome',
              line2: '',
              logo: true,
              qr: 'none',
              qrText: '',
            });
            save();
            renderForm();
          },
        },
        '+ Adicionar',
      ),
      hint(
        'No painel do OBS, um clique no nome mostra ou esconde. Dá para adicionar nomes por lá também.',
      ),
    ),
    card(
      'Cores',
      grid(
        fill('lower.fill', 'Cor principal (barra do nome)'),
        fill('lower.fill2', 'Segunda cor (barra do cargo)'),
        fill('lower.accent', 'Cor de destaque (detalhes)'),
        color('lower.text1', 'Texto do nome'),
        color('lower.text2', 'Texto do cargo'),
      ),
      hint(
        'Cada modelo usa as cores de um jeito: o "Só texto", por exemplo, usa só o destaque e as cores do texto.',
      ),
    ),
    card(
      'Texto',
      grid(
        font('lower.font', 'Fonte'),
        select('lower.weight1', 'Peso do nome', WEIGHTS),
        select('lower.weight2', 'Peso do cargo', WEIGHTS),
        check('lower.uppercase', 'Tudo em maiúsculas'),
      ),
    ),
    card(
      'Posição e tamanho',
      grid(
        select('lower.position', 'Lado da tela', [
          ['left', 'Esquerda'],
          ['center', 'Centro'],
          ['right', 'Direita'],
        ]),
        range('lower.size', 'Tamanho', 50, 200, '%'),
        range('lower.marginX', 'Distância da lateral', 0, 400, ' px'),
        range('lower.marginY', 'Distância de baixo', 0, 400, ' px'),
      ),
    ),
    effects('lower'),
  ],

  top: () => [
    card('Modelo', chips('top.template', TOP_TEMPLATES)),
    card(
      'O que aparece',
      grid(
        check('top.showLogo', 'Logo da igreja'),
        check('top.showName', 'Nome da igreja'),
        check('top.showLive', 'Selo "AO VIVO"', { rerender: true }),
        config.top.showLive ? textInput('top.liveText', 'Texto do selo', { max: 20 }) : null,
        check('top.showClock', 'Horário', { rerender: true }),
        ...(config.top.showClock
          ? [
              check('top.showDate', 'Data embaixo da hora'),
              check('top.clockSeconds', 'Mostrar segundos'),
              check('top.clock12h', 'Formato 12 horas'),
            ]
          : []),
        check('top.showMessages', 'Recados (texto que se reveza)', { rerender: true }),
      ),
      hint('Cada parte liga e desliga sozinha, aqui ou na aba "Superior" do painel do OBS.'),
    ),
    config.top.showMessages
      ? card(
          'Recados',
          grid(
            select('top.order', 'Ordem', [
              ['sequence', 'Na sequência'],
              ['random', 'Aleatória'],
            ]),
            range('top.interval', 'Trocar a cada', 3, 60, ' s'),
            field(
              'Recados (um por linha)',
              h('textarea', {
                rows: 5,
                value: config.top.messages.join('\n'),
                oninput: (e) =>
                  set(
                    'top.messages',
                    e.target.value
                      .split('\n')
                      .map((l) => l.trim())
                      .filter(Boolean),
                  ),
              }),
              { wide: true },
            ),
          ),
        )
      : null,
    colors('top', { fill: 'Cor do selo', text: 'Nome e horário', text2: 'Recados e data' }),
    place('top'),
    effects('top'),
  ],

  card: () => [
    card('Modelo', chips('card.template', CARD_TEMPLATES)),
    card(
      'Conteúdo',
      grid(
        textInput('card.title', 'Título', { max: 60 }),
        textInput('card.subtitle', 'Texto de apoio', { max: 90 }),
        ...qrChoice('card'),
        check('card.showKey', 'Mostrar a chave (ou o link) por escrito'),
        check('card.showLogo', 'Logo da igreja'),
        check('card.qrRound', 'QR Code com pontos arredondados'),
      ),
      hint('Para o PIX, a chave e o texto ao lado do QR Code ficam na aba "Geral e PIX".'),
    ),
    card(
      'Cores e texto',
      grid(
        fill('card.fill', 'Cor do cartão'),
        fill('card.accent', 'Cor de destaque'),
        color('card.text', 'Título'),
        color('card.text2', 'Texto de apoio'),
        font('card.font', 'Fonte'),
        select('card.weight', 'Peso do título', WEIGHTS),
      ),
    ),
    card(
      'Posição e tamanho',
      grid(
        select('card.position', 'Lugar na tela', PLACES),
        range('card.size', 'Tamanho', 50, 200, '%'),
        range('card.marginX', 'Distância da lateral', 0, 400, ' px'),
        range('card.marginY', 'Distância de cima / de baixo', 0, 400, ' px'),
      ),
    ),
    effects('card'),
  ],

  ticker: () => [
    card('Modelo', chips('ticker.template', TICKER_TEMPLATES)),
    card(
      'Textos que rolam',
      grid(
        field(
          'Textos (um por linha)',
          h('textarea', {
            rows: 6,
            value: config.ticker.messages.join('\n'),
            oninput: (e) =>
              set(
                'ticker.messages',
                e.target.value
                  .split('\n')
                  .map((l) => l.trim())
                  .filter(Boolean),
              ),
          }),
          { wide: true },
        ),
        range('ticker.speed', 'Velocidade', 40, 300, ' px/s', { step: 5 }),
        textInput('ticker.separator', 'Separador entre os textos', { max: 3 }),
        check('ticker.showLabel', 'Etiqueta à esquerda', { rerender: true }),
        config.ticker.showLabel
          ? textInput('ticker.label', 'Texto da etiqueta', { max: 24 })
          : null,
        check('ticker.showLogo', 'Logo da igreja'),
        check('ticker.showClock', 'Relógio à direita'),
      ),
      hint(
        'Com a barra inferior no ar, os nomes e o que estiver embaixo sobem sozinhos para não ficar por cima dela.',
      ),
    ),
    colors('ticker', { fill: 'Cor da barra', text: 'Texto' }),
    card(
      'Tamanho',
      grid(
        range('ticker.size', 'Tamanho', 60, 180, '%'),
        range('ticker.margin', 'Distância das bordas', 0, 120, ' px', {
          tip: 'Vale para os modelos Flutuante e Vidro líquido.',
        }),
      ),
    ),
    effects('ticker'),
  ],

  agenda: () => [
    card('Modelo', chips('agenda.template', AGENDA_TEMPLATES)),
    card(
      'Dias e horários',
      ...rows('agenda.days', { day: 'Novo dia', lines: '' }, (d, change) => [
        h('input', {
          value: d.day,
          placeholder: 'Dia (ex.: Domingo)',
          maxlength: 40,
          oninput: (e) => change({ day: e.target.value }),
        }),
        h('textarea', {
          rows: 2,
          value: d.lines,
          placeholder: 'Horários, um por linha',
          maxlength: 400,
          oninput: (e) => change({ lines: e.target.value }),
        }),
      ]),
      h('div', { style: 'height:12px' }),
      grid(
        textInput('agenda.title', 'Título', { max: 40 }),
        range('agenda.seconds', 'Cada dia fica na tela por', 3, 30, ' s'),
        check('agenda.loop', 'Repetir até eu esconder', {
          tip: 'Desligado: a agenda sai da tela depois do último dia.',
        }),
        check('agenda.showLogo', 'Logo da igreja'),
      ),
    ),
    colors('agenda', { text: 'Dia', text2: 'Horários' }),
    ['banner', 'center'].includes(config.agenda.template)
      ? card(
          'Tamanho',
          grid(
            range('agenda.size', 'Tamanho', 50, 200, '%'),
            range('agenda.marginY', 'Distância de baixo', 0, 400, ' px'),
          ),
        )
      : place('agenda'),
    effects('agenda'),
  ],

  social: () => [
    card('Modelo', chips('social.template', SOCIAL_TEMPLATES)),
    card(
      'Redes',
      ...rows(
        'social.items',
        { network: 'instagram', label: 'Instagram', handle: '@suaigreja', icon: '' },
        (item, change) => [
          h(
            'select',
            {
              onchange: (e) => {
                change({
                  network: e.target.value,
                  label:
                    e.target.value === 'other'
                      ? item.label
                      : NETWORKS.find(([n]) => n === e.target.value)[1],
                });
                renderForm();
              },
            },
            NETWORKS.map(([v, l]) => h('option', { value: v, selected: item.network === v }, l)),
          ),
          h('input', {
            value: item.label,
            placeholder: 'Nome da rede',
            maxlength: 30,
            oninput: (e) => change({ label: e.target.value }),
          }),
          h('input', {
            value: item.handle,
            placeholder: '@ ou endereço',
            maxlength: 80,
            oninput: (e) => change({ handle: e.target.value }),
          }),
          h(
            'label',
            { class: 'iconPick', title: 'Enviar uma imagem para usar como ícone desta rede' },
            item.icon ? h('img', { src: item.icon, alt: '' }) : 'Ícone…',
            h('input', {
              type: 'file',
              class: 'hidden',
              accept: 'image/png,image/jpeg,image/webp,image/svg+xml',
              onchange: async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const r = await api('/api/media', { method: 'POST', raw: file, type: file.type });
                if (r.error) return toast(friendly(r.error));
                change({ icon: r.url });
                renderForm();
              },
            }),
          ),
          item.icon
            ? h(
                'button',
                {
                  title: 'Voltar ao ícone do programa',
                  onclick: () => {
                    change({ icon: '' });
                    renderForm();
                  },
                },
                'Tirar ícone',
              )
            : null,
        ],
      ),
      h('div', { style: 'height:12px' }),
      grid(
        textInput('social.prefix', 'Texto antes do nome da rede', {
          max: 40,
          placeholder: 'Siga-nos no',
        }),
      ),
      hint(
        'Os ícones do programa são genéricos (câmera, play, pessoas…), não os logotipos oficiais das redes. Para usar o ícone oficial, envie a imagem em "Ícone…".',
      ),
    ),
    colors('social', { text: 'O @', text2: 'Texto de cima' }),
    place('social'),
    effects('social'),
  ],

  bug: () => [
    config.brand.logo
      ? null
      : card(
          'Logo',
          hint('Envie o logo da igreja na aba "Geral e PIX" para usar este elemento.', 'bad'),
        ),
    card(
      'Logo no canto da tela',
      grid(
        select('bug.position', 'Canto', POSITIONS),
        range('bug.size', 'Largura', 40, 500, ' px'),
        range('bug.opacity', 'Opacidade', 10, 100, '%'),
        range('bug.marginX', 'Distância da lateral', 0, 300, ' px'),
        range('bug.marginY', 'Distância de cima / de baixo', 0, 300, ' px'),
      ),
    ),
    effects('bug', { radius: false }),
  ],

  layout: () => {
    const LABELS = {
      lower: 'Nomes',
      top: 'Selo superior',
      card: 'Cartão QR / PIX',
      agenda: 'Agenda',
      social: 'Redes sociais',
      bug: 'Logo',
    };
    const key = vertical ? 'vfree' : 'free';
    const moved = Object.keys(LABELS).filter((el) => config[el][key]);
    return [
      card(
        'Arraste para posicionar',
        h(
          'div',
          { class: 'fillRow' },
          h(
            'div',
            { class: 'seg' },
            ...orientButtons(() => {
              $('#form').replaceChildren();
              renderForm();
            }),
          ),
          h('span', { class: 'hint' }, 'Cada formato guarda as próprias posições.'),
        ),
        h('div', { style: 'height:10px' }),
        h(
          'div',
          { class: 'previewBox editor' + (vertical ? ' tall' : '') },
          h('iframe', {
            src: '/overlay?preview=all&edit=1' + (vertical ? '&layout=vertical' : ''),
            title: 'Editor de posições',
          }),
        ),
        hint(
          'Arraste cada elemento para onde ele deve aparecer. Para aumentar ou diminuir, arraste o quadradinho azul do canto. A posição vale na hora, também no OBS.',
        ),
        hint(
          'A barra inferior e os modelos de largura total (Telejornal, Faixa larga e Painel central) não se movem.',
        ),
        h('div', { style: 'height:8px' }),
        h(
          'div',
          { class: 'fillRow moved' },
          h(
            'span',
            { class: 'hint' },
            moved.length ? 'Voltar ao lugar padrão:' : 'Nenhum elemento foi movido ainda.',
          ),
          ...moved.map((el) =>
            h(
              'button',
              {
                onclick: () => {
                  set(`${el}.${key}`, false);
                  renderForm();
                },
              },
              LABELS[el],
            ),
          ),
        ),
      ),
    ];
  },

  obs: () => {
    const base = location.origin;
    const copy = (text) =>
      h(
        'div',
        { class: 'copyRow' },
        h('code', {}, text),
        h(
          'button',
          { onclick: () => navigator.clipboard.writeText(text).then(() => toast('Copiado.')) },
          'Copiar',
        ),
      );
    const row = (what, path) =>
      h('tr', {}, h('td', {}, what), h('td', {}, h('code', {}, base + path)));
    const [w, hgt] = (obsVertical ? config.output.vertical : config.output.horizontal).split('x');
    const size = (path, list) =>
      h(
        'select',
        { onchange: (e) => (set(path, e.target.value), renderForm()) },
        list.map((r) =>
          h('option', { value: r, selected: get(path) === r }, r.replace('x', ' × ')),
        ),
      );
    const label = (el) => PAGES.find(([id]) => id === el)?.[1] || 'Todos os elementos';
    return [
      card(
        'Tamanho das fontes no OBS',
        grid(
          field(
            'Vídeo horizontal (16:9)',
            size('output.horizontal', ['1280x720', '1920x1080', '2560x1440', '3840x2160']),
          ),
          field(
            'Vídeo vertical (9:16)',
            size('output.vertical', ['720x1280', '1080x1920', '1440x2560', '2160x3840']),
          ),
        ),
        hint(
          'Use o mesmo tamanho do vídeo do seu OBS. Os gráficos se ajustam sozinhos: tudo o que você configurou fica igual em qualquer um deles.',
        ),
      ),
      card(
        '1. Os gráficos (fonte de navegador)',
        h(
          'div',
          { class: 'fillRow' },
          h(
            'div',
            { class: 'seg' },
            ...[
              [false, 'Horizontal'],
              [true, 'Vertical'],
            ].map(([v, text]) =>
              h(
                'button',
                {
                  type: 'button',
                  class: obsVertical === v ? 'active' : '',
                  onclick: () => ((obsVertical = v), renderForm()),
                },
                text,
              ),
            ),
          ),
        ),
        h('div', { style: 'height:10px' }),
        h(
          'ol',
          { class: 'steps' },
          h('li', {}, 'No OBS, em Fontes, clique em + e escolha Navegador.'),
          h(
            'li',
            {},
            'Marque "Arquivo local" e escolha um dos arquivos abaixo. Se preferir, deixe desmarcado e cole o endereço.',
          ),
          h('li', {}, t('Preencha largura {w} e altura {h}.', { w, h: hgt })),
          h('li', {}, 'Deixe a fonte por cima das câmeras.'),
        ),
        h('div', { style: 'height:10px' }),
        info?.sourcesDir
          ? h(
              'div',
              { class: 'copyRow' },
              h('code', { 'data-raw': '' }, info.sourcesDir),
              h(
                'button',
                {
                  class: 'primary',
                  title: 'Abre a pasta dos arquivos no computador',
                  onclick: () => api('/api/open-folder', { method: 'POST' }),
                },
                'Abrir a pasta',
              ),
            )
          : null,
        h('div', { style: 'height:8px' }),
        h(
          'table',
          { class: 'apiTable' },
          h('tr', {}, h('th', {}, 'Elemento'), h('th', {}, 'Arquivo'), h('th', {}, 'Endereço')),
          ...(info?.sources || []).map((src) =>
            h(
              'tr',
              {},
              h('td', {}, label(src.element)),
              h('td', {}, h('code', {}, obsVertical ? src.verticalFile : src.file)),
              h(
                'td',
                {},
                copy(`${base}/source/${src.slug}${obsVertical ? '?layout=vertical' : ''}`),
              ),
            ),
          ),
        ),
        hint(
          '"All Elements" mostra tudo numa fonte só. Os outros arquivos mostram um elemento cada, para você separar por cena. Não use os dois na mesma cena: o elemento apareceria duas vezes.',
        ),
      ),
      card(
        '2. O painel (dock)',
        h(
          'ol',
          { class: 'steps' },
          h('li', {}, 'No OBS, abra o menu Docks → Docks de navegador personalizados.'),
          h('li', {}, 'Dê o nome "Lower Third" e cole o endereço abaixo.'),
          h(
            'li',
            {},
            'Encaixe o painel onde preferir: ele se ajusta a um espaço alto ou largo. A engrenagem dele abre esta página.',
          ),
        ),
        h('div', { style: 'height:8px' }),
        copy(base + '/dock'),
      ),
      card(
        'Stream Deck, Companion e outros',
        hint(
          'Estes endereços mostram e escondem os elementos sem plugin. No Stream Deck, use a ação "Site" com "Acessar em segundo plano".',
        ),
        h(
          'table',
          { class: 'apiTable' },
          row(
            'Mostrar / esconder um nome (1 = primeiro da lista)',
            '/api/live/lower/toggle?item=1',
          ),
          row('Próximo nome da lista', '/api/live/lower/show?item=next'),
          row('Esconder o nome', '/api/live/lower/hide'),
          row('Selo superior', '/api/live/top/toggle'),
          row('Barra inferior', '/api/live/ticker/toggle'),
          row('Cartão QR / PIX', '/api/live/card/toggle'),
          row('Agenda', '/api/live/agenda/toggle'),
          row('Rede social (1 = primeira)', '/api/live/social/toggle?item=1'),
          row('Logo', '/api/live/bug/toggle'),
          row('Tirar tudo do ar', '/api/live/all/hide'),
        ),
        hint('Troque "toggle" por "show" ou "hide" para só mostrar ou só esconder.'),
      ),
    ];
  },

  backup: () => [
    card(
      'Backup',
      hint(
        'O arquivo guarda todas as configurações, os nomes e o logo. Serve para levar tudo para outro computador.',
      ),
      h('div', { style: 'height:10px' }),
      h(
        'div',
        { class: 'fillRow' },
        h(
          'a',
          { href: '/api/backup', download: 'lower-third-web-backup.json' },
          h('button', { class: 'primary' }, 'Salvar backup'),
        ),
        h('input', {
          type: 'file',
          id: 'restoreFile',
          class: 'hidden',
          accept: '.json,application/json',
          onchange: async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            let body;
            try {
              body = JSON.parse(await file.text());
            } catch {
              return toast('Esse arquivo não é um backup do Lower Third Web.');
            }
            const r = await api('/api/restore', { method: 'POST', body });
            toast(r.error ? friendly(r.error) : 'Backup restaurado.');
          },
        }),
        h('button', { onclick: () => $('#restoreFile').click() }, 'Restaurar de um arquivo'),
      ),
    ),
  ],
};

// ---------- Shell ----------
function setPreview() {
  const el = ELEMENTS.includes(page) ? page : page === 'brand' ? 'card' : '';
  $('.content').classList.toggle('noPreview', !el);
  $('#previewPanel').classList.toggle('hidden', !el);
  if (!el) return;
  const src =
    `/overlay?preview=${el}` +
    (el === 'lower' && viewItem ? `&item=${viewItem}` : '') +
    (vertical ? '&layout=vertical' : '');
  const frame = $('#preview');
  if (frame.getAttribute('src') !== src) frame.setAttribute('src', src);
  $('#previewBox').classList.toggle('tall', vertical);
  $('#orient').replaceChildren(...orientButtons(setPreview));
  renderOnAir();
}
/** Horizontal (16:9) or vertical (9:16) preview. */
function orientButtons(after) {
  return [
    [false, 'Horizontal'],
    [true, 'Vertical'],
  ].map(([v, label]) =>
    h(
      'button',
      {
        type: 'button',
        class: vertical === v ? 'active' : '',
        title: v
          ? 'Prévia da fonte vertical (9:16), para Shorts, Reels e TikTok'
          : 'Prévia da fonte horizontal (16:9)',
        onclick: () => {
          vertical = v;
          after();
        },
      },
      label,
    ),
  );
}
function renderOnAir() {
  const b = $('#onAir'),
    el = ELEMENTS.includes(page) ? page : '';
  b.classList.toggle('hidden', !el);
  if (!el || !live) return;
  const on = live[el].on;
  b.classList.toggle('on', on);
  b.textContent = on ? 'No ar: esconder' : 'Mostrar no OBS';
}
function renderMoved() {
  const fresh = pages.layout()[0],
    row = $('#form .fillRow.moved');
  row?.replaceWith(fresh.querySelector('.fillRow.moved'));
}
function go(id) {
  page = localStorage.ltwPage = id;
  renderNav();
  renderForm();
  setPreview();
  scrollTo(0, 0);
}
/** The OBS-style eye: switches a whole category on or off. */
function eye(el) {
  const on = config.enabled[el];
  const b = h('span', {
    class: 'eye' + (on ? '' : ' closed'),
    role: 'button',
    tabindex: '0',
    title: on
      ? 'Categoria ativa. Clique para desativar: ela sai do painel do OBS e da tela.'
      : 'Categoria desativada. Clique para ativar e voltar a aparecer no painel do OBS.',
    onclick: (e) => {
      e.stopPropagation();
      set(`enabled.${el}`, !on);
      renderNav();
      renderForm();
    },
  });
  b.innerHTML = on ? EYE : EYE_OFF;
  return b;
}
function renderNav() {
  const nodes = [];
  let group = '';
  for (const [id, label, g, desc, icon] of PAGES) {
    if (g !== group) nodes.push(h('div', { class: 'group' }, (group = g)));
    const b = h('button', {
      class: id === page ? 'active' : '',
      title: desc,
      onclick: () => go(id),
    });
    b.innerHTML = icon;
    b.append(h('span', {}, label));
    if (live?.[id]?.on) b.append(h('i', { class: 'liveDot', title: 'No ar' }));
    if (ELEMENTS.includes(id)) {
      b.classList.toggle('off', !config.enabled[id]);
      b.append(eye(id));
    }
    nodes.push(b);
  }
  $('#nav').replaceChildren(...nodes);
  const current = PAGES.find(([id]) => id === page) || PAGES[0];
  $('#pageTitle').textContent = current[1];
  $('#pageDesc').textContent = current[3];
}
function renderForm() {
  if (!config) return;
  if (!pages[page]) page = 'home';
  if (!config.lower.items.some((i) => i.id === viewItem))
    viewItem = config.lower.items[0]?.id || '';
  // The layout editor keeps its iframe while elements are being dragged.
  if (page === 'layout' && $('#form .editor iframe')) return renderMoved();
  const off =
    ELEMENTS.includes(page) && !config.enabled[page]
      ? h(
          'section',
          { class: 'card offNote' },
          eye(page),
          h(
            'span',
            {},
            'Esta categoria está desativada: não aparece no painel do OBS nem vai ao ar.',
          ),
          h(
            'button',
            {
              class: 'primary',
              onclick: () => {
                set(`enabled.${page}`, true);
                renderNav();
                renderForm();
              },
            },
            'Ativar',
          ),
        )
      : null;
  $('#form').replaceChildren(...[off, ...pages[page]()].filter(Boolean));
  if (page === 'brand') checkPix();
}
$('#replay').onclick = () => {
  const el = ELEMENTS.includes(page) ? page : 'card';
  $('#preview').contentWindow?.postMessage({ type: 'replay', el }, location.origin);
};
$('#onAir').onclick = async () => {
  const r = await api(
    `/api/live/${page}/toggle` + (page === 'lower' && viewItem ? `?item=${viewItem}` : ''),
    { method: 'POST' },
  );
  if (r.error) toast(friendly(r.error));
};
function applyUiTheme(t = theme()) {
  $('#themeToggle img').src = t === 'dark' ? '/icons/sun.svg' : '/icons/moon.svg';
}
applyUiTheme();
$('#themeToggle').onclick = () => applyUiTheme(toggleTheme());

api('/api/fonts').then((fonts) => {
  if (!Array.isArray(fonts)) return;
  installedFonts = fonts;
  if (config && !$('#form').contains(document.activeElement)) renderForm();
});
api('/api/info').then((r) => {
  if (r.error) return;
  info = r;
  if (config && (page === 'home' || page === 'obs')) renderForm();
});
$('#language').replaceChildren(...LANGUAGES.map(([v, label]) => h('option', { value: v }, label)));
$('#language').onchange = async (e) => {
  config.language = e.target.value;
  await api('/api/config', { method: 'PUT', body: config });
  useLanguage(config.language);
};
autoLocalize();
connect(
  (e) => {
    renderVersion(e.version);
    const liveChanged = e.live && JSON.stringify(e.live) !== JSON.stringify(live);
    if (e.live) live = e.live;
    if (e.type === 'config' && e.origin !== clientId) {
      // A change made elsewhere (the dock, a restored backup, another tab): show it,
      // unless the person is typing here right now.
      config = e.config;
      if (
        !$('#form').contains(document.activeElement) ||
        document.activeElement.tagName === 'BUTTON'
      )
        renderForm();
    } else if (e.config && !config) {
      config = e.config;
      renderNav();
      renderForm();
      setPreview();
    } else if (liveChanged && page === 'home') renderForm();
    if (config) {
      useLanguage(config.language);
      $('#language').value = config.language;
    }
    if (liveChanged) renderNav();
    renderOnAir();
  },
  (online) => {
    $('#conn').classList.toggle('ok', online);
    $('#conn span').textContent = online ? 'Programa ativo' : 'Sem conexão com o programa';
  },
);

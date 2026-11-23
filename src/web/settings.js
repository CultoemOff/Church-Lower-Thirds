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
  ANIMATIONS,
  CARD_TEMPLATES,
  fillCss,
  LOWER_TEMPLATES,
  SHADOWS,
  TOP_TEMPLATES,
} from './js/look.js';

// Global settings, opened in the normal browser so the OBS dock can stay small.
// Every change is saved at once and shows in the preview and in OBS.
let config = null,
  live = null,
  page = localStorage.ltwPage || 'brand',
  viewItem = '',
  saveTimer = 0;

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
const PAGES = [
  ['brand', 'Igreja e PIX'],
  ['lower', 'Lower third'],
  ['top', 'Barra superior'],
  ['card', 'Cartão QR / PIX'],
  ['bug', 'Logo'],
  ['obs', 'OBS e atalhos'],
  ['backup', 'Backup'],
];
const ELEMENTS = ['lower', 'top', 'card', 'bug'];
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
function font(path, label) {
  const sample = h(
    'span',
    { style: `font-family:"${get(path)}",system-ui;font-size:15px` },
    get(path) ? 'Aa Bb Cc 123' : '',
  );
  return field(
    label,
    h(
      'div',
      { class: 'fillRow' },
      h('input', {
        list: 'fontList',
        value: get(path),
        placeholder: path === 'brand.font' ? 'Fonte do sistema' : 'Usar a fonte geral',
        style: 'flex:1;min-width:140px',
        oninput: (e) => {
          set(path, e.target.value);
          sample.style.fontFamily = `"${e.target.value}",system-ui`;
          sample.textContent = e.target.value ? 'Aa Bb Cc 123' : '';
        },
      }),
      sample,
    ),
    { tip: 'Qualquer fonte instalada neste computador: escolha na lista ou digite o nome dela.' },
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
        range('lower.autoHide', 'Esconder sozinho depois de', 0, 60, ' s', {
          tip: '0 = fica na tela até você esconder.',
        }),
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
        check('top.showClock', 'Relógio', { rerender: true }),
        ...(config.top.showClock
          ? [
              check('top.showDate', 'Data embaixo da hora'),
              check('top.clockSeconds', 'Mostrar segundos'),
              check('top.clock12h', 'Formato 12 horas'),
            ]
          : []),
        check('top.showQr', 'QR Code', {
          rerender: true,
          tip: 'Fica melhor nos modelos Barra grande e Ilhas.',
        }),
        ...(config.top.showQr ? qrChoice('top') : []),
      ),
    ),
    card(
      'Recados',
      grid(
        check('top.showMessages', 'Mostrar recados'),
        select('top.order', 'Ordem', [
          ['sequence', 'Na sequência'],
          ['random', 'Aleatória'],
        ]),
        range('top.interval', 'Trocar a cada', 3, 60, ' s'),
        field(
          'Recados (um por linha)',
          h('textarea', {
            rows: 6,
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
    ),
    card(
      'Cores e texto',
      grid(
        fill('top.fill', 'Cor da barra'),
        fill('top.accent', 'Cor de destaque'),
        color('top.text', 'Texto principal'),
        color('top.text2', 'Texto dos recados'),
        font('top.font', 'Fonte'),
        select('top.weight', 'Peso do texto', WEIGHTS),
      ),
    ),
    card(
      'Tamanho',
      grid(
        range('top.size', 'Tamanho', 60, 180, '%'),
        range('top.margin', 'Distância das bordas', 0, 120, ' px', {
          tip: 'Vale para os modelos Flutuante e Ilhas.',
        }),
      ),
    ),
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
      hint('Para o PIX, a chave e o texto ao lado do QR Code ficam na aba "Igreja e PIX".'),
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
        select('card.position', 'Lugar na tela', [
          ...POSITIONS,
          ['center-left', 'No meio, à esquerda'],
          ['center-right', 'No meio, à direita'],
          ['center', 'No centro'],
        ]),
        range('card.size', 'Tamanho', 50, 200, '%'),
        range('card.marginX', 'Distância da lateral', 0, 400, ' px'),
        range('card.marginY', 'Distância de cima / de baixo', 0, 400, ' px'),
        range('card.autoHide', 'Esconder sozinho depois de', 0, 300, ' s', {
          tip: '0 = fica na tela até você esconder.',
          step: 5,
        }),
      ),
    ),
    effects('card'),
  ],

  bug: () => [
    config.brand.logo
      ? null
      : card(
          'Logo',
          hint('Envie o logo da igreja na aba "Igreja e PIX" para usar este elemento.', 'bad'),
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

  obs: () => {
    const base = location.origin;
    const copy = (text) =>
      h(
        'div',
        { class: 'copyRow' },
        h('code', {}, text),
        h(
          'button',
          {
            onclick: () => navigator.clipboard.writeText(text).then(() => toast('Copiado.')),
          },
          'Copiar',
        ),
      );
    const row = (what, path) =>
      h('tr', {}, h('td', {}, what), h('td', {}, h('code', {}, base + path)));
    return [
      card(
        '1. Os gráficos (fonte de navegador)',
        h(
          'ol',
          { class: 'steps' },
          h('li', {}, 'No OBS, em Fontes, clique em + e escolha Navegador.'),
          h('li', {}, 'Cole o endereço abaixo, com largura 1920 e altura 1080.'),
          h(
            'li',
            {},
            'Deixe essa fonte por cima das câmeras. Para aparecer em todas as cenas, coloque-a numa cena própria e adicione essa cena às outras.',
          ),
        ),
        h('div', { style: 'height:8px' }),
        copy(base + '/overlay'),
      ),
      card(
        '2. O painel (dock)',
        h(
          'ol',
          { class: 'steps' },
          h('li', {}, 'No OBS, abra o menu Docks → Docks de navegador personalizados.'),
          h('li', {}, 'Dê o nome "Lower Third" e cole o endereço abaixo.'),
          h('li', {}, 'Encaixe o painel onde preferir. A engrenagem dele abre esta página.'),
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
          row('Barra superior', '/api/live/top/toggle'),
          row('Cartão QR / PIX', '/api/live/card/toggle'),
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
  const src = `/overlay?preview=${el}` + (el === 'lower' && viewItem ? `&item=${viewItem}` : '');
  const frame = $('#preview');
  if (frame.getAttribute('src') !== src) frame.setAttribute('src', src);
  renderOnAir();
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
function renderNav() {
  $('#nav').replaceChildren(
    ...PAGES.map(([id, label]) =>
      h(
        'button',
        {
          class: id === page ? 'active' : '',
          onclick: () => {
            page = localStorage.ltwPage = id;
            renderNav();
            renderForm();
            setPreview();
          },
        },
        label,
      ),
    ),
  );
}
function renderForm() {
  if (!config) return;
  if (!pages[page]) page = 'brand';
  if (!config.lower.items.some((i) => i.id === viewItem))
    viewItem = config.lower.items[0]?.id || '';
  $('#form').replaceChildren(...pages[page]().filter(Boolean));
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
function applyTheme(t = theme()) {
  $('#themeToggle img').src = t === 'dark' ? '/icons/sun.svg' : '/icons/moon.svg';
}
applyTheme();
$('#themeToggle').onclick = () => applyTheme(toggleTheme());

api('/api/fonts').then((fonts) => {
  if (Array.isArray(fonts))
    $('#fontList').replaceChildren(...fonts.map((f) => h('option', { value: f })));
});
connect((e) => {
  renderVersion(e.version);
  if (e.live) live = e.live;
  if (e.type === 'config' && e.origin !== clientId) {
    // A change made elsewhere (the dock, a restored backup, another tab): show it, unless
    // the person is typing here right now.
    config = e.config;
    if (!$('#form').contains(document.activeElement) || document.activeElement.tagName === 'BUTTON')
      renderForm();
  } else if (e.config && !config) {
    config = e.config;
    renderNav();
    renderForm();
    setPreview();
  }
  renderOnAir();
});

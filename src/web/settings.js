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
  namesCsv,
  parseNames,
  plain,
  STEP_KINDS,
  STEP_NAMES,
  stepChoices,
  stepText,
} from './js/lists.js';
import {
  AGENDA_TEMPLATES,
  ANIMATIONS,
  CARD_TEMPLATES,
  COMMENT_TEMPLATES,
  COUNTDOWN_TEMPLATES,
  dateText,
  DECORS,
  EYE,
  EYE_OFF,
  fillCss,
  LOWER_TEMPLATES,
  NETWORKS,
  SHADOWS,
  SOCIAL_TEMPLATES,
  themed,
  THEMED_ELEMENTS,
  THEMED_KEYS,
  TICKER_TEMPLATES,
  TOP_TEMPLATES,
} from './js/look.js';
import {
  guideAddSource,
  guideDocked,
  guideDockDialog,
  guideDockMenu,
  guideOrder,
  guideSourceProps,
} from './js/obs-guide.js';
import { BUNDLED_FONTS } from './js/fonts.js';
import {
  applyCustom,
  buildPrompt,
  CUSTOM,
  CUSTOM_ELEMENTS,
  customCovers,
  scopeCss,
} from './js/custom.js';
import { applyModel, MODELS, modelTemplate, ownColors, paletteOf, PALETTES } from './js/models.js';
import { autoLocalize, lang, LANGUAGES, t, useLanguage } from './js/i18n.js';

// Global settings, opened in the normal browser so the OBS dock can stay small.
// Every change is saved at once and shows in the preview and in OBS.
let config = null,
  live = null,
  // #rundown in the address opens that page (the dock's "Editar o roteiro").
  page = location.hash.slice(1) || localStorage.cltPage || 'home',
  info = null,
  vertical = false,
  viewItem = '',
  saveTimer = 0,
  installedFonts = [],
  obsVertical = false,
  update = null,
  updateState = '',
  updateBlocked = '',
  afterSave = null;

const NAMES = {
  classic: 'Clássico',
  glass: 'Vidro',
  custom: 'Próprio',
  big: 'Números grandes',
  ribbon: 'Faixa inclinada',
  minimal: 'Só texto',
  pill: 'Cápsula',
  split: 'Bloco duplo',
  underline: 'Sublinhado',
  neon: 'Neon',
  news: 'Telejornal',
  stack: 'Cartões',
  liquid: 'Vidro líquido',
  plaque: 'Placa',
  bubble: 'Balão',
  youth: 'Urbano',
  kids: 'Adesivo',
  floral: 'Delicado',
  flowers: 'Flores',
  stars: 'Estrelas',
  spark: 'Faísca',
  notes: 'Notas musicais',
  band: 'Barras de som',
  xmas: 'Natal: estrela de Belém',
  xmaskids: 'Natal: manjedoura e estrela',
  easter: 'Páscoa: lírios e cruz',
  easterkids: 'Páscoa: túmulo vazio',
  egypt: 'Natal no Egito: sol e pirâmides',
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
  drop: 'Gota d’água',
  unfold: 'Linha que se abre',
  glide: 'Deslize com rastro',
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
    'Geral e contribuições',
    'Igreja',
    'Nome, logo, idioma, tempo na tela e a forma de contribuir: PIX, transferência, link ou dados bancários.',
    svg('<path d="M12 3v5M9.500 5.500h5M6 21V11l6-3 6 3v10M4 21h16M10 21v-5h4v5"/>'),
  ],
  [
    'theme',
    'Tema global',
    'Igreja',
    'As cores, a fonte e a forma que todos os elementos seguem. Cada elemento pode ter a própria aparência.',
    svg(
      '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18c1.500 0 2-1 2-2s-1-1.500 0-2.500 4 .500 5-2"/><circle cx="8" cy="10" r="1"/><circle cx="12" cy="7.500" r="1"/><circle cx="16" cy="10" r="1"/>',
    ),
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
    'Ofertas e Dízimos',
    'Elementos',
    'Cartão com QR Code: ofertas, dízimos, missões, uma campanha ou um link.',
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
    'comment',
    'Comentários',
    'Elementos',
    'Um comentário digitado na hora, com o nome de quem escreveu.',
    svg('<path d="M4 5.500h16v10.500h-8.500L7 19.500V16H4z"/><path d="M8 9.500h8M8 12.500h5"/>'),
  ],
  [
    'countdown',
    'Contagem regressiva',
    'Elementos',
    '"O culto começa em 05:00".',
    svg('<circle cx="12" cy="13" r="7.500"/><path d="M12 9v4l2.500 2M9.500 3h5"/>'),
  ],
  [
    'rundown',
    'Roteiro do culto',
    'Tela',
    'A ordem do que vai ao ar: no painel do OBS, um clique em "Próximo" a cada momento.',
    svg('<path d="M8 6h12M8 12h12M8 18h12M4 6h.010M4 12h.010M4 18h.010"/>'),
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
    'Endereços para o OBS, tutorial, resoluções e atalhos.',
    svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.500"/>'),
  ],
  [
    'backup',
    'Backup',
    'Instalação',
    'Salvar e restaurar tudo num arquivo, ou voltar às configurações iniciais.',
    svg('<path d="M12 4v11M7.500 10.500L12 15l4.500-4.500M5 19h14"/>'),
  ],
  [
    'about',
    'Sobre',
    'Instalação',
    'Quem faz o Church Lower Thirds e onde encontrar o Culto em Off.',
    svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.500v.500"/>'),
  ],
];
/** Pages opened from the top right corner instead of the menu on the left. */
const CORNER = ['obs', 'backup', 'about'];
const ELEMENTS = [
  'lower',
  'top',
  'ticker',
  'card',
  'agenda',
  'social',
  'comment',
  'countdown',
  'bug',
];
const WEIGHTS = [
  [300, 'Leve'],
  [400, 'Normal'],
  [500, 'Médio'],
  [600, 'Seminegrito'],
  [700, 'Negrito'],
  [800, 'Extra negrito'],
  [900, 'Preto'],
];
/** The model in use: its formats, font and drawing (an element may have its own colors). */
const currentModel = () =>
  MODELS.find(
    (k) =>
      config.brand.font === k.font &&
      (config.theme.decor || '') === (k.decor || '') &&
      THEMED_ELEMENTS.every((el) => config[el].template === modelTemplate(k, el)),
  );
/** The ready-made colors in use, while none of them was changed by hand. */
const currentPalette = () => paletteOf(config.theme);
/**
 * Blocks that survive the redraws of the form: the pictures of the models are real pages
 * of the overlay, and taking one out of the page would load it again.
 */
const kept = {};
function keep(key, build, refresh) {
  const node = (kept[key] ??= build());
  node.dataset.keep = key;
  refresh?.(node);
  return node;
}
/** Like replaceChildren, but a kept block that is already there stays where it is. */
function refill(parent, nodes) {
  const next = nodes.filter(Boolean);
  for (const c of [...parent.childNodes]) if (!next.includes(c)) c.remove();
  // What is left are kept blocks, in the order they had; the new ones go in around them.
  let at = parent.firstChild;
  for (const n of next) {
    if (n === at) at = at.nextSibling;
    else if (n.parentNode !== parent) parent.insertBefore(n, at);
  }
}
/**
 * The models as small live pictures: each one is the overlay itself (badge, name, card and
 * bottom bar) drawn with that model and the colors it suggests, with the church's own
 * name and logo. They stand still: the entrance is shown by the big preview.
 */
function modelGallery(where, themed) {
  return keep(
    `${where}-${themed ? 'themed' : 'models'}`,
    () =>
      h(
        'div',
        { class: 'themes' },
        MODELS.filter((k) => !!k.themed === themed).map((k) => {
          const frame = h('iframe', {
            src: `/overlay?preview=model&model=${k.id}`,
            loading: 'lazy',
            tabindex: '-1',
            title: k.name,
          });
          return h(
            'button',
            {
              type: 'button',
              'data-model': k.id,
              title: k.hint,
              onclick: () => useModel(k),
            },
            h('span', { class: 'themeShot' }, frame),
            h('strong', {}, k.name),
            h('small', {}, k.hint),
          );
        }),
      ),
    (node) => {
      const now = currentModel();
      for (const b of node.children) b.classList.toggle('active', b.dataset.model === now?.id);
    },
  );
}
/** How a folding block was left ('' = never touched: `usual` decides). */
function folded(key, usual) {
  try {
    const stored = localStorage.getItem(key);
    return stored === '1' || (stored !== '0' && usual);
  } catch {
    return usual;
  }
}
function remember(key, open) {
  try {
    localStorage.setItem(key, open ? '1' : '0');
  } catch {
    // Without storage it just does not remember.
  }
}
/**
 * The themed models (ministries and special dates) stay folded until asked for: they are
 * many, and most weeks nobody needs them. Their pictures only load once the block opens.
 */
function themedFold(where) {
  return keep(
    `${where}-themed-fold`,
    () => {
      const box = h(
        'details',
        { class: 'fold' + (where === 'page' ? ' card' : '') },
        h(
          'summary',
          { title: 'Clique para ver os modelos temáticos' },
          h('h3', {}, 'Modelos temáticos'),
          h(
            'span',
            {},
            'Para ministérios e datas especiais: jovens, crianças, mulheres, coral, banda, Natal e Páscoa.',
          ),
          h('i', { class: 'caret' }),
        ),
        where === 'page' ? hint('O desenho pode ser trocado em "Fonte e forma".') : null,
        modelGallery(where, true),
      );
      // Open when that is how the person left it, or while one of them is in use.
      box.open = folded('cltThemedOpen', !!currentModel()?.themed);
      box.addEventListener('toggle', () => remember('cltThemedOpen', box.open));
      return box;
    },
    () => modelGallery(where, true),
  );
}
// ---------- Sharing: a custom model or a profile as a file ----------
/** A button that reads a model or profile file from another church and adds it here. */
function importButton(label) {
  const file = h('input', {
    type: 'file',
    class: 'hidden',
    accept: '.json,application/json',
    onchange: async (e) => {
      const f = e.target.files[0];
      e.target.value = '';
      if (!f) return;
      let body;
      try {
        body = JSON.parse(await f.text());
      } catch {
        return toast('Esse arquivo não é um modelo nem um perfil do Church Lower Thirds.');
      }
      const r = await api('/api/share/import', { method: 'POST', body });
      if (r.error) return toast(friendly(r.error));
      config = r.config;
      renderProfiles();
      renderForm();
      toast(
        r.kind === 'profile'
          ? 'Perfil importado. Escolha-o no seletor de perfis para usar.'
          : 'Modelo importado. Ele está em "Modelos próprios".',
      );
    },
  });
  return h(
    'div',
    { class: 'fillRow shareRow' },
    file,
    h(
      'button',
      {
        type: 'button',
        title: 'Aceita arquivos de modelo e de perfil exportados pelo Church Lower Thirds',
        onclick: () => file.click(),
      },
      label,
    ),
  );
}
// ---------- The church's own models ----------
// A look written as CSS, usually by an AI from the prompt this page hands out. The CSS is
// read rule by rule (js/custom.js): what it may not do is left out, and the page says so.
const pageName = (id) => t(PAGES.find((p) => p[0] === id)?.[1] || id);
const usualTemplates = () =>
  Object.fromEntries(CUSTOM_ELEMENTS.map((el) => [el, modelTemplate(MODELS[0], el)]));
// What the person is asking the AI for, and the model being written (null = editor closed).
let customWish = '',
  customParts = new Set(CUSTOM_ELEMENTS),
  customEdit = null,
  promptShown = '';
/** Shows a CSS in the big preview without saving it ('' = back to what is saved). */
const tryCustom = (css) =>
  $('#preview')?.contentWindow?.postMessage({ type: 'draft', css }, location.origin);
/** What the program understood of a pasted CSS, in plain words. */
function customReport(css) {
  if (!css.trim())
    return [hint('Cole aqui o código que a IA escreveu: o programa confere na hora.')];
  const r = scopeCss(css),
    count = (why) => r.dropped.filter((d) => d[0] === why).length,
    odd = count('rule') + count('nested') + count('unreadable');
  const line = (cls, text) => h('p', { class: 'hint ' + cls, 'data-raw': '' }, text);
  return [
    r.rules
      ? line(
          'ok',
          t('Regras aceitas: {n}. Desenha: {list}.', {
            n: r.rules,
            list: r.covered.map(pageName).join(', '),
          }),
        )
      : line('bad', t('Nenhuma regra pôde ser usada. Confira se colou só o código CSS.')),
    count('selector')
      ? line(
          'warn',
          t(
            'Seletores ignorados ({n}): cada um precisa começar pelo nome de um elemento (.lower, .top, .ticker, .card, .agenda, .social, .comment, .countdown).',
            { n: count('selector') },
          ),
        )
      : null,
    count('address')
      ? line(
          'warn',
          t('Linhas ignoradas ({n}): o modelo não pode buscar nada na internet.', {
            n: count('address'),
          }),
        )
      : null,
    odd ? line('warn', t('Trechos ignorados ({n}): só CSS simples é aceito.', { n: odd })) : null,
  ];
}
function saveCustom() {
  const name = customEdit.name.trim().slice(0, 40),
    css = customEdit.css;
  if (!name) return toast(t('Dê um nome ao modelo.'));
  if (!scopeCss(css).rules)
    return toast(t('Nenhuma regra pôde ser usada. Confira se colou só o código CSS.'));
  if (!customEdit.id && config.customModels.length >= 40)
    return toast(t('Há modelos demais: exclua um antes de criar outro.'));
  let model = config.customModels.find((m) => m.id === customEdit.id);
  if (model) Object.assign(model, { name, css });
  else {
    const id = [...crypto.getRandomValues(new Uint8Array(5))]
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    config.customModels.push((model = { id, name, css }));
  }
  customEdit = null;
  tryCustom('');
  useCustom(model);
}
function useCustom(model) {
  const covered = applyCustom(config, model, usualTemplates());
  afterSave = () => setTimeout(replayPreview, 350);
  save();
  renderForm();
  toast(
    t('Modelo "{name}" aplicado em: {list}.', {
      name: model.name,
      list: covered.map(pageName).join(', '),
    }),
  );
}
function removeCustom(model) {
  // What "Desfazer" puts back: the model, and the elements that were on it.
  const before = {
    at: config.customModels.indexOf(model),
    custom: config.theme.custom,
    templates: Object.fromEntries(CUSTOM_ELEMENTS.map((el) => [el, config[el].template])),
  };
  toast(t('Modelo "{name}" excluído.', { name: model.name }), () => {
    config.customModels.splice(before.at, 0, model);
    config.theme.custom = before.custom;
    for (const el of CUSTOM_ELEMENTS) config[el].template = before.templates[el];
    save();
    renderForm();
  });
  config.customModels = config.customModels.filter((m) => m !== model);
  if (config.theme.custom === model.id) {
    // Its elements go back to the first ready-made model.
    config.theme.custom = '';
    const usual = usualTemplates();
    for (const el of CUSTOM_ELEMENTS)
      if (config[el].template === CUSTOM) config[el].template = usual[el];
  }
  if (customEdit?.id === model.id) customEdit = null;
  save();
  renderForm();
}
async function copyPrompt() {
  const lang = {
    'pt-BR': 'Brazilian Portuguese',
    'pt-PT': 'European Portuguese',
    es: 'Spanish',
    it: 'Italian',
    de: 'German',
  };
  const text = await buildPrompt({
    wish: customWish,
    elements: [...customParts],
    language: lang[document.documentElement.lang] || 'English',
  });
  try {
    await navigator.clipboard.writeText(text);
    promptShown = '';
    toast(t('Prompt copiado. Cole em uma IA e traga de volta o código que ela escrever.'));
  } catch {
    // The browser did not let the page copy: the text is shown to be copied by hand.
    promptShown = text;
  }
  renderForm();
}
function customCard() {
  const models = config.customModels;
  const gallery = models.length
    ? h(
        'div',
        { class: 'themes' },
        models.map((m) =>
          h(
            'div',
            { class: 'customItem' },
            h(
              'button',
              {
                type: 'button',
                class: config.theme.custom === m.id ? 'active' : '',
                title: 'Usar este modelo',
                onclick: () => useCustom(m),
              },
              keep(`custom-shot-${m.id}`, () =>
                h(
                  'span',
                  { class: 'themeShot' },
                  h('iframe', {
                    src: `/overlay?preview=model&model=custom:${m.id}`,
                    loading: 'lazy',
                    tabindex: '-1',
                    title: m.name,
                  }),
                ),
              ),
              h('strong', { 'data-raw': '' }, m.name),
              h('small', { 'data-raw': '' }, customCovers(m.css).map(pageName).join(', ')),
            ),
            h(
              'div',
              { class: 'customActions' },
              h(
                'button',
                {
                  type: 'button',
                  onclick: () => {
                    customEdit = { id: m.id, name: m.name, css: m.css };
                    renderForm();
                  },
                },
                'Editar',
              ),
              h(
                'a',
                { href: `/api/share/model?id=${m.id}`, download: '' },
                h(
                  'button',
                  {
                    type: 'button',
                    title: 'Salva este modelo num arquivo, para levar a outra igreja',
                  },
                  'Exportar',
                ),
              ),
              h('button', { type: 'button', onclick: () => removeCustom(m) }, 'Excluir'),
            ),
          ),
        ),
      )
    : null;
  const report = h(
    'div',
    { class: 'customReport' },
    ...(customEdit ? customReport(customEdit.css) : []),
  );
  const editor = customEdit
    ? h(
        'div',
        { class: 'customEditor' },
        field(
          'Nome do modelo',
          h('input', {
            value: customEdit.name,
            maxlength: 40,
            placeholder: t('Ex.: Faixas chanfradas'),
            'data-raw': '',
            oninput: (e) => (customEdit.name = e.target.value),
          }),
        ),
        field(
          'Código que a IA escreveu (CSS)',
          h('textarea', {
            class: 'code',
            spellcheck: 'false',
            'data-raw': '',
            value: customEdit.css,
            oninput: (e) => {
              customEdit.css = e.target.value;
              report.replaceChildren(...customReport(customEdit.css).filter(Boolean));
            },
          }),
          { wide: true },
        ),
        report,
        h(
          'div',
          { class: 'customActions' },
          h(
            'button',
            {
              type: 'button',
              title:
                'Mostra na prévia grande, sem salvar. A prévia mostra nomes, selo, barra e ofertas; os outros elementos aparecem nas páginas deles depois de salvar.',
              onclick: () => {
                tryCustom(customEdit.css);
                setTimeout(replayPreview, 200);
              },
            },
            'Ver na prévia',
          ),
          h('button', { type: 'button', class: 'primary', onclick: saveCustom }, 'Salvar e usar'),
          h(
            'button',
            {
              type: 'button',
              onclick: () => {
                customEdit = null;
                tryCustom('');
                renderForm();
              },
            },
            'Cancelar',
          ),
        ),
      )
    : null;
  // Folded like the themed models; it stays open while the person is working in it.
  const box = keep('custom-fold', () => {
    const d = h(
      'details',
      { class: 'fold card' },
      h(
        'summary',
        { title: 'Clique para ver e criar modelos próprios' },
        h('h3', {}, 'Modelos próprios'),
        h('span', {}, 'Crie o seu próprio modelo com a ajuda de uma IA.'),
        h('i', { class: 'caret' }),
      ),
      h('div', { class: 'foldBody' }),
    );
    d.open = folded('cltCustomOpen', config.theme.custom !== '');
    d.addEventListener('toggle', () => remember('cltCustomOpen', d.open));
    return d;
  });
  if (customEdit) box.open = true;
  refill(box.lastElementChild, [
    hint(
      'Crie o seu próprio modelo com a ajuda de uma IA: formatos, bordas, transparências. O programa entrega um prompt com tudo o que a IA precisa saber; ela devolve um código, que é colado aqui. As cores continuam sendo as do tema, e os textos, posições e animações de entrada continuam por conta do programa.',
    ),
    gallery,
    h(
      'ol',
      { class: 'customSteps' },
      h(
        'li',
        {},
        h('b', {}, 'Descreva o estilo e copie o prompt'),
        h('textarea', {
          value: customWish,
          rows: 2,
          placeholder: t(
            'Ex.: faixas com o canto direito chanfrado, uma linha fina de destaque em cima e fundo levemente transparente',
          ),
          'data-raw': '',
          oninput: (e) => (customWish = e.target.value),
        }),
        h(
          'div',
          { class: 'chips' },
          CUSTOM_ELEMENTS.map((el) =>
            h(
              'button',
              {
                type: 'button',
                class: customParts.has(el) ? 'active' : '',
                title: 'Elementos que a IA vai desenhar. Os outros ficam no modelo em uso.',
                onclick: () => {
                  customParts.has(el) ? customParts.delete(el) : customParts.add(el);
                  if (!customParts.size) customParts.add(el);
                  renderForm();
                },
              },
              pageName(el),
            ),
          ),
        ),
        h(
          'button',
          { type: 'button', class: 'primary', onclick: copyPrompt },
          'Copiar prompt para a IA',
        ),
        promptShown
          ? h('textarea', { class: 'code', readonly: true, 'data-raw': '', value: promptShown })
          : null,
      ),
      h(
        'li',
        {},
        h('b', {}, 'Cole o prompt em uma IA (ChatGPT, Claude, Gemini ou outra)'),
        hint('Se o resultado não agradar, peça ajustes na mesma conversa e traga o código novo.'),
      ),
      h(
        'li',
        {},
        h('b', {}, 'Cole aqui o código que ela escreveu'),
        editor ||
          h(
            'button',
            {
              type: 'button',
              onclick: () => {
                customEdit = { id: '', name: '', css: '' };
                renderForm();
              },
            },
            'Novo modelo',
          ),
      ),
    ),
    importButton('Importar modelo de um arquivo'),
  ]);
  return box;
}
/**
 * The ready-made colors, each as a small name bar. The one in use is marked, and so is the
 * one the model in use suggests.
 */
const paletteGallery = () => {
  const now = currentPalette(),
    model = currentModel();
  return h(
    'div',
    { class: 'palettes' },
    // The glass comes first: it is an effect as much as a set of colors.
    [...PALETTES.filter((p) => p[6]), ...PALETTES.filter((p) => !p[6])].map((p) => {
      const [name, main, surface, accent, t1, t2] = p;
      return h(
        'button',
        {
          type: 'button',
          // The glass colors are in use only while the glass itself is on.
          class: p === now && !!p[6] === !!config.theme.glass ? 'active' : '',
          title: p[6]
            ? 'Placas transparentes, que desfocam a imagem atrás, em qualquer modelo'
            : 'Troca só as cores, sem mexer no modelo',
          onclick: () => applyPalette(p),
        },
        h(
          'span',
          { class: 'swatch', style: `background:${fillCss(surface)}` },
          h(
            'i',
            { style: `background:${fillCss(main)};color:${t1}` },
            h('b', { style: `background:${fillCss(accent)}` }),
            h('span', { 'data-raw': '' }, 'Aa'),
            h('u', { style: `background:${t2}` }),
          ),
        ),
        h('strong', {}, name),
        model?.palette === name ? h('small', {}, 'Sugerida para este modelo') : null,
        p[6] ? h('small', {}, 'Efeito de vidro em qualquer modelo') : null,
      );
    }),
  );
};
function useModel(model, reset = false) {
  const kept = applyModel(config, model, { reset });
  // Once it is saved, the big preview shows how the model comes in.
  afterSave = () => setTimeout(replayPreview, 350);
  save();
  renderForm();
  toast(
    kept
      ? t('Modelo "{name}" aplicado. As cores escolhidas foram mantidas.', { name: t(model.name) })
      : t('Modelo "{name}" aplicado, com as cores "{colors}".', {
          name: t(model.name),
          colors: t(model.palette),
        }),
  );
}
/**
 * Under the models, while something of the user's own is in use (colors of the theme, or
 * an element with its own appearance): what stayed, and the way back to the whole model.
 */
function keptNote() {
  const model = currentModel(),
    own = THEMED_ELEMENTS.some((el) => config[el].custom);
  if (!model || !(own || ownColors(config))) return null;
  return h(
    'div',
    { class: 'keptNote' },
    hint(
      own
        ? 'Ao trocar de modelo, as cores escolhidas e os elementos com aparência própria continuam como estão.'
        : 'Ao trocar de modelo, as cores escolhidas continuam como estão.',
    ),
    h(
      'button',
      { type: 'button', onclick: () => useModel(model, true) },
      t('Usar as cores do modelo ({colors})', { colors: t(model.palette) }),
    ),
  );
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
    const then = afterSave;
    afterSave = null;
    if (!r.error) then?.();
    if (r.error) toast(friendly(r.error));
    else if (page === 'brand') checkGiving();
  }, 250);
}

// ---------- Field builders ----------
/** This setting belongs to the global theme while its element follows it. */
function byTheme(path) {
  const [el, key, more] = path.split('.');
  return !more && THEMED_ELEMENTS.includes(el) && !config[el].custom && THEMED_KEYS.includes(key);
}
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
const select = (path, label, options, { tip, rerender = false, wide = false } = {}) =>
  byTheme(path)
    ? null
    : field(
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
            h(
              'option',
              { value: v, selected: String(get(path)) === String(v) },
              l ?? NAMES[v] ?? v,
            ),
          ),
        ),
        { tip, wide },
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
  if (byTheme(path)) return null;
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
  byTheme(path)
    ? null
    : field(
        label,
        h('input', { type: 'color', value: get(path), oninput: (e) => set(path, e.target.value) }),
        { tip },
      );
/** Fonts shipped with the app first, then every font installed on this computer. */
function font(path, label) {
  if (byTheme(path)) return null;
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
  if (byTheme(path)) return null;
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
/** Takes an entry out of a list; for a few seconds, "Desfazer" puts it back. */
function removeAt(list, i) {
  if (i < 0) return;
  const [item] = list.splice(i, 1);
  save();
  renderForm();
  toast('Removido da lista.', () => {
    list.splice(Math.min(i, list.length), 0, item);
    save();
    renderForm();
  });
}
/** Hands a text to the browser as a file to keep. */
function saveFile(name, text, type = 'application/json') {
  const a = h('a', { href: URL.createObjectURL(new Blob([text], { type })), download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
// ---------- Names: search, and a list typed, pasted or read from a file ----------
let nameFind = '',
  importOpen = false,
  importText = '';
function namesTools() {
  const found = parseNames(importText);
  const add = (replace) => {
    // Read again: the text may have been typed after this was drawn.
    const fresh = parseNames(importText).map((n) => ({
      id: Math.random().toString(36).slice(2, 10),
      ...n,
      logo: true,
      qr: 'none',
      qrText: '',
    }));
    const before = config.lower.items;
    config.lower.items = (replace ? fresh : [...before, ...fresh]).slice(0, 200);
    importText = '';
    importOpen = false;
    save();
    renderForm();
    toast(t('{n} nomes na lista.', { n: config.lower.items.length }), () => {
      config.lower.items = before;
      save();
      renderForm();
    });
  };
  const count = h(
    'p',
    { class: 'hint', 'data-raw': '' },
    importText.trim() ? t('Nomes encontrados: {n}.', { n: found.length }) : '',
  );
  return h(
    'div',
    { class: 'namesTools' },
    h(
      'div',
      { class: 'fillRow' },
      h(
        'button',
        {
          title: 'Cole uma lista ou escolha um arquivo: um nome por linha, com o cargo depois',
          onclick: () => {
            importOpen = !importOpen;
            renderForm();
          },
        },
        'Importar lista',
      ),
      h(
        'button',
        {
          title: 'Salva os nomes num arquivo que o Excel e o Google Planilhas abrem',
          disabled: !config.lower.items.length,
          onclick: () =>
            saveFile('nomes.csv', namesCsv(config.lower.items), 'text/csv;charset=utf-8'),
        },
        'Exportar CSV',
      ),
    ),
    importOpen
      ? h(
          'div',
          { class: 'importBox' },
          hint(
            'Um nome por linha, com o cargo depois de um ponto e vírgula, uma tabulação, um traço ou uma vírgula. Exemplos: "Pr. João Silva; Pastor presidente" ou "Maria Souza - Louvor". Uma planilha salva como CSV também serve.',
          ),
          h('textarea', {
            rows: 6,
            'data-raw': '',
            value: importText,
            placeholder: 'Pr. João Silva; Pastor presidente\nMaria Souza; Louvor',
            oninput: (e) => {
              importText = e.target.value;
              const n = parseNames(importText).length;
              count.textContent = importText.trim() ? t('Nomes encontrados: {n}.', { n }) : '';
              for (const b of e.target.parentNode.querySelectorAll('[data-add]')) b.disabled = !n;
            },
          }),
          count,
          h(
            'div',
            { class: 'fillRow' },
            h('input', {
              type: 'file',
              id: 'namesFile',
              class: 'hidden',
              accept: '.csv,.txt,text/csv,text/plain',
              onchange: async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                importText = await file.text();
                renderForm();
              },
            }),
            h('button', { onclick: () => $('#namesFile').click() }, 'Escolher arquivo'),
            h(
              'button',
              {
                class: 'primary',
                'data-add': '',
                disabled: !found.length,
                onclick: () => add(false),
              },
              'Adicionar à lista',
            ),
            h(
              'button',
              {
                'data-add': '',
                disabled: !found.length,
                title: 'Troca todos os nomes da lista por estes',
                onclick: () => add(true),
              },
              'Substituir a lista',
            ),
          ),
        )
      : null,
  );
}
// ---------- Order of service ----------
function rundownCard() {
  const steps = config.rundown;
  const add = (kind) => {
    const first = stepChoices(config, kind, t)[0]?.[0] || '';
    steps.push({ id: Math.random().toString(36).slice(2, 10), kind, ref: first, note: '' });
    save();
    renderForm();
  };
  return card(
    'Passos',
    steps.length
      ? h(
          'div',
          { class: 'rows steps' },
          steps.map((step, i) => {
            const choices = stepChoices(config, step.kind, t),
              gone = stepText(config, step, t) === null;
            const move = (d) => {
              steps.splice(i + d, 0, steps.splice(i, 1)[0]);
              save();
              renderForm();
            };
            return h(
              'div',
              { class: 'row' + (gone ? ' bad' : '') },
              h('b', { class: 'num', 'data-raw': '' }, String(i + 1)),
              h('span', { class: 'kind' }, STEP_NAMES[step.kind]),
              choices.length || gone
                ? h(
                    'select',
                    {
                      title: 'O que este passo mostra',
                      onchange: (e) => {
                        step.ref = e.target.value;
                        save();
                        renderForm();
                      },
                    },
                    gone
                      ? h('option', { value: step.ref, selected: true }, '(apagado: escolha outro)')
                      : null,
                    choices.map(([id, text]) =>
                      h('option', { value: id, selected: id === step.ref, 'data-raw': '' }, text),
                    ),
                  )
                : h('span', { class: 'what', 'data-raw': '' }, stepText(config, step, t) || ''),
              h('input', {
                value: step.note,
                maxlength: 80,
                placeholder: 'Lembrete (ex.: depois do segundo louvor)',
                oninput: (e) => {
                  step.note = e.target.value;
                  save();
                },
              }),
              h('button', { title: 'Subir', disabled: i === 0, onclick: () => move(-1) }, '↑'),
              h(
                'button',
                { title: 'Descer', disabled: i === steps.length - 1, onclick: () => move(1) },
                '↓',
              ),
              h('button', { title: 'Remover', onclick: () => removeAt(steps, i) }, '×'),
            );
          }),
        )
      : hint('Nenhum passo ainda. Use os botões abaixo para montar o roteiro, na ordem do culto.'),
    h('div', { style: 'height:10px' }),
    h('div', { class: 'sectionTitle' }, 'Adicionar um passo'),
    h(
      'div',
      { class: 'chips' },
      STEP_KINDS.map((kind) => {
        // A kind with nothing saved yet has nothing to point at.
        const needs = ['lower', 'card', 'comment'].includes(kind),
          none = needs && !stepChoices(config, kind, t).length;
        return h(
          'button',
          {
            disabled: none || steps.length >= 80,
            title: none
              ? 'Salve primeiro um item deste tipo (no painel do OBS ou na página dele)'
              : 'Acrescenta este passo no fim do roteiro',
            onclick: () => add(kind),
          },
          '+ ' + t(STEP_NAMES[kind]),
        );
      }),
    ),
  );
}
/** The church's own model can be picked for an element while it draws that element. */
function withCustom(el, list) {
  const model = config.customModels.find((m) => m.id === config.theme.custom);
  return model && customCovers(model.css).includes(el) ? [...list, CUSTOM] : list;
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
/** First card of each element: follow the global theme, or use an appearance of its own. */
const appearance = (el) =>
  card(
    'Aparência',
    h(
      'div',
      { class: 'seg' },
      ...[
        [
          false,
          'Seguir o tema global',
          'Cores, fonte, cantos, sombra e opacidade vêm do tema global',
        ],
        [true, 'Aparência própria', 'Este elemento passa a ter as próprias cores, fonte e efeitos'],
      ].map(([v, text, title]) =>
        h(
          'button',
          {
            type: 'button',
            title,
            class: config[el].custom === v ? 'active' : '',
            onclick: () => {
              // Starting an own look from what is on screen now, not from old leftovers.
              if (v && !config[el].custom) Object.assign(config[el], ownLook(el));
              set(`${el}.custom`, v);
              renderForm();
            },
          },
          text,
        ),
      ),
    ),
    config[el].custom
      ? hint(
          'Este elemento usa as cores, a fonte e os efeitos escolhidos abaixo. O tema global não mexe nele.',
        )
      : h(
          'div',
          { class: 'copyRow' },
          hint('Cores, fonte, cantos, sombra e opacidade vêm do tema global.'),
          h('button', { onclick: () => go('theme') }, 'Abrir o tema global'),
        ),
  );
/** The theme's look written into the element's own settings (font stays the general one). */
function ownLook(el) {
  const look = themed(config, el),
    own = {};
  for (const k of THEMED_KEYS)
    if (k in config[el] && k !== 'font') own[k] = structuredClone(look[k]);
  return own;
}
const colors = (el, labels = {}) =>
  config[el].custom
    ? card(
        'Cores e texto',
        grid(
          fill(`${el}.fill`, labels.fill || 'Cor de fundo'),
          fill(`${el}.accent`, 'Cor de destaque'),
          color(`${el}.text`, labels.text || 'Texto principal'),
          `text2` in config[el] ? color(`${el}.text2`, labels.text2 || 'Texto de apoio') : null,
          font(`${el}.font`, 'Fonte'),
          select(`${el}.weight`, 'Peso do texto', WEIGHTS),
        ),
      )
    : card('Texto', grid(select(`${el}.weight`, 'Peso do texto', WEIGHTS)));
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
                onclick: () => removeAt(items, i),
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
      ['giving', 'Contribuição principal da igreja'],
      // Another PIX key for the same receiver, where the QR card is the one asking.
      ...(el === 'card' && config.giving.method === 'pix'
        ? [['pixkey', 'Outra chave PIX (uma oferta específica)']]
        : []),
      ['url', 'Um link (site, inscrição, redes sociais)'],
    ],
    { rerender: true },
  ),
  get(`${el}.qr`) === 'url'
    ? textInput(`${el}.qrText`, 'Link do QR Code', { placeholder: 'https://…', max: 600 })
    : null,
  get(`${el}.qr`) === 'pixkey'
    ? textInput(`${el}.qrText`, 'Chave PIX desta oferta', { max: 77 })
    : null,
];
/** The saved offerings: each one a title, a line under it and its own QR code. */
const savedOfferings = () =>
  card(
    'Ofertas salvas',
    hint(
      'Cada oferta tem o seu título e o seu QR Code: dízimos e ofertas, missões, uma campanha, uma inscrição. No painel do OBS, na aba "Ofertas e Dízimos", um clique mostra a que você escolher.',
    ),
    ...rows(
      'card.saved',
      { title: 'Nova oferta', subtitle: '', qr: 'giving', qrText: '' },
      (item, change) => [
        h('input', {
          value: item.title,
          placeholder: 'Título (ex.: Missões)',
          maxlength: 60,
          oninput: (e) => change({ title: e.target.value }),
        }),
        h('input', {
          value: item.subtitle,
          placeholder: 'Texto de apoio',
          maxlength: 90,
          oninput: (e) => change({ subtitle: e.target.value }),
        }),
        h(
          'select',
          {
            title: 'De onde vem o QR Code desta oferta',
            onchange: (e) => {
              change({ qr: e.target.value });
              renderForm();
            },
          },
          [
            ['giving', 'Contribuição principal'],
            ...(config.giving.method === 'pix' || item.qr === 'pixkey'
              ? [['pixkey', 'Outra chave PIX']]
              : []),
            ['url', 'Link'],
          ].map(([v, l]) => h('option', { value: v, selected: item.qr === v }, l)),
        ),
        item.qr === 'giving'
          ? null
          : h('input', {
              value: item.qrText,
              placeholder: item.qr === 'pixkey' ? 'Chave PIX desta oferta' : 'https://…',
              maxlength: 600,
              oninput: (e) => change({ qrText: e.target.value }),
            }),
      ],
    ),
  );

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
function applyPalette([name, main, second, accent, t1, t2, glass]) {
  const c = structuredClone;
  Object.assign(config.theme, {
    // The glass colors turn every plate into glass; any other set goes back to solid.
    glass: !!glass,
    main: c(main),
    surface: c(second),
    accent: c(accent),
    // On a light background the text of the name bar would not be readable.
    text1: t1,
    text2: t2,
  });
  save();
  renderForm();
  toast(t('Cores "{name}" aplicadas ao tema global.', { name: t(name) }));
}
/**
 * The ways of giving, with the one of this language's main country first: PIX in Brazil,
 * the phone-number payment app elsewhere.
 */
function givingMethods() {
  const list = [
    ['pix', 'PIX (Brasil)'],
    ['app', 'Aplicativo de pagamento por telefone ou código'],
    ['sepa', 'Transferência bancária SEPA (zona do euro)'],
    ['link', 'Link: página de doações ou serviço de pagamentos'],
    ['image', 'Imagem de QR Code pronta, do banco ou do aplicativo'],
    ['text', 'Só os dados bancários, sem QR Code'],
  ];
  const first = lang === 'pt-BR' ? 'pix' : 'app';
  return list.sort((a, b) => (b[0] === first) - (a[0] === first));
}
/** Name and receiving number of the payment app, plus its QR image when the church has one. */
const appFields = () => [
  textInput('giving.app.name', 'Nome do aplicativo', {
    max: 30,
    tip: 'O aplicativo que as pessoas usam no seu país para enviar dinheiro pelo celular.',
  }),
  textInput('giving.app.id', 'Telefone, código ou e-mail que recebe', { max: 80 }),
  qrImageField('Imagem do QR Code (opcional)'),
];
const qrImageField = (label) =>
  field(
    label,
    h(
      'div',
      { class: 'rowline' },
      h('input', {
        type: 'file',
        accept: 'image/png,image/jpeg,image/webp,image/svg+xml',
        onchange: (e) => uploadGivingQr(e.target.files[0]),
      }),
      config.giving.image
        ? h(
            'button',
            {
              title: 'Tira a imagem enviada',
              onclick: () => {
                set('giving.image', '');
                renderForm();
              },
            },
            'Remover',
          )
        : null,
    ),
    {
      wide: true,
      tip: 'Use a imagem que o banco ou o aplicativo de pagamentos gerou para a igreja. Fundo branco e boa resolução leem melhor.',
    },
  );
/** Something was typed for the chosen way of giving (it may still be wrong). */
function givingFilled() {
  const g = config.giving;
  return !!{
    pix: config.pix.key || config.pix.payload,
    app: g.app.id,
    sepa: g.sepa.iban,
    link: g.link,
    image: g.image,
    text: g.details,
  }[g.method];
}
async function uploadGivingQr(file) {
  if (!file) return;
  const r = await api('/api/media', {
    method: 'POST',
    raw: file,
    type: file.type || 'application/octet-stream',
  });
  if (r.error) return toast(friendly(r.error));
  set('giving.image', r.url);
  renderForm();
}
// Shows the QR exactly as it goes on air, or says what is still missing.
async function checkGiving() {
  const box = $('#givingCheck');
  if (!box) return;
  const method = config.giving.method;
  const r = await api('/api/giving');
  if (!$('#givingCheck') || method !== config.giving.method) return;
  if (r.error)
    return box.replaceChildren(
      hint(
        givingFilled() ? friendly(r.error) : 'Preencha os dados acima para ver o resultado.',
        givingFilled() ? 'bad' : '',
      ),
    );
  if (method === 'text' || (method === 'app' && !r.image))
    return box.replaceChildren(hint('Os dados acima aparecem no cartão, sem QR Code.', 'ok'));
  const test = {
    pix: 'Teste antes do culto: aponte o aplicativo do banco para este QR Code e confira o nome que aparece.',
    sepa: 'Teste antes do culto: aponte o aplicativo do banco para este QR Code e confira o titular e o IBAN que aparecem.',
    link: 'Teste antes do culto: aponte a câmera do celular para este QR Code e confira a página que abre.',
    image:
      'Teste antes do culto: aponte o celular para a tela e confira se o QR Code da imagem é lido.',
    app: 'Teste antes do culto: aponte o celular para a tela e confira se o QR Code da imagem é lido.',
  }[method];
  box.replaceChildren(
    h(
      'div',
      { class: 'pixBox' },
      h('img', {
        src: r.image || `/api/qr.svg?kind=giving&v=${Date.now()}`,
        alt: 'QR Code da contribuição',
      }),
      h(
        'div',
        {},
        hint(test),
        r.payload
          ? h(
              'span',
              { class: 'hint' },
              method === 'pix' ? 'PIX copia e cola:' : 'Conteúdo do QR Code:',
            )
          : null,
        r.payload ? h('code', { class: 'block', 'data-raw': '' }, r.payload) : null,
      ),
    ),
  );
}
const pages = {
  home: () => {
    const updates = () => {
      const u = update;
      const text =
        updateState === 'checking'
          ? t('Procurando…')
          : updateState === 'downloading'
            ? t('Baixando a atualização…')
            : updateState === 'asking'
              ? t(
                  'A atualização foi baixada. Abriu uma janela do Church Lower Thirds neste computador (pode estar atrás desta): clique em OK nela e depois autorize a instalação quando o Windows pedir.',
                )
              : updateState === 'installing'
                ? t(
                    'Instalando: se o Windows pedir permissão, autorize. Esta página volta sozinha quando terminar.',
                  )
                : updateState === 'stalled'
                  ? t(
                      'A instalação ainda não terminou. Veja se há um pedido de permissão do Windows piscando na barra de tarefas (o ícone de um escudo) e autorize.',
                    )
                  : updateState === 'failed'
                    ? t('Não foi possível procurar atualizações agora.')
                    : !u
                      ? ''
                      : u.newer
                        ? t('Nova versão disponível: v{latest} (instalada: v{current}).', {
                            latest: u.latest,
                            current: u.current,
                          })
                        : t('Você está na versão mais recente (v{current}).', {
                            current: u.current,
                          });
      const busy = ['checking', 'downloading', 'asking', 'installing'].includes(updateState),
        // The installer is already on the computer: the person can open it themselves.
        byHand = u?.newer && ['blocked', 'stalled'].includes(updateState);
      return card(
        'Atualizações',
        h(
          'div',
          { class: 'step' + (u?.newer ? ' attention' : u && !updateState ? ' done' : '') },
          h('i', { class: 'mark' }, u?.newer ? '↑' : '✓'),
          h('span', { 'data-raw': '' }, text),
          u?.newer && u.canInstall
            ? h(
                'button',
                {
                  class: byHand ? '' : 'primary',
                  disabled: busy,
                  title:
                    'Baixa a nova versão, confere o arquivo e instala. O Windows pede permissão e o programa volta sozinho.',
                  onclick: installUpdate,
                },
                byHand ? 'Tentar de novo' : 'Atualizar agora',
              )
            : null,
          u?.newer && !u.canInstall
            ? h(
                'a',
                { href: u.page, target: '_blank', rel: 'noopener' },
                h('button', {}, 'Abrir a página de downloads'),
              )
            : null,
          byHand
            ? h(
                'button',
                {
                  class: 'primary',
                  title: 'Abre a pasta com o instalador que o programa já baixou e conferiu',
                  onclick: async () => {
                    const r = await api('/api/update/reveal', { method: 'POST' });
                    if (r.error) window.open(u.setupUrl || u.page, '_blank', 'noopener');
                  },
                },
                'Mostrar o instalador',
              )
            : null,
          h('button', { disabled: busy, onclick: () => checkUpdate(true) }, 'Procurar atualização'),
        ),
        byHand
          ? hint(
              updateState === 'blocked'
                ? 'O Windows deste computador não deixou o programa abrir o instalador sozinho. Ele já foi baixado e conferido: clique em "Mostrar o instalador" e abra o arquivo com dois cliques. As configurações são mantidas.'
                : 'Se o pedido de permissão não aparecer, clique em "Mostrar o instalador" e abra o arquivo com dois cliques. As configurações são mantidas.',
            )
          : null,
        updateState === 'blocked' && updateBlocked
          ? h('p', { class: 'hint', 'data-raw': '' }, updateBlocked)
          : null,
      );
    };
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
          { class: 'copyRow' },
          hint(
            'O assistente explica como o programa funciona e ajuda a deixar tudo pronto, passo a passo.',
          ),
          h('button', { class: 'primary', onclick: () => openWizard(0) }, 'Abrir o assistente'),
        ),
        h('div', { style: 'height:10px' }),
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
          done(givingFilled(), 'Cadastre a forma de contribuir', 'Abrir', 'brand'),
          done(false, 'Adicione as fontes e o painel no OBS', 'Ver como', 'obs'),
          done(
            Object.values(config).some((e) => e?.free || e?.vfree),
            'Arraste os elementos para o lugar',
            'Abrir',
            'layout',
          ),
        ),
      ),
      card(
        'Endereços para o OBS',
        ...mainAddresses(),
        h('button', { onclick: () => go('obs') }, 'Ver o endereço de cada elemento'),
      ),
      updates(),
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
            hint(
              'Cada usuário do computador tem a sua própria pasta e as suas próprias configurações: um não altera o que é do outro.',
            ),
          )
        : null,
    ];
  },

  brand: () => [
    card(
      'Igreja',
      grid(textInput('brand.name', 'Nome da igreja', { max: 80 })),
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
      'Tempo na tela',
      grid(
        range('timing.autoHide', 'Nomes, QR Code e redes saem sozinhos depois de', 0, 120, ' s', {
          tip: '0 = ficam na tela até você esconder. O mesmo tempo pode ser trocado no painel do OBS.',
        }),
      ),
    ),
    card(
      'Contribuições: dízimos e ofertas',
      hint(
        'Escolha como a sua igreja recebe dízimos e ofertas. O QR Code e os dados aparecem no cartão e nos nomes marcados com "Contribuição da igreja".',
      ),
      grid(
        select('giving.method', 'Como as pessoas contribuem', givingMethods(), {
          rerender: true,
          wide: true,
        }),
        ...(config.giving.method === 'pix'
          ? [
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
            ]
          : []),
        ...(config.giving.method === 'sepa'
          ? [
              textInput('giving.sepa.name', 'Titular da conta', {
                max: 70,
                tip: 'Como está na conta do banco.',
              }),
              textInput('giving.sepa.iban', 'IBAN', {
                placeholder: 'PT50 0000 0000 0000 0000 0000 0',
                max: 42,
              }),
              textInput('giving.sepa.bic', 'BIC / SWIFT (opcional)', { max: 11 }),
              textInput('giving.sepa.amount', 'Valor fixo em euros (opcional)', {
                placeholder: 'Vazio: quem doa escolhe',
                max: 14,
              }),
              textInput('giving.sepa.reference', 'Descrição da transferência (opcional)', {
                placeholder: 'Ex.: Oferta',
                max: 140,
              }),
            ]
          : []),
        ...(config.giving.method === 'link'
          ? [
              textInput('giving.link', 'Link da contribuição', {
                placeholder: 'https://…',
                max: 1000,
                wide: true,
                tip: 'Qualquer endereço serve: a página de doações da igreja ou o link de um serviço de pagamentos do seu país.',
              }),
            ]
          : []),
        ...(config.giving.method === 'image' ? [qrImageField('Imagem do QR Code')] : []),
        ...(config.giving.method === 'app' ? appFields() : []),
        field(
          config.giving.method === 'text'
            ? 'Dados bancários mostrados no cartão'
            : 'Dados mostrados ao lado do QR Code',
          h('textarea', {
            rows: 4,
            maxlength: 400,
            placeholder: 'Uma informação por linha: banco, conta, titular…',
            value: config.giving.details,
            oninput: (e) => set('giving.details', e.target.value),
          }),
          {
            wide: true,
            tip: 'Uma informação por linha, até 6 linhas. Vazio: mostra a chave PIX, o IBAN ou o link.',
          },
        ),
      ),
      h('div', { id: 'givingCheck' }),
    ),
  ],

  theme: () => [
    profilesCard(),
    keep(
      'page-models-card',
      () =>
        card(
          'Modelos',
          hint(
            'Comece pelo modelo: ele define o formato, a fonte e a animação de todos os elementos e já traz as cores que mais combinam. As cores que a igreja já escolheu continuam ao trocar de modelo. As figuras mostram cada modelo como ele vai ficar, com o nome e o logo da igreja; a animação de entrada aparece na prévia grande.',
          ),
          modelGallery('page', false),
        ),
      () => modelGallery('page', false),
    ),
    themedFold('page'),
    customCard(),
    card(
      'Cores prontas',
      hint('Troca só as cores, sem mexer no modelo. Depois, se quiser, ajuste cada cor abaixo.'),
      keptNote(),
      paletteGallery(),
    ),
    card(
      'Personalizar as cores',
      grid(
        fill('theme.main', 'Cor principal', { tip: 'A barra do nome.' }),
        fill('theme.surface', 'Cor de fundo', {
          tip: 'Selo superior, barra inferior, cartão, agenda e redes; e a barra do cargo.',
        }),
        fill('theme.accent', 'Cor de destaque', { tip: 'Os detalhes de todos os elementos.' }),
        color('theme.text1', 'Texto principal'),
        color('theme.text2', 'Texto de apoio'),
      ),
    ),
    card(
      'Fonte e forma',
      grid(
        font('brand.font', 'Fonte de todos os elementos'),
        range('theme.radius', 'Cantos arredondados', 0, 60, ' px'),
        range('theme.opacity', 'Opacidade do fundo', 10, 100, '%', {
          tip: 'Menos de 100% deixa a imagem da câmera aparecer por trás.',
        }),
        check('theme.glass', 'Efeito de vidro (liquid glass)', {
          tip: 'As placas ficam transparentes, desfocam a imagem atrás e ganham um brilho na borda. Funciona em qualquer modelo; fica melhor com cores claras e texto branco.',
        }),
        select('theme.shadow', 'Sombra', names(SHADOWS), { tip: 'Brilho usa a cor de destaque.' }),
        range('theme.shadowStrength', 'Força da sombra', 0, 100, '%'),
        select(
          'theme.decor',
          'Desenho dos modelos temáticos',
          [['', 'O do próprio modelo'], ['none', 'Sem desenho'], ...names(DECORS)],
          { tip: 'Aparece nos modelos Urbano, Adesivo e Delicado dos elementos.' },
        ),
      ),
    ),
    card(
      'Quem segue o tema',
      hint(
        'Todos os elementos obedecem ao tema global. Para um deles ter cores, fonte ou efeitos diferentes, mude para "Aparência própria".',
      ),
      h(
        'div',
        { class: 'rows' },
        THEMED_ELEMENTS.map((el) =>
          h(
            'div',
            { class: 'row themeRow' },
            h('b', {}, PAGES.find(([id]) => id === el)[1]),
            h(
              'div',
              { class: 'seg' },
              ...[
                [false, 'Segue o tema'],
                [true, 'Aparência própria'],
              ].map(([v, text]) =>
                h(
                  'button',
                  {
                    type: 'button',
                    class: config[el].custom === v ? 'active' : '',
                    onclick: () => {
                      if (v && !config[el].custom) Object.assign(config[el], ownLook(el));
                      set(`${el}.custom`, v);
                      renderForm();
                    },
                  },
                  text,
                ),
              ),
            ),
            h(
              'button',
              { title: 'Abre as configurações deste elemento', onclick: () => go(el) },
              'Abrir',
            ),
          ),
        ),
      ),
    ),
  ],

  lower: () => [
    card('Modelo', chips('lower.template', withCustom('lower', LOWER_TEMPLATES))),
    card(
      'Nomes e textos',
      config.lower.items.length > 7 || nameFind
        ? h('input', {
            class: 'find',
            type: 'search',
            value: nameFind,
            placeholder: 'Buscar na lista',
            oninput: (e) => {
              nameFind = e.target.value;
              const q = plain(nameFind).trim();
              for (const row of e.target.parentNode.querySelectorAll('.rows > [data-text]'))
                row.classList.toggle('hidden', !!q && !row.dataset.text.includes(q));
            },
          })
        : null,
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
            {
              class:
                'row' +
                (viewItem === item.id ? ' viewing' : '') +
                (nameFind.trim() &&
                !plain(`${item.line1} ${item.line2}`).includes(plain(nameFind).trim())
                  ? ' hidden'
                  : ''),
              'data-text': plain(`${item.line1} ${item.line2}`),
            },
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
                ['giving', 'QR da contribuição'],
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
                  onclick: () => removeAt(config.lower.items, config.lower.items.indexOf(item)),
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
      namesTools(),
      hint(
        'No painel do OBS, um clique no nome mostra ou esconde. Dá para adicionar nomes por lá também.',
      ),
    ),
    appearance('lower'),
    !config.lower.custom
      ? null
      : card(
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
    card('Modelo', chips('top.template', withCustom('top', TOP_TEMPLATES))),
    appearance('top'),
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
              check('top.clockSeconds', 'Mostrar segundos'),
              check('top.clock12h', 'Formato 12 horas'),
            ]
          : []),
        check('top.showDate', 'Data', { rerender: true }),
        check('top.showWeekday', 'Dia da semana', { rerender: true }),
        config.top.showDate || config.top.showWeekday
          ? select(
              'top.dateStyle',
              'Como a data aparece',
              [
                ['short', 'Curta'],
                ['long', 'Por extenso'],
                ['numeric', 'Em números'],
              ].map(([v, name]) => [
                v,
                `${t(name)}: ${dateText(new Date(), lang, { ...config.top, dateStyle: v })}`,
              ]),
              {
                tip: 'Com o horário ligado, a data fica embaixo dele; sozinha, fica no lugar dele.',
              },
            )
          : null,
        check('top.showMessages', 'Recados (texto que se reveza)', { rerender: true }),
      ),
      hint('Cada parte liga e desliga sozinha, aqui ou na aba "Superior" do painel do OBS.'),
    ),
    config.top.showMessages
      ? card(
          'Recados',
          // A message fixed from the dock stays until someone goes back to the list.
          config.top.pinned
            ? h(
                'div',
                { class: 'keptNote' },
                h(
                  'p',
                  { class: 'hint', 'data-raw': '' },
                  t('Fixo:') + ' ',
                  h('b', {}, config.top.pinned),
                  h('br', {}),
                  t('Enquanto ele estiver fixo, os recados da lista não se revezam.'),
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    title: 'Volta a mostrar os textos da lista',
                    onclick: () => {
                      set('top.pinned', '');
                      renderForm();
                    },
                  },
                  'Voltar à lista',
                ),
              )
            : null,
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
    card('Modelo', chips('card.template', withCustom('card', CARD_TEMPLATES))),
    appearance('card'),
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
      hint(
        'A forma de contribuir e os dados ao lado do QR Code ficam na aba "Geral e contribuições".',
      ),
    ),
    savedOfferings(),
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
    card('Modelo', chips('ticker.template', withCustom('ticker', TICKER_TEMPLATES))),
    appearance('ticker'),
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
    card('Modelo', chips('agenda.template', withCustom('agenda', AGENDA_TEMPLATES))),
    appearance('agenda'),
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
    card('Modelo', chips('social.template', withCustom('social', SOCIAL_TEMPLATES))),
    appearance('social'),
    card(
      'Redes',
      ...rows(
        'social.items',
        { network: 'instagram', label: 'Instagram', handle: '@suaigreja', text: '', icon: '' },
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
          h('input', {
            value: item.text,
            title: 'Frase só deste item. Vazio: usa o texto geral e o nome da rede.',
            placeholder: 'Frase própria (opcional)',
            maxlength: 80,
            oninput: (e) => change({ text: e.target.value }),
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
    card(
      'Todos em sequência',
      hint(
        'No painel do OBS, "Todos em sequência" mostra um item de cada vez. O modelo "Placa" foi feito para isso, com contador e linha do tempo.',
      ),
      grid(
        range('social.seconds', 'Tempo de cada item', 3, 30, ' s'),
        check('social.counter', 'Mostrar o contador (01 / 03)'),
        check('social.progress', 'Mostrar a linha do tempo'),
      ),
    ),
    colors('social', { text: 'O @', text2: 'Texto de cima' }),
    place('social'),
    effects('social'),
  ],

  comment: () => [
    card('Modelo', chips('comment.template', withCustom('comment', COMMENT_TEMPLATES))),
    appearance('comment'),
    card(
      'Comentário',
      hint(
        'O comentário é escrito no painel do OBS, na aba "Comentários": o nome de quem escreveu e o que disse. Ele sai sozinho depois do tempo escolhido no painel, a não ser que esteja fixado. Aqui, enquanto nada foi escrito, a prévia mostra um exemplo.',
      ),
      grid(check('comment.showIcon', 'Mostrar o balão ao lado do texto')),
    ),
    colors('comment', { text: 'Comentário', text2: 'Texto de apoio' }),
    place('comment'),
    effects('comment'),
  ],

  countdown: () => [
    card('Modelo', chips('countdown.template', withCustom('countdown', COUNTDOWN_TEMPLATES))),
    appearance('countdown'),
    card(
      'Contagem',
      hint(
        'A contagem começa quando é mostrada, no painel do OBS (aba "Contagem"), no roteiro ou por uma tecla do Stream Deck. Lá também se trocam os minutos na hora.',
      ),
      grid(
        textInput('countdown.title', 'Texto', { max: 60, placeholder: 'O culto começa em' }),
        select(
          'countdown.mode',
          'Como contar',
          [
            ['duration', 'Por minutos, a partir de quando é mostrada'],
            ['clock', 'Até um horário de hoje'],
          ],
          { rerender: true },
        ),
        config.countdown.mode === 'clock'
          ? field(
              'Horário em que chega a zero',
              h('input', {
                type: 'time',
                value: config.countdown.time,
                onchange: (e) => e.target.value && set('countdown.time', e.target.value),
              }),
            )
          : range('countdown.minutes', 'Minutos', 1, 60, ' min'),
        textInput('countdown.endText', 'Texto ao chegar a zero', {
          max: 60,
          placeholder: 'Já vamos começar',
          tip: 'Vazio: a contagem para em 00:00.',
        }),
        check('countdown.hideAtEnd', 'Sair sozinha alguns segundos depois do zero'),
      ),
    ),
    colors('countdown', { text: 'Números', text2: 'Texto' }),
    place('countdown'),
    effects('countdown'),
  ],

  rundown: () => [
    card(
      'Roteiro do culto',
      hint(
        'Coloque em ordem o que vai ao ar durante o culto: o nome de quem fala, as ofertas, um comentário, a agenda. No painel do OBS, a aba "Roteiro" mostra a lista e um botão "Próximo": a cada clique entra o passo seguinte e o anterior sai. Os passos apontam para o que já está salvo (nomes, ofertas, comentários, redes).',
      ),
    ),
    rundownCard(),
  ],

  bug: () => [
    config.brand.logo
      ? null
      : card(
          'Logo',
          hint(
            'Envie o logo da igreja na aba "Geral e contribuições" para usar este elemento.',
            'bad',
          ),
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
      card: 'Ofertas e Dízimos',
      agenda: 'Agenda',
      social: 'Redes sociais',
      comment: 'Comentários',
      countdown: 'Contagem regressiva',
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
    const copy = copyRow;
    const row = (what, path) => h('tr', {}, h('td', {}, what), h('td', {}, copy(base + path)));
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
      obsCard(),
      card(
        'Endereços para copiar',
        ...mainAddresses(),
        h('div', { style: 'height:10px' }),
        h(
          'button',
          {
            title: 'Abre o assistente no passo do OBS',
            onclick: () => openWizard(WIZARD.findIndex((w) => w.id === 'dock')),
          },
          'Abrir o tutorial ilustrado',
        ),
      ),
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
        '1. O painel de controle (dock)',
        h(
          'div',
          { class: 'drawings' },
          drawing(guideDockMenu(t)),
          drawing(guideDockDialog(t, dockUrl())),
          drawing(guideDocked(t)),
        ),
        h(
          'ol',
          { class: 'steps' },
          h('li', {}, 'No OBS, abra o menu Docks → Docks de navegador personalizados.'),
          h('li', {}, 'Dê o nome "Church Lower Thirds" e cole o endereço abaixo.'),
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
        '2. Os gráficos (fonte de navegador)',
        h(
          'div',
          { class: 'drawings' },
          drawing(guideAddSource(t)),
          drawing(guideSourceProps(t, sourceUrl('all', obsVertical), w, hgt)),
          drawing(guideOrder(t)),
        ),
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
          row('Ofertas e Dízimos', '/api/live/card/toggle'),
          row('Agenda', '/api/live/agenda/toggle'),
          row('Rede social (1 = primeira)', '/api/live/social/toggle?item=1'),
          row('Comentário (o último escrito)', '/api/live/comment/toggle'),
          row('Contagem regressiva (começa de novo)', '/api/live/countdown/show'),
          row('Roteiro: próximo passo', '/api/rundown/next'),
          row('Roteiro: passo anterior', '/api/rundown/prev'),
          row('Roteiro: ir para um passo (1 = primeiro)', '/api/rundown/go?n=1'),
          row('Roteiro: recomeçar', '/api/rundown/restart'),
          row('Logo', '/api/live/bug/toggle'),
          row('Trocar de perfil de culto (pelo nome)', '/api/profile/use?name=Natal'),
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
          { href: '/api/backup', download: 'church-lower-thirds-backup.json' },
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
              return toast('Esse arquivo não é um backup do Church Lower Thirds.');
            }
            const r = await api('/api/restore', { method: 'POST', body });
            toast(r.error ? friendly(r.error) : 'Backup restaurado.');
          },
        }),
        h('button', { onclick: () => $('#restoreFile').click() }, 'Restaurar de um arquivo'),
      ),
    ),
    card(
      'Restaurar as configurações iniciais',
      hint(
        'Apaga tudo o que foi configurado: nomes, textos, tema, contribuição, posições e listas salvas. O programa volta a como estava na primeira vez e o assistente de configuração abre de novo.',
        'bad',
      ),
      hint('Não dá para desfazer. Salve um backup antes, se quiser guardar o que tem hoje.'),
      h('div', { style: 'height:10px' }),
      h(
        'div',
        { class: 'fillRow' },
        h('button', { class: 'danger', onclick: resetEverything }, 'Apagar tudo e recomeçar'),
        h('button', { onclick: () => openWizard(0) }, 'Só abrir o assistente'),
      ),
    ),
  ],
  about: () => {
    const link = (href, text, cls = '') =>
      h('a', { href, target: '_blank', rel: 'noopener noreferrer', class: cls }, text);
    const share = async () => {
      const url = 'https://github.com/CultoemOff/Church-Lower-Thirds',
        data = { title: 'Church Lower Thirds', text: 'Church Lower Thirds — by Culto em Off', url };
      try {
        if (navigator.share) await navigator.share(data);
        else {
          await navigator.clipboard.writeText(url);
          toast(t('Link copiado.'));
        }
      } catch (e) {
        if (e?.name !== 'AbortError') toast(url);
      }
    };
    const version = $('#appVersion').textContent.trim().split(/\s/)[0];
    return [
      card(
        'Sobre',
        h(
          'div',
          { class: 'aboutHero' },
          h('img', { src: '/icons/cultoemoff-logo.svg', alt: 'Culto em Off' }),
          h(
            'div',
            {},
            h('h2', { 'data-raw': '' }, 'Church Lower Thirds — by Culto em Off'),
            h(
              'p',
              {},
              'Projeto criado por Jonas Silva, criador do Culto em Off: um projeto voltado a compartilhar conhecimento, ferramentas e soluções para áudio, vídeo, transmissão e tecnologia em igrejas.',
            ),
            version
              ? h('p', { class: 'hint', 'data-raw': '' }, t('Versão instalada:') + ' ' + version)
              : null,
          ),
        ),
      ),
      card(
        'Culto em Off',
        h(
          'p',
          { class: 'aboutText' },
          'Se o Church Lower Thirds foi útil, compartilhe o programa com outras pessoas e ajude o projeto a alcançar mais voluntários e equipes técnicas.',
        ),
        h(
          'div',
          { class: 'aboutLinks' },
          link('https://www.cultoemoff.com.br', 'Site'),
          link(
            'https://cultoemoff.com.br/formacoes/culto-ao-vivo-com-excelencia',
            'Curso de OBS Studio',
            'course',
          ),
          link('https://www.instagram.com/cultoemoff/', 'Instagram'),
          link('https://www.youtube.com/@CultoemOff', 'YouTube'),
          link('https://github.com/CultoemOff/Church-Lower-Thirds', 'GitHub'),
          h('button', { class: 'primary', onclick: share }, 'Compartilhar o programa'),
        ),
      ),
    ];
  },
};

// ---------- Shell ----------
function setPreview() {
  const el = ELEMENTS.includes(page)
    ? page
    : page === 'brand'
      ? 'card'
      : page === 'theme'
        ? 'theme'
        : '';
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
// The layout editor is the overlay itself (?edit=1) inside this page: when an element is
// dropped or resized there, it says where, and this page is the one that stores it. Each
// format (horizontal, vertical) keeps its own place; the size is the same in both.
addEventListener('message', (e) => {
  const m = e.data;
  if (e.origin !== location.origin || m?.source !== 'clt-edit' || m.type !== 'place') return;
  const c = config?.[m.el];
  if (!c || !('free' in c) || ![m.x, m.y].every(Number.isFinite)) return;
  Object.assign(c, m.vertical ? { vfree: true, vx: m.x, vy: m.y } : { free: true, x: m.x, y: m.y });
  if (Number.isFinite(m.size) && 'size' in c) c.size = m.size;
  save();
  renderForm();
});
// ---- Updates ----
async function checkUpdate(force = false) {
  if (force) {
    updateState = 'checking';
    if (page === 'home') renderForm();
  }
  const r = await api(`/api/update${force ? '?force=1' : ''}`);
  updateState = r.error ? (force ? 'failed' : '') : '';
  if (!r.error) update = r;
  $('#updatePill').classList.toggle('hidden', !update?.newer);
  if (page === 'home' && config) renderForm();
}
let stallTimer = 0;
async function installUpdate() {
  updateState = 'downloading';
  updateBlocked = '';
  clearTimeout(stallTimer);
  renderForm();
  // The request only answers once the installer has started: meanwhile, what it is doing.
  const watch = setInterval(async () => {
    const p = await api('/api/update/progress');
    if (!['downloading', 'asking'].includes(updateState) || !p.phase || p.phase === updateState)
      return;
    updateState = p.phase;
    if (page === 'home') renderForm();
  }, 1000);
  const r = await api('/api/update/install', {
    method: 'POST',
    body: {
      // The text of the window that opens on the computer, in the language in use.
      note: t(
        'A nova versão do Church Lower Thirds está pronta para instalar. Clique em OK e, em seguida, autorize a instalação quando o Windows pedir.',
      ),
    },
  });
  clearInterval(watch);
  if (r.error) {
    // Windows refused to run the installer: the page then shows where the file is.
    updateState = /did not start the installer/.test(r.error) ? 'blocked' : '';
    updateBlocked = updateState ? r.error.replace(/^.*?installer:\s*/, '') : '';
    toast(friendly(r.error));
  } else {
    updateState = 'installing';
    // The page reloads by itself when the new version answers. Still here after a while:
    // the permission request of Windows probably went unnoticed.
    stallTimer = setTimeout(() => {
      if (updateState !== 'installing') return;
      updateState = 'stalled';
      if (page === 'home') renderForm();
    }, 90000);
  }
  renderForm();
}
function go(id) {
  page = localStorage.cltPage = id;
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
  const corner = [];
  for (const [id, label, g, desc, icon] of PAGES) {
    const top = CORNER.includes(id);
    if (!top && g !== group) nodes.push(h('div', { class: 'group' }, (group = g)));
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
    (top ? corner : nodes).push(b);
  }
  $('#nav').replaceChildren(...nodes);
  $('#topNav').replaceChildren(...corner);
  const current = PAGES.find(([id]) => id === page) || PAGES[0];
  $('#pageTitle').textContent = current[1];
  $('#pageDesc').textContent = current[3];
}
// ---------- Addresses for OBS ----------
/** An address with a button that copies it (and says so on the button itself). */
function copyRow(text, { primary = false } = {}) {
  const button = h(
    'button',
    {
      class: primary ? 'primary' : '',
      title: 'Copia o endereço para colar no OBS',
      onclick: async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          // Older embedded browsers: select-and-copy still works.
          const area = h('textarea', { value: text, style: 'position:fixed;opacity:0' });
          document.body.append(area);
          area.select();
          document.execCommand('copy');
          area.remove();
        }
        button.textContent = t('Copiado');
        button.classList.add('copied');
        setTimeout(() => {
          button.textContent = t('Copiar');
          button.classList.remove('copied');
        }, 1600);
      },
    },
    'Copiar',
  );
  return h('div', { class: 'copyRow' }, h('code', { 'data-raw': '' }, text), button);
}
const sourceUrl = (slug = 'all', tall = false) =>
  `${location.origin}/source/${slug}${tall ? '?layout=vertical' : ''}`;
const dockUrl = () => `${location.origin}/dock`;
const outputSize = (tall = false) =>
  (tall ? config.output.vertical : config.output.horizontal).split('x');
/** The two addresses every installation needs, ready to copy. */
const mainAddresses = () => {
  const [w, hgt] = outputSize();
  return [
    h('span', { class: 'addrLabel' }, '1. Painel de controle: dock do OBS'),
    copyRow(dockUrl(), { primary: true }),
    hint('No OBS: menu Docks → Docks de navegador personalizados.'),
    h('span', { class: 'addrLabel' }, '2. Gráficos: fonte de navegador com todos os elementos'),
    copyRow(sourceUrl(), { primary: true }),
    hint(t('No OBS: Fontes → + → Navegador. Largura {w}, altura {h}.', { w, h: hgt })),
  ];
};
/** A drawing of where to click in OBS (see js/obs-guide.js). */
const drawing = (svgText) => {
  const box = h('div', { class: 'drawing' });
  box.innerHTML = svgText;
  return box;
};

// ---------- Back to the first run ----------
async function resetEverything() {
  if (
    !confirm(
      t(
        'Apagar TODAS as configurações, nomes e textos e recomeçar do zero? Isto não pode ser desfeito.',
      ),
    )
  )
    return;
  const r = await api('/api/reset', { method: 'POST' });
  if (r.error) return toast(friendly(r.error));
  config = r.config;
  toast('Configurações iniciais restauradas.');
  renderNav();
  go('home');
  openWizard(0);
}

// ---------- Setup assistant ----------
let wizardStep = null,
  wizardOffered = false;
const WIZARD = [
  {
    title: 'Como funciona',
    body: () => [
      h(
        'p',
        { class: 'lead' },
        'O Church Lower Thirds coloca nomes, avisos, QR Code e o logo da igreja por cima do vídeo no OBS Studio. São três partes:',
      ),
      h(
        'div',
        { class: 'parts' },
        ...[
          [
            '1',
            'O programa',
            'Fica rodando no computador, sem janela, e inicia com o Windows. É ele que guarda as configurações.',
          ],
          [
            '2',
            'Os gráficos',
            'Uma fonte de navegador no OBS. É o que aparece na transmissão, com fundo transparente.',
          ],
          [
            '3',
            'O painel',
            'Um dock dentro do OBS. É onde você clica para mostrar e esconder cada coisa durante o culto.',
          ],
        ].map(([n, title, text]) =>
          h('div', { class: 'part' }, h('i', {}, n), h('b', {}, title), h('span', {}, text)),
        ),
      ),
      hint(
        'Esta página de configurações serve para preparar tudo com calma. Durante o culto você usa só o painel do OBS.',
      ),
      hint(
        'O assistente leva uns cinco minutos. Dá para pular um passo, ir direto a outro pela lista ao lado ou pular o assistente inteiro.',
      ),
    ],
  },
  {
    title: 'Sua igreja',
    body: () => [
      grid(textInput('brand.name', 'Nome da igreja', { max: 80, wide: true })),
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
            id: 'wizardLogo',
            class: 'hidden',
            accept: 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml',
            onchange: (e) => uploadLogo(e.target.files[0]),
          }),
          h(
            'button',
            { class: 'primary', onclick: () => $('#wizardLogo').click() },
            config.brand.logo ? 'Trocar logo' : 'Enviar logo',
          ),
          hint('PNG com fundo transparente fica melhor. Até 8 MB.'),
        ),
      ),
      hint('O nome e o logo aparecem no selo do canto, nos nomes e no cartão do QR Code.'),
    ],
  },
  {
    title: 'Aparência',
    preview: 'theme',
    body: () => [
      hint(
        'Escolha um modelo e todos os elementos já ficam prontos, com as cores que mais combinam. Se preferir outras cores, troque logo abaixo.',
      ),
      modelGallery('wizard', false),
      themedFold('wizard'),
      h('h3', {}, 'Cores prontas'),
      keptNote(),
      paletteGallery(),
      hint('Cada cor pode ser ajustada depois, em "Tema global".'),
    ],
  },
  {
    title: 'Contribuição',
    body: () => {
      const m = config.giving.method;
      return [
        hint(
          'Como a igreja recebe dízimos e ofertas. O QR Code e os dados aparecem no cartão. Se não for usar, pule este passo.',
        ),
        grid(
          select('giving.method', 'Como as pessoas contribuem', givingMethods(), {
            rerender: true,
            wide: true,
          }),
          ...(m === 'pix'
            ? [
                textInput('pix.key', 'Chave PIX', {
                  placeholder: 'CNPJ, e-mail, telefone ou chave aleatória',
                  max: 80,
                }),
                textInput('pix.name', 'Nome do recebedor', { max: 25 }),
                textInput('pix.city', 'Cidade', { max: 15 }),
              ]
            : []),
          ...(m === 'sepa'
            ? [
                textInput('giving.sepa.name', 'Titular da conta', { max: 70 }),
                textInput('giving.sepa.iban', 'IBAN', { max: 42 }),
              ]
            : []),
          ...(m === 'link'
            ? [
                textInput('giving.link', 'Link da contribuição', {
                  placeholder: 'https://…',
                  max: 1000,
                  wide: true,
                }),
              ]
            : []),
          ...(m === 'image' ? [qrImageField('Imagem do QR Code')] : []),
          ...(m === 'app' ? appFields() : []),
          field(
            m === 'text'
              ? 'Dados bancários mostrados no cartão'
              : 'Dados mostrados ao lado do QR Code',
            h('textarea', {
              rows: 3,
              maxlength: 400,
              placeholder: 'Uma informação por linha: banco, conta, titular…',
              value: config.giving.details,
              oninput: (e) => set('giving.details', e.target.value),
            }),
            { wide: true },
          ),
        ),
        hint('Os demais campos e o teste do QR Code ficam em "Geral e contribuições".'),
      ];
    },
  },
  {
    id: 'dock',
    title: 'Painel no OBS',
    body: () => [
      h(
        'ol',
        { class: 'steps' },
        h('li', {}, 'No OBS, abra o menu Docks → Docks de navegador personalizados.'),
        h('li', {}, 'Dê o nome "Church Lower Thirds" e cole o endereço abaixo.'),
        h('li', {}, 'Encaixe o painel onde preferir: ele se ajusta a um espaço alto ou largo.'),
      ),
      copyRow(dockUrl(), { primary: true }),
      h(
        'div',
        { class: 'drawings' },
        drawing(guideDockMenu(t)),
        drawing(guideDockDialog(t, dockUrl())),
        drawing(guideDocked(t)),
      ),
      hint('A engrenagem do painel abre esta página de configurações.'),
    ],
  },
  {
    id: 'source',
    title: 'Gráficos no OBS',
    body: () => {
      const [w, hgt] = outputSize();
      return [
        h(
          'ol',
          { class: 'steps' },
          h('li', {}, 'No OBS, em Fontes, clique em + e escolha Navegador.'),
          h('li', {}, 'Cole o endereço abaixo no campo URL.'),
          h('li', {}, t('Preencha largura {w} e altura {h}.', { w, h: hgt })),
          h('li', {}, 'Deixe a fonte por cima das câmeras.'),
        ),
        copyRow(sourceUrl(), { primary: true }),
        h(
          'div',
          { class: 'drawings' },
          drawing(guideAddSource(t)),
          drawing(guideSourceProps(t, sourceUrl(), w, hgt)),
          drawing(guideOrder(t)),
        ),
        hint(
          'Este endereço mostra todos os elementos numa fonte só. Para separar por cena, há um endereço para cada elemento em "OBS e atalhos".',
        ),
      ];
    },
  },
  {
    title: 'Teste',
    preview: 'lower',
    body: () => [
      hint('Com a fonte e o painel no OBS, faça um teste: o nome abaixo tem de aparecer no vídeo.'),
      h(
        'div',
        { class: 'copyRow' },
        h(
          'button',
          {
            class: 'primary',
            onclick: () => api('/api/live/lower/show?item=1', { method: 'POST' }),
          },
          'Mostrar um nome de teste',
        ),
        h('button', { onclick: () => api('/api/live/lower/hide', { method: 'POST' }) }, 'Esconder'),
      ),
      h('span', { class: 'addrLabel' }, 'Não apareceu no OBS?'),
      h(
        'ul',
        { class: 'steps' },
        h(
          'li',
          {},
          'A fonte de navegador precisa estar por cima das câmeras, na cena que está no ar.',
        ),
        h('li', {}, 'Confira a largura e a altura da fonte.'),
        h('li', {}, 'Clique com o botão direito na fonte e escolha Atualizar.'),
      ),
      hint(
        'Pronto. Os textos, os modelos e as posições de cada elemento ficam no menu à esquerda. Este assistente pode ser aberto de novo na Visão geral.',
      ),
    ],
  },
];
function openWizard(step = 0) {
  wizardStep = step;
  renderWizard();
}
function closeWizard() {
  wizardStep = null;
  $('#wizard')?.remove();
  if (!config.setupDone) set('setupDone', true);
  renderForm();
}
function renderWizard() {
  if (wizardStep === null || !config) return;
  const step = WIZARD[wizardStep],
    last = wizardStep === WIZARD.length - 1;
  // The preview and the pictures of the models are pages of their own: while the step is
  // the same they stay in place, so they do not load again at every choice.
  const frame = step.preview
    ? keep(`wizard-preview-${step.preview}`, () =>
        h(
          'div',
          { class: 'wizardPreview' },
          h('iframe', { src: `/overlay?preview=${step.preview}`, title: 'Prévia' }),
        ),
      )
    : null;
  const content = () => [...step.body(), frame];
  const open = $('#wizard .wizardBox');
  if (open?.dataset.step === String(wizardStep)) return refill($('.wizardBody', open), content());
  const box = h(
    'div',
    { class: 'wizardBox', 'data-step': wizardStep },
    h(
      'aside',
      {},
      h('strong', {}, 'Assistente de configuração'),
      h(
        'ol',
        {},
        WIZARD.map((w, i) =>
          h(
            'li',
            { class: i === wizardStep ? 'now' : i < wizardStep ? 'past' : '' },
            h('button', { type: 'button', onclick: () => openWizard(i) }, w.title),
          ),
        ),
      ),
    ),
    h(
      'section',
      {},
      h('h2', {}, step.title),
      h('div', { class: 'wizardBody' }, ...content()),
      h(
        'footer',
        {},
        h(
          'button',
          {
            title: 'Fecha o assistente. Ele pode ser aberto de novo na Visão geral.',
            onclick: closeWizard,
          },
          last ? 'Fechar' : 'Pular o assistente',
        ),
        h('span', { style: 'flex:1' }),
        wizardStep > 0
          ? h('button', { onclick: () => openWizard(wizardStep - 1) }, 'Voltar')
          : null,
        last
          ? null
          : h(
              'button',
              { title: 'Deixa este passo para depois', onclick: () => openWizard(wizardStep + 1) },
              'Pular este passo',
            ),
        last
          ? h('button', { class: 'primary', onclick: closeWizard }, 'Concluir')
          : h('button', { class: 'primary', onclick: () => openWizard(wizardStep + 1) }, 'Avançar'),
      ),
    ),
  );
  const shell =
    $('#wizard') || document.body.appendChild(h('div', { id: 'wizard', class: 'wizard' }));
  shell.replaceChildren(box);
}

function renderForm() {
  if (!config) return;
  // Choices made inside the assistant redraw it too (the page behind stays up to date).
  if (wizardStep !== null) queueMicrotask(renderWizard);
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
  const nodes = [off, ...pages[page]()].flat().filter(Boolean);
  // Simple mode: the cards of fine adjustments are left out, and the page says so.
  let hiddenCards = 0;
  for (const node of nodes) {
    const title = node.querySelector?.(':scope > h3, :scope > summary > h3')?.textContent;
    const advanced = ADVANCED.includes(title);
    node.classList?.toggle('adv', advanced);
    if (advanced) hiddenCards++;
  }
  if (simpleMode && hiddenCards)
    nodes.push(
      h(
        'section',
        { class: 'card simpleNote' },
        h(
          'span',
          { 'data-raw': '' },
          t('Modo simples: {n} blocos de ajustes finos estão escondidos nesta página.', {
            n: hiddenCards,
          }),
        ),
        h('button', { onclick: () => setMode(false) }, 'Mostrar tudo'),
      ),
    );
  refill($('#form'), nodes);
  if (page === 'brand') checkGiving();
}
// ---------- OBS: create the browser sources there ----------
let obsAsk = { password: '', port: '4455', mode: 'all' },
  obsBusy = false,
  obsDone = null;
function obsCard() {
  const create = async () => {
    obsBusy = true;
    obsDone = null;
    renderForm();
    const r = await api('/api/obs/sources', {
      method: 'POST',
      body: { ...obsAsk, layout: obsVertical ? 'vertical' : 'horizontal' },
    });
    obsBusy = false;
    obsDone = r;
    renderForm();
  };
  const done = obsDone;
  return card(
    'Criar as fontes no OBS',
    hint(
      'O programa cria as fontes de navegador direto no OBS, na cena que está aberta, com o endereço e o tamanho certos. No OBS, abra Ferramentas → Configurações do servidor WebSocket, marque "Ativar servidor WebSocket" e clique em "Mostrar informações de conexão" para ver a senha.',
    ),
    grid(
      field(
        'Senha do servidor WebSocket do OBS',
        h('input', {
          type: 'password',
          value: obsAsk.password,
          autocomplete: 'off',
          placeholder: 'Vazio se o OBS não pede senha',
          'data-raw': '',
          oninput: (e) => (obsAsk.password = e.target.value),
        }),
      ),
      field(
        'Porta',
        h('input', {
          type: 'number',
          value: obsAsk.port,
          min: 1,
          max: 65535,
          oninput: (e) => (obsAsk.port = e.target.value),
        }),
        { tip: 'A do OBS é 4455, a não ser que tenha sido trocada.' },
      ),
    ),
    h(
      'div',
      { class: 'fillRow' },
      h(
        'div',
        { class: 'seg' },
        [
          ['all', 'Uma fonte com tudo'],
          ['each', 'Uma fonte por elemento'],
        ].map(([id, label]) =>
          h(
            'button',
            {
              class: obsAsk.mode === id ? 'active' : '',
              title:
                id === 'all'
                  ? 'O mais simples: uma fonte só, com todos os elementos'
                  : 'Uma fonte para cada elemento ligado, para mostrar em cenas diferentes ou mudar a ordem das camadas',
              onclick: () => {
                obsAsk.mode = id;
                renderForm();
              },
            },
            label,
          ),
        ),
      ),
      h(
        'button',
        { class: 'primary', disabled: obsBusy, onclick: create },
        obsBusy ? 'Criando…' : 'Criar no OBS',
      ),
    ),
    done
      ? h(
          'p',
          { class: 'hint ' + (done.error ? 'bad' : 'ok'), 'data-raw': '' },
          done.error
            ? friendly(done.error)
            : [
                done.created.length
                  ? t('Criadas na cena "{scene}": {list}.', {
                      scene: done.scene,
                      list: done.created.join(', '),
                    })
                  : '',
                done.skipped.length
                  ? t('Já existiam no OBS (não foram alteradas): {list}.', {
                      list: done.skipped.join(', '),
                    })
                  : '',
              ]
                .filter(Boolean)
                .join(' '),
        )
      : null,
    hint(
      'O painel de controle (dock) ainda é adicionado à mão: o OBS não deixa um programa criar docks. O endereço está logo abaixo.',
    ),
  );
}
// ---------- Simple and advanced ----------
// Simple shows what a volunteer needs to put a service on air; advanced adds the fine
// adjustments. The choice belongs to this browser. The cards left out are named here by
// their titles.
const ADVANCED = [
  'Aparência',
  'Cores',
  'Efeitos e animação',
  'Personalizar as cores',
  'Fonte e forma',
  'Quem segue o tema',
  'Modelos próprios',
  'Perfis de culto',
  'Tamanho das fontes no OBS',
  'Stream Deck, Companion e outros',
];
let simpleMode = true;
try {
  simpleMode = localStorage.getItem('cltMode') !== 'advanced';
} catch {
  // No storage: simple.
}
function setMode(simple) {
  simpleMode = simple;
  try {
    localStorage.setItem('cltMode', simple ? 'simple' : 'advanced');
  } catch {
    // Without storage it lasts until the page is closed.
  }
  renderMode();
  if (config) renderForm();
}
function renderMode() {
  document.body.classList.toggle('simple', simpleMode);
  $('#mode').replaceChildren(
    ...[
      [true, 'Simples'],
      [false, 'Avançado'],
    ].map(([simple, label]) =>
      h(
        'button',
        { class: simple === simpleMode ? 'active' : '', onclick: () => setMode(simple) },
        label,
      ),
    ),
  );
}
renderMode();

/** Plays the entrance again in the big preview (and in the one of the assistant). */
function replayPreview() {
  const all = ['top', 'lower', 'card', 'ticker'];
  const send = (frame, els) => {
    for (const el of els)
      frame?.contentWindow?.postMessage({ type: 'replay', el }, location.origin);
  };
  // A page of one element shows that one; the others show the main ones together.
  send($('#preview'), ELEMENTS.includes(page) ? [page] : all);
  send($('#wizard .wizardPreview iframe'), all);
}
$('#replay').onclick = replayPreview;

// ---------- Service profiles ----------
// The profile in use sits at the top of the page; its menu is also where profiles are
// created, renamed and removed.
const PENCIL = svg('<path d="M4 20h4L19 9l-4-4L4 16zM13.500 6.500l4 4"/>'),
  TRASH = svg('<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13M10 11v6M14 11v6"/>');
/** A name the person typed is shown as typed; only the untouched first name is translated. */
const profileLabel = (p) => (p?.name === 'Perfil 1' ? t(p.name) : p?.name || '');
let profileOpen = false,
  renaming = '';
function renderProfiles() {
  const list = $('#profileList'),
    now = config.profiles.find((p) => p.id === config.profile);
  $('#profileName').textContent = profileLabel(now);
  $('#profileBtn').setAttribute('aria-expanded', String(profileOpen));
  list.classList.toggle('hidden', !profileOpen);
  // A name being typed is not redrawn under the person's hands.
  const typing = document.activeElement;
  if (!profileOpen || (typing?.tagName === 'INPUT' && list.contains(typing))) return;
  const iconButton = (icon, attrs) => {
    const b = h('button', { class: 'icon', ...attrs });
    b.innerHTML = icon;
    return b;
  };
  const rename = (p, value) => {
    renaming = '';
    const name = value.trim().slice(0, 40);
    if (name && name !== p.name) {
      p.name = name;
      save();
    }
    renderProfiles();
  };
  list.replaceChildren(
    ...config.profiles.map((p) => {
      const current = p.id === config.profile;
      if (renaming === p.id) {
        const box = h('input', {
          value: p.name,
          maxlength: 40,
          title: 'Nome do perfil',
          'data-raw': '',
          onkeydown: (e) => {
            if (e.key === 'Enter') e.target.blur();
            if (e.key === 'Escape') {
              e.stopPropagation();
              e.target.value = p.name;
              e.target.blur();
            }
          },
          onblur: (e) => rename(p, e.target.value),
        });
        setTimeout(() => {
          box.focus();
          box.select();
        });
        return h('div', { class: 'menuRow renaming' + (current ? ' current' : '') }, box);
      }
      return h(
        'div',
        { class: 'menuRow' + (current ? ' current' : '') },
        h(
          'button',
          {
            class: 'pick',
            title: current ? 'Perfil em uso' : 'Usar este perfil',
            onclick: () => {
              closeProfiles();
              if (!current) profileCommand('/api/profile/use', { id: p.id });
            },
          },
          h('i', { class: 'dot' }),
          h('span', { 'data-raw': '' }, profileLabel(p)),
        ),
        iconButton(PENCIL, {
          title: 'Renomear',
          onclick: () => {
            renaming = p.id;
            renderProfiles();
          },
        }),
        iconButton(TRASH, {
          disabled: config.profiles.length < 2,
          title:
            config.profiles.length < 2
              ? 'O último perfil não pode ser excluído'
              : 'Excluir este perfil. Os nomes, avisos e contribuições não são apagados.',
          onclick: () =>
            confirm(t('Excluir o perfil "{name}"?', { name: p.name })) &&
            profileCommand('/api/profile/remove', { id: p.id }),
        }),
      );
    }),
    h(
      'button',
      {
        class: 'menuAdd',
        title: 'Cria um perfil com a aparência que está em uso agora e passa a usá-lo',
        onclick: addProfile,
      },
      '+ ' + t('Novo perfil'),
    ),
    h(
      'p',
      { class: 'menuHint' },
      'Cada perfil guarda uma aparência completa: modelo, cores, fontes e logo.',
    ),
  );
}
/** "Perfil 2", "Perfil 3"…: the first number no profile is using yet. */
function nextProfileName() {
  const taken = new Set(config.profiles.map((p) => p.name.trim().toLowerCase()));
  for (let n = config.profiles.length + 1; ; n++) {
    const name = t('Perfil {n}', { n });
    if (!taken.has(name.toLowerCase())) return name;
  }
}
/** A new profile, copy of the look in use, ready to be given its name. */
async function addProfile() {
  const r = await profileCommand('/api/profile/add', { name: nextProfileName() });
  if (!r) return;
  renaming = config.profile;
  profileOpen = true;
  renderProfiles();
  toast(t('Perfil criado com a aparência atual. Dê um nome a ele.'));
}
function closeProfiles() {
  profileOpen = false;
  renaming = '';
  $('#profileList').replaceChildren();
  renderProfiles();
}
$('#profileBtn').onclick = () => {
  if (profileOpen) return closeProfiles();
  profileOpen = true;
  renderProfiles();
};
document.addEventListener('pointerdown', (e) => {
  if (profileOpen && !$('#profileMenu').contains(e.target)) closeProfiles();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && profileOpen) closeProfiles();
});
/** A change of profile made here: the answer brings the whole look of the other one. */
async function profileCommand(path, body) {
  // What was just changed belongs to the profile in use: save it before leaving it.
  clearTimeout(saveTimer);
  await api('/api/config', { method: 'PUT', body: config });
  const r = await api(path, { method: 'POST', body });
  if (r.error) return void toast(friendly(r.error));
  config = r.config;
  renderProfiles();
  renderNav();
  renderForm();
  setTimeout(replayPreview, 350);
  return r;
}
const profilesCard = () => {
  const name = h('input', {
    maxlength: 40,
    placeholder: 'Nome do novo perfil (ex.: Culto de mulheres, Natal)',
  });
  const add = async () => {
    if (!name.value.trim()) return name.focus();
    const r = await profileCommand('/api/profile/add', { name: name.value });
    if (r) toast(t('Perfil "{name}" criado com a aparência atual.', { name: name.value.trim() }));
  };
  name.addEventListener('keydown', (e) => e.key === 'Enter' && add());
  return card(
    'Perfis de culto',
    hint(
      'Cada perfil guarda uma aparência completa: modelo, cores, fontes, logo, posições e o que o selo mostra. Troque, crie, renomeie e exclua perfis no seletor do alto desta página; a troca também está no painel do OBS. Os nomes, avisos, agenda e contribuições são os mesmos em todos.',
    ),
    h(
      'div',
      { class: 'rows' },
      config.profiles.map((p) =>
        h(
          'div',
          { class: 'row profileRow' + (p.id === config.profile ? ' current' : '') },
          h('input', {
            value: p.name,
            maxlength: 40,
            title: 'Nome do perfil',
            onchange: (e) => {
              p.name = e.target.value.trim() || p.name;
              save();
              renderProfiles();
            },
          }),
          p.id === config.profile
            ? h('b', { class: 'tag' }, 'Em uso')
            : h(
                'button',
                { onclick: () => profileCommand('/api/profile/use', { id: p.id }) },
                'Usar',
              ),
          h(
            'a',
            { href: `/api/share/profile?id=${p.id}`, download: '' },
            h(
              'button',
              {
                title:
                  'Salva a aparência deste perfil num arquivo (com o logo e o modelo próprio), para levar a outra igreja',
              },
              'Exportar',
            ),
          ),
          h(
            'button',
            {
              disabled: config.profiles.length < 2,
              title: 'Excluir este perfil. Os nomes, avisos e contribuições não são apagados.',
              onclick: () =>
                confirm(t('Excluir o perfil "{name}"?', { name: p.name })) &&
                profileCommand('/api/profile/remove', { id: p.id }),
            },
            'Excluir',
          ),
        ),
      ),
    ),
    importButton('Importar perfil de um arquivo'),
    h(
      'div',
      { class: 'row profileRow' },
      name,
      h(
        'button',
        {
          class: 'primary',
          title: 'Cria um perfil com a aparência que está em uso agora e passa a usá-lo',
          onclick: add,
        },
        'Salvar como novo perfil',
      ),
    ),
    hint(
      'Para um perfil novo: salve com um nome e depois escolha o modelo, as cores e o logo dele.',
    ),
  );
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
$('#updatePill').onclick = () => {
  go('home');
  document.querySelector('.step.attention')?.scrollIntoView({ block: 'center' });
};
checkUpdate();
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
      if (!config.setupDone && !wizardOffered) openWizard(0);
      wizardOffered = true;
    } else if (liveChanged && page === 'home') renderForm();
    if (config) {
      useLanguage(config.language);
      $('#language').value = config.language;
      renderProfiles();
    }
    if (liveChanged) renderNav();
    renderOnAir();
  },
  (online) => {
    $('#conn').classList.toggle('ok', online);
    $('#conn span').textContent = online ? 'Programa ativo' : 'Sem conexão com o programa';
  },
);

import {
  $,
  api,
  connect,
  friendly,
  h,
  renderVersion,
  theme,
  toast,
  toggleTheme,
} from './js/common.js';
import { givingTag, NETWORKS, SOCIAL_ICONS } from './js/look.js';
import { autoLocalize, t, useLanguage } from './js/i18n.js';

// The panel that lives in an OBS dock. Each tab has the text fields on top (or on the left
// in a wide dock), to type and show at once, and the saved list to show with one click.
// Models, colors and fonts are in the settings page, opened by the gear.
let config = null,
  live = null,
  tab = localStorage.cltTab || 'lower';
const built = {}; // panes are built once, so typing is never interrupted by an update
const editing = { lower: '', agenda: '' };
document.documentElement.classList.toggle('inObs', !!window.obsstudio);

function applyTheme(t = theme()) {
  $('#themeToggle img').src = t === 'dark' ? '/icons/sun.svg' : '/icons/moon.svg';
}
applyTheme();
$('#themeToggle').onclick = () => applyTheme(toggleTheme());

const TABS = [
  ['lower', 'Nomes', 'Nomes e legendas (lower third)'],
  ['card', 'QR', 'Cartão com QR Code: a contribuição da igreja ou um link'],
  ['top', 'Superior', 'Selo no canto da tela: logo, nome, AO VIVO, horário e recados'],
  ['ticker', 'Inferior', 'Barra inferior: texto rolando o tempo todo'],
  ['agenda', 'Agenda', 'Dias e horários dos cultos, um dia de cada vez'],
  ['social', 'Redes', 'Redes sociais: "Siga-nos no…"'],
];
// PIX is the word in Brazil; everywhere else the button talks about the offering.
const givingName = () => (config.giving.method === 'pix' ? 'PIX' : 'Oferta');
const TIMES = [0, 5, 8, 10, 15, 20, 30, 45, 60, 120];

async function command(path, options = { method: 'POST' }) {
  const r = await api(path, options);
  if (r.error) toast(friendly(r.error));
  return r;
}
const patch = (set) => command('/api/patch', { method: 'POST', body: set });
const newId = () => Math.random().toString(36).slice(2, 10);
const input = (placeholder, max, attrs = {}) =>
  h('input', { placeholder, maxlength: max, autocomplete: 'off', ...attrs });
const mini = (text, title, onclick, cls = '') =>
  h(
    'span',
    {
      class: 'mini ' + cls,
      role: 'button',
      tabindex: '0',
      title,
      onclick: (e) => {
        e.stopPropagation();
        onclick();
      },
    },
    text,
  );
const toggleButton = (el, label, title) =>
  h(
    'button',
    { class: 'toggle', 'data-toggle': el, title, onclick: () => command(`/api/live/${el}/toggle`) },
    h('i'),
    h('span', {}, label),
  );
const listWrap = (title, note = '') =>
  h(
    'div',
    { class: 'listWrap' },
    h('div', { class: 'sectionTitle' }, h('span', {}, title), h('small', {}, note)),
    h('div', { class: 'items', 'data-list': '' }),
  );
const empty = (text) => h('div', { class: 'empty' }, text);

// ---------- Names ----------
function buildLower() {
  const l1 = input('Nome', 120),
    l2 = input('Legenda (cargo, texto)', 160);
  const show = h(
    'button',
    { class: 'primary', title: 'Mostra na tela o que está escrito, sem precisar salvar (Enter)' },
    'Mostrar',
  );
  const save = h(
    'button',
    { title: 'Guarda na lista para mostrar depois com um clique' },
    'Salvar na lista',
  );
  const cancel = h('button', { class: 'hidden', title: 'Sai da edição sem alterar' }, 'Cancelar');
  const stop = () => {
    editing.lower = '';
    l1.value = l2.value = '';
    refresh();
  };
  const values = () => ({ line1: l1.value.trim(), line2: l2.value.trim() });
  const go = async () => {
    const v = values();
    if (!v.line1 && !v.line2) return l1.focus();
    await patch({ 'lower.quick': { ...v, logo: true, qr: 'none', qrText: '' } });
    command('/api/live/lower/show?item=quick');
  };
  show.onclick = go;
  for (const i of [l1, l2]) i.onkeydown = (e) => e.key === 'Enter' && go();
  save.onclick = async () => {
    const v = values();
    if (!v.line1 && !v.line2) return l1.focus();
    const items = structuredClone(config.lower.items),
      current = items.find((i) => i.id === editing.lower);
    if (current) Object.assign(current, v);
    else items.push({ id: newId(), ...v, logo: true, qr: 'none', qrText: '' });
    const r = await patch({ 'lower.items': items });
    if (!r.error) stop();
  };
  cancel.onclick = stop;
  const pane = [
    h(
      'div',
      { class: 'editor' },
      h('div', { class: 'pair' }, l1, l2),
      h('div', { class: 'actions' }, show, save, cancel),
      h('div', { class: 'note', 'data-note': '' }),
    ),
    listWrap('Lista', 'clique: mostrar ou esconder'),
  ];
  return {
    pane,
    refresh(root) {
      const quickOn = live.lower.on && live.lower.item === 'quick';
      show.textContent = quickOn ? 'Atualizar no ar' : 'Mostrar';
      save.textContent = editing.lower ? 'Salvar alteração' : 'Salvar na lista';
      cancel.classList.toggle('hidden', !editing.lower);
      root.querySelector('[data-note]').replaceChildren(
        quickOn
          ? h(
              'span',
              {},
              'No ar:',
              ' ',
              h('b', { 'data-raw': '' }, config.lower.quick.line1 || config.lower.quick.line2),
              ' · ',
              h(
                'a',
                {
                  href: '#',
                  onclick: (e) => (e.preventDefault(), command('/api/live/lower/hide')),
                },
                'esconder',
              ),
            )
          : '',
      );
      root.querySelector('[data-list]').replaceChildren(
        ...config.lower.items.map((item) => {
          const on = live.lower.on && live.lower.item === item.id;
          return h(
            'button',
            {
              class: 'item' + (on ? ' on' : '') + (editing.lower === item.id ? ' editing' : ''),
              title: on ? 'No ar: clique para esconder' : 'Clique para mostrar na tela',
              onclick: () => command(`/api/live/lower/toggle?item=${item.id}`),
            },
            h('i'),
            h(
              'span',
              { class: 'txt', 'data-raw': '' },
              h('b', {}, item.line1 || item.line2),
              item.line1 && item.line2 ? h('small', {}, item.line2) : null,
            ),
            item.qr !== 'none'
              ? h('span', { class: 'tag' }, item.qr === 'giving' ? givingTag(config) : 'QR')
              : null,
            mini('✎', 'Editar o texto', () => {
              editing.lower = item.id;
              l1.value = item.line1;
              l2.value = item.line2;
              refresh();
              l1.focus();
            }),
            mini(
              '×',
              'Remover da lista',
              () => patch({ 'lower.items': config.lower.items.filter((i) => i.id !== item.id) }),
              'del',
            ),
          );
        }),
        ...(config.lower.items.length
          ? []
          : [empty('Nada salvo ainda. Escreva acima e clique em "Salvar na lista".')]),
      );
    },
  };
}

// ---------- QR / PIX ----------
function buildCard() {
  let kind = config.card.qr;
  const url = input('Link do QR Code: https://…', 600, { value: config.card.qrText }),
    title = input('Título', 60, { value: config.card.title }),
    sub = input('Texto de apoio', 90, { value: config.card.subtitle });
  const seg = h('div', { class: 'seg' });
  const drawSeg = () => {
    seg.replaceChildren(
      ...[
        [
          'giving',
          givingName(),
          'QR Code da contribuição da igreja: PIX, transferência, link ou imagem (escolha nas configurações)',
        ],
        ['url', 'Link', 'QR Code que abre um site, uma inscrição, uma rede social…'],
      ].map(([v, l, t]) =>
        h(
          'button',
          {
            type: 'button',
            title: t,
            class: kind === v ? 'active' : '',
            onclick: () => {
              kind = v;
              drawSeg();
            },
          },
          l,
        ),
      ),
    );
    url.classList.toggle('hidden', kind !== 'url');
  };
  drawSeg();
  const values = () => ({
    title: title.value.trim(),
    subtitle: sub.value.trim(),
    qr: kind,
    qrText: url.value.trim(),
  });
  const apply = async (v) => {
    if (v.qr === 'url' && !v.qrText) return void (toast('Escreva o link do QR Code.'), url.focus());
    const r = await patch({
      'card.title': v.title,
      'card.subtitle': v.subtitle,
      'card.qr': v.qr,
      'card.qrText': v.qrText,
    });
    if (!r.error) command('/api/live/card/show');
  };
  const show = h(
    'button',
    {
      class: 'primary',
      title: 'Mostra o cartão com o que está escrito acima',
      onclick: () => apply(values()),
    },
    'Mostrar',
  );
  const hide = h(
    'button',
    {
      class: 'hidden',
      title: 'Tira o cartão da tela',
      onclick: () => command('/api/live/card/hide'),
    },
    'Esconder',
  );
  const save = h(
    'button',
    {
      title: 'Guarda este QR Code na lista',
      onclick: () => {
        const v = values();
        if (v.qr === 'url' && !v.qrText)
          return void (toast('Escreva o link do QR Code.'), url.focus());
        patch({ 'card.saved': [...config.card.saved, { id: newId(), ...v }] });
      },
    },
    'Salvar na lista',
  );
  return {
    pane: [
      h(
        'div',
        { class: 'editor' },
        seg,
        url,
        h('div', { class: 'pair' }, title, sub),
        h('div', { class: 'actions' }, show, hide, save),
      ),
      listWrap('QR Codes salvos', 'clique: mostrar'),
    ],
    refresh(root) {
      show.textContent = live.card.on ? 'Atualizar no ar' : 'Mostrar';
      hide.classList.toggle('hidden', !live.card.on);
      const c = config.card;
      root.querySelector('[data-list]').replaceChildren(
        ...c.saved.map((s) => {
          const on =
            live.card.on &&
            c.title === s.title &&
            c.qr === s.qr &&
            c.qrText === s.qrText &&
            c.subtitle === s.subtitle;
          return h(
            'button',
            {
              class: 'item' + (on ? ' on' : ''),
              title: on ? 'No ar: clique para esconder' : 'Clique para mostrar este QR Code',
              onclick: () => {
                if (on) return command('/api/live/card/hide');
                kind = s.qr;
                url.value = s.qrText;
                title.value = s.title;
                sub.value = s.subtitle;
                drawSeg();
                apply(s);
              },
            },
            h('i'),
            h(
              'span',
              { class: 'txt', 'data-raw': '' },
              h('b', {}, s.title || s.qrText),
              h('small', {}, s.qr === 'giving' ? t('Contribuição da igreja') : s.qrText),
            ),
            h('span', { class: 'tag' }, s.qr === 'giving' ? givingTag(config) : 'LINK'),
            mini(
              '×',
              'Remover da lista',
              () => patch({ 'card.saved': c.saved.filter((x) => x.id !== s.id) }),
              'del',
            ),
          );
        }),
        ...(c.saved.length ? [] : [empty('Salve aqui o PIX e os links que você mais usa.')]),
      );
    },
  };
}

// ---------- Top bar and bottom bar: a text now, and the list that rotates ----------
function buildTexts(el, { label, tip, extra = [], parts = [], listTitle, hint }) {
  const text = input(hint, 200);
  const pinNow = async (value) => {
    const r = await patch({ [`${el}.pinned`]: value });
    if (!r.error && value && !live[el].on) command(`/api/live/${el}/show`);
  };
  const go = () => (text.value.trim() ? pinNow(text.value.trim()) : text.focus());
  text.onkeydown = (e) => e.key === 'Enter' && go();
  const pinned = h('div', { class: 'pinned hidden' });
  return {
    pane: [
      h(
        'div',
        { class: 'editor' },
        h('div', { class: extra.length ? 'pair' : '' }, toggleButton(el, label, tip), ...extra),
        parts.length
          ? h(
              'div',
              { class: 'parts', title: 'O que aparece no selo' },
              parts.map(([path, name]) =>
                h(
                  'label',
                  {},
                  h('input', {
                    type: 'checkbox',
                    'data-part': path,
                    onchange: (e) => patch({ [path]: e.target.checked }),
                  }),
                  name,
                ),
              ),
            )
          : null,
        text,
        h(
          'div',
          { class: 'actions' },
          h(
            'button',
            {
              class: 'primary',
              title: 'Mostra só este texto agora, no lugar da lista (Enter)',
              onclick: go,
            },
            'Mostrar agora',
          ),
          h(
            'button',
            {
              title: 'Guarda este texto na lista',
              onclick: async () => {
                const v = text.value.trim();
                if (!v) return text.focus();
                const r = await patch({ [`${el}.messages`]: [...config[el].messages, v] });
                if (!r.error) text.value = '';
              },
            },
            'Salvar na lista',
          ),
        ),
        pinned,
      ),
      listWrap(listTitle, 'clique: mostrar só este'),
    ],
    refresh(root) {
      const c = config[el];
      for (const box of root.querySelectorAll('[data-part]'))
        box.checked = !!c[box.dataset.part.split('.')[1]];
      pinned.classList.toggle('hidden', !c.pinned);
      pinned.replaceChildren(
        h('span', { 'data-raw': '' }, t('Fixo:') + ' ', h('b', {}, c.pinned)),
        h(
          'button',
          { title: 'Volta a mostrar os textos da lista', onclick: () => pinNow('') },
          'Voltar à lista',
        ),
      );
      root.querySelector('[data-list]').replaceChildren(
        ...c.messages.map((m, i) =>
          h(
            'button',
            {
              class: 'item' + (c.pinned === m && live[el].on ? ' on' : ''),
              title:
                c.pinned === m
                  ? 'Fixo: clique para voltar à lista'
                  : 'Clique para mostrar só este texto',
              onclick: () => pinNow(c.pinned === m ? '' : m),
            },
            h('i'),
            h('span', { class: 'txt', 'data-raw': '' }, h('b', {}, m)),
            mini('✎', 'Editar: leva o texto para o campo acima e tira da lista', () => {
              text.value = m;
              patch({ [`${el}.messages`]: c.messages.filter((_, j) => j !== i) });
              text.focus();
            }),
            mini(
              '×',
              'Remover da lista',
              () => patch({ [`${el}.messages`]: c.messages.filter((_, j) => j !== i) }),
              'del',
            ),
          ),
        ),
        ...(c.messages.length ? [] : [empty('A lista está vazia.')]),
      );
    },
  };
}

// ---------- Agenda ----------
function buildAgenda() {
  const day = input('Dia (ex.: Domingo)', 40),
    lines = h('textarea', {
      rows: 3,
      maxlength: 400,
      placeholder: 'Horários, um por linha',
    });
  const save = h(
    'button',
    { class: 'primary', title: 'Guarda este dia na agenda' },
    'Adicionar dia',
  );
  const cancel = h('button', { class: 'hidden' }, 'Cancelar');
  const stop = () => {
    editing.agenda = '';
    day.value = lines.value = '';
    refresh();
  };
  save.onclick = async () => {
    const v = { day: day.value.trim(), lines: lines.value.trim() };
    if (!v.day && !v.lines) return day.focus();
    const days = structuredClone(config.agenda.days),
      current = days.find((d) => d.id === editing.agenda);
    if (current) Object.assign(current, v);
    else days.push({ id: newId(), ...v });
    const r = await patch({ 'agenda.days': days });
    if (!r.error) stop();
  };
  cancel.onclick = stop;
  return {
    pane: [
      h(
        'div',
        { class: 'editor' },
        toggleButton(
          'agenda',
          'Mostrar a agenda',
          'Mostra um dia de cada vez, passando para o próximo, e sai depois do último',
        ),
        day,
        lines,
        h('div', { class: 'actions' }, save, cancel),
      ),
      listWrap('Dias', ''),
    ],
    refresh(root) {
      const a = config.agenda;
      save.textContent = editing.agenda ? 'Salvar alteração' : 'Adicionar dia';
      cancel.classList.toggle('hidden', !editing.agenda);
      root.querySelector('.sectionTitle small').textContent = a.days.length
        ? t('{n} s por dia', { n: a.seconds }) + (a.loop ? ' · ' + t('repete') : '')
        : '';
      const move = (i, d) => {
        const days = [...a.days];
        [days[i], days[i + d]] = [days[i + d], days[i]];
        patch({ 'agenda.days': days });
      };
      root.querySelector('[data-list]').replaceChildren(
        ...a.days.map((d, i) =>
          h(
            'button',
            {
              class: 'item' + (editing.agenda === d.id ? ' editing' : ''),
              title: 'Clique para editar este dia',
              onclick: () => {
                editing.agenda = d.id;
                day.value = d.day;
                lines.value = d.lines;
                refresh();
                day.focus();
              },
            },
            h(
              'span',
              { class: 'txt', 'data-raw': '' },
              h('b', {}, d.day),
              h('small', {}, d.lines.replace(/\n/g, '  |  ')),
            ),
            i > 0 ? mini('↑', 'Mostrar antes', () => move(i, -1)) : null,
            mini(
              '×',
              'Remover da agenda',
              () => patch({ 'agenda.days': a.days.filter((x) => x.id !== d.id) }),
              'del',
            ),
          ),
        ),
        ...(a.days.length ? [] : [empty('Adicione os dias de culto e os horários de cada um.')]),
      );
    },
  };
}

// ---------- Social networks ----------
function buildSocial() {
  const network = h(
      'select',
      { title: 'Rede social' },
      NETWORKS.map(([v, l]) => h('option', { value: v }, l)),
    ),
    handle = input('@ da igreja ou endereço', 80);
  const add = async () => {
    const v = handle.value.trim();
    if (!v) return handle.focus();
    const label = network.value === 'other' ? '' : NETWORKS.find(([n]) => n === network.value)[1];
    const r = await patch({
      'social.items': [
        ...config.social.items,
        { id: newId(), network: network.value, label, handle: v, icon: '' },
      ],
    });
    if (!r.error) handle.value = '';
  };
  handle.onkeydown = (e) => e.key === 'Enter' && add();
  const nets = h('div', { class: 'nets' });
  return {
    pane: [
      h(
        'div',
        { class: 'editor' },
        h('div', { class: 'pair' }, network, handle),
        h(
          'div',
          { class: 'actions' },
          h(
            'button',
            { class: 'primary', title: 'Adiciona a rede aos botões (Enter)', onclick: add },
            'Adicionar rede',
          ),
        ),
        h('div', { class: 'note', 'data-note': '' }),
      ),
      h(
        'div',
        { class: 'listWrap' },
        h(
          'div',
          { class: 'sectionTitle' },
          h('span', {}, 'Redes'),
          h('small', {}, 'clique: mostrar ou esconder'),
        ),
        nets,
      ),
    ],
    refresh(root) {
      const s = config.social;
      root.querySelector('[data-note]').textContent = t(
        'Na tela aparece: "{prefix} Instagram" e o @. O texto e o modelo ficam nas configurações.',
        {
          prefix: s.prefix,
        },
      );
      nets.replaceChildren(
        ...s.items.map((item) => {
          const on = live.social.on && live.social.item === item.id;
          const ico = h('span', { class: 'ico' });
          if (item.icon) ico.append(h('img', { src: item.icon, alt: '' }));
          else ico.innerHTML = SOCIAL_ICONS[item.network] || SOCIAL_ICONS.other;
          return h(
            'button',
            {
              class: 'net' + (on ? ' on' : ''),
              title: on
                ? 'No ar: clique para esconder'
                : `${t('Mostrar na tela:')} ${s.prefix} ${item.label} ${item.handle}`,
              onclick: () => command(`/api/live/social/toggle?item=${item.id}`),
            },
            ico,
            h(
              'span',
              { class: 'txt', 'data-raw': '' },
              h('b', {}, item.handle),
              h('small', {}, item.label || t('Rede')),
            ),
            mini(
              '×',
              'Remover',
              () => patch({ 'social.items': s.items.filter((x) => x.id !== item.id) }),
              'del',
            ),
          );
        }),
        ...(s.items.length ? [] : [empty('Adicione o Instagram, o YouTube…')]),
      );
    },
  };
}

const BUILD = {
  lower: buildLower,
  card: buildCard,
  top: () =>
    buildTexts('top', {
      label: 'Selo superior',
      tip: 'Mostra ou esconde o selo do canto da tela',
      extra: [
        toggleButton(
          'bug',
          'Logo solto',
          'Mostra ou esconde o logo sozinho em outro canto da tela',
        ),
      ],
      parts: [
        ['top.showLogo', 'Logo'],
        ['top.showName', 'Nome'],
        ['top.showLive', 'Ao vivo'],
        ['top.showClock', 'Hora'],
        ['top.showMessages', 'Recados'],
      ],
      listTitle: 'Recados',
      hint: 'Recado para mostrar agora',
    }),
  ticker: () =>
    buildTexts('ticker', {
      label: 'Barra inferior',
      tip: 'Mostra ou esconde a barra inferior, com o texto rolando',
      listTitle: 'Textos que rolam',
      hint: 'Texto para rolar agora',
    }),
  agenda: buildAgenda,
  social: buildSocial,
};

function refresh() {
  if (!config || !live) return;
  // Categories switched off in the settings (the eye) are not offered here.
  const tabs = TABS.filter(([id]) => config.enabled[id] || (id === 'top' && config.enabled.bug));
  if (!tabs.some(([id]) => id === tab)) tab = tabs[0]?.[0] || '';
  $('#tabs').replaceChildren(
    ...tabs.map(([id, label, title]) =>
      h(
        'button',
        {
          class:
            (id === tab ? 'active ' : '') +
            (live[id].on || (id === 'top' && live.bug.on) ? 'on' : ''),
          title,
          onclick: () => {
            tab = localStorage.cltTab = id;
            refresh();
          },
        },
        h('i'),
        id === 'card'
          ? h('span', { 'data-raw': '' }, `QR / ${t(givingName())}`)
          : h('span', {}, label),
      ),
    ),
  );
  const pane = $('#pane');
  if (!tab) {
    pane.dataset.tab = '';
    pane.replaceChildren(
      empty('Todas as categorias estão desativadas. Ative alguma nas configurações (engrenagem).'),
    );
    return;
  }
  built[tab] ??= BUILD[tab]();
  if (pane.dataset.tab !== tab) {
    pane.dataset.tab = tab;
    pane.replaceChildren(...built[tab].pane);
  }
  built[tab].refresh(pane);
  pane.classList.toggle('onlyExtra', !config.enabled[tab]);
  for (const b of pane.querySelectorAll('[data-toggle]'))
    b.classList.toggle('hidden', !config.enabled[b.dataset.toggle]);
  for (const b of pane.querySelectorAll('[data-toggle]'))
    b.classList.toggle('on', !!live[b.dataset.toggle].on);
  const time = $('#autoHide'),
    value = config.timing.autoHide;
  const options = [...new Set([...TIMES, value])].sort((a, b) => a - b);
  if (time.dataset.key !== options.join()) {
    time.dataset.key = options.join();
    time.replaceChildren(
      ...options.map((s) =>
        h('option', { value: s }, s === 0 ? t('Fica') : s >= 120 ? `${s / 60} min` : `${s} s`),
      ),
    );
  }
  if (document.activeElement !== time) time.value = String(value);
}

$('#autoHide').onchange = (e) => patch({ 'timing.autoHide': Number(e.target.value) });
$('#hideAll').onclick = () => command('/api/live/all/hide');
$('#openSettings').onclick = () => command('/api/open-settings');

autoLocalize();
// A quiet check: the gear gets a dot when a new version can be installed from the settings.
api('/api/update').then((u) => {
  if (!u.newer) return;
  const gear = $('#openSettings');
  gear.classList.add('hasUpdate');
  gear.title = 'Atualização disponível: abra as configurações para atualizar';
});
connect((e) => {
  if (e.config) {
    config = e.config;
    useLanguage(config.language);
  }
  if (e.live) live = e.live;
  renderVersion(e.version);
  refresh();
});

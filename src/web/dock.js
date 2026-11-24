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
import { EYE, EYE_OFF, givingTag, NETWORKS, SOCIAL_ICONS } from './js/look.js';
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
  ['card', 'Ofertas e Dízimos', 'Cartão com QR Code: ofertas, dízimos, missões, um link…'],
  ['top', 'Superior', 'Selo no canto da tela: logo, nome, AO VIVO, horário e recados'],
  ['ticker', 'Inferior', 'Barra inferior: texto rolando o tempo todo'],
  ['agenda', 'Agenda', 'Dias e horários dos cultos, um dia de cada vez'],
  ['social', 'Redes', 'Redes sociais: "Siga-nos no…"'],
  ['comment', 'Comentários', 'Um comentário digitado na hora: quem escreveu e o que disse'],
];
const PINNABLE = ['lower', 'card', 'agenda', 'social', 'comment'];
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
  // (A listener, not "onkeydown =": there, the value returned by a one-line function would
  // cancel every other key, and nothing could be typed.)
  for (const i of [l1, l2]) i.addEventListener('keydown', (e) => e.key === 'Enter' && go());
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
const MISSING = { url: 'Escreva o link do QR Code.', pixkey: 'Escreva a chave PIX desta oferta.' };
function buildCard() {
  let kind = config.card.qr;
  const url = input('', 600, { value: config.card.qrText }),
    title = input('Título', 60, { value: config.card.title }),
    sub = input('Texto de apoio', 90, { value: config.card.subtitle });
  const seg = h('div', { class: 'seg' });
  const drawSeg = () => {
    seg.replaceChildren(
      ...[
        [
          'giving',
          'Principal',
          'QR Code da contribuição principal da igreja: PIX, transferência, link ou imagem (escolha nas configurações)',
        ],
        // Another PIX key for the same receiver: missions, a campaign, a purchase…
        ...(config.giving.method === 'pix'
          ? [
              [
                'pixkey',
                'Outra chave PIX',
                'QR Code de PIX com outra chave, para uma oferta específica',
              ],
            ]
          : []),
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
    url.classList.toggle('hidden', kind === 'giving');
    url.placeholder = t(
      kind === 'pixkey' ? 'Chave PIX desta oferta' : 'Link do QR Code: https://…',
    );
  };
  drawSeg();
  const values = () => ({
    title: title.value.trim(),
    subtitle: sub.value.trim(),
    qr: kind,
    qrText: url.value.trim(),
  });
  const apply = async (v) => {
    if (v.qr !== 'giving' && !v.qrText) return void (toast(MISSING[v.qr]), url.focus());
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
        if (v.qr !== 'giving' && !v.qrText) return void (toast(MISSING[v.qr]), url.focus());
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
      listWrap('Ofertas salvas', 'clique: mostrar'),
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
              h('small', {}, s.qr === 'giving' ? t('Contribuição principal') : s.qrText),
            ),
            h(
              'span',
              { class: 'tag' },
              s.qr === 'giving' ? givingTag(config) : s.qr === 'pixkey' ? 'PIX' : 'LINK',
            ),
            mini(
              '×',
              'Remover da lista',
              () => patch({ 'card.saved': c.saved.filter((x) => x.id !== s.id) }),
              'del',
            ),
          );
        }),
        ...(c.saved.length
          ? []
          : [empty('Salve aqui cada oferta: dízimos, missões, uma campanha, um link…')]),
      );
    },
  };
}

// ---------- Top bar and bottom bar: a text now, and the list that rotates ----------
function buildTexts(el, { extra = [], parts = [], listTitle, hint }) {
  const text = input(hint, 200);
  // The corner badge only shows messages while that part of it is switched on.
  const shows = () => el !== 'top' || config.top.showMessages;
  const pinNow = async (value) => {
    const r = await patch({
      [`${el}.pinned`]: value,
      // Showing a message now switches the messages of the badge on.
      ...(value && !shows() ? { 'top.showMessages': true } : {}),
    });
    if (!r.error && value && !live[el].on) command(`/api/live/${el}/show`);
  };
  const go = () => (text.value.trim() ? pinNow(text.value.trim()) : text.focus());
  text.addEventListener('keydown', (e) => e.key === 'Enter' && go());
  const pinned = h('div', { class: 'pinned hidden' });
  return {
    pane: [
      h(
        'div',
        { class: 'editor' },
        extra.length ? h('div', {}, ...extra) : null,
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
      const fixed = shows() ? c.pinned : '';
      pinned.classList.toggle('hidden', !fixed);
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
              class: 'item' + (fixed === m && live[el].on ? ' on' : ''),
              title:
                fixed === m
                  ? 'Fixo: clique para voltar à lista'
                  : 'Clique para mostrar só este texto',
              onclick: () => pinNow(fixed === m ? '' : m),
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
      h('div', { class: 'editor' }, day, lines, h('div', { class: 'actions' }, save, cancel)),
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
  handle.addEventListener('keydown', (e) => e.key === 'Enter' && add());
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
      // Every item in sequence, each for a few seconds (the pace is in the settings).
      const allOn = live.social.on && live.social.item === 'all';
      const all =
        s.items.length > 1
          ? h(
              'button',
              {
                class: 'net all' + (allOn ? ' on' : ''),
                title: allOn
                  ? 'No ar: clique para esconder'
                  : 'Mostra todos em sequência, um de cada vez. Use o botão de fixar para deixar passando.',
                onclick: () => command('/api/live/social/toggle?item=all'),
              },
              h('span', { class: 'ico' }, '∞'),
              h(
                'span',
                { class: 'txt' },
                h('b', {}, 'Todos em sequência'),
                h(
                  'small',
                  { 'data-raw': '' },
                  t('{n} itens, {s} s cada', { n: s.items.length, s: s.seconds }),
                ),
              ),
            )
          : null;
      nets.replaceChildren(
        ...(all ? [all] : []),
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
              h('small', {}, item.text || item.label || t('Rede')),
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

// ---------- Comments: typed by hand, shown at once or kept in the list ----------
function buildComment() {
  const user = input('Quem escreveu (nome ou @usuário)', 60),
    said = h('textarea', { placeholder: 'O comentário', maxlength: 280, rows: 3 });
  const values = () => ({ user: user.value.trim(), text: said.value.trim() });
  const show = async (v) => {
    if (!v.text) return said.focus();
    const r = await patch({ 'comment.user': v.user, 'comment.said': v.text });
    if (!r.error) command('/api/live/comment/show');
  };
  // Enter shows it; Shift+Enter makes a new line.
  const enter = (e) => {
    if (e.key !== 'Enter' || e.shiftKey) return;
    e.preventDefault();
    show(values());
  };
  user.addEventListener('keydown', enter);
  said.addEventListener('keydown', enter);
  return {
    pane: [
      h(
        'div',
        { class: 'editor' },
        user,
        said,
        h(
          'div',
          { class: 'actions' },
          h(
            'button',
            {
              class: 'primary',
              title: 'Mostra na tela o comentário escrito acima (Enter)',
              onclick: () => show(values()),
            },
            'Mostrar',
          ),
          h(
            'button',
            {
              title: 'Guarda este comentário na lista para mostrar depois',
              onclick: async () => {
                const v = values();
                if (!v.text) return said.focus();
                const r = await patch({
                  'comment.saved': [...config.comment.saved, { id: newId(), ...v }],
                });
                if (!r.error) user.value = said.value = '';
              },
            },
            'Salvar na lista',
          ),
        ),
      ),
      listWrap('Comentários salvos', 'clique: mostrar'),
    ],
    refresh(root) {
      const c = config.comment;
      root.querySelector('[data-list]').replaceChildren(
        ...c.saved.map((s) => {
          const on = live.comment.on && c.user === s.user && c.said === s.text;
          return h(
            'button',
            {
              class: 'item' + (on ? ' on' : ''),
              title: on ? 'No ar: clique para esconder' : 'Clique para mostrar este comentário',
              onclick: () => (on ? command('/api/live/comment/hide') : show(s)),
            },
            h('i'),
            h(
              'span',
              { class: 'txt', 'data-raw': '' },
              h('b', {}, s.user || s.text),
              s.user ? h('small', {}, s.text) : null,
            ),
            mini(
              '×',
              'Remover da lista',
              () => patch({ 'comment.saved': c.saved.filter((x) => x.id !== s.id) }),
              'del',
            ),
          );
        }),
        ...(c.saved.length
          ? []
          : [empty('Escreva o comentário acima e mostre na hora, ou salve para depois.')]),
      );
    },
  };
}

const BUILD = {
  lower: buildLower,
  comment: buildComment,
  card: buildCard,
  top: () =>
    buildTexts('top', {
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
        ['top.showDate', 'Data'],
        ['top.showMessages', 'Recados'],
      ],
      listTitle: 'Recados',
      hint: 'Recado para mostrar agora',
    }),
  ticker: () =>
    buildTexts('ticker', {
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
        h('span', {}, label),
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
  renderProfiles();
  // The bar of the tab: is it on air, the eye to show or hide it, and the pin for what
  // leaves by itself (names, offerings, schedule, social, comments).
  const on = !!live[tab].on,
    state = $('#paneState'),
    eye = $('#tabEye'),
    pin = $('#tabPin'),
    timed = PINNABLE.includes(tab);
  state.classList.toggle('on', on);
  state.lastChild.textContent = t(on ? 'No ar' : 'Fora do ar');
  eye.classList.toggle('on', on);
  eye.disabled = !config.enabled[tab];
  // The button says what a click does: show it, or hide what is on air.
  if (eye.dataset.on !== String(on)) {
    eye.dataset.on = String(on);
    eye.firstElementChild.innerHTML = on ? EYE_OFF : EYE;
  }
  eye.lastElementChild.textContent = t(on ? 'Esconder' : 'Mostrar');
  pin.classList.toggle('hidden', !timed);
  pin.classList.toggle('active', timed && !!live[tab].pin);
  const time = $('#autoHide'),
    value = config.timing.autoHide;
  const options = [...new Set([...TIMES, value])].sort((a, b) => a - b);
  if (time.dataset.key !== options.join()) {
    time.dataset.key = options.join();
    time.replaceChildren(
      ...options.map((s) =>
        h(
          'option',
          { value: s },
          `${t('Tempo')}: ${s === 0 ? t('sem limite') : s >= 120 ? `${s / 60} min` : `${s} s`}`,
        ),
      ),
    );
  }
  if (document.activeElement !== time) time.value = String(value);
}

$('#autoHide').onchange = (e) => patch({ 'timing.autoHide': Number(e.target.value) });
$('#tabPin').onclick = () => PINNABLE.includes(tab) && command(`/api/live/${tab}/togglepin`);
$('#tabEye').onclick = () => tab && command(`/api/live/${tab}/toggle`);
$('#hideAll').onclick = () => command('/api/live/all/hide');

// ---------- Service profile: the whole look at once ----------
function renderProfiles() {
  const box = $('#profile'),
    key = JSON.stringify(config.profiles.map((p) => [p.id, p.name]));
  if (box.dataset.key !== key) {
    box.dataset.key = key;
    // A name the person typed is shown as typed; only the untouched first name is translated.
    box.replaceChildren(
      ...config.profiles.map((p) =>
        h('option', { value: p.id, 'data-raw': '' }, p.name === 'Perfil 1' ? t(p.name) : p.name),
      ),
    );
  }
  if (document.activeElement !== box) box.value = config.profile;
}
$('#profile').onchange = (e) =>
  command('/api/profile/use', { method: 'POST', body: { id: e.target.value } });
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

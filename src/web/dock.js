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
import { plain, STEP_NAMES, stepText } from './js/lists.js';
import { givingQr, givingTag, NETWORKS, qrUrl, SOCIAL_ICONS } from './js/look.js';
import { autoLocalize, t, useLanguage } from './js/i18n.js';

// The panel that lives in an OBS dock. Each tab has the text fields on top (or on the left
// in a wide dock), to type and show at once, and the saved list to show with one click.
// Models, colors and fonts are in the settings page, opened by the gear.
let config = null,
  live = null,
  tab = localStorage.cltTab || 'lower';
const built = {}; // panes are built once, so typing is never interrupted by an update
let builtFor = null; // the profile the panes were built for
const editing = { lower: '', agenda: '' };
document.documentElement.classList.toggle('inObs', !!window.obsstudio);

function applyTheme(t = theme()) {
  $('#themeToggle img').src = t === 'dark' ? '/icons/sun.svg' : '/icons/moon.svg';
}
applyTheme();
$('#themeToggle').onclick = () => applyTheme(toggleTheme());

const TABS = [
  ['rundown', 'Roteiro', 'Roteiro do culto: o que vai ao ar em cada momento, um clique por vez'],
  ['lower', 'Nomes', 'Nomes e legendas (lower third)'],
  ['card', 'Ofertas e Dízimos', 'Cartão com QR Code: ofertas, dízimos, missões, um link…'],
  ['top', 'Superior', 'Selo no canto da tela: logo, nome, AO VIVO, horário e recados'],
  ['ticker', 'Inferior', 'Barra inferior: texto rolando o tempo todo'],
  ['agenda', 'Agenda', 'Dias e horários dos cultos, um dia de cada vez'],
  ['social', 'Redes', 'Redes sociais: "Siga-nos no…"'],
  ['comment', 'Comentários', 'Um comentário digitado na hora: quem escreveu e o que disse'],
  ['countdown', 'Contagem', 'Contagem regressiva: "O culto começa em 05:00"'],
];
// What leaves by itself when the time ends, and so can be pinned. The QR card is not one of
// them: it stays on air until it is switched off.
const PINNABLE = ['lower', 'agenda', 'social', 'comment'];
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
const listWrap = (title, note = '', find = false) =>
  h(
    'div',
    { class: 'listWrap' },
    h('div', { class: 'sectionTitle' }, h('span', {}, title), h('small', {}, note)),
    find
      ? h('input', {
          class: 'find hidden',
          type: 'search',
          'data-find': '',
          placeholder: 'Buscar na lista',
          autocomplete: 'off',
          oninput: () => refresh(),
        })
      : null,
    h('div', { class: 'items', 'data-list': '' }),
  );
const empty = (text) => h('div', { class: 'empty' }, text);
/** Removes one entry of a saved list; for a few seconds, "Desfazer" puts it back. */
async function drop(path, item, index) {
  const read = () => path.split('.').reduce((o, k) => o[k], config);
  const list = read(),
    at = index ?? list.indexOf(item);
  if (at < 0) return;
  const r = await patch({ [path]: list.filter((_, i) => i !== at) });
  if (r?.error) return;
  toast('Removido da lista.', () => {
    const now = [...read()];
    now.splice(Math.min(at, now.length), 0, item);
    patch({ [path]: now });
  });
}

// ---------- Names ----------
// Saved names can be filed in groups ("Pastores", "Louvor"…). Each group folds to its title;
// which ones are folded is remembered by this dock. The search looks in every group.
const NO_GROUP = 'none';
const folded = new Set(JSON.parse(localStorage.cltFolded || '[]'));
function fold(id, closed) {
  closed ? folded.add(id) : folded.delete(id);
  localStorage.cltFolded = JSON.stringify([...folded]);
}
function buildLower() {
  const l1 = input('Nome', 120),
    l2 = input('Legenda (cargo, texto)', 160),
    // Which group the name is saved in (shown once there is a group).
    group = h('select', { class: 'hidden', title: 'Grupo em que o nome fica guardado na lista' });
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
    if (current) Object.assign(current, v, { group: group.value });
    else items.push({ id: newId(), ...v, logo: true, qr: 'none', qrText: '', group: group.value });
    const r = await patch({ 'lower.items': items });
    // A name saved into a folded group opens it, so that it is seen.
    if (!r.error) (fold(group.value || NO_GROUP, false), stop());
  };
  cancel.onclick = stop;

  // The name of a group, new or being renamed: a field of its own that stays in place while
  // the list is redrawn (the list is redrawn at every change, and would take the typing away).
  let naming = null; // null = closed, '' = a new group, or the id of the one being renamed
  const groupName = input('Nome do grupo', 40),
    groupRow = h(
      'div',
      { class: 'groupRow hidden' },
      groupName,
      h(
        'button',
        { class: 'primary', title: 'Guarda o nome do grupo (Enter)', onclick: () => keep() },
        'OK',
      ),
      h('button', { title: 'Fecha sem alterar (Esc)', onclick: () => name(null) }, 'Cancelar'),
    );
  function name(id) {
    naming = id;
    groupRow.classList.toggle('hidden', id === null);
    if (id === null) return;
    groupName.value = config.lower.groups.find((g) => g.id === id)?.name || '';
    groupName.focus();
    groupName.select();
  }
  async function keep() {
    const text = groupName.value.trim();
    if (!text) return groupName.focus();
    const groups = structuredClone(config.lower.groups),
      current = groups.find((g) => g.id === naming),
      id = current?.id || newId();
    if (current) current.name = text;
    else groups.push({ id, name: text });
    const r = await patch({ 'lower.groups': groups });
    if (r.error) return;
    // A new group is the one the next name goes into.
    if (!current) group.dataset.pick = id;
    name(null);
  }
  groupName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') keep();
    if (e.key === 'Escape') name(null);
  });
  /** Removes a group; its names stay, without a group. "Desfazer" puts all back. */
  async function dropGroup(g) {
    const before = { groups: config.lower.groups, items: config.lower.items };
    const r = await patch({ 'lower.groups': before.groups.filter((x) => x.id !== g.id) });
    if (r?.error) return;
    toast('Grupo removido. Os nomes dele continuam na lista.', () =>
      patch({ 'lower.groups': before.groups, 'lower.items': before.items }),
    );
  }

  const wrap = listWrap('Lista', 'clique: mostrar ou esconder', true);
  wrap.querySelector('.sectionTitle').append(
    h(
      'button',
      {
        class: 'addGroup',
        title:
          'Cria um grupo de nomes (Pastores, Louvor, Convidados…). Os grupos podem ser minimizados.',
        onclick: () => name(''),
      },
      '+ Grupo',
    ),
  );
  wrap.querySelector('[data-list]').before(groupRow);
  const pane = [
    h(
      'div',
      { class: 'editor' },
      h('div', { class: 'pair' }, l1, l2),
      group,
      h('div', { class: 'actions' }, show, save, cancel),
      h('div', { class: 'note', 'data-note': '' }),
    ),
    wrap,
  ];
  const row = (item) => {
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
      mini('✎', 'Editar o texto e o grupo', () => {
        editing.lower = item.id;
        l1.value = item.line1;
        l2.value = item.line2;
        group.dataset.pick = item.group;
        refresh();
        l1.focus();
      }),
      mini('×', 'Remover da lista', () => drop('lower.items', item), 'del'),
    );
  };
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
      const groups = config.lower.groups;
      // The group of the next name saved: kept while the groups stay the same.
      const key = JSON.stringify(groups);
      if (group.dataset.key !== key || group.dataset.pick !== undefined) {
        const picked = group.dataset.pick ?? group.value;
        group.dataset.key = key;
        delete group.dataset.pick;
        group.replaceChildren(
          h('option', { value: '' }, 'Sem grupo'),
          ...groups.map((g) => h('option', { value: g.id, 'data-raw': '' }, g.name)),
        );
        group.value = groups.some((g) => g.id === picked) ? picked : '';
      }
      group.classList.toggle('hidden', !groups.length);
      // With many names saved, a search field narrows the list: in every group at once.
      const find = root.querySelector('[data-find]'),
        q = plain(find.value).trim();
      find.classList.toggle('hidden', config.lower.items.length < 6 && !q);
      const items = config.lower.items.filter(
        (i) => !q || plain(`${i.line1} ${i.line2}`).includes(q),
      );
      const nodes = [];
      if (!groups.length) nodes.push(...items.map(row));
      else
        for (const g of [...groups, { id: NO_GROUP, name: t('Sem grupo') }]) {
          const own = g.id === NO_GROUP,
            members = items.filter((i) => (own ? !i.group : i.group === g.id));
          // Names without a group only get a title when there are some; while searching,
          // only the groups with a name found are shown.
          if (!members.length && (own || q)) continue;
          // Searching opens every group: what was found must be in sight.
          const closed = !q && folded.has(g.id),
            live1 = live.lower.on && members.some((i) => i.id === live.lower.item);
          nodes.push(
            h(
              'div',
              {
                class: 'groupHead' + (closed ? ' closed' : '') + (live1 ? ' on' : ''),
                role: 'button',
                tabindex: '0',
                'aria-expanded': String(!closed),
                title: closed ? 'Clique para abrir o grupo' : 'Clique para minimizar o grupo',
                onclick: () => (fold(g.id, !closed), refresh()),
                onkeydown: (e) =>
                  (e.key === 'Enter' || e.key === ' ') &&
                  (e.preventDefault(), fold(g.id, !closed), refresh()),
              },
              h('i', { class: 'chev' }),
              h('b', { 'data-raw': '' }, g.name),
              h('small', { 'data-raw': '' }, String(members.length)),
              own ? null : mini('✎', 'Mudar o nome do grupo', () => name(g.id)),
              own
                ? null
                : mini(
                    '×',
                    'Remover o grupo (os nomes dele ficam na lista, sem grupo)',
                    () => dropGroup(g),
                    'del',
                  ),
            ),
            ...(closed ? [] : members.map(row)),
            ...(!closed && !members.length ? [empty('Nenhum nome neste grupo ainda.')] : []),
          );
        }
      root
        .querySelector('[data-list]')
        .replaceChildren(
          ...(q && !items.length ? [empty('Nenhum nome com esse texto.')] : []),
          ...nodes,
          ...(config.lower.items.length
            ? []
            : [empty('Nada salvo ainda. Escreva acima e clique em "Salvar na lista".')]),
        );
    },
  };
}

// ---------- QR / PIX ----------
const MISSING = { url: 'Escreva o link do QR Code.', pixkey: 'Escreva a chave PIX desta oferta.' };
/** The QR picture of an offering, for the lists ('' when it has none). */
const offeringQr = (kind, text) =>
  kind === 'giving'
    ? givingQr(config)
    : text
      ? qrUrl(kind === 'pixkey' ? 'pixkey' : 'url', text)
      : '';
function buildCard() {
  let kind = config.card.qr;
  // Each kind of QR has its own title, text and key or link: choosing another kind shows
  // what was written for it, not the texts of the one before.
  const drafts = structuredClone(config.card.drafts);
  const url = input('', 600),
    title = input('Título', 60),
    sub = input('Texto de apoio', 90);
  const seg = h('div', { class: 'seg' });
  const values = () => ({ ...drafts[kind], qr: kind });
  // The miniature: the card itself, drawn by the same page OBS shows, with what is written
  // here (before "Mostrar" too).
  const frame = h('iframe', {
    src: '/overlay?preview=card&thumb=1',
    title: 'Miniatura do cartão',
    tabindex: '-1',
    scrolling: 'no',
  });
  let sent = '';
  const send = (force) => {
    const card = values(),
      key = JSON.stringify(card);
    if (key === sent && !force) return;
    sent = key;
    frame.contentWindow?.postMessage({ type: 'card', card }, location.origin);
  };
  frame.addEventListener('load', () => send(true));
  addEventListener('message', (e) => {
    if (e.source !== frame.contentWindow || e.data?.source !== 'clt-thumb') return;
    // The frame takes the shape of the card: a tall one, a wide one.
    thumb.style.setProperty('--shape', `${e.data.width} / ${e.data.height}`);
    thumb.classList.toggle('tall', e.data.height > e.data.width);
  });
  const change = h('button', {
    class: 'changeQr',
    onclick: () => command('/api/open-settings?page=giving'),
  });
  const thumb = h(
    'div',
    { class: 'cardThumb', title: 'Miniatura: o cartão como vai aparecer na tela' },
    frame,
  );
  const fill = () => {
    const d = drafts[kind];
    title.value = d.title;
    sub.value = d.subtitle;
    url.value = d.qrText;
    url.classList.toggle('hidden', kind === 'giving');
    url.placeholder = t(
      kind === 'pixkey' ? 'Chave PIX desta oferta' : 'Link do QR Code: https://…',
    );
    send();
  };
  for (const [field, name] of [
    [title, 'title'],
    [sub, 'subtitle'],
    [url, 'qrText'],
  ])
    field.addEventListener('input', () => {
      drafts[kind][name] = field.value.trim();
      send();
    });
  const drawSeg = () => {
    // "Another PIX key" only exists while the church receives by PIX.
    if (kind === 'pixkey' && config.giving.method !== 'pix') kind = 'giving';
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
              refresh();
            },
          },
          l,
        ),
      ),
    );
    fill();
  };
  drawSeg();
  const ready = (v) => v.qr === 'giving' || v.qrText || (toast(MISSING[v.qr]), url.focus(), false);
  const apply = async (v) => {
    if (!ready(v)) return;
    const r = await patch({
      'card.title': v.title,
      'card.subtitle': v.subtitle,
      'card.qr': v.qr,
      'card.qrText': v.qrText,
      'card.drafts': drafts,
    });
    if (!r.error) command('/api/live/card/show');
  };
  const show = h(
    'button',
    {
      class: 'primary',
      title: 'Mostra o cartão com o que está escrito acima. Ele fica na tela até ser desligado.',
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
        if (!ready(v)) return;
        patch({
          'card.saved': [...config.card.saved, { id: newId(), ...v }],
          'card.drafts': drafts,
        });
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
        thumb,
        change,
        url,
        h('div', { class: 'pair' }, title, sub),
        h('div', { class: 'actions' }, show, hide, save),
        h(
          'div',
          { class: 'note stays' },
          'O cartão fica na tela até ser desligado: não segue o tempo dos outros elementos.',
        ),
      ),
      listWrap('Ofertas salvas', 'clique: mostrar'),
    ],
    refresh(root) {
      show.textContent = live.card.on ? 'Atualizar no ar' : 'Mostrar';
      hide.classList.toggle('hidden', !live.card.on);
      // The way of receiving changed in the settings: "another PIX key" comes or goes.
      if (seg.dataset.method !== config.giving.method) {
        seg.dataset.method = config.giving.method;
        drawSeg();
      }
      // The picture of the main QR is chosen in the settings: this opens them in the browser.
      const picture = ['image', 'app'].includes(config.giving.method);
      change.classList.toggle('hidden', kind !== 'giving');
      change.textContent = t(picture ? 'Trocar imagem do QR' : 'Mudar o QR principal');
      change.title = t(
        picture
          ? 'Abre as configurações no navegador, na parte da contribuição, para trocar a imagem do QR Code'
          : 'Abre as configurações no navegador, na parte da contribuição: chave PIX, transferência, link ou imagem do QR Code',
      );
      const c = config.card;
      root.querySelector('[data-list]').replaceChildren(
        ...c.saved.map((s) => {
          const on =
            live.card.on &&
            c.title === s.title &&
            c.qr === s.qr &&
            c.qrText === s.qrText &&
            c.subtitle === s.subtitle;
          const picture = offeringQr(s.qr, s.qrText),
            holds = s.qr === 'giving' ? t('Contribuição principal') : s.qrText;
          return h(
            'button',
            {
              class: 'item offering' + (on ? ' on' : ''),
              title: on ? 'No ar: clique para esconder' : 'Clique para mostrar este QR Code',
              onclick: () => {
                if (on) return command('/api/live/card/hide');
                kind = s.qr;
                drafts[kind] = { title: s.title, subtitle: s.subtitle, qrText: s.qrText };
                drawSeg();
                apply(s);
              },
            },
            h('i'),
            picture
              ? h('img', { class: 'qrMini', src: picture, alt: '', loading: 'lazy' })
              : h('span', { class: 'qrMini none' }),
            h(
              'span',
              { class: 'txt', 'data-raw': '' },
              h('b', {}, s.title || s.qrText),
              s.subtitle ? h('small', {}, s.subtitle) : null,
              h('small', { class: 'holds' }, holds),
            ),
            h(
              'span',
              { class: 'tag' },
              s.qr === 'giving' ? givingTag(config) : s.qr === 'pixkey' ? 'PIX' : 'LINK',
            ),
            mini('×', 'Remover da lista', () => drop('card.saved', s), 'del'),
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
            mini('×', 'Remover da lista', () => drop(`${el}.messages`, c.messages[i], i), 'del'),
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
            mini('×', 'Remover da agenda', () => drop('agenda.days', d), 'del'),
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
            mini('×', 'Remover', () => drop('social.items', item), 'del'),
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
            mini('×', 'Remover da lista', () => drop('comment.saved', s), 'del'),
          );
        }),
        ...(c.saved.length
          ? []
          : [empty('Escreva o comentário acima e mostre na hora, ou salve para depois.')]),
      );
    },
  };
}

// ---------- Countdown ----------
const clockText = (ms) => {
  const sec = Math.max(0, Math.ceil(ms / 1000)),
    two = (n) => String(n).padStart(2, '0');
  return sec >= 3600
    ? `${Math.floor(sec / 3600)}:${two(Math.floor((sec % 3600) / 60))}:${two(sec % 60)}`
    : `${two(Math.floor(sec / 60))}:${two(sec % 60)}`;
};
function buildCountdown() {
  const title = input('Texto (ex.: O culto começa em)', 60),
    minutes = h('input', { type: 'number', min: 1, max: 600, step: 1, title: 'Minutos' }),
    time = h('input', { type: 'time', title: 'Horário em que chega a zero' }),
    seg = h('div', { class: 'seg' }),
    left = h('div', { class: 'now' });
  const start = async (set = {}) => {
    const r = await patch({
      'countdown.title': title.value.trim(),
      'countdown.minutes': Math.max(1, Math.round(Number(minutes.value) || 5)),
      ...(time.value ? { 'countdown.time': time.value } : {}),
      ...set,
    });
    // Starting again counts from the beginning.
    if (!r?.error) command('/api/live/countdown/show');
  };
  title.onchange = () => patch({ 'countdown.title': title.value.trim() });
  minutes.onchange = () =>
    patch({ 'countdown.minutes': Math.max(1, Math.round(Number(minutes.value) || 5)) });
  time.onchange = () => time.value && patch({ 'countdown.time': time.value });
  // The time left, also here, while it is on air.
  setInterval(() => {
    if (!live || tab !== 'countdown') return;
    const on = live.countdown.on;
    left.classList.toggle('hidden', !on);
    if (on) left.textContent = `${t('Faltam')} ${clockText(live.countdown.until - Date.now())}`;
  }, 250);
  return {
    pane: [
      h(
        'div',
        { class: 'editor' },
        title,
        seg,
        h('div', { class: 'row countRow' }, minutes, time),
        h(
          'div',
          { class: 'chipsRow', 'data-presets': '' },
          [1, 3, 5, 10, 15, 30].map((m) =>
            h(
              'button',
              {
                title: 'Começa agora uma contagem com estes minutos',
                onclick: () => start({ 'countdown.mode': 'duration', 'countdown.minutes': m }),
              },
              `${m} min`,
            ),
          ),
        ),
        h(
          'div',
          { class: 'actions' },
          h(
            'button',
            {
              class: 'primary',
              title: 'Mostra a contagem na tela, começando agora',
              onclick: () => start(),
            },
            'Iniciar',
          ),
          h('button', { onclick: () => command('/api/live/countdown/hide') }, 'Esconder'),
        ),
        left,
      ),
    ],
    refresh(root) {
      const c = config.countdown;
      if (document.activeElement !== title) title.value = c.title;
      if (document.activeElement !== minutes) minutes.value = c.minutes;
      if (document.activeElement !== time) time.value = c.time;
      const clock = c.mode === 'clock';
      seg.replaceChildren(
        ...[
          ['duration', 'Por minutos'],
          ['clock', 'Até um horário'],
        ].map(([id, label]) =>
          h(
            'button',
            {
              class: c.mode === id ? 'active' : '',
              onclick: () => patch({ 'countdown.mode': id }),
            },
            label,
          ),
        ),
      );
      minutes.classList.toggle('hidden', clock);
      time.classList.toggle('hidden', !clock);
      root.querySelector('[data-presets]').classList.toggle('hidden', clock);
    },
  };
}

// ---------- Order of service ----------
function buildRundown() {
  const go = (action, query = '') => command(`/api/rundown/${action}${query}`);
  return {
    pane: [
      h(
        'div',
        { class: 'rundownBar' },
        h('button', { title: 'Volta um passo', 'data-prev': '', onclick: () => go('prev') }, '‹'),
        h(
          'button',
          {
            class: 'primary',
            'data-next': '',
            title: 'Põe no ar o próximo passo; o anterior sai',
            onclick: () => go('next'),
          },
          h('small', {}, 'Próximo'),
          h('b', { 'data-raw': '' }),
        ),
      ),
      listWrap('Roteiro do culto', 'clique: ir para o passo'),
      h(
        'div',
        { class: 'rundownFoot' },
        h(
          'a',
          {
            href: '#',
            title: 'Tira do ar o que estiver e volta ao começo do roteiro',
            onclick: (e) => (e.preventDefault(), go('restart')),
          },
          'Recomeçar',
        ),
        h(
          'a',
          {
            href: '#',
            title: 'Abre as configurações para montar ou mudar o roteiro',
            onclick: (e) => (e.preventDefault(), command('/api/open-settings?page=rundown')),
          },
          'Editar o roteiro',
        ),
        h(
          'a',
          {
            href: '#',
            title:
              'Tira a aba Roteiro deste painel, para quem não usa. Para voltar: configurações, página "Roteiro do culto".',
            onclick: async (e) => {
              e.preventDefault();
              const r = await patch({ 'enabled.rundown': false });
              if (!r.error)
                toast(
                  'Aba Roteiro escondida. Ela volta nas configurações, em "Roteiro do culto".',
                  () => patch({ 'enabled.rundown': true }),
                );
            },
          },
          'Esconder esta aba',
        ),
      ),
    ],
    refresh(root) {
      const steps = config.rundown,
        at = steps.findIndex((x) => x.id === live.step),
        next = steps[at + 1];
      const label = (step) => stepText(config, step, t) ?? t('(apagado)');
      root.querySelector('[data-prev]').disabled = at < 1;
      const button = root.querySelector('[data-next]');
      button.disabled = !next;
      button.lastElementChild.textContent = next
        ? label(next)
        : steps.length
          ? t('Fim do roteiro')
          : '';
      root.querySelector('[data-list]').replaceChildren(
        ...steps.map((step, i) =>
          h(
            'button',
            {
              class: 'item step' + (i === at ? ' on' : i < at ? ' done' : ''),
              title: 'Clique para pôr este passo no ar',
              onclick: () => go('go', `?id=${step.id}`),
            },
            h('span', { class: 'num', 'data-raw': '' }, String(i + 1)),
            h(
              'span',
              { class: 'txt', 'data-raw': '' },
              h('b', {}, label(step)),
              h(
                'small',
                {},
                [step.kind === 'hide' ? '' : t(STEP_NAMES[step.kind]), step.note]
                  .filter(Boolean)
                  .join(' · '),
              ),
            ),
          ),
        ),
        ...(steps.length
          ? []
          : [
              empty(
                'O roteiro está vazio. Em "Editar o roteiro", coloque em ordem o que vai ao ar no culto: nomes, ofertas, avisos. Depois é um clique em "Próximo" a cada momento.',
              ),
            ]),
      );
    },
  };
}

const BUILD = {
  rundown: buildRundown,
  countdown: buildCountdown,
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
  // The order of service is a tab of its own kind: it runs the others, it is not on air.
  const element = tab !== 'rundown';
  if (!tabs.some(([id]) => id === tab)) tab = tabs[0]?.[0] || '';
  $('#tabs').replaceChildren(
    ...tabs.map(([id, label, title]) =>
      h(
        'button',
        {
          class:
            (id === tab ? 'active ' : '') +
            (live[id]?.on || (id === 'top' && live.bug.on) ? 'on' : ''),
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
  // Another profile is another church or event: the fields start again from its texts.
  if (builtFor !== config.profile) {
    builtFor = config.profile;
    for (const id of Object.keys(built)) delete built[id];
    pane.dataset.tab = '';
  }
  built[tab] ??= BUILD[tab]();
  if (pane.dataset.tab !== tab) {
    pane.dataset.tab = tab;
    pane.replaceChildren(...built[tab].pane);
  }
  built[tab].refresh(pane);
  pane.classList.toggle('onlyExtra', element && !config.enabled[tab]);
  $('.paneBar').classList.toggle('hidden', !element);
  for (const b of pane.querySelectorAll('[data-toggle]'))
    b.classList.toggle('hidden', !config.enabled[b.dataset.toggle]);
  for (const b of pane.querySelectorAll('[data-toggle]'))
    b.classList.toggle('on', !!live[b.dataset.toggle].on);
  renderProfiles();
  // The bar of the tab: is it on air, the switch that shows or hides it, and the pin for what
  // leaves by itself (names, schedule, social, comments).
  const on = element && !!live[tab].on,
    state = $('#paneState'),
    eye = $('#tabEye'),
    pin = $('#tabPin'),
    timed = PINNABLE.includes(tab);
  state.classList.toggle('on', on);
  state.lastChild.textContent = t(on ? 'No ar' : 'Fora do ar');
  // An on/off switch: grey and faded while the element is off the air, red while on.
  eye.classList.toggle('on', on);
  eye.setAttribute('aria-checked', String(on));
  eye.disabled = !element || !config.enabled[tab];
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
$('#tabEye').onclick = () => tab && tab !== 'rundown' && command(`/api/live/${tab}/toggle`);
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

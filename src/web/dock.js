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

// The small panel that lives in an OBS dock: who is on screen, and the three overlays.
let config = null,
  live = null;
document.documentElement.classList.toggle('inObs', !!window.obsstudio);

function applyTheme(t = theme()) {
  $('#themeToggle img').src = t === 'dark' ? '/icons/sun.svg' : '/icons/moon.svg';
}
applyTheme();
$('#themeToggle').onclick = () => applyTheme(toggleTheme());

const command = async (path, options = { method: 'POST' }) => {
  const r = await api(path, options);
  if (r.error) toast(friendly(r.error));
  return r;
};

function render() {
  if (!config || !live) return;
  for (const b of document.querySelectorAll('.toggles button')) {
    const on = !!live[b.dataset.el].on;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
  }
  const s = config.lower.autoHide;
  $('#autoHide').textContent = s ? `some sozinho em ${s} s` : 'clique para mostrar ou esconder';
  const box = $('#items');
  box.replaceChildren(
    ...config.lower.items.map((item) => {
      const on = live.lower.on && live.lower.item === item.id;
      return h(
        'button',
        {
          class: 'item' + (on ? ' on' : ''),
          'aria-pressed': String(on),
          title: on ? 'No ar: clique para esconder' : 'Clique para mostrar na tela',
          onclick: () => command(`/api/live/lower/toggle?item=${item.id}`),
        },
        h('i'),
        h(
          'span',
          { class: 'txt' },
          h('b', {}, item.line1 || item.line2),
          item.line1 && item.line2 ? h('small', {}, item.line2) : null,
        ),
        item.qr !== 'none' ? h('span', { class: 'tag' }, item.qr === 'pix' ? 'PIX' : 'QR') : null,
        h(
          'span',
          {
            class: 'del',
            role: 'button',
            tabindex: '0',
            title: 'Remover da lista',
            onclick: (e) => {
              e.stopPropagation();
              command(`/api/lower/items/${item.id}`, { method: 'DELETE' });
            },
          },
          '×',
        ),
      );
    }),
  );
  if (!config.lower.items.length)
    box.append(
      h('div', { class: 'empty' }, 'Nenhum nome ainda. Adicione abaixo ou nas configurações.'),
    );
}

for (const b of document.querySelectorAll('.toggles button'))
  b.onclick = () => command(`/api/live/${b.dataset.el}/toggle`);
$('#hideAll').onclick = () => command('/api/live/all/hide');
$('#openSettings').onclick = () => command('/api/open-settings');
$('#addForm').onsubmit = async (e) => {
  e.preventDefault();
  const line1 = $('#addLine1').value.trim(),
    line2 = $('#addLine2').value.trim();
  if (!line1 && !line2) return $('#addLine1').focus();
  const r = await command('/api/lower/items', { method: 'POST', body: { line1, line2 } });
  if (r.error) return;
  $('#addLine1').value = $('#addLine2').value = '';
  $('#addLine1').focus();
};

connect((e) => {
  if (e.config) config = e.config;
  if (e.live) live = e.live;
  renderVersion(e.version);
  render();
});

import { fillCss, fontCss, onColor, qrUrl, rgba, shadowCss } from './js/look.js';

// The browser source page. Everything is laid out on a 1920x1080 stage and scaled to the
// source size, so the same settings look the same at 720p, 1080p or 4K.
const stage = document.getElementById('stage');
const params = new URLSearchParams(location.search);
// ?preview=lower: the settings page shows one element, always on, over a sample background.
const preview = params.get('preview');
const roots = Object.fromEntries(
  [...document.querySelectorAll('.el')].map((e) => [e.dataset.el, e]),
);
const $ = (el, sel) => roots[el].querySelector(sel);
let config = null,
  live = null,
  pixStamp = '';
const shown = { lower: {}, top: {}, card: {}, bug: {} };

function fit() {
  const s = Math.min(innerWidth / 1920, innerHeight / 1080) || 1;
  stage.style.transform = `scale(${s})`;
}
addEventListener('resize', fit);
fit();
if (preview) document.documentElement.classList.add('preview');

const setVars = (node, vars) => {
  for (const [k, v] of Object.entries(vars)) node.style.setProperty('--' + k, v);
};
function setImage(img, src) {
  if (img.getAttribute('src') !== src)
    src ? img.setAttribute('src', src) : img.removeAttribute('src');
}
const font = (c) => fontCss(c.font || config.brand.font);
// Elements enter from the edge they sit on.
const from = { left: [-1, 0], right: [1, 0], center: [0, 1], top: [0, -1], bottom: [0, 1] };
function common(el, c, side) {
  const root = roots[el];
  root.dataset.anim = c.animation;
  const [sx, sy] = from[side];
  setVars(root, {
    dur: c.duration + 'ms',
    sx,
    sy,
    scale: (c.size ?? 100) / 100,
    font: font(c),
    shadow: shadowCss(c.shadow, c.shadowStrength, c.accent?.a || '#ffffff'),
    radius: (c.radius ?? 0) + 'px',
  });
}

// ---- Lower third ----
function lowerItem() {
  const items = config.lower.items;
  if (preview === 'lower') return items.find((i) => i.id === params.get('item')) || items[0];
  return items.find((i) => i.id === live.lower.item);
}
function renderLower() {
  const c = config.lower,
    item = lowerItem(),
    root = roots.lower,
    box = $('lower', '.box');
  root.dataset.template = c.template;
  root.dataset.pos = c.position;
  common('lower', c, c.template === 'news' ? 'bottom' : c.position);
  setVars(root, {
    fill: fillCss(c.fill, c.opacity),
    fill2: fillCss(c.fill2, c.opacity),
    'fill-soft': fillCss(c.fill, c.opacity * 0.72),
    'fill2-soft': fillCss(c.fill2, c.opacity * 0.72),
    accent: fillCss(c.accent),
    'accent-a': c.accent.a,
    'on-accent': onColor(c.accent.type === 'gradient' ? c.accent.b : c.accent.a),
    'accent-glow': rgba(c.accent.a, 0.55),
    t1: c.text1,
    t2: c.text2,
    w1: c.weight1,
    w2: c.weight2,
    case: c.uppercase ? 'uppercase' : 'none',
    mx: c.marginX + 'px',
    my: c.marginY + 'px',
  });
  if (!item) return '';
  const logo = item.logo && config.brand.logo,
    qr =
      item.qr === 'pix'
        ? qrUrl('pix', '', { stamp: pixStamp })
        : item.qr === 'url' && item.qrText
          ? qrUrl('url', item.qrText)
          : '';
  $('lower', '.l1 span').textContent = item.line1;
  $('lower', '.l2 span').textContent = item.line2;
  $('lower', '.side').textContent = config.brand.name;
  setImage($('lower', '.logo img'), logo || '');
  setImage($('lower', '.qr img'), qr);
  box.classList.toggle('has-logo', !!logo);
  box.classList.toggle('has-qr', !!qr);
  box.classList.toggle('no-l1', !item.line1);
  box.classList.toggle('no-l2', !item.line2);
  return [item.id, item.line1, item.line2, item.logo, item.qr, item.qrText].join('|');
}

// ---- Top bar ----
let messageIndex = -1,
  messageTimer = 0,
  messageKey = '';
function nextMessage(first = false) {
  const c = config.top,
    span = $('top', '.msg span'),
    list = c.showMessages ? c.messages : [];
  if (!list.length) return void (span.textContent = '');
  if (c.order === 'random' && list.length > 1) {
    let n;
    do n = Math.floor(Math.random() * list.length);
    while (n === messageIndex);
    messageIndex = n;
  } else messageIndex = (messageIndex + 1) % list.length;
  const put = () => {
    span.textContent = list[messageIndex];
    // Long sentences shrink to fit instead of being cut.
    span.style.fontSize = '';
    const room = span.parentElement.clientWidth;
    if (room && span.scrollWidth > room)
      span.style.fontSize = Math.max(0.55, room / span.scrollWidth) + 'em';
  };
  if (first || list.length === 1) return put();
  span.classList.add('swap');
  setTimeout(() => {
    put();
    span.classList.remove('swap');
  }, 380);
}
function tick() {
  if (!config) return;
  const c = config.top,
    now = new Date();
  $('top', '.time').textContent = now.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: c.clockSeconds ? '2-digit' : undefined,
    hour12: c.clock12h,
  });
  $('top', '.date').textContent = now
    .toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
    .replace(/\./g, '');
}
setInterval(tick, 1000);
function renderTop() {
  const c = config.top,
    root = roots.top,
    box = $('top', '.box');
  root.dataset.template = c.template;
  common('top', c, 'top');
  setVars(root, {
    fill: fillCss(c.fill, c.opacity),
    accent: fillCss(c.accent),
    'accent-a': c.accent.a,
    'on-accent': onColor(c.accent.type === 'gradient' ? c.accent.b : c.accent.a),
    t1: c.text,
    t2: c.text2,
    w1: c.weight,
    margin: c.margin + 'px',
  });
  const logo = c.showLogo && config.brand.logo,
    qr = !c.showQr
      ? ''
      : c.qr === 'pix'
        ? qrUrl('pix', '', { stamp: pixStamp })
        : c.qrText
          ? qrUrl('url', c.qrText)
          : '';
  setImage($('top', '.logo img'), logo || '');
  setImage($('top', '.qr img'), qr);
  $('top', '.name').textContent = c.showName ? config.brand.name : '';
  box.classList.toggle('has-logo', !!logo);
  box.classList.toggle('has-name', c.showName && !!config.brand.name);
  box.classList.toggle('has-brand', !!logo || (c.showName && !!config.brand.name));
  box.classList.toggle('has-clock', c.showClock);
  box.classList.toggle('has-date', c.showClock && c.showDate);
  box.classList.toggle('has-msg', c.showMessages && c.messages.length > 0);
  box.classList.toggle('has-qr', !!qr);
  tick();
  const key = JSON.stringify([c.showMessages, c.messages, c.order, c.interval, c.template]);
  if (key !== messageKey) {
    messageKey = key;
    messageIndex = -1;
    clearInterval(messageTimer);
    nextMessage(true);
    messageTimer = setInterval(nextMessage, c.interval * 1000);
  }
  return 'top';
}

// ---- QR card ----
function renderCard() {
  const c = config.card,
    root = roots.card,
    box = $('card', '.box');
  root.dataset.template = c.template;
  root.dataset.pos = c.position;
  const side = c.position.endsWith('left')
    ? 'left'
    : c.position.endsWith('right')
      ? 'right'
      : 'center';
  common('card', c, side);
  setVars(root, {
    fill: fillCss(c.fill, c.opacity),
    accent: fillCss(c.accent),
    'accent-a': c.accent.a,
    'on-accent': onColor(c.accent.type === 'gradient' ? c.accent.b : c.accent.a),
    'fill-solid': rgba(c.fill.a, c.opacity / 100),
    t1: c.text,
    t2: c.text2,
    w1: c.weight,
    mx: c.marginX + 'px',
    my: c.marginY + 'px',
  });
  const pix = config.pix,
    logo = c.showLogo && config.brand.logo,
    qr =
      c.qr === 'pix'
        ? qrUrl('pix', '', { round: c.qrRound, stamp: pixStamp })
        : c.qrText
          ? qrUrl('url', c.qrText, { round: c.qrRound })
          : '',
    key = !c.showKey
      ? ''
      : c.qr === 'pix'
        ? pix.display || (pix.mode === 'key' ? pix.key : '')
        : c.qrText.replace(/^https?:\/\//, '');
  for (const t of root.querySelectorAll('.title, .title2')) t.textContent = c.title;
  $('card', '.sub').textContent = c.subtitle;
  $('card', '.key').textContent = key;
  setImage($('card', '.logo img'), logo || '');
  setImage($('card', '.qrw img'), qr);
  box.classList.toggle('has-logo', !!logo);
  box.classList.toggle('has-title', !!c.title);
  box.classList.toggle('has-sub', !!c.subtitle);
  box.classList.toggle('has-key', !!key);
  box.classList.toggle('has-qr', !!qr);
  return 'card';
}

// ---- Logo ----
function renderBug() {
  const c = config.bug,
    root = roots.bug;
  root.dataset.pos = c.position;
  common('bug', c, c.position.endsWith('left') ? 'left' : 'right');
  setVars(root, {
    w: c.size + 'px',
    alpha: c.opacity / 100,
    mx: c.marginX + 'px',
    my: c.marginY + 'px',
  });
  setImage($('bug', 'img'), config.brand.logo);
  return config.brand.logo ? 'bug' : '';
}

const render = { lower: renderLower, top: renderTop, card: renderCard, bug: renderBug };
const wanted = (el) => (preview ? preview === el : !!live[el].on);

/** Brings one element to the state asked: in, out, or out-and-in when its content changed. */
function sync(el) {
  const s = shown[el],
    root = roots[el];
  if (s.busy) return void (s.again = true);
  const want = wanted(el);
  // While it is hidden nothing is drawn; while it is on air, look changes apply at once
  // and only a different name leaves and comes back.
  const key = want || s.on ? render[el]() : '';
  if (s.on && (!want || !key || key !== s.key)) {
    root.classList.remove('in');
    root.classList.add('out');
    s.busy = true;
    setTimeout(
      () => {
        root.classList.remove('out');
        s.on = s.busy = false;
        s.key = '';
        sync(el);
      },
      config[el].duration * 0.75 + 60,
    );
  } else if (!s.on && want && key) {
    s.key = key;
    void root.offsetWidth; // restart the animation
    root.classList.add('in');
    s.on = true;
  }
  if (s.again) {
    s.again = false;
    sync(el);
  }
}
function apply() {
  if (!config || !live) return;
  for (const el of Object.keys(roots)) sync(el);
}
function replay(el) {
  const s = shown[el];
  if (!s.on || s.busy) return;
  s.key = 'replay';
  sync(el);
}
addEventListener('message', (e) => {
  if (e.origin === location.origin && e.data?.type === 'replay' && roots[e.data.el])
    replay(e.data.el);
});

function connect() {
  const ws = new WebSocket(`ws://${location.host}/ws`);
  ws.onmessage = (m) => {
    const e = JSON.parse(m.data);
    if (e.config) {
      const pix = JSON.stringify(e.config.pix);
      if (config && pix !== JSON.stringify(config.pix)) pixStamp = String(Date.now());
      config = e.config;
    }
    if (e.live) live = e.live;
    apply();
  };
  ws.onclose = () => setTimeout(connect, 1500);
  ws.onerror = () => ws.close();
}
connect();

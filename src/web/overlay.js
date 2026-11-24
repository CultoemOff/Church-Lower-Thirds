import {
  decorFor,
  decorName,
  fillCss,
  fontCss,
  givingQr,
  givingText,
  onColor,
  qrInk,
  qrUrl,
  rgba,
  shadowCss,
  SOCIAL_ICONS,
  themed,
} from './js/look.js';
import { applyModel, MODELS } from './js/models.js';

// The browser source page. Everything is laid out on a 1920x1080 stage (1080x1920 with
// ?layout=vertical) and scaled to the source size, so the same settings look the same at
// 720p, 1080p or 4K.
const stage = document.getElementById('stage');
const params = new URLSearchParams(location.search);
// ?preview=lower: the settings page shows one element, always on, over a sample background.
const preview = params.get('preview');
// ?only=lower (or lower,card): one OBS source per element; without it, every element.
// /source/names, /source/badge… are the same thing with the names of the source files.
const SLUGS = {
  all: '',
  names: 'lower',
  badge: 'top',
  ticker: 'ticker',
  'qr-card': 'card',
  schedule: 'agenda',
  social: 'social',
  logo: 'bug',
};
const slug = location.pathname.match(/^\/source\/([\w-]+)/)?.[1];
const only = (slug ? SLUGS[slug] : params.get('only'))?.split(',').filter(Boolean);
const vertical = params.get('layout') === 'vertical';
// ?preview=model&model=<id>: the small picture of a ready-made model in the settings. The
// saved settings are drawn with that model put on, on a smaller stage so that the
// elements, at their real size, can be told apart in a small frame.
const shot =
  preview === 'model' ? MODELS.find((m) => m.id === params.get('model')) || MODELS[0] : null;
const W = shot ? 1440 : vertical ? 1080 : 1920,
  H = shot ? 810 : vertical ? 1920 : 1080;
// Several elements shown together, to judge a whole look.
const together = preview === 'theme' || !!shot;
// ?edit=1: the settings page's layout editor. Everything is shown, still, and can be
// dragged to a new place or resized by its corner.
const edit = params.get('edit') === '1';
const roots = Object.fromEntries(
  [...document.querySelectorAll('.el')].map((e) => [e.dataset.el, e]),
);
const $ = (el, sel) => roots[el].querySelector(sel);
let config = null,
  live = null,
  givingStamp = '';
const shown = { lower: {}, top: {}, card: {}, bug: {}, ticker: {}, agenda: {}, social: {} };

function fit() {
  const s = Math.min(innerWidth / W, innerHeight / H) || 1;
  stage.style.transform = `scale(${s})`;
}
addEventListener('resize', fit);
fit();
if (preview) document.documentElement.classList.add('preview');
if (shot) document.documentElement.classList.add('compact');
if (edit) document.documentElement.classList.add('edit');
if (vertical) document.documentElement.classList.add('vertical');

const setVars = (node, vars) => {
  for (const [k, v] of Object.entries(vars)) node.style.setProperty('--' + k, v);
};
function setImage(img, src) {
  if (img.getAttribute('src') !== src)
    src ? img.setAttribute('src', src) : img.removeAttribute('src');
}
// In the previews of the settings, a QR that cannot be made yet (the church has not filled
// in how it receives) shows a sample one, so the layout can still be judged. On air an
// incomplete QR stays empty: nothing wrong is ever broadcast.
const SAMPLE_QR = qrUrl('url', 'https://example.org');
if (preview)
  for (const img of document.querySelectorAll('.card .qrw img, .lower .qr img'))
    img.addEventListener('error', () => {
      if (img.getAttribute('src') !== SAMPLE_QR) img.setAttribute('src', SAMPLE_QR);
    });
const font = (c) => fontCss(c.font || config.brand.font);
// Elements enter from the edge they sit on.
const from = { left: [-1, 0], right: [1, 0], center: [0, 1], top: [0, -1], bottom: [0, 1] };
function common(el, c, side) {
  const root = roots[el];
  root.dataset.anim = c.animation;
  // Ministry models bring a drawing (flowers, stars…); the others leave it empty.
  const deco = root.querySelector('.deco'),
    art = `${c.template}|${config.theme.decor}`;
  if (deco && deco.dataset.art !== art) {
    deco.dataset.art = art;
    deco.innerHTML = decorFor(config, el, c.template);
    // Some drawings have their own place on the element (CSS).
    root.dataset.decor = decorName(config, c.template);
  }
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
  if (c.fill) root.style.setProperty('--fill-glass', fillCss(c.fill, (c.opacity ?? 100) * 0.3));
  place(el);
}

/** Dragged elements sit where they were dropped; the others follow their "place" setting. */
const FULL_WIDTH = { lower: ['news'], agenda: ['banner', 'center'] };
const canMove = (el) => 'free' in config[el] && !FULL_WIDTH[el]?.includes(config[el].template);
function place(el) {
  const c = config[el],
    root = roots[el],
    // The picture of a model has its own stage: places chosen by dragging do not fit it.
    on = !shot && canMove(el) && (vertical ? c.vfree : c.free);
  root.toggleAttribute('data-free', on);
  if (on) setVars(root, { fx: (vertical ? c.vx : c.x) + 'px', fy: (vertical ? c.vy : c.y) + 'px' });
}

// ---- Lower third ----
function lowerItem() {
  const items = config.lower.items;
  const quick = config.lower.quick;
  if (preview === 'lower' || together || edit)
    return items.find((i) => i.id === params.get('item')) || items[0] || quick;
  return live.lower.item === 'quick' ? quick : items.find((i) => i.id === live.lower.item);
}
function renderLower() {
  const c = themed(config, 'lower'),
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
      item.qr === 'giving'
        ? givingQr(config, { stamp: givingStamp })
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

// ---- Corner badge: logo, name, message, "AO VIVO", time ----
let messageIndex = -1,
  messageTimer = 0,
  messageKey = '';
const topMessages = () => {
  const c = themed(config, 'top');
  return c.pinned ? [c.pinned] : c.showMessages ? c.messages : [];
};
function nextMessage(first = false) {
  const c = themed(config, 'top'),
    span = $('top', '.msg span'),
    list = topMessages();
  if (!list.length) return void (span.textContent = '');
  if (c.order === 'random' && list.length > 1) {
    let n;
    do n = Math.floor(Math.random() * list.length);
    while (n === messageIndex);
    messageIndex = n;
  } else messageIndex = (messageIndex + 1) % list.length;
  const put = () => (span.textContent = list[messageIndex]);
  if (first === true || list.length === 1) return put();
  span.classList.add('swap');
  setTimeout(() => {
    put();
    span.classList.remove('swap');
  }, 380);
}
const LOCALES = { 'pt-BR': 'pt-BR', 'pt-PT': 'pt-PT', es: 'es', en: 'en-US', it: 'it', de: 'de' };
const locale = () => LOCALES[config.language] || navigator.language || 'pt-BR';
function tick() {
  if (!config) return;
  const c = themed(config, 'top'),
    now = new Date(),
    time = (seconds) =>
      now.toLocaleTimeString(locale(), {
        hour: '2-digit',
        minute: '2-digit',
        second: seconds ? '2-digit' : undefined,
        hour12: c.clock12h,
      });
  $('top', '.time').textContent = time(c.clockSeconds);
  $('ticker', '.time').textContent = time(false);
  $('top', '.date').textContent = now
    .toLocaleDateString(locale(), { weekday: 'short', day: '2-digit', month: 'short' })
    .replace(/\./g, '');
}
setInterval(tick, 1000);
function renderTop() {
  const c = themed(config, 'top'),
    root = roots.top,
    box = $('top', '.box');
  root.dataset.template = c.template;
  root.dataset.pos = c.position;
  common('top', c, sideOf(c.position));
  setVars(root, {
    fill: fillCss(c.fill, c.opacity),
    accent: fillCss(c.accent),
    'accent-a': c.accent.a,
    'on-accent': onColor(c.accent.type === 'gradient' ? c.accent.b : c.accent.a),
    t1: c.text,
    t2: c.text2,
    w1: c.weight,
    mx: c.marginX + 'px',
    my: c.marginY + 'px',
  });
  const logo = c.showLogo && config.brand.logo,
    name = c.showName ? config.brand.name : '',
    messages = topMessages();
  setImage($('top', '.logo img'), logo || '');
  $('top', '.name').textContent = name;
  $('top', '.live b').textContent = c.liveText;
  box.classList.toggle('has-logo', !!logo);
  box.classList.toggle('has-name', !!name);
  box.classList.toggle('has-msg', messages.length > 0);
  box.classList.toggle('has-live', c.showLive && !!c.liveText);
  box.classList.toggle('has-clock', c.showClock);
  box.classList.toggle('has-date', c.showClock && c.showDate);
  tick();
  const key = JSON.stringify([messages, c.order, c.interval]);
  if (key !== messageKey) {
    messageKey = key;
    messageIndex = -1;
    clearInterval(messageTimer);
    nextMessage(true);
    messageTimer = setInterval(nextMessage, c.interval * 1000);
  }
  return logo || name || messages.length || (c.showLive && c.liveText) || c.showClock ? 'top' : '';
}

// ---- QR card ----
function renderCard() {
  const c = themed(config, 'card'),
    root = roots.card,
    box = $('card', '.box');
  root.dataset.template = c.template;
  // In the theme preview several elements show together: the card moves out of the way.
  root.dataset.pos = shot ? 'top-right' : together ? 'center-right' : c.position;
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
  // The plaque draws the QR code in the dark color of the card itself.
  const ink = c.template === 'plaque' ? qrInk(c.fill.a) : '';
  const logo = c.showLogo && config.brand.logo,
    qr =
      c.qr === 'giving'
        ? givingQr(config, { round: c.qrRound, stamp: givingStamp, dark: ink })
        : c.qrText
          ? qrUrl('url', c.qrText, { round: c.qrRound, dark: ink })
          : '',
    key = !c.showKey
      ? ''
      : c.qr === 'giving'
        ? givingText(config)
        : c.qrText.replace(/^https?:\/\//, '');
  for (const t of root.querySelectorAll('.title, .title2')) t.textContent = c.title;
  $('card', '.sub').textContent = c.subtitle;
  $('card', '.key').textContent = key;
  $('card', '.key').classList.toggle('multi', key.includes('\n'));
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

// ---- Bottom bar: text that scrolls all the time ----
let tickerKey = '';
function renderTicker() {
  const c = themed(config, 'ticker'),
    root = roots.ticker,
    box = $('ticker', '.box');
  root.dataset.template = c.template;
  common('ticker', c, 'bottom');
  setVars(root, {
    fill: fillCss(c.fill, c.opacity),
    'fill-soft': fillCss(c.fill, c.opacity * 0.35),
    accent: fillCss(c.accent),
    'accent-a': c.accent.a,
    'on-accent': onColor(c.accent.type === 'gradient' ? c.accent.b : c.accent.a),
    t1: c.text,
    w1: c.weight,
    margin: c.margin + 'px',
  });
  const logo = c.showLogo && config.brand.logo;
  setImage($('ticker', '.logo img'), logo || '');
  $('ticker', '.label').textContent = c.label;
  box.classList.toggle('has-logo', !!logo);
  box.classList.toggle('has-label', c.showLabel && !!c.label);
  box.classList.toggle('has-clock', c.showClock);
  const list = c.pinned ? [c.pinned] : c.messages;
  const key = JSON.stringify([
    list,
    c.separator,
    c.speed,
    c.size,
    c.template,
    c.font,
    config.brand.font,
    c.weight,
    c.showLabel,
    c.label,
    c.showLogo,
    c.showClock,
  ]);
  if (key !== tickerKey) {
    tickerKey = key;
    const run = $('ticker', '.run');
    const one = () =>
      list.flatMap((t) => {
        const m = document.createElement('span');
        m.textContent = t;
        const sep = document.createElement('i');
        sep.textContent = c.separator || '•';
        return [m, sep];
      });
    run.style.animation = 'none';
    run.replaceChildren(...one());
    // Repeat the messages until they are wider than the screen, then once more: the
    // strip moves left by exactly one half and starts over, with no visible jump.
    requestAnimationFrame(() => {
      const width = run.scrollWidth || 1,
        times = Math.max(1, Math.ceil(2000 / width));
      const half = [];
      for (let i = 0; i < times; i++) half.push(...one());
      run.replaceChildren(...half, ...half.map((n) => n.cloneNode(true)));
      run.style.animation = list.length
        ? `ticker ${(width * times) / c.speed}s linear infinite`
        : 'none';
    });
  }
  return list.length ? 'ticker' : '';
}
/** Names and whatever sits at the bottom move up while the bottom bar is on. */
function lift() {
  const on = roots.ticker.classList.contains('in');
  const h = on
    ? ($('ticker', '.box').offsetHeight + 14) * (config.ticker.size / 100) +
      (roots.ticker.dataset.template === 'full' ? 0 : config.ticker.margin)
    : 0;
  stage.style.setProperty('--lift', Math.round(h) + 'px');
}

// ---- Agenda: one day at a time, fading to the next ----
let agendaIndex = 0,
  agendaTimer = 0;
function showDay() {
  const days = config.agenda.days,
    d = days[agendaIndex % days.length];
  if (!d) return;
  $('agenda', '.dname').textContent = d.day;
  $('agenda', '.dlines').replaceChildren(
    ...d.lines
      .split('\n')
      .map((l) => Object.assign(document.createElement('div'), { textContent: l })),
  );
  [...roots.agenda.querySelectorAll('.dots i')].forEach((dot, i) =>
    dot.classList.toggle('on', i === agendaIndex % days.length),
  );
}
function startAgenda() {
  clearInterval(agendaTimer);
  agendaIndex = 0;
  showDay();
  const day = $('agenda', '.day');
  agendaTimer = setInterval(() => {
    const days = config.agenda.days;
    // On air the server hides it after the last day; the preview keeps going round.
    if (agendaIndex + 1 >= days.length && !config.agenda.loop && !preview)
      return clearInterval(agendaTimer);
    day.classList.add('swap');
    setTimeout(() => {
      agendaIndex = (agendaIndex + 1) % days.length;
      showDay();
      day.classList.remove('swap');
    }, 450);
  }, config.agenda.seconds * 1000);
}
const sideOf = (pos) =>
  pos.endsWith('left')
    ? 'left'
    : pos.endsWith('right')
      ? 'right'
      : pos.startsWith('top')
        ? 'top'
        : 'bottom';
function renderAgenda() {
  const c = themed(config, 'agenda'),
    root = roots.agenda;
  root.dataset.template = c.template;
  root.dataset.pos =
    c.template === 'banner' ? 'bottom-center' : c.template === 'center' ? 'center' : c.position;
  common('agenda', c, c.template === 'banner' ? 'bottom' : sideOf(c.position));
  setVars(root, {
    fill: fillCss(c.fill, c.opacity),
    'fill-soft': fillCss(c.fill, c.opacity * 0.35),
    accent: fillCss(c.accent),
    'accent-a': c.accent.a,
    'on-accent': onColor(c.accent.type === 'gradient' ? c.accent.b : c.accent.a),
    t1: c.text,
    t2: c.text2,
    w1: c.weight,
    mx: c.marginX + 'px',
    my: c.marginY + 'px',
  });
  const logo = c.showLogo && config.brand.logo;
  setImage($('agenda', '.logo img'), logo || '');
  $('agenda', '.title').textContent = c.title;
  $('agenda', '.box').classList.toggle('has-logo', !!logo);
  const dots = $('agenda', '.dots');
  if (dots.children.length !== c.days.length)
    dots.replaceChildren(...c.days.map(() => document.createElement('i')));
  showDay();
  return c.days.length ? JSON.stringify([c.days, c.seconds, c.loop]) : '';
}

// ---- Social networks ----
// One item, or all of them in sequence ("all"): each stays a few seconds, with a counter and
// a line that fills up as its time runs.
const ALL = 'all';
let socialIndex = 0,
  socialTimer;
function socialList(c) {
  const picked = preview === 'social' || edit ? params.get('item') : live.social.item;
  // In the settings preview the "plaque" model shows what it was made for: the sequence.
  const all = picked === ALL || (!picked && preview === 'social' && c.template === 'plaque');
  if (all) return { all: c.items.length > 1, items: c.items };
  const one =
    c.items.find((i) => i.id === picked) || (preview === 'social' || edit ? c.items[0] : null);
  return { all: false, items: one ? [one] : [] };
}
function showSocial() {
  const c = themed(config, 'social'),
    { all, items } = socialList(c),
    item = items[socialIndex % (items.length || 1)];
  if (!item) return;
  const icon = $('social', '.icon');
  const key = [item.network, item.icon].join('|');
  if (icon.dataset.key !== key) {
    icon.dataset.key = key;
    if (item.icon) icon.replaceChildren(Object.assign(new Image(), { src: item.icon, alt: '' }));
    else icon.innerHTML = SOCIAL_ICONS[item.network] || SOCIAL_ICONS.other;
  }
  $('social', '.prefix').textContent =
    item.text || [c.prefix, item.label].filter(Boolean).join(' ');
  $('social', '.handle').textContent = item.handle;
  const two = (n) => String(n).padStart(2, '0');
  $('social', '.count b').textContent = two((socialIndex % items.length) + 1);
  $('social', '.count i').textContent = `/ ${two(items.length)}`;
  // The time line starts over with each item.
  const line = $('social', '.progress i');
  line.style.animation = 'none';
  void line.offsetWidth;
  line.style.animation = all ? `social-progress ${c.seconds}s linear forwards` : 'none';
}
function startSocial() {
  clearInterval(socialTimer);
  socialIndex = 0;
  showSocial();
  const c = config.social;
  if (!socialList(c).all) return;
  const box = $('social', '.box');
  socialTimer = setInterval(() => {
    const list = socialList(config.social);
    if (!shown.social.on || !list.all) return clearInterval(socialTimer);
    box.classList.add('swap');
    setTimeout(() => {
      socialIndex = (socialIndex + 1) % list.items.length;
      showSocial();
      box.classList.remove('swap');
    }, 450);
  }, c.seconds * 1000);
}
function renderSocial() {
  const c = themed(config, 'social'),
    root = roots.social,
    { all, items } = socialList(c);
  root.dataset.template = c.template;
  root.dataset.pos = c.position;
  common('social', c, sideOf(c.position));
  setVars(root, {
    fill: fillCss(c.fill, c.opacity),
    'fill-soft': fillCss(c.fill, c.opacity * 0.35),
    accent: fillCss(c.accent),
    'accent-a': c.accent.a,
    'on-accent': onColor(c.accent.type === 'gradient' ? c.accent.b : c.accent.a),
    t1: c.text,
    t2: c.text2,
    w1: c.weight,
    mx: c.marginX + 'px',
    my: c.marginY + 'px',
  });
  const box = $('social', '.box');
  box.classList.toggle('has-count', all && c.counter);
  box.classList.toggle('has-progress', all && c.progress);
  if (!items.length) return '';
  // While it is on air, a change in the texts shows at once; only a different choice (or
  // another pace) makes it leave and come back.
  if (shown.social.on) showSocial();
  return all
    ? JSON.stringify([ALL, items.map((i) => i.id), c.seconds])
    : [
        items[0].id,
        items[0].network,
        items[0].label,
        items[0].handle,
        items[0].text,
        items[0].icon,
        c.prefix,
      ].join('|');
}

const render = {
  lower: renderLower,
  top: renderTop,
  card: renderCard,
  bug: renderBug,
  ticker: renderTicker,
  agenda: renderAgenda,
  social: renderSocial,
};
const onShow = { agenda: startAgenda, social: startSocial };
const wanted = (el) => {
  if (only?.length && !only.includes(el)) return false;
  if (edit) return true;
  // ?preview=theme: the main elements together, to judge the global look.
  if (together) return ['lower', 'top', 'ticker', 'card'].includes(el);
  return preview ? preview === el : !!live[el].on;
};

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
    onShow[el]?.();
  }
  if (el === 'ticker') lift();
  if (s.again) {
    s.again = false;
    sync(el);
  }
}
function apply() {
  if (!config || !live) return;
  for (const el of Object.keys(roots)) {
    sync(el);
    if (edit) roots[el].classList.toggle('fixed', !canMove(el));
  }
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

// ---- Layout editor: drag to move, drag the corner to resize ----
const SIZE_LIMITS = { bug: [40, 500] };
function enableEdit() {
  const tell = (message) => parent.postMessage({ source: 'clt-edit', ...message }, location.origin);
  for (const [el, root] of Object.entries(roots)) {
    const scaler = root.querySelector('.scaler');
    const handle = document.createElement('div');
    handle.className = 'editHandle';
    scaler.append(handle);
    const spot = () => {
      const s = stage.getBoundingClientRect(),
        r = scaler.getBoundingClientRect(),
        k = s.width / W;
      return { k, x: (r.left - s.left) / k, y: (r.top - s.top) / k, w: r.width / k };
    };
    scaler.addEventListener('pointerdown', (down) => {
      if (!config || !canMove(el)) return;
      down.preventDefault();
      scaler.setPointerCapture(down.pointerId);
      const start = spot(),
        resizing = down.target === handle,
        size0 = config[el].size ?? 100,
        [min, max] = SIZE_LIMITS[el] || [40, 250];
      // From here on the element is placed by its top-left corner, where it is now.
      let x = Math.round(start.x),
        y = Math.round(start.y),
        size = size0;
      root.setAttribute('data-free', '');
      setVars(root, { fx: x + 'px', fy: y + 'px' });
      root.classList.add('dragging');
      const move = (e) => {
        const dx = (e.clientX - down.clientX) / start.k,
          dy = (e.clientY - down.clientY) / start.k;
        if (resizing) {
          size = Math.round(Math.min(max, Math.max(min, (size0 * (start.w + dx)) / start.w)));
          if (el === 'bug') root.style.setProperty('--w', size + 'px');
          else root.style.setProperty('--scale', size / 100);
        } else {
          x = Math.round(Math.min(W - 40, Math.max(-300, start.x + dx)));
          y = Math.round(Math.min(H - 40, Math.max(-200, start.y + dy)));
          setVars(root, { fx: x + 'px', fy: y + 'px' });
        }
      };
      const up = () => {
        scaler.removeEventListener('pointermove', move);
        root.classList.remove('dragging');
        tell({ type: 'place', el, x, y, size, vertical });
      };
      scaler.addEventListener('pointermove', move);
      scaler.addEventListener('pointerup', up, { once: true });
      scaler.addEventListener('pointercancel', up, { once: true });
    });
  }
}
if (edit) enableEdit();

function connect() {
  const ws = new WebSocket(`ws://${location.host}/ws`);
  ws.onmessage = (m) => {
    const e = JSON.parse(m.data);
    if (e.config) {
      const giving = (c) => JSON.stringify([c.pix, c.giving]);
      if (config && giving(e.config) !== giving(config)) givingStamp = String(Date.now());
      config = e.config;
      if (shot) applyModel(config, shot);
    }
    if (e.live) live = e.live;
    apply();
  };
  ws.onclose = () => setTimeout(connect, 1500);
  ws.onerror = () => ws.close();
}
connect();

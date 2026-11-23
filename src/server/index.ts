import express, { type Request, type Response } from 'express';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { appDataDir } from './paths.js';
import { installedFonts } from './fonts.js';
import { pixPayload, validPixPayload } from './pix.js';
import { qrSvg } from './qr.js';
import {
  cleanConfig,
  cleanLive,
  ELEMENTS,
  liveDefaults,
  newId,
  resolveItem,
  resolveSocial,
  type Config,
  type ElementName,
  type Live,
} from './store.js';

const here = dirname(fileURLToPath(import.meta.url));
const appVersion: string = (() => {
  for (const p of [join(here, '..', '..', 'package.json'), join(here, '..', 'package.json')])
    try {
      return JSON.parse(readFileSync(p, 'utf8')).version;
    } catch {
      // try the next location (source tree vs. packaged app)
    }
  return '0.0.0';
})();
const webDir = [join(here, '..', 'web'), join(here, 'web')].find((d) => existsSync(d))!;
const dataDir = process.env.LTW_DATA_DIR || appDataDir();
const mediaDir = join(dataDir, 'media');
const configFile = join(dataDir, 'config.json');
const port = Number(process.env.PORT) || 8795;
const baseUrl = `http://127.0.0.1:${port}`;

let config: Config = cleanConfig({});
let live: Live = liveDefaults();

async function loadStore() {
  await mkdir(mediaDir, { recursive: true });
  try {
    const saved = JSON.parse(await readFile(configFile, 'utf8'));
    config = cleanConfig(saved.config);
    // The bars and the logo come back as they were; names and the QR card start hidden.
    live = cleanLive(
      { top: saved.live?.top, bug: saved.live?.bug, ticker: saved.live?.ticker },
      config,
    );
  } catch {
    // first run, or an unreadable file: start from the defaults
  }
}
let saving: Promise<void> = Promise.resolve();
function saveStore() {
  saving = saving
    .catch(() => {})
    .then(async () => {
      const tmp = configFile + '.tmp';
      await writeFile(tmp, JSON.stringify({ version: appVersion, config, live }, null, 2));
      await rename(tmp, configFile);
    });
  return saving;
}

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
const send = (message: object) => {
  const text = JSON.stringify(message);
  for (const ws of wss.clients) if (ws.readyState === ws.OPEN) ws.send(text);
};
const state = () => ({ type: 'state', version: appVersion, config, live });
const sendConfig = (origin = '') => send({ type: 'config', config, live, origin });
const sendLive = () => send({ type: 'live', live });
wss.on('connection', (ws) => ws.send(JSON.stringify(state())));

// Only pages served by this app (the OBS dock, the settings page) may send commands:
// a site open in the browser must not be able to change what is on air.
const local = (value = '') => /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/i.test(value);
app.use((q, r, next) => {
  const origin = q.headers.origin;
  if (origin && !local(origin)) return void r.status(403).json({ error: 'Forbidden origin' });
  next();
});
app.use(express.json({ limit: '40mb' }));
app.use('/api/media', express.raw({ type: () => true, limit: '8mb' }));

const fail = (r: Response, e: unknown, status = 400) =>
  r.status(status).json({ error: (e as Error).message || String(e) });

app.get('/api/health', (_q, r) =>
  r.json({ ok: true, app: 'lower-third-web', version: appVersion }),
);
app.get('/api/state', (_q, r) => r.json(state()));

app.put('/api/config', async (q, r) => {
  try {
    config = cleanConfig(q.body);
    live = cleanLive(live, config);
    await saveStore();
    sendConfig(String(q.headers['x-client'] || ''));
    r.json({ ok: true, config });
  } catch (e) {
    fail(r, e, 500);
  }
});

// The dock changes a few values at a time (the text on air, a saved list, the time on
// screen) without sending the whole configuration: { "top.pinned": "…", "timing.autoHide": 10 }.
// Only existing settings can be set, and everything is validated like a full save.
app.post('/api/patch', async (q, r) => {
  try {
    const next = structuredClone(config) as unknown as Record<string, unknown>;
    for (const [path, value] of Object.entries(q.body || {})) {
      const keys = path.split('.');
      const last = keys.pop()!;
      let node: unknown = next;
      for (const k of keys)
        node = Object.hasOwn((node ?? {}) as object, k)
          ? (node as Record<string, unknown>)[k]
          : undefined;
      if (!node || typeof node !== 'object' || Array.isArray(node) || !Object.hasOwn(node, last))
        throw new Error(`Unknown setting: ${path}`);
      (node as Record<string, unknown>)[last] = value;
    }
    config = cleanConfig(next);
    live = cleanLive(live, config);
    await saveStore();
    sendConfig(String(q.headers['x-client'] || ''));
    r.json({ ok: true, config });
  } catch (e) {
    fail(r, e);
  }
});

// ---- Names: the dock adds and removes them without touching the rest of the settings ----
app.post('/api/lower/items', async (q, r) => {
  const next = cleanConfig({
    ...config,
    lower: {
      ...config.lower,
      items: [...config.lower.items, { ...q.body, id: newId(), logo: q.body?.logo !== false }],
    },
  });
  if (next.lower.items.length === config.lower.items.length)
    return void r.status(400).json({ error: 'Type a name or a title' });
  config = next;
  await saveStore();
  sendConfig();
  r.json({ ok: true, item: config.lower.items.at(-1) });
});
app.delete('/api/lower/items/:id', async (q, r) => {
  const items = config.lower.items.filter((i) => i.id !== q.params.id);
  if (items.length === config.lower.items.length)
    return void r.status(404).json({ error: 'Name not found' });
  config = { ...config, lower: { ...config.lower, items } };
  live = cleanLive(live, config);
  await saveStore();
  sendConfig();
  r.json({ ok: true });
});

// ---- On air ----
const timers = new Map<ElementName, NodeJS.Timeout>();
function setOn(el: ElementName, on: boolean, item?: string) {
  clearTimeout(timers.get(el));
  if (el === 'lower' || el === 'social') live[el] = { on, item: item ?? live[el].item };
  else live[el] = { on };
  // Names, the QR card and social networks come and go: one time on screen for all of
  // them. The agenda leaves after its last day, unless it is set to repeat.
  let seconds = 0;
  if (el === 'lower' || el === 'card' || el === 'social') seconds = config.timing.autoHide;
  else if (el === 'agenda' && !config.agenda.loop)
    seconds = config.agenda.days.length * config.agenda.seconds;
  if (on && seconds > 0)
    timers.set(
      el,
      setTimeout(() => {
        setOn(el, false);
        sendLive();
      }, seconds * 1000),
    );
  if (el === 'top' || el === 'bug' || el === 'ticker') saveStore().catch(() => {});
}
function liveCommand(q: Request, r: Response) {
  const el = String(q.params.element) as ElementName,
    action = String(q.params.action);
  if (action === 'hide' && String(q.params.element) === 'all') {
    for (const e of ELEMENTS) setOn(e, false);
    sendLive();
    return void r.json({ ok: true, live });
  }
  if (!ELEMENTS.includes(el)) return void r.status(404).json({ error: 'Unknown element' });
  if (!['show', 'hide', 'toggle'].includes(action))
    return void r.status(400).json({ error: 'Use show, hide or toggle' });
  if (el === 'lower' || el === 'social') {
    const ref = String(q.query.item ?? q.body?.item ?? '') || undefined;
    const item = el === 'lower' ? resolveItem(config, live, ref) : resolveSocial(config, live, ref);
    if (action !== 'hide' && !item) return void r.status(404).json({ error: 'Name not found' });
    const same = live[el].on && item?.id === live[el].item;
    // Toggling another one while one is on air switches to it.
    const on = action === 'show' || (action === 'toggle' && !(same || (!ref && live[el].on)));
    setOn(el, on, on ? item!.id : undefined);
  } else {
    if (el === 'agenda' && action !== 'hide' && !config.agenda.days.length)
      return void r.status(404).json({ error: 'Agenda is empty' });
    setOn(el, action === 'show' || (action === 'toggle' && !live[el].on));
  }
  sendLive();
  r.json({ ok: true, live });
}
// GET too, so a Stream Deck "website" key or Companion can fire it without a plugin.
app.post('/api/live/:element/:action', liveCommand);
app.get('/api/live/:element/:action', liveCommand);

// ---- PIX and QR ----
function pixCode() {
  const p = config.pix;
  if (p.mode === 'payload') {
    if (!validPixPayload(p.payload))
      throw new Error('Invalid PIX code (copy it again from the bank app)');
    return p.payload.trim();
  }
  return pixPayload(p);
}
app.get('/api/pix', (_q, r) => {
  try {
    r.json({ ok: true, payload: pixCode() });
  } catch (e) {
    fail(r, e);
  }
});
app.get('/api/qr.svg', (q, r) => {
  try {
    const text = q.query.kind === 'pix' ? pixCode() : String(q.query.text ?? '');
    const svg = qrSvg(text, {
      dark: String(q.query.dark ?? '#000000'),
      light: String(q.query.light ?? '#ffffff'),
      round: q.query.round === '1',
      margin: Number(q.query.margin ?? 2),
    });
    r.set('Cache-Control', 'no-store').type('image/svg+xml').send(svg);
  } catch (e) {
    fail(r, e);
  }
});

app.get('/api/fonts', async (q, r) => r.json(await installedFonts(q.query.force === '1')));

// ---- Images (logo) ----
const IMAGE_TYPES: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
};
async function storeImage(data: Buffer, ext: string) {
  const name = createHash('sha256').update(data).digest('hex').slice(0, 16) + ext;
  await writeFile(join(mediaDir, name), data);
  return `/media/${name}`;
}
app.post('/api/media', async (q, r) => {
  try {
    const ext = IMAGE_TYPES[String(q.headers['content-type']).split(';')[0]];
    if (!ext) throw new Error('Use a PNG, JPG, WebP, GIF or SVG image');
    if (!Buffer.isBuffer(q.body) || !q.body.length) throw new Error('Empty image');
    r.json({ ok: true, url: await storeImage(q.body, ext) });
  } catch (e) {
    fail(r, e);
  }
});
app.use(
  '/media',
  express.static(mediaDir, {
    setHeaders: (res) => {
      // An uploaded SVG must never run scripts in the app's origin.
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      );
      res.setHeader('X-Content-Type-Options', 'nosniff');
    },
  }),
);

// ---- Backup: settings and images in one file ----
app.get('/api/backup', async (_q, r) => {
  const media: Record<string, string> = {};
  for (const f of await readdir(mediaDir).catch(() => []))
    if (JSON.stringify(config).includes(`/media/${f}`))
      media[f] = (await readFile(join(mediaDir, f))).toString('base64');
  r.set('Content-Disposition', 'attachment; filename="lower-third-web-backup.json"').json({
    app: 'lower-third-web',
    version: appVersion,
    config,
    media,
  });
});
app.post('/api/restore', async (q, r) => {
  try {
    if (q.body?.app !== 'lower-third-web' || !q.body.config)
      throw new Error('Not a Lower Third Web backup');
    for (const [name, data] of Object.entries(q.body.media || {}))
      if (/^[a-f0-9]{16}\.(png|jpe?g|webp|gif|svg)$/.test(name))
        await writeFile(join(mediaDir, name), Buffer.from(String(data), 'base64'));
    config = cleanConfig(q.body.config);
    live = cleanLive(live, config);
    await saveStore();
    sendConfig();
    r.json({ ok: true });
  } catch (e) {
    fail(r, e);
  }
});

// The OBS dock cannot open a normal browser window by itself: the server does it.
app.post('/api/open-settings', (_q, r) => {
  const url = `${baseUrl}/settings`;
  if (process.platform === 'win32')
    execFile('cmd', ['/c', 'start', '', url], { windowsHide: true }, () => {});
  else execFile(process.platform === 'darwin' ? 'open' : 'xdg-open', [url], () => {});
  r.json({ ok: true, url });
});

for (const page of ['dock', 'settings', 'overlay'])
  app.get(`/${page}`, (_q, r) => r.sendFile(join(webDir, `${page}.html`)));
app.get('/', (_q, r) => r.redirect('/settings'));
app.use(express.static(webDir, { extensions: ['html'] }));

await loadStore();
server.on('error', (e: NodeJS.ErrnoException) => {
  console.error(
    e.code === 'EADDRINUSE'
      ? `Port ${port} is in use: Lower Third Web is probably already running.`
      : e.message,
  );
  process.exit(1);
});
server.listen(port, '127.0.0.1', () => {
  console.log(`Lower Third Web — by Culto em Off: ${baseUrl}/settings`);
  console.log(`Persistent data: ${configFile}`);
});

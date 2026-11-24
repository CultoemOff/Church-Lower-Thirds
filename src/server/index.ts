import express, { type Request, type Response } from 'express';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { execFile, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, userInfo } from 'node:os';
import { cp, mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { appDataDir, installInfoFile, ownerId, userFilesFolder } from './paths.js';
import { checkForUpdate, downloadVerifiedSetup } from './updater.js';
import { installedFonts } from './fonts.js';
import { pixPayload, validPixPayload } from './pix.js';
import { qrSvg } from './qr.js';
import { SOURCES, sourceFileName, writeSourceFiles } from './sources.js';
import {
  cleanConfig,
  cleanLive,
  ELEMENTS,
  firstConfig,
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
// The installer asks where the person's files should live (settings, images and the OBS
// source files), somewhere easy to back up, and hands the answer to the server it starts
// (--folder). Every account of the computer has its own folder, remembered in its own
// profile, so one person's settings never touch another's.
const readJson = (file: string) => {
  try {
    return JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  } catch {
    return {};
  }
};
const argument = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 1 ? process.argv[i + 1] : undefined;
};
const install: { language?: string } = readJson(installInfoFile());
const locationFile = join(appDataDir(), 'location.json');
const previousFolder: string | undefined = readJson(locationFile).folder;
const userFolder =
  process.env.CLT_DATA_DIR || userFilesFolder(argument('folder'), previousFolder, homedir());
const owner = ownerId(userInfo().username, homedir());
const remember = (port: number) => {
  if (process.env.CLT_DATA_DIR) return;
  try {
    mkdirSync(appDataDir(), { recursive: true });
    writeFileSync(locationFile, JSON.stringify({ folder: userFolder, port }));
  } catch {
    // Everything still works for this run; it is simply worked out again next time.
  }
};
const dataDir = process.env.CLT_DATA_DIR || join(userFolder, 'Data');
const mediaDir = join(dataDir, 'media');
let sourcesDir = '';
const configFile = join(dataDir, 'config.json');
const defaultPort = Number(process.env.PORT) || 8795;
let port = defaultPort;
let baseUrl = `http://127.0.0.1:${port}`;

let config: Config = cleanConfig({});
let live: Live = liveDefaults();

async function loadStore() {
  // Another folder chosen in the installer: the settings and images go along.
  if (
    previousFolder &&
    !process.env.CLT_DATA_DIR &&
    resolve(previousFolder) !== resolve(userFolder) &&
    !existsSync(configFile) &&
    existsSync(join(previousFolder, 'Data', 'config.json'))
  )
    await cp(join(previousFolder, 'Data'), dataDir, { recursive: true }).catch(() => {});
  await mkdir(mediaDir, { recursive: true });
  if (!existsSync(configFile)) {
    config = firstConfig(install.language || '');
    await saveStore();
    return;
  }
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
  r.json({ ok: true, app: 'church-lower-thirds', version: appVersion, owner }),
);
app.get('/api/state', (_q, r) => r.json(state()));

app.put('/api/config', async (q, r) => {
  try {
    config = cleanConfig(q.body);
    live = cleanLive(live, config);
    for (const e of ELEMENTS) if (!live[e].on) clearTimeout(timers.get(e));
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
    for (const e of ELEMENTS) if (!live[e].on) clearTimeout(timers.get(e));
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
  if (action !== 'hide' && !config.enabled[el])
    return void r.status(409).json({ error: 'This category is disabled in the settings' });
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
  r.set('Content-Disposition', 'attachment; filename="church-lower-thirds-backup.json"').json({
    app: 'church-lower-thirds',
    version: appVersion,
    config,
    media,
  });
});
app.post('/api/restore', async (q, r) => {
  try {
    if (q.body?.app !== 'church-lower-thirds' || !q.body.config)
      throw new Error('Not a Church Lower Thirds backup');
    for (const [name, data] of Object.entries(q.body.media || {}))
      if (/^[a-f0-9]{16}\.(png|jpe?g|webp|gif|svg)$/.test(name))
        await writeFile(join(mediaDir, name), Buffer.from(String(data), 'base64'));
    config = cleanConfig(q.body.config);
    live = cleanLive(live, config);
    for (const e of ELEMENTS) if (!live[e].on) clearTimeout(timers.get(e));
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

// ---- In-app update ----
const canInstallUpdates = process.platform === 'win32';
app.get('/api/update', async (q, r) => {
  try {
    r.json({
      ...(await checkForUpdate(appVersion, q.query.force === '1')),
      canInstall: canInstallUpdates,
    });
  } catch (e) {
    fail(r, e, 502);
  }
});
// Downloads the installer, checks its SHA-256 and runs it. The installer stops this server,
// replaces the files and starts the new version; the panels reconnect by themselves.
let installing: Promise<string> | undefined;
app.post('/api/update/install', async (_q, r) => {
  if (!canInstallUpdates)
    return void r.status(501).json({ error: 'Automatic install is only available on Windows' });
  try {
    const info = await checkForUpdate(appVersion, true);
    if (!info.newer) return void r.status(409).json({ error: 'Already up to date', ...info });
    installing ??= downloadVerifiedSetup(info).finally(() => (installing = undefined));
    const setup = await installing;
    // Started through the Windows shell (Start-Process), which is what shows the permission
    // prompt. /SILENT: after that, only the progress window. The path travels in an
    // environment variable so no quoting can break on a profile name with spaces.
    const child = spawn(
      'powershell.exe',
      [
        '-NoProfile',
        '-WindowStyle',
        'Hidden',
        '-Command',
        "Start-Process -FilePath $env:CLT_SETUP -ArgumentList '/SILENT','/SUPPRESSMSGBOXES','/NORESTART'",
      ],
      {
        env: { ...process.env, CLT_SETUP: setup },
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      },
    );
    // Answer only once Windows has really started it; a failure here must reach the person
    // as a message, not take the program down.
    await new Promise<void>((ok, bad) => {
      child.once('spawn', () => ok());
      child.once('error', bad);
    });
    child.unref();
    r.json({ ok: true, version: info.latest });
  } catch (e) {
    fail(r, e, 502);
  }
});

// Where the person's files are, for the settings page.
app.get('/api/info', (_q, r) =>
  r.json({
    version: appVersion,
    baseUrl,
    folder: userFolder,
    sourcesDir,
    sources: SOURCES.map((s) => ({
      slug: s.slug,
      element: s.element,
      file: sourceFileName(s.file, false),
      verticalFile: sourceFileName(s.file, true),
    })),
  }),
);
app.post('/api/open-folder', (_q, r) => {
  const dir = sourcesDir || userFolder;
  if (process.platform === 'win32') execFile('explorer.exe', [dir], () => {});
  else execFile(process.platform === 'darwin' ? 'open' : 'xdg-open', [dir], () => {});
  r.json({ ok: true, folder: dir });
});
// One address per element, with the same English names as the source files.
app.get('/source/:slug', (q, r) =>
  SOURCES.some((s) => s.slug === q.params.slug)
    ? r.sendFile(join(webDir, 'overlay.html'))
    : r.status(404).send('Unknown source'),
);

for (const page of ['dock', 'settings', 'overlay'])
  app.get(`/${page}`, (_q, r) => r.sendFile(join(webDir, `${page}.html`)));
app.get('/', (_q, r) => r.redirect('/settings'));
app.use(express.static(webDir, { extensions: ['html'] }));

await loadStore();
// Who answers on a port: this same account (the program is already running: nothing to do),
// another account logged in at the same time, or some other program. In the last two cases
// this account gets the next port; its OBS source files and its dock file point to it.
async function ownerOf(p: number) {
  try {
    const r = await fetch(`http://127.0.0.1:${p}/api/health`, {
      signal: AbortSignal.timeout(1500),
    });
    const h = (await r.json()) as { app?: string; owner?: string };
    return h.app === 'church-lower-thirds' ? h.owner || 'unknown' : undefined;
  } catch {
    return undefined;
  }
}
const listen = (p: number): Promise<number> =>
  new Promise((ok, fail) => {
    const onError = async (e: NodeJS.ErrnoException) => {
      server.off('listening', onListening);
      if (e.code !== 'EADDRINUSE') return fail(e);
      if ((await ownerOf(p)) === owner) {
        console.log(`Church Lower Thirds is already running: http://127.0.0.1:${p}/settings`);
        process.exit(0);
      }
      if (p < defaultPort + 9) ok(listen(p + 1));
      else fail(e);
    };
    const onListening = () => {
      server.off('error', onError);
      ok(p);
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(p, '127.0.0.1');
  });
wss.on('error', () => {});
try {
  port = await listen(defaultPort);
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}
baseUrl = `http://127.0.0.1:${port}`;
remember(port);
sourcesDir = await writeSourceFiles(userFolder, baseUrl).catch((e) => {
  console.error(`Could not write the OBS source files: ${(e as Error).message}`);
  return '';
});
console.log(`Church Lower Thirds — by Culto em Off: ${baseUrl}/settings`);
console.log(`Persistent data: ${configFile}`);

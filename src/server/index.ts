import express, { type NextFunction, type Request, type Response } from 'express';
import { createServer, type IncomingMessage } from 'node:http';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { homedir, userInfo } from 'node:os';
import { cp, mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { refusal } from './guard.js';
import { appDataDir, installInfoFile, ownerId, userFilesFolder } from './paths.js';
import {
  checkForUpdate,
  downloadVerifiedSetup,
  rememberSetup,
  removeUsedSetup,
} from './updater.js';
import { startSetup } from './launch.js';
import { installedFonts } from './fonts.js';
import { pixPayload, validPixPayload } from './pix.js';
import { sepaPayload } from './sepa.js';
import { qrSvg } from './qr.js';
import { createObsSources } from './obs.js';
import { SOURCES, sourceFileName, writeSourceFiles } from './sources.js';
import {
  addProfile,
  cleanConfig,
  cleanLive,
  type Config,
  countdownEnd,
  type ElementName,
  exportProfile,
  importModel,
  importProfile,
  ELEMENTS,
  firstConfig,
  type Live,
  liveDefaults,
  newId,
  removeProfile,
  resolveItem,
  resolveSocial,
  type RundownStep,
  type SavedCard,
  type SavedComment,
  stepTarget,
  TIMED,
  useProfile,
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
// The program runs without a window, so what goes wrong is written to a small file in the
// account's own data folder (the last ~200 KB), next to location.json.
const errorLog = join(appDataDir(), 'error.log');
function logError(where: string, e: unknown) {
  const line = `${new Date().toISOString()} ${where}: ${(e as Error)?.stack || String(e)}\n`;
  console.error(line.trimEnd());
  try {
    mkdirSync(appDataDir(), { recursive: true });
    if (existsSync(errorLog) && statSync(errorLog).size > 200_000)
      renameSync(errorLog, errorLog + '.old');
    appendFileSync(errorLog, line);
  } catch {
    // No log is better than a server that stops because it could not write one.
  }
}
// One failed request or timer must not take the graphics off the air.
process.on('uncaughtException', (e) => logError('uncaughtException', e));
process.on('unhandledRejection', (e) => logError('unhandledRejection', e));

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
  } catch (e) {
    // The file is damaged (a power cut while writing, a bad manual edit). It is set aside,
    // never overwritten, and the program starts from the samples so the service can go on.
    const aside = configFile.replace(/\.json$/, `.damaged-${Date.now()}.json`);
    await rename(configFile, aside).catch(() => {});
    logError(`settings file could not be read, kept as ${aside}`, e);
    config = firstConfig(install.language || '');
    await saveStore();
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
  // Callers that do not wait for the result (a button on air) still leave a trace.
  saving.catch((e) => logError('saving the settings', e));
  return saving;
}

const app = express();
const server = createServer(app);
// Who may talk to the program: see guard.ts.
const wss = new WebSocketServer({
  server,
  path: '/ws',
  verifyClient: ({ req }: { req: IncomingMessage }) => !refusal(req.headers, '/ws'),
});
const send = (message: object) => {
  const text = JSON.stringify(message);
  for (const ws of wss.clients) if (ws.readyState === ws.OPEN) ws.send(text);
};
const state = () => ({ type: 'state', version: appVersion, config, live });
const sendConfig = (origin = '') => send({ type: 'config', config, live, origin });
const sendLive = () => send({ type: 'live', live });
wss.on('connection', (ws) => ws.send(JSON.stringify(state())));

app.disable('x-powered-by');
app.use((q, r, next) => {
  const why = refusal(q.headers, q.path);
  if (why) return void r.status(403).json({ error: why });
  // Nothing here is meant to be framed by another site or guessed by content type.
  r.setHeader('X-Content-Type-Options', 'nosniff');
  r.setHeader('Referrer-Policy', 'no-referrer');
  r.setHeader('Content-Security-Policy', "frame-ancestors 'self'");
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
const isTimed = (el: ElementName): el is (typeof TIMED)[number] =>
  (TIMED as readonly string[]).includes(el);
function setOn(el: ElementName, on: boolean, item?: string) {
  clearTimeout(timers.get(el));
  live[el].on = on;
  if (el === 'lower' || el === 'social') live[el].item = item ?? live[el].item;
  // Names, the QR card and social networks come and go: one time on screen for all of
  // them. The agenda leaves after its last day, unless it is set to repeat.
  let seconds = 0;
  if (el === 'lower' || el === 'card' || el === 'social' || el === 'comment')
    seconds = config.timing.autoHide;
  else if (el === 'agenda' && !config.agenda.loop)
    seconds = config.agenda.days.length * config.agenda.seconds;
  // The countdown leaves a moment after zero, when it is set to.
  if (el === 'countdown') {
    if (on) live.countdown.until = countdownEnd(config.countdown);
    if (on && config.countdown.hideAtEnd)
      seconds = Math.max(0, (live.countdown.until - Date.now()) / 1000) + 8;
  }
  // Pinned in the dock: it stays until someone hides it.
  if (isTimed(el) && live[el].pin) seconds = 0;
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
  // Pin: the element ignores the global time. Unpinning one that is on air starts the
  // time again from now.
  if (['pin', 'unpin', 'togglepin'].includes(action)) {
    if (!isTimed(el)) return void r.status(400).json({ error: 'This element has no time to pin' });
    live[el].pin = action === 'pin' || (action === 'togglepin' && !live[el].pin);
    if (live[el].on) setOn(el, true);
    saveStore().catch(() => {});
    sendLive();
    return void r.json({ ok: true, live });
  }
  if (!['show', 'hide', 'toggle'].includes(action))
    return void r.status(400).json({ error: 'Use show, hide, toggle, pin, unpin or togglepin' });
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
    if (el === 'comment' && action !== 'hide' && !config.comment.said.trim())
      return void r.status(404).json({ error: 'Comment is empty' });
    setOn(el, action === 'show' || (action === 'toggle' && !live[el].on));
  }
  sendLive();
  r.json({ ok: true, live });
}
// GET too, so a Stream Deck "website" key or Companion can fire it without a plugin.
app.post('/api/live/:element/:action', liveCommand);
app.get('/api/live/:element/:action', liveCommand);

// ---- Order of service ----
// "Next" in the dock (or a Stream Deck key) runs the next step: what was on from the step
// before leaves, and the saved name, offering, comment… of this one goes on air.
const LEAVES: ElementName[] = ['lower', 'card', 'comment', 'social', 'agenda', 'countdown'];
async function runStep(step: RundownStep, before?: RundownStep) {
  if (step.kind === 'hide') for (const el of LEAVES) setOn(el, false);
  else {
    const target = stepTarget(config, step);
    if (!config.enabled[step.kind]) throw new Error('This category is disabled in the settings');
    if (!target) throw new Error('This step points to something that was deleted');
    if (before && before.kind !== 'hide' && before.kind !== step.kind) setOn(before.kind, false);
    // A saved offering or comment becomes the one on air, as a click on it in the dock does.
    if (step.kind === 'card' && 'title' in target) {
      const { title, subtitle, qr, qrText } = target as SavedCard;
      config = { ...config, card: { ...config.card, title, subtitle, qr, qrText } };
    }
    if (step.kind === 'comment' && 'text' in target) {
      const { user, text: said } = target as SavedComment;
      config = { ...config, comment: { ...config.comment, user, said } };
    }
    if (step.kind === 'agenda' && !config.agenda.days.length) throw new Error('Agenda is empty');
    if (step.kind === 'card' || step.kind === 'comment') {
      await saveStore();
      sendConfig();
    }
    setOn(step.kind, true, step.kind === 'lower' || step.kind === 'social' ? step.ref : undefined);
  }
}
async function rundownCommand(q: Request, r: Response) {
  const steps = config.rundown,
    action = String(q.params.action),
    at = steps.findIndex((x) => x.id === live.step);
  if (!steps.length) return void r.status(404).json({ error: 'The order of service is empty' });
  if (action === 'restart') {
    for (const el of LEAVES) setOn(el, false);
    live.step = '';
    sendLive();
    return void r.json({ ok: true, live });
  }
  const n = Number(q.query.n ?? q.body?.n),
    ref = String(q.query.id ?? q.body?.id ?? '');
  const step =
    action === 'next'
      ? steps[at + 1]
      : action === 'prev'
        ? steps[at - 1]
        : action === 'go'
          ? (steps.find((x) => x.id === ref) ?? (Number.isInteger(n) ? steps[n - 1] : undefined))
          : undefined;
  if (!['next', 'prev', 'go'].includes(action))
    return void r.status(400).json({ error: 'Use next, prev, go or restart' });
  if (!step)
    return void r
      .status(404)
      .json({ error: action === 'next' ? 'The order of service is at its end' : 'No such step' });
  // The step becomes the current one even when it cannot be shown: "Next" then goes on.
  const before = steps[at];
  live.step = step.id;
  let error = '';
  try {
    await runStep(step, before);
  } catch (e) {
    error = (e as Error).message;
  }
  sendLive();
  if (error) return void r.status(409).json({ error, live });
  r.json({ ok: true, live });
}
app.post('/api/rundown/:action', rundownCommand);
app.get('/api/rundown/:action', rundownCommand);

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
/** What the church's contribution QR encodes, by the method chosen in the settings. */
function givingCode() {
  const g = config.giving;
  if (g.method === 'pix') return pixCode();
  if (g.method === 'sepa') return sepaPayload(g.sepa);
  if (g.method === 'link') {
    if (!g.link.trim()) throw new Error('Enter the link for the QR code');
    return g.link.trim();
  }
  throw new Error('This way of giving has no generated QR code');
}
// For the check in the settings: what the QR holds, or why it cannot be made yet.
app.get('/api/giving', (_q, r) => {
  const g = config.giving;
  try {
    if (g.method === 'image') {
      if (!g.image) throw new Error('Upload the QR code image');
      return void r.json({ ok: true, method: g.method, image: g.image });
    }
    if (g.method === 'text') {
      if (!g.details) throw new Error('Enter the bank details to show');
      return void r.json({ ok: true, method: g.method });
    }
    if (g.method === 'app') {
      if (!g.app.id.trim()) throw new Error('Enter the number or code that receives');
      return void r.json({ ok: true, method: g.method, image: g.image });
    }
    r.json({ ok: true, method: g.method, payload: givingCode() });
  } catch (e) {
    fail(r, e);
  }
});
app.get('/api/qr.svg', (q, r) => {
  try {
    // giving = the church's main way; pixkey = the same receiver with another PIX key
    // (an offering with its own key: missions, a purchase…); anything else = the text itself.
    const kind = q.query.kind,
      given = String(q.query.text ?? '');
    const text =
      kind === 'giving'
        ? givingCode()
        : kind === 'pixkey'
          ? pixPayload({ ...config.pix, key: given })
          : given;
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
/** The first bytes of the file match the image type it was sent as. */
function looksLike(data: Buffer, ext: string) {
  const head = data.subarray(0, 16);
  if (ext === '.png') return head.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'));
  if (ext === '.jpg') return head[0] === 0xff && head[1] === 0xd8;
  if (ext === '.gif') return head.subarray(0, 4).toString('latin1') === 'GIF8';
  if (ext === '.webp')
    return (
      head.subarray(0, 4).toString('latin1') === 'RIFF' &&
      head.subarray(8, 12).toString('latin1') === 'WEBP'
    );
  return /<svg[\s>]/i.test(data.subarray(0, 4096).toString('utf8'));
}
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
    if (!looksLike(q.body, ext)) throw new Error('Use a PNG, JPG, WebP, GIF or SVG image');
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
// Back to how the program was on its first run: every setting, name and text is replaced
// by the samples. The uploaded image files stay in the folder, unused.
// Service profiles: change to another look at once (also for Stream Deck: ?name=Natal,
// ?id=… or ?n=2), keep the look in use as a new profile, remove one.
async function profileChange(r: Response, change: () => Config) {
  try {
    config = change();
    live = cleanLive(live, config);
    await saveStore();
    sendConfig();
    r.json({ ok: true, profile: config.profile, config });
  } catch (e) {
    fail(r, e);
  }
}
const profileRef = (q: Request) =>
  String(q.body?.id ?? q.query.id ?? q.body?.name ?? q.query.name ?? q.query.n ?? '');
const chooseProfile = (q: Request, r: Response) =>
  profileChange(r, () => useProfile(config, profileRef(q)));
app.post('/api/profile/use', chooseProfile);
app.get('/api/profile/use', chooseProfile);
app.post('/api/profile/add', (q, r) => profileChange(r, () => addProfile(config, q.body?.name)));
app.post('/api/profile/remove', (q, r) =>
  profileChange(r, () => removeProfile(config, profileRef(q))),
);

// ---- Sharing: a custom model or a profile as a file ----
// The file is small JSON, with the images the profile uses inside it (as in the backup).
const shareName = (kind: string, name: string) =>
  `${kind}-${
    name
      .normalize('NFD')
      .replace(/[^\w -]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .toLowerCase() || 'church-lower-thirds'
  }.clt.json`;
app.get('/api/share/model', (q, r) => {
  const m = config.customModels.find((x) => x.id === String(q.query.id));
  if (!m) return void r.status(404).json({ error: 'Model not found' });
  r.set('Content-Disposition', `attachment; filename="${shareName('modelo', m.name)}"`).json({
    app: 'church-lower-thirds',
    kind: 'model',
    version: appVersion,
    name: m.name,
    css: m.css,
  });
});
app.get('/api/share/profile', async (q, r) => {
  try {
    const p = exportProfile(config, String(q.query.id ?? ''));
    const media: Record<string, string> = {};
    for (const f of await readdir(mediaDir).catch(() => []))
      if (JSON.stringify(p.look).includes(`/media/${f}`))
        media[f] = (await readFile(join(mediaDir, f))).toString('base64');
    r.set('Content-Disposition', `attachment; filename="${shareName('perfil', p.name)}"`).json({
      app: 'church-lower-thirds',
      kind: 'profile',
      version: appVersion,
      ...p,
      media,
    });
  } catch (e) {
    fail(r, e);
  }
});
app.post('/api/share/import', async (q, r) => {
  try {
    const file = q.body || {};
    if (file.app !== 'church-lower-thirds' || !['model', 'profile'].includes(file.kind))
      throw new Error('Not a Church Lower Thirds model or profile');
    if (file.kind === 'model') config = importModel(config, file.name, file.css)[0];
    else {
      for (const [name, data] of Object.entries(file.media || {}))
        if (/^[a-f0-9]{16}\.(png|jpe?g|webp|gif|svg)$/.test(name))
          await writeFile(join(mediaDir, name), Buffer.from(String(data), 'base64'));
      config = importProfile(config, file);
    }
    live = cleanLive(live, config);
    await saveStore();
    sendConfig();
    r.json({ ok: true, kind: file.kind, config });
  } catch (e) {
    fail(r, e);
  }
});

// ---- OBS: create the browser sources there ----
app.post('/api/obs/sources', async (q, r) => {
  const b = q.body || {},
    vertical = b.layout === 'vertical',
    [width, height] = (vertical ? config.output.vertical : config.output.horizontal)
      .split('x')
      .map(Number);
  const source = (file: string, slug: string) => ({
    name: `CLT - ${file}${vertical ? ' (Vertical)' : ''}`,
    url: `${baseUrl}/source/${slug}${vertical ? '?layout=vertical' : ''}`,
    width,
    height,
  });
  // One source with everything, or one per category that is switched on.
  const sources =
    b.mode === 'each'
      ? SOURCES.filter((s) => s.element && config.enabled[s.element]).map((s) =>
          source(s.file, s.slug),
        )
      : [source('All Elements', 'all')];
  try {
    const port = Number(b.port);
    r.json({
      ok: true,
      ...(await createObsSources(sources, {
        port: Number.isInteger(port) && port > 0 && port < 65536 ? port : 4455,
        password: typeof b.password === 'string' ? b.password : '',
      })),
    });
  } catch (e) {
    r.status(502).json({ error: (e as Error).message });
  }
});

app.post('/api/reset', async (_q, r) => {
  try {
    config = firstConfig(config.language === 'auto' ? install.language || 'auto' : config.language);
    for (const e of ELEMENTS) clearTimeout(timers.get(e));
    live = cleanLive(liveDefaults(), config);
    await saveStore();
    sendConfig();
    sendLive();
    r.json({ ok: true, config });
  } catch (e) {
    fail(r, e);
  }
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
app.post('/api/open-settings', (q, r) => {
  // ?page=rundown opens the settings on that page.
  const page = String(q.query.page ?? '');
  const url = `${baseUrl}/settings${/^[a-z]{2,12}$/.test(page) ? `#${page}` : ''}`;
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
/** What the update is doing now, for the page that is waiting: '' | downloading | asking. */
let updatePhase = '';
/** The installer of the last attempt, so the person can be shown the file. */
let lastSetup = '';
void removeUsedSetup(dataDir, appVersion);
app.get('/api/update/progress', (_q, r) => r.json({ phase: updatePhase, file: lastSetup }));
app.post('/api/update/install', async (q, r) => {
  if (!canInstallUpdates)
    return void r.status(501).json({ error: 'Automatic install is only available on Windows' });
  try {
    const info = await checkForUpdate(appVersion, true);
    if (!info.newer) return void r.status(409).json({ error: 'Already up to date', ...info });
    updatePhase = 'downloading';
    installing ??= downloadVerifiedSetup(info).finally(() => (installing = undefined));
    lastSetup = await installing;
    await rememberSetup(dataDir, lastSetup, info.latest || '');
    // A small window on the computer says the update is ready; after the click the
    // installer starts and Windows asks for permission in front of everything (a request
    // made from this hidden program would only blink on the taskbar). /SILENT: after the
    // permission, only the progress window. /LOG leaves "Setup Log <date>.txt" in the temp
    // folder, for when an update goes wrong. The answer goes out only once Windows has
    // really started the setup: a failure must reach the person as a message.
    updatePhase = 'asking';
    const how = await startSetup(
      lastSetup,
      ['/SILENT', '/SUPPRESSMSGBOXES', '/NORESTART', '/LOG'],
      {
        note: typeof q.body?.note === 'string' ? q.body.note.slice(0, 600) : '',
      },
    );
    r.json({ ok: true, version: info.latest, how });
  } catch (e) {
    r.status(502).json({ error: (e as Error).message || String(e), file: lastSetup });
  } finally {
    updatePhase = '';
  }
});
// Shows the downloaded installer in its folder, for the person to open it themselves.
app.post('/api/update/reveal', (_q, r) => {
  if (!lastSetup || !canInstallUpdates) return void r.status(404).json({ error: 'No installer' });
  execFile('explorer.exe', [`/select,${lastSetup}`], () => {});
  r.json({ ok: true, file: lastSetup });
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
// What is left: an address that does not exist, and anything a route let slip (a body that
// is not JSON, a file too large). Always a short JSON answer, never a stack trace.
app.use('/api', (_q, r) => void r.status(404).json({ error: 'Unknown address' }));
app.use(
  (
    e: Error & { status?: number; type?: string },
    _q: Request,
    r: Response,
    _next: NextFunction,
  ) => {
    const status = e.status && e.status >= 400 && e.status < 600 ? e.status : 500;
    if (status >= 500) logError('request', e);
    r.status(status).json({
      error:
        e.type === 'entity.too.large'
          ? 'File too large'
          : e.type === 'entity.parse.failed'
            ? 'Invalid data'
            : status >= 500
              ? 'Internal error'
              : e.message,
    });
  },
);

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
console.log(`Church Lower Thirds by Culto em Off: ${baseUrl}/settings`);
console.log(`Persistent data: ${configFile}`);

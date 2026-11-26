import { createHash } from 'node:crypto';
import { createWriteStream, mkdirSync, statSync } from 'node:fs';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { get as httpGet, type IncomingMessage } from 'node:http';
import { get as httpsGet } from 'node:https';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';

/**
 * In-app updates. CI publishes every version as a GitHub release tagged "v<version>" with
 * the Windows installer (Church-Lower-Thirds-Setup-<version>.exe), the macOS package
 * (Church-Lower-Thirds-macOS-<version>.pkg) and SHA256SUMS.txt; betas are pre-releases. The
 * program lists the releases, picks the newest one that has the installer of this system
 * and, on request, downloads it, checks its SHA-256 and opens it.
 *
 * The releases live in a repository of their own, public and with the installers only: the
 * source code is private, and GitHub answers 404 for the releases of a private repository.
 */
export const RELEASES_REPO = 'CultoemOff/Church-Lower-Thirds-Releases';
const RELEASES_API = `https://api.github.com/repos/${RELEASES_REPO}/releases?per_page=30`;
const RELEASES_PAGE = `https://github.com/${RELEASES_REPO}/releases`;

/** The installer's file name: nothing in it can point outside the folder it is saved in. */
const WINDOWS_SETUP = /^Church-Lower-Thirds-Setup[\w.-]*\.exe$/;
const MAC_PACKAGE = /^Church-Lower-Thirds-macOS[\w.-]*\.pkg$/;
/** The file each system installs from; none for the systems the program has no installer for. */
export const setupName = (platform: NodeJS.Platform = process.platform) =>
  platform === 'darwin' ? MAC_PACKAGE : platform === 'win32' ? WINDOWS_SETUP : undefined;
const isSetup = (name: string) => WINDOWS_SETUP.test(name) || MAC_PACKAGE.test(name);

export interface UpdateInfo {
  current: string;
  latest?: string;
  newer: boolean;
  page: string;
  setupName?: string;
  setupUrl?: string;
  sumsUrl?: string;
}

/** a > b for "1.2.0" and "1.3.0-beta.2"; a beta comes before its final version. */
export function newerThan(a: string, b: string) {
  const parse = (v: string) => {
    const [core, pre = ''] = v.replace(/^v/, '').split('-', 2);
    return { n: core.split('.').map((x) => Number(x) || 0), pre };
  };
  const x = parse(a),
    y = parse(b);
  for (let i = 0; i < 3; i++)
    if ((x.n[i] || 0) !== (y.n[i] || 0)) return (x.n[i] || 0) > (y.n[i] || 0);
  if (x.pre === y.pre) return false;
  if (!x.pre || !y.pre) return !x.pre;
  return x.pre.localeCompare(y.pre, undefined, { numeric: true }) > 0;
}

export interface Release {
  tag_name?: string;
  html_url?: string;
  draft?: boolean;
  prerelease?: boolean;
  assets?: { name: string; browser_download_url: string }[];
}

/**
 * The newest release for someone on `current`. People on a final version are only offered
 * final versions; people testing a beta also get newer betas. A release without the
 * installer of this system is not an update for it.
 */
export function pickRelease(
  releases: Release[],
  current: string,
  platform: NodeJS.Platform = process.platform,
) {
  const beta = current.includes('-'),
    wanted = setupName(platform);
  if (!wanted) return undefined;
  let best: (Release & { version: string }) | undefined;
  for (const r of releases) {
    const version = String(r.tag_name ?? '').match(/^v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?)$/)?.[1];
    if (!version || r.draft || (!beta && (r.prerelease || version.includes('-')))) continue;
    if (!r.assets?.some((a) => wanted.test(a.name))) continue;
    if (!best || newerThan(version, best.version)) best = { ...r, version };
  }
  return best;
}

/** Hash for `file` in a sha256sum-style list ("<hash> *name" or "<hash>  name"). */
export function hashFromSums(text: string, file: string) {
  for (const line of text.split(/\r?\n/)) {
    const m = line.trim().match(/^([0-9a-f]{64})\s+\*?(.+)$/i);
    if (m && m[2].trim().toLowerCase() === file.toLowerCase()) return m[1].toLowerCase();
  }
  return undefined;
}

let cache: { at: number; info: UpdateInfo } | undefined;

/** Asks GitHub for the releases (cached 10 min: the anonymous API limit is 60/h). */
export async function checkForUpdate(current: string, force = false): Promise<UpdateInfo> {
  if (!force && cache && Date.now() - cache.at < 10 * 60_000 && cache.info.current === current)
    return cache.info;
  // CLT_UPDATE_API exists for tests only.
  const r = await fetch(process.env.CLT_UPDATE_API || RELEASES_API, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Church-Lower-Thirds' },
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error(`Update check failed (HTTP ${r.status})`);
  const list = (await r.json()) as Release[];
  const best = pickRelease(Array.isArray(list) ? list : [], current);
  const wanted = setupName();
  const setup = best?.assets?.find((a) => wanted?.test(a.name));
  const info: UpdateInfo = {
    current,
    latest: best?.version,
    newer: !!best && newerThan(best.version, current),
    page: best?.html_url || RELEASES_PAGE,
    setupName: setup?.name,
    setupUrl: setup?.browser_download_url,
    sumsUrl: best?.assets?.find((a) => a.name === 'SHA256SUMS.txt')?.browser_download_url,
  };
  cache = { at: Date.now(), info };
  return info;
}

/**
 * Opens the installer download, following the redirects GitHub uses for release files.
 * Plain node:http(s) on purpose: with fetch, a server that closes the connection while the
 * file is still being written to disk can bring the whole program down.
 */
function openDownload(url: string, redirects = 5): Promise<IncomingMessage> {
  return new Promise((ok, bad) => {
    // The installer only ever travels encrypted (plain http is for the tests' local server).
    if (!url.startsWith('https:') && !process.env.CLT_UPDATE_API)
      return void bad(new Error('Update download failed (insecure address)'));
    const get = url.startsWith('https:') ? httpsGet : httpGet;
    const req = get(url, { headers: { 'User-Agent': 'Church-Lower-Thirds' } }, (res) => {
      const status = res.statusCode ?? 0;
      if (status >= 300 && status < 400 && res.headers.location && redirects > 0) {
        res.resume();
        ok(openDownload(new URL(res.headers.location, url).href, redirects - 1));
      } else if (status !== 200) {
        res.resume();
        bad(new Error(`Update download failed (HTTP ${status})`));
      } else ok(res);
    });
    req.on('error', bad);
    req.setTimeout(30_000, () => req.destroy(new Error('Update download failed (timeout)')));
  });
}

/**
 * Where the installer is saved: the person's Downloads folder, the place a browser would
 * put it. Company computers often refuse to run programs kept in the temp folder, and in
 * Downloads the person finds the file if they have to open it themselves.
 */
export function setupFolder(home = homedir(), platform: NodeJS.Platform = process.platform) {
  // A Mac guards Downloads against programs that run in the background: its own cache
  // folder is where a program keeps what it downloads for itself.
  if (platform === 'darwin') {
    const cache = join(home, 'Library', 'Caches', 'Church Lower Thirds');
    try {
      mkdirSync(cache, { recursive: true });
      return cache;
    } catch {
      return tmpdir();
    }
  }
  const downloads = join(home, 'Downloads');
  try {
    if (statSync(downloads).isDirectory()) return downloads;
  } catch {
    // No such folder on this computer.
  }
  return tmpdir();
}

/**
 * The installers this program downloads are its own to clean up: the note says which file
 * it was, and once that version (or a newer one) is running the file is removed. Files the
 * person downloaded themselves are never touched.
 */
const noteFile = (dataDir: string) => join(dataDir, 'update.json');
export const rememberSetup = (dataDir: string, file: string, version: string) =>
  writeFile(noteFile(dataDir), JSON.stringify({ file, version })).catch(() => {});
export async function removeUsedSetup(dataDir: string, current: string) {
  try {
    const note = JSON.parse(await readFile(noteFile(dataDir), 'utf8')) as {
      file?: unknown;
      version?: unknown;
    };
    if (typeof note.file !== 'string' || typeof note.version !== 'string') return;
    if (newerThan(note.version, current)) return;
    if (isSetup(note.file.split(/[\\/]/).pop() || '')) await rm(note.file, { force: true });
    await rm(noteFile(dataDir), { force: true });
  } catch {
    // No note: nothing was downloaded.
  }
}

/** Downloads the installer, verifying its SHA-256 against SHA256SUMS.txt. */
export async function downloadVerifiedSetup(
  info: UpdateInfo,
  dir = setupFolder(),
): Promise<string> {
  if (!info.setupUrl || !info.sumsUrl || !info.setupName || !isSetup(info.setupName))
    throw new Error('Update download is not available');
  const sums = await fetch(info.sumsUrl, { signal: AbortSignal.timeout(15000) });
  if (!sums.ok) throw new Error(`Update download failed (HTTP ${sums.status})`);
  const expected = hashFromSums(await sums.text(), info.setupName);
  if (!expected) throw new Error('Update download failed (no checksum)');
  const res = await openDownload(info.setupUrl);
  const file = join(dir, info.setupName);
  const hash = createHash('sha256');
  const tap = new Transform({
    transform(chunk, _enc, cb) {
      hash.update(chunk);
      cb(null, chunk);
    },
  });
  await pipeline(res, tap, createWriteStream(file));
  if (hash.digest('hex') !== expected) {
    // A file that is not what was published does not stay within the person's reach.
    await rm(file, { force: true });
    throw new Error('Update checksum mismatch');
  }
  return file;
}

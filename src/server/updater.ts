import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';

/**
 * In-app updates. CI publishes every version as a GitHub release tagged "v<version>" with
 * the Windows installer (Lower-Third-Web-Setup-<version>.exe) and SHA256SUMS.txt; betas are
 * pre-releases. The program lists the releases, picks the newest one that applies and, on
 * request, downloads the installer, checks its SHA-256 and runs it.
 *
 * The releases must be public for this to work: GitHub answers 404 for a private repository.
 */
export const RELEASES_API =
  'https://api.github.com/repos/CultoemOff/Lower-Third-Web/releases?per_page=30';
export const RELEASES_PAGE = 'https://github.com/CultoemOff/Lower-Third-Web/releases';

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
 * final versions; people testing a beta also get newer betas.
 */
export function pickRelease(releases: Release[], current: string) {
  const beta = current.includes('-');
  let best: (Release & { version: string }) | undefined;
  for (const r of releases) {
    const version = String(r.tag_name ?? '').match(/^v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?)$/)?.[1];
    if (!version || r.draft || (!beta && (r.prerelease || version.includes('-')))) continue;
    if (!r.assets?.some((a) => /^Lower-Third-Web-Setup.*\.exe$/.test(a.name))) continue;
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
  // LTW_UPDATE_API exists for tests only.
  const r = await fetch(process.env.LTW_UPDATE_API || RELEASES_API, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Lower-Third-Web' },
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error(`Update check failed (HTTP ${r.status})`);
  const list = (await r.json()) as Release[];
  const best = pickRelease(Array.isArray(list) ? list : [], current);
  const setup = best?.assets?.find((a) => /^Lower-Third-Web-Setup.*\.exe$/.test(a.name));
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

/** Downloads the installer to the temp folder, verifying SHA-256 against SHA256SUMS.txt. */
export async function downloadVerifiedSetup(info: UpdateInfo): Promise<string> {
  if (!info.setupUrl || !info.sumsUrl || !info.setupName)
    throw new Error('Update download is not available');
  const sums = await fetch(info.sumsUrl, { signal: AbortSignal.timeout(15000) });
  if (!sums.ok) throw new Error(`Update download failed (HTTP ${sums.status})`);
  const expected = hashFromSums(await sums.text(), info.setupName);
  if (!expected) throw new Error('Update download failed (no checksum)');
  const res = await fetch(info.setupUrl, { signal: AbortSignal.timeout(10 * 60_000) });
  if (!res.ok || !res.body) throw new Error(`Update download failed (HTTP ${res.status})`);
  const file = join(tmpdir(), info.setupName);
  const hash = createHash('sha256');
  const tap = new Transform({
    transform(chunk, _enc, cb) {
      hash.update(chunk);
      cb(null, chunk);
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await pipeline(Readable.fromWeb(res.body as any), tap, createWriteStream(file));
  if (hash.digest('hex') !== expected) throw new Error('Update checksum mismatch');
  return file;
}

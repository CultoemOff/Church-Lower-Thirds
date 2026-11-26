import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { AddressInfo } from 'node:net';
import {
  downloadVerifiedSetup,
  rememberSetup,
  removeUsedSetup,
  setupFolder,
  hashFromSums,
  newerThan,
  pickRelease,
  RELEASES_REPO,
  setupName,
  type Release,
} from '../src/server/updater.js';
import { installInfoFile, ownerId, userFilesFolder } from '../src/server/paths.js';

test('versions: a beta comes before its final version, betas compare by number', () => {
  assert.equal(newerThan('1.0.1', '1.0.0'), true);
  assert.equal(newerThan('1.0.0', '1.0.0'), false);
  assert.equal(newerThan('0.1.0', '0.1.0-beta.3'), true);
  assert.equal(newerThan('0.1.0-beta.3', '0.1.0'), false);
  assert.equal(newerThan('0.1.0-beta.10', '0.1.0-beta.2'), true);
  assert.equal(newerThan('v0.2.0-beta.1', '0.1.9'), true);
});

const rel = (tag: string, extra: Partial<Release> = {}): Release => ({
  tag_name: tag,
  html_url: `https://example/${tag}`,
  prerelease: tag.includes('-'),
  assets: [
    {
      name: `Church-Lower-Thirds-Setup-${tag.slice(1)}.exe`,
      browser_download_url: `https://example/${tag}.exe`,
    },
    { name: 'SHA256SUMS.txt', browser_download_url: `https://example/${tag}.txt` },
  ],
  ...extra,
});

test('the release offered depends on what is installed', () => {
  const list = [
    rel('v0.1.0-beta.2'),
    rel('v0.2.0-beta.1'),
    rel('v0.1.0'),
    rel('v0.1.1', { draft: true }),
    rel('nightly'),
  ];
  // On a final version: only final versions, never drafts.
  assert.equal(pickRelease(list, '0.0.9', 'win32')?.version, '0.1.0');
  // Testing a beta: newer betas too.
  assert.equal(pickRelease(list, '0.1.0-beta.1', 'win32')?.version, '0.2.0-beta.1');
  // A release without the installer is not offered.
  assert.equal(pickRelease([rel('v9.0.0', { assets: [] })], '0.1.0', 'win32'), undefined);
  assert.equal(pickRelease([], '0.1.0', 'win32'), undefined);
});

test('each system is offered its own installer, and only a release that has it', () => {
  const pkg = (v: string) => ({
    name: `Church-Lower-Thirds-macOS-${v}.pkg`,
    browser_download_url: `https://example/${v}.pkg`,
  });
  const both = rel('v1.0.0');
  both.assets.push(pkg('1.0.0'));
  // 1.1.0 came out for Windows only: a Mac stays on 1.0.0 until its package is there.
  const list = [both, rel('v1.1.0')];
  assert.equal(pickRelease(list, '0.9.0', 'win32')?.version, '1.1.0');
  assert.equal(pickRelease(list, '0.9.0', 'darwin')?.version, '1.0.0');
  // No installer for other systems.
  assert.equal(pickRelease(list, '0.9.0', 'linux'), undefined);
  assert.ok(setupName('win32')?.test('Church-Lower-Thirds-Setup-1.0.0.exe'));
  assert.ok(setupName('darwin')?.test('Church-Lower-Thirds-macOS-1.0.0.pkg'));
  // A name can never point outside the folder the file is saved in.
  for (const bad of [
    '../Church-Lower-Thirds-macOS-1.pkg',
    'Church-Lower-Thirds-macOS-1.pkg/x',
    'x.pkg',
  ])
    assert.equal(setupName('darwin')?.test(bad), false, bad);
  assert.equal(RELEASES_REPO, 'CultoemOff/Church-Lower-Thirds-Releases');
});

test('checksum list: finds the installer by name', () => {
  const sums = `${'a'.repeat(64)} *Church-Lower-Thirds-Setup-0.1.0.exe\r\n${'b'.repeat(64)}  other.txt\r\n`;
  assert.equal(hashFromSums(sums, 'Church-Lower-Thirds-Setup-0.1.0.exe'), 'a'.repeat(64));
  assert.equal(hashFromSums(sums, 'missing.exe'), undefined);
});

test('each account of the computer has its own files folder', () => {
  // Chosen in the installer: wins, also over the folder used before.
  assert.equal(userFilesFolder('/srv/igreja/lt', '/old', '/home/maria'), resolve('/srv/igreja/lt'));
  // Nothing chosen (another account, or a start at login): the folder already in use,
  // or "Church Lower Thirds" in this account's own Documents the first time.
  assert.equal(userFilesFolder(undefined, '/home/joao/x', '/home/joao'), '/home/joao/x');
  assert.match(
    userFilesFolder(undefined, undefined, '/home/joao', 'win32'),
    /joao.Documents.Church Lower Thirds$/,
  );
  assert.match(
    userFilesFolder('not/absolute', '', '/home/ana', 'win32'),
    /ana.Documents.Church Lower Thirds$/,
  );
  // A Mac guards Documents against programs running in the background: Movies instead.
  assert.match(
    userFilesFolder(undefined, undefined, '/Users/ana', 'darwin'),
    /ana.Movies.Church Lower Thirds$/,
  );
  assert.match(
    installInfoFile('win32', { ProgramData: 'C:\\ProgramData' }),
    /Culto em Off.Church Lower Thirds.install\.json$/,
  );
});

test('two accounts never look like the same owner', () => {
  assert.equal(ownerId('Maria', 'C:\\Users\\Maria'), ownerId('maria', 'c:\\users\\maria'));
  assert.notEqual(ownerId('maria', '/home/maria'), ownerId('joao', '/home/joao'));
  assert.match(ownerId('maria', '/home/maria'), /^[0-9a-f]{12}$/);
});

test('the installer is only accepted when its SHA-256 matches the published list', async () => {
  // The local server of this test speaks plain http; real downloads must be https.
  process.env.CLT_UPDATE_API = 'test';
  const setup = Buffer.from('pretend this is the installer '.repeat(2000));
  let sums = `${createHash('sha256').update(setup).digest('hex')} *Church-Lower-Thirds-Setup-9.9.9.exe\n`;
  // The file sits behind a redirect, as on GitHub.
  const web = createServer((q, r) => {
    if (q.url === '/setup') r.writeHead(302, { Location: '/files/setup.bin' }).end();
    else r.end(q.url === '/sums' ? sums : setup);
  }).listen(0, '127.0.0.1');
  await new Promise((ok) => web.once('listening', ok));
  const at = `http://127.0.0.1:${(web.address() as AddressInfo).port}`;
  const info = {
    current: '0.1.0',
    newer: true,
    page: '',
    setupName: 'Church-Lower-Thirds-Setup-9.9.9.exe',
    setupUrl: `${at}/setup`,
    sumsUrl: `${at}/sums`,
  };
  try {
    // Into the person's Downloads folder when there is one, else the temp folder.
    const home = mkdtempSync(join(tmpdir(), 'clt-home-'));
    assert.equal(setupFolder(home, 'win32'), tmpdir());
    mkdirSync(join(home, 'Downloads'));
    const dir = setupFolder(home, 'win32');
    assert.equal(dir, join(home, 'Downloads'));
    // On a Mac: the program's own cache folder, never the guarded Downloads.
    assert.equal(
      setupFolder(home, 'darwin'),
      join(home, 'Library', 'Caches', 'Church Lower Thirds'),
    );
    const file = await downloadVerifiedSetup(info, dir);
    assert.equal(file, join(dir, info.setupName));
    assert.deepEqual(readFileSync(file), setup);
    // The program removes the installer it downloaded once that version is running; a
    // newer one still to install stays, and so does any file it did not download.
    const mine = join(dir, 'Church-Lower-Thirds-Setup-9.9.9.exe'),
      theirs = join(dir, 'Church-Lower-Thirds-Setup-1.0.0.exe');
    writeFileSync(theirs, 'x');
    await removeUsedSetup(home, '9.9.9');
    assert.ok(existsSync(mine), 'nothing noted, nothing removed');
    await rememberSetup(home, mine, '9.9.9');
    await removeUsedSetup(home, '9.9.8');
    assert.ok(existsSync(mine), 'still to install');
    await removeUsedSetup(home, '9.9.9');
    assert.ok(!existsSync(mine) && existsSync(theirs) && !existsSync(join(home, 'update.json')));
    // A note pointing at something else is not followed.
    await rememberSetup(
      home,
      theirs.replace('Church-Lower-Thirds-Setup-1.0.0.exe', 'notes.txt'),
      '1.0.0',
    );
    writeFileSync(join(dir, 'notes.txt'), 'x');
    await removeUsedSetup(home, '9.9.9');
    assert.ok(existsSync(join(dir, 'notes.txt')));

    sums = `${'0'.repeat(64)} *Church-Lower-Thirds-Setup-9.9.9.exe\n`;
    await assert.rejects(downloadVerifiedSetup(info, dir), /checksum mismatch/);
    assert.ok(!existsSync(mine), 'a file that fails the check is not kept');
    await assert.rejects(downloadVerifiedSetup({ ...info, sumsUrl: undefined }), /not available/);
    // Outside the tests, an address that is not encrypted is refused, as is a file name
    // that could leave the temp folder.
    delete process.env.CLT_UPDATE_API;
    await assert.rejects(downloadVerifiedSetup(info, dir), /insecure address/);
    await assert.rejects(
      downloadVerifiedSetup({ ...info, setupName: '..\\Church-Lower-Thirds-Setup.exe' }),
      /not available/,
    );
  } finally {
    web.close();
  }
});

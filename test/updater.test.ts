import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  downloadVerifiedSetup,
  hashFromSums,
  newerThan,
  pickRelease,
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
  assert.equal(pickRelease(list, '0.0.9')?.version, '0.1.0');
  // Testing a beta: newer betas too.
  assert.equal(pickRelease(list, '0.1.0-beta.1')?.version, '0.2.0-beta.1');
  // A release without the installer is not offered.
  assert.equal(pickRelease([rel('v9.0.0', { assets: [] })], '0.1.0'), undefined);
  assert.equal(pickRelease([], '0.1.0'), undefined);
});

test('checksum list: finds the installer by name', () => {
  const sums = `${'a'.repeat(64)} *Church-Lower-Thirds-Setup-0.1.0.exe\r\n${'b'.repeat(64)}  other.txt\r\n`;
  assert.equal(hashFromSums(sums, 'Church-Lower-Thirds-Setup-0.1.0.exe'), 'a'.repeat(64));
  assert.equal(hashFromSums(sums, 'missing.exe'), undefined);
});

test('each account of the computer has its own files folder', () => {
  // Chosen in the installer: wins, also over the folder used before.
  assert.equal(userFilesFolder('/srv/igreja/lt', '/old', '/home/maria'), '/srv/igreja/lt');
  // Nothing chosen (another account, or a start at login): the folder already in use,
  // or "Church Lower Thirds" in this account's own Documents the first time.
  assert.equal(userFilesFolder(undefined, '/home/joao/x', '/home/joao'), '/home/joao/x');
  assert.match(
    userFilesFolder(undefined, undefined, '/home/joao'),
    /joao.Documents.Church Lower Thirds$/,
  );
  assert.match(
    userFilesFolder('not/absolute', '', '/home/ana'),
    /ana.Documents.Church Lower Thirds$/,
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
  const setup = Buffer.from('pretend this is the installer '.repeat(2000));
  let sums = `${createHash('sha256').update(setup).digest('hex')} *Church-Lower-Thirds-Setup-9.9.9.exe\n`;
  const web = createServer((q, r) => r.end(q.url === '/sums' ? sums : setup)).listen(
    0,
    '127.0.0.1',
  );
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
    assert.deepEqual(readFileSync(await downloadVerifiedSetup(info)), setup);
    sums = `${'0'.repeat(64)} *Church-Lower-Thirds-Setup-9.9.9.exe\n`;
    await assert.rejects(downloadVerifiedSetup(info), /checksum mismatch/);
    await assert.rejects(downloadVerifiedSetup({ ...info, sumsUrl: undefined }), /not available/);
  } finally {
    web.close();
  }
});

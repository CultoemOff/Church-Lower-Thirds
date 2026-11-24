import { test } from 'node:test';
import assert from 'node:assert/strict';
import { refusal } from '../src/server/guard.js';

const host = 'host';
test('the program only answers on its own address', () => {
  assert.equal(refusal({ [host]: '127.0.0.1:8795' }, '/api/state'), '');
  assert.equal(refusal({ [host]: 'localhost:8795' }, '/dock'), '');
  // DNS rebinding: another name pointing at this computer.
  assert.equal(refusal({ [host]: 'evil.example:8795' }, '/api/state'), 'Forbidden host');
  assert.equal(refusal({}, '/api/state'), 'Forbidden host');
});

test('pages of other sites cannot read the settings or change what is on air', () => {
  const ours = { [host]: '127.0.0.1:8795' };
  // The dock, the sources and the settings page.
  assert.equal(
    refusal(
      { ...ours, origin: 'http://127.0.0.1:8795', 'sec-fetch-site': 'same-origin' },
      '/api/reset',
    ),
    '',
  );
  // A site trying a form, a fetch, an image or the WebSocket.
  assert.equal(
    refusal({ ...ours, origin: 'https://evil.example' }, '/api/reset'),
    'Forbidden origin',
  );
  assert.equal(refusal({ ...ours, origin: 'https://evil.example' }, '/ws'), 'Forbidden origin');
  assert.equal(
    refusal({ ...ours, 'sec-fetch-site': 'cross-site' }, '/api/live/all/hide'),
    'Forbidden origin',
  );
  assert.equal(
    refusal({ ...ours, 'sec-fetch-site': 'cross-site' }, '/api/state'),
    'Forbidden origin',
  );
});

test('Stream Deck, Companion and the files in "OBS Sources" keep working', () => {
  const ours = { [host]: '127.0.0.1:8795' };
  // Tools that are not browsers send neither Origin nor Sec-Fetch-Site.
  assert.equal(refusal(ours, '/api/live/lower/toggle'), '');
  // A link typed or opened from another program.
  assert.equal(refusal({ ...ours, 'sec-fetch-site': 'none' }, '/api/live/top/toggle'), '');
  // A source file opened from disk waits for the program, then moves to its address.
  assert.equal(
    refusal({ ...ours, origin: 'null', 'sec-fetch-site': 'cross-site' }, '/api/health'),
    '',
  );
  assert.equal(refusal({ ...ours, 'sec-fetch-site': 'cross-site' }, '/source/names'), '');
  assert.equal(refusal({ ...ours, 'sec-fetch-site': 'cross-site' }, '/overlay.js'), '');
  // ...but a file on disk cannot drive the API by itself.
  assert.equal(refusal({ ...ours, origin: 'null' }, '/api/reset'), 'Forbidden origin');
});

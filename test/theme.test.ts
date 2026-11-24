import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanConfig, defaults } from '../src/server/store.js';
// @ts-expect-error browser module without type declarations
import { givingQr, givingText, qrInk, qrUrl, themed, THEMED_ELEMENTS } from '../src/web/js/look.js';

test('every element follows the global theme until it is given its own appearance', () => {
  const c = defaults();
  const red = { type: 'solid', a: '#ff0000', b: '#ff0000', angle: 0 };
  c.theme.main = red;
  c.theme.radius = 3;
  for (const el of THEMED_ELEMENTS) assert.equal(c[el as 'lower'].custom, false, el);
  // The name bar takes the main color; the others take the background color.
  assert.deepEqual(themed(c, 'lower').fill, red);
  assert.deepEqual(themed(c, 'lower').fill2, c.theme.surface);
  assert.deepEqual(themed(c, 'top').fill, c.theme.surface);
  for (const el of THEMED_ELEMENTS) {
    assert.deepEqual(themed(c, el).accent, c.theme.accent, el);
    assert.equal(themed(c, el).radius, 3, el);
  }
  // What is not appearance stays the element's own.
  assert.equal(themed(c, 'lower').template, c.lower.template);
  assert.equal(themed(c, 'card').title, c.card.title);
  // Own appearance: the theme no longer reaches it.
  c.card.custom = true;
  assert.deepEqual(themed(c, 'card').fill, c.card.fill);
  assert.equal(themed(c, 'card').radius, c.card.radius);
  assert.deepEqual(themed(c, 'top').fill, c.theme.surface);
  // The logo has no themed look.
  assert.equal(themed(c, 'bug'), c.bug);
});

test('theme settings are validated like the rest', () => {
  const c = cleanConfig({
    theme: { main: { type: 'nope', a: 'red' }, radius: 999, shadow: 'laser', text1: '#123456' },
    lower: { custom: 'yes' },
    card: { custom: true },
    setupDone: 1,
  });
  assert.equal(c.theme.main.type, defaults().theme.main.type);
  assert.equal(c.theme.radius, 80);
  assert.equal(c.theme.shadow, 'soft');
  assert.equal(c.theme.text1, '#123456');
  assert.equal(c.lower.custom, false);
  assert.equal(c.card.custom, true);
  assert.equal(c.setupDone, false);
});

test('the contribution QR and its text depend on the method', () => {
  const c = defaults();
  c.pix.key = 'a@b.c';
  assert.match(givingQr(c), /^\/api\/qr\.svg\?kind=giving/);
  assert.equal(givingText(c), 'a@b.c');
  c.giving.method = 'sepa';
  c.giving.sepa.iban = 'pt50000201231234567890154';
  assert.equal(givingText(c), 'PT50 0002 0123 1234 5678 9015 4');
  c.giving.method = 'link';
  c.giving.link = 'https://igreja.example/doar/';
  assert.equal(givingText(c), 'igreja.example/doar');
  c.giving.method = 'image';
  c.giving.image = '/media/0123456789abcdef.png';
  assert.equal(givingQr(c), '/media/0123456789abcdef.png');
  // A payment app: its name and the number that receives; the QR only if one was uploaded.
  c.giving.method = 'app';
  c.giving.app = { name: 'Bizum', id: '01234' };
  assert.equal(givingText(c), 'Bizum: 01234');
  assert.equal(givingQr(c), '/media/0123456789abcdef.png');
  c.giving.image = '';
  assert.equal(givingQr(c), '');
  c.giving.method = 'text';
  c.giving.details = 'Banco 000\nConta 1';
  assert.equal(givingQr(c), '');
  assert.equal(givingText(c), 'Banco 000\nConta 1');
});

test('a QR code is only drawn in a color dark enough to scan', () => {
  assert.equal(qrInk('#071a38'), '#071a38');
  assert.equal(qrInk('#ffffff'), '');
  assert.equal(qrInk('#f0e2b0'), '');
  assert.equal(qrInk('navy'), '');
  assert.match(qrUrl('url', 'https://example.org', { dark: '#071a38' }), /dark=%23071a38/);
  assert.doesNotMatch(qrUrl('url', 'https://example.org', { dark: 'red' }), /dark=/);
});

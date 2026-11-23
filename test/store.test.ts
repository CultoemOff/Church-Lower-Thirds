import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanConfig,
  cleanLive,
  defaults,
  liveDefaults,
  resolveItem,
} from '../src/server/store.js';

test('an empty or broken file yields the defaults', () => {
  assert.deepEqual(cleanConfig(undefined), defaults());
  assert.deepEqual(cleanConfig({ lower: 'x', top: null, nope: 1 }), defaults());
});

test('values are kept when valid and fall back when not', () => {
  const c = cleanConfig({
    brand: { name: 'Igreja', logo: 'http://evil/x.png', font: 'Montserrat"; } body { x' },
    lower: {
      template: 'neon',
      animation: 'explode',
      size: 9999,
      opacity: -5,
      text1: 'red',
      uppercase: 'yes',
      fill: { type: 'gradient', a: '#112233', b: '#445566', angle: 725 },
      accent: { type: 'weird', a: 'blue' },
    },
    card: { position: 'center', qr: 'url', qrText: 'https://igreja.org' },
    bug: { position: 'center' },
  });
  assert.equal(c.brand.name, 'Igreja');
  assert.equal(c.brand.logo, '');
  assert.equal(c.brand.font, 'Montserrat  body  x');
  assert.equal(c.lower.template, 'neon');
  assert.equal(c.lower.animation, 'slide');
  assert.equal(c.lower.size, 250);
  assert.equal(c.lower.opacity, 0);
  assert.equal(c.lower.text1, '#ffffff');
  assert.equal(c.lower.uppercase, false);
  assert.deepEqual(c.lower.fill, { type: 'gradient', a: '#112233', b: '#445566', angle: 360 });
  assert.deepEqual(c.lower.accent, defaults().lower.accent);
  assert.equal(c.card.position, 'center');
  assert.equal(c.card.qr, 'url');
  assert.equal(c.bug.position, 'top-right');
  assert.equal(
    cleanConfig({ brand: { logo: '/media/0123456789abcdef.png' } }).brand.logo,
    '/media/0123456789abcdef.png',
  );
});

test('names: empty ones are dropped, ids are unique, QR kind is checked', () => {
  const c = cleanConfig({
    lower: {
      items: [
        { id: 'abcd', line1: ' Ana ', line2: 'Louvor', qr: 'pix' },
        { id: 'abcd', line1: 'Duplicado' },
        { line1: '', line2: '' },
        { line1: 'Sem id', qr: 'bitcoin', logo: false },
        'lixo',
      ],
    },
    top: { messages: ['  Oi  ', '', 7, 'x'.repeat(500)] },
  });
  assert.equal(c.lower.items.length, 2);
  assert.deepEqual(c.lower.items[0], {
    id: 'abcd',
    line1: 'Ana',
    line2: 'Louvor',
    logo: true,
    qr: 'pix',
    qrText: '',
  });
  assert.match(c.lower.items[1].id, /^[a-f0-9]{10}$/);
  assert.equal(c.lower.items[1].qr, 'none');
  assert.equal(c.lower.items[1].logo, false);
  assert.deepEqual(c.top.messages.slice(0, 2), ['Oi', '7']);
  assert.equal(c.top.messages[2].length, 200);
});

test('commands find a name by id, by position, or next / previous', () => {
  const c = cleanConfig({
    lower: {
      items: [
        { id: 'aaaa', line1: 'A' },
        { id: 'bbbb', line1: 'B' },
        { id: 'cccc', line1: 'C' },
      ],
    },
  });
  const live = liveDefaults();
  assert.equal(resolveItem(c, live, undefined)?.id, 'aaaa');
  assert.equal(resolveItem(c, live, 'next')?.id, 'aaaa');
  live.lower.item = 'cccc';
  assert.equal(resolveItem(c, live, 'next')?.id, 'aaaa');
  assert.equal(resolveItem(c, live, 'prev')?.id, 'bbbb');
  assert.equal(resolveItem(c, live, '2')?.id, 'bbbb');
  assert.equal(resolveItem(c, live, 'bbbb')?.id, 'bbbb');
  assert.equal(resolveItem(c, live, '9'), undefined);
  assert.equal(resolveItem(cleanConfig({ lower: { items: [] } }), live, 'next'), undefined);
});

test('a name that no longer exists is not left on air', () => {
  const c = cleanConfig({ lower: { items: [{ id: 'aaaa', line1: 'A' }] } });
  assert.deepEqual(cleanLive({ lower: { on: true, item: 'zzzz' }, top: { on: 1 } }, c), {
    lower: { on: false, item: '' },
    top: { on: true },
    card: { on: false },
    bug: { on: false },
  });
  assert.equal(cleanLive({ lower: { on: true, item: 'aaaa' } }, c).lower.on, true);
});

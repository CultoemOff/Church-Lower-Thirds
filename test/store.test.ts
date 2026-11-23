import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanConfig,
  cleanLive,
  defaults,
  findItem,
  resolveSocial,
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
  assert.deepEqual(
    cleanLive(
      { lower: { on: true, item: 'zzzz' }, top: { on: 1 }, social: { on: true, item: 'nope' } },
      c,
    ),
    {
      lower: { on: false, item: '' },
      top: { on: true },
      card: { on: false },
      bug: { on: false },
      ticker: { on: false },
      agenda: { on: false },
      social: { on: false, item: '' },
    },
  );
  assert.equal(cleanLive({ lower: { on: true, item: 'aaaa' } }, c).lower.on, true);
  assert.equal(
    cleanLive({ agenda: { on: true } }, cleanConfig({ agenda: { days: [] } })).agenda.on,
    false,
  );
});

test('a name typed in the dock ("quick") is on air only while it has text', () => {
  const empty = cleanConfig({});
  assert.equal(findItem(empty, 'quick'), undefined);
  assert.equal(cleanLive({ lower: { on: true, item: 'quick' } }, empty).lower.on, false);
  const c = cleanConfig({ lower: { quick: { id: 'x', line1: ' Visitante ', line2: '' } } });
  assert.deepEqual(c.lower.quick, {
    id: 'quick',
    line1: 'Visitante',
    line2: '',
    logo: true,
    qr: 'none',
    qrText: '',
  });
  assert.equal(resolveItem(c, liveDefaults(), 'quick')?.line1, 'Visitante');
  assert.equal(cleanLive({ lower: { on: true, item: 'quick' } }, c).lower.on, true);
});

test('agenda days, social networks and saved QR cards are cleaned', () => {
  const c = cleanConfig({
    agenda: {
      seconds: 999,
      days: [
        { day: ' Domingo ', lines: '9h\n\n 18h \n' + 'x\n'.repeat(10) },
        { day: '', lines: '' },
      ],
    },
    social: {
      items: [
        { network: 'instagram', label: 'Instagram', handle: ' @igreja ', icon: 'http://x/y.png' },
        { network: 'myspace', handle: 'igreja.org', icon: '/media/0123456789abcdef.png' },
        { network: 'youtube', handle: '' },
      ],
    },
    card: {
      saved: [
        { title: 'Site', qr: 'url', qrText: 'https://igreja.org' },
        { title: '', qrText: '' },
        { title: 'PIX', qr: 'x' },
      ],
    },
    ticker: { template: 'liquid', speed: 5, messages: ['a', ''] },
  });
  assert.equal(c.agenda.seconds, 120);
  assert.equal(c.agenda.days.length, 1);
  assert.equal(c.agenda.days[0].day, 'Domingo');
  assert.equal(c.agenda.days[0].lines.split('\n').length, 6);
  assert.deepEqual(
    c.social.items.map((i) => [i.network, i.handle, i.icon]),
    [
      ['instagram', '@igreja', ''],
      ['other', 'igreja.org', '/media/0123456789abcdef.png'],
    ],
  );
  assert.deepEqual(
    c.card.saved.map((s) => [s.title, s.qr]),
    [
      ['Site', 'url'],
      ['PIX', 'pix'],
    ],
  );
  assert.equal(c.ticker.template, 'liquid');
  assert.equal(c.ticker.speed, 20);
  assert.deepEqual(c.ticker.messages, ['a']);
  const live = liveDefaults();
  assert.equal(resolveSocial(c, live, undefined)?.handle, '@igreja');
  assert.equal(resolveSocial(c, live, '2')?.handle, 'igreja.org');
  assert.equal(resolveSocial(c, live, '7'), undefined);
});

test('dragged elements keep their place inside the screen; the corner badge has its own models', () => {
  const c = cleanConfig({
    lower: { free: true, x: 5000, y: -900 },
    top: { template: 'full', position: 'bottom-right', showLive: false, liveText: 'NO AR' },
    bug: { free: 'yes', x: 12.6 },
  });
  assert.deepEqual([c.lower.free, c.lower.x, c.lower.y], [true, 1900, -300]);
  assert.equal(c.top.template, 'bar');
  assert.deepEqual(
    [c.top.position, c.top.showLive, c.top.liveText],
    ['bottom-right', false, 'NO AR'],
  );
  assert.deepEqual([c.bug.free, c.bug.x], [false, 13]);
});

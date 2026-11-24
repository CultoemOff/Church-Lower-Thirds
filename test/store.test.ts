import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addProfile,
  cleanConfig,
  cleanLive,
  defaults,
  findItem,
  firstConfig,
  liveDefaults,
  removeProfile,
  resolveItem,
  resolveSocial,
  useProfile,
} from '../src/server/store.js';

test('an empty or broken file yields the defaults', () => {
  // The defaults, plus the first service profile (made from them).
  const first = (c: ReturnType<typeof defaults>) => ({ ...c, profiles: [] });
  assert.deepEqual(first(cleanConfig(undefined)), defaults());
  assert.deepEqual(first(cleanConfig({ lower: 'x', top: null, nope: 1 })), defaults());
  assert.deepEqual(
    cleanConfig(undefined).profiles.map((p) => [p.id, p.name]),
    [['padrao', 'Perfil 1']],
  );
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
    // 'pix' is how versions that only knew PIX stored the church's contribution QR.
    qr: 'giving',
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
      {
        lower: { on: true, item: 'zzzz' },
        top: { on: 1 },
        card: { pin: 'yes' },
        social: { on: true, item: 'nope' },
      },
      c,
    ),
    {
      lower: { on: false, item: '', pin: false },
      top: { on: true },
      // Pinned in the dock: it ignores the global time. The pin survives a restart.
      card: { on: false, pin: true },
      bug: { on: false },
      ticker: { on: false },
      agenda: { on: false, pin: false },
      social: { on: false, item: '', pin: false },
      comment: { on: false, pin: false },
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
      ['PIX', 'giving'],
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

test('a category switched off cannot stay on air', () => {
  const c = cleanConfig({
    enabled: { ticker: false, social: 'no' },
    social: { items: [{ id: 'rede', handle: '@x' }] },
  });
  assert.equal(c.enabled.ticker, false);
  assert.equal(c.enabled.social, true);
  assert.equal(c.enabled.lower, true);
  const live = cleanLive(
    { ticker: { on: true }, top: { on: true }, social: { on: true, item: 'rede' } },
    c,
  );
  assert.deepEqual([live.ticker.on, live.top.on, live.social.on], [false, true, true]);
});

test('giving: PIX is one method among others, and old settings carry over', () => {
  const d = cleanConfig({});
  assert.equal(d.giving.method, 'pix');
  assert.equal(d.card.qr, 'giving');
  // Settings saved before the other methods existed.
  const old = cleanConfig({
    pix: { key: 'a@b.c', display: 'CNPJ 12.345.678/0001-90' },
    card: { qr: 'pix' },
  });
  assert.equal(old.giving.details, 'CNPJ 12.345.678/0001-90');
  assert.equal(old.card.qr, 'giving');
  assert.equal('display' in old.pix, false);
  const c = cleanConfig({
    giving: {
      method: 'bitcoin',
      link: 'https://example.org/give',
      image: 'https://evil.example/qr.png',
      sepa: { name: 'Igreja', iban: 'PT50 0002 0123 1234 5678 9015 4', nope: 1 },
      details: ' Banco 000 \n\n Conta 123 \n' + 'x\n'.repeat(20),
    },
  });
  assert.equal(c.giving.method, 'pix');
  assert.equal(c.giving.link, 'https://example.org/give');
  assert.equal(c.giving.image, '', 'only images uploaded to the program');
  assert.equal(c.giving.sepa.iban, 'PT50 0002 0123 1234 5678 9015 4');
  assert.equal('nope' in c.giving.sepa, false);
  assert.equal(c.giving.details.split('\n').length, 6);
  assert.equal(c.giving.details.split('\n')[1], 'Conta 123');
  assert.equal(cleanConfig({ giving: { method: 'text' } }).giving.method, 'text');
  // Outside Brazil a first run does not start on PIX.
  assert.equal(firstConfig('pt-BR').giving.method, 'pix');
  // ...but on what its main country uses: a phone-number app, a SEPA transfer or a link.
  assert.deepEqual(
    ['pt-PT', 'es', 'it', 'de', 'en'].map((l) => {
      const g = firstConfig(l).giving;
      return [g.method, g.app.name];
    }),
    [
      ['app', 'MB WAY'],
      ['app', 'Bizum'],
      ['app', 'BANCOMAT Pay'],
      ['sepa', 'Wero'],
      ['link', 'Zelle'],
    ],
  );
});

test('social: an own phrase per item, new kinds, and all of them in sequence', () => {
  const c = cleanConfig({
    social: {
      template: 'plaque',
      seconds: 999,
      counter: 'no',
      items: [
        {
          network: 'address',
          label: 'Endereço',
          handle: 'Rua Um, 10',
          text: ' Venha nos visitar! ',
        },
        { network: 'bitcoin', handle: '@x' },
      ],
    },
  });
  assert.equal(c.social.template, 'plaque');
  assert.equal(c.social.seconds, 120);
  assert.equal(c.social.counter, true);
  assert.deepEqual(
    c.social.items.map((i) => [i.network, i.text]),
    [
      ['address', 'Venha nos visitar!'],
      ['other', ''],
    ],
  );
  // "all" stands for every item, one after the other.
  const off = cleanLive({}, c);
  assert.equal(resolveSocial(c, off, 'all')?.id, 'all');
  const on = cleanLive({ social: { on: true, item: 'all' } }, c);
  assert.deepEqual(on.social, { on: true, item: 'all', pin: false });
  assert.equal(resolveSocial(c, on, undefined)?.id, 'all');
  assert.equal(resolveSocial(c, on, '2')?.handle, '@x');
  // With nothing to show there is no sequence either.
  const empty = cleanConfig({ social: { items: [] } });
  empty.social.items = [];
  assert.equal(resolveSocial(empty, cleanLive({}, empty), 'all'), undefined);
  assert.equal(cleanLive({ social: { on: true, item: 'all' } }, empty).social.on, false);
  // The plaque model exists for names and for the QR card too.
  assert.equal(
    cleanConfig({ lower: { template: 'plaque' }, card: { template: 'plaque' } }).card.template,
    'plaque',
  );
});

test('corner badge: date and day of the week each have a switch; old settings keep both', () => {
  const fresh = defaults().top;
  assert.equal(fresh.showDate, false);
  assert.equal(fresh.showWeekday, false);
  assert.equal(fresh.dateStyle, 'short');
  // "Date under the time" used to show the day of the week too.
  assert.equal(cleanConfig({ top: { showDate: true } }).top.showWeekday, true);
  assert.equal(cleanConfig({ top: { showDate: true, showWeekday: false } }).top.showWeekday, false);
  assert.equal(cleanConfig({ top: { showDate: false } }).top.showWeekday, false);
  assert.equal(cleanConfig({ top: { dateStyle: 'nope' } }).top.dateStyle, 'short');
  assert.equal(cleanConfig({ top: { dateStyle: 'long' } }).top.dateStyle, 'long');
});

test('service profiles: each keeps a whole look; the texts are the same in all of them', () => {
  let c = cleanConfig(undefined);
  c.theme.radius = 3;
  c.brand.logo = '/media/aaaaaaaaaaaaaaaa.png';
  c.lower.template = 'news';
  c.lower.items[0].line1 = 'Maria';
  // A new profile starts as a copy of the look in use and becomes the one in use.
  c = addProfile(c, '  Natal  ');
  assert.deepEqual(
    c.profiles.map((p) => p.name),
    ['Perfil 1', 'Natal'],
  );
  assert.equal(c.profile, c.profiles[1].id);
  c.theme.radius = 40;
  c.brand.logo = '/media/bbbbbbbbbbbbbbbb.png';
  c.lower.template = 'floral';
  c.top.showDate = true;
  c.lower.items[0].line1 = 'José';
  // Back to the first: its look returns, the names stay as they are now.
  c = useProfile(c, 'perfil 1');
  assert.equal(c.profile, 'padrao');
  assert.equal(c.theme.radius, 3);
  assert.equal(c.brand.logo, '/media/aaaaaaaaaaaaaaaa.png');
  assert.equal(c.lower.template, 'news');
  assert.equal(c.top.showDate, false);
  assert.equal(c.lower.items[0].line1, 'José');
  // And to the second, by its position: what was changed there was kept.
  c = useProfile(c, '2');
  assert.equal(c.theme.radius, 40);
  assert.equal(c.brand.logo, '/media/bbbbbbbbbbbbbbbb.png');
  assert.equal(c.lower.template, 'floral');
  assert.equal(c.top.showDate, true);
  // Everything survives a save and a reload.
  assert.deepEqual(cleanConfig(JSON.parse(JSON.stringify(c))), c);
  assert.throws(() => useProfile(c, 'nope'), /Profile not found/);
  assert.throws(() => addProfile(c, '   '), /Type a name/);
  // Removing the one in use moves to another; the last one cannot be removed.
  c = removeProfile(c, 'Natal');
  assert.equal(c.profile, 'padrao');
  assert.equal(c.theme.radius, 3);
  assert.equal(c.profiles.length, 1);
  assert.throws(() => removeProfile(c, 'padrao'), /last profile/);
  // A broken list is repaired: there is always one profile, and one in use.
  const fixed = cleanConfig({
    profile: 'x',
    profiles: [{ id: '!!', name: '' }, 7, { name: 'Só nome' }],
  });
  assert.equal(fixed.profiles.length, 1);
  assert.equal(fixed.profiles[0].name, 'Só nome');
  assert.equal(fixed.profile, fixed.profiles[0].id);
});

test('comments: typed by hand, kept in a list, on air only while there is a text', () => {
  const c = cleanConfig({
    comment: {
      user: ' @maria ',
      said: 'Amém!',
      template: 'nope',
      saved: [{ user: 'João', text: ' Glória a Deus ' }, { user: 'x', text: '' }, 5],
    },
  });
  assert.equal(c.comment.template, 'bubble');
  assert.equal(c.comment.said, 'Amém!');
  assert.deepEqual(
    c.comment.saved.map((s) => [s.user, s.text]),
    [['João', 'Glória a Deus']],
  );
  const live = liveDefaults();
  live.comment.on = true;
  assert.equal(cleanLive(live, c).comment.on, true);
  c.comment.said = '  ';
  assert.equal(cleanLive(live, c).comment.on, false);
  // An offering with its own PIX key is one of the kinds of a saved QR card.
  const o = cleanConfig({
    card: {
      qr: 'pixkey',
      qrText: 'missoes@igreja.org',
      saved: [
        { title: 'Missões', qr: 'pixkey', qrText: 'a@b.c' },
        { title: 'Site', qr: 'zzz' },
      ],
    },
  });
  assert.equal(o.card.qr, 'pixkey');
  assert.deepEqual(
    o.card.saved.map((s) => s.qr),
    ['pixkey', 'giving'],
  );
});

test('the first profile is called "Perfil 1"; the old default name is brought up to date', () => {
  const old = JSON.parse(JSON.stringify(cleanConfig(undefined)));
  old.profiles[0].name = 'Culto padrão';
  assert.equal(cleanConfig(old).profiles[0].name, 'Perfil 1');
  // A name the person gave stays, even on the first profile, and so does that old name on
  // a profile they created.
  old.profiles[0].name = 'Culto de domingo';
  old.profiles.push({ id: 'abcd1234', name: 'Culto padrão', look: old.profiles[0].look });
  assert.deepEqual(
    cleanConfig(old).profiles.map((p) => p.name),
    ['Culto de domingo', 'Culto padrão'],
  );
});

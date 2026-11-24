import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanConfig, defaults } from '../src/server/store.js';
import {
  // @ts-expect-error browser module without type declarations
  dateText,
  decorFor,
  decorName,
  DECORS,
  givingQr,
  givingText,
  qrInk,
  qrUrl,
  themed,
  THEMED_ELEMENTS,
} from '../src/web/js/look.js';
// @ts-expect-error browser module without type declarations
import { applyModel, MODELS, modelTemplate, ownColors, PALETTES } from '../src/web/js/models.js';

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

test('ready-made models: each one is complete, suggests existing colors and is saved as it is', () => {
  const ids = MODELS.map((m: { id: string }) => m.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(MODELS.filter((m: { themed?: boolean }) => m.themed).length >= 9);
  for (const model of MODELS) {
    assert.ok(
      PALETTES.some((p: unknown[]) => p[0] === model.palette),
      `${model.id}: colors "${model.palette}"`,
    );
    if (model.decor) assert.ok(DECORS.includes(model.decor), `${model.id}: drawing`);
    const c = defaults();
    assert.equal(applyModel(c, model), false, `${model.id}: suggested colors`);
    // Nothing a model sets is refused or changed by the server.
    assert.deepEqual({ ...cleanConfig(structuredClone(c)), profiles: [] }, c, model.id);
    for (const el of THEMED_ELEMENTS)
      assert.equal(c[el as 'lower'].template, modelTemplate(model, el), `${model.id}: ${el}`);
    assert.equal(c.theme.suggested, model.palette);
    assert.deepEqual(
      [c.theme.main, c.theme.surface, c.theme.accent, c.theme.text1, c.theme.text2],
      PALETTES.find((p: unknown[]) => p[0] === model.palette).slice(1, 6),
      `${model.id}: colors`,
    );
    assert.equal(c.theme.decor, model.decor || '');
    assert.equal(c.brand.font, model.font);
  }
  // Two models may share shapes and font: then the drawing tells them apart.
  const look = (m: { font: string; decor?: string; templates: object }) =>
    JSON.stringify([m.font, m.decor || '', m.templates]);
  // Comments follow the family of the model.
  const comment = (id: string) =>
    modelTemplate(
      MODELS.find((m: { id: string }) => m.id === id),
      'comment',
    );
  assert.deepEqual(['institutional', 'news', 'liquid', 'kids', 'egypt'].map(comment), [
    'bubble',
    'card',
    'liquid',
    'kids',
    'floral',
  ]);
  assert.equal(new Set(MODELS.map(look)).size, MODELS.length);
});

test('drawings of the themed models: the usual one, the one picked in the theme, or none', () => {
  const c = defaults();
  assert.equal(decorFor(c, 'lower', 'classic'), '');
  assert.match(decorFor(c, 'lower', 'floral'), /^<svg[^>]*viewBox="0 0 200 170"/);
  assert.match(decorFor(c, 'top', 'kids'), /^<svg[^>]*viewBox="0 0 100 100"/);
  // The card shows two: a big one on a corner and a small one on the opposite corner.
  assert.equal(decorFor(c, 'card', 'floral').match(/<svg/g)?.length, 2);
  // The block model has no room on the corner badge.
  assert.equal(decorFor(c, 'top', 'youth'), '');
  const usual = decorFor(c, 'lower', 'kids');
  c.theme.decor = 'xmaskids';
  assert.notEqual(decorFor(c, 'lower', 'kids'), usual);
  c.theme.decor = 'none';
  assert.equal(decorFor(c, 'lower', 'kids'), '');
  assert.equal(cleanConfig({ theme: { decor: 'nope' } }).theme.decor, '');
  assert.equal(cleanConfig({ theme: { decor: 'easter' } }).theme.decor, 'easter');
  // A drawing with its own proportions (the sun and pyramids of "Natal no Egito").
  c.theme.decor = 'egypt';
  // The name plate and the card show the complete logo; the badge, the sun and pyramids.
  assert.match(decorFor(c, 'lower', 'floral'), /^<svg[^>]*viewBox="0 0 300 189.24"/);
  assert.match(decorFor(c, 'top', 'floral'), /^<svg[^>]*viewBox="0 0 200 106.33"/);
  assert.equal(decorName(c, 'floral'), 'egypt');
  assert.equal(decorName(c, 'classic'), '');
  for (const name of DECORS)
    assert.equal(cleanConfig({ theme: { decor: name } }).theme.decor, name);
});

test('date of the corner badge: day of the week, date or both, in three styles', () => {
  const day = new Date(2026, 10, 24, 12);
  const both = { showDate: true, showWeekday: true };
  assert.equal(dateText(day, 'pt-BR', { ...both, dateStyle: 'short' }), 'ter, 24 de nov');
  assert.equal(
    dateText(day, 'pt-BR', { ...both, dateStyle: 'long' }),
    'terça-feira, 24 de novembro',
  );
  assert.equal(dateText(day, 'pt-BR', { ...both, dateStyle: 'numeric' }), 'ter, 24/11/2026');
  assert.equal(
    dateText(day, 'pt-BR', { showDate: true, showWeekday: false, dateStyle: 'numeric' }),
    '24/11/2026',
  );
  // By itself the day of the week is written in full.
  assert.equal(
    dateText(day, 'pt-BR', { showDate: false, showWeekday: true, dateStyle: 'short' }),
    'terça-feira',
  );
  assert.equal(dateText(day, 'en-US', { ...both, dateStyle: 'long' }), 'Tuesday, November 24');
  assert.equal(
    dateText(day, 'pt-BR', { showDate: false, showWeekday: false, dateStyle: 'short' }),
    '',
  );
});

test('another model keeps the colors the user chose', () => {
  const model = (id: string) => MODELS.find((m: { id: string }) => m.id === id),
    [first, second, third] = MODELS.filter((m: { glass?: boolean }) => !m.glass),
    glass = MODELS.find((m: { glass?: boolean }) => m.glass),
    colors = (c: ReturnType<typeof defaults>) =>
      JSON.stringify([c.theme.main, c.theme.surface, c.theme.accent, c.theme.text1, c.theme.text2]);
  assert.ok(model(first.id) && glass && first.palette !== second.palette);

  // Untouched: every model brings the colors it suggests.
  const c = defaults();
  assert.equal(ownColors(c), false);
  applyModel(c, first);
  assert.equal(applyModel(c, second), false);
  assert.equal(c.theme.suggested, second.palette);

  // One color changed by hand: the colors stay, the format of the other model comes.
  c.theme.accent = { type: 'solid', a: '#ff0066', b: '#ff0066', angle: 90 };
  c.theme.text1 = '#fafafa';
  c.card.custom = true;
  c.card.accent = { type: 'solid', a: '#00aa55', b: '#00aa55', angle: 90 };
  const mine = colors(c);
  assert.equal(ownColors(c), true);
  for (const m of [third, first, glass]) {
    assert.equal(applyModel(c, m), true, m.id);
    assert.equal(colors(c), mine, m.id);
    assert.equal(c.lower.template, modelTemplate(m, 'lower'));
    assert.equal(c.theme.radius, m.radius);
    assert.equal(c.brand.font, m.font);
    // An element with its own appearance keeps it.
    assert.equal(c.card.custom, true);
    assert.equal(c.card.accent.a, '#00aa55');
    assert.equal(c.card.template, modelTemplate(m, 'card'));
  }
  // The server keeps what tells the two cases apart.
  assert.equal(cleanConfig(structuredClone(c)).theme.suggested, glass.palette);

  // Other ready-made colors, picked by the user, also stay.
  const other = PALETTES.find(
    (p: unknown[]) => !p[6] && ![first.palette, second.palette, third.palette].includes(p[0]),
  );
  applyModel(c, first, { reset: true });
  assert.equal(ownColors(c), false);
  assert.equal(c.card.custom, false);
  [, c.theme.main, c.theme.surface, c.theme.accent, c.theme.text1, c.theme.text2] =
    structuredClone(other);
  assert.equal(applyModel(c, second), true);
  assert.equal(colors(c), JSON.stringify(other.slice(1, 6)));
  // Back to the suggested ones by choosing them: the next model brings its own again.
  applyModel(c, second, { reset: true });
  assert.equal(applyModel(c, third), false);
  assert.equal(
    colors(c),
    JSON.stringify(PALETTES.find((p: unknown[]) => p[0] === third.palette).slice(1, 6)),
  );

  // Colors made for glass do not go along to a solid model.
  const onGlass = PALETTES.find((p: unknown[]) => p[6] && p[0] !== glass.palette);
  if (onGlass) {
    applyModel(c, glass, { reset: true });
    [, c.theme.main, c.theme.surface, c.theme.accent, c.theme.text1, c.theme.text2] =
      structuredClone(onGlass);
    assert.equal(ownColors(c), true);
    assert.equal(applyModel(c, first), false);
  }

  // Settings from before: colors changed by hand count as chosen, ready-made ones do not.
  const old = defaults();
  old.theme.suggested = '';
  assert.equal(ownColors(old), false);
  old.theme.main = { type: 'solid', a: '#112233', b: '#112233', angle: 90 };
  assert.equal(applyModel(old, second), true);
  assert.equal(old.theme.main.a, '#112233');
});

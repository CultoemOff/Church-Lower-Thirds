import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanConfig, customCovers, defaults } from '../src/server/store.js';
// @ts-expect-error plain browser module
import { applyCustom, customCovers as covers, selectors } from '../src/web/js/custom.js';
// @ts-expect-error plain browser module
import { applyModel, MODELS } from '../src/web/js/models.js';

const CSS = `/* .agenda is only named in a comment */
.lower .box { background: var(--fill); }
.top .part.live, .el.card .box { border-radius: 4px; }
@media (min-width: 10px) { .comment .said { font-style: italic; } }
.lowercase, .topper .x, body .social { color: red; }`;

test('the elements a custom CSS draws are the ones its selectors start with', () => {
  const want = ['lower', 'top', 'card', 'comment'];
  assert.deepEqual(customCovers(CSS), want);
  // The page and the server must agree, or an element would be left without a look.
  assert.deepEqual(covers(CSS), want);
  assert.deepEqual(covers(''), []);
  assert.deepEqual(selectors('.a, .b:is(.c, .d) > e[x="1,2"], .f'), [
    '.a',
    '.b:is(.c, .d) > e[x="1,2"]',
    '.f',
  ]);
});

test('custom models are kept clean, and elements only stay on "custom" while one draws them', () => {
  const raw = JSON.parse(JSON.stringify(defaults()));
  raw.customModels = [
    { id: 'abcd1234', name: '  Faixas  ', css: CSS + '</style><script>x</script>' },
    { id: 'abcd1234', name: 'Repetido', css: '.lower{}' },
    { id: 'no id!', name: 'Outro', css: '.ticker .box { opacity: 1 }' },
    { id: 'zzzz9999', name: '', css: '.lower{}' },
    { id: 'yyyy9999', name: 'Vazio', css: '   ' },
    'nothing',
  ];
  raw.theme.custom = 'abcd1234';
  for (const el of ['lower', 'top', 'ticker', 'card', 'agenda', 'social', 'comment'])
    raw[el].template = 'custom';
  const c = cleanConfig(raw);
  assert.deepEqual(
    c.customModels.map((m) => m.name),
    ['Faixas', 'Outro'],
  );
  assert.ok(!c.customModels[0].css.includes('<'));
  assert.match(c.customModels[1].id, /^[a-z0-9]{4,20}$/);
  assert.equal(c.theme.custom, 'abcd1234');
  // Drawn by the model: stay. Not drawn: back to the usual template of the element.
  const usual = defaults();
  assert.deepEqual(
    [c.lower.template, c.top.template, c.card.template, c.comment.template],
    ['custom', 'custom', 'custom', 'custom'],
  );
  assert.equal(c.ticker.template, usual.ticker.template);
  assert.equal(c.agenda.template, usual.agenda.template);
  assert.equal(c.social.template, usual.social.template);
  // Cleaning twice changes nothing.
  assert.deepEqual(cleanConfig(structuredClone(c)), c);

  // The model is gone (deleted, or a backup from elsewhere): nothing stays on "custom".
  const gone = structuredClone(c);
  gone.customModels = [];
  const after = cleanConfig(gone);
  assert.equal(after.theme.custom, '');
  assert.equal(after.lower.template, usual.lower.template);
  // Too long a CSS is cut, never refused whole.
  raw.customModels = [{ id: 'abcd1234', name: 'Longo', css: '.lower{}'.repeat(20000) }];
  assert.equal(cleanConfig(raw).customModels[0].css.length, 60000);
});

test('putting a custom model on changes only what it draws; a ready-made model takes over', () => {
  const c = defaults();
  applyModel(c, MODELS[3]);
  const before = structuredClone(c);
  const model = { id: 'abcd1234', name: 'Faixas', css: CSS };
  c.customModels.push(model);
  assert.deepEqual(applyCustom(c, model), ['lower', 'top', 'card', 'comment']);
  assert.equal(c.theme.custom, 'abcd1234');
  assert.equal(c.lower.template, 'custom');
  assert.equal(c.ticker.template, before.ticker.template);
  // Colors, font and shape of the theme stay as they were.
  assert.deepEqual({ ...c.theme, custom: '' }, { ...before.theme, custom: '' });
  assert.equal(c.brand.font, before.brand.font);
  // Another custom model that draws less: what it leaves goes to the template given.
  const small = { id: 'efgh5678', name: 'Só nomes', css: '.lower .box { border: 0 }' };
  applyCustom(c, small, { top: 'bar', card: 'vertical', comment: 'bubble' });
  assert.deepEqual(
    [c.lower.template, c.top.template, c.card.template],
    ['custom', 'bar', 'vertical'],
  );
  // The server accepts it as it is.
  c.customModels.push(small);
  assert.equal(cleanConfig(structuredClone(c)).lower.template, 'custom');
  applyModel(c, MODELS[0]);
  assert.equal(c.theme.custom, '');
  assert.notEqual(c.lower.template, 'custom');
});

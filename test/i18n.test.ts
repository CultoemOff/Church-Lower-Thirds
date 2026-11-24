import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import en from '../src/web/js/i18n/en.js';
import es from '../src/web/js/i18n/es.js';
import it from '../src/web/js/i18n/it.js';
import de from '../src/web/js/i18n/de.js';
import ptPT from '../src/web/js/i18n/pt-PT.js';

const keys: string[] = JSON.parse(
  readFileSync(new URL('../i18n/keys.json', import.meta.url), 'utf8'),
);
const marks = (s: string) => (s.match(/\{\w+\}/g) || []).sort().join();

test('every text has an English, Spanish, Italian and German translation', () => {
  assert.ok(keys.length > 400);
  for (const [name, dict] of Object.entries({ en, es, it, de }) as [
    string,
    Record<string, string>,
  ][]) {
    assert.deepEqual(Object.keys(dict).sort(), [...keys].sort(), name);
    for (const k of keys) {
      assert.ok(dict[k].trim(), `${name}: "${k}" is empty`);
      assert.equal(marks(dict[k]), marks(k), `${name}: placeholders of "${k}"`);
    }
  }
});

test('European Portuguese only overrides known texts and uses its own words', () => {
  const pt = ptPT as Record<string, string>;
  for (const k of Object.keys(pt)) assert.ok(keys.includes(k), k);
  assert.equal(pt['Posições na tela'], 'Posições no ecrã');
  assert.equal(pt['Salvar na lista'], 'Guardar na lista');
  assert.equal(pt['Arquivo'], 'Ficheiro');
  for (const v of Object.values(pt)) assert.doesNotMatch(v, /\b(tela|arquivo|você|salvar)\b/i, v);
});

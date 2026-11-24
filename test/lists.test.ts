import { test } from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error plain browser module
import { namesCsv, parseNames, plain, stepChoices, stepText } from '../src/web/js/lists.js';
import { defaults } from '../src/server/store.js';

test('a pasted list or a CSV file becomes names and roles', () => {
  const rows = parseNames(
    [
      '﻿Nome;Cargo',
      'Pr. João Silva; Pastor presidente',
      'Maria Souza - Louvor',
      'Ana\tMídia',
      'Carlos Lima, Diácono',
      '"Silva, Pedro","Presbítero, da sede"',
      'Só Nome',
      '',
      '   ',
      ';sem nome',
    ].join('\r\n'),
  );
  assert.deepEqual(
    rows.map((r: { line1: string; line2: string }) => [r.line1, r.line2]),
    [
      ['Pr. João Silva', 'Pastor presidente'],
      ['Maria Souza', 'Louvor'],
      ['Ana', 'Mídia'],
      ['Carlos Lima', 'Diácono'],
      ['Silva, Pedro', 'Presbítero, da sede'],
      ['Só Nome', ''],
    ],
  );
  assert.deepEqual(parseNames(''), []);
  // What is exported comes back the same.
  const items = [
    { line1: 'Silva; Pedro', line2: 'Disse "amém"' },
    { line1: 'Maria', line2: '' },
  ];
  assert.deepEqual(parseNames(namesCsv(items)), items);
  // Accents and capitals do not get in the way of a search.
  assert.ok(plain('Pr. João CONCEIÇÃO').includes(plain('joao conceicao')));
});

test('the steps of the order of service are named after what they show', () => {
  const c = defaults();
  c.lower.items = [
    { id: 'n1', line1: 'Pr. João', line2: 'Pastor', logo: true, qr: 'none', qrText: '' },
  ];
  c.card.saved = [{ id: 'c1', title: 'Missões', subtitle: '', qr: 'url', qrText: 'https://x.org' }];
  c.comment.saved = [{ id: 'm1', user: '@maria', text: 'Amém' }];
  assert.deepEqual(stepChoices(c, 'lower'), [['n1', 'Pr. João · Pastor']]);
  assert.equal(stepText(c, { kind: 'card', ref: 'c1' }), 'Missões');
  assert.equal(stepText(c, { kind: 'comment', ref: 'm1' }), '@maria: Amém');
  assert.equal(stepText(c, { kind: 'lower', ref: 'gone' }), null);
  assert.equal(stepText(c, { kind: 'countdown', ref: '' }), c.countdown.title);
  assert.ok(stepText(c, { kind: 'hide', ref: '' }));
});

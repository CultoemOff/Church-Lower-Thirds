import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sepaAmount, sepaPayload, validIban } from '../src/server/sepa.js';

test('IBAN check digits', () => {
  // Example IBANs published by the standard bodies.
  for (const ok of [
    'DE89 3704 0044 0532 0130 00',
    'PT50000201231234567890154',
    'gb82 west 1234 5698 7654 32',
    'ES9121000418450200051332',
  ])
    assert.equal(validIban(ok), true, ok);
  for (const bad of ['DE89 3704 0044 0532 0130 01', 'PT5000020123', '', 'BR00', '1234567890123456'])
    assert.equal(validIban(bad), false, bad);
});

test('EPC QR payload: the layout banking apps expect', () => {
  const full = sepaPayload({
    name: 'Igreja Exemplo',
    iban: 'DE89 3704 0044 0532 0130 00',
    bic: 'cobadeffxxx',
    amount: '25,5',
    reference: 'Oferta\ndo culto',
  });
  assert.deepEqual(full.split('\n'), [
    'BCD',
    '002',
    '1',
    'SCT',
    'COBADEFFXXX',
    'Igreja Exemplo',
    'DE89370400440532013000',
    'EUR25.50',
    '',
    '',
    'Oferta do culto',
  ]);
  // Nothing optional: ends at the IBAN, no dangling empty lines.
  assert.equal(
    sepaPayload({ name: 'Igreja Exemplo', iban: 'PT50000201231234567890154' }),
    'BCD\n002\n1\nSCT\n\nIgreja Exemplo\nPT50000201231234567890154',
  );
  assert.ok(Buffer.byteLength(full) <= 331);
});

test('EPC QR payload: refuses what a bank would refuse', () => {
  assert.throws(() => sepaPayload({ name: '', iban: 'DE89370400440532013000' }), /holder name/);
  assert.throws(() => sepaPayload({ name: 'Igreja', iban: 'DE00370400440532013000' }), /IBAN/);
  assert.throws(
    () => sepaPayload({ name: 'Igreja', iban: 'DE89370400440532013000', bic: 'ABC' }),
    /BIC/,
  );
  assert.throws(() => sepaAmount('zero'), /amount/);
  assert.equal(sepaAmount(''), '');
  assert.equal(sepaAmount(10), 'EUR10.00');
});

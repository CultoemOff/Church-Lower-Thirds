import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  crc16,
  normalizeKey,
  pixAmount,
  pixPayload,
  plain,
  validPixPayload,
} from '../src/server/pix.js';

// Example of the Banco Central "Manual de Padrões para Iniciação do Pix".
const BCB =
  '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D';

test('BR Code matches the Banco Central example, CRC included', () => {
  assert.equal(
    pixPayload({
      key: '123e4567-e12b-12d1-a456-426655440000',
      name: 'Fulano de Tal',
      city: 'BRASILIA',
    }),
    BCB,
  );
  assert.equal(crc16(BCB.slice(0, -4)), '1D3D');
  assert.equal(validPixPayload(BCB), true);
  assert.equal(validPixPayload(BCB.slice(0, -1) + 'E'), false);
  assert.equal(validPixPayload('hello'), false);
});

test('keys: CNPJ/CPF as digits, phone with +55, e-mail lower case', () => {
  assert.equal(normalizeKey('12.345.678/0001-90'), '12345678000190');
  assert.equal(normalizeKey('123.456.789-09'), '12345678909');
  assert.equal(normalizeKey('(11) 91234-5678'), '+5511912345678');
  assert.equal(normalizeKey('+55 11 91234-5678'), '+5511912345678');
  assert.equal(normalizeKey(' Tesouraria@Igreja.org '), 'tesouraria@igreja.org');
});

test('name and city lose accents and are cut to the field size; amount and txid are optional', () => {
  assert.equal(
    plain('Igreja Batista Ação & Fé de São José dos Campos', 25),
    'Igreja Batista Acao Fe de',
  );
  const p = pixPayload({
    key: 'tesouraria@igreja.org',
    name: 'Igreja Batista Central',
    city: 'São Paulo',
    amount: '1.234,50',
    txid: 'OFERTA 01',
  });
  assert.match(p, /54071234\.50/);
  assert.match(p, /6009Sao Paulo/);
  assert.match(p, /62120508OFERTA01/);
  assert.equal(validPixPayload(p), true);
  assert.equal(pixAmount(''), '');
  assert.equal(pixAmount('R$ 10'), '10.00');
  assert.throws(() => pixAmount('abc'), /amount/);
  assert.throws(() => pixPayload({ key: ' ', name: 'x', city: 'y' }), /empty/);
});

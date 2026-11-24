import { test } from 'node:test';
import assert from 'node:assert/strict';
import { qrSvg } from '../src/server/qr.js';
import { parseFontList } from '../src/server/fonts.js';

test('QR: one SVG, colors checked, empty and oversized text refused', () => {
  const svg = qrSvg('https://igreja.org/ação', { dark: '#112233', light: 'none', margin: 1 });
  assert.match(svg, /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="0 0 (\d+) \1"/);
  assert.match(svg, /fill="#112233"/);
  assert.doesNotMatch(svg, /<rect width/);
  assert.match(
    qrSvg('x', { dark: 'javascript:alert(1)', light: '"><script>' }),
    /fill="#ffffff"\/><g fill="#000000"/,
  );
  // Round mode keeps the three square finder patterns.
  assert.equal((qrSvg('x', { round: true }).match(/h7v7h-7z/g) || []).length, 3);
  assert.throws(() => qrSvg(''), /empty/);
  assert.throws(() => qrSvg('x'.repeat(1300)), /too long/);
});

test('font list: one family per line, fc-list aliases and hidden fonts dropped, sorted', () => {
  assert.deepEqual(parseFontList('Segoe UI\r\nArial\r\n\r\n@Malgun Gothic\r\narial\r\n'), [
    'Arial',
    'arial',
    'Segoe UI',
  ]);
  assert.deepEqual(parseFontList('Noto Sans,Noto Sans Light:style=Light\n.SF NS\nInter\n'), [
    'Inter',
    'Noto Sans',
  ]);
});

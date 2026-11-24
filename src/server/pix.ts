/**
 * PIX "copia e cola" (BR Code, the EMV merchant-presented QR used by the Banco Central):
 * a static code built from the church's key, so the QR on screen never expires.
 */
export interface PixData {
  key: string;
  /** Receiver name, up to 25 characters */
  name: string;
  /** Receiver city, up to 15 characters */
  city: string;
  /** Optional fixed amount ("10.00"); empty lets the giver type it */
  amount?: string;
  /** Optional identifier, letters and digits, up to 25 */
  txid?: string;
  /** Optional message shown in the giver's bank app */
  description?: string;
}

const field = (id: string, value: string) => id + String(value.length).padStart(2, '0') + value;

/** CRC16-CCITT (polynomial 0x1021, initial value 0xFFFF), as the BR Code manual asks. */
export function crc16(text: string) {
  let crc = 0xffff;
  for (const byte of Buffer.from(text, 'utf8')) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++)
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/** Bank apps reject accents and symbols in the name and city. */
export const plain = (text: string, max: number) =>
  String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 .,\-/]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

/** Phone keys need +55; CPF/CNPJ go as digits only; e-mail and random keys go as typed. */
export function normalizeKey(key: string) {
  const k = String(key ?? '').trim();
  if (k.includes('@')) return k.toLowerCase();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(k))
    return k.toLowerCase();
  if (k.startsWith('+')) return '+' + k.replace(/\D/g, '');
  const digits = k.replace(/\D/g, '');
  // (11) 91234-5678 style: a phone typed with punctuation and no country code
  if (/^\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}$/.test(k) && /[()\s-]/.test(k)) return '+55' + digits;
  if (/^[\d.\-/\s]+$/.test(k)) return digits;
  return k;
}

export function pixAmount(amount?: string) {
  const text = String(amount ?? '')
    .trim()
    .replace(/[R$\s]/g, '');
  if (!text) return '';
  // "1.234,56" (pt-BR) or "1234.56"
  const n = Number(text.includes(',') ? text.replace(/\./g, '').replace(',', '.') : text);
  if (!Number.isFinite(n) || n <= 0 || n > 999999999.99) throw new Error('Invalid PIX amount');
  return n.toFixed(2);
}

export function pixPayload(d: PixData) {
  const key = normalizeKey(d.key);
  if (!key) throw new Error('PIX key is empty');
  if (key.length > 77) throw new Error('PIX key is too long');
  const name = plain(d.name, 25) || 'IGREJA';
  const city = plain(d.city, 15) || 'BRASIL';
  const txid =
    String(d.txid ?? '')
      .replace(/[^A-Za-z0-9]/g, '')
      .slice(0, 25) || '***';
  // Key + description share the 99 characters of field 26.
  const description = plain(d.description ?? '', Math.max(0, 99 - 4 - 14 - 4 - key.length - 4));
  const account =
    field('00', 'br.gov.bcb.pix') +
    field('01', key) +
    (description ? field('02', description) : '');
  const amount = pixAmount(d.amount);
  const body =
    field('00', '01') +
    field('26', account) +
    field('52', '0000') +
    field('53', '986') +
    (amount ? field('54', amount) : '') +
    field('58', 'BR') +
    field('59', name) +
    field('60', city) +
    field('62', field('05', txid)) +
    '6304';
  return body + crc16(body);
}

/** A code pasted from the bank app is used as is, when its checksum is right. */
export function validPixPayload(payload: string) {
  const p = String(payload ?? '').trim();
  return (
    /^0002\d{2}/.test(p) &&
    /6304[0-9A-Fa-f]{4}$/.test(p) &&
    crc16(p.slice(0, -4)) === p.slice(-4).toUpperCase()
  );
}

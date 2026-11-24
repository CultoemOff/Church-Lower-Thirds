/**
 * SEPA credit transfer QR code (EPC069-12, known as GiroCode / EPC QR). Banking apps of the
 * euro area read it and fill in a transfer to the church: name, IBAN, and optionally the
 * amount and a reference. It is the nearest thing to PIX where SEPA transfers exist.
 */
export interface SepaData {
  name: string;
  iban: string;
  bic?: string;
  amount?: string | number;
  reference?: string;
}

export const cleanIban = (iban: string) =>
  String(iban ?? '')
    .replace(/\s+/g, '')
    .toUpperCase();

/** ISO 13616 check: letters become numbers (A=10…Z=35), the whole thing mod 97 must be 1. */
export function validIban(iban: string) {
  const v = cleanIban(iban);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(v)) return false;
  let rest = 0;
  for (const ch of v.slice(4) + v.slice(0, 4))
    for (const d of String(parseInt(ch, 36))) rest = (rest * 10 + Number(d)) % 97;
  return rest === 1;
}

/** "25", "25,5" or 25.5 → "EUR25.00"; empty → "" (the person types the amount). */
export function sepaAmount(amount: string | number | undefined) {
  const raw = String(amount ?? '').trim();
  if (!raw) return '';
  const n = Number(raw.replace(/\s/g, '').replace(',', '.'));
  if (!Number.isFinite(n) || n < 0.01 || n > 999999999.99)
    throw new Error('Invalid amount (use a value like 25.00)');
  return `EUR${n.toFixed(2)}`;
}

const line = (v: unknown, max: number) =>
  String(v ?? '')
    .replace(/[\r\n]+/g, ' ')
    .trim()
    .slice(0, max);

export function sepaPayload(d: SepaData) {
  const name = line(d.name, 70);
  if (!name) throw new Error('Enter the account holder name');
  if (!validIban(d.iban)) throw new Error('Invalid IBAN (check the letters and numbers)');
  const bic = line(d.bic, 11).toUpperCase().replace(/\s/g, '');
  if (bic && !/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bic))
    throw new Error('Invalid BIC (8 or 11 characters, or leave it empty)');
  // Service tag, version 002 (BIC optional), UTF-8, SEPA credit transfer.
  const lines = [
    'BCD',
    '002',
    '1',
    'SCT',
    bic,
    name,
    cleanIban(d.iban),
    sepaAmount(d.amount),
    '',
    '',
  ];
  lines.push(line(d.reference, 140));
  while (lines[lines.length - 1] === '') lines.pop();
  return lines.join('\n');
}

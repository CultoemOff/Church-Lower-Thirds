import qrcode from 'qrcode-generator';

const HEX = /^#[0-9a-f]{3,8}$/i;

/**
 * QR code as a standalone SVG (one path, crisp at any size). `dark`/`light` are hex
 * colors; `light: 'none'` leaves the background transparent. `round` softens the modules.
 */
export function qrSvg(
  text: string,
  { dark = '#000000', light = '#ffffff', margin = 2, round = false } = {},
) {
  if (!text) throw new Error('QR text is empty');
  if (Buffer.byteLength(text) > 1200) throw new Error('QR text is too long');
  if (!HEX.test(dark)) dark = '#000000';
  if (light !== 'none' && !HEX.test(light)) light = '#ffffff';
  margin = Math.min(8, Math.max(0, Math.round(Number(margin)) || 0));
  const qr = qrcode(0, 'M');
  // Byte mode takes one char per byte: hand it the UTF-8 bytes.
  qr.addData(Buffer.from(text, 'utf8').toString('latin1'), 'Byte');
  qr.make();
  const n = qr.getModuleCount(),
    size = n + margin * 2;
  // Round mode softens the data modules only; the three finder patterns stay square.
  const inFinder = (x: number, y: number) =>
    (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
  let path = '',
    finders = '';
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      if (!qr.isDark(y, x) || (round && inFinder(x, y))) continue;
      const px = x + margin,
        py = y + margin;
      path += round
        ? `M${px + 0.32} ${py}h.36a.32 .32 0 0 1 .32 .32v.36a.32 .32 0 0 1-.32 .32h-.36a.32 .32 0 0 1-.32-.32v-.36a.32 .32 0 0 1 .32-.32z`
        : `M${px} ${py}h1v1h-1z`;
    }
  if (round)
    for (const [fx, fy] of [
      [0, 0],
      [n - 7, 0],
      [0, n - 7],
    ]) {
      const x = fx + margin,
        y = fy + margin;
      // Plain square finders: older readers only lock on the exact 1:1:3:1:1 pattern.
      finders +=
        `<path fill-rule="evenodd" d="M${x} ${y}h7v7h-7zM${x + 1} ${y + 1}v5h5v-5z"/>` +
        `<rect x="${x + 2}" y="${y + 2}" width="3" height="3"/>`;
    }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="${round ? 'geometricPrecision' : 'crispEdges'}">` +
    (light === 'none' ? '' : `<rect width="${size}" height="${size}" fill="${light}"/>`) +
    `<g fill="${dark}"><path d="${path}"/>${finders}</g></svg>`
  );
}

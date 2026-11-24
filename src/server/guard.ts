import type { IncomingHttpHeaders } from 'node:http';

// Only pages served by this program (the OBS dock, the sources, the settings page) may talk
// to it. A site open in the browser must not be able to read the church's settings or
// change what is on air, so every request is checked three ways:
//  - Host: the address used must be this computer's own (blocks DNS rebinding);
//  - Origin: when the browser says which page is asking, it must be one of ours;
//  - Sec-Fetch-Site: a page of another site cannot reach the API even with a plain link,
//    image or form. Tools that are not browsers (Stream Deck, Companion, curl) send none of
//    this and keep working.
const HOST = /^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/i;
const ORIGIN = /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/i;

/** Why a request is refused, or '' when it may go on. `path` is the URL path ('/ws' for the socket). */
export function refusal(headers: IncomingHttpHeaders, path: string) {
  if (!HOST.test(headers.host || '')) return 'Forbidden host';
  const origin = headers.origin;
  // "null" is a page opened from a file: the stub files in "OBS Sources" only wait for
  // /api/health and then move to this program's own address.
  if (origin && origin !== 'null' && !ORIGIN.test(origin)) return 'Forbidden origin';
  const guarded = (path.startsWith('/api/') || path === '/ws') && path !== '/api/health';
  if (guarded && (origin === 'null' || headers['sec-fetch-site'] === 'cross-site'))
    return 'Forbidden origin';
  return '';
}

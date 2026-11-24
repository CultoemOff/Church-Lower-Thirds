import { createHash } from 'node:crypto';
import WebSocket from 'ws';

// A short conversation with OBS through its own WebSocket server (obs-websocket 5, part
// of OBS since version 28): the program uses it only to create its browser sources, so
// nobody has to copy addresses by hand.

const hash = (text: string) => createHash('sha256').update(text).digest('base64');
/** The answer to OBS's challenge: base64(sha256(base64(sha256(password + salt)) + challenge)). */
export const obsAuth = (password: string, salt: string, challenge: string) =>
  hash(hash(password + salt) + challenge);

export interface ObsSource {
  name: string;
  url: string;
  width: number;
  height: number;
}
interface Session {
  request(type: string, data?: Record<string, unknown>): Promise<Record<string, unknown>>;
  close(): void;
}

/** Connects and identifies. The errors are short English sentences the page translates. */
function session(url: string, password: string, timeout = 6000): Promise<Session> {
  return new Promise((ok, bad) => {
    const ws = new WebSocket(url, { handshakeTimeout: timeout });
    const waiting = new Map<string, [(d: Record<string, unknown>) => void, (e: Error) => void]>();
    let ready = false,
      next = 0;
    const fail = (e: Error) => {
      for (const [, [, no]] of waiting) no(e);
      waiting.clear();
      if (!ready) bad(e);
    };
    const timer = setTimeout(() => {
      fail(new Error('OBS is not answering'));
      ws.terminate();
    }, timeout);
    ws.on('error', (e: NodeJS.ErrnoException) =>
      fail(new Error(e.code === 'ECONNREFUSED' ? 'OBS is not answering' : `OBS: ${e.message}`)),
    );
    ws.on('close', (code) =>
      // 4009 = the password did not match.
      fail(new Error(code === 4009 ? 'Wrong OBS password' : 'OBS closed the connection')),
    );
    ws.on('message', (raw) => {
      let m: { op: number; d: Record<string, unknown> };
      try {
        m = JSON.parse(String(raw));
      } catch {
        return;
      }
      if (m.op === 0) {
        // Hello: OBS says whether it wants a password.
        const auth = m.d.authentication as { salt: string; challenge: string } | undefined;
        if (auth && !password) {
          fail(new Error('OBS asks for a password'));
          return void ws.close();
        }
        ws.send(
          JSON.stringify({
            op: 1,
            d: {
              rpcVersion: 1,
              // No events: only requests and their answers.
              eventSubscriptions: 0,
              ...(auth ? { authentication: obsAuth(password, auth.salt, auth.challenge) } : {}),
            },
          }),
        );
      } else if (m.op === 2) {
        clearTimeout(timer);
        ready = true;
        ok({
          request: (type, data = {}) =>
            new Promise((yes, no) => {
              const id = String(++next);
              waiting.set(id, [yes, no]);
              ws.send(
                JSON.stringify({
                  op: 6,
                  d: { requestType: type, requestId: id, requestData: data },
                }),
              );
            }),
          close: () => ws.close(),
        });
      } else if (m.op === 7) {
        const pending = waiting.get(String(m.d.requestId));
        if (!pending) return;
        waiting.delete(String(m.d.requestId));
        const status = m.d.requestStatus as { result: boolean; comment?: string };
        if (status?.result) pending[0]((m.d.responseData as Record<string, unknown>) || {});
        else pending[1](new Error(`OBS refused: ${status?.comment || m.d.requestType}`));
      }
    });
  });
}

/**
 * Creates the browser sources in the scene OBS is showing. A source whose name already
 * exists in OBS is left as it is (and reported), so running it twice does no harm.
 */
export async function createObsSources(
  sources: ObsSource[],
  { port = 4455, password = '', host = '127.0.0.1' } = {},
) {
  const obs = await session(`ws://${host}:${port}`, password);
  try {
    const scene = await obs.request('GetCurrentProgramScene');
    const sceneName = String(scene.currentProgramSceneName ?? scene.sceneName ?? '');
    if (!sceneName) throw new Error('OBS has no scene to put the sources in');
    const list = (await obs.request('GetInputList')).inputs as { inputName: string }[] | undefined;
    const have = new Set((list || []).map((i) => i.inputName));
    const created: string[] = [],
      skipped: string[] = [];
    for (const s of sources) {
      if (have.has(s.name)) {
        skipped.push(s.name);
        continue;
      }
      await obs.request('CreateInput', {
        sceneName,
        inputName: s.name,
        inputKind: 'browser_source',
        inputSettings: {
          url: s.url,
          width: s.width,
          height: s.height,
          // The page stays loaded while hidden, so an element comes in at once.
          shutdown: false,
          restart_when_active: false,
        },
        sceneItemEnabled: true,
      });
      created.push(s.name);
    }
    return { scene: sceneName, created, skipped };
  } finally {
    obs.close();
  }
}

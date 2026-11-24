import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { WebSocketServer } from 'ws';
import { createObsSources, obsAuth } from '../src/server/obs.js';

/** A stand-in for OBS: speaks obs-websocket 5 as far as creating sources needs. */
function fakeObs(password: string, inputs: string[]) {
  const server = new WebSocketServer({ port: 0, host: '127.0.0.1' });
  const requests: { requestType: string; requestData: Record<string, unknown> }[] = [];
  const salt = 'lM1GncleQOaCu9lT1yeUZhFYnqhsLLP1G5lAGo3ixaI=',
    challenge = '+IxH4CnCiqpX1rM9scsNynZzbOe4KhDeYcTNS3PDaeY=';
  server.on('connection', (ws) => {
    ws.send(
      JSON.stringify({
        op: 0,
        d: {
          obsWebSocketVersion: '5.5.0',
          rpcVersion: 1,
          ...(password ? { authentication: { salt, challenge } } : {}),
        },
      }),
    );
    ws.on('message', (raw) => {
      const m = JSON.parse(String(raw));
      if (m.op === 1) {
        if (password && m.d.authentication !== obsAuth(password, salt, challenge))
          return ws.close(4009, 'Authentication failed.');
        return ws.send(JSON.stringify({ op: 2, d: { negotiatedRpcVersion: 1 } }));
      }
      if (m.op !== 6) return;
      requests.push(m.d);
      const answer = (result: boolean, responseData = {}, comment = '') =>
        ws.send(
          JSON.stringify({
            op: 7,
            d: {
              requestType: m.d.requestType,
              requestId: m.d.requestId,
              requestStatus: { result, code: result ? 100 : 600, comment },
              responseData,
            },
          }),
        );
      if (m.d.requestType === 'GetCurrentProgramScene')
        answer(true, { currentProgramSceneName: 'Culto', sceneName: 'Culto' });
      else if (m.d.requestType === 'GetInputList')
        answer(true, {
          inputs: inputs.map((inputName) => ({ inputName, inputKind: 'browser_source' })),
        });
      else if (m.d.requestType === 'CreateInput') {
        if (m.d.requestData.inputName === 'Broken') return answer(false, {}, 'No room for it');
        inputs.push(m.d.requestData.inputName);
        answer(true, { sceneItemId: inputs.length });
      } else answer(false, {}, 'Unknown request');
    });
  });
  return new Promise<{ port: number; requests: typeof requests; stop: () => void }>((ok) =>
    server.on('listening', () =>
      ok({
        port: (server.address() as AddressInfo).port,
        requests,
        stop: () => {
          for (const c of server.clients) c.terminate();
          server.close();
        },
      }),
    ),
  );
}
const SOURCES = [
  { name: 'CLT - Names', url: 'http://127.0.0.1:8795/source/names', width: 1920, height: 1080 },
  { name: 'CLT - QR Card', url: 'http://127.0.0.1:8795/source/qr-card', width: 1920, height: 1080 },
];

test('the answer to the challenge of OBS follows its documentation', () => {
  // base64(sha256(base64(sha256(password + salt)) + challenge)), with the password, salt
  // and challenge of the example in the obs-websocket documentation. The expected value
  // was worked out apart from this program (Python's hashlib).
  assert.equal(
    obsAuth('supersecretpassword', 'PZVbYpvAnZut2SS6JNJytDm9', 'ztTBnnuqrqaKDzRM3xcVdbYm'),
    'zZgWipvwSGrw748kHN4gNpBC1IaeiiWX3Hjkrm849Sc=',
  );
});

test('the sources are created in the scene on screen; the ones OBS already has are left', async () => {
  const obs = await fakeObs('secret', ['CLT - QR Card', 'Camera']);
  try {
    const r = await createObsSources(SOURCES, { port: obs.port, password: 'secret' });
    assert.deepEqual(r, { scene: 'Culto', created: ['CLT - Names'], skipped: ['CLT - QR Card'] });
    const made = obs.requests.filter((q) => q.requestType === 'CreateInput');
    assert.equal(made.length, 1);
    assert.deepEqual(made[0].requestData, {
      sceneName: 'Culto',
      inputName: 'CLT - Names',
      inputKind: 'browser_source',
      inputSettings: {
        url: 'http://127.0.0.1:8795/source/names',
        width: 1920,
        height: 1080,
        shutdown: false,
        restart_when_active: false,
      },
      sceneItemEnabled: true,
    });
    // Again: nothing new to create.
    assert.deepEqual(
      (await createObsSources(SOURCES, { port: obs.port, password: 'secret' })).created,
      [],
    );
    // What OBS refuses reaches the person in its own words.
    await assert.rejects(
      createObsSources([{ ...SOURCES[0], name: 'Broken' }], { port: obs.port, password: 'secret' }),
      /OBS refused: No room for it/,
    );
  } finally {
    obs.stop();
  }
});

test('a wrong or missing password and a closed OBS are told apart', async () => {
  const obs = await fakeObs('secret', []);
  try {
    await assert.rejects(
      createObsSources(SOURCES, { port: obs.port, password: 'nope' }),
      /Wrong OBS password/,
    );
    await assert.rejects(createObsSources(SOURCES, { port: obs.port }), /OBS asks for a password/);
  } finally {
    obs.stop();
  }
  // Nobody listening there any more.
  await assert.rejects(
    createObsSources(SOURCES, { port: obs.port, password: 'x' }),
    /OBS is not answering/,
  );
  // Without a password set in OBS, none is needed.
  const open = await fakeObs('', []);
  try {
    assert.equal((await createObsSources(SOURCES, { port: open.port })).created.length, 2);
  } finally {
    open.stop();
  }
});

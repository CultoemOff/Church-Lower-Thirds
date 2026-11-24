import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startSetup } from '../src/server/launch.js';

test('the installer can be started by the program itself', async () => {
  assert.equal(await startSetup(process.execPath, ['-e', ''], { how: 'direct' }), 'direct');
  const nowhere = process.platform === 'win32' ? 'C:\\nowhere\\setup.exe' : '/nowhere/setup';
  await assert.rejects(
    () => startSetup(nowhere, ['/SILENT'], { how: 'direct' }),
    /^Error: Windows did not start the installer: .*ENOENT/,
  );
});

test('when no way works, the reason reaches the person', async () => {
  const nowhere = process.platform === 'win32' ? 'C:\\nowhere\\setup.exe' : '/nowhere/setup';
  // Away from an installed copy there is no run-setup.vbs: what is left is the Windows shell.
  await assert.rejects(
    () => startSetup(nowhere, ['/SILENT'], { how: 'shell' }),
    /^Error: Windows did not start the installer: \S/,
  );
  await assert.rejects(
    () => startSetup(nowhere, ['/SILENT'], { how: 'nothing' }),
    /no way to start it/,
  );
});

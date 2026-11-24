import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startSetup } from '../src/server/launch.js';

test('the installer is started directly when Windows allows it', async () => {
  await startSetup(process.execPath, ['-e', '']);
});

test('when neither way works, the reasons of both reach the person', async () => {
  const nowhere = process.platform === 'win32' ? 'C:\\nowhere\\setup.exe' : '/nowhere/setup';
  await assert.rejects(
    () => startSetup(nowhere, ['/SILENT']),
    /^Error: Windows did not start the installer: .*ENOENT/,
  );
});

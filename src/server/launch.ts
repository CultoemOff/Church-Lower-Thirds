import { execFile, spawn } from 'node:child_process';

/** Starts a program on its own; resolves once Windows has really started it. */
const direct = (file: string, args: string[]) =>
  new Promise<void>((ok, bad) => {
    const child = spawn(file, args, { detached: true, stdio: 'ignore' });
    child.once('spawn', () => {
      child.unref();
      ok();
    });
    child.once('error', bad);
  });

/**
 * Starts a program through the Windows shell, asking for administrator rights, as a
 * double click on an installer does. Windows shows its permission prompt; the promise
 * resolves when the person has answered it and the program is running.
 */
const elevated = (file: string, args: string[]) =>
  new Promise<void>((ok, bad) => {
    // The path and the arguments travel in the environment: no quoting to get wrong.
    const script =
      "$ErrorActionPreference = 'Stop'; try { Start-Process -FilePath $env:CLT_RUN " +
      '-ArgumentList $env:CLT_RUN_ARGS -Verb RunAs } ' +
      'catch { [Console]::Error.Write($_.Exception.Message); exit 1 }';
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
      {
        env: { ...process.env, CLT_RUN: file, CLT_RUN_ARGS: args.join(' ') },
        windowsHide: true,
        // The permission prompt waits for the person.
        timeout: 5 * 60 * 1000,
      },
      (err, _out, stderr) => (err ? bad(new Error(String(stderr).trim() || err.message)) : ok()),
    );
  });

/**
 * Runs the downloaded installer. First the plain way; where Windows refuses that (company
 * computers often do, and Node only reports "spawn UNKNOWN"), through the shell with
 * administrator rights. `how` = 'shell' goes straight to the second way (used by the tests).
 */
export async function startSetup(
  file: string,
  args: string[],
  how = process.env.CLT_UPDATE_LAUNCH,
): Promise<void> {
  let first = '';
  if (how !== 'shell')
    try {
      return await direct(file, args);
    } catch (e) {
      first = e instanceof Error ? e.message : String(e);
    }
  try {
    await elevated(file, args);
  } catch (e) {
    const why = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Windows did not start the installer: ${[first, why].filter(Boolean).join('; ')}`,
    );
  }
}

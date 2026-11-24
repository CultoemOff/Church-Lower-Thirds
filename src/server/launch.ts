import { execFile, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

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

/** run-setup.vbs sits next to the other Windows scripts, one folder above node.exe. */
const setupScript = () =>
  process.env.CLT_SETUP_SCRIPT || join(dirname(process.execPath), '..', 'run-setup.vbs');

/**
 * Starts the installer through run-setup.vbs: a small window on top of everything says the
 * update is ready; after the click, the installer starts as it does after a double click,
 * and the permission request of Windows opens in front instead of blinking, minimized, on
 * the taskbar (what Windows does with a request that comes from a hidden program).
 */
const asked = (file: string, args: string[], note: string) =>
  new Promise<void>((ok, bad) => {
    const out = join(tmpdir(), `church-lower-thirds-update-${process.pid}.txt`);
    execFile(
      join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'wscript.exe'),
      ['//Nologo', setupScript()],
      {
        // The path, the arguments and the text travel in the environment: nothing to quote.
        env: {
          ...process.env,
          CLT_RUN: file,
          CLT_RUN_ARGS: args.join(' '),
          CLT_NOTE: note,
          CLT_ASK: process.env.CLT_UPDATE_ASK === '0' ? '0' : '1',
          CLT_OUT: out,
        },
        // The window waits for the person.
        timeout: 10 * 60 * 1000,
      },
      async (err) => {
        if (!err) return ok();
        if (err.code === 2) return bad(new Error('Update cancelled'));
        // The file is written by the script in UTF-16.
        const why = await readFile(out, 'utf16le').catch(() => '');
        void rm(out, { force: true });
        bad(
          new Error(
            why.replace(/^\uFEFF/, '').trim() ||
              (err.killed ? 'nobody answered the update window' : err.message),
          ),
        );
      },
    );
  });

/**
 * Starts a program through the Windows shell, asking for administrator rights. Windows
 * shows its permission prompt; the promise resolves when the person has answered it and
 * the program is running.
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

export type Launch = 'direct' | 'script' | 'shell';

/**
 * Runs the downloaded installer and says which way worked.
 *
 * On a person's computer: through run-setup.vbs (a visible window first, see `asked`);
 * where that script cannot run, through PowerShell with administrator rights. A person who
 * cancels in the window stops it there ("Update cancelled").
 *
 * `how` picks one way only, for the tests: 'direct' (the program starts the installer
 * itself, as on a computer without permission prompts), 'script' or 'shell'.
 */
export async function startSetup(
  file: string,
  args: string[],
  { how = process.env.CLT_UPDATE_LAUNCH, note = '' }: { how?: string; note?: string } = {},
): Promise<Launch> {
  const why: string[] = [];
  const attempt = async (name: Launch, run: () => Promise<void>) => {
    try {
      await run();
      return name;
    } catch (e) {
      const text = e instanceof Error ? e.message : String(e);
      if (text === 'Update cancelled') throw e;
      why.push(text);
      return undefined;
    }
  };
  const ways: [Launch, () => Promise<void>][] = [
    ['direct', () => direct(file, args)],
    ['script', () => asked(file, args, note)],
    ['shell', () => elevated(file, args)],
  ];
  const wanted = ways.filter(([name]) =>
    how ? name === how : name !== 'direct' && (name !== 'script' || existsSync(setupScript())),
  );
  for (const [name, run] of wanted) {
    const done = await attempt(name, run);
    if (done) return done;
  }
  throw new Error(`Windows did not start the installer: ${why.join('; ') || 'no way to start it'}`);
}

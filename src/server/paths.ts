import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';

/**
 * Machine-wide note left by the installer: the language chosen there, used for the sample
 * texts of a first run in any account. The installer runs elevated, possibly with another
 * person's administrator account, so it goes where every account can read: ProgramData.
 */
export function installInfoFile(
  platform: NodeJS.Platform = process.platform,
  env: NodeJS.ProcessEnv = process.env,
) {
  if (platform === 'win32')
    return join(
      env.ProgramData || 'C:\\ProgramData',
      'Culto em Off',
      'Lower Third Web',
      'install.json',
    );
  return join(appDataDir(platform, env), 'install.json');
}

/**
 * Each account of the computer has its own files (settings, names, images, OBS sources),
 * so one person never changes another's. `chosen` is the folder picked in the installer,
 * handed to the server it starts for the person at the computer; `remembered` is the folder
 * this account already uses. An account that never chose gets "Lower Third Web" in its own
 * Documents.
 */
export function userFilesFolder(
  chosen: string | undefined,
  remembered: string | undefined,
  home: string,
) {
  if (chosen && isAbsolute(chosen)) return resolve(chosen);
  return remembered || join(home, 'Documents', 'Lower Third Web');
}

/** Tells one account's server from another's without exposing the account name. */
export function ownerId(username: string, home: string) {
  return createHash('sha256')
    .update(`${username}\n${home}`.toLowerCase())
    .digest('hex')
    .slice(0, 12);
}

/** Folder of the per-account notes (which files folder and which port this account uses). */
export function appDataDir(
  platform: NodeJS.Platform = process.platform,
  env: NodeJS.ProcessEnv = process.env,
  home = homedir(),
) {
  if (platform === 'win32')
    return join(env.APPDATA || join(home, 'AppData', 'Roaming'), 'Lower Third Web');
  if (platform === 'darwin') return join(home, 'Library', 'Application Support', 'Lower Third Web');
  return join(env.XDG_CONFIG_HOME || join(home, '.config'), 'lower-third-web');
}

import { homedir } from 'node:os';
import { join } from 'node:path';

/** Folder of config.json and the uploaded images (logo). */
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

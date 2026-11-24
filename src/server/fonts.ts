import { execFile } from 'node:child_process';

/**
 * Names of the fonts installed on this computer. The overlay runs in the OBS browser on
 * the same machine, so any installed font works by its family name.
 */
const run = (cmd: string, args: string[], timeout = 15000) =>
  new Promise<string>((resolve) =>
    execFile(cmd, args, { timeout, maxBuffer: 16 * 1024 * 1024, windowsHide: true }, (_e, out) =>
      resolve(String(out || '')),
    ),
  );

export function parseFontList(text: string) {
  const names = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    // fc-list prints "Family,Alias:style=..." ; PowerShell prints one family per line.
    const name = line.split(':')[0].split(',')[0].trim();
    if (name && name.length <= 80 && !name.startsWith('.') && !name.startsWith('@'))
      names.add(name);
  }
  return [...names].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

const FONT_SCRIPT =
  '[Console]::OutputEncoding=[Text.Encoding]::UTF8; Add-Type -AssemblyName System.Drawing; (New-Object System.Drawing.Text.InstalledFontCollection).Families | ForEach-Object { $_.Name }';

let cache: { at: number; fonts: string[] } | undefined;

export async function installedFonts(force = false, platform = process.platform) {
  if (cache && !force && Date.now() - cache.at < 60_000) return cache.fonts;
  let out = '';
  if (platform === 'win32')
    out = await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', FONT_SCRIPT]);
  else if (platform === 'darwin') {
    // CoreText through AppleScript-ObjC: every family, system and user fonts.
    out = await run('osascript', [
      '-l',
      'JavaScript',
      '-e',
      "ObjC.import('AppKit'); ObjC.unwrap($.NSFontManager.sharedFontManager.availableFontFamilies).map((f) => ObjC.unwrap(f)).join('\\n')",
    ]);
  } else out = await run('fc-list', [':', 'family']);
  const fonts = parseFontList(out);
  if (fonts.length) cache = { at: Date.now(), fonts };
  return fonts;
}

import { mkdir, readdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * The OBS browser sources. Each one is also written as a small HTML file (English names,
 * the same on every computer) into the folder chosen at install time, so it can be added
 * in OBS as a "Local file" and kept with the backups. The file only waits for the program
 * and opens the element it names.
 */
export const SOURCES = [
  { slug: 'all', file: 'All Elements', element: '' },
  { slug: 'names', file: 'Names', element: 'lower' },
  { slug: 'badge', file: 'Corner Badge', element: 'top' },
  { slug: 'ticker', file: 'Ticker', element: 'ticker' },
  { slug: 'qr-card', file: 'QR Card', element: 'card' },
  { slug: 'schedule', file: 'Schedule', element: 'agenda' },
  { slug: 'social', file: 'Social', element: 'social' },
  { slug: 'logo', file: 'Logo', element: 'bug' },
] as const;

export const SOURCES_FOLDER = 'OBS Sources';
export const sourceFileName = (file: string, vertical: boolean) =>
  `${file}${vertical ? ' (Vertical)' : ''}.html`;

export function sourceHtml(title: string, baseUrl: string, path: string) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Church Lower Thirds - ${title}</title>
    <style>
      html, body { margin: 0; background: transparent; overflow: hidden; }
    </style>
  </head>
  <body>
    <script>
      // Church Lower Thirds (by Culto em Off). Add this file in OBS as a Browser source with
      // "Local file" checked. It waits for the program on this computer, then opens the
      // element. Nothing to edit here: everything is set in the program's settings page.
      var base = ${JSON.stringify(baseUrl)};
      var target = base + ${JSON.stringify(path)};
      function open() {
        fetch(base + '/api/health', { mode: 'no-cors', cache: 'no-store' })
          .then(function () { location.replace(target); })
          .catch(function () { setTimeout(open, 2000); });
      }
      open();
    </script>
  </body>
</html>
`;
}

const README = `Church Lower Thirds - OBS sources
=============================

Add any of these files in OBS Studio:
  Sources > + > Browser > check "Local file" > choose the file.

Horizontal files: width 1920, height 1080 (or 1280x720, 2560x1440, 3840x2160).
"(Vertical)" files: width 1080, height 1920 (or 720x1280).

"All Elements" shows everything in one source. The other files show one element each,
so you can keep them in different scenes. Do not use "All Elements" together with a
single-element file in the same scene: that element would show twice.

The "Data" folder next to this one keeps your settings, names and images.
Copy the whole "Church Lower Thirds" folder to back everything up.
`;

/** Writes (or refreshes) the source files; old files of this app that no longer apply are removed. */
export async function writeSourceFiles(folder: string, baseUrl: string) {
  const dir = join(folder, SOURCES_FOLDER);
  await mkdir(dir, { recursive: true });
  const wanted = new Map<string, string>();
  for (const s of SOURCES)
    for (const vertical of [false, true])
      wanted.set(
        sourceFileName(s.file, vertical),
        sourceHtml(
          s.file + (vertical ? ' (Vertical)' : ''),
          baseUrl,
          `/source/${s.slug}${vertical ? '?layout=vertical' : ''}`,
        ),
      );
  wanted.set('Control Dock.html', sourceHtml('Control Dock', baseUrl, '/dock'));
  wanted.set('Read me.txt', README);
  for (const [name, content] of wanted) await writeFile(join(dir, name), content);
  for (const name of await readdir(dir))
    if (name.endsWith('.html') && !wanted.has(name)) await unlink(join(dir, name)).catch(() => {});
  return dir;
}

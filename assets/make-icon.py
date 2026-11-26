# Renders assets/church-lower-thirds.svg into the Windows icon (installer, shortcuts, uninstall
# entry), the macOS icon (.icns, for the app in /Applications) and the browser favicon.
# Dev-only (Python + Playwright); the outputs are committed.
#   python assets/make-icon.py
import io, os, struct
from PIL import Image
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
SVG = open(os.path.join(HERE, 'church-lower-thirds.svg')).read()
SIZES = [16, 20, 24, 32, 40, 48, 64, 96, 128, 256]


def render(page, size):
    svg = SVG.replace('<svg ', f'<svg width="{size}" height="{size}" ', 1)
    page.set_viewport_size({'width': size, 'height': size})
    page.set_content(f'<html><body style="margin:0;background:transparent">{svg}</body></html>')
    png = page.screenshot(omit_background=True, clip={'x': 0, 'y': 0, 'width': size, 'height': size})
    return Image.open(io.BytesIO(png)).convert('RGBA')


def dib(im):
    """32-bit BGRA bitmap with an AND mask, the classic ICO entry format."""
    w, h = im.size
    rows = []
    for y in range(h - 1, -1, -1):  # bottom-up
        rows.append(b''.join(struct.pack('BBBB', b, g, r, a) for r, g, b, a in (im.getpixel((x, y)) for x in range(w))))
    mask_row = ((w + 31) // 32) * 4
    header = struct.pack('<IiiHHIIiiII', 40, w, h * 2, 1, 32, 0, 0, 0, 0, 0, 0)
    return header + b''.join(rows) + b'\x00' * mask_row * h


def write_ico(images, path):
    entries, blobs = [], []
    offset = 6 + 16 * len(images)
    for im in images:
        w, h = im.size
        # Bitmaps for every size, 256 included: PNG frames are smaller, but some readers
        # (e.g. .NET System.Drawing) skip them and fall back to a lower resolution.
        data = dib(im)
        entries.append(struct.pack('<BBBBHHII', w % 256, h % 256, 0, 0, 1, 32, len(data), offset))
        blobs.append(data)
        offset += len(data)
    with open(path, 'wb') as f:
        f.write(struct.pack('<HHH', 0, 1, len(images)) + b''.join(entries) + b''.join(blobs))


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROME', '/usr/bin/google-chrome'), args=['--no-sandbox'])
    page = browser.new_page()
    images = [render(page, s) for s in SIZES]
    browser.close()

write_ico(images, os.path.join(HERE, 'church-lower-thirds.ico'))
web_icons = os.path.join(HERE, '..', 'src', 'web', 'icons')
open(os.path.join(web_icons, 'app.svg'), 'w').write(SVG)
images[SIZES.index(32)].save(os.path.join(web_icons, 'app-32.png'))
images[SIZES.index(256)].resize((180, 180), Image.LANCZOS).save(os.path.join(web_icons, 'app-180.png'))

# Check: every entry must decode at its declared size (a broken .ico once broke the installer build).
ico = Image.open(os.path.join(HERE, 'church-lower-thirds.ico'))
found = sorted(ico.info['sizes'])
for s in found:
    ico.size = s
    ico.load()
    assert ico.size == s, s
print('ico sizes:', [s[0] for s in found], os.path.getsize(os.path.join(HERE, 'church-lower-thirds.ico')), 'bytes')

# macOS: the app icon, from 16 px up to 1024 px (512 px on a Retina screen).
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROME', '/usr/bin/google-chrome'), args=['--no-sandbox'])
    page = browser.new_page()
    big = render(page, 1024)
    browser.close()
big.save(os.path.join(HERE, 'church-lower-thirds.icns'), format='ICNS', sizes=[(n, n) for n in (16, 32, 64, 128, 256, 512, 1024)])
